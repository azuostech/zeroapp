# CLAUDE Handoff - ZeroApp Home Hub + Navegação v2

Data: 2026-05-30
Branch atual: main

## Objetivo da rodada
Concluir a Fase 2 do novo System Design (navegação v2 e renomeações visuais) e ajustar a tela de Finanças para exibir apenas os dados financeiros, sem quebrar APIs/fluxos existentes.

## O que foi implementado

1. Navegação v2 (Bottom Nav)
- Bottom nav padronizado para:
  - `🏠 Início` -> `/app`
  - `🌱 Minha Jornada` -> `/mavf`
  - `👤 Você` -> `/perfil`
- Removida duplicação de IA no menu inferior (IA permanece apenas no FAB).
- Destaque ativo e acessibilidade (`aria-current`) ajustados.

2. Home Hub (`/app`)
- Cards de navegação atualizados para:
  - `Finanças` (`/financas`)
  - `Educação` (`/conteudo`) com ícone `📚`
  - `Comunidade` (`/turma`)
  - `Conquistas` (`/jornada`)

3. Renomeação visual de telas
- `/mavf` exibe título:
  - `Minha Jornada 🌱`
  - subtítulo `Seus objetivos, práticas e evolução pessoal`
- `/jornada` exibe título:
  - `Conquistas 🏆`
  - subtítulo `Sua trilha de ZeroCoins e recompensas`

4. FAB universal (com JacksonAIModal)
- FAB + modal garantidos nas telas internas:
  - `/app`, `/mavf`, `/jornada`, `/conteudo`, `/turma`, `/resumo`, `/financas`
- `/jackson-ia` mantido como tela própria.

5. Rota `/perfil` funcional
- Criada página `/perfil` como tela dedicada de entrada da aba `Você`.
- A página reutiliza `FinanceAppPage` com:
  - `activeTab="voce"`
  - foco automático na seção `#perfil`
- Mantido fluxo existente sem alterar rotas `/mavf` e `/jornada`.

6. Perfil e atalhos
- Adicionado item `Minhas Conquistas` -> `/jornada` na seção de perfil.
- Ajustes visuais dos itens de menu do perfil (ícone, descrição e seta).

7. Ajuste solicitado na tela Finanças
- Em `/financas`, removidos os blocos de jornada/perfil da parte inferior:
  - `Minha Turma`, `Conteúdo`, `Conquistas`
  - seção `Perfil e Jornada`
- Tela permanece somente com os dados financeiros.
- Navegação de retorno permanece pelo menu inferior.
- Implementado via flag:
  - `showJourneySections={false}` em `FinanceAppPage` para rota `/financas`.

## Marcação no código
- Marker anterior mantido em `app/app/page.js`:
  - `CLAUDE-HANDOFF-MARKER: Home Hub V1 ...`
- Novo marker adicionado em `src/modules/finance/presentation/finance-app-page.jsx`:
  - `CLAUDE-HANDOFF-MARKER: Fase 2 (Nav v2 + Perfil dedicado + Financas sem blocos de jornada), 2026-05-30.`

## Arquivos-chave alterados
- `app/app/page.js`
- `app/conteudo/page.jsx`
- `app/financas/page.js`
- `app/jornada/page.jsx`
- `app/mavf/page.jsx`
- `app/perfil/page.jsx` (novo)
- `app/resumo/page.jsx`
- `app/turma/page.jsx`
- `components/layout/BottomNav.jsx`
- `components/layout/BottomNavHub.jsx`
- `src/modules/finance/presentation/finance-app-page.jsx`

## Validação
- `npm run build` executado com sucesso após as alterações.
- `next.config.mjs` sem redirects conflitantes para `/mavf` ou `/jornada`.

## Observações para continuidade
- Se houver novo ajuste de UI, prefira mexer em métricas/tokens sem alterar rotas nem APIs.
- Evitar regressão nas APIs de `finance`, `coins`, `mavf` e autenticação.
- A rota `/perfil` depende de `FinanceAppPage` com foco na seção de perfil; manter esse contrato caso extraia componente no futuro.
