-- ============================================================================
-- AJUSTE 4A - ADMIN DE CONTEUDO
-- Projeto: ZeroApp
-- Objetivo: garantir updated_at em member_area_content
-- Observacao: script idempotente
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $f$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $f$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname = 'member_area_content'
      AND t.tgisinternal = false
      AND p.proname = 'update_updated_at_column'
  ) THEN
    CREATE TRIGGER set_updated_at_member_content
      BEFORE UPDATE ON public.member_area_content
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
DECLARE
  v_trigger_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'member_area_content'
    AND t.tgisinternal = false;

  RAISE NOTICE 'Ajuste 4A SQL: % trigger(s) em member_area_content.', v_trigger_count;
END $$;

COMMIT;
