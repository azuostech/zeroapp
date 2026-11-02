-- Investimentos — rollback da Etapa A.
-- ATENÇÃO: executar somente enquanto não houver dados reais de investimentos.
-- Coins investment_first, investment_month e reserve_month_reached são preservadas.
BEGIN;

DROP TABLE IF EXISTS public.market_index_series;
DROP TABLE IF EXISTS public.market_quotes;
DROP TABLE IF EXISTS public.investment_monthly_values;
DROP TABLE IF EXISTS public.investment_coin_claims;
DROP TABLE IF EXISTS public.investment_movements;
DROP TABLE IF EXISTS public.investment_import_batches;
DROP TABLE IF EXISTS public.investment_policies;
DROP TABLE IF EXISTS public.investment_positions;
DROP TABLE IF EXISTS public.investment_goals;

DROP FUNCTION IF EXISTS public.investment_block_policy_update();
DROP FUNCTION IF EXISTS public.investment_prepare_policy();
DROP FUNCTION IF EXISTS public.investment_guard_movement_update();
DROP FUNCTION IF EXISTS public.investment_stamp_insert();

COMMIT;
