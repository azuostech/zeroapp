-- ═══════════════════════════════════════════════════════════
-- MÉTODO JACKSON SOUZA — Supabase Setup
-- Execute este script no SQL Editor do seu projeto Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. TABELA DE PERFIS (estende auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | active | disabled
  role          TEXT NOT NULL DEFAULT 'user',      -- user | admin
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  approved_at   TIMESTAMPTZ,
  approved_by   UUID REFERENCES auth.users(id)
);

-- 2. TABELA DE DADOS FINANCEIROS (um registro por usuário por mês)
CREATE TABLE IF NOT EXISTS public.financial_data (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month       TEXT NOT NULL,   -- ex: "04"
  year        TEXT NOT NULL,   -- ex: "2026"
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário vê só o próprio; admin vê todos
CREATE POLICY "profiles_self" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Financial data: usuário acessa só os próprios; admin acessa todos
CREATE POLICY "financial_self" ON public.financial_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "financial_admin" ON public.financial_data
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. TRIGGER: cria perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'pending',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. CRIAR SEU USUÁRIO ADMIN
-- Após criar sua conta normalmente no app, execute:
-- UPDATE public.profiles SET role = 'admin', status = 'active' WHERE email = 'seu@email.com';

-- ═══════════════════════════════════════════════════════════
-- PRONTO. Agora configure as variáveis no topo de cada HTML:
--   SUPABASE_URL  = https://xxxxxxxxxxx.supabase.co
--   SUPABASE_KEY  = sua anon public key
-- ═══════════════════════════════════════════════════════════
