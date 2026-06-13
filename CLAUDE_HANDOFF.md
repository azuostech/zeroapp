# CLAUDE Handoff - ZeroApp Home Hub + Navegação v2 + Perfil Dedicado

Data: 2026-05-30
Branch atual: main
Status funcional: fluxo validado pelo usuário

## Objetivo da rodada
Finalizar a Fase 2 de navegação e corrigir a experiência de perfil, separando `/perfil` da tela de finanças, com gestão real de conta (senha e e-mail) sem quebrar fluxos existentes.

## O que foi implementado

1. Navegação principal (bottom nav)
- Padrão final aplicado:
  - `🏠 Início` -> `/app`
  - `🌱 Minha Jornada` -> `/mavf`
  - `🏆 Conquistas` -> `/jornada`
- A tab `Você` foi removida do menu inferior.
- Mantido destaque ativo e acessibilidade da navegação.

2. Acesso ao perfil
- O perfil agora é acessado pelo avatar (inicial do usuário) no canto superior direito do header.
- Clique no avatar abre `/perfil`.

3. Página `/perfil` dedicada (não renderiza mais finanças)
- Reescrita da página para UI própria, com:
  - card de informações do usuário (nome, e-mail, telefone, tier, status, data de criação)
  - formulário de alteração de e-mail
  - formulário de alteração de senha
- Mantidos no perfil:
  - `AppHeader`
  - `BottomNav`
  - `FAB` + `JacksonAIModal`

4. Alteração de senha
- Fluxo usa endpoint existente:
  - `POST /api/auth/update-password`
- Validações no front:
  - mínimo de 6 caracteres
  - confirmação obrigatória igual à senha

5. Alteração de e-mail com regra de vínculo no banco
- Criado endpoint novo:
  - `GET /api/profile/email` -> consulta elegibilidade
  - `POST /api/profile/email` -> solicita troca de e-mail
- Regra implementada:
  - só permite alteração se o usuário não tiver vínculos em tabelas de negócio (financeiro, coins, mavf, comunidade, desafios)
- Se houver vínculo:
  - bloqueia alteração
  - retorna lista de vínculos encontrados para exibir no perfil
- Se permitido:
  - chama `supabase.auth.updateUser({ email })`
  - fluxo segue confirmação por e-mail (comportamento padrão do Supabase)

6. Home Hub e demais ajustes já consolidados
- Cards da Home: `Finanças`, `Educação (📚)`, `Comunidade`, `Conquistas`.
- `/mavf` com título visual `Minha Jornada 🌱`.
- `/jornada` com título visual `Conquistas 🏆`.
- FAB mantido nas telas internas.
- `/financas` permanece mostrando só dados financeiros (sem blocos de jornada/perfil no final).

## Arquivos alterados nesta rodada
- `app/perfil/page.jsx`
- `app/api/profile/email/route.js` (novo)
- `components/layout/AppHeader.jsx`
- `components/layout/BottomNav.jsx`
- `components/layout/BottomNavHub.jsx`

## Arquivos relevantes já alterados nas rodadas anteriores
- `app/app/page.js`
- `app/conteudo/page.jsx`
- `app/financas/page.js`
- `app/jornada/page.jsx`
- `app/mavf/page.jsx`
- `app/resumo/page.jsx`
- `app/turma/page.jsx`
- `src/modules/finance/presentation/finance-app-page.jsx`

## Validação
- Build validado com sucesso após as alterações:
  - `npm run build`
- Fluxo funcional validado pelo usuário.

## Decisões de produto aplicadas
- Perfil não fica mais no bottom nav.
- Bottom nav foca em navegação de uso diário (`Início`, `Minha Jornada`, `Conquistas`).
- Perfil vira área de conta/acesso, aberta pelo avatar no header.

## Observações para continuidade
- Se quiser endurecer a regra de alteração de e-mail, mover a lista de tabelas vinculadas para configuração centralizada.
- Opcional: adicionar auditoria de segurança para alterações de credenciais (log de evento interno).
- Evitar regressão nas APIs de `finance`, `coins`, `mavf` e autenticação.

---

## Atualização 2026-05-30 — Comunidade (privacidade + nomes)

### Objetivo da correção
- Corrigir exibição de nomes no feed da Comunidade (evitar fallback constante para `Mentorado`).
- Adicionar consentimento explícito de privacidade ao registrar:
  - ganho
  - gratidão
  - identidade
- Só publicar no feed quando o usuário autorizar no momento do registro.

### O que foi implementado

1. Nomes no feed com fallback robusto
- Ajustado enriquecimento do feed em `GET /api/community/feed`:
  - busca `profiles.id, full_name, email, tier`
  - resolve nome com prioridade:
    1) `full_name`
    2) prefixo do e-mail formatado
    3) `metadata.author_name` do evento
    4) fallback final `Mentorado`
- Tier do autor também passa a usar fallback por metadata quando necessário.

2. Snapshot de autor ao publicar evento
- `publishFeedEvent` agora salva no `metadata` do `feed_events`:
  - `author_name`
  - `author_tier`
- Isso reduz risco de cards sem nome quando perfil estiver incompleto/inconsistente.

3. Consentimento de compartilhamento (opt-in)
- Incluído checkbox nos 3 formulários:
  - `components/mavf/GanhoForm.jsx`
  - `components/mavf/GratidaoForm.jsx`
  - `components/mavf/IdentidadeForm.jsx`
- Campo enviado para API: `share_in_feed`.
- Padrão: **não compartilhar** (privacidade por padrão).

4. APIs MAVF respeitando consentimento
- Endpoints atualizados:
  - `POST /api/mavf/gains`
  - `POST /api/mavf/gratitude`
  - `POST /api/mavf/identity`
- Regra aplicada:
  - publica no feed apenas quando `share_in_feed = true`.
- Retorno da API inclui `shared_to_feed` para rastreabilidade.

5. Eventos de feed refinados
- Ganhos:
  - grande -> `gain_grande`
  - pequeno/médio -> `gain_registered`
- Gratidão:
  - streak 7/30 -> `gratitude_streak_7|30`
  - demais -> `gratitude_registered`
- Identidade:
  - `identity_registered` (somente com consentimento)

6. Labels visuais do feed
- `FeedEventCard` atualizado para reconhecer novos tipos:
  - `gain_registered`
  - `gratitude_registered`
  - `identity_registered`
  - `gratitude_streak_*` (prefix match)

### Arquivos alterados nesta correção
- `app/api/community/feed/route.js`
- `src/modules/community/application/feed-publisher.js`
- `app/api/mavf/gains/route.js`
- `app/api/mavf/gratitude/route.js`
- `app/api/mavf/identity/route.js`
- `hooks/useGains.js`
- `hooks/useGratitude.js`
- `hooks/useIdentity.js`
- `components/mavf/GanhoForm.jsx`
- `components/mavf/GratidaoForm.jsx`
- `components/mavf/IdentidadeForm.jsx`
- `components/community/FeedEventCard.jsx`

### Validação
- Build executado com sucesso após as mudanças:
  - `npm run build`

---

## Atualização 2026-05-30 — Feed da Comunidade (constraint SQL + validação em produção)

`CLAUDE-HANDOFF-MARKER: feed-event-type-constraint-updated-and-validated-2026-05-30`

### Problema observado
- Usuário registrava novo ganho com `share_in_feed=true`, mas o evento não aparecia no feed.

### Causa raiz
- O banco ainda estava com constraint legado em `public.feed_events.event_type`, sem aceitar:
  - `gain_registered`
  - `gratitude_registered`
- Isso gerava falha de insert para tipos novos.

### Mitigação aplicada em código (compatibilidade)
1. Fallback no publisher
- `src/modules/community/application/feed-publisher.js`
- Em erro de CHECK (`23514`) no `event_type`, tenta novamente com tipo legado compatível:
  - `gain_registered` -> `gain_grande`
  - `gratitude_registered` -> `gratitude_streak_7`
- Salva o tipo original em `metadata.event_type_original`.

2. Leitura do tipo original no feed
- `app/api/community/feed/route.js`
- Ao montar resposta do feed, prioriza:
  - `metadata.event_type_original`
  - fallback para `event.event_type`.

### Migração SQL executada no banco (Supabase)
- Constraint `feed_events_event_type_check` foi recriado com os tipos:
  - `month_complete`
  - `goal_reached`
  - `achievement_unlocked`
  - `gain_grande`
  - `gratitude_streak_7`
  - `gratitude_streak_30`
  - `tier_upgrade`
  - `identity_registered`
  - `workshop_redeemed`
  - `gain_registered`
  - `gratitude_registered`
  - `received_reaction`

### Validação da migração
1. Pós-migração confirmada
- `pg_get_constraintdef(...)` retornou lista nova completa no banco.

2. Smoke test transacional (sem persistir dados)
- Inserções testadas com `BEGIN ... ROLLBACK`:
  - `gain_registered`
  - `gratitude_registered`
  - `received_reaction`
- Todos aceitos sem erro de constraint.
- Verificação final: `0` linhas de teste persistidas.

### Commit relacionado
- `5213842` — `fix: compat feed event type for legacy db constraint` (push em `main`).

---

## Atualização 2026-06-08 — Últimas implementações para continuidade

### Estado atual do repo
- Branch atual: `main`.
- HEAD: `513deef` (`merge: feature swipe delete`), sincronizado com `origin/main`.
- Working tree sem diff rastreado no momento deste resumo.
- Existe `backup.dump` não rastreado; não foi alterado nesta rodada.

### 1. Comunidade por turma + stats via RPC
Commit principal:
- `e289c94` — `fix(community): garantir publicação por turma e stats atualizadas`

O que mudou:
- `publishFeedEvent` agora tenta usar `service role` para gravar `feed_events`, com fallback para o client Supabase da request.
- O publisher carrega snapshot do autor (`turma`, `full_name`, `email`, `tier`) e grava no evento:
  - `turma`
  - `metadata.event_type_original`
  - `metadata.author_name`
  - `metadata.author_tier`
- Isso corrige feed segmentado por turma e evita perda de autoria quando `profiles` estiver incompleto.
- `/api/community/stats` passou a usar a RPC segura `get_community_stats(p_turma)`, em vez de montar agregados diretamente na API.
- A página `/turma` agora explicita o contexto:
  - se o usuário tem turma, mostra eventos da turma;
  - se não tem turma, mostra contexto geral.
- Os formulários MAVF (`GanhoForm`, `GratidaoForm`, `IdentidadeForm`) mantêm opt-in explícito para compartilhar no feed.

Arquivos principais:
- `src/modules/community/application/feed-publisher.js`
- `app/api/community/stats/route.js`
- `app/turma/page.jsx`
- `scripts/migrate-ajuste5-community-stats-rpc.sql`
- `components/mavf/GanhoForm.jsx`
- `components/mavf/GratidaoForm.jsx`
- `components/mavf/IdentidadeForm.jsx`

Observação:
- A RPC `get_community_stats(text)` precisa estar aplicada no Supabase para `/api/community/stats` funcionar.

### 2. Área de membros / Educação por programas
Commits principais:
- `37cdcc9` — `feat: implement area de membros`
- `498efc3` — `merge: feature area de membros`

O que foi implementado:
- Nova estrutura de conteúdo por programas:
  - `content_programs`
  - `content_sessions`
  - `content_progress`
  - `content_comments`
  - `content_comment_replies`
- `member_area_content` foi expandida para funcionar como aula vinculada a sessão:
  - `session_id`
  - `visibility` (`visible`, `locked`, `hidden`)
- Fluxo público:
  - `/conteudo` lista programas disponíveis com progresso.
  - `/conteudo/[id]` mostra detalhe do programa, sessões expansíveis e aulas.
  - `/conteudo/[id]/[aulaId]` abre player da aula, navegação anterior/próxima, progresso e comentários.
- Regras de acesso:
  - filtra por publicação, visibilidade, tier, turma e disponibilidade por data.
  - quando a aula está bloqueada, a API remove a `url` e retorna `locked/locked_reason`.
- Progresso:
  - abrir aula faz `POST /api/content/[id]/progress` para marcar início.
  - concluir aula faz `POST /api/content/[id]/progress/complete`.
  - desmarcar conclusão usa `DELETE /api/content/[id]/progress/complete`.
  - primeira conclusão tenta conceder `15` ZeroCoins via RPC `award_coins`, action type `content_completed`.
- Comentários:
  - comentários e respostas por aula.
  - delete permitido para autor ou admin.
  - autores enriquecidos por `profiles`.
- Admin:
  - `/admin/conteudo/programas`
  - `/admin/conteudo/programas/novo`
  - CRUD de programas e sessões.
  - endpoint para vincular conteúdo existente a uma sessão.
- Migrações:
  - `scripts/migrate-area-membros.sql`
  - `scripts/migrate-area-membros-etapa-d-feed-events.sql`
- A Etapa D atualiza a constraint de `feed_events.event_type` para aceitar `content_completed`.

Arquivos principais:
- `app/conteudo/page.jsx`
- `app/conteudo/[id]/page.jsx`
- `app/conteudo/[id]/[aulaId]/page.jsx`
- `app/api/content/programs/route.js`
- `app/api/content/programs/[id]/route.js`
- `app/api/content/[id]/progress/route.js`
- `app/api/content/[id]/progress/complete/route.js`
- `app/api/content/[id]/comments/route.js`
- `components/content/ProgramCard.jsx`
- `components/content/AulaItem.jsx`
- `components/content/CommentsSection.jsx`
- `components/content/CommentItem.jsx`
- `hooks/usePrograms.js`
- `hooks/useProgramDetail.js`
- `hooks/useComments.js`
- `app/admin/conteudo/programas/page.jsx`
- `components/admin/ProgramAdminForm.jsx`
- `hooks/useAdminPrograms.js`

Pontos de atenção:
- Confirmar que as migrações da área de membros foram aplicadas no Supabase antes de validar o fluxo.
- Confirmar se a RPC `award_coins` aceita `content_completed` em produção; o código JS já adicionou esse action type em `src/modules/coins/application/coins-service.js`.
- A conclusão da aula concede coins, mas o código da rota não publica diretamente um evento no feed; a migração apenas prepara a constraint para `content_completed`.

### 3. Swipe delete nas listas financeiras
Commits principais:
- `355ae7b` — `feat: add swipe delete to finance lists`
- `513deef` — `merge: feature swipe delete`

O que foi implementado:
- Criado hook reutilizável `useSwipeDelete` com suporte a touch e mouse.
- Criado componente `SwipeableItem` com:
  - arraste horizontal para revelar ação de excluir;
  - prevenção de conflito com scroll vertical;
  - ignore de alvos interativos (`button`, `input`, `select`, `textarea`, `label`, `a`, `data-no-swipe`);
  - apenas uma linha aberta por vez;
  - sheet de confirmação antes da exclusão.
- `ItemRow` passou a envolver itens financeiros em `SwipeableItem`.
- `finance-app-page.jsx` também recebeu implementação de swipe para listas renderizadas/manipuladas internamente, incluindo remoção de subcategorias, grupos e categorias.
- Estilos globais adicionados em `styles/theme.css` para hints de swipe.
- `AppHeader` foi ajustado na mesma branch; evitar reverter sem comparar, pois ele agora concentra logo, nome, tier/coins e refresh por evento `zero:coins-updated`.

Arquivos principais:
- `hooks/useSwipeDelete.js`
- `components/finance/SwipeableItem.jsx`
- `src/modules/finance/presentation/ItemRow.jsx`
- `src/modules/finance/presentation/finance-app-page.jsx`
- `styles/theme.css`
- `components/layout/AppHeader.jsx`

Pontos de atenção:
- Validar swipe em mobile real ou em viewport mobile, porque o hook usa `preventDefault()` durante arraste horizontal.
- Conferir se exclusões financeiras continuam respeitando estados `readOnly`/admin antes de mexer no fluxo.

### Validação desta atualização
- Esta rodada foi apenas de resumo/handoff.
- Não foi executado build/test novo após anexar este documento.

---

## Atualização 2026-06-09 — Design System Fase 3 (MAVF + Feed)

### Objetivo da rodada
Aplicar ajustes visuais pontuais da Fase 3 nas telas internas, sem alterar lógica, APIs, hooks ou banco.

### Escopo respeitado
- Não alterar `GanhoForm`, `GratidaoForm`, `IdentidadeForm`.
- Não alterar `AppHeader.jsx`.
- Não alterar `app/turma/page.jsx` depois da auditoria do refresh/contexto por turma.
- Não duplicar tokens em `styles/theme.css`.
- Manter a abordagem de estilo existente de cada arquivo.

### O que foi implementado

1. Cards MAVF com tokens do design system
- `GanhosCard` recebeu tratamento visual verde:
  - fundo sutil com `var(--green-dim)`
  - borda/glow com tokens verdes
  - hover/focus nos botões
  - valores numéricos com `var(--font-mono)` e `tabular-nums`
- `GratidaoCard` recebeu tratamento visual rosa:
  - fundo sutil com `var(--rose-dim)`
  - streak badge com `var(--rose)`
  - hover/focus rosa
  - valores numéricos com `var(--font-mono)`
- `IdentidadeCard` recebeu tratamento visual roxo:
  - fundo sutil com `var(--purple-dim)`
  - timeline mais próxima do manifesto visual
  - declarações mantendo `var(--purple)`, `var(--font-body)` e `font-weight: 700`
  - datas com `var(--font-mono)`

2. FeedEventCard com badges por tipo
- Tipos de ganho:
  - `gain_registered`
  - `gain_grande`
  - usam `badge-blue`.
- Tipos de gratidão:
  - `gratitude_registered`
  - `gratitude_streak*`
  - usam `badge-rose` com `🔥` no label.
- Tipo de identidade:
  - `identity_registered`
  - usa `badge-purple`.
- Aula concluída:
  - `content_completed`
  - usa `badge-green`.
- Botão "Dar força" foi alinhado ao padrão:
  - estado normal com `var(--bg3)`, `var(--border)`, `var(--text-2)`
  - hover/ativo em verde.

### Arquivos alterados nesta rodada
- `components/mavf/GanhosCard.jsx`
- `components/mavf/GratidaoCard.jsx`
- `components/mavf/IdentidadeCard.jsx`
- `components/community/FeedEventCard.jsx`
- `CLAUDE_HANDOFF.md`

### Arquivos auditados e preservados
- `components/mavf/GanhoForm.jsx`
- `components/mavf/GratidaoForm.jsx`
- `components/mavf/IdentidadeForm.jsx`
- `components/layout/AppHeader.jsx`
- `app/turma/page.jsx`
- `styles/theme.css`

### Validação
- `styles/theme.css` já continha:
  - `--rose`
  - `--rose-dim`
  - `--purple`
  - `--purple-dim`
  - `--blue`
  - `--blue-dim`
- Varredura nos arquivos alterados não encontrou hex/rgba hardcoded.
- `git diff --check` passou nos arquivos alterados.
- `npm run build` executado com sucesso.
- Tentativa de validação visual via in-app browser não foi possível porque nenhum browser estava disponível na sessão; o dev server local foi iniciado e encerrado.

### Observações para continuidade
- `backup.dump` continua não rastreado e não faz parte desta rodada.
- Se houver próxima fase de design, deixar `finance-app-page.jsx` para uma rodada própria, como o prompt da Fase 3 já sugeria.

---

## Atualização 2026-06-10 — Admin Conteúdo por Programas

### Commit relacionado
- `b5fed5b` — `feat: organize admin content by programs`
- Status: commit enviado para `origin/main`.

### Objetivo da rodada
Adequar a área admin de conteúdo para refletir a experiência do usuário em `/conteudo`, que agora é organizada por:
- programas
- sessões
- aulas/conteúdos

Antes, `/admin/conteudo` funcionava principalmente como lista plana de arquivos. Isso dificultava criar e organizar aulas dentro da estrutura de programas exibida para os alunos.

### O que foi implementado

1. `/admin/conteudo` virou visão estrutural
- A tela principal agora mostra `Conteúdo por Programas`.
- Lista programas como cards principais.
- Cada programa pode expandir sessões.
- Cada sessão mostra suas aulas/conteúdos vinculados.
- A estrutura fica mais próxima da tela pública:
  - `/conteudo`
  - `/conteudo/[id]`
  - `/conteudo/[id]/[aulaId]`

2. Ações disponíveis por nível
- Programa:
  - ver/ocultar sessões
  - criar sessão
  - editar nome do programa
  - publicar/despublicar
  - excluir
- Sessão:
  - adicionar aula diretamente naquela sessão
  - editar nome da sessão
  - excluir sessão
- Aula/conteúdo:
  - editar
  - publicar/despublicar
  - excluir
  - alterar ordem

3. Criação de aula com sessão pré-selecionada
- O botão `+ Aula` dentro de uma sessão abre:
  - `/admin/conteudo/novo?session_id=<id>`
- `ContentAdminForm` agora lê `session_id` da URL no client.
- Quando a sessão é pré-selecionada, o formulário exibe um bloco de contexto com:
  - nome do programa
  - nome da sessão
- Isso reduz erro operacional ao cadastrar aulas no programa errado.

4. Conteúdos sem sessão
- A tela exibe uma seção `Aulas sem programa`.
- Serve para identificar conteúdos avulsos que ainda não estão organizados em programa/sessão.
- Observação importante: esses conteúdos não fazem parte do fluxo principal por programas enquanto não forem vinculados a uma sessão.

5. Compatibilidade com a tela antiga de programas
- Em `/admin/conteudo/programas`, o botão `+ Aula` também passou a abrir o formulário com `session_id` na query string.
- Isso mantém os dois caminhos admin coerentes.

### Arquivos alterados
- `app/admin/conteudo/page.jsx`
- `app/admin/conteudo/programas/page.jsx`
- `components/admin/ContentAdminForm.jsx`

### Validação realizada
- `git diff --check` passou.
- `npm run build` passou.
- Commit e push realizados em `main`.

### Pontos de atenção para continuidade
- `backup.dump` continua não rastreado e não faz parte do commit.
- A reorganização usa hooks/APIs já existentes:
  - `useAdminContent`
  - `useAdminPrograms`
  - `/api/admin/content`
  - `/api/admin/programs`
- Não houve alteração de banco, migração ou API nesta rodada.
- A tela ainda usa `window.prompt`/`window.confirm` para algumas ações rápidas de programa/sessão; se a próxima fase for polimento admin, trocar isso por modais próprios seria o próximo passo natural.

---

## Atualização 2026-06-10 — Correção de Erro HTML no Admin Conteúdo

### Objetivo da rodada
Evitar que a área admin exiba uma página HTML bruta do Next.js quando uma ação de conteúdo/programa falha no servidor.

O bug apareceu ao incluir uma sessão: a interface renderizou o HTML completo de uma página de erro (`<!DOCTYPE html>... __NEXT_DATA__ ...`) dentro da tela `/admin/conteudo`, em vez de mostrar uma mensagem curta e operável.

### O que foi ajustado

1. Tratamento de erro mais defensivo
- `resolveError` agora detecta respostas HTML por:
  - `content-type: text/html`
  - início do payload com `<!doctype`
  - início do payload com `<html`
  - presença de `__NEXT_DATA__`
- Quando a resposta é HTML, o front não mostra o corpo bruto.
- A mensagem volta para o fallback amigável com status HTTP, como:
  - `Erro ao criar sessão (500)`
  - `Erro ao carregar programas (500)`

2. Pontos cobertos
- Formulário de conteúdo/aulas.
- Hook de conteúdos admin.
- Hook de programas admin.

### Arquivos alterados
- `components/admin/ContentAdminForm.jsx`
- `hooks/useAdminContent.js`
- `hooks/useAdminPrograms.js`

### Observação técnica
O erro original apontava para `Cannot find module './vendor-chunks/next.js'` dentro de `.next/server/...`, com cara de problema de build/cache/dev server do Next, não de regra de negócio. A correção feita não altera a lógica de criação de sessão; ela impede que o HTML bruto vaze para a interface caso uma falha desse tipo volte a acontecer.

---

## Atualização 2026-06-10 — Jackson IA com Data, Hora e Mercado Atual

### Objetivo da rodada
Fazer o Jackson IA responder com consciência da data/hora atual e de indicadores financeiros oficiais do mercado brasileiro, em vez de depender apenas do conhecimento estático do modelo.

### O que foi implementado

1. Novo contexto vivo de tempo e mercado
- Criado `src/lib/ai/market-context.js`.
- O helper gera um bloco de prompt com:
  - data e hora atuais em `America/Sao_Paulo`
  - Meta Selic
  - IPCA mensal
  - IPCA acumulado em 12 meses
  - CDI diário
  - dólar PTAX venda

2. Fontes oficiais usadas
- Banco Central do Brasil SGS:
  - série `432` — Meta Selic definida pelo Copom
  - série `433` — IPCA mensal
  - série `13522` — IPCA acumulado em 12 meses
  - série `12` — CDI diário
- Banco Central do Brasil PTAX:
  - `CotacaoDolarDia` para dólar PTAX venda

3. Comportamento seguro
- Os dados são buscados em janela até a data atual em São Paulo, evitando usar dado futuro por engano.
- Se o indicador não responder, o prompt informa indisponibilidade da fonte oficial e orienta o modelo a não chutar números.
- Há cache em memória de 15 minutos para reduzir chamadas externas.
- O dólar PTAX tenta a data atual e recua até 7 dias para encontrar a última cotação disponível.

4. Integração no chat
- `app/api/ai/chat/route.js` agora monta:
  - contexto financeiro do usuário
  - contexto de tempo/mercado
  - system prompt final
- Os dois contextos são carregados em paralelo com `Promise.all`.

5. System prompt atualizado
- `src/lib/ai/system-prompt.js` passou a aceitar `options.marketContext`.
- O prompt instrui o Jackson a usar o bloco `TEMPO E MERCADO` quando o usuário falar de:
  - hoje
  - agora
  - data/hora
  - Selic
  - IPCA
  - CDI
  - dólar
  - cenário macroeconômico
- Também foi ajustada a frase final para separar falta de dados pessoais da disponibilidade de dados macro.

### Arquivos alterados
- `app/api/ai/chat/route.js`
- `src/lib/ai/market-context.js`
- `src/lib/ai/system-prompt.js`

### Validação realizada
- `git diff --check` passou.
- `npm run build` passou.
- Endpoints do Banco Central foram conferidos com `curl` fora do sandbox:
  - SGS Selic retornou dados até `10/06/2026`
  - SGS IPCA mensal/IPCA 12 meses retornou última referência oficial disponível
  - SGS CDI retornou dado diário disponível
  - PTAX retornou dólar venda para a última data consultada

### Pontos de atenção para continuidade
- Essa implementação não cria nova tabela, variável de ambiente ou dependência.
- O contexto depende de rede no runtime do servidor Next.
- Em caso de falha de rede, o Jackson continua respondendo com data/hora local e marca indicadores como indisponíveis, sem inventar valores.
- `backup.dump` continua não rastreado e não deve entrar no commit sem pedido explícito.

---

## Atualização 2026-06-10 — Conteúdo com Múltiplas Turmas

### Objetivo da rodada
Corrigir o caso em que o usuário `sza.treinamentos@gmail.com` via o programa `Workshop Finanças do Zero`, mas a tela de detalhe mostrava `1 sessões · 0 aulas`, mesmo com aulas cadastradas.

### Diagnóstico
O cadastro estava correto no banco:
- Programa: `Workshop Finanças do Zero`
- Sessão: `Aulas`
- Aulas publicadas/visíveis:
  - `Workshop 01 - Comece por aqui`
  - `Workshop 02 - Perfil Financeiro`

O usuário estava com:
- `turma = "Maio 2026, Workshop"`
- `tier = ACELERACAO`

A causa era a política RLS de turma. As policies comparavam por igualdade exata:
- `profiles.turma = turma_exclusiva`

Com isso, `"Maio 2026, Workshop"` não batia com `"Workshop"`. O programa/sessão podia aparecer por uma combinação de acesso/admin, mas as aulas eram filtradas pela policy de `member_area_content`.

### O que foi implementado

1. Nova função SQL de acesso multiturma
- Criado script idempotente:
  - `scripts/migrate-conteudo-multiturma.sql`
- A função criada no banco:
  - `public.profile_has_turma(user_turmas text, required_turma text)`
- Ela aceita lista separada por vírgula ou ponto-e-vírgula:
  - `"Maio 2026, Workshop"`
  - `"Maio 2026; Workshop"`

2. Policies atualizadas
O script recria as policies de leitura:
- `programs_read` em `content_programs`
- `sessions_read` em `content_sessions`
- `member_content_read` em `member_area_content`

As policies agora usam:
- `public.profile_has_turma(p.turma, turma_exclusiva)`

3. API legada alinhada
- `app/api/content/route.js` também passou a tratar `profile.turma` como lista separada por vírgula/ponto-e-vírgula.
- Isso mantém o preview de conteúdo bloqueado/desbloqueado coerente com a RLS.

### Migração aplicada
O script `scripts/migrate-conteudo-multiturma.sql` foi aplicado no banco da `.env.local`.

Verificação exibida pelo próprio script:
- `Multiturma: turma usuario teste = Maio 2026, Workshop`
- `Multiturma: acesso Workshop = t`
- `Multiturma: acesso Maio 2026 = t`
- `Multiturma: policies recriadas = 3`

### Validação realizada
- Simulação com `ROLE authenticated` e `auth.uid()` do usuário `sza.treinamentos@gmail.com`.
- Resultado da consulta RLS para `Workshop Finanças do Zero`:
  - `1` sessão
  - `2` aulas
- Função validada:
  - `profile_has_turma('Maio 2026, Workshop', 'Workshop') = true`
  - `profile_has_turma('Maio 2026, Workshop', 'Maio 2026') = true`
  - `profile_has_turma('Maio 2026, Workshop', 'Outra') = false`
- `git diff --check` passou.
- `npm run build` passou.

### Arquivos alterados
- `app/api/content/route.js`
- `scripts/migrate-conteudo-multiturma.sql`

### Pontos de atenção para continuidade
- `profiles.turma` continua sendo texto simples; agora o padrão suportado é lista separada por `,` ou `;`.
- Se futuramente houver UI própria para múltiplas turmas, o ideal é evoluir para estrutura normalizada ou array, mas esta correção resolve o formato já usado em produção.
- `backup.dump` continua não rastreado e não deve entrar em commits.

---

## Atualização 2026-06-12 — Consolidação até Design System Fase 3

### Marcador de código
- Adicionado marcador em `app/jornada/page.jsx`:
  - `CLAUDE-HANDOFF-MARKER: Design System Fase 3 consolidado para telas internas; manter logica/hooks intactos.`
- A intenção é deixar uma âncora clara para futuras rodadas de design, sem espalhar comentários nos componentes.

### Commits recentes já concluídos

1. `c7432b3` — `style(screens): apply design system phase 3`
- Escopo:
  - `app/jornada/page.jsx`
  - `app/turma/page.jsx`
  - `app/conteudo/page.jsx`
  - `app/perfil/page.jsx`
  - `components/community/CommunityStats.jsx`
  - `components/community/DesafioCard.jsx`
  - `components/content/AulaItem.jsx`
  - `components/content/ContentCard.jsx`
  - `components/content/ProgramCard.jsx`
- Resultado:
  - Aplicados tokens e espaçamentos da Fase 3.
  - `ProgramCard.jsx` deixou de ter cores hardcoded.
  - Badge `Grátis` foi trocado para `Livre`.
  - `app/turma/page.jsx` preservou contexto por turma, hooks e refresh com `Promise.allSettled`.
  - `app/conteudo/page.jsx` foi tratado como listagem de programas, sem voltar para lista plana.
- Validação:
  - `npm run build` passou.
  - Auditoria de cores hardcoded nos arquivos tocados passou.

2. `72f44c0` — `fix(finance): separate desktop delete action`
- Escopo:
  - `src/modules/finance/presentation/finance-app-page.jsx`
- Resultado:
  - Corrigido overlap no desktop entre hint/botão de excluir e valor financeiro.
  - Desktop usa botão de lixeira em coluna própria.
  - Mobile preserva swipe delete.
  - A mesma confirmação de exclusão existente foi reaproveitada.
- Validação:
  - `npm run build` passou.
  - `git diff --cached --check` passou.

3. `757ff42` — `style(screens): design sistema fase 3 - jornada e perfil`
- Escopo pedido:
  - somente `app/jornada/page.jsx`
  - somente `app/perfil/page.jsx`
- Resultado:
  - Auditoria prévia confirmou `0` cores hardcoded em ambos.
  - `jornada` já estava alinhada e não precisou de mudança visual adicional.
  - `perfil` teve padding mobile ajustado para `calc(120px + env(safe-area-inset-bottom))`.
- Validação:
  - `npm run build` passou.
  - `git diff --cached --check` passou.
- Status:
  - No momento desta atualização, `main` está `ahead 1` de `origin/main` por causa deste commit local.

### Alterações pendentes no worktree

Relacionadas ao prompt de Fase 3 em `/conteudo`:
- `app/conteudo/page.jsx`
  - padding mobile ajustado para `calc(120px + env(safe-area-inset-bottom))`.
- `components/content/ContentEmpty.jsx`
  - estado vazio ajustado para `padding: 40px 20px`.
  - texto do estado vazio ajustado para `font-size: 14px`.

Não relacionadas ao prompt de Fase 3 visual:
- `app/api/content/route.js`
  - ajustes adicionais de acesso por múltiplas turmas.
- `components/admin/ContentAdminForm.jsx`
  - ajustes de formulário/admin para múltiplas turmas.
- `components/admin/ProgramAdminForm.jsx`
  - placeholder, limite e dica para múltiplas turmas.
- `scripts/migrate-conteudo-multiturma.sql`
  - evolução do script de multiturma para required/user lists.
- `backup.dump`
  - arquivo não rastreado, vazio, não incluir sem pedido explícito.

### Estado técnico consolidado
- `AppHeader.jsx` não foi alterado nas rodadas de Fase 3.
- Forms MAVF (`GanhoForm`, `GratidaoForm`, `IdentidadeForm`) não foram alterados.
- `finance-app-page.jsx` não entrou na Fase 3 visual; a alteração feita nele foi separada e específica para o problema desktop do botão de excluir.
- Próxima fase planejada pelo prompt original: Fase 4 dedicada para `finance-app-page.jsx`.

---

## Atualização 2026-06-13 — Fechamento multiturma, conteudo e push main

### Escopo consolidado nesta entrega
- Acesso multiturma foi alinhado ponta a ponta para aceitar listas separadas por virgula ou ponto-e-virgula tanto no perfil do usuario quanto em `turma_exclusiva`.
- Admin de programas e conteudos agora orienta explicitamente o uso de multiplas turmas e permite entradas maiores.
- Criacao de conteudo herda automaticamente a `turma_exclusiva` do programa selecionado quando o conteudo novo ainda nao tem turma propria.
- `/conteudo` recebeu ajuste final de padding mobile para respeitar melhor a bottom nav.
- `ContentEmpty` recebeu ajuste de densidade visual para o estado vazio.

### Arquivos incluidos no commit desta rodada
- `app/api/content/route.js`
- `app/conteudo/page.jsx`
- `components/admin/ContentAdminForm.jsx`
- `components/admin/ProgramAdminForm.jsx`
- `components/content/ContentEmpty.jsx`
- `scripts/migrate-conteudo-multiturma.sql`
- `CLAUDE_HANDOFF.md`

### Validacao
- `git diff --check` passou.
- `npm run build` passou com Next.js 15.5.15.

### Observacoes
- `backup.dump` permanece nao rastreado, vazio (`0B`) e fora do commit.
- `main` foi usado como branch de trabalho para o commit e push desta entrega.

---

## Atualizacao 2026-06-13 — Programa vitrine com CTA de interesse

### Branch
- Criada a branch `feature/programa-vitrine` a partir de `main`.

### Auditoria previa solicitada no prompt
1. A API `/api/content/programs` buscava programas publicados e nao hidden via Supabase do usuario autenticado; por causa da RLS, programas sem acesso por tier/turma podiam nem chegar ao front.
2. `ProgramCard` recebia `program` e `onClick`.
3. A API ainda nao calculava `locked`; o card so reconhecia `program.locked`/`visibility === 'locked'` se algum payload trouxesse isso.
4. `app/conteudo/page.jsx` nao tratava estado locked; o clique sempre navegava para `/conteudo/{id}`.

### Implementado
- `app/api/content/programs/route.js`
  - adiciona calculo servidor-side de `accessible`, `locked`, `locked_reason`, `access_label` e `interest_cta`.
  - versao final usa `supabase.rpc('get_content_program_catalog')` para montar o catalogo visivel completo, mantendo `requireUser()` para autenticar e calcular acesso do usuario atual.
  - mantem `visibility = hidden` fora da resposta.
  - trata tier, `visibility = locked` e multiturma separada por `,` ou `;`.
  - para programas bloqueados, retorna `total_aulas`, `aulas_concluidas` e `progresso_pct` como `null`, evitando `0/0`.
  - para programas acessiveis, preserva progresso real usando apenas aulas publicadas, nao hidden e acessiveis por tier/turma.
- `components/content/ProgramCard.jsx`
  - renderiza card bloqueado como vitrine: opacidade reduzida, capa em grayscale/brightness, badge de acesso exclusivo e CTA de interesse.
  - remove exibicao de progresso para locked e substitui por `locked_reason` + botao de interesse.
  - card bloqueado continua clicavel e tambem reconhece teclado (`Enter`/espaco).
- `components/content/InterestModal.jsx`
  - novo bottom sheet com titulo do programa, motivo do bloqueio, CTA e link de WhatsApp com mensagem pre-preenchida.
  - usa `NEXT_PUBLIC_WHATSAPP_NUMBER`; se ausente, abre `wa.me` apenas com a mensagem.
- `app/conteudo/page.jsx`
  - integra modal e roteia clique: acessivel navega para o programa, locked abre modal.
- `.env.example`
  - adiciona `NEXT_PUBLIC_WHATSAPP_NUMBER=55XXXXXXXXXXX`.

### Validacao
- `git diff --check` passou.
- `npm run build` passou com Next.js 15.5.15 e 62/62 paginas.

---

## Atualizacao 2026-06-13 — Fechamento programa vitrine para main

### Estado final validado pelo usuario
- Usuario `sza.treinamentos@gmail.com` (`ACELERACAO`, sem turma) passou a ver os programas bloqueados como vitrine, com cadeado/CTA em vez de parecer que nao ha conteudo.
- `Fundamentos Financeiros` continua acessivel com progresso real.
- `Workshop Finanças do Zero` e `Mentoria Maio 2026` aparecem como programas de interesse/bloqueados quando a turma nao bate.

### Commits da entrega na branch `feature/programa-vitrine`
- `f1851c6` — `feat(content): programas bloqueados como vitrine com CTA de interesse`
- `586b996` — `fix(content): lock programs with no accessible lessons`
- `41edd61` — `fix(content): list locked program catalog safely`

### Antes do merge em `main`
- `git diff --check` passou.
- `npm run build` passou com Next.js 15.5.15 e 62/62 paginas.
- Migração `scripts/migrate-conteudo-programa-vitrine-catalog.sql` ja foi aplicada no banco da `.env.local`.
- `backup.dump` permanece nao rastreado, vazio (`0B`) e fora do commit.

---

## Atualizacao 2026-06-13 — Catalogo seguro para vitrines bloqueadas

### Problema reportado
- O usuario `sza.treinamentos@gmail.com` (`ACELERACAO`, sem turma) via apenas `Fundamentos Financeiros`.
- `Workshop Finanças do Zero` e `Mentoria Maio 2026` nao apareciam como vitrine porque a listagem ainda dependia de RLS/service role no runtime.
- No ambiente atual, `SUPABASE_SERVICE_ROLE_KEY` esta configurado como publishable key, entao `getServiceSupabase()` nao bypassava RLS.

### Correcao aplicada
- Criado script:
  - `scripts/migrate-conteudo-programa-vitrine-catalog.sql`
- Criada funcao SQL:
  - `public.get_content_program_catalog()`
- A funcao e `SECURITY DEFINER` e retorna apenas catalogo seguro:
  - dados basicos do programa
  - quantidade de sessoes
  - quantidade de aulas publicadas
  - tiers/turmas exigidos pelas aulas
- A funcao nao retorna `url` das aulas.
- `/api/content/programs` passou a usar `supabase.rpc('get_content_program_catalog')` para listar todos os programas publicados/visiveis.
- A API continua usando RLS normal para buscar as sessoes/aulas realmente acessiveis pelo usuario e calcular progresso.

### Validacao no banco
- Migração aplicada no banco da `.env.local`.
- Notice da migração:
  - `Programa vitrine catalog: programas visiveis = 3`
- Perfil validado:
  - `sza.treinamentos@gmail.com | ACELERACAO | turma vazia`
- Catalogo validado:
  - `Workshop Finanças do Zero` — `LIVRE`, turma `Workshop, Maio 2026`, `1` sessao, `8` aulas
  - `Mentoria Maio 2026` — `MOVIMENTO`, turma `Maio 2026`, `1` sessao, `3` aulas
  - `Fundamentos Financeiros` — `LIVRE`, sem turma, `1` sessao, `2` aulas

### Validacao local
- `git diff --check` passou.
- `npm run build` passou com Next.js 15.5.15 e 62/62 paginas.
- Dev server subiu em `http://localhost:3000`.
- `HEAD /conteudo` respondeu `200 OK`.
- `GET /api/content/programs` sem sessao respondeu `401 Unauthorized`, mantendo autenticacao.

### Limitacoes da validacao
- O Browser in-app (`iab`) nao estava disponivel nesta sessao, entao nao foi possivel fazer inspecao visual/click real no navegador embutido.
- Playwright nao esta instalado no projeto; a verificacao visual automatizada foi limitada a build + resposta HTTP local.
- Validacao autenticada de usuario Workshop/Mentoria depende de sessao real no browser ou token/cookie de teste.

### Observacoes
- Nao foi implementado `POST /api/content/interest`; fica para V2.
- Nao houve alteracao em finance, coins, mavf, auth, AppHeader, BottomNav ou FAB.
- `backup.dump` continua nao rastreado, vazio (`0B`) e fora do escopo.

---

## Atualizacao 2026-06-13 — Correcao vitrine quando aulas ficam bloqueadas por turma

### Problema reportado
- Usuario `sza.treinamentos@gmail.com` nao pertence a nenhuma turma.
- Programas como `Workshop Finanças do Zero` e `Mentoria Maio 2026` apareciam sem cadeado e com `0/0`, porque o programa em si passava por tier/programa, mas as aulas internas eram filtradas por turma/RLS.
- Isso dava a percepcao errada de que o programa nao tinha conteudo.

### Correcao aplicada
- `app/api/content/programs/route.js` agora calcula acesso tambem a partir das aulas autenticadas do usuario.
- Se o programa tem sessao visivel, mas o usuario fica com `0` aulas acessiveis, o programa passa a retornar:
  - `accessible: false`
  - `locked: true`
  - `access_label: 🔒 Acesso exclusivo`
  - `total_aulas: null`
  - `aulas_concluidas: null`
  - `progresso_pct: null`
- Quando a turma bloqueada esta disponivel no catalogo, o motivo usa `Exclusivo da turma {turma}`.
- Quando a turma nao aparece por RLS/service env, o fallback deixa claro: `Exclusivo para alunos de uma turma ativa`.

### Validacao
- `git diff --check` passou.
- `npm run build` passou com Next.js 15.5.15 e 62/62 paginas.
