-- ============================================================================
-- AJUSTE 5 - STATS DA COMUNIDADE VIA RPC SEGURO
-- Projeto: ZeroApp
-- Objetivo: garantir agregados da Comunidade sem depender de chave service role
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_community_stats(p_turma text DEFAULT NULL)
RETURNS TABLE (
  ativos_hoje integer,
  total_membros integer,
  completaram_mes integer,
  pct_completaram integer,
  coins_totais bigint,
  coins_gerados bigint,
  turma text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma text := NULLIF(BTRIM(p_turma), '');
  v_day_ago timestamptz := now() - interval '24 hours';
  v_month_start timestamptz := date_trunc('month', now());
  v_month_end timestamptz := date_trunc('month', now()) + interval '1 month';
  v_total_membros integer := 0;
  v_ativos_hoje integer := 0;
  v_completaram_mes integer := 0;
  v_coins_totais bigint := 0;
BEGIN
  SELECT COUNT(*)::integer
    INTO v_total_membros
  FROM public.profiles p
  WHERE p.status = 'active'
    AND (v_turma IS NULL OR p.turma = v_turma);

  SELECT COUNT(DISTINCT fe.user_id)::integer
    INTO v_ativos_hoje
  FROM public.feed_events fe
  WHERE fe.is_visible = true
    AND fe.created_at >= v_day_ago
    AND (v_turma IS NULL OR fe.turma = v_turma);

  SELECT COUNT(DISTINCT fe.user_id)::integer
    INTO v_completaram_mes
  FROM public.feed_events fe
  WHERE fe.event_type = 'month_complete'
    AND fe.is_visible = true
    AND fe.created_at >= v_month_start
    AND fe.created_at < v_month_end
    AND (v_turma IS NULL OR fe.turma = v_turma);

  SELECT COALESCE(SUM(cb.coins_total), 0)::bigint
    INTO v_coins_totais
  FROM public.coins_balance cb
  JOIN public.profiles p ON p.id = cb.user_id
  WHERE p.status = 'active'
    AND (v_turma IS NULL OR p.turma = v_turma);

  RETURN QUERY
  SELECT
    v_ativos_hoje,
    v_total_membros,
    v_completaram_mes,
    CASE
      WHEN v_total_membros > 0 THEN ROUND((v_completaram_mes::numeric / v_total_membros::numeric) * 100)::integer
      ELSE 0
    END AS pct_completaram,
    v_coins_totais,
    v_coins_totais,
    v_turma;
END;
$$;

REVOKE ALL ON FUNCTION public.get_community_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_stats(text) TO service_role;

COMMIT;
