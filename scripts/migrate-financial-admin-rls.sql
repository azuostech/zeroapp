-- Permite que admins autenticados consultem e atualizem os dados financeiros dos
-- clientes atendidos no painel, sem conceder acesso cruzado a outros alunos.

BEGIN;

ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_admin ON public.financial_data;
DROP POLICY IF EXISTS financial_admin_select ON public.financial_data;
CREATE POLICY financial_admin
  ON public.financial_data
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

COMMIT;
