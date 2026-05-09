# ZeroApp (Next.js)

Plataforma **Finanças do Zero** migrada para arquitetura Next.js (App Router), com APIs internas e proteção de rotas no servidor.

## Stack atual

- Next.js 15 (App Router)
- React 19
- Supabase (auth + banco)
- Middleware para guard de acesso (`/app`, `/admin`, `/api/*`)

## Estrutura principal

```txt
/
├── app/
│   ├── page.js                    # login/cadastro
│   ├── app/page.js                # área do usuário
│   ├── admin/page.js              # painel admin
│   └── api/...                    # camada BFF (server)
├── src/
│   ├── lib/supabase/              # clients browser/server/service
│   └── modules/                   # auth, finance, admin, profile
├── middleware.js                  # proteção de rotas
├── supabase-setup.sql             # setup banco
└── package.json
```

## Variáveis de ambiente

Crie `.env.local` (ou use `vercel env pull`) com:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

## Rodar local

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run start
```

## Backup diário do banco

Script de backup (dump completo com `--clean --if-exists`):

```bash
./scripts/backup-zeroapp.sh
```

Instalar rotina diária no `cron` (padrão: todos os dias às 02:00):

```bash
./scripts/install-daily-backup-cron.sh
```

Opcional: customizar horário do cron na instalação:

```bash
CRON_SCHEDULE="30 1 * * *" ./scripts/install-daily-backup-cron.sh
```

Arquivos gerados:

- `backup_zeroapp.sql` (último backup)
- `backups/backup_zeroapp_YYYYMMDD_HHMMSS.sql` (histórico)
- `backups/backup-cron.log` (log da rotina)

## Deploy (Vercel)

- O deploy via GitHub funciona automaticamente (sem `vercel.json` legado).
- Configure as variáveis no projeto da Vercel (Preview/Production).

## Observações

- Arquivos legados estáticos (`index.html`, `app.html`, `admin.html`) foram removidos.
- A replicação de estrutura entre meses (adicionar/remover campos) está disponível no app do usuário.
