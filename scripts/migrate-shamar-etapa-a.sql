-- ============================================================================
-- SHAMAR - ETAPA A
-- Projeto: ZeroApp - Financas do Zero
-- Objetivo: SQL de base do modulo SHAMAR (tabelas, RLS, funcoes, seeds, storage)
-- Observacao: script idempotente para executar no Supabase SQL Editor.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Verificacao inicial
-- --------------------------------------------------------------------------
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'shamar_%'
ORDER BY tablename;

SELECT name
FROM storage.buckets
ORDER BY name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'shamar_unlocked';

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Pre-requisitos
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shamar_unlocked bool NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_shamar_unlocked
  ON public.profiles (shamar_unlocked)
  WHERE shamar_unlocked = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'tier'
  ) THEN
    RAISE EXCEPTION 'profiles.tier nao encontrado. Execute antes as migracoes de gamificacao/acesso.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'turma'
  ) THEN
    RAISE EXCEPTION 'profiles.turma nao encontrado. Execute antes a migracao de turmas.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
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
      AND (
        p.role = 'admin'
        OR COALESCE((to_jsonb(p)->>'is_admin')::boolean, false) = true
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.profile_has_turma(user_turmas text, required_turma text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  WITH required AS (
    SELECT lower(btrim(turma_item)) AS turma
    FROM regexp_split_to_table(COALESCE(required_turma, ''), '[[:space:]]*[,;][[:space:]]*') AS turma_item
    WHERE NULLIF(btrim(turma_item), '') IS NOT NULL
  ),
  user_list AS (
    SELECT lower(btrim(turma_item)) AS turma
    FROM regexp_split_to_table(COALESCE(user_turmas, ''), '[[:space:]]*[,;][[:space:]]*') AS turma_item
    WHERE NULLIF(btrim(turma_item), '') IS NOT NULL
  )
  SELECT
    NOT EXISTS (SELECT 1 FROM required)
    OR EXISTS (
      SELECT 1
      FROM required
      INNER JOIN user_list USING (turma)
    );
$$;

REVOKE ALL ON FUNCTION public.profile_has_turma(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_has_turma(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.shamar_profile_can_access_turma(required_turma text)
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
      AND p.status = 'active'
      AND p.shamar_unlocked = true
      AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO')
      AND (
        p.turma = required_turma
        OR public.profile_has_turma(p.turma, required_turma)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.shamar_profile_can_access_turma(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shamar_profile_can_access_turma(text) TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- 2. Bucket Supabase Storage
-- --------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shamar-provas',
  'shamar-provas',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS shamar_provas_upload ON storage.objects;
DROP POLICY IF EXISTS shamar_provas_read ON storage.objects;
DROP POLICY IF EXISTS shamar_provas_admin ON storage.objects;

CREATE POLICY shamar_provas_upload
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shamar-provas'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY shamar_provas_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'shamar-provas'
    AND (
      (SELECT auth.uid())::text = (storage.foldername(name))[1]
      OR (SELECT public.is_admin())
    )
  );

CREATE POLICY shamar_provas_admin
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'shamar-provas'
    AND (SELECT public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'shamar-provas'
    AND (SELECT public.is_admin())
  );

-- --------------------------------------------------------------------------
-- 3. Configuracao da temporada por turma
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_tribo_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma text NOT NULL,
  meta_total numeric NOT NULL CHECK (meta_total > 0),
  duration_days int NOT NULL CHECK (duration_days IN (30, 90, 180, 365)),
  started_at date NOT NULL,
  ends_at date NOT NULL GENERATED ALWAYS AS (started_at + duration_days) STORED,
  is_active bool NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shamar_config_dates CHECK (ends_at > started_at)
);

CREATE INDEX IF NOT EXISTS idx_shamar_config_turma
  ON public.shamar_tribo_configs (turma, is_active);

ALTER TABLE public.shamar_tribo_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_config_read ON public.shamar_tribo_configs;
DROP POLICY IF EXISTS shamar_config_admin ON public.shamar_tribo_configs;

CREATE POLICY shamar_config_read
  ON public.shamar_tribo_configs
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.shamar_profile_can_access_turma(turma)
  );

CREATE POLICY shamar_config_admin
  ON public.shamar_tribo_configs
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 4. Tabuleiro gerado por tribo/temporada
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_board_squares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tribo_config_id uuid NOT NULL REFERENCES public.shamar_tribo_configs(id) ON DELETE CASCADE,
  position int NOT NULL CHECK (position >= 1),
  value numeric NOT NULL CHECK (value > 0),
  category text NOT NULL CHECK (category IN ('pequeno', 'medio', 'grande', 'epico')),
  UNIQUE (tribo_config_id, position)
  -- Invariante da Etapa B: sum(value) por tribo_config_id = meta_total.
);

CREATE INDEX IF NOT EXISTS idx_shamar_board_config
  ON public.shamar_board_squares (tribo_config_id, position);

ALTER TABLE public.shamar_board_squares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_board_read ON public.shamar_board_squares;
DROP POLICY IF EXISTS shamar_board_admin ON public.shamar_board_squares;

CREATE POLICY shamar_board_read
  ON public.shamar_board_squares
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_board_squares.tribo_config_id
        AND c.is_active = true
        AND public.shamar_profile_can_access_turma(c.turma)
    )
  );

CREATE POLICY shamar_board_admin
  ON public.shamar_board_squares
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 5. Temporada individual do usuario
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_seasons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tribo_config_id uuid NOT NULL REFERENCES public.shamar_tribo_configs(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  patrimonio_inicial numeric NOT NULL DEFAULT 0 CHECK (patrimonio_inicial >= 0),
  patrimonio_final numeric CHECK (patrimonio_final IS NULL OR patrimonio_final >= 0),
  identity_level text NOT NULL DEFAULT 'guardiao'
    CHECK (identity_level IN ('guardiao', 'construtor', 'cultivador', 'multiplicador', 'legado')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tribo_config_id)
);

CREATE INDEX IF NOT EXISTS idx_shamar_seasons_user
  ON public.shamar_seasons (user_id, status);

CREATE INDEX IF NOT EXISTS idx_shamar_seasons_tribo
  ON public.shamar_seasons (tribo_config_id);

ALTER TABLE public.shamar_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_seasons_self_select ON public.shamar_seasons;
DROP POLICY IF EXISTS shamar_seasons_self_insert ON public.shamar_seasons;
DROP POLICY IF EXISTS shamar_seasons_self_update ON public.shamar_seasons;
DROP POLICY IF EXISTS shamar_seasons_self_delete ON public.shamar_seasons;
DROP POLICY IF EXISTS shamar_seasons_self ON public.shamar_seasons;
DROP POLICY IF EXISTS shamar_seasons_admin ON public.shamar_seasons;

CREATE POLICY shamar_seasons_self_select
  ON public.shamar_seasons
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY shamar_seasons_self_insert
  ON public.shamar_seasons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_seasons.tribo_config_id
        AND c.is_active = true
        AND public.shamar_profile_can_access_turma(c.turma)
    )
  );

CREATE POLICY shamar_seasons_self_update
  ON public.shamar_seasons
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY shamar_seasons_self_delete
  ON public.shamar_seasons
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY shamar_seasons_admin
  ON public.shamar_seasons
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 6. Aportes com comprovante obrigatorio
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_contributions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id uuid NOT NULL REFERENCES public.shamar_seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  contributed_at date NOT NULL,
  observation text,
  proof_url text NOT NULL CHECK (length(trim(proof_url)) > 0),
  proof_verified bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shamar_contrib_season
  ON public.shamar_contributions (season_id, contributed_at DESC);

CREATE INDEX IF NOT EXISTS idx_shamar_contrib_user
  ON public.shamar_contributions (user_id);

ALTER TABLE public.shamar_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_contrib_self ON public.shamar_contributions;
DROP POLICY IF EXISTS shamar_contrib_admin ON public.shamar_contributions;

CREATE POLICY shamar_contrib_self
  ON public.shamar_contributions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.id = shamar_contributions.season_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY shamar_contrib_admin
  ON public.shamar_contributions
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 7. Quadrinhos marcados por aporte
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_marked_squares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id uuid NOT NULL REFERENCES public.shamar_seasons(id) ON DELETE CASCADE,
  square_id uuid NOT NULL REFERENCES public.shamar_board_squares(id),
  contribution_id uuid NOT NULL REFERENCES public.shamar_contributions(id) ON DELETE CASCADE,
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, square_id)
);

CREATE INDEX IF NOT EXISTS idx_shamar_marked_season
  ON public.shamar_marked_squares (season_id);

CREATE INDEX IF NOT EXISTS idx_shamar_marked_contribution
  ON public.shamar_marked_squares (contribution_id);

ALTER TABLE public.shamar_marked_squares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_marked_self ON public.shamar_marked_squares;
DROP POLICY IF EXISTS shamar_marked_insert ON public.shamar_marked_squares;
DROP POLICY IF EXISTS shamar_marked_admin ON public.shamar_marked_squares;

CREATE POLICY shamar_marked_self
  ON public.shamar_marked_squares
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.id = shamar_marked_squares.season_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY shamar_marked_insert
  ON public.shamar_marked_squares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      JOIN public.shamar_contributions c ON c.id = shamar_marked_squares.contribution_id
      JOIN public.shamar_board_squares b ON b.id = shamar_marked_squares.square_id
      WHERE s.id = shamar_marked_squares.season_id
        AND s.user_id = (SELECT auth.uid())
        AND c.season_id = s.id
        AND c.user_id = s.user_id
        AND b.tribo_config_id = s.tribo_config_id
    )
  );

CREATE POLICY shamar_marked_admin
  ON public.shamar_marked_squares
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 8. Parcerias NOS (dupla)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_partnerships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id_a uuid NOT NULL REFERENCES public.shamar_seasons(id),
  season_id_b uuid NOT NULL REFERENCES public.shamar_seasons(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_partner CHECK (season_id_a != season_id_b)
);

CREATE INDEX IF NOT EXISTS idx_shamar_partnerships_a
  ON public.shamar_partnerships (season_id_a);

CREATE INDEX IF NOT EXISTS idx_shamar_partnerships_b
  ON public.shamar_partnerships (season_id_b);

ALTER TABLE public.shamar_partnerships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_partnership_read ON public.shamar_partnerships;
DROP POLICY IF EXISTS shamar_partnership_admin ON public.shamar_partnerships;

CREATE POLICY shamar_partnership_read
  ON public.shamar_partnerships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE (s.id = shamar_partnerships.season_id_a OR s.id = shamar_partnerships.season_id_b)
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY shamar_partnership_admin
  ON public.shamar_partnerships
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 9. Missoes
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_missions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  mission_type text NOT NULL,
  points_reward int NOT NULL DEFAULT 0 CHECK (points_reward >= 0),
  recurrence text NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once', 'weekly', 'monthly')),
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_shamar_missions_type
  ON public.shamar_missions (mission_type);

CREATE TABLE IF NOT EXISTS public.shamar_turma_missions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tribo_config_id uuid NOT NULL REFERENCES public.shamar_tribo_configs(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.shamar_missions(id),
  is_active bool NOT NULL DEFAULT true,
  due_date timestamptz,
  custom_points int CHECK (custom_points IS NULL OR custom_points >= 0),
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tribo_config_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_shamar_turma_missions_config
  ON public.shamar_turma_missions (tribo_config_id, is_active);

CREATE TABLE IF NOT EXISTS public.shamar_mission_completions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_mission_id uuid NOT NULL REFERENCES public.shamar_turma_missions(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.shamar_seasons(id),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_mission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shamar_completions_user
  ON public.shamar_mission_completions (user_id, season_id);

ALTER TABLE public.shamar_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shamar_turma_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shamar_mission_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_missions_read ON public.shamar_missions;
DROP POLICY IF EXISTS shamar_missions_admin ON public.shamar_missions;
DROP POLICY IF EXISTS shamar_turma_missions_read ON public.shamar_turma_missions;
DROP POLICY IF EXISTS shamar_turma_missions_admin ON public.shamar_turma_missions;
DROP POLICY IF EXISTS shamar_completions_self ON public.shamar_mission_completions;
DROP POLICY IF EXISTS shamar_completions_admin ON public.shamar_mission_completions;

CREATE POLICY shamar_missions_read
  ON public.shamar_missions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY shamar_missions_admin
  ON public.shamar_missions
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY shamar_turma_missions_read
  ON public.shamar_turma_missions
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.tribo_config_id = shamar_turma_missions.tribo_config_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY shamar_turma_missions_admin
  ON public.shamar_turma_missions
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY shamar_completions_self
  ON public.shamar_mission_completions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      JOIN public.shamar_turma_missions tm ON tm.id = shamar_mission_completions.turma_mission_id
      WHERE s.id = shamar_mission_completions.season_id
        AND s.user_id = (SELECT auth.uid())
        AND tm.tribo_config_id = s.tribo_config_id
    )
  );

CREATE POLICY shamar_completions_admin
  ON public.shamar_mission_completions
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 10. Pontos SHAMAR
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_points_balance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.shamar_seasons(id) ON DELETE CASCADE,
  points_total int NOT NULL DEFAULT 0 CHECK (points_total >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

CREATE TABLE IF NOT EXISTS public.shamar_points_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.shamar_seasons(id) ON DELETE CASCADE,
  amount int NOT NULL,
  source_type text NOT NULL
    CHECK (source_type IN ('mission_complete', 'streak_bonus', 'tribo_participation', 'season_complete', 'first_aporte')),
  source_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shamar_pts_user
  ON public.shamar_points_balance (user_id);

CREATE INDEX IF NOT EXISTS idx_shamar_pts_tx
  ON public.shamar_points_transactions (user_id, season_id, created_at DESC);

ALTER TABLE public.shamar_points_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shamar_points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_pts_self ON public.shamar_points_balance;
DROP POLICY IF EXISTS shamar_pts_admin ON public.shamar_points_balance;
DROP POLICY IF EXISTS shamar_pts_tx_self ON public.shamar_points_transactions;
DROP POLICY IF EXISTS shamar_pts_tx_admin ON public.shamar_points_transactions;

CREATE POLICY shamar_pts_self
  ON public.shamar_points_balance
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.id = shamar_points_balance.season_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY shamar_pts_admin
  ON public.shamar_points_balance
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY shamar_pts_tx_self
  ON public.shamar_points_transactions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY shamar_pts_tx_admin
  ON public.shamar_points_transactions
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 11. Indice SHAMAR historico
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shamar_index_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.shamar_seasons(id) ON DELETE CASCADE,
  calculated_at date NOT NULL DEFAULT CURRENT_DATE,
  index_total int NOT NULL DEFAULT 0 CHECK (index_total BETWEEN 0 AND 1000),
  score_constancia int NOT NULL DEFAULT 0 CHECK (score_constancia BETWEEN 0 AND 1000),
  score_evolucao int NOT NULL DEFAULT 0 CHECK (score_evolucao BETWEEN 0 AND 1000),
  score_patrimonio int NOT NULL DEFAULT 0 CHECK (score_patrimonio BETWEEN 0 AND 1000),
  score_participacao int NOT NULL DEFAULT 0 CHECK (score_participacao BETWEEN 0 AND 1000),
  identity_level text NOT NULL DEFAULT 'guardiao'
    CHECK (identity_level IN ('guardiao', 'construtor', 'cultivador', 'multiplicador', 'legado')),
  UNIQUE (user_id, season_id, calculated_at)
);

CREATE INDEX IF NOT EXISTS idx_shamar_idx_user
  ON public.shamar_index_history (user_id, season_id, calculated_at DESC);

ALTER TABLE public.shamar_index_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_idx_self ON public.shamar_index_history;
DROP POLICY IF EXISTS shamar_idx_admin ON public.shamar_index_history;

CREATE POLICY shamar_idx_self
  ON public.shamar_index_history
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY shamar_idx_admin
  ON public.shamar_index_history
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 12. Funcao segura para conceder Pontos SHAMAR
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_shamar_points(
  p_user_id uuid,
  p_season_id uuid,
  p_amount int,
  p_source_type text,
  p_source_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total int;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' AND NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'award_shamar_points requer admin ou service_role';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount deve ser maior que zero';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.shamar_seasons s
    WHERE s.id = p_season_id
      AND s.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'temporada SHAMAR invalida para o usuario informado';
  END IF;

  INSERT INTO public.shamar_points_balance (user_id, season_id, points_total, updated_at)
  VALUES (p_user_id, p_season_id, p_amount, now())
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET
    points_total = shamar_points_balance.points_total + p_amount,
    updated_at = now()
  RETURNING points_total INTO v_new_total;

  INSERT INTO public.shamar_points_transactions
    (user_id, season_id, amount, source_type, source_id, description)
  VALUES
    (p_user_id, p_season_id, p_amount, p_source_type, p_source_id, p_description);

  RETURN v_new_total;
END;
$$;

REVOKE ALL ON FUNCTION public.award_shamar_points(uuid, uuid, int, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_shamar_points(uuid, uuid, int, text, uuid, text)
  TO authenticated, service_role;

-- --------------------------------------------------------------------------
-- 13. Seeds: missoes globais
-- --------------------------------------------------------------------------
INSERT INTO public.shamar_missions (title, description, mission_type, points_reward, recurrence)
VALUES
  (
    'Aporte desta semana',
    'Realize pelo menos 1 aporte com comprovante antes de domingo',
    'weekly_aporte',
    30,
    'weekly'
  ),
  (
    '4 semanas consecutivas',
    'Registre aportes em 4 semanas seguidas sem falhar',
    'streak_4_weeks',
    80,
    'once'
  ),
  (
    'Planejamento financeiro do mes',
    'Preencha seus 6 Blocos no ZeroApp',
    'planning_month',
    50,
    'monthly'
  ),
  (
    'Prestacao de contas da turma',
    'Participe da prestacao de contas coletiva',
    'prestacao_contas',
    100,
    'once'
  ),
  (
    'Primeiro aporte',
    'Realize seu primeiro aporte com comprovante',
    'first_aporte',
    50,
    'once'
  ),
  (
    'Aporte por 4 semanas seguidas',
    'Demonstre constancia com aportes em 4 semanas consecutivas',
    'streak_4_consecutive',
    80,
    'once'
  ),
  (
    '8 semanas consecutivas',
    'Construtor de verdade - 8 semanas sem falhar',
    'streak_8_weeks',
    200,
    'once'
  ),
  (
    'Encerramento da temporada',
    'Apresente seu patrimonio inicial e final ao encerrar a temporada',
    'season_closing',
    500,
    'once'
  )
ON CONFLICT (mission_type) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  points_reward = excluded.points_reward,
  recurrence = excluded.recurrence,
  is_active = true;

-- --------------------------------------------------------------------------
-- 14. Seed: Turma Maio 2026
-- --------------------------------------------------------------------------
INSERT INTO public.shamar_tribo_configs
  (turma, meta_total, duration_days, started_at, is_active)
SELECT
  'Maio 2026',
  125000.00,
  180,
  DATE '2026-05-01',
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.shamar_tribo_configs
  WHERE turma = 'Maio 2026'
    AND started_at = DATE '2026-05-01'
);

-- --------------------------------------------------------------------------
-- 15. Usuario de teste
-- --------------------------------------------------------------------------
-- O prompt original usa email placeholder. Para evitar alterar o usuario errado,
-- execute manualmente apos escolher o email real:
--
-- UPDATE public.profiles
-- SET shamar_unlocked = true
-- WHERE lower(email) = lower('seu-email-de-teste@dominio.com');

COMMIT;

-- --------------------------------------------------------------------------
-- Verificacao final
-- --------------------------------------------------------------------------
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'shamar_%'
ORDER BY tablename;

SELECT COUNT(*) AS shamar_tables_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'shamar_%';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'shamar_unlocked';

SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'shamar-provas';

SELECT COUNT(*) AS shamar_missions_count
FROM public.shamar_missions;

SELECT id, turma, meta_total, duration_days, started_at, ends_at, is_active
FROM public.shamar_tribo_configs
WHERE turma = 'Maio 2026'
ORDER BY started_at DESC;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'shamar_%'
ORDER BY tablename;

SELECT policyname, tablename, cmd
FROM pg_policies
WHERE (schemaname = 'public' AND tablename LIKE 'shamar_%')
  OR (schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'shamar_%')
ORDER BY schemaname, tablename, policyname;
