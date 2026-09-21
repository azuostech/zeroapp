# Prompt para o Claude — módulo Diagnóstico Financeiro Completo

Você vai trabalhar no projeto **ZeroApp**, no módulo **Diagnóstico Financeiro Completo**, também chamado internamente de **IRC — Identificador e Reprogramador de Crenças**. Antes de propor ou alterar código, compreenda a implementação abaixo e trate os contratos descritos como requisitos de compatibilidade. O módulo já existe e está funcional; sua tarefa futura deve evoluí-lo sem quebrar compra, acesso, progresso salvo, geração do relatório, PDF, e-mail ou acompanhamento administrativo.

## Nova direção obrigatória da entrega

A implementação atual gera primeiro um relatório textual e depois o coloca em um PDF simples. Esse não é mais o resultado final desejado.

O produto deve passar a entregar um **relatório visual completo, diagramado como infográfico editorial e gerado individualmente por IA para cada pessoa**. O texto pode continuar existindo como etapa intermediária e fonte auditável, mas o artefato apresentado ao usuário deve ser o relatório visual.

Requisitos inegociáveis da nova versão:

- preservar todo o conteúdo relevante do diagnóstico; a diagramação nunca pode resumir ou omitir detalhes apenas para caber em um número fixo de páginas;
- não existe quantidade mínima ou máxima predeterminada de páginas: o documento cresce conforme o conteúdo individual;
- cada relatório deve passar pela IA para análise, redação, direção visual e escolha das metáforas gráficas adequadas às respostas daquela pessoa;
- imagens e ilustrações também devem ser personalizadas para o diagnóstico, sem usar retrato ou semelhança física do usuário quando não houver uma fotografia autorizada;
- combinar narrativa, destaques, mapas de relações, ciclos comportamentais, linhas do tempo, diagramas, plano de ação, checklists e imagens editoriais;
- não inventar renda, despesas, percentuais, scores, gráficos quantitativos ou fatos que não existam nas respostas;
- garantir legibilidade em A4, boa hierarquia, contraste, margens, paginação e ausência de cortes ou sobreposições;
- manter a identidade visual do ZeroApp e do Finanças do Zero, com possibilidade de variação controlada de composição entre usuários;
- armazenar o resultado em PDF privado, manter download autenticado e enviar o mesmo arquivo por e-mail;
- permitir reprocessamento idempotente em caso de falha sem duplicar imagens, PDFs ou e-mails;
- preservar no banco a versão do conteúdo, a versão da direção visual, modelos utilizados, prompts, artefatos gerados e status de cada etapa para auditoria.

A arquitetura recomendada é separar a geração em quatro fases:

1. **Análise personalizada:** transformar apenas as respostas canônicas em uma leitura completa e validada.
2. **Plano editorial estruturado:** a IA retorna JSON validado contendo páginas/seções, hierarquia, textos integrais, citações, diagramas, metáforas visuais e prompts de imagem.
3. **Produção visual:** gerar as ilustrações individuais e renderizar o plano editorial com componentes determinísticos, evitando depender de texto desenhado dentro de imagens gerativas.
4. **Verificação e entrega:** validar se todas as seções e detalhes estão presentes, renderizar as páginas para inspeção automática, gerar o PDF final, armazenar e enviar.

O sistema deve falhar com segurança se o plano visual omitir conteúdo obrigatório. Nesse caso, deve tentar corrigir ou regenerar a etapa incompleta; nunca entregar silenciosamente um relatório parcial.

## 1. Objetivo do produto

O produto vendido é o **Diagnóstico Completo + ZeroApp**. Depois da compra, o usuário recebe acesso a uma experiência conversacional com **6 domínios e 12 respostas objetivas**. Cada domínio tem:

1. uma pergunta de entrada;
2. uma segunda pergunta, cuja ramificação depende da opção escolhida na entrada.

Ao final, as 12 escolhas são cruzadas por IA para gerar um relatório financeiro e comportamental personalizado. O relatório fica disponível dentro do ZeroApp, é convertido em PDF privado, enviado por e-mail e pode ser consultado pelo mentor no painel administrativo. O próximo passo recomendado é assistir à aula **“Como usar a Planilha Financeira”** e lançar as contas previstas do mês.

O módulo não é um formulário financeiro tradicional e não calcula renda, despesas ou patrimônio. Ele identifica crenças, emoções, autossabotagem, merecimento, visão de futuro e capacidade percebida de mudança.

## 2. Stack e organização

- Next.js 15 com App Router, React 19 e JavaScript/JSX.
- Supabase Auth, Postgres, RLS e Storage.
- Anthropic SDK para geração do relatório.
- PDFKit para o PDF.
- Resend, por meio do serviço de e-mail existente, para mensagens e anexos.
- Zod para validar payloads.
- Vitest para testes.

Arquivos centrais:

- `src/modules/irc/domain/irc-domains.js`: árvore canônica das perguntas, IDs, opções e constantes.
- `src/modules/irc/domain/kiwify-event.js`: normalização dos eventos Kiwify.
- `src/modules/irc/domain/report-validation.js`: validação mínima da estrutura do relatório.
- `src/modules/irc/domain/irc-next-steps.js`: URLs e textos do próximo passo.
- `src/modules/irc/application/irc-provisioning.js`: provisionamento pós-compra.
- `src/modules/irc/application/irc-access.js`: autenticação, entitlement e serialização.
- `src/modules/irc/application/irc-report.js`: prompt e chamada ao Claude.
- `src/modules/irc/application/irc-pdf.js`: geração do PDF.
- `components/irc/IrcExperience.jsx`: experiência conversacional e máquina de estados no cliente.
- `components/irc/IrcReport.jsx`: renderização segura do markdown limitado do relatório.
- `app/api/irc/*`: APIs do usuário.
- `app/api/webhooks/kiwify/irc/route.js`: webhook exclusivo da compra.
- `app/diagnostico-completo/page.jsx`: página protegida/oferta.
- `app/obrigadoquiz/page.jsx`: onboarding pós-compra.
- `app/api/admin/diagnostics/*`: APIs administrativas.
- `src/modules/admin/presentation/admin-diagnostics-page.jsx`: acompanhamento pelo mentor.
- `scripts/migrate-diagnostico-completo-irc.sql`: schema, RLS e bucket.
- `scripts/migrate-diagnostico-turma-access.sql`: correção dos compradores antigos.
- `middleware.js`: proteção das áreas e exceções de acesso.

## 3. Constantes e modelo de acesso

- Código do produto: `diagnostico_completo`.
- Turma adicionada ao perfil: `diagnostico`.
- Origem/tag: `ChatQuiz`.
- Versão atual do relatório: `irc-report-v2`.
- Versão atual da direção visual: `irc-visual-v1`.
- Rota do diagnóstico: `/diagnostico-completo`.
- Bucket privado: `irc-reports`.

Existem duas verificações complementares:

1. o middleware exige sessão e perfil ativo para a página do diagnóstico; dentro da página e das APIs, o entitlement ativo é a autorização específica do produto;
2. a turma `diagnostico` é reconhecida pelo middleware para liberar, excepcionalmente, a área `/financas` mesmo no tier `DESPERTAR`.

As APIs do IRC sempre exigem um registro ativo em `product_access` com `product_code = diagnostico_completo`; a turma, isoladamente, não substitui esse entitlement.

Somente ter a turma `diagnostico` não transforma o comprador em mentorado regular. `hasStudentAccess` exige outra turma além de `diagnostico`, portanto esse usuário não ganha automaticamente acesso a SHAMAR, MAVF, Jornada ou demais áreas exclusivas de mentoria. Administradores continuam com acesso administrativo normal.

## 4. Compra e provisionamento pela Kiwify

O endpoint é `POST /api/webhooks/kiwify/irc`. Ele não depende de sessão e é excluído da autenticação global do middleware.

Autenticação aceita:

- token nos headers `x-kiwify-token`, `x-webhook-token`, `x-zeroapp-token` ou `Authorization: Bearer`;
- `webhook_token` no corpo;
- assinatura Kiwify em `signature`, no corpo ou query string, calculada como HMAC-SHA1 de `JSON.stringify(order)` com o segredo configurado.

Os segredos aceitos são `KIWIFY_IRC_WEBHOOK_TOKEN` e, por compatibilidade, `KIWIFY_WEBHOOK_TOKEN`. A comparação é feita com `timingSafeEqual`. O payload pode ser o pedido diretamente ou o envelope `{ signature, order }`.

O handler deve responder `200 OK` rapidamente e processar o evento com `after(...)`, evitando timeout e reenvios desnecessários da Kiwify.

O parser tolera variações de estrutura e normaliza:

- tipo e status do evento;
- ID da compra e ID do evento;
- ID do produto e checkout link;
- e-mail, nome e telefone do comprador.

Eventos aprovados ativam acesso. Reembolso, chargeback e cancelamento/revogação atualizam o status do entitlement, mas **não apagam respostas nem relatório**. Eventos desconhecidos são ignorados.

O produto só é aceito quando corresponde a `KIWIFY_IRC_PRODUCT_IDS` ou a `KIWIFY_IRC_CHECKOUT_LINKS`/`NEXT_PUBLIC_IRC_CHECKOUT_URL`. A validação por checkout é necessária porque ofertas diferentes podem compartilhar um produto Kiwify.

Idempotência e auditoria:

- cada evento é registrado em `commerce_webhook_events`;
- a unicidade é `(provider, event_id)`;
- o SHA-256 do payload impede que o mesmo ID seja reaproveitado com conteúdo diferente;
- eventos processados ou ignorados não são processados novamente;
- eventos falhos podem ser reclamados e incrementam `attempts`;
- o entitlement usa unicidade `(source, purchase_id, product_code)`;
- a tag `ChatQuiz` usa unicidade `(user_id, tag)`;
- o e-mail de acesso é deduplicado por usuário, compra, tipo e status de entrega.

Na compra aprovada:

1. localizar o perfil pelo e-mail normalizado;
2. se não existir, criar usuário via `auth.admin.generateLink({ type: 'invite' })` com redirecionamento para redefinição de senha e retorno ao diagnóstico;
3. atualizar o perfil como ativo, preservar nome/telefone/tier existentes e usar `DESPERTAR` como tier padrão;
4. adicionar `diagnostico` à lista de turmas sem remover outras turmas e sem duplicar diferenças de caixa;
5. criar ou reativar `product_access`;
6. adicionar a tag `ChatQuiz`;
7. enviar `irc_access_invite` para conta nova ou `irc_access_granted` para conta existente;
8. direcionar primeiro para `/obrigadoquiz`.

A página `/obrigadoquiz` explica que a conta já foi criada, impede cadastro duplicado e separa as ações “já tenho senha” e “criar ou redefinir minha senha”. Ambas preservam `next=/diagnostico-completo`.

## 5. Banco de dados

### `commerce_webhook_events`

Mantém auditoria e idempotência dos eventos: provider, IDs, tipo, produto, compra, hash do payload, status (`processing`, `processed`, `ignored`, `failed`), tentativas, erro e timestamps.

### `product_access`

É o entitlement real do produto: usuário, produto, compra, status (`active`, `revoked`, `refunded`, `chargeback`, `expired`), origem, concessão/revogação e metadata.

### `user_tags`

Associa a tag `ChatQuiz` ao usuário.

### `irc_diagnostics`

Existe no máximo um diagnóstico por usuário (`UNIQUE(user_id)`). Campos importantes:

- vínculo: `user_id`, `entitlement_id`;
- progresso: `status`, `current_domain`, `current_stage`, `answers`;
- relatório: texto, modelo, versão, data, input/output tokens;
- visuais: status, versão, modelo, prompts, caminhos dos arquivos, data e último erro;
- entrega: caminho e status do PDF, status e data do e-mail;
- operação: tentativas, último erro, início, conclusão e timestamps.

Estados do diagnóstico:

`not_started -> in_progress -> answers_completed -> generating_report -> report_ready`

Em falha de geração:

`generating_report -> generation_failed -> generating_report`

Estágios da pergunta:

`entry -> branch -> entry do domínio seguinte`; no sexto domínio, `branch -> complete`.

Estados do PDF: `pending`, `generating`, `ready`, `failed`.

Estados dos visuais: `pending`, `generating`, `ready`, `fallback`, `failed`.

Estados do e-mail: `pending`, `sending`, `sent`, `failed`.

As tabelas têm RLS. Usuários autenticados só podem selecionar seu próprio entitlement e diagnóstico; escrita ocorre no servidor com service role. Administradores têm as políticas administrativas. `commerce_webhook_events` e `user_tags` não ficam expostas ao cliente. O bucket `irc-reports` é privado, limitado a PDF e 10 MB.

## 6. Questionário e persistência

A fonte única das perguntas é `IRC_DOMAINS`. Os seis domínios, nesta ordem, são:

1. `raiz` — Raiz;
2. `emocao` — Emoção predominante;
3. `autossabotagem` — Autossabotagem;
4. `merecimento` — Merecimento;
5. `visao_futuro` — Visão de futuro;
6. `capacidade_mudanca` — Capacidade percebida de mudança.

Nunca aceite do cliente o texto de uma pergunta ou resposta como dado confiável. O cliente envia somente:

```json
{
  "domain_id": "raiz",
  "stage": "entry",
  "option_id": "escassez"
}
```

`POST /api/irc/answer` valida o shape com Zod, confirma o domínio e estágio esperados, resolve o ID na árvore canônica e salva imediatamente. A resposta de entrada salva apenas `entry_id`; a ramificação salva `entry_id` e `branch_id`.

Regras importantes:

- respostas fora de ordem retornam conflito;
- repetir exatamente uma escolha já salva é idempotente;
- depois de `answers_completed`, as respostas ficam bloqueadas;
- a atualização usa `updated_at` como trava otimista; concorrência retorna `answer_conflict`;
- recarregar a página reconstrói toda a conversa a partir do JSON persistido;
- `canonicalizeAnswers` só produz texto para a IA se os 6 domínios estiverem completos e todos os IDs forem válidos.

`GET /api/irc/diagnostic` autentica, encontra ou cria o diagnóstico e devolve:

- diagnóstico serializado;
- primeiro nome do perfil;
- árvore pública das perguntas;
- `total_steps = 12`.

Se uma recompra criar novo entitlement, o diagnóstico histórico é preservado e apenas `entitlement_id` é religado.

## 7. Experiência no frontend

`IrcExperience` possui quatro fases de interface:

- `questions`: conversa e opções clicáveis;
- `processing`: geração do relatório;
- `error`: falha recuperável, sem perder respostas;
- `complete`: relatório, PDF, e-mail e próximos passos.

O progresso mostra 12 etapas. Cada resposta é persistida antes do avanço. Ao concluir a última ramificação, o frontend chama a geração automaticamente. Se o relatório estiver em `generating_report`, faz polling a cada 2,5 segundos. Se ocorrer falha, o botão de retry chama a geração novamente sem refazer o questionário.

Quando o relatório fica pronto, a entrega é disparada automaticamente uma vez no cliente. Falhas de PDF ou e-mail exibem estado claro e um botão de nova tentativa. O relatório continua acessível pelo card **Meu Diagnóstico** na home `/app`.

Usuário sem sessão é redirecionado ao login com `next=/diagnostico-completo`. Usuário autenticado sem entitlement vê a oferta com preço atual de R$ 47,90 e link do checkout configurável.

## 8. Geração do relatório com Claude

`POST /api/irc/generate` aceita somente diagnóstico em `answers_completed` ou `generation_failed`.

O endpoint:

1. valida e canonicaliza as respostas salvas;
2. reclama atomicamente o trabalho mudando o estado para `generating_report`;
3. incrementa `generation_attempts`;
4. chama Anthropic com timeout de 55 segundos, `max_tokens: 4000` e `temperature: 0.35`;
5. valida a presença das oito seções obrigatórias;
6. persiste texto, modelo, versão, tokens e timestamp;
7. muda para `report_ready` e deixa PDF/e-mail como `pending`.

Chamadas concorrentes não devem duplicar geração: se já estiver gerando, responder `202`; se já houver relatório pronto, reutilizá-lo.

O modelo vem de `ANTHROPIC_IRC_MODEL`, depois `ANTHROPIC_MODEL`, com fallback atual `claude-sonnet-4-5`.

O prompt editorial está em `src/modules/irc/application/irc-report.js`. Ele exige um relatório em português, na voz de Jackson Souza, direto, profundo e sem inventar fatos, com 700–1000 palavras e exatamente estas oito seções, na ordem:

1. Abertura personalizada;
2. O padrão central identificado;
3. Como isso aparece no dia a dia;
4. A raiz;
5. O que sustenta esse padrão hoje;
6. Onde você quer chegar;
7. Reprogramação — Método Finanças do Zero + Novos Hábitos;
8. Fechamento + convite.

Apenas a seção 7 usa lista. O texto não pode usar os termos “bloco” ou “módulo” para as seções, nem as classificações Bombeiro, Sobrevivente, Construtor ou Multiplicador. A seção 7 deve propor 2–3 movimentos concretos ligados a Receita, Lucro, Impostos, Despesas Fixas, Investimentos e Reserva de Emergência. O fechamento orienta a aula da planilha e as contas previstas; Imersão ou Mentoria pode aparecer somente como continuidade opcional, sem urgência artificial.

Erros expostos ao cliente são códigos seguros, sem vazar detalhes do provedor: serviço não configurado, estrutura inválida, timeout ou falha genérica. Uma falha coloca o registro em `generation_failed` e preserva as respostas.

## 9. PDF, armazenamento e e-mail

`POST /api/irc/deliver` só opera em `report_ready`.

Fluxo:

1. reclamar a geração do PDF mudando `pending/failed -> generating`;
2. canonicalizar as respostas e criar três direções visuais individuais (`cover`, `cycle` e `future`), sem nome ou outro dado pessoal no prompt;
3. quando `OPENAI_API_KEY` estiver configurada, gerar as imagens com `OPENAI_IRC_IMAGE_MODEL`, armazená-las em `irc-reports/{user_id}/{diagnostic_id}/visuals/*.png` e persistir modelo, versão e prompts para auditoria;
4. se a geração de imagens não estiver configurada ou falhar, usar os infográficos vetoriais determinísticos do próprio PDF, sem bloquear a entrega;
5. montar um PDF A4 multipágina com capa, mapa das seis dimensões, todas as oito seções integrais, diagramas personalizados, Método Finanças do Zero, plano de ação, CTA e paginação;
6. criar automaticamente páginas de continuação sempre que o texto exceder a área disponível, sem truncar conteúdo;
7. salvar em `irc-reports/{user_id}/{diagnostic_id}.pdf` com `upsert` e marcar o PDF como `ready`;
8. reclamar o envio mudando `pending/failed -> sending`;
9. enviar `irc_report_ready` com o PDF anexado e registrar `email_sent_at`.

O texto do relatório permanece como fonte auditável. O renderer também converte automaticamente a nomenclatura histórica “Método Lucro Primeiro” em “Método Finanças do Zero”, permitindo regenerar relatórios antigos no layout novo. Na capa deve aparecer exatamente: “Ferramenta de Diagnóstico, Identificador e Reprogramador de Crenças desenvolvida por Jackson Souza”.

Se os visuais ou o PDF já existem, eles são reutilizados. O PDF existente é baixado do bucket para o anexo. A entrega é idempotente: não gerar nem enviar novamente quando os respectivos artefatos já estiverem prontos. Falhas de visuais, PDF e e-mail são independentes e recuperáveis.

`GET /api/irc/pdf` exige sessão e entitlement ativo, verifica `pdf_status = ready`, valida se o caminho começa exatamente com `{user_id}/{diagnostic_id}` e entrega com cache privado desabilitado.

## 10. Administração

A rota `/admin/diagnosticos` é exclusiva para admin e está no menu administrativo. Ela permite:

- métricas de total, prontos, em andamento e falhos;
- busca por nome ou e-mail;
- filtro por status;
- paginação de 20 itens;
- acompanhamento dos estados dos visuais, PDF e e-mail;
- abertura do texto integral em modal;
- download do PDF.

APIs:

- `GET /api/admin/diagnostics` para lista, métricas, busca, filtro e paginação;
- `GET /api/admin/diagnostics/[id]` para relatório completo;
- `GET /api/admin/diagnostics/[id]/pdf` para PDF privado.

A listagem parte de `irc_diagnostics` e cruza `profiles`, portanto o mentor não precisa conhecer ou selecionar previamente o usuário. O download administrativo também valida o prefixo `{diagnostic.user_id}/{diagnostic.id}`.

O painel de atividade da plataforma também observa diagnósticos e sinaliza, entre outros casos, compra sem início, diagnóstico parado por mais de 48 horas, relatório pronto e falha de geração.

## 11. Variáveis de ambiente

```env
NEXT_PUBLIC_SITE_URL=https://www.zeroapp.tech
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
KIWIFY_IRC_WEBHOOK_TOKEN=...
KIWIFY_IRC_PRODUCT_IDS=...
KIWIFY_IRC_CHECKOUT_LINKS=...
NEXT_PUBLIC_IRC_CHECKOUT_URL=...
ANTHROPIC_API_KEY=...
ANTHROPIC_IRC_MODEL=claude-sonnet-4-5
OPENAI_API_KEY=...
OPENAI_IRC_IMAGE_MODEL=gpt-image-2
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
RESEND_FROM_NAME=...
```

Em produção, o webhook deve usar a URL com `www`, pois um redirecionamento HTTP 307 no domínio sem `www` não deve fazer parte do caminho crítico de entrega.

## 12. Testes e invariantes que devem ser preservados

Os testes existentes cobrem:

- 6 domínios e exatamente 12 etapas;
- unicidade dos IDs;
- ramificação correta conforme a entrada;
- canonicalização completa e rejeição de resposta adulterada/incompleta;
- oito seções obrigatórias do relatório;
- criação da conta, entitlement, turma, tag e e-mail após compra;
- normalização dos formatos reais da Kiwify;
- IDs diferentes para aprovação e reembolso da mesma compra;
- autenticação do webhook por token e HMAC-SHA1;
- geração de PDF infográfico completo e substituição da nomenclatura histórica;
- prompts visuais baseados somente em respostas canônicas e fallback quando a API de imagens não está configurada;
- turma `diagnostico` case-insensitive e multiturma;
- acesso à planilha sem concessão indevida às áreas de mentoria.

Ao alterar o módulo:

- não confie em texto enviado pelo browser;
- não use a chave de service role no cliente;
- não torne o bucket público;
- não remova idempotência nem travas de concorrência;
- não apague relatório ou respostas em reembolso;
- não conceda toda a mentoria a quem possui somente a turma `diagnostico`;
- não altere IDs canônicos já persistidos sem uma migração compatível;
- preserve retomada após refresh e recuperação após falha;
- mantenha erros externos sanitizados e detalhes apenas nos logs do servidor;
- execute os testes relacionados e `npm run build` antes de considerar uma mudança concluída.

## 13. Como quero que você trabalhe

Quando eu pedir uma mudança neste módulo:

1. inspecione primeiro os arquivos relacionados e confirme o comportamento atual no código;
2. descreva brevemente o impacto em frontend, API, banco, autenticação, entrega e testes;
3. implemente a menor mudança coerente com a arquitetura existente;
4. inclua migração idempotente se houver alteração de schema ou dados;
5. adicione ou atualize testes para o comportamento alterado;
6. valide lint/testes/build em proporção ao impacto;
7. informe arquivos alterados, decisões, riscos e qualquer passo manual de deploy.

Não reescreva o módulo do zero e não substitua os contratos acima sem necessidade explícita. Se meu pedido entrar em conflito com segurança, idempotência, dados históricos ou controle de acesso, aponte o conflito antes de implementar.

Agora aguarde minha solicitação específica sobre o módulo.
