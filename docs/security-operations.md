# Operacao de seguranca do ZeroApp

Ultima revisao: 2026-07-14

Este documento separa controles aplicados por codigo dos controles que precisam
ser mantidos nos dashboards do Supabase, Vercel e Resend.

## Ordem segura de deploy

1. Fazer backup do banco.
2. Aplicar `scripts/migrate-security-hardening-predeploy.sql`.
3. Configurar no Vercel:
   - `SUPABASE_SERVICE_ROLE_KEY` com chave `service_role`/`sb_secret_` real;
   - `CRON_SECRET` aleatorio com pelo menos 32 bytes;
   - `SIGNUP_RATE_LIMIT_SECRET` aleatorio e diferente dos demais segredos;
   - `RESEND_WEBHOOK_SECRET` (`whsec_...`) do endpoint Resend.
4. Fazer deploy da aplicacao.
5. Aplicar `scripts/migrate-security-hardening-postdeploy.sql` na mesma janela.
6. Validar signup, upload SHAMAR, painel financeiro admin e webhook Resend.

O SQL pos-deploy restringe uploads ao diretorio temporario `/pending/` e remove
a policy financeira de admin. Nao deve ser aplicado antes do codigo correspondente
estar em producao.

## Chaves e rotacao em ate 10 minutos

1. Identificar a chave afetada e bloquear o uso do sistema comprometido.
2. Gerar uma nova chave no provedor (Supabase, Resend, Vercel ou Kiwify).
3. Atualizar a variavel secreta nos ambientes Production, Preview e Development
   aplicaveis no Vercel.
4. Fazer redeploy e executar um smoke test sem imprimir o segredo em logs.
5. Revogar a chave anterior no provedor.
6. Revisar logs desde o primeiro momento possivel de exposicao e registrar o
   incidente.

Nunca criar variavel `NEXT_PUBLIC_` para service role, secrets de webhook, API
keys privadas ou chaves VAPID privadas.

## Supabase

- Manter RLS ativo em todas as tabelas `profiles`, `coins_*`, `financial_data`,
  `feed_events`, `email_logs`, `shamar_*` e `mavf_*`.
- `award_coins` deve permanecer executavel somente por `service_role`.
- `get_content_program_catalog` nao recebe parametros e retorna apenas metadados.
- O bucket `shamar-provas` deve permanecer privado, com limite de 10 MB e MIME
  types `image/jpeg`, `image/png` e `image/webp`.
- URLs de leitura de comprovantes expiram em 15 minutos (limite operacional: 1h).
- Em Auth, revisar trimestralmente: access token em torno de 1h, refresh token
  compativel com o risco do app financeiro e protecao contra senhas vazadas/MFA
  quando disponivel no plano.

## Resend

- Copiar o Signing Secret do endpoint para `RESEND_WEBHOOK_SECRET`.
- O handler usa o corpo bruto e valida `svix-id`, `svix-timestamp` e
  `svix-signature` antes de processar o evento.
- Eventos sao idempotentes por `svix-id`; nunca remover essa deduplicacao ao
  alterar o webhook.

## Vercel

- Manter notificacoes de deploy habilitadas por e-mail ou Slack para Production.
- Configurar alerta/log drain para falhas repetidas de autenticacao. Limiar
  inicial: mais de 10 falhas em 5 minutos para o mesmo IP ou identificador.
- Restringir acesso ao projeto e tokens de deploy pelo principio do menor privilegio.
- Revisar trimestralmente membros, integracoes GitHub e tokens pessoais.

## Retencao proposta

Aplicar exclusao automatica somente apos aprovacao do responsavel pelos dados:

- `coins_transactions`: 2 anos;
- historico SHAMAR: permanente enquanto houver finalidade/base legal;
- `feed_events`: 1 ano;
- `email_logs` e snapshots: 6 meses;
- registros de incidentes de seguranca: no minimo 5 anos.

Antes de ativar jobs destrutivos, validar obrigacoes fiscais/contratuais, exportacao
para auditoria e solicitacoes de titulares.

## Resposta a incidente e LGPD

1. Conter: revogar chaves, bloquear acessos e preservar evidencias.
2. Avaliar: dados, titulares, periodo, causa, impacto e risco/dano relevante.
3. Corrigir: eliminar a causa, rotacionar credenciais e validar o ambiente.
4. Comunicar internamente o responsavel pelo ZeroApp e preparar comunicacao clara
   aos titulares afetados.
5. Quando o incidente puder causar risco ou dano relevante, o controlador deve
   comunicar a ANPD e os titulares em ate **3 dias uteis**, conforme a Resolucao
   CD/ANPD nº 15/2024 (salvo prazo legal especifico).
6. Manter o registro do incidente por no minimo 5 anos.

Canal oficial: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis

## Checklist recorrente

- Mensal: revisar falhas de auth, webhooks rejeitados, rate limits e deploys.
- Trimestral: testar rotacao de chave, revisar RLS/grants, membros e configuracao Auth.
- Semestral: restaurar backup em ambiente isolado e revisar retencao.
- A cada release: `npm run build`, teste de headers, rotas admin, API publica,
  signup limitado, webhook invalido e upload com arquivo adulterado.
