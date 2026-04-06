# 📦 Método Jackson Souza — Deploy no Vercel

## Estrutura de arquivos

```
/
├── index.html        → Login e Cadastro
├── app.html          → App financeiro (usuários)
├── admin.html        → Painel do administrador
├── vercel.json       → Configuração do Vercel
└── supabase-setup.sql → Script do banco de dados
```

---

## 🚀 Como fazer o deploy

### Opção A — Via GitHub (recomendado)

1. Crie um repositório no GitHub (pode ser privado)
2. Faça upload dos 4 arquivos: `index.html`, `app.html`, `admin.html`, `vercel.json`
3. Acesse [vercel.com](https://vercel.com) → **Add New Project**
4. Conecte o repositório GitHub
5. Clique em **Deploy** — pronto

Toda vez que você atualizar um arquivo no GitHub, o Vercel publica automaticamente.

---

### Opção B — Via Vercel CLI (terminal)

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

### Opção C — Drag & Drop (mais simples)

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Arraste a pasta com os arquivos
3. Deploy feito

---

## ⚙️ Configurar as variáveis

Nos 3 arquivos HTML, substitua no topo do `<script>`:

```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_KEY = 'SUA_ANON_KEY';
```

Você encontra esses valores em:
**Supabase → seu projeto → Settings → API**

---

## 🗄️ Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) → seu projeto
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase-setup.sql` e clique em **Run**

---

## 👑 Criar sua conta de administrador

1. Acesse seu app no Vercel e crie uma conta normalmente
2. No Supabase → SQL Editor, execute:

```sql
UPDATE profiles
SET role = 'admin', status = 'active'
WHERE email = 'seu@email.com';
```

---

## 🌐 URLs após o deploy

| Rota | Arquivo |
|------|---------|
| `seuapp.vercel.app/` | index.html — Login |
| `seuapp.vercel.app/app` | app.html — App financeiro |
| `seuapp.vercel.app/admin` | admin.html — Painel admin |

---

## 🔒 Segurança no Supabase

Vá em **Supabase → Authentication → URL Configuration** e adicione:

- **Site URL:** `https://seuapp.vercel.app`
- **Redirect URLs:** `https://seuapp.vercel.app/index.html`

Isso garante que os e-mails de confirmação e redefinição de senha redirecionem corretamente.

---

## ✅ Checklist final

- [ ] SQL executado no Supabase
- [ ] URL e Key do Supabase nos 3 HTMLs
- [ ] Arquivos no Vercel (GitHub ou drag & drop)
- [ ] URL do Supabase configurada (Authentication → URL Configuration)
- [ ] Conta de admin criada e atualizada via SQL
