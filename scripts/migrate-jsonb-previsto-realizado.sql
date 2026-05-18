-- ============================================================================
-- MIGRACAO JSONB: PREVISTO x REALIZADO
-- Projeto: ZeroApp
-- Objetivo: adicionar campos valor_previsto / valor_realizado / realized
-- Observacao: idempotente e retrocompativel (mantem campo legado "valor")
-- ============================================================================

BEGIN;

DO $$
DECLARE
  blk TEXT;
  affected_rows BIGINT;
BEGIN
  FOREACH blk IN ARRAY ARRAY['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute']
  LOOP
    UPDATE public.financial_data fd
    SET data = jsonb_set(
      fd.data,
      ARRAY[blk],
      (
        SELECT COALESCE(
          jsonb_agg(
            CASE
              WHEN item ? 'valor_previsto' THEN
                item
                || jsonb_build_object('valor', COALESCE(NULLIF(item->>'valor', ''), item->>'valor_previsto', '0'))
                || jsonb_build_object('valor_realizado', COALESCE(item->>'valor_realizado', item->>'valor', '0'))
                || jsonb_build_object(
                  'realized',
                  CASE
                    WHEN lower(COALESCE(item->>'realized', 'false')) IN ('true', 't', '1', 'yes', 'y', 'sim') THEN true
                    ELSE false
                  END
                )
              ELSE
                item
                || jsonb_build_object('valor_previsto', COALESCE(item->>'valor', '0'))
                || jsonb_build_object('valor_realizado', COALESCE(item->>'valor', '0'))
                || jsonb_build_object('realized', false)
            END
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements(fd.data->blk) AS item
      ),
      true
    )
    WHERE fd.data ? blk
      AND jsonb_typeof(fd.data->blk) = 'array'
      AND jsonb_array_length(fd.data->blk) > 0;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Bloco % migrado em % registros.', blk, affected_rows;
  END LOOP;
END $$;

UPDATE public.financial_data fd
SET data = jsonb_set(
  fd.data,
  '{contas}',
  (
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(grp) = 'object' THEN
            grp || jsonb_build_object(
              'subcats',
              CASE
                WHEN jsonb_typeof(grp->'subcats') = 'array' THEN
                  COALESCE(
                    (
                      SELECT jsonb_agg(
                        CASE
                          WHEN sub ? 'valor_previsto' THEN
                            sub
                            || jsonb_build_object('valor', COALESCE(NULLIF(sub->>'valor', ''), sub->>'valor_previsto', '0'))
                            || jsonb_build_object('valor_realizado', COALESCE(sub->>'valor_realizado', sub->>'valor', '0'))
                            || jsonb_build_object(
                              'realized',
                              CASE
                                WHEN lower(COALESCE(sub->>'realized', 'false')) IN ('true', 't', '1', 'yes', 'y', 'sim') THEN true
                                ELSE false
                              END
                            )
                          ELSE
                            sub
                            || jsonb_build_object('valor_previsto', COALESCE(sub->>'valor', '0'))
                            || jsonb_build_object('valor_realizado', COALESCE(sub->>'valor', '0'))
                            || jsonb_build_object('realized', false)
                        END
                      )
                      FROM jsonb_array_elements(grp->'subcats') AS sub
                    ),
                    '[]'::jsonb
                  )
                ELSE COALESCE(grp->'subcats', '[]'::jsonb)
              END
            )
          ELSE grp
        END
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements(fd.data->'contas') AS grp
  ),
  true
)
WHERE fd.data ? 'contas'
  AND jsonb_typeof(fd.data->'contas') = 'array'
  AND jsonb_array_length(fd.data->'contas') > 0;

-- Verificacao rapida: quantos registros ainda possuem itens simples sem valor_previsto
DO $$
DECLARE
  missing_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO missing_count
  FROM public.financial_data fd
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(fd.data->'receitas', '[]'::jsonb)) i
    WHERE jsonb_typeof(i) = 'object' AND NOT (i ? 'valor_previsto')
  );

  RAISE NOTICE 'Registros com receitas sem valor_previsto apos migracao: %', missing_count;
END $$;

COMMIT;
