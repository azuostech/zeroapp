-- ============================================================================
-- AREA DE MEMBROS - ETAPA A
-- Projeto: ZeroApp
-- Objetivo: programas, sessoes, progresso, comentarios e migracao inicial
-- Observacao: script idempotente para executar no Supabase SQL Editor
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Verificacao inicial
-- --------------------------------------------------------------------------
SELECT id, title, content_type, tier_required, turma_exclusiva, is_published
FROM public.member_area_content
ORDER BY order_index;

SELECT conname, pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.member_area_content'::regclass;

SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'content_programs',
    'content_sessions',
    'content_progress',
    'content_comments',
    'content_comment_replies'
  );

BEGIN;

-- --------------------------------------------------------------------------
-- 2. Pre-requisitos
-- --------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

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
-- 3. Programas de conteudo
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_programs (
  id              uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  title           text        NOT NULL,
  description     text,
  thumbnail_url   text,
  tier_required   text        NOT NULL DEFAULT 'LIVRE'
                              CHECK (tier_required IN ('LIVRE', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO')),
  turma_exclusiva text,
  visibility      text        NOT NULL DEFAULT 'visible'
                              CHECK (visibility IN ('visible', 'locked', 'hidden')),
  order_index     int         NOT NULL DEFAULT 0,
  is_published    bool        NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programs_order
  ON public.content_programs (order_index);

CREATE INDEX IF NOT EXISTS idx_programs_tier
  ON public.content_programs (tier_required);

ALTER TABLE public.content_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS programs_read ON public.content_programs;
DROP POLICY IF EXISTS programs_admin ON public.content_programs;

CREATE POLICY programs_read ON public.content_programs
  FOR SELECT
  USING (
    is_published = true
    AND visibility != 'hidden'
    AND (
      tier_required = 'LIVRE'
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            (tier_required = 'MOVIMENTO' AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
            OR (tier_required = 'ACELERACAO' AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
            OR (tier_required = 'AUTOGOVERNO' AND p.tier = 'AUTOGOVERNO')
          )
      )
    )
    AND (
      turma_exclusiva IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.turma = turma_exclusiva
      )
    )
  );

CREATE POLICY programs_admin ON public.content_programs
  FOR ALL
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP TRIGGER IF EXISTS set_updated_at_programs ON public.content_programs;

CREATE TRIGGER set_updated_at_programs
  BEFORE UPDATE ON public.content_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- 4. Sessoes de conteudo
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_sessions (
  id              uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  program_id      uuid        NOT NULL REFERENCES public.content_programs(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  visibility      text        NOT NULL DEFAULT 'visible'
                              CHECK (visibility IN ('visible', 'locked', 'hidden')),
  order_index     int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_program
  ON public.content_sessions (program_id, order_index);

ALTER TABLE public.content_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_read ON public.content_sessions;
DROP POLICY IF EXISTS sessions_admin ON public.content_sessions;

CREATE POLICY sessions_read ON public.content_sessions
  FOR SELECT
  USING (
    visibility != 'hidden'
    AND EXISTS (
      SELECT 1
      FROM public.content_programs p
      WHERE p.id = program_id
        AND p.is_published = true
        AND p.visibility != 'hidden'
        AND (
          p.tier_required = 'LIVRE'
          OR EXISTS (
            SELECT 1
            FROM public.profiles pr
            WHERE pr.id = auth.uid()
              AND (
                (p.tier_required = 'MOVIMENTO' AND pr.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
                OR (p.tier_required = 'ACELERACAO' AND pr.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
                OR (p.tier_required = 'AUTOGOVERNO' AND pr.tier = 'AUTOGOVERNO')
              )
          )
        )
        AND (
          p.turma_exclusiva IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.profiles pr
            WHERE pr.id = auth.uid()
              AND pr.turma = p.turma_exclusiva
          )
        )
    )
  );

CREATE POLICY sessions_admin ON public.content_sessions
  FOR ALL
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP TRIGGER IF EXISTS set_updated_at_sessions ON public.content_sessions;

CREATE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON public.content_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- 5. Expandir member_area_content para aulas
-- --------------------------------------------------------------------------
ALTER TABLE public.member_area_content
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.content_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'visible'
    CHECK (visibility IN ('visible', 'locked', 'hidden'));

CREATE INDEX IF NOT EXISTS idx_content_session
  ON public.member_area_content (session_id, order_index);

DROP POLICY IF EXISTS member_content_read ON public.member_area_content;

CREATE POLICY member_content_read ON public.member_area_content
  FOR SELECT
  USING (
    is_published = true
    AND visibility != 'hidden'
    AND (
      tier_required = 'LIVRE'
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            (tier_required = 'MOVIMENTO' AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
            OR (tier_required = 'ACELERACAO' AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
            OR (tier_required = 'AUTOGOVERNO' AND p.tier = 'AUTOGOVERNO')
          )
      )
    )
    AND (
      turma_exclusiva IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.turma = turma_exclusiva
      )
    )
  );

-- --------------------------------------------------------------------------
-- 6. Progresso de conteudo
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_progress (
  id           uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id   uuid        NOT NULL REFERENCES public.member_area_content(id) ON DELETE CASCADE,
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user
  ON public.content_progress (user_id, content_id);

CREATE INDEX IF NOT EXISTS idx_progress_content
  ON public.content_progress (content_id);

ALTER TABLE public.content_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS progress_self ON public.content_progress;
DROP POLICY IF EXISTS progress_admin ON public.content_progress;

CREATE POLICY progress_self ON public.content_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY progress_admin ON public.content_progress
  FOR ALL
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- --------------------------------------------------------------------------
-- 7. Comentarios
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_comments (
  id          uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  content_id  uuid        NOT NULL REFERENCES public.member_area_content(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text        NOT NULL CHECK (length(trim(body)) > 0),
  likes       int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_content
  ON public.content_comments (content_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_user
  ON public.content_comments (user_id);

ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_read ON public.content_comments;
DROP POLICY IF EXISTS comments_write ON public.content_comments;
DROP POLICY IF EXISTS comments_update ON public.content_comments;
DROP POLICY IF EXISTS comments_delete ON public.content_comments;
DROP POLICY IF EXISTS comments_admin ON public.content_comments;

CREATE POLICY comments_read ON public.content_comments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.member_area_content c
      WHERE c.id = content_id
        AND c.is_published = true
        AND c.visibility != 'hidden'
        AND (
          c.tier_required = 'LIVRE'
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                (c.tier_required = 'MOVIMENTO' AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
                OR (c.tier_required = 'ACELERACAO' AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
                OR (c.tier_required = 'AUTOGOVERNO' AND p.tier = 'AUTOGOVERNO')
              )
          )
        )
        AND (
          c.turma_exclusiva IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.turma = c.turma_exclusiva
          )
        )
    )
  );

CREATE POLICY comments_write ON public.content_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.member_area_content c
      WHERE c.id = content_id
        AND c.is_published = true
        AND c.visibility != 'hidden'
        AND (
          c.tier_required = 'LIVRE'
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                (c.tier_required = 'MOVIMENTO' AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
                OR (c.tier_required = 'ACELERACAO' AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
                OR (c.tier_required = 'AUTOGOVERNO' AND p.tier = 'AUTOGOVERNO')
              )
          )
        )
        AND (
          c.turma_exclusiva IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.turma = c.turma_exclusiva
          )
        )
    )
  );

CREATE POLICY comments_update ON public.content_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY comments_delete ON public.content_comments
  FOR DELETE
  USING (auth.uid() = user_id OR (SELECT public.is_admin()));

CREATE POLICY comments_admin ON public.content_comments
  FOR ALL
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP TRIGGER IF EXISTS set_updated_at_comments ON public.content_comments;

CREATE TRIGGER set_updated_at_comments
  BEFORE UPDATE ON public.content_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- 8. Respostas dos comentarios
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_comment_replies (
  id          uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  comment_id  uuid        NOT NULL REFERENCES public.content_comments(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text        NOT NULL CHECK (length(trim(body)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replies_comment
  ON public.content_comment_replies (comment_id, created_at ASC);

ALTER TABLE public.content_comment_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS replies_read ON public.content_comment_replies;
DROP POLICY IF EXISTS replies_write ON public.content_comment_replies;
DROP POLICY IF EXISTS replies_delete ON public.content_comment_replies;
DROP POLICY IF EXISTS replies_admin ON public.content_comment_replies;

CREATE POLICY replies_read ON public.content_comment_replies
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.content_comments cc
      JOIN public.member_area_content c ON c.id = cc.content_id
      WHERE cc.id = comment_id
        AND c.is_published = true
        AND c.visibility != 'hidden'
        AND (
          c.tier_required = 'LIVRE'
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                (c.tier_required = 'MOVIMENTO' AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
                OR (c.tier_required = 'ACELERACAO' AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
                OR (c.tier_required = 'AUTOGOVERNO' AND p.tier = 'AUTOGOVERNO')
              )
          )
        )
        AND (
          c.turma_exclusiva IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.turma = c.turma_exclusiva
          )
        )
    )
  );

CREATE POLICY replies_write ON public.content_comment_replies
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.content_comments cc
      JOIN public.member_area_content c ON c.id = cc.content_id
      WHERE cc.id = comment_id
        AND c.is_published = true
        AND c.visibility != 'hidden'
        AND (
          c.tier_required = 'LIVRE'
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                (c.tier_required = 'MOVIMENTO' AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
                OR (c.tier_required = 'ACELERACAO' AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
                OR (c.tier_required = 'AUTOGOVERNO' AND p.tier = 'AUTOGOVERNO')
              )
          )
        )
        AND (
          c.turma_exclusiva IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.turma = c.turma_exclusiva
          )
        )
    )
  );

CREATE POLICY replies_delete ON public.content_comment_replies
  FOR DELETE
  USING (auth.uid() = user_id OR (SELECT public.is_admin()));

CREATE POLICY replies_admin ON public.content_comment_replies
  FOR ALL
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP TRIGGER IF EXISTS set_updated_at_replies ON public.content_comment_replies;

CREATE TRIGGER set_updated_at_replies
  BEFORE UPDATE ON public.content_comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- 9. Migrar dados existentes
-- --------------------------------------------------------------------------
WITH inserted AS (
  INSERT INTO public.content_programs (
    title,
    description,
    tier_required,
    turma_exclusiva,
    visibility,
    is_published,
    order_index
  )
  SELECT
    'Mentoria Maio 2026',
    'Programa completo de mentoria financeira. Encontros ao vivo, materiais e praticas do metodo dos 6 Blocos.',
    'MOVIMENTO',
    'Maio 2026',
    'visible',
    true,
    1
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.content_programs
    WHERE title = 'Mentoria Maio 2026'
      AND turma_exclusiva = 'Maio 2026'
  )
  RETURNING id
),
program AS (
  SELECT id FROM inserted
  UNION ALL
  SELECT id
  FROM public.content_programs
  WHERE title = 'Mentoria Maio 2026'
    AND turma_exclusiva = 'Maio 2026'
  ORDER BY id
  LIMIT 1
)
INSERT INTO public.content_sessions (
  program_id,
  title,
  description,
  visibility,
  order_index
)
SELECT
  program.id,
  'Encontros ao vivo',
  'Gravacoes dos encontros da turma de Maio 2026.',
  'visible',
  1
FROM program
WHERE NOT EXISTS (
  SELECT 1
  FROM public.content_sessions s
  WHERE s.program_id = program.id
    AND s.title = 'Encontros ao vivo'
);

WITH target_session AS (
  SELECT s.id
  FROM public.content_sessions s
  JOIN public.content_programs p ON p.id = s.program_id
  WHERE p.title = 'Mentoria Maio 2026'
    AND p.turma_exclusiva = 'Maio 2026'
    AND s.title = 'Encontros ao vivo'
  ORDER BY s.id
  LIMIT 1
)
UPDATE public.member_area_content c
SET
  session_id = target_session.id,
  visibility = 'visible'
FROM target_session
WHERE c.turma_exclusiva = 'Maio 2026';

UPDATE public.member_area_content
SET title = replace(replace(title, '1o ', '1º '), '2o ', '2º ')
WHERE title ~ '(^| )([12])o ';

WITH inserted AS (
  INSERT INTO public.content_programs (
    title,
    description,
    tier_required,
    turma_exclusiva,
    visibility,
    is_published,
    order_index
  )
  SELECT
    'Fundamentos Financeiros',
    'Introducao ao metodo dos 6 Blocos Financeiros. Disponivel para todos os usuarios.',
    'LIVRE',
    NULL,
    'visible',
    true,
    2
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.content_programs
    WHERE title = 'Fundamentos Financeiros'
      AND turma_exclusiva IS NULL
  )
  RETURNING id
),
program AS (
  SELECT id FROM inserted
  UNION ALL
  SELECT id
  FROM public.content_programs
  WHERE title = 'Fundamentos Financeiros'
    AND turma_exclusiva IS NULL
  ORDER BY id
  LIMIT 1
)
INSERT INTO public.content_sessions (
  program_id,
  title,
  visibility,
  order_index
)
SELECT
  program.id,
  'Aulas introdutorias',
  'visible',
  1
FROM program
WHERE NOT EXISTS (
  SELECT 1
  FROM public.content_sessions s
  WHERE s.program_id = program.id
    AND s.title = 'Aulas introdutorias'
);

WITH target_session AS (
  SELECT s.id
  FROM public.content_sessions s
  JOIN public.content_programs p ON p.id = s.program_id
  WHERE p.title = 'Fundamentos Financeiros'
    AND p.turma_exclusiva IS NULL
    AND s.title = 'Aulas introdutorias'
  ORDER BY s.id
  LIMIT 1
)
UPDATE public.member_area_content c
SET
  session_id = target_session.id,
  visibility = 'visible'
FROM target_session
WHERE c.tier_required = 'LIVRE'
  AND c.turma_exclusiva IS NULL;

-- --------------------------------------------------------------------------
-- 10. Verificacao final
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_new_tables integer;
  v_new_columns integer;
  v_programs integer;
  v_sessions integer;
  v_total_content integer;
  v_content_linked integer;
  v_rls_tables integer;
BEGIN
  SELECT COUNT(*)
  INTO v_new_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'content_programs',
      'content_sessions',
      'content_progress',
      'content_comments',
      'content_comment_replies'
    );

  SELECT COUNT(*)
  INTO v_new_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'member_area_content'
    AND column_name IN ('session_id', 'visibility');

  SELECT COUNT(*) INTO v_programs
  FROM public.content_programs
  WHERE title IN ('Mentoria Maio 2026', 'Fundamentos Financeiros');

  SELECT COUNT(*) INTO v_sessions
  FROM public.content_sessions s
  JOIN public.content_programs p ON p.id = s.program_id
  WHERE (p.title = 'Mentoria Maio 2026' AND s.title = 'Encontros ao vivo')
    OR (p.title = 'Fundamentos Financeiros' AND s.title = 'Aulas introdutorias');

  SELECT COUNT(*) INTO v_total_content
  FROM public.member_area_content;

  SELECT COUNT(*) INTO v_content_linked
  FROM public.member_area_content
  WHERE session_id IS NOT NULL;

  SELECT COUNT(*)
  INTO v_rls_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true
    AND tablename IN (
      'content_programs',
      'content_sessions',
      'content_progress',
      'content_comments',
      'content_comment_replies'
    );

  RAISE NOTICE 'Area membros Etapa A: tabelas novas = % de 5', v_new_tables;
  RAISE NOTICE 'Area membros Etapa A: colunas em member_area_content = % de 2', v_new_columns;
  RAISE NOTICE 'Area membros Etapa A: programas esperados = % de 2', v_programs;
  RAISE NOTICE 'Area membros Etapa A: sessoes esperadas = % de 2', v_sessions;
  RAISE NOTICE 'Area membros Etapa A: conteudos totais = %', v_total_content;
  RAISE NOTICE 'Area membros Etapa A: conteudos vinculados = %', v_content_linked;
  RAISE NOTICE 'Area membros Etapa A: tabelas novas com RLS = % de 5', v_rls_tables;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'content_programs',
    'content_sessions',
    'content_progress',
    'content_comments',
    'content_comment_replies'
  )
ORDER BY tablename;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'member_area_content'
  AND column_name IN ('session_id', 'visibility')
ORDER BY column_name;

SELECT COUNT(*) AS total_programs
FROM public.content_programs;

SELECT COUNT(*) AS total_sessions
FROM public.content_sessions;

SELECT COUNT(*) AS linked_content
FROM public.member_area_content
WHERE session_id IS NOT NULL;

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'content_programs',
    'content_sessions',
    'content_progress',
    'content_comments',
    'content_comment_replies'
  )
ORDER BY tablename;

SELECT tablename, COUNT(*) AS policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'content_programs',
    'content_sessions',
    'content_progress',
    'content_comments',
    'content_comment_replies'
  )
GROUP BY tablename
ORDER BY tablename;

SELECT
  p.title AS programa,
  s.title AS sessao,
  c.title AS aula,
  c.tier_required,
  c.visibility
FROM public.content_programs p
LEFT JOIN public.content_sessions s ON s.program_id = p.id
LEFT JOIN public.member_area_content c ON c.session_id = s.id
ORDER BY p.order_index, s.order_index, c.order_index;
