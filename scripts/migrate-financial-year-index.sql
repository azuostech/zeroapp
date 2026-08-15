-- Otimiza a consulta anual do resumo financeiro (usuario + ano, ordenado por mes).

CREATE INDEX IF NOT EXISTS financial_data_user_year_month_idx
  ON public.financial_data (user_id, year, month);
