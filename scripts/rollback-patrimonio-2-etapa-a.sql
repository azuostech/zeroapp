-- Patrimônio 2.0 — rollback da Etapa A.
-- As colunas novas são mantidas para não perder dados.
-- milestone_id também permanece opcional, pois podem existir ações sem marco.
BEGIN;

DROP TRIGGER IF EXISTS trg_patrimony_milestones_prepare ON public.patrimony_milestones;
DROP FUNCTION IF EXISTS public.patrimony_prepare_milestone();

DROP TRIGGER IF EXISTS trg_patrimony_commitments_stamp_insert ON public.patrimony_commitments;
DROP FUNCTION IF EXISTS public.patrimony_stamp_commitment_insert();

DROP POLICY IF EXISTS patrimony_milestones_self_insert ON public.patrimony_milestones;
DROP POLICY IF EXISTS patrimony_commitments_self_insert ON public.patrimony_commitments;
DROP POLICY IF EXISTS patrimony_commitments_self_delete ON public.patrimony_commitments;

UPDATE public.patrimony_commitments
SET status = 'aberto', resolved_at = NULL, resolved_by = NULL
WHERE status = 'em_andamento';

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
  ADD CONSTRAINT patrimony_commitments_status_check
  CHECK (status IN ('aberto','cumprido','nao_cumprido'));

-- Restauração literal da função original de migrate-patrimonio-etapa-a.sql.
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

DROP INDEX IF EXISTS public.idx_patrimony_commitments_open_plan;
DROP TABLE IF EXISTS public.patrimony_monthly_snapshots;

COMMIT;
