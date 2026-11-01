-- ============================================================================
-- Patrimônio 2.0 — Etapa A
-- Marcos pelo aluno · Plano de ação do aluno · Fotos mensais · daily_bank
-- Additive. Rollback: scripts/rollback-patrimonio-2-etapa-a.sql
-- Depende de: migrate-patrimonio-etapa-a.sql
--
-- Conferência antes da atualização de conteúdo em staging:
-- SELECT id, title FROM public.member_area_content WHERE title ILIKE '%emerg%' OR description ILIKE '%emerg%';
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. patrimony_settings — banco da conta do dia a dia (checklist da reserva)
-- ---------------------------------------------------------------------------
ALTER TABLE public.patrimony_settings
  ADD COLUMN IF NOT EXISTS daily_bank text
    CHECK (daily_bank IS NULL OR char_length(btrim(daily_bank)) BETWEEN 1 AND 80);

-- ---------------------------------------------------------------------------
-- 2. patrimony_milestones — marco registrado pelo aluno
-- ---------------------------------------------------------------------------
ALTER TABLE public.patrimony_milestones
  ADD COLUMN IF NOT EXISTS frozen_by_role text NOT NULL DEFAULT 'mentor'
    CHECK (frozen_by_role IN ('aluno','mentor')),
  ADD COLUMN IF NOT EXISTS self_assessment smallint
    CHECK (self_assessment IS NULL OR self_assessment BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS student_reflection text
    CHECK (student_reflection IS NULL OR char_length(student_reflection) <= 2000);

-- Sequência, tipo e autoria são decididos no banco (o cliente não escolhe)
CREATE OR REPLACE FUNCTION public.patrimony_prepare_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next smallint;
  v_is_admin boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('patrimony_milestone:' || NEW.user_id::text));
  SELECT coalesce(max(m.sequence), -1) + 1 INTO v_next
  FROM public.patrimony_milestones m
  WHERE m.user_id = NEW.user_id;

  NEW.sequence := v_next;
  NEW.kind := CASE WHEN v_next = 0 THEN 'estado_a' ELSE 'sessao' END;
  IF v_next = 0 THEN NEW.label := 'Estado A'; END IF;
  NEW.created_at := now();

  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.current_user_is_admin();
  NEW.frozen_by := auth.uid();
  NEW.frozen_by_role := CASE WHEN v_is_admin THEN 'mentor' ELSE 'aluno' END;
  IF NOT v_is_admin THEN
    NEW.mentor_note := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patrimony_milestones_prepare ON public.patrimony_milestones;
CREATE TRIGGER trg_patrimony_milestones_prepare
  BEFORE INSERT ON public.patrimony_milestones
  FOR EACH ROW EXECUTE FUNCTION public.patrimony_prepare_milestone();

DROP POLICY IF EXISTS patrimony_milestones_self_insert ON public.patrimony_milestones;
CREATE POLICY patrimony_milestones_self_insert ON public.patrimony_milestones
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));

-- ---------------------------------------------------------------------------
-- 3. patrimony_commitments — plano de ação
-- ---------------------------------------------------------------------------
ALTER TABLE public.patrimony_commitments ALTER COLUMN milestone_id DROP NOT NULL;

ALTER TABLE public.patrimony_commitments
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_role text NOT NULL DEFAULT 'mentor'
    CHECK (created_by_role IN ('aluno','mentor')),
  ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'none'
    CHECK (link_type IN ('debt','goal','investment','asset','none')),
  ADD COLUMN IF NOT EXISTS link_id uuid,
  ADD COLUMN IF NOT EXISTS progress_source text NOT NULL DEFAULT 'manual'
    CHECK (progress_source IN ('manual','debt_balance','goal_contributions')),
  ADD COLUMN IF NOT EXISTS baseline_amount numeric(14,2)
    CHECK (baseline_amount IS NULL OR baseline_amount >= 0),
  ADD COLUMN IF NOT EXISTS target_amount numeric(14,2)
    CHECK (target_amount IS NULL OR target_amount > 0),
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'marco'
    CHECK (origin IN ('manual','resgate_adiado','marco')),
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(context) = 'object'),
  ADD COLUMN IF NOT EXISTS closed_in_milestone_id uuid
    REFERENCES public.patrimony_milestones(id) ON DELETE SET NULL;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.patrimony_commitments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) ILIKE '%aberto%'
  LOOP
    EXECUTE format('ALTER TABLE public.patrimony_commitments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE public.patrimony_commitments
  ADD CONSTRAINT patrimony_commitments_status_chk
  CHECK (status IN ('aberto','em_andamento','cumprido','nao_cumprido'));

CREATE INDEX IF NOT EXISTS idx_patrimony_commitments_open_plan
  ON public.patrimony_commitments(user_id, created_at) WHERE closed_in_milestone_id IS NULL;

CREATE OR REPLACE FUNCTION public.patrimony_stamp_commitment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_at := now();
  NEW.updated_at := now();
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.created_by := auth.uid();
  NEW.created_by_role := CASE WHEN public.current_user_is_admin() THEN 'mentor' ELSE 'aluno' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patrimony_commitments_stamp_insert ON public.patrimony_commitments;
CREATE TRIGGER trg_patrimony_commitments_stamp_insert
  BEFORE INSERT ON public.patrimony_commitments
  FOR EACH ROW EXECUTE FUNCTION public.patrimony_stamp_commitment_insert();

CREATE OR REPLACE FUNCTION public.patrimony_guard_commitment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('cumprido','nao_cumprido') THEN
      NEW.resolved_at := now();
      NEW.resolved_by := coalesce(auth.uid(), NEW.resolved_by);
    ELSE
      NEW.resolved_at := NULL;
      NEW.resolved_by := NULL;
    END IF;
  END IF;

  IF auth.role() = 'service_role' OR public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.user_id := OLD.user_id;
  NEW.created_by := OLD.created_by;
  NEW.created_by_role := OLD.created_by_role;
  NEW.created_at := OLD.created_at;
  NEW.milestone_id := OLD.milestone_id;
  NEW.origin := OLD.origin;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS patrimony_commitments_self_insert ON public.patrimony_commitments;
CREATE POLICY patrimony_commitments_self_insert ON public.patrimony_commitments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));

DROP POLICY IF EXISTS patrimony_commitments_self_delete ON public.patrimony_commitments;
CREATE POLICY patrimony_commitments_self_delete ON public.patrimony_commitments
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND created_by_role = 'aluno' AND (SELECT public.patrimony_has_access()));

-- ---------------------------------------------------------------------------
-- 4. patrimony_monthly_snapshots — foto automática do dia 1º (não é marco)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patrimony_monthly_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patrimony_monthly_snapshots_user_month_key UNIQUE (user_id, month)
);

ALTER TABLE public.patrimony_monthly_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patrimony_monthly_snapshots_self_select ON public.patrimony_monthly_snapshots;
CREATE POLICY patrimony_monthly_snapshots_self_select ON public.patrimony_monthly_snapshots
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS patrimony_monthly_snapshots_admin_select ON public.patrimony_monthly_snapshots;
CREATE POLICY patrimony_monthly_snapshots_admin_select ON public.patrimony_monthly_snapshots
  FOR SELECT TO authenticated
  USING ((SELECT public.current_user_is_admin()));

REVOKE ALL ON public.patrimony_monthly_snapshots FROM anon;
GRANT SELECT ON public.patrimony_monthly_snapshots TO authenticated;
GRANT ALL ON public.patrimony_monthly_snapshots TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Conteúdo: Reserva de Liquidez
-- ---------------------------------------------------------------------------
UPDATE public.member_area_content
SET title = 'Calculadora de Reserva de Liquidez'
WHERE title = 'Calculadora de Reserva de Emergencia';

COMMIT;
