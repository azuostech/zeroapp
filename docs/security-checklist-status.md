# Status do checklist de seguranca

Auditoria: 2026-07-14

## Concluido no codigo/banco

- RLS confirmado ativo em 24 tabelas sensiveis (`profiles`, `coins_*`,
  `financial_data`, `feed_events`, `email_logs`, `shamar_*`, `mavf_*`).
- `award_coins` revogado de `anon`/`authenticated`, validando role e inputs.
- Trigger impede usuario comum de alterar `role`, `tier`, `status`, `is_admin`,
  `turma`, `shamar_unlocked` e demais campos gerenciados pelo servidor.
- Catalogo publico usa cliente anonimo; programas comuns nao devolvem URL/email,
  e somente a RPC restrita do blog devolve URLs HTTP/HTTPS de artigos LIVRE.
- Signup usa o limite nativo do Supabase Auth e, quando a credencial
  `service_role` esta valida, adiciona 5 tentativas/hora por HMAC do IP em
  contador persistente. Falha do contador adicional nao desativa o cadastro.
- Cron usa comparacao constante e falha fechado sem secret adequado.
- Webhook Resend verifica assinatura criptografica sobre o corpo bruto e deduplica
  por `svix-id`.
- Upload SHAMAR usa nome UUID, diretorio temporario, limite de 10 MB, apenas
  JPEG/PNG/WebP e validacao de magic bytes antes de mover para `/proofs/`.
- Respostas de feed/TRIBO nao devolvem e-mail de participante nem metadata bruta.
- Leitura financeira administrativa usa service role apos auth e registra auditoria.
- Reset nao aceita mais token bruto em query string.
- Logout limpa cookies e storages locais do ZeroApp.
- Headers anti-frame, nosniff, referrer, permissions e HSTS configurados.
- Nenhum CORS wildcard encontrado em `/api/admin` ou `/api/cron`.
- Historico Git auditado: nenhum `.env`/`.env.local` real rastreado e nenhum padrao
  de JWT/Anthropic/Resend webhook secret encontrado; ocorrencias de nomes de
  variavel e validadores nao sao segredos.
- Bucket `shamar-provas` confirmado privado; URLs admin expiram em 15 minutos.
- Indices de `user_id` confirmados nas quatro tabelas grandes do checklist.
- Operacao, rotacao, retencao e resposta a incidente documentadas.

## Aplicado no Supabase

`scripts/migrate-security-hardening-predeploy.sql` foi aplicado em 2026-07-14.
Os grants resultantes foram validados: `award_coins` e
`consume_signup_rate_limit` sao executaveis somente por `service_role`.

`scripts/migrate-auth-signup-admin-routing.sql` foi aplicado em 2026-07-16.
Cadastros publicos DESPERTAR passam a nascer ativos com `role=user`, e o flag
legado `is_admin` foi alinhado ao papel administrativo canonico.

## Configuracao confirmada

- `CRON_SECRET`, `SIGNUP_RATE_LIMIT_SECRET` e `RESEND_WEBHOOK_SECRET` foram
  configurados localmente e no Vercel, conforme confirmacao do responsavel em
  2026-07-14.

## Pendente de configuracao/deploy

- Substituir `SUPABASE_SERVICE_ROLE_KEY` no Vercel por uma chave
  `service_role`/`sb_secret_` real. A chave local auditada tem formato invalido
  para service role e agora e rejeitada pelo codigo.
- Publicar este codigo e aplicar, na mesma janela,
  `scripts/migrate-security-hardening-postdeploy.sql`.
- Revisar expiracao de JWT/refresh token no Supabase Dashboard.
- Ativar notificacoes de deploy e alerta/log drain para brute force no Vercel.
- Aprovar juridicamente a politica de retencao antes de automatizar exclusoes.

Esses itens exigem Dashboard, segredo real ou autorizacao para exclusao e nao
podem ser concluídos somente por commit de aplicacao.
