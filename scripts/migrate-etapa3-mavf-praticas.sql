-- ============================================================================
-- ETAPA 3 - MAVF + GANHOS + GRATIDAO + IDENTIDADE
-- Projeto: ZeroApp
-- Objetivo: criar tabelas de praticas diarias e limpar policies legadas
-- Observacao: script idempotente e compativel com schema atual
-- Marcacao: checkpoint MAVF para commit e push (2026-05-18)
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------------
-- Helper admin (compatibilidade entre ambientes)
-- --------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------
-- Limpeza de policies antigas duplicadas em mavf_objectives
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_policy_name text;
BEGIN
  FOREACH v_policy_name IN ARRAY ARRAY[
    'Enable delete for users based on user_id',
    'Enable insert for users based on user_id',
    'Enable read access for all users',
    'Enable update for users based on user_id'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.mavf_objectives', v_policy_name);
  END LOOP;
END $$;

-- --------------------------------------------------------------------------
-- gains
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gains (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  tamanho text NOT NULL CHECK (tamanho IN ('pequeno', 'medio', 'grande')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gains_user_created
  ON public.gains(user_id, created_at DESC);

ALTER TABLE public.gains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gains_self ON public.gains;
DROP POLICY IF EXISTS gains_admin ON public.gains;
DROP POLICY IF EXISTS gains_service_all ON public.gains;

CREATE POLICY gains_self
  ON public.gains
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY gains_admin
  ON public.gains
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY gains_service_all
  ON public.gains
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- --------------------------------------------------------------------------
-- gratitude_entries
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gratitude_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  categoria text NOT NULL CHECK (
    categoria IN ('financeiro', 'crescimento', 'relacionamentos', 'saude', 'outro')
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gratitude_user_created
  ON public.gratitude_entries(user_id, created_at DESC);

ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gratitude_self ON public.gratitude_entries;
DROP POLICY IF EXISTS gratitude_admin ON public.gratitude_entries;
DROP POLICY IF EXISTS gratitude_service_all ON public.gratitude_entries;

CREATE POLICY gratitude_self
  ON public.gratitude_entries
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY gratitude_admin
  ON public.gratitude_entries
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY gratitude_service_all
  ON public.gratitude_entries
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- --------------------------------------------------------------------------
-- identity_declarations
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identity_declarations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  declaracao text NOT NULL,
  contexto text,
  encontro_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_user_created
  ON public.identity_declarations(user_id, created_at ASC);

ALTER TABLE public.identity_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_self ON public.identity_declarations;
DROP POLICY IF EXISTS identity_admin ON public.identity_declarations;
DROP POLICY IF EXISTS identity_service_all ON public.identity_declarations;

CREATE POLICY identity_self
  ON public.identity_declarations
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY identity_admin
  ON public.identity_declarations
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY identity_service_all
  ON public.identity_declarations
  FOR ALL
  TO service_role
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- --------------------------------------------------------------------------
-- Verificacoes finais
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('gains', 'gratitude_entries', 'identity_declarations');

  RAISE NOTICE 'Etapa 3 SQL: %/3 tabelas encontradas.', v_count;
END $$;

COMMIT;
