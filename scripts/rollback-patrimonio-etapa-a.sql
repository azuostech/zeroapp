BEGIN;
DROP TABLE IF EXISTS public.patrimony_commitments;
DROP TABLE IF EXISTS public.patrimony_milestones;
DROP TABLE IF EXISTS public.patrimony_change_log;
DROP TABLE IF EXISTS public.patrimony_assets;
DROP TABLE IF EXISTS public.patrimony_debts;
DROP TABLE IF EXISTS public.patrimony_settings;
DROP FUNCTION IF EXISTS public.patrimony_guard_commitment_update();
DROP FUNCTION IF EXISTS public.patrimony_block_milestone_update();
DROP FUNCTION IF EXISTS public.patrimony_touch_updated_at();
DROP FUNCTION IF EXISTS public.patrimony_guard_debt_coins();
DROP FUNCTION IF EXISTS public.patrimony_stamp_actor();
DROP FUNCTION IF EXISTS public.patrimony_has_access();
-- coins_transactions com action_type = 'debt_mapped' são preservadas (histórico de coins não é apagado)
COMMIT;
