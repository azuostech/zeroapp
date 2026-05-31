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
