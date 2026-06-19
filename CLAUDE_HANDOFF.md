# CLAUDE Handoff - ZeroApp

Data: 2026-06-19
Branch atual: main
Status funcional: main com copia discreta de previstos do mes anterior, edicao de linhas financeiras, privacidade de valores no resumo financeiro, navegacao SHAMAR/TRIBO mobile corrigida e build validado

## Resumo atual
- Tela `/financas` agora sugere trazer os valores previstos do mes anterior quando o mes atual esta vazio, sem poluir a interface.
- Tela `/financas` agora permite editar o nome/texto de linhas ja inseridas pelo proprio editor da linha, sem excluir e cadastrar novamente.
- Resumo financeiro da home (`/app`) ganhou botao de olhinho para ocultar/mostrar valores, com preferencia salva localmente.
- Telas SHAMAR agora renderizam o topo do app e menu inferior; o aporte da TRIBO tem confirmacao fixa acima do menu e tabuleiro contido em area rolavel no mobile.
- Links diretos para `/conteudo/[id]/[aulaId]` agora caem na autenticacao quando nao ha sessao e retornam ao destino original apos login via `?next=...`.
- O foco mais recente foi SHAMAR: autonomia por modalidade, convites com aceite, gestao admin de jornadas, tabuleiro sequencial, tabuleiro individual tambem na Tribo, gestao de participantes da TRIBO pelo criador/admin, correcoes RLS/leitura da TRIBO e melhoria no encerramento de temporada.
- Ultimo commit publicado antes desta rodada: `6e57711` (`feat(finance): allow line editing and hide summary values`).
- `npm run build` passou apos as mudancas de financas.
- `backup.dump` segue nao rastreado e nao deve entrar em commit sem decisao explicita.

## Atualizacao 2026-06-19 — Financas traz previstos do mes anterior

### Problema observado
- Ao trocar para um novo mes, os valores previstos ficavam zerados.
- O usuario precisava digitar tudo novamente mesmo quando a estrutura e os valores planejados eram iguais ou parecidos com o mes anterior.
- A solucao precisava ajudar sem poluir a tela com muita informacao.

### Correcao
- A tela `/financas` agora verifica, ao carregar um mes, se:
  - o mes atual ainda nao tem valores previstos/realizados;
  - o mes anterior possui algum valor previsto.
- Quando as duas condicoes sao verdadeiras, aparece uma faixa compacta e contextual com `Trazer previstos`.
- Ao aplicar, o app copia o planejamento do mes anterior para o mes atual:
  - preserva nomes, categorias, subcategorias e valores previstos;
  - zera `valor_realizado`;
  - marca todos os itens como pendentes.
- Se o usuario comecar a preencher manualmente, a sugestao some.
- Se o usuario fechar a sugestao no `x`, ela nao aparece novamente naquele mes/navegador.

### Arquivos alterados
- `src/modules/finance/presentation/finance-app-page.jsx`
- `CLAUDE_HANDOFF.md`

### Validacao
- `git diff --check` passou.
- `npm run build` passou.
- Tentativa de validacao visual pelo Browser integrado nao foi possivel porque o `iab` nao estava disponivel nesta sessao.

## Atualizacao 2026-06-19 — Financas com edicao de linhas e privacidade de valores

### Problema observado
- Na tela `/financas`, o usuario nao conseguia alterar o texto/nome de uma linha ja cadastrada.
- Para corrigir um nome, precisava excluir a linha e lancar novamente.
- Na tela principal de resumo financeiro, os valores ficavam sempre expostos; faltava o comportamento de ocultar valores como em app de banco.

### Correcao
- O editor de linha da tela `/financas` ganhou campo `Nome da linha`.
- Linhas simples e subcategorias agora abrem o editor ao tocar/clicar no nome ou no botao de lapis.
- Ao salvar, o nome e validado como obrigatorio e gravado junto com os valores previsto/realizado.
- O card de resumo financeiro da home ganhou botao de olhinho (`Eye`/`EyeOff`) para alternar entre valores visiveis e mascarados.
- A preferencia de ocultar valores fica salva em `localStorage` com a chave `zeroapp:finance-summary-hidden`.

### Arquivos alterados
- `src/modules/finance/presentation/finance-app-page.jsx`
- `components/finance/FinanceSummaryCard.jsx`
- `CLAUDE_HANDOFF.md`

### Validacao
- `git diff --check` passou.
- `npm run build` passou.
- Tentativa de validacao visual pelo Browser integrado nao foi possivel porque o `iab` nao estava disponivel nesta sessao.

## Atualizacao 2026-06-19 — Navegacao e confirmacao fixa no SHAMAR/TRIBO mobile

### Problema observado
- Na tela mobile da TRIBO/aporte, o usuario ficava sem menu superior e inferior visiveis.
- A tela nao deixava claro como voltar para a pagina anterior.
- O tabuleiro completo ocupava a tela inteira e empurrava o botao `Confirmar Aporte` para fora da area visivel, estourando a experiencia mobile.

### Correcao
- `ShamarShell` passou a renderizar o `AppHeader` em todas as telas SHAMAR e reforcou o menu inferior fixo.
- `ShamarShell` ganhou a opcao `hideFab` para telas com acao fixa, evitando conflito visual com a confirmacao.
- A tela `/shamar/aporte/novo`:
  - marca a aba `TRIBO` quando aberta com `?mode=tribo`;
  - limita o tabuleiro a uma area rolavel propria no mobile;
  - fixa a barra de confirmacao acima do menu inferior, com status do valor selecionado.
- A tela `/shamar/tribo` ganhou link de voltar para `/shamar` no cabecalho.
- A tela `/shamar/tabuleiro?mode=tribo` tambem marca a aba `TRIBO` no menu inferior.

### Arquivos alterados
- `components/shamar/ShamarUI.jsx`
- `app/shamar/aporte/novo/page.jsx`
- `app/shamar/tribo/page.jsx`
- `app/shamar/tabuleiro/page.jsx`

### Validacao
- `git diff --check` passou.
- `npm run build` passou.
- Tentativa de validacao visual pelo Browser integrado nao foi possivel porque o `iab` nao estava disponivel nesta sessao.

## Atualizacao 2026-06-19 — Link direto de aula exige autenticacao e volta ao destino

### Problema observado
- Ao compartilhar um link direto como `/conteudo/{programId}/{aulaId}`, usuarios sem sessao viam a tela de aula tentando carregar e exibindo:
  - `Nao foi possivel carregar este programa agora.`
- A API de conteudo ja exigia autenticacao, mas as paginas `/conteudo` nao estavam marcadas como protegidas no middleware.

### Correcao
- `middleware.js` passou a tratar `/conteudo` como area protegida.
- Sem sessao, o middleware redireciona para `/?next=/conteudo/...`, preservando o link original.
- Quando um usuario ativo acessa a raiz com `?next=...`, o middleware agora respeita esse destino seguro antes do fallback para `/app` ou `/admin`.
- A tela de login ja respeitava `next`, entao apos autenticar o usuario volta para a aula compartilhada.

### Arquivos alterados
- `middleware.js`

### Validacao
- `npm run build` passou.
- Teste local sem cookies:
  - `GET /conteudo/d87d9ab6-0f39-4e0a-9378-9322d2f99f94/0e6aa8a9-693b-4bb7-86d2-5278359b3906` respondeu `307` para `/?next=/conteudo/...`.
  - `GET /?next=/conteudo/...` respondeu `200` carregando a autenticacao.
- `npm run lint` nao validou porque `next lint` abriu o prompt interativo de configuracao do ESLint.

## Atualizacao 2026-06-17 — Edicao completa no gerenciador de programas

### Problema observado
- Em `/admin/conteudo/programas`, o botao `Editar` apenas abria um prompt para trocar o titulo.
- Isso impedia editar campos importantes do programa pela tela de gestao:
  - status/publicacao;
  - imagem/capa;
  - tier de acesso;
  - turma exclusiva;
  - visibilidade;
  - ordem;
  - descricao.

### Correcao
- `ProgramAdminForm` agora tambem funciona em modo edicao, carregando dados do programa existente e enviando `PATCH /api/admin/programs/[id]`.
- A tela `/admin/conteudo/programas` abre um painel de edicao completo ao clicar em `Editar`.
- Apos salvar, a lista recarrega e exibe feedback `Programa atualizado.`.
- O fluxo de criacao em `/admin/conteudo/programas/novo` foi preservado usando o mesmo formulario em modo criacao.

### Arquivos alterados
- `components/admin/ProgramAdminForm.jsx`
- `app/admin/conteudo/programas/page.jsx`

### Validacao
- `git diff --check` passou.
- `npm run build` passou.

## Atualizacao 2026-06-17 — Encerramento SHAMAR idempotente e liberacao de nova jornada

### Problema observado
- Ao encerrar uma temporada, a tela podia ficar presa no formulario exibindo:
  - `temporada_nao_ativa`
- Isso acontecia quando a temporada ja tinha sido encerrada/alterada e a tela tentava finalizar novamente.

### Correcao
- `POST /api/shamar/seasons/[id]/complete` ficou idempotente:
  - se a temporada ja nao esta ativa, responde `already_closed: true` em vez de erro tecnico.
  - usa `getShamarWriterSupabase(context.supabase)` para funcionar com ou sem service role real.
  - cancela convites pendentes criados pelo usuario naquela config ao encerrar.
- `/shamar/encerramento`:
  - ao concluir ou detectar temporada ja encerrada, sai da tela de encerramento.
  - redireciona para a modalidade correta:
    - Individual: `/shamar/individual`
    - Dupla: `/shamar/dupla`
    - Tribo: `/shamar/tribo`
  - a modalidade recarrega sem temporada ativa e libera o botao de criar novo SHAMAR.
- Telas de Individual, Dupla e Tribo mostram aviso amigavel quando voltam do encerramento:
  - temporada encerrada;
  - nova criacao liberada.

### Arquivos alterados
- `app/api/shamar/seasons/[id]/complete/route.js`
- `app/shamar/encerramento/page.jsx`
- `components/shamar/ShamarDashboard.jsx`
- `app/shamar/nos/page.jsx`
- `app/shamar/tribo/page.jsx`

### Validacao
- `git diff --check` passou.
- `npm run build` passou.

## Atualizacao 2026-06-17 — Convites pendentes/participantes da TRIBO nao apareciam

### Problema observado
- Criador enviava convites por email na tela `Gerenciar TRIBO`, mas a interface mostrava:
  - `Nenhum participante ativo.`
  - `Nenhum convite pendente.`

### Causa
- Os convites existiam no banco. A TRIBO `SHAMAR Tribo · Turma Maio 2026` tinha:
  - 1 temporada ativa;
  - 3 convites pendentes.
- A rota `GET /api/shamar/tribo` usava `getServiceSupabase()` diretamente para montar participantes, ranking e convites.
- No ambiente atual, `SUPABASE_SERVICE_ROLE_KEY` esta com chave publishable, entao esse client nao tem service role real e lia como anonimo, retornando listas vazias sob RLS.
- Alem disso, `profiles` so permitia leitura do proprio perfil ou admin; isso poderia impedir nome/email basico de participantes.

### Correcao
- `app/api/shamar/tribo/route.js` passou a usar `getShamarWriterSupabase(context.supabase)` na leitura agregada:
  - usa service role apenas se a chave for realmente valida;
  - caso contrario usa a sessao autenticada e as policies RLS corrigidas.
- Novo SQL aplicado:
  - `scripts/migrate-shamar-shared-profile-rls.sql`
- Criada funcao/policy:
  - `shamar_can_read_profile(uuid)`
  - `profiles_shamar_shared_select`
- A policy permite ler perfil basico apenas de participantes da mesma jornada SHAMAR, quando o usuario e criador ou participante daquela config.

### Validacao
- `pg_policies` confirmou `profiles_shamar_shared_select`.
- Smoke test como criador `sza.treinamentos@gmail.com` confirmou visibilidade de:
  - 1 participante ativo;
  - 3 convites pendentes;
  - 1 profile de participante.
- `npm run build` passou.

## Atualizacao 2026-06-17 — Correcao de recursao em policies SHAMAR

### Problema observado
- Ao abrir SHAMAR, a tela mostrava:
  - `infinite recursion detected in policy for relation "shamar_seasons"`

### Causa
- A migracao self-service criou policies que formavam ciclo:
  - `shamar_seasons` consultava `shamar_tribo_configs`
  - `shamar_tribo_configs` consultava `shamar_seasons`
- Isso fazia o Postgres entrar em recursao durante SELECT em `shamar_seasons`.

### Correcao aplicada no Supabase
- Novo script aplicado:
  - `scripts/migrate-shamar-rls-recursion-fix.sql`
- Foram criadas funcoes `SECURITY DEFINER` para quebrar a recursao:
  - `shamar_is_config_creator(uuid)`
  - `shamar_is_config_participant(uuid)`
  - `shamar_has_pending_invite(uuid)`
  - `shamar_can_join_self_service_config(uuid)`
- Policies recriadas para usar essas funcoes em vez de subqueries circulares.

### Validacao
- `pg_policies` conferido: as policies novas apontam para funcoes e nao para subqueries circulares diretas.
- Smoke test como role `authenticated`:
  - SELECT em `shamar_seasons` nao dispara mais recursao.
  - Criacao self-service transacional com INSERT separado em config, board, season e index passou com `ROLLBACK`.
- `scripts/migrate-shamar-self-service-rls.sql` tambem foi ajustado para nao reintroduzir a recursao se rodado novamente.

## Atualizacao 2026-06-17 — Correcao RLS na criacao self-service SHAMAR

### Problema observado
- Usuarios tentando criar SHAMAR Individual em `/shamar/criar` viam:
  - `Sem permissao para acessar dados SHAMAR. Verifique autenticacao e policies RLS.`

### Causa
- A criacao self-service insere:
  - `shamar_tribo_configs`
  - `shamar_board_squares`
  - `shamar_seasons`
  - registro inicial em `shamar_index_history`
- Quando `SUPABASE_SERVICE_ROLE_KEY` nao e uma service role valida, a API usa o client autenticado.
- As policies antigas nao permitiam que usuario comum criasse a propria config/tabuleiro, nem que participante por convite lesse config self-service fora da regra de turma.

### Correcao aplicada no Supabase
- Novo script aplicado com sucesso:
  - `scripts/migrate-shamar-self-service-rls.sql`
- Policies criadas:
  - `shamar_config_self_service_insert`
  - `shamar_config_self_service_select`
  - `shamar_board_self_service_insert`
  - `shamar_board_self_service_select`
  - `shamar_seasons_self_service_insert`
  - `shamar_idx_self_insert`
  - `shamar_idx_self_update`
- Validacao feita via `pg_policies`: as 7 policies apareceram nas tabelas esperadas.

### Observacao
- A correcao no banco tem efeito imediato; nao depende de redeploy.
- Ainda e recomendavel configurar uma service role real no ambiente do Vercel para rotas administrativas e rotinas internas.

## Atualizacao 2026-06-17 — Gestao de participantes da TRIBO

### Objetivo
Permitir que o criador responsavel pela TRIBO gerencie a propria jornada coletiva e que o administrador tenha a mesma gestao na tela de edicao da jornada SHAMAR.

### O que foi implementado
1. API de gestao da TRIBO
- `app/api/shamar/tribo/route.js` agora aceita:
  - `POST` com `action=invite` para adicionar novos convites por email.
  - `PATCH` para editar o nome/turma da TRIBO.
  - `DELETE` com `action=remove_participant` para remover participante ativo preservando historico (`status='abandoned'`).
  - `DELETE` com `action=cancel_invite` para cancelar convite pendente.
  - `DELETE` com `action=close_tribe` para encerrar a TRIBO, abandonar temporadas ativas e cancelar convites pendentes.
- O criador (`shamar_tribo_configs.created_by`) e admins podem gerenciar.
- Remocao do criador como participante individual fica bloqueada; para isso existe encerramento da TRIBO.
- Convites novos continuam usando o template elegante de convite SHAMAR e registram `accept_url`/status de envio.

2. Tela do criador em `/shamar/tribo`
- Card `Gerenciar TRIBO` aparece apenas para quem pode gerenciar.
- Acoes disponiveis:
  - editar nome da TRIBO;
  - adicionar participantes por email;
  - remover participantes nao criadores;
  - reenviar email de convite;
  - copiar link direto de aceite;
  - cancelar convite pendente;
  - encerrar TRIBO.
- Ao encerrar, a tela redireciona para `/shamar` para evitar manter a pessoa em uma jornada finalizada.

3. Admin em `/admin/shamar`
- A listagem de jornadas agora enriquece jornadas `tribo` com:
  - participantes ativos da config;
  - convites pendentes da config.
- Dentro da edicao de uma jornada TRIBO, o admin pode:
  - adicionar participantes por email;
  - remover participantes nao criadores;
  - reenviar convite;
  - copiar link direto;
  - cancelar convite pendente.

4. Migração RLS
- Novo script: `scripts/migrate-shamar-tribo-management-rls.sql`.
- Policies adicionadas para o criador conseguir:
  - ler/editar a propria `shamar_tribo_configs`;
  - ler/inserir/atualizar `shamar_invites` da propria TRIBO;
  - ler/atualizar `shamar_seasons` vinculadas a propria TRIBO.
- Executar este script no Supabase SQL Editor se a API estiver usando client autenticado sem service role valida.

### Arquivos alterados
- `app/api/shamar/tribo/route.js`
- `app/shamar/tribo/page.jsx`
- `app/api/admin/shamar/journeys/route.js`
- `app/admin/shamar/page.jsx`
- `scripts/migrate-shamar-tribo-management-rls.sql`
- `CLAUDE_HANDOFF.md`

### Validacao
- `git diff --check` passou.
- `npm run build` passou.
- Tentativa de browser interno nao foi possivel porque `iab` estava indisponivel.
- Dev server subiu em `3001` com permissao, mas o ambiente nao conseguiu conectar via loopback; a validacao objetiva ficou pela build de producao.

## Historico anterior — Home Hub + Navegacao v2 + Perfil Dedicado

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

---

## Atualizacao 2026-06-13 — Redesign completo Light Mode v2

### Pedido / prompt
- Prompt implementado:
  - `/Users/jacksonsouza/Library/CloudStorage/GoogleDrive-jksouza@gmail.com/My Drive/Projetos/Mentoria Financeira/Lives Financeiras Diarias/Projetos das Mentorias/ZeroApp/prompts/NovoDesign_Vrs5/codex-light-mode-completo.md`
- Branch criada a partir de `main`:
  - `feature/light-mode`

### Commits da entrega
- `7273736` — `style(theme): design system light mode - tokens e utilitarios - fase A`
- `dfa5448` — `style(components): layout e componentes principais light mode - fase B`
- `036b533` — `style(screens): todas as telas light mode - fase C`
- `cb4f475` — `style(components): componentes internos light mode - fase D`

### Implementado
- `styles/theme.css`
  - substituido por tokens Light Mode v2 em verde/branco/cinza suave.
  - mantidos aliases legados (`--bg2`, `--bg3`, `--bg-deep`, `--text-2`, `--border-2`, etc.) para nao quebrar telas existentes.
  - adicionados aliases usados por Admin/Financeiro (`--line-soft`, `--hover-soft`, `--theme-pill*`, `--overlay`, etc.).
- Layout principal
  - `AppHeader` verde com texto branco, chips/avatars translucidos e progresso em branco.
  - `BottomNav`, `BottomNavHub`, `FAB`, `JacksonAIModal` e `FinanceSummaryCard` ajustados para light mode.
  - `ThemeAssetSync` e leituras de tema antigo passaram a forcar `light`, evitando que `zeroapp-theme=dark` antigo reactive o escuro.
- Telas
  - Home, Jornada, Conteudo, Detalhe de programa, Player, Resumo, Login, Reset Password, Admin Email, Admin MAVF, MAVF Historico e Financeiro ajustados para fundo claro, cards brancos e acentos verdes.
  - Financeiro removeu overrides locais escuros de `:root` e manteve o player/embed preto apenas onde faz sentido.
  - Email base template tambem foi clareado para evitar contraste de marca antigo em envios.
- Componentes internos
  - Cards MAVF (`GanhosCard`, `GratidaoCard`, `IdentidadeCard`) ficaram brancos com borda lateral colorida e titulo em texto principal.
  - Comunidade (`FeedEventCard`, `DesafioCard`, `CommunityStats`) ajustada para cards brancos, numeros verdes e desafio em `green-dim`.
  - Conteudo (`AulaItem`, `CommentsSection`, `CommentItem`) ajustado para cards claros, avatars verdes e badges claros.
  - Financeiro (`SwipeableItem`, `ItemRow`) ajustado para sheets brancas, inputs claros e delete vermelho.
  - Toasts agora usam tokens do tema.

### Validacao
- `git diff --check` passou.
- `rg '#0a0a0a|#1a1a1a|#2a2a2a|#f0f0f0|setTheme\\('dark'\\)|Escuro|color-scheme: dark' app src components styles/theme.css` sem ocorrencias.
- `npm run build` passou apos a Fase C com Next.js 15.5.15 e 62/62 paginas.
- `npm run build` passou novamente apos a Fase D com Next.js 15.5.15 e 62/62 paginas.
- Dev server subiu em `http://localhost:3001` porque a porta `3000` estava ocupada.
- `HEAD /conteudo` respondeu `200 OK`.
- `HEAD /auth/reset-password` respondeu `200 OK`.
- `HEAD /app` respondeu `307 Temporary Redirect` sem sessao autenticada, comportamento esperado.

### Observacoes
- Nao houve alteracao intencional de API, hooks, schema ou banco; as mudancas foram visuais/tema.
- `backup.dump` permanece nao rastreado e fora dos commits.
- O Browser in-app (`iab`) nao estava disponivel nesta sessao; a validacao visual ficou limitada a build, grep e HTTP local.

---

## Atualizacao 2026-06-13 — Painel Admin de Emails com tracking

### Pedido / prompt
- Prompt implementado:
  - `/Users/jacksonsouza/Library/CloudStorage/GoogleDrive-jksouza@gmail.com/My Drive/Projetos/Mentoria Financeira/Lives Financeiras Diarias/Projetos das Mentorias/ZeroApp/prompts/NovoDesign_Vrs5/codex-admin-email-panel.md`
- Branch de trabalho:
  - `feature/admin-email-panel`
- Observacao de base:
  - A branch foi criada a partir de `feature/light-mode`, pois o prompt depende do light mode.

### Auditoria inicial
- `email_logs` antes da migracao tinha:
  - `id`, `user_id`, `email_type`, `recipient`, `subject`, `resend_id`, `status`, `sent_at`.
- Policy existente:
  - `email_logs_admin` (`ALL`).
- Templates existentes em `src/lib/email/templates/`:
  - `base-template.js`, `monthly-report.js`, `phase-milestone.js`, `reconnect.js`.
- Nao havia pasta `app/api/webhooks`.
- Nao foi encontrada configuracao local de webhook Resend ja implementada no codigo.

### Implementado
- SQL:
  - criado `scripts/migrate-email-logs-tracking.sql`.
  - adiciona `created_at`, `opened_at`, `clicked_at`, `open_count`, `click_count`, `last_event_at`, `email_snapshot`.
  - cria indices `idx_email_logs_user_created`, `idx_email_logs_type`, `idx_email_logs_status_created`, `idx_email_logs_resend_id`.
  - preserva/garante RLS admin.
- Banco:
  - migracao aplicada no Supabase da `.env.local`.
  - schema validado com 15 colunas em `email_logs`.
- Email service:
  - `sendEmail` agora aceita `emailSnapshot`.
  - envio mensal gera snapshot via `src/lib/email/email-snapshot.js`.
  - `coletarDadosUsuario` passou a retornar `financeiro.blocos` para snapshot.
- Webhook:
  - criado `POST /api/webhooks/resend`.
  - exige headers `svix-id` e `svix-signature`.
  - processa `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`.
  - atualiza status, contadores e `last_event_at` por `resend_id`.
- APIs admin:
  - `GET /api/admin/email-logs` com filtros por `user_id`, `email_type`, `status`, `month`, `search`, `page`, `limit`.
  - `GET /api/admin/email-logs/[id]` retorna log completo com snapshot.
  - `GET /api/admin/email-logs/stats` retorna totais, taxas e agrupamentos.
- Frontend:
  - criado `/admin/emails` com metric cards, filtros, tabela e modal de snapshot/JSON.
  - criado `/admin/emails/aluno/[userId]` com resumo e timeline de contatos.
  - criados componentes:
    - `EmailLogRow`
    - `EmailSnapshotModal`
    - `ContactTimeline`
  - menu do admin ganhou link `Emails`.

### Validacao
- `git diff --check` passou.
- `npm run build` passou com Next.js 15.5.15 e 66/66 paginas.
- Dev server subiu em `http://localhost:3001` porque `3000` estava ocupada.
- `HEAD /admin/emails` respondeu `307 Temporary Redirect` sem sessao autenticada, esperado.
- `GET /api/admin/email-logs?limit=1` sem sessao respondeu `401 Unauthorized`, esperado.
- `POST /api/webhooks/resend` sem headers respondeu `401 Unauthorized`.
- `POST /api/webhooks/resend` com headers fake e `email_id` inexistente respondeu `200 OK`.

### Pendencias operacionais
- Configurar no Resend Dashboard:
  - URL: `https://zeroapp.tech/api/webhooks/resend`
  - eventos: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`.
- Para validar visualmente a tabela real, entrar como admin no browser e abrir `/admin/emails`.

### Limitacoes da validacao
- O Browser in-app (`iab`) nao estava disponivel nesta sessao, entao nao houve inspecao visual autenticada.
- Nao foi inserido log fake no banco para testar incremento real de `open_count`; o webhook foi validado sem side effect em dado real.
- A assinatura Svix/Resend esta validada por presenca dos headers, conforme prompt; verificacao criptografica completa nao foi adicionada.

### Observacoes
- Nao houve reenvio de emails.
- Nao foi salvo HTML completo, apenas snapshot JSON dos dados.
- `backup.dump` permanece nao rastreado e fora dos commits.

---

## Atualizacao 2026-06-16 — SHAMAR Etapas A-D

### Pedido / prompts
Foram executados os prompts da trilha SHAMAR:
- `codex-shamar-etapa-a-sql.md`
- `codex-shamar-etapa-b-apis.md`
- `codex-shamar-etapa-c-frontend.md`
- `codex-shamar-etapa-d-admin.md`

Branch de trabalho:
- `feature/shamar`

Commits criados:
- `7cc2de2` — `feat(shamar): SQL etapa A - 11 tabelas, RLS, funcoes, seeds - shamar`
- `bbf5b18` — `feat(shamar): algoritmo tabuleiro e APIs core - etapa B`
- `57a732c` — `feat(shamar): frontend completo - EU, tabuleiro, aporte, missoes, tribo, nos - etapa C`
- `f09dddb` — `feat(shamar): admin e encerramento de temporada - etapa D`

### Estado de banco e seguranca
- A Etapa A gerou o SQL base em `scripts/migrate-shamar-etapa-a.sql`.
- Em 2026-06-16, o SQL da Etapa A foi aplicado no Supabase da `.env.local` apos backup e dry-run transacional com `ROLLBACK`.
- Backup antes da aplicacao:
  - `backup_zeroapp.sql`
  - `backups/backup_zeroapp_20260616_002700.sql`
- Resultado aplicado:
  - 12 tabelas SHAMAR em `public`
  - coluna `profiles.shamar_unlocked`
  - bucket privado `shamar-provas`
  - 8 missoes globais
  - 31 policies SHAMAR/storage
  - 4 funcoes auxiliares
- Para a seed `Maio 2026`, foi inserido tabuleiro operacional:
  - 159 quadrinhos
  - soma `125000`
  - 100 pequenos, 50 medios, 8 grandes, 1 epico
- As 8 missoes globais foram ativadas para a turma seed `Maio 2026`.
- Em 2026-06-16, o SQL da Etapa D `scripts/migrate-shamar-etapa-d-feed-events.sql` tambem foi aplicado no Supabase da `.env.local` apos auditoria dos tipos existentes e dry-run transacional com `ROLLBACK`.
- A constraint `feed_events_event_type_check` agora aceita os eventos SHAMAR:
  - `shamar_aporte_registered`
  - `shamar_identity_up`
  - `shamar_season_completed`
  - `shamar_streak_7`
  - `shamar_streak_30`
  - `shamar_mission_completed`
- `backup.dump` permanece nao rastreado e fora dos commits.

### Etapa A — SQL base SHAMAR
Arquivo criado:
- `scripts/migrate-shamar-etapa-a.sql`

O script prepara:
- coluna `profiles.shamar_unlocked`
- bucket privado `shamar-provas`
- funcoes auxiliares:
  - `public.is_admin()`
  - `public.profile_has_turma(...)`
  - `public.shamar_profile_can_access_turma(...)`
  - `public.award_shamar_points(...)`
- tabelas SHAMAR:
  - `shamar_tribo_configs`
  - `shamar_board_squares`
  - `shamar_seasons`
  - `shamar_contributions`
  - `shamar_marked_squares`
  - `shamar_partnerships`
  - `shamar_missions`
  - `shamar_turma_missions`
  - `shamar_mission_completions`
  - `shamar_points_balance`
  - `shamar_points_transactions`
  - `shamar_index_history`
- RLS e policies para usuario/admin.
- Seeds de missoes globais.
- Seed de config inicial `Maio 2026`.

### Etapa B — Core APIs e algoritmo
Arquivos principais criados:
- `src/lib/shamar/board-generator.js`
- `src/lib/shamar/api.js`
- `src/lib/shamar/awards.js`
- `src/lib/shamar/index-calculator.js`
- `app/api/admin/shamar/board/route.js`
- `app/api/shamar/seasons/route.js`
- `app/api/shamar/board/route.js`
- `app/api/shamar/contributions/route.js`
- `app/api/shamar/index/route.js`
- `app/api/shamar/proof-upload/route.js`

Implementado:
- gerador de tabuleiro por meta total, com categorias `pequeno`, `medio`, `grande`, `epico`.
- validacao de soma do tabuleiro contra `meta_total`.
- helpers de autenticacao/normalizacao/erro para SHAMAR.
- APIs para iniciar temporada, ler progresso, carregar tabuleiro, registrar aporte, upload de comprovante e calcular indice.
- premios seguros:
  - ZeroCoins via `award_coins`
  - Pontos SHAMAR via `award_shamar_points`
- calculo e persistencia do Indice SHAMAR:
  - constancia
  - evolucao
  - patrimonio
  - participacao
  - identidade (`guardiao`, `construtor`, `cultivador`, `multiplicador`, `legado`)

### Etapa C — Frontend SHAMAR
Arquivos principais criados/alterados:
- `app/shamar/page.jsx`
- `app/shamar/tabuleiro/page.jsx`
- `app/shamar/aporte/novo/page.jsx`
- `app/shamar/missoes/page.jsx`
- `app/shamar/tribo/page.jsx`
- `app/shamar/nos/page.jsx`
- `components/shamar/ShamarUI.jsx`
- `hooks/useShamar.js`
- `hooks/useShamarBoard.js`
- `hooks/useShamarMissions.js`
- `src/lib/shamar/formatters.js`
- `app/api/shamar/missions/route.js`
- `app/api/shamar/tribo/route.js`
- `app/api/shamar/nos/route.js`
- `app/api/shamar/sessions/route.js`
- `styles/theme.css`
- `app/app/page.js`

Implementado:
- Hub `/shamar` com resumo da temporada, indice, progresso, tabuleiro preview e aportes recentes.
- `/shamar/tabuleiro` com grade completa.
- `/shamar/aporte/novo` com selecao de quadrinhos, upload/uso de comprovante e registro do aporte.
- `/shamar/missoes` com missoes ativas, progresso e pontos.
- `/shamar/tribo` com ranking/visao da turma.
- `/shamar/nos` com experiencia de parceria.
- Estado bloqueado quando `profiles.shamar_unlocked=false`.
- Card SHAMAR na Home (`/app`) quando a API indica acesso/temporada, sem alterar o select global de perfil.
- Tokens visuais SHAMAR adicionados ao tema.

### Etapa D — Admin, encerramento, cron e feed
Arquivos principais criados/alterados:
- `app/admin/shamar/page.jsx`
- `app/admin/shamar/missoes/[triboConfigId]/page.jsx`
- `app/admin/shamar/comprovantes/page.jsx`
- `app/api/admin/shamar/configs/route.js`
- `app/api/admin/shamar/missions/[triboConfigId]/route.js`
- `app/api/admin/shamar/contributions/route.js`
- `app/api/admin/shamar/contributions/[id]/verify/route.js`
- `app/api/admin/users/[id]/shamar/route.js`
- `app/api/shamar/seasons/[id]/complete/route.js`
- `app/api/cron/shamar-index/route.js`
- `app/shamar/encerramento/page.jsx`
- `app/shamar/page.jsx`
- `app/jornada/page.jsx`
- `components/community/FeedEventCard.jsx`
- `src/modules/admin/presentation/admin-page.jsx`
- `vercel.json`
- `scripts/migrate-shamar-etapa-d-feed-events.sql`

Implementado:
- Admin SHAMAR em `/admin/shamar`:
  - lista de temporadas/configuracoes por turma
  - formulario para criar temporada/config
  - geracao automatica do tabuleiro ao criar config
  - preview de distribuicao
  - visualizacao de tabuleiro
  - ativar/encerrar config para novas entradas
- Admin de missoes:
  - `/admin/shamar/missoes/[triboConfigId]`
  - lista missoes globais
  - ativa/desativa por turma
  - edita `due_date` e `custom_points`
- Admin de comprovantes:
  - `/admin/shamar/comprovantes`
  - lista aportes com `proof_verified=false`
  - gera signed URL do bucket `shamar-provas`
  - valida/rejeita comprovante via PATCH
  - ao validar, publica evento `shamar_aporte_registered` no feed
- Toggle SHAMAR no admin atual de usuarios:
  - botao `SHAMAR ON/OFF`
  - endpoint `PATCH /api/admin/users/[id]/shamar`
  - altera apenas `profiles.shamar_unlocked`
- Encerramento de temporada:
  - pagina `/shamar/encerramento`
  - API `POST /api/shamar/seasons/[id]/complete`
  - grava `patrimonio_final`, `status=completed`, `ended_at`
  - recalcula indice
  - concede `+500` ZeroCoins (`shamar_season_complete`)
  - concede `+500` Pontos SHAMAR (`season_complete`)
  - completa missao `season_closing` quando ativa
  - publica evento `shamar_season_completed` no feed
- Cron:
  - `GET/POST /api/cron/shamar-index`
  - protegido por `Authorization: Bearer ${CRON_SECRET}`
  - recalcula indices de temporadas ativas
  - `vercel.json` recebeu cron diario `0 6 * * *`
- Feed:
  - `FeedEventCard` reconhece eventos SHAMAR:
    - `shamar_aporte_registered`
    - `shamar_identity_up`
    - `shamar_season_completed`
    - `shamar_streak_7`
    - `shamar_streak_30`
    - `shamar_mission_completed`
    - fallback para `shamar_*`
- Jornada:
  - `/jornada` mostra bloco SHAMAR quando existe temporada ativa e desbloqueada.
  - Se a API SHAMAR falhar por falta de migracao/banco, a Jornada continua funcionando sem bloco.

### Validacao realizada
- `npm run build` passou apos a Etapa B.
- `npm run build` passou apos a Etapa C.
- `npm run build` passou apos a Etapa D com Next.js 15.5.15 e 88/88 paginas.
- Em 2026-06-16, apos aplicar o SQL da Etapa A:
  - dry-run com `ROLLBACK` passou sem erro.
  - aplicacao real finalizou com `COMMIT`.
  - verificacao final confirmou `Maio 2026` com 159 quadrinhos, soma igual a meta e 8 missoes ativas.
  - `npm run build` passou novamente com Next.js 15.5.15 e 88/88 paginas.
- Em 2026-06-16, apos aplicar o SQL da Etapa D:
  - auditoria confirmou que os tipos existentes no feed (`gain_grande`, `gain_registered`, `identity_registered`) estavam todos contemplados na lista nova.
  - dry-run com `ROLLBACK` passou sem erro.
  - aplicacao real finalizou com `COMMIT`.
  - smoke test transacional inseriu e aceitou os 6 tipos SHAMAR novos e fez `ROLLBACK`.
  - verificacao final confirmou `0` linhas de smoke persistidas.
- Dev server local foi iniciado em `http://127.0.0.1:3010` para smoke test da Etapa D.
- Probes HTTP:
  - `GET /admin/shamar` sem sessao -> `307 Temporary Redirect`, esperado.
  - `GET /admin/shamar/comprovantes` sem sessao -> `307 Temporary Redirect`, esperado.
  - `GET /shamar/encerramento` -> `200 OK`.
  - `GET /api/cron/shamar-index` sem `CRON_SECRET` -> `401 Unauthorized`.
- Dev server foi encerrado ao final.
- `git diff --check` passou antes do commit da Etapa D.

### Limitacoes da validacao
- O Browser in-app (`iab`) nao estava disponivel nesta sessao; nao houve inspecao visual autenticada/click real.
- Em `.env.local`, a `SUPABASE_SERVICE_ROLE_KEY` foi detectada como `publishable`, nao `service_role`; rotas admin/cron que dependem de service role real podem falhar por RLS ate a chave correta ser configurada no ambiente.
- A persistencia de `rejection_reason` nao foi adicionada ao schema; a rejeicao registra auditoria com metadata, mas a tabela `shamar_contributions` segue sem coluna dedicada para motivo.

### Correcao 2026-06-16 — Admin SHAMAR com service key publishable
- Problema observado:
  - `/admin/shamar` mostrava `Sem permissao para acessar dados SHAMAR. Verifique autenticacao e policies RLS.` ao carregar/criar temporada.
- Causa:
  - `.env.local` tinha `SUPABASE_SERVICE_ROLE_KEY` no formato `sb_publishable_...`.
  - As rotas admin SHAMAR tentavam usar esse client como writer/service, mas ele nao tinha sessao nem bypass de RLS.
- Correcao aplicada:
  - `src/lib/shamar/api.js` ganhou `hasUsableServiceRoleKey()` e `getShamarWriterSupabase(fallbackSupabase)`.
  - Rotas admin SHAMAR passaram a usar service role somente quando a chave e realmente `service_role`/`sb_secret_`.
  - Quando a chave local e publishable, as rotas usam o Supabase autenticado do admin (`context.supabase`), que passa pelas policies RLS admin.
- Arquivos alterados:
  - `src/lib/shamar/api.js`
  - `app/api/admin/shamar/configs/route.js`
  - `app/api/admin/shamar/missions/[triboConfigId]/route.js`
  - `app/api/admin/shamar/contributions/route.js`
  - `app/api/admin/shamar/contributions/[id]/verify/route.js`
  - `app/api/admin/users/[id]/shamar/route.js`
- Validacao:
  - `npm run build` passou com Next.js 15.5.15 e 88/88 paginas.

### Pendencias operacionais antes de homologar SHAMAR em producao
- Configurar `SUPABASE_SERVICE_ROLE_KEY` real no ambiente; em `.env.local` ela foi detectada como publishable key.
- Configurar `CRON_SECRET` no ambiente da Vercel antes do cron rodar.
- Entrar como admin e validar visualmente:
  - `/admin/shamar`
  - `/admin/shamar/comprovantes`
  - `/admin/shamar/missoes/[triboConfigId]`
  - toggle SHAMAR no painel de usuarios
- Entrar como usuario liberado e validar:
  - `/shamar`
  - `/shamar/tabuleiro`
  - `/shamar/aporte/novo`
  - `/shamar/missoes`
  - `/shamar/tribo`
  - `/shamar/nos`
  - `/shamar/encerramento`

---

## Atualizacao 2026-06-17 — SHAMAR autonomia, convites e gestao admin

### Estado atual do repo
- Branch atual: `main`.
- HEAD publicado: `f438abe` (`feat(shamar): envia email ao registrar aporte`).
- `origin/main` esta sincronizado com `main`.
- Working tree sem diff rastreado apos o push; existe apenas `backup.dump` nao rastreado e fora dos commits.
- O Browser in-app (`iab`) nao estava disponivel nesta sessao; validacao visual autenticada ficou pendente.

### Commits publicados na main
- `7cc2de2` — `feat(shamar): SQL etapa A - 11 tabelas, RLS, funcoes, seeds - shamar`
- `bbf5b18` — `feat(shamar): algoritmo tabuleiro e APIs core - etapa B`
- `57a732c` — `feat(shamar): frontend completo - EU, tabuleiro, aporte, missoes, tribo, nos - etapa C`
- `f09dddb` — `feat(shamar): admin e encerramento de temporada - etapa D`
- `7fd0c87` — `fix(shamar): usar sessao admin quando service key nao for service role`
- `874aa11` — `feat(shamar): habilita jornadas autonomas e gestao admin`
- `96adb61` — `fix(shamar): exibe tabuleiro individual na tribo`
- `28186c6` — `docs: atualiza handoff shamar`
- `f438abe` — `feat(shamar): envia email ao registrar aporte`

### Decisoes de produto consolidadas
- SHAMAR deixou de depender do 3o encontro; o mentor/admin nao precisa liberar por nivel para uso geral.
- Cada usuario pode criar suas proprias modalidades:
  - SHAMAR Individual
  - SHAMAR Dupla
  - SHAMAR Tribo
- Regra de unicidade:
  - o usuario pode ter no maximo 1 SHAMAR ativo por categoria.
  - para iniciar outro na mesma categoria, precisa encerrar o atual.
- Dupla sempre tem 2 participantes.
- Tribo tem 3 ou mais participantes.
- Em Dupla/Tribo, cada participante tem o proprio tabuleiro e controla seus proprios quadrinhos; o grupo apenas soma resultados para comparativo/meta coletiva.
- Convites por e-mail exigem aceite:
  - convidado recebe link.
  - se nao tiver cadastro, precisa criar conta no ZeroApp.
  - depois de aceito, aparece o SHAMAR correspondente para o convidado.

### Tabuleiro e meta
- A regra de quadrinhos foi simplificada para sequencial:
  - quadrinho 1 vale R$ 1
  - quadrinho 2 vale R$ 2
  - quadrinho N vale R$ N
- A meta total e ajustada para bater exatamente com a soma sequencial dos quadrinhos.
- Implementacao principal:
  - `src/lib/shamar/board-generator.js`
  - `getSequentialSquareCount`
  - `getSequentialMetaTotal`
  - `generateBoard`
- A tela admin de nova temporada tambem mostra a meta sequencial ajustada.

### Experiencia do aluno
- `/shamar` virou hub de modalidades, com cards separados para Individual, Dupla e Tribo.
- `/shamar/criar` separa criacao da visualizacao de SHAMARs existentes.
- `/shamar/individual` usa `ShamarDashboard` com tabuleiro, aporte, encerramento e aportes recentes.
- `/shamar/dupla` aponta para a experiencia da dupla.
- `/shamar/nos` mostra comparativo da dupla, estado de convite pendente, reenviar convite e copiar link.
- `/shamar/tribo` mostra:
  - meta coletiva da tribo.
  - ranking de constancia.
  - feed da tribo.
  - card `Meu tabuleiro na TRIBO`, com:
    - resumo do patrimonio individual.
    - quadrinhos individuais.
    - preview do tabuleiro individual.
    - botao `Registrar Aporte`.
    - botao `Abrir Tabuleiro`.
- `/shamar/tabuleiro?mode=tribo` abre o tabuleiro individual do usuario dentro da modalidade Tribo.
- `/shamar/aporte/novo?mode=tribo` registra aporte no tabuleiro individual do usuario e entra na soma coletiva da tribo.
- O menu inferior da tela SHAMAR tem botao `Inicio` para voltar a `/app`.

### Navegacao principal
- A barra inferior principal do app permanece com `Conquistas`; SHAMAR nao fica como tab fixa da barra inferior principal.
- O acesso ao SHAMAR fica como ferramenta/jornada dentro do ZeroApp.
- `middleware.js` passou a proteger `/shamar` e `/api/shamar`.
- Login preserva `next`, para links de convite abrirem a tela correta depois da autenticacao.

### Convites e e-mail
- Criada tabela `public.shamar_invites` via `scripts/migrate-shamar-invites.sql`.
- Policies RLS foram ajustadas para leitura por:
  - dono do convite.
  - convidado por `invited_user_id`.
  - convidado por e-mail usando `auth.jwt()->>'email'`.
  - admin via `public.is_admin()`.
- E-mail elegante de convite criado em:
  - `src/lib/email/templates/shamar-invite.js`
- Endpoint de convites do usuario:
  - `app/api/shamar/invites/route.js`
- Reenvio de convite disponivel:
  - no hub `/shamar` para convites enviados.
  - em telas de Dupla/Nos.
  - no admin SHAMAR.
- Copia de link de convite disponivel em telas operacionais para facilitar envio manual quando o e-mail nao chegar.

### E-mail a cada aporte SHAMAR
- Ao registrar um aporte em `POST /api/shamar/contributions`, o sistema agora envia um e-mail transacional imediatamente.
- O e-mail parabeniza o usuario, reforca a constancia da jornada e incentiva a continuar no SHAMAR.
- Template criado em:
  - `src/lib/email/templates/shamar-contribution.js`
- O template usa `baseTemplate` e inclui:
  - valor do aporte.
  - modalidade (`individual`, `dupla` ou `tribo`).
  - quantidade de quadrinhos marcados no aporte.
  - total de quadrinhos marcados no tabuleiro.
  - progresso percentual.
  - identidade SHAMAR atual.
  - botao para abrir a jornada SHAMAR.
- O envio usa `sendEmail` com `emailType='shamar_contribution_registered'`.
- O envio e nao bloqueante:
  - se o e-mail falhar, o aporte permanece registrado.
  - a falha entra em `warnings` na resposta da API.
- Foi criada a migracao:
  - `scripts/migrate-email-logs-shamar-types.sql`
- Essa migracao atualiza a constraint `email_logs_email_type_check` para aceitar:
  - `shamar_invite`
  - `shamar_invite_resend`
  - `shamar_invite_admin_resend`
  - `shamar_contribution_registered`
- Importante: executar essa migracao no Supabase para que os logs de e-mail SHAMAR sejam gravados sem erro de constraint.

### Admin SHAMAR
- `/admin/shamar` agora tem gestao de jornadas dos alunos.
- A nova secao `Jornadas dos alunos` permite:
  - buscar por aluno, e-mail ou turma.
  - filtrar por modalidade (`individual`, `dupla`, `tribo`).
  - filtrar por status (`active`, `completed`, `abandoned`).
  - editar nome/turma, status, inicio, duracao, patrimonio inicial/final e flag de config ativa.
  - excluir uma jornada especifica.
  - reenviar e-mail de convite pendente.
  - copiar link de convite pendente.
- Endpoint admin novo:
  - `app/api/admin/shamar/journeys/route.js`
  - `GET` lista jornadas com perfil, config, stats e convites.
  - `POST` reenvia convite.
  - `PATCH` edita jornada/config.
  - `DELETE` remove jornada, limpa vinculos de parceria e cancela convites pendentes.
- Cuidado aplicado na exclusao:
  - `shamar_partnerships` nao tinha cascade para `shamar_seasons`, entao o endpoint remove os vinculos antes de excluir a jornada.

### Banco/Supabase executado nesta rodada
- `scripts/migrate-shamar-invites.sql` foi aplicado no Supabase.
- Schema cache do PostgREST foi recarregado via `NOTIFY pgrst, 'reload schema'`.
- RLS de `shamar_invites` foi corrigida para evitar erro ao consultar `auth.users` diretamente.
- Para testes, as jornadas ativas do usuario `sza.treinamentos@gmail.com` nas categorias Individual e Dupla foram encerradas, permitindo recomecar os testes.

### Arquivos principais criados/alterados em 2026-06-17
- `app/admin/shamar/page.jsx`
- `app/api/admin/shamar/journeys/route.js`
- `app/api/shamar/invites/route.js`
- `app/api/shamar/seasons/route.js`
- `app/shamar/page.jsx`
- `app/shamar/criar/page.jsx`
- `app/shamar/convites/page.jsx`
- `app/shamar/individual/page.jsx`
- `app/shamar/dupla/page.jsx`
- `app/shamar/nos/page.jsx`
- `app/shamar/tribo/page.jsx`
- `app/shamar/tabuleiro/page.jsx`
- `app/shamar/aporte/novo/page.jsx`
- `components/shamar/ShamarDashboard.jsx`
- `components/shamar/ShamarModeCreator.jsx`
- `components/shamar/ShamarUI.jsx`
- `hooks/useShamar.js`
- `src/lib/email/templates/shamar-invite.js`
- `src/lib/email/templates/shamar-contribution.js`
- `src/lib/shamar/board-generator.js`
- `src/lib/shamar/api.js`
- `middleware.js`
- `src/modules/auth/presentation/login-page.jsx`
- `src/modules/finance/presentation/finance-app-page.jsx`
- `scripts/migrate-shamar-invites.sql`
- `scripts/migrate-email-logs-shamar-types.sql`

### Validacao realizada em 2026-06-17
- `git diff --check` passou antes dos commits.
- `git diff --cached --check` passou antes dos commits.
- `npm run build` passou antes do commit `874aa11`.
- `npm run build` passou apos a correcao do tabuleiro individual na Tribo.
- `npm run build` passou novamente apos push do `96adb61`.
- `npm run build` passou apos implementar e publicar o e-mail de aporte no commit `f438abe`.
- Build atual gerou 94/94 paginas com Next.js 15.5.15.

### Pendencias e pontos de atencao
- Validar visualmente com usuario autenticado em producao/Vercel:
  - criacao de Individual, Dupla e Tribo.
  - aceite de convite com conta ja existente.
  - aceite de convite apos cadastro novo.
  - reenvio de convite por usuario e admin.
  - copia manual do link de convite.
  - aporte na Tribo usando `/shamar/aporte/novo?mode=tribo`.
  - soma coletiva da Tribo apos aporte individual.
  - recebimento de e-mail apos aporte SHAMAR.
- Conferir no ambiente Vercel:
  - `NEXT_PUBLIC_SITE_URL` para links de convite corretos.
  - chave Resend/e-mail transacional.
  - `SUPABASE_SERVICE_ROLE_KEY` real, se as rotas admin/cron forem depender de bypass de RLS.
  - `CRON_SECRET`.
- Executar no Supabase:
  - `scripts/migrate-email-logs-shamar-types.sql`
- `backup.dump` continua nao rastreado e nao deve ser incluido em commit sem uma decisao explicita.
