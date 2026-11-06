-- ============================================================================
-- Investimentos — Etapa A
-- Tabelas: investment_goals, investment_positions, investment_movements,
--          investment_policies, investment_import_batches, investment_coin_claims,
--          investment_monthly_values, market_quotes, market_index_series
-- Additive. Reutiliza: patrimony_has_access(), patrimony_stamp_actor(), current_user_is_admin()
-- Rollback: scripts/rollback-investimentos-etapa-a.sql
-- ============================================================================
BEGIN;

-- 0. Autoria para tabelas só com created_by/created_by_role
CREATE OR REPLACE FUNCTION public.investment_stamp_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  NEW.created_by := auth.uid();
  NEW.created_by_role := CASE WHEN public.current_user_is_admin() THEN 'mentor' ELSE 'aluno' END;
  RETURN NEW;
END;
$$;

-- 1. Objetivos (o "emprego" do dinheiro)
CREATE TABLE IF NOT EXISTS public.investment_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('reserva_liquidez','objetivo_prazo','independencia')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  target_amount numeric(14,2) CHECK (target_amount IS NULL OR target_amount > 0),
  target_date date,
  sort_order smallint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by_role text NOT NULL DEFAULT 'aluno' CHECK (updated_by_role IN ('aluno','mentor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT investment_goals_prazo_chk
    CHECK (kind <> 'objetivo_prazo' OR (target_amount IS NOT NULL AND target_date IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_investment_goals_singleton
  ON public.investment_goals(user_id, kind)
  WHERE kind IN ('reserva_liquidez','independencia') AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investment_goals_user
  ON public.investment_goals(user_id) WHERE archived_at IS NULL;

-- 2. Posições
CREATE TABLE IF NOT EXISTS public.investment_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.investment_goals(id) ON DELETE RESTRICT,
  asset_class text NOT NULL CHECK (asset_class IN (
    'tesouro','renda_fixa_bancaria','debenture_cri_cra','fundo','previdencia',
    'acao','fii','etf','bdr','coe','cripto','moeda','outro')),
  product text CHECK (product IS NULL OR char_length(product) <= 40),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  ticker text CHECK (ticker IS NULL OR ticker ~ '^[A-Z0-9]{4,12}$'),
  institution text CHECK (institution IS NULL OR char_length(institution) <= 80),
  cnpj text CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  tesouro_code text CHECK (tesouro_code IS NULL OR char_length(tesouro_code) <= 80),
  indexer text CHECK (indexer IS NULL OR indexer IN ('cdi','selic','pre','ipca','igpm','nenhum')),
  rate numeric(9,4) CHECK (rate IS NULL OR rate >= 0),
  quantity numeric(20,8) CHECK (quantity IS NULL OR quantity >= 0),
  pricing_method text NOT NULL CHECK (pricing_method IN (
    'b3_quote','tesouro_price','cdi_curve','selic_curve','pre_curve','ipca_curve',
    'cvm_quota','fx_ptax','crypto_quote','manual')),
  liquidity_days smallint CHECK (liquidity_days IS NULL OR liquidity_days BETWEEN 0 AND 3650),
  redeemable_from date,
  maturity_date date,
  guarantee text NOT NULL DEFAULT 'desconhecida'
    CHECK (guarantee IN ('fgc','tesouro','nenhuma','desconhecida')),
  risk_flags text[] NOT NULL DEFAULT '{}',
  manual_value numeric(14,2) CHECK (manual_value IS NULL OR manual_value >= 0),
  manual_value_at timestamptz,
  current_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  current_value_at timestamptz,
  current_value_source text NOT NULL DEFAULT 'manual'
    CHECK (current_value_source IN ('b3','tesouro','cvm','bcb','estimado','manual')),
  curve_value numeric(14,2) CHECK (curve_value IS NULL OR curve_value >= 0),
  curve_value_at timestamptz,
  invested_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','encerrada')),
  migrated_from_asset_id uuid REFERENCES public.patrimony_assets(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by_role text NOT NULL DEFAULT 'aluno' CHECK (updated_by_role IN ('aluno','mentor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_investment_positions_user ON public.investment_positions(user_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investment_positions_goal ON public.investment_positions(goal_id);
CREATE INDEX IF NOT EXISTS idx_investment_positions_ticker ON public.investment_positions(ticker) WHERE ticker IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investment_positions_cnpj ON public.investment_positions(cnpj) WHERE cnpj IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_investment_positions_migrated_asset
  ON public.investment_positions(migrated_from_asset_id) WHERE migrated_from_asset_id IS NOT NULL;

-- 3. Livro-razão
CREATE TABLE IF NOT EXISTS public.investment_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.investment_positions(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('aporte','resgate','vencimento','provento','ajuste')),
  amount numeric(14,2) NOT NULL,
  quantity numeric(20,8),
  unit_price numeric(20,8),
  occurred_on date NOT NULL,
  reason_code text CHECK (reason_code IS NULL OR reason_code IN (
    'objetivo_planejado','imprevisto','quitar_divida','trocar_investimento','medo_queda','outro')),
  feeling text CHECK (feeling IS NULL OR feeling IN ('tranquilo','ansioso','com_medo','empolgado','pressionado')),
  decision_note text CHECK (decision_note IS NULL OR char_length(decision_note) <= 500),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','b3_import','migracao_patrimonio')),
  import_batch_id uuid,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_role text NOT NULL DEFAULT 'aluno' CHECK (created_by_role IN ('aluno','mentor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investment_movements_amount_chk CHECK (kind = 'ajuste' OR amount > 0),
  CONSTRAINT investment_movements_reason_chk CHECK (reason_code IS NULL OR kind = 'resgate'),
  CONSTRAINT investment_movements_feeling_chk CHECK (feeling IS NULL OR kind = 'resgate')
);
CREATE INDEX IF NOT EXISTS idx_investment_movements_position ON public.investment_movements(position_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_investment_movements_user_date ON public.investment_movements(user_id, occurred_on DESC);

CREATE OR REPLACE FUNCTION public.investment_guard_movement_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.user_id := OLD.user_id;
  NEW.position_id := OLD.position_id;
  NEW.created_by := OLD.created_by;
  NEW.created_by_role := OLD.created_by_role;
  NEW.created_at := OLD.created_at;
  NEW.source := OLD.source;
  RETURN NEW;
END;
$$;

-- 4. Política versionada e imutável
CREATE TABLE IF NOT EXISTS public.investment_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version >= 1),
  rules jsonb NOT NULL CHECK (jsonb_typeof(rules) = 'array'),
  mentor_note text CHECK (mentor_note IS NULL OR char_length(mentor_note) <= 2000),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_role text NOT NULL DEFAULT 'sistema' CHECK (created_by_role IN ('aluno','mentor','sistema')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT investment_policies_user_version_key UNIQUE (user_id, version)
);

CREATE OR REPLACE FUNCTION public.investment_prepare_policy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev public.investment_policies%ROWTYPE;
  v_is_admin boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('investment_policy:' || NEW.user_id::text));
  SELECT * INTO v_prev FROM public.investment_policies
  WHERE user_id = NEW.user_id ORDER BY version DESC LIMIT 1;
  NEW.version := coalesce(v_prev.version, 0) + 1;
  NEW.created_at := now();
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  v_is_admin := public.current_user_is_admin();
  NEW.created_by := auth.uid();
  NEW.created_by_role := CASE WHEN v_is_admin THEN 'mentor' ELSE 'aluno' END;
  IF NOT v_is_admin THEN NEW.mentor_note := v_prev.mentor_note; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.investment_block_policy_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'policy_immutable' USING ERRCODE = '42501';
END;
$$;

-- 5. Importações B3 (o arquivo não é guardado)
CREATE TABLE IF NOT EXISTS public.investment_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'b3_posicao' CHECK (source IN ('b3_posicao')),
  file_name text CHECK (file_name IS NULL OR char_length(file_name) <= 120),
  rows_total integer NOT NULL DEFAULT 0,
  rows_imported integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(summary) = 'object'),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_role text NOT NULL DEFAULT 'aluno' CHECK (created_by_role IN ('aluno','mentor')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.investment_movements DROP CONSTRAINT IF EXISTS investment_movements_import_batch_fk;
ALTER TABLE public.investment_movements ADD CONSTRAINT investment_movements_import_batch_fk
  FOREIGN KEY (import_batch_id) REFERENCES public.investment_import_batches(id) ON DELETE SET NULL;

-- 6. Trava atômica de ZeroCoins (só service_role)
CREATE TABLE IF NOT EXISTS public.investment_coin_claims (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_key text NOT NULL CHECK (char_length(claim_key) BETWEEN 1 AND 60),
  action_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_key)
);

-- 7. Valor de cada posição no dia 1º
CREATE TABLE IF NOT EXISTS public.investment_monthly_values (
  position_id uuid NOT NULL REFERENCES public.investment_positions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  value numeric(14,2) NOT NULL,
  curve_value numeric(14,2),
  invested_amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (position_id, month)
);
CREATE INDEX IF NOT EXISTS idx_investment_monthly_values_user ON public.investment_monthly_values(user_id, month);

-- 8. Cache global de mercado (escrita só service_role)
CREATE TABLE IF NOT EXISTS public.market_quotes (
  source text NOT NULL CHECK (source IN ('brapi','tesouro','cvm','coingecko')),
  symbol text NOT NULL,
  quote_date date NOT NULL,
  price numeric(20,8) NOT NULL CHECK (price >= 0),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, symbol, quote_date)
);
CREATE INDEX IF NOT EXISTS idx_market_quotes_latest ON public.market_quotes(source, symbol, quote_date DESC);

CREATE TABLE IF NOT EXISTS public.market_index_series (
  series text NOT NULL CHECK (series IN ('cdi','selic','ipca','ptax_usd')),
  ref_date date NOT NULL,
  value numeric(14,8) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series, ref_date)
);

-- 9. Triggers
DROP TRIGGER IF EXISTS trg_investment_goals_actor ON public.investment_goals;
CREATE TRIGGER trg_investment_goals_actor BEFORE INSERT OR UPDATE ON public.investment_goals
  FOR EACH ROW EXECUTE FUNCTION public.patrimony_stamp_actor();
DROP TRIGGER IF EXISTS trg_investment_positions_actor ON public.investment_positions;
CREATE TRIGGER trg_investment_positions_actor BEFORE INSERT OR UPDATE ON public.investment_positions
  FOR EACH ROW EXECUTE FUNCTION public.patrimony_stamp_actor();
DROP TRIGGER IF EXISTS trg_investment_movements_stamp ON public.investment_movements;
CREATE TRIGGER trg_investment_movements_stamp BEFORE INSERT ON public.investment_movements
  FOR EACH ROW EXECUTE FUNCTION public.investment_stamp_insert();
DROP TRIGGER IF EXISTS trg_investment_movements_guard ON public.investment_movements;
CREATE TRIGGER trg_investment_movements_guard BEFORE UPDATE ON public.investment_movements
  FOR EACH ROW EXECUTE FUNCTION public.investment_guard_movement_update();
DROP TRIGGER IF EXISTS trg_investment_policies_prepare ON public.investment_policies;
CREATE TRIGGER trg_investment_policies_prepare BEFORE INSERT ON public.investment_policies
  FOR EACH ROW EXECUTE FUNCTION public.investment_prepare_policy();
DROP TRIGGER IF EXISTS trg_investment_policies_immutable ON public.investment_policies;
CREATE TRIGGER trg_investment_policies_immutable BEFORE UPDATE ON public.investment_policies
  FOR EACH ROW EXECUTE FUNCTION public.investment_block_policy_update();
DROP TRIGGER IF EXISTS trg_investment_import_batches_stamp ON public.investment_import_batches;
CREATE TRIGGER trg_investment_import_batches_stamp BEFORE INSERT ON public.investment_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.investment_stamp_insert();

-- 10. RLS
ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_coin_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_monthly_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_index_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS investment_goals_self_select ON public.investment_goals;
CREATE POLICY investment_goals_self_select ON public.investment_goals FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_goals_self_insert ON public.investment_goals;
CREATE POLICY investment_goals_self_insert ON public.investment_goals FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_goals_self_update ON public.investment_goals;
CREATE POLICY investment_goals_self_update ON public.investment_goals FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access())) WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_goals_admin ON public.investment_goals;
CREATE POLICY investment_goals_admin ON public.investment_goals FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS investment_positions_self_select ON public.investment_positions;
CREATE POLICY investment_positions_self_select ON public.investment_positions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_positions_self_insert ON public.investment_positions;
CREATE POLICY investment_positions_self_insert ON public.investment_positions FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_positions_self_update ON public.investment_positions;
CREATE POLICY investment_positions_self_update ON public.investment_positions FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access())) WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_positions_admin ON public.investment_positions;
CREATE POLICY investment_positions_admin ON public.investment_positions FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS investment_movements_self ON public.investment_movements;
CREATE POLICY investment_movements_self ON public.investment_movements FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access())) WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_movements_admin ON public.investment_movements;
CREATE POLICY investment_movements_admin ON public.investment_movements FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS investment_policies_self_select ON public.investment_policies;
CREATE POLICY investment_policies_self_select ON public.investment_policies FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_policies_self_insert ON public.investment_policies;
CREATE POLICY investment_policies_self_insert ON public.investment_policies FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_policies_admin_select ON public.investment_policies;
CREATE POLICY investment_policies_admin_select ON public.investment_policies FOR SELECT TO authenticated USING ((SELECT public.current_user_is_admin()));
DROP POLICY IF EXISTS investment_policies_admin_insert ON public.investment_policies;
CREATE POLICY investment_policies_admin_insert ON public.investment_policies FOR INSERT TO authenticated WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS investment_import_batches_self ON public.investment_import_batches;
CREATE POLICY investment_import_batches_self ON public.investment_import_batches FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_import_batches_self_insert ON public.investment_import_batches;
CREATE POLICY investment_import_batches_self_insert ON public.investment_import_batches FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_import_batches_admin ON public.investment_import_batches;
CREATE POLICY investment_import_batches_admin ON public.investment_import_batches FOR ALL TO authenticated USING ((SELECT public.current_user_is_admin())) WITH CHECK ((SELECT public.current_user_is_admin()));

-- investment_coin_claims: nenhuma policy para authenticated
DROP POLICY IF EXISTS investment_monthly_values_self_select ON public.investment_monthly_values;
CREATE POLICY investment_monthly_values_self_select ON public.investment_monthly_values FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND (SELECT public.patrimony_has_access()));
DROP POLICY IF EXISTS investment_monthly_values_admin_select ON public.investment_monthly_values;
CREATE POLICY investment_monthly_values_admin_select ON public.investment_monthly_values FOR SELECT TO authenticated USING ((SELECT public.current_user_is_admin()));
DROP POLICY IF EXISTS market_quotes_read ON public.market_quotes;
CREATE POLICY market_quotes_read ON public.market_quotes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS market_index_series_read ON public.market_index_series;
CREATE POLICY market_index_series_read ON public.market_index_series FOR SELECT TO authenticated USING (true);

-- 11. Grants
REVOKE ALL ON public.investment_goals, public.investment_positions, public.investment_movements,
  public.investment_policies, public.investment_import_batches, public.investment_coin_claims,
  public.investment_monthly_values, public.market_quotes, public.market_index_series FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.investment_goals, public.investment_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_movements TO authenticated;
GRANT SELECT, INSERT ON public.investment_policies, public.investment_import_batches TO authenticated;
GRANT SELECT ON public.investment_monthly_values, public.market_quotes, public.market_index_series TO authenticated;
GRANT ALL ON public.investment_goals, public.investment_positions, public.investment_movements,
  public.investment_policies, public.investment_import_batches, public.investment_coin_claims,
  public.investment_monthly_values, public.market_quotes, public.market_index_series TO service_role;

COMMIT;
