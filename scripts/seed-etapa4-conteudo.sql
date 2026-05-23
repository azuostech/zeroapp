-- ============================================================================
-- ETAPA 4 - SEED INICIAL DE CONTEUDO
-- Projeto: ZeroApp
-- Objetivo: inserir conteudos base de LIVRE, MOVIMENTO e ACELERACAO
-- Observacao: idempotente por titulo
-- ============================================================================

INSERT INTO public.member_area_content
  (title, description, content_type, tier_required, url, is_published, order_index)
SELECT
  'Os 6 Blocos Financeiros',
  'Entenda o metodo completo que vai transformar sua relacao com o dinheiro.',
  'video',
  'LIVRE',
  'https://youtu.be/placeholder',
  true,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.member_area_content WHERE title = 'Os 6 Blocos Financeiros'
);

INSERT INTO public.member_area_content
  (title, description, content_type, tier_required, url, is_published, order_index)
SELECT
  'Calculadora de Reserva de Emergencia',
  'Descubra quanto voce precisa guardar para ter seguranca financeira.',
  'tool',
  'LIVRE',
  'https://zeroapp.szadigital.com.br/calculadora',
  true,
  2
WHERE NOT EXISTS (
  SELECT 1 FROM public.member_area_content WHERE title = 'Calculadora de Reserva de Emergencia'
);

INSERT INTO public.member_area_content
  (title, description, content_type, tier_required, url, is_published, order_index)
SELECT
  'Bloco 4: Quitar Dividas na Pratica',
  'Aula exclusiva da turma sobre como negociar e eliminar dividas.',
  'video',
  'MOVIMENTO',
  'https://youtu.be/placeholder2',
  true,
  3
WHERE NOT EXISTS (
  SELECT 1 FROM public.member_area_content WHERE title = 'Bloco 4: Quitar Dividas na Pratica'
);

INSERT INTO public.member_area_content
  (title, description, content_type, tier_required, url, is_published, order_index)
SELECT
  'Investimentos: Primeiro Passo',
  'Como comecar a investir apos consolidar os blocos basicos.',
  'video',
  'ACELERACAO',
  'https://youtu.be/placeholder3',
  true,
  4
WHERE NOT EXISTS (
  SELECT 1 FROM public.member_area_content WHERE title = 'Investimentos: Primeiro Passo'
);
