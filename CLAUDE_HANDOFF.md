# CLAUDE Handoff - ZeroApp Home Hub

Data: 2026-05-30
Branch de origem: feature/mobile-ux-home-hub

## Objetivo da rodada
Implementar a nova Home Hub (mobile-first) com visual alinhado ao mockup aprovado, sem quebrar APIs/fluxos existentes.

## O que foi implementado

1. Design system base
- Criado `styles/theme.css` com tokens de cor, tipografia, spacing, radius e utilitários visuais.
- `app/layout.js` atualizado para importar o tema global.

2. Nova Home Hub (`/app`)
- `app/app/page.js` convertido para Home Hub client-side.
- Busca de dados financeiros do mês atual via `GET /api/finance/month`.
- Renderização do resumo financeiro + área de navegação principal.

3. Componentes novos da Home
- `components/finance/FinanceSummaryCard.jsx`
  - Grid 3x2 dos blocos financeiros.
  - Cálculo de realizado/previsto por bloco.
  - Saldo realizado do mês e previsto.
- `components/layout/NavigationCard.jsx`
  - Card visual dos atalhos (ícone + título).
- `components/layout/FAB.jsx`
  - Botão flutuante para acesso rápido.
- `components/layout/BottomNavHub.jsx`
  - Navegação inferior da Home Hub.
- `components/layout/JacksonAIModal.jsx`
  - Bottom sheet da IA (mantido funcional).

4. Ajustes de UX/visual solicitados
- Header: no lugar do texto "ZEROAPP", exibe o primeiro nome do usuário logado (`AppHeader.jsx`).
- Seção "ONDE VOCÊ QUER IR?":
  - cards centralizados, com borda verde e label abaixo do ícone.
  - ajuste de escala para não exigir scroll excessivo.
- Menu inferior:
  - aba central alterada de `IA` para `MAVF` apontando para `/mavf`.

## Marcação no código
- Marker adicionado em `app/app/page.js`:
  - `CLAUDE-HANDOFF-MARKER: Home Hub V1 ...`

## Arquivos-chave alterados
- `app/app/page.js`
- `app/layout.js`
- `styles/theme.css`
- `components/layout/AppHeader.jsx`
- `components/layout/BottomNavHub.jsx`
- `components/layout/FAB.jsx`
- `components/layout/JacksonAIModal.jsx`
- `components/layout/NavigationCard.jsx`
- `components/finance/FinanceSummaryCard.jsx`
- `app/financas/*` (rota nova para acesso direto ao módulo financeiro)

## Validação
- Build executado com sucesso (`npm run build`) após as alterações.

## Observações para continuidade
- Se precisar mais aderência visual ao mockup, ajustar apenas métricas finas (2-4px) no bloco "Home Hub" em `styles/theme.css`.
- Evitar regressão: manter intactas APIs de `finance`, `coins`, `mavf` e autenticação.
