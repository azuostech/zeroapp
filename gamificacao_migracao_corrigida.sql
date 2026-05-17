-- ============================================================================
-- MIGRACAO DE GAMIFICACAO (VERSAO CORRIGIDA)
-- Projeto: Zero App
-- Compatibilidade: schema atual (profiles.id) + execucao idempotente
-- Data: 2026-05-16
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0) EXTENSOES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1) PERFIS / TIER
-- ============================================================================

-- Mantemos tier como TEXT (compativel com o app atual) e reforcamos integridade.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier TEXT;

UPDATE public.profiles
SET tier = UPPER(tier)
WHERE tier IS NOT NULL
  AND tier <> UPPER(tier);

UPDATE public.profiles
SET tier = 'DESPERTAR'
WHERE tier IS NULL
   OR tier NOT IN ('DESPERTAR', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO');

ALTER TABLE public.profiles
  ALTER COLUMN tier SET DEFAULT 'DESPERTAR';

ALTER TABLE public.profiles
  ALTER COLUMN tier SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_tier_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_tier_check
      CHECK (tier IN ('DESPERTAR', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles (tier);

-- ============================================================================
-- 2) HELPER DE AUTORIZACAO (ADMIN)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO anon, authenticated, service_role;

-- ============================================================================
-- 3) COINS_BALANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coins_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 0,
  coins_total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coins_balance
  ADD COLUMN IF NOT EXISTS coins INTEGER,
  ADD COLUMN IF NOT EXISTS coins_total INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.coins_balance
SET coins = 0
WHERE coins IS NULL;

UPDATE public.coins_balance
SET coins_total = 0
WHERE coins_total IS NULL;

UPDATE public.coins_balance
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE public.coins_balance
SET updated_at = NOW()
WHERE updated_at IS NULL;

ALTER TABLE public.coins_balance
  ALTER COLUMN coins SET DEFAULT 0,
  ALTER COLUMN coins_total SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN coins SET NOT NULL,
  ALTER COLUMN coins_total SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coins_balance'::regclass
      AND conname = 'coins_balance_coins_check'
  ) THEN
    ALTER TABLE public.coins_balance
      ADD CONSTRAINT coins_balance_coins_check CHECK (coins >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coins_balance'::regclass
      AND conname = 'coins_balance_total_check'
  ) THEN
    ALTER TABLE public.coins_balance
      ADD CONSTRAINT coins_balance_total_check CHECK (coins_total >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coins_balance_user ON public.coins_balance (user_id);

CREATE OR REPLACE FUNCTION public.update_coins_balance_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_coins_balance_timestamp ON public.coins_balance;
DROP TRIGGER IF EXISTS set_updated_at ON public.coins_balance;
CREATE TRIGGER trigger_update_coins_balance_timestamp
  BEFORE UPDATE ON public.coins_balance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coins_balance_timestamp();

ALTER TABLE public.coins_balance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coins_balance_self ON public.coins_balance;
DROP POLICY IF EXISTS coins_balance_admin ON public.coins_balance;
DROP POLICY IF EXISTS "Users can view own coins balance" ON public.coins_balance;
DROP POLICY IF EXISTS "Users can insert own coins balance" ON public.coins_balance;
DROP POLICY IF EXISTS "Service role can update coins balance" ON public.coins_balance;
DROP POLICY IF EXISTS "Admin can view all coins balances" ON public.coins_balance;
DROP POLICY IF EXISTS coins_balance_select_own ON public.coins_balance;
DROP POLICY IF EXISTS coins_balance_insert_own ON public.coins_balance;
DROP POLICY IF EXISTS coins_balance_update_own ON public.coins_balance;
DROP POLICY IF EXISTS coins_balance_admin_all ON public.coins_balance;
DROP POLICY IF EXISTS coins_balance_service_all ON public.coins_balance;

CREATE POLICY coins_balance_select_own
  ON public.coins_balance
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY coins_balance_insert_own
  ON public.coins_balance
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY coins_balance_update_own
  ON public.coins_balance
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY coins_balance_admin_all
  ON public.coins_balance
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY coins_balance_service_all
  ON public.coins_balance
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 4) COINS_TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coins_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coins_transactions
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE public.coins_transactions
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

UPDATE public.coins_transactions
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE public.coins_transactions
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coins_transactions'::regclass
      AND conname = 'coins_transactions_amount_check'
  ) THEN
    ALTER TABLE public.coins_transactions
      ADD CONSTRAINT coins_transactions_amount_check CHECK (amount <> 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coins_transactions_user ON public.coins_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coins_transactions_action ON public.coins_transactions (action_type);
CREATE INDEX IF NOT EXISTS idx_coins_transactions_created ON public.coins_transactions (created_at DESC);

ALTER TABLE public.coins_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coins_transactions_self ON public.coins_transactions;
DROP POLICY IF EXISTS coins_transactions_admin ON public.coins_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.coins_transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.coins_transactions;
DROP POLICY IF EXISTS "Admin can view all transactions" ON public.coins_transactions;
DROP POLICY IF EXISTS coins_transactions_select_own ON public.coins_transactions;
DROP POLICY IF EXISTS coins_transactions_insert_own ON public.coins_transactions;
DROP POLICY IF EXISTS coins_transactions_admin_all ON public.coins_transactions;
DROP POLICY IF EXISTS coins_transactions_service_all ON public.coins_transactions;

CREATE POLICY coins_transactions_select_own
  ON public.coins_transactions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Mantido para compatibilidade com a API atual do app (upsert/insert com sessao do usuario).
CREATE POLICY coins_transactions_insert_own
  ON public.coins_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY coins_transactions_admin_all
  ON public.coins_transactions
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY coins_transactions_service_all
  ON public.coins_transactions
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 5) WORKSHOP_CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workshop_codes (
  code TEXT PRIMARY KEY,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.workshop_codes
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.workshop_codes
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE public.workshop_codes
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.workshop_codes'::regclass
      AND conname = 'workshop_codes_code_format'
  ) THEN
    ALTER TABLE public.workshop_codes
      ADD CONSTRAINT workshop_codes_code_format CHECK (LENGTH(code) >= 6);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workshop_codes_used_by ON public.workshop_codes (used_by_user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_codes_used_at ON public.workshop_codes (used_at);
CREATE INDEX IF NOT EXISTS idx_workshop_codes_expires_at ON public.workshop_codes (expires_at);

ALTER TABLE public.workshop_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workshop_codes_read ON public.workshop_codes;
DROP POLICY IF EXISTS workshop_codes_admin ON public.workshop_codes;
DROP POLICY IF EXISTS "Users can view valid codes" ON public.workshop_codes;
DROP POLICY IF EXISTS "Admin can manage codes" ON public.workshop_codes;
DROP POLICY IF EXISTS workshop_codes_select_valid ON public.workshop_codes;
DROP POLICY IF EXISTS workshop_codes_admin_all ON public.workshop_codes;
DROP POLICY IF EXISTS workshop_codes_service_all ON public.workshop_codes;

CREATE POLICY workshop_codes_select_valid
  ON public.workshop_codes
  FOR SELECT
  TO authenticated
  USING (
    (
      used_by_user_id IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    )
    OR used_by_user_id = (SELECT auth.uid())
  );

CREATE POLICY workshop_codes_admin_all
  ON public.workshop_codes
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY workshop_codes_service_all
  ON public.workshop_codes
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 6) ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT achievements_user_id_achievement_type_key UNIQUE (user_id, achievement_type)
);

ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS metadata JSONB;

UPDATE public.achievements
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE public.achievements
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.achievements'::regclass
      AND conname = 'achievements_user_id_achievement_type_key'
  ) THEN
    ALTER TABLE public.achievements
      ADD CONSTRAINT achievements_user_id_achievement_type_key UNIQUE (user_id, achievement_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements (user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON public.achievements (achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON public.achievements (unlocked_at DESC);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS achievements_self ON public.achievements;
DROP POLICY IF EXISTS achievements_admin ON public.achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Service role can insert achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admin can view all achievements" ON public.achievements;
DROP POLICY IF EXISTS achievements_select_own ON public.achievements;
DROP POLICY IF EXISTS achievements_insert_own ON public.achievements;
DROP POLICY IF EXISTS achievements_admin_all ON public.achievements;
DROP POLICY IF EXISTS achievements_service_all ON public.achievements;

CREATE POLICY achievements_select_own
  ON public.achievements
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Mantido para permitir desbloqueios feitos por fluxo autenticado no backend do app.
CREATE POLICY achievements_insert_own
  ON public.achievements
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY achievements_admin_all
  ON public.achievements
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

CREATE POLICY achievements_service_all
  ON public.achievements
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- 7) INICIALIZACAO DE COINS NO PROFILE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_user_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.coins_balance (user_id, coins, coins_total)
  VALUES (NEW.id, 50, 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.coins_transactions (user_id, amount, action_type, description, metadata)
  SELECT
    NEW.id,
    50,
    'signup',
    'Boas-vindas ao ZERO App',
    '{"source":"profile_trigger"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.coins_transactions t
    WHERE t.user_id = NEW.id
      AND t.action_type = 'signup'
  );

  RETURN NEW;
END;
$$;

-- Compatibilidade com trigger legado que chamava init_coins_balance().
CREATE OR REPLACE FUNCTION public.init_coins_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.coins_balance (user_id, coins, coins_total)
  VALUES (NEW.id, 50, 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.coins_transactions (user_id, amount, action_type, description, metadata)
  SELECT
    NEW.id,
    50,
    'signup',
    'Boas-vindas ao ZERO App',
    '{"source":"profile_trigger_legacy"}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.coins_transactions t
    WHERE t.user_id = NEW.id
      AND t.action_type = 'signup'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_initialize_user_coins ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_coins();

-- Backfill de saldo inicial para perfis existentes sem balance.
INSERT INTO public.coins_balance (user_id, coins, coins_total)
SELECT p.id, 50, 50
FROM public.profiles p
LEFT JOIN public.coins_balance cb ON cb.user_id = p.id
WHERE cb.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 8) FASE DE GAMIFICACAO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_phase(total_coins INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF total_coins < 201 THEN
    RETURN 'BOMBEIRO';
  ELSIF total_coins < 801 THEN
    RETURN 'SOBREVIVENTE';
  ELSIF total_coins < 2001 THEN
    RETURN 'CONSTRUTOR';
  ELSE
    RETURN 'MULTIPLICADOR';
  END IF;
END;
$$;

-- ============================================================================
-- 9) VIEW DE CONSOLIDACAO
-- ============================================================================

-- A view aplica filtro por auth.uid()/admin para evitar exposicao ampla.
CREATE OR REPLACE VIEW public.user_gamification AS
SELECT
  p.id AS user_id,
  p.email,
  p.full_name,
  p.tier,
  COALESCE(cb.coins, 0) AS coins,
  COALESCE(cb.coins_total, 0) AS coins_total,
  public.get_user_phase(COALESCE(cb.coins_total, 0)) AS phase,
  (
    SELECT COUNT(*)
    FROM public.achievements a
    WHERE a.user_id = p.id
  ) AS total_achievements,
  cb.updated_at AS coins_last_updated
FROM public.profiles p
LEFT JOIN public.coins_balance cb ON cb.user_id = p.id
WHERE p.status = 'active'
  AND (
    p.id = auth.uid()
    OR (SELECT public.current_user_is_admin())
    OR (SELECT auth.role()) = 'service_role'
  );

-- ============================================================================
-- 10) FUNCAO AUXILIAR SEGURA: AWARD_COINS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_coins INTEGER, new_total INTEGER, new_phase TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_coins INTEGER;
  v_new_total INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_action_type IS NULL OR LENGTH(TRIM(p_action_type)) = 0 THEN
    RAISE EXCEPTION 'action_type is required';
  END IF;

  INSERT INTO public.coins_balance (user_id, coins, coins_total)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE
    SET coins = public.coins_balance.coins + EXCLUDED.coins,
        coins_total = public.coins_balance.coins_total + EXCLUDED.coins_total
  RETURNING coins, coins_total
  INTO v_new_coins, v_new_total;

  INSERT INTO public.coins_transactions (user_id, amount, action_type, description, metadata)
  VALUES (
    p_user_id,
    p_amount,
    p_action_type,
    p_description,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY
  SELECT
    v_new_coins,
    v_new_total,
    public.get_user_phase(v_new_total);
END;
$$;

REVOKE ALL ON FUNCTION public.award_coins(UUID, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_coins(UUID, INTEGER, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================================
-- 11) SEED DE CODIGOS
-- ============================================================================

INSERT INTO public.workshop_codes (code, expires_at)
SELECT
  'WS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  NOW() + INTERVAL '1 year'
FROM generate_series(1, 10)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 12) DOCUMENTACAO
-- ============================================================================

COMMENT ON TABLE public.coins_balance IS 'Saldo atual e total historico de ZeroCoins por usuario';
COMMENT ON TABLE public.coins_transactions IS 'Historico de transacoes de coins';
COMMENT ON TABLE public.workshop_codes IS 'Codigos de resgate do Workshop para upgrade de tier';
COMMENT ON TABLE public.achievements IS 'Conquistas desbloqueadas pelos usuarios';
COMMENT ON COLUMN public.profiles.tier IS 'Tier de acesso: DESPERTAR, MOVIMENTO, ACELERACAO, AUTOGOVERNO';
COMMENT ON FUNCTION public.get_user_phase IS 'Calcula fase de gamificacao baseado em coins_total';
COMMENT ON FUNCTION public.award_coins IS 'Adiciona coins ao usuario e registra transacao';

-- ============================================================================
-- 13) VERIFICACAO FINAL
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('coins_balance', 'coins_transactions', 'workshop_codes', 'achievements');

  RAISE NOTICE 'Migracao concluida: % tabelas de gamificacao disponiveis.', v_count;

  SELECT COUNT(*)
  INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'tier';

  IF v_count > 0 THEN
    RAISE NOTICE 'Campo profiles.tier validado.';
  ELSE
    RAISE WARNING 'Campo profiles.tier nao encontrado.';
  END IF;
END $$;

COMMIT;
