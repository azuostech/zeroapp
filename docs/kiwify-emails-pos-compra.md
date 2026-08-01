# E-mails pós-compra da Kiwify

## Produtos e endpoints

| Produto | `product_id` | Webhook |
|---|---|---|
| ZeroAPP | `8d2b1220-8b0a-11f1-9df5-316416da37e1` | `POST /api/webhooks/kiwify` |
| Diagnóstico Completo + ZeroApp | `2041b3f0-732f-11f1-b130-814cfe6ecd0e` | `POST /api/webhooks/kiwify/irc` |

Cada webhook deve receber o segredo no header `x-kiwify-token`. O ZeroAPP usa
`KIWIFY_WEBHOOK_TOKEN`; o produto combinado usa `KIWIFY_IRC_WEBHOOK_TOKEN`.

## Variáveis

```env
KIWIFY_ZEROAPP_PRODUCT_IDS=8d2b1220-8b0a-11f1-9df5-316416da37e1
KIWIFY_IRC_PRODUCT_IDS=2041b3f0-732f-11f1-b130-814cfe6ecd0e
```

## Comportamento

- Somente eventos de pagamento aprovado liberam acesso e disparam o e-mail.
- O `product_id` é validado antes de qualquer alteração na conta.
- Se o cliente ainda não existe, o ZeroApp cria a conta e envia um link pessoal para definir a senha.
- Se a conta já existe, o e-mail informa o e-mail da compra e leva à tela de entrada.
- No produto combinado, o botão principal leva a `/obrigadoquiz`; clientes novos também recebem no mesmo e-mail o botão para definir a senha.
- O envio é registrado em `email_logs` e compras já enviadas são deduplicadas pelo identificador da transação.
- Reembolso, chargeback e cancelamento do produto combinado continuam revogando apenas o entitlement, preservando histórico e relatório.

Antes do deploy, execute `scripts/migrate-email-logs-zeroapp-access-types.sql` no Supabase.
