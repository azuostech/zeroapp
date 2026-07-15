-- ZeroApp - hardening seguro para aplicar antes do deploy da aplicacao.
-- Fecha escalada de privilegio, protege award_coins e prepara rate limit/webhooks.

BEGIN;

-- --------------------------------------------------------------------------
-- 1. RLS obrigatorio em tabelas sensiveis existentes
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_table record;
BEGIN
  FOR v_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (
        tablename IN (
          'profiles',
          'coins_balance',
          'coins_transactions',
          'financial_data',
          'feed_events',
          'email_logs'
        )
        OR tablename LIKE 'shamar\_%' ESCAPE '\'
        OR tablename LIKE 'mavf\_%' ESCAPE '\'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', v_table.schemaname, v_table.tablename);
    EXECUTE format(
      'REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE %I.%I FROM anon, authenticated',
      v_table.schemaname,
      v_table.tablename
    );
  END LOOP;
END $$;

-- --------------------------------------------------------------------------
-- 2. Impede auto-promocao via profiles_update_self
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR session_user IN ('postgres', 'supabase_admin')
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.turma IS DISTINCT FROM OLD.turma
     OR NEW.shamar_unlocked IS DISTINCT FROM OLD.shamar_unlocked THEN
    RAISE EXCEPTION 'profile_security_fields_are_server_managed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_privilege_fields ON public.profiles;
CREATE TRIGGER protect_profile_privilege_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- --------------------------------------------------------------------------
-- 3. award_coins: validacao defensiva e execucao somente por service_role
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id uuid,
  p_amount integer,
  p_action_type text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_coins integer, new_total integer, new_phase text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_coins integer;
  v_new_total integer;
  v_action_type text := btrim(COALESCE(p_action_type, ''));
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'invalid_user_id' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'invalid_award_amount' USING ERRCODE = '22023';
  END IF;

  IF v_action_type !~ '^[a-z0-9_]{1,64}$' THEN
    RAISE EXCEPTION 'invalid_action_type' USING ERRCODE = '22023';
  END IF;

  IF p_description IS NOT NULL AND length(p_description) > 500 THEN
    RAISE EXCEPTION 'description_too_long' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_metadata) <> 'object' OR octet_length(v_metadata::text) > 16384 THEN
    RAISE EXCEPTION 'invalid_metadata' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.coins_balance (user_id, coins, coins_total)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    coins = public.coins_balance.coins + EXCLUDED.coins,
    coins_total = public.coins_balance.coins_total + EXCLUDED.coins_total
  RETURNING coins, coins_total INTO v_new_coins, v_new_total;

  INSERT INTO public.coins_transactions (user_id, amount, action_type, description, metadata)
  VALUES (p_user_id, p_amount, v_action_type, p_description, v_metadata);

  RETURN QUERY
  SELECT v_new_coins, v_new_total, public.get_user_phase(v_new_total);
END;
$$;

REVOKE ALL ON FUNCTION public.award_coins(uuid, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_coins(uuid, integer, text, text, jsonb) TO service_role;

-- Catalogo publico sem input e com retorno restrito a metadados.
REVOKE ALL ON FUNCTION public.get_content_program_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_content_program_catalog() TO anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 4. Rate limit persistente do signup (IP armazenado apenas como HMAC SHA-256)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  key_hash text PRIMARY KEY CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.security_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.security_rate_limits TO service_role;

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_updated
  ON public.security_rate_limits(updated_at);

CREATE OR REPLACE FUNCTION public.consume_signup_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE(allowed boolean, remaining integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_attempts integer;
  v_window_start timestamptz;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$'
     OR p_limit < 1 OR p_limit > 100
     OR p_window_seconds < 60 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid_rate_limit_input' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.security_rate_limits
  WHERE updated_at < v_now - interval '7 days';

  INSERT INTO public.security_rate_limits (key_hash, window_start, attempts, updated_at)
  VALUES (p_key_hash, v_now, 1, v_now)
  ON CONFLICT (key_hash) DO UPDATE SET
    attempts = CASE
      WHEN public.security_rate_limits.window_start + make_interval(secs => p_window_seconds) <= v_now THEN 1
      ELSE public.security_rate_limits.attempts + 1
    END,
    window_start = CASE
      WHEN public.security_rate_limits.window_start + make_interval(secs => p_window_seconds) <= v_now THEN v_now
      ELSE public.security_rate_limits.window_start
    END,
    updated_at = v_now
  RETURNING attempts, window_start INTO v_attempts, v_window_start;

  RETURN QUERY SELECT
    v_attempts <= p_limit,
    GREATEST(0, p_limit - v_attempts),
    GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_window_start + make_interval(secs => p_window_seconds) - v_now)))::integer
    );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_signup_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_signup_rate_limit(text, integer, integer) TO service_role;

-- --------------------------------------------------------------------------
-- 5. Idempotencia de webhooks Resend
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resend_webhook_events (
  svix_id text PRIMARY KEY CHECK (length(svix_id) BETWEEN 8 AND 255),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed')),
  event_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.resend_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.resend_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.resend_webhook_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_resend_webhook_events_created
  ON public.resend_webhook_events(created_at DESC);

-- --------------------------------------------------------------------------
-- 6. Indices RLS e bucket privado
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_coins_transactions_user
  ON public.coins_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shamar_contrib_user
  ON public.shamar_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_user
  ON public.feed_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created
  ON public.email_logs(user_id, created_at DESC);

UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760
WHERE id = 'shamar-provas';

COMMIT;
