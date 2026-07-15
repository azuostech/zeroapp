-- ZeroApp - hardening coordenado com o deploy da aplicacao.
-- Aplicar junto ao codigo que finaliza uploads em /{userId}/proofs/.

BEGIN;

-- Dados financeiros: usuario le os proprios dados. O painel admin usa service
-- role apos autenticar o admin e registra cada leitura em admin_action_logs.
DROP POLICY IF EXISTS financial_admin ON public.financial_data;

DROP POLICY IF EXISTS financial_self ON public.financial_data;
CREATE POLICY financial_self
  ON public.financial_data
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Comprovantes continuam privados. O browser so envia para /pending/ com URL
-- assinada; o servidor valida bytes/tamanho e move para /proofs/ via service role.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'shamar-provas';

DROP POLICY IF EXISTS shamar_provas_upload ON storage.objects;
CREATE POLICY shamar_provas_upload
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shamar-provas'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
    AND (storage.foldername(name))[2] = 'pending'
  );

COMMIT;
