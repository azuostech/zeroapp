-- ============================================================================
-- Gestão de Patrimônio — Etapa A
-- Tabelas: patrimony_settings, patrimony_debts, patrimony_assets,
--          patrimony_change_log, patrimony_milestones, patrimony_commitments
-- Additive-only. Rollback: scripts/rollback-patrimonio-etapa-a.sql
-- Depende de: public.current_user_is_admin() (gamificacao_migracao_corrigida.sql)
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.patrimony_has_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR upper(coalesce(p.tier, 'DESPERTAR')) IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
  );
$$;
REVOKE ALL ON FUNCTION public.patrimony_has_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patrimony_has_access() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.patrimony_stamp_actor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  NEW.updated_by := auth.uid();
  NEW.updated_by_role := CASE WHEN public.current_user_is_admin() THEN 'mentor' ELSE 'aluno' END;
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid(); NEW.created_at := now();
  ELSE
    NEW.created_by := OLD.created_by; NEW.created_at := OLD.created_at; NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.patrimony_guard_debt_coins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.coins_mapped_awarded_at := NULL; NEW.coins_cleared_awarded_at := NULL;
  ELSE
    NEW.coins_mapped_awarded_at := OLD.coins_mapped_awarded_at;
    NEW.coins_cleared_awarded_at := OLD.coins_cleared_awarded_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.patrimony_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

CREATE TABLE IF NOT EXISTS public.patrimony_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  monthly_income numeric(14,2) CHECK (monthly_income IS NULL OR monthly_income >= 0),
  monthly_cost_of_living numeric(14,2) CHECK (monthly_cost_of_living IS NULL OR monthly_cost_of_living >= 0),
  reserve_target_months smallint NOT NULL DEFAULT 6 CHECK (reserve_target_months BETWEEN 1 AND 24),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.patrimony_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  debt_type text NOT NULL CHECK (debt_type IN ('cartao','cheque_especial','emprestimo','financiamento','consignado','familia','outro')),
  creditor text NOT NULL CHECK (char_length(btrim(creditor)) BETWEEN 1 AND 80),
  current_balance numeric(14,2) NOT NULL CHECK (current_balance >= 0),
  interest_rate_monthly numeric(7,4) CHECK (interest_rate_monthly IS NULL OR (interest_rate_monthly >= 0 AND interest_rate_monthly <= 100)),
  interest_rate_input text NOT NULL DEFAULT 'am' CHECK (interest_rate_input IN ('am','aa','calculada','desconhecida')),
  is_installment boolean NOT NULL DEFAULT false,
  installment_amount numeric(14,2) CHECK (installment_amount IS NULL OR installment_amount >= 0),
  installments_total smallint CHECK (installments_total IS NULL OR installments_total BETWEEN 1 AND 600),
  installments_paid smallint NOT NULL DEFAULT 0 CHECK (installments_paid >= 0),
  monthly_payment numeric(14,2) CHECK (monthly_payment IS NULL OR monthly_payment >= 0),
  due_day smallint CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31),
  days_overdue integer NOT NULL DEFAULT 0 CHECK (days_overdue >= 0),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','quitada')),
  paid_off_at timestamptz,
  coins_mapped_awarded_at timestamptz,
  coins_cleared_awarded_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by_role text NOT NULL DEFAULT 'aluno' CHECK (updated_by_role IN ('aluno','mentor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT patrimony_debts_installments_chk CHECK (NOT is_installment OR (installments_total IS NOT NULL AND installments_paid <= installments_total)),
  CONSTRAINT patrimony_debts_paid_off_chk CHECK ((status = 'quitada') = (paid_off_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_patrimony_debts_user_active ON public.patrimony_debts(user_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.patrimony_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('reserva','investimento','bem','outro')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  institution text CHECK (institution IS NULL OR char_length(institution) <= 80),
  current_value numeric(14,2) NOT NULL CHECK (current_value >= 0),
  liquidity text CHECK (liquidity IS NULL OR liquidity IN ('diaria','curto_prazo','longo_prazo','iliquido')),
  linked_debt_id uuid REFERENCES public.patrimony_debts(id) ON DELETE SET NULL,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by_role text NOT NULL DEFAULT 'aluno' CHECK (updated_by_role IN ('aluno','mentor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_patrimony_assets_user_active ON public.patrimony_assets(user_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.patrimony_change_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('asset','debt','settings')),
  entity_id uuid,
  action text NOT NULL CHECK (action IN ('create','update','confirm','archive','payoff')),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(changes) = 'object'),
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_by_role text NOT NULL CHECK (changed_by_role IN ('aluno','mentor')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patrimony_change_log_entity ON public.patrimony_change_log(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patrimony_change_log_user ON public.patrimony_change_log(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.patrimony_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sequence smallint NOT NULL CHECK (sequence >= 0), kind text NOT NULL CHECK (kind IN ('estado_a','sessao')),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 60), milestone_date date NOT NULL,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'), metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'object'),
  mentor_note text CHECK (mentor_note IS NULL OR char_length(mentor_note) <= 2000),
  frozen_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patrimony_milestones_user_sequence_key UNIQUE (user_id, sequence),
  CONSTRAINT patrimony_milestones_estado_a_chk CHECK ((kind = 'estado_a') = (sequence = 0))
);
CREATE INDEX IF NOT EXISTS idx_patrimony_milestones_user ON public.patrimony_milestones(user_id, sequence DESC);

CREATE OR REPLACE FUNCTION public.patrimony_block_milestone_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'milestone_immutable' USING ERRCODE = '42501'; END;
$$;

CREATE TABLE IF NOT EXISTS public.patrimony_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES public.patrimony_milestones(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 200), due_date date,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','cumprido','nao_cumprido')),
  resolved_at timestamptz, resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patrimony_commitments_user ON public.patrimony_commitments(user_id, status);

CREATE OR REPLACE FUNCTION public.patrimony_guard_commitment_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.role() = 'service_role' OR public.current_user_is_admin() THEN RETURN NEW; END IF;
  NEW.user_id := OLD.user_id; NEW.milestone_id := OLD.milestone_id; NEW.description := OLD.description;
  NEW.due_date := OLD.due_date; NEW.created_at := OLD.created_at; NEW.resolved_by := auth.uid();
  NEW.resolved_at := CASE WHEN NEW.status = 'aberto' THEN NULL ELSE now() END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patrimony_debts_actor ON public.patrimony_debts;
CREATE TRIGGER trg_patrimony_debts_actor BEFORE INSERT OR UPDATE ON public.patrimony_debts FOR EACH ROW EXECUTE FUNCTION public.patrimony_stamp_actor();
DROP TRIGGER IF EXISTS trg_patrimony_debts_coins_guard ON public.patrimony_debts;
CREATE TRIGGER trg_patrimony_debts_coins_guard BEFORE INSERT OR UPDATE ON public.patrimony_debts FOR EACH ROW EXECUTE FUNCTION public.patrimony_guard_debt_coins();
DROP TRIGGER IF EXISTS trg_patrimony_assets_actor ON public.patrimony_assets;
CREATE TRIGGER trg_patrimony_assets_actor BEFORE INSERT OR UPDATE ON public.patrimony_assets FOR EACH ROW EXECUTE FUNCTION public.patrimony_stamp_actor();
DROP TRIGGER IF EXISTS trg_patrimony_settings_touch ON public.patrimony_settings;
CREATE TRIGGER trg_patrimony_settings_touch BEFORE UPDATE ON public.patrimony_settings FOR EACH ROW EXECUTE FUNCTION public.patrimony_touch_updated_at();
DROP TRIGGER IF EXISTS trg_patrimony_milestones_immutable ON public.patrimony_milestones;
CREATE TRIGGER trg_patrimony_milestones_immutable BEFORE UPDATE ON public.patrimony_milestones FOR EACH ROW EXECUTE FUNCTION public.patrimony_block_milestone_update();
DROP TRIGGER IF EXISTS trg_patrimony_commitments_guard ON public.patrimony_commitments;
CREATE TRIGGER trg_patrimony_commitments_guard BEFORE UPDATE ON public.patrimony_commitments FOR EACH ROW EXECUTE FUNCTION public.patrimony_guard_commitment_update();

ALTER TABLE public.patrimony_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patrimony_settings_self ON public.patrimony_settings;
CREATE POLICY patrimony_settings_self ON public.patrimony_settings FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access())) WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_settings_admin ON public.patrimony_settings;
CREATE POLICY patrimony_settings_admin ON public.patrimony_settings FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS patrimony_debts_self_select ON public.patrimony_debts;
CREATE POLICY patrimony_debts_self_select ON public.patrimony_debts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_debts_self_insert ON public.patrimony_debts;
CREATE POLICY patrimony_debts_self_insert ON public.patrimony_debts FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_debts_self_update ON public.patrimony_debts;
CREATE POLICY patrimony_debts_self_update ON public.patrimony_debts FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access())) WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_debts_admin ON public.patrimony_debts;
CREATE POLICY patrimony_debts_admin ON public.patrimony_debts FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS patrimony_assets_self_select ON public.patrimony_assets;
CREATE POLICY patrimony_assets_self_select ON public.patrimony_assets FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_assets_self_insert ON public.patrimony_assets;
CREATE POLICY patrimony_assets_self_insert ON public.patrimony_assets FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_assets_self_update ON public.patrimony_assets;
CREATE POLICY patrimony_assets_self_update ON public.patrimony_assets FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access())) WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_assets_admin ON public.patrimony_assets;
CREATE POLICY patrimony_assets_admin ON public.patrimony_assets FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS patrimony_change_log_self_select ON public.patrimony_change_log;
CREATE POLICY patrimony_change_log_self_select ON public.patrimony_change_log FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_change_log_self_insert ON public.patrimony_change_log;
CREATE POLICY patrimony_change_log_self_insert ON public.patrimony_change_log FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND changed_by = (SELECT auth.uid()) AND changed_by_role = 'aluno' AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_change_log_admin_select ON public.patrimony_change_log;
CREATE POLICY patrimony_change_log_admin_select ON public.patrimony_change_log FOR SELECT TO authenticated USING ((SELECT public.current_user_is_admin()));
DROP POLICY IF EXISTS patrimony_change_log_admin_insert ON public.patrimony_change_log;
CREATE POLICY patrimony_change_log_admin_insert ON public.patrimony_change_log FOR INSERT TO authenticated WITH CHECK ((SELECT public.current_user_is_admin()) AND changed_by = (SELECT auth.uid()) AND changed_by_role = 'mentor');

DROP POLICY IF EXISTS patrimony_milestones_self_select ON public.patrimony_milestones;
CREATE POLICY patrimony_milestones_self_select ON public.patrimony_milestones FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_milestones_admin ON public.patrimony_milestones;
CREATE POLICY patrimony_milestones_admin ON public.patrimony_milestones FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS patrimony_commitments_self_select ON public.patrimony_commitments;
CREATE POLICY patrimony_commitments_self_select ON public.patrimony_commitments FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_commitments_self_update ON public.patrimony_commitments;
CREATE POLICY patrimony_commitments_self_update ON public.patrimony_commitments FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access())) WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS patrimony_commitments_admin ON public.patrimony_commitments;
CREATE POLICY patrimony_commitments_admin ON public.patrimony_commitments FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

REVOKE ALL ON public.patrimony_settings, public.patrimony_debts, public.patrimony_assets, public.patrimony_change_log, public.patrimony_milestones, public.patrimony_commitments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patrimony_settings, public.patrimony_debts, public.patrimony_assets, public.patrimony_milestones, public.patrimony_commitments TO authenticated;
GRANT SELECT, INSERT ON public.patrimony_change_log TO authenticated;
GRANT ALL ON public.patrimony_settings, public.patrimony_debts, public.patrimony_assets, public.patrimony_change_log, public.patrimony_milestones, public.patrimony_commitments TO service_role;

COMMIT;
