-- Corrige o cadastro publico e normaliza o flag legado de administrador.
BEGIN;

-- Somente role='admin' representa permissao administrativa. O campo legado
-- is_admin nao pode promover usuarios comuns por engano.
UPDATE public.profiles
SET is_admin = (role = 'admin')
WHERE is_admin IS DISTINCT FROM (role = 'admin');

-- Cadastros realizados pela API publica entram como DESPERTAR ativo. O papel
-- e fixado em user para impedir elevacao por raw_user_meta_data adulterado.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, status, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'phone'), ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'signup_source' = 'public_despertar' THEN 'active'
      ELSE 'pending'
    END,
    'user'
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

COMMIT;
