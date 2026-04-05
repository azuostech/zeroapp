# ZERO - Controle Financeiro Pessoal

Monorepo do app ZERO com frontend React + Vite e backend Node + Express + Prisma.

## Estrutura

- `apps/web`: frontend
- `apps/api`: backend
- `packages/shared`: tipos compartilhados

## Requisitos

- Node.js 20+
- PostgreSQL

## Setup

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

3. Ajuste `DATABASE_URL` no backend e credenciais Google OAuth.

4. Rode migrações e seed:

```bash
npm run db:migrate
npm run db:seed
```

5. Suba o projeto:

```bash
npm run dev
```

## OAuth Google

- Crie credenciais OAuth no Google Cloud
- Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
- Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`

## Usuário admin seed

- Email: `admin@zero.app`
- Senha: `Zero@2025`
