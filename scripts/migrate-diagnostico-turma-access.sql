-- Compradores do Diagnóstico Completo pertencem à turma `diagnostico`.
-- Preserva outras turmas já atribuídas usando a convenção multiturma do ZeroApp.
BEGIN;

UPDATE public.profiles AS profile
SET turma = CASE
  WHEN NULLIF(BTRIM(profile.turma), '') IS NULL THEN 'diagnostico'
  WHEN public.profile_has_turma(profile.turma, 'diagnostico') THEN
    BTRIM(regexp_replace(profile.turma, '[[:space:]]*[,;]+[[:space:]]*', ', ', 'g'), ' ,;')
  ELSE
    BTRIM(regexp_replace(profile.turma, '[[:space:]]*[,;]+[[:space:]]*', ', ', 'g'), ' ,;') || ', diagnostico'
END
WHERE EXISTS (
  SELECT 1
  FROM public.product_access AS access
  WHERE access.user_id = profile.id
    AND access.product_code = 'diagnostico_completo'
    AND access.status = 'active'
);

COMMIT;
