# Diagnóstico Completo IRC

## Configuração

1. Execute `scripts/migrate-diagnostico-completo-irc.sql` no banco Supabase.
2. Na Kiwify, abra **Produtos → Diagnóstico Completo + ZeroApp** e copie da URL o valor depois de `edit/`.
3. Configure:

```env
KIWIFY_IRC_PRODUCT_IDS=id-do-produto
KIWIFY_IRC_WEBHOOK_TOKEN=segredo-exclusivo
NEXT_PUBLIC_IRC_CHECKOUT_URL=https://pay.kiwify.com.br/ukTsTso
ANTHROPIC_IRC_MODEL=claude-sonnet-4-5
```

4. Em **Apps → Webhooks** na Kiwify, crie um webhook exclusivo para esse produto:

```text
POST https://zeroapp.tech/api/webhooks/kiwify/irc
```

Use o mesmo segredo em `KIWIFY_IRC_WEBHOOK_TOKEN` e configure compra aprovada, reembolso,
chargeback e cancelamento. Envie o segredo no header `x-kiwify-token`.

## Fluxo

- Compra aprovada cria ou localiza a conta pelo e-mail normalizado.
- Conta nova recebe convite para definir senha.
- A tag `ChatQuiz` e o entitlement `diagnostico_completo` são idempotentes.
- Reembolso e chargeback revogam o entitlement sem apagar respostas ou relatório.
- A página `/diagnostico-completo` exige sessão e entitlement ativo.
- As respostas são persistidas após cada escolha.
- A geração usa apenas IDs canônicos e dados da sessão.
- O PDF fica no bucket privado `irc-reports` e o download exige autenticação.

## Rollback

Para desativar a funcionalidade sem perder histórico:

1. pause o webhook IRC na Kiwify;
2. remova `KIWIFY_IRC_PRODUCT_IDS` do ambiente;
3. reverta o deploy da aplicação.

Não apague as novas tabelas durante um rollback operacional: elas preservam auditoria e relatórios.
