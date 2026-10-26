# ADR-007: Operator Tabbed Navigation (Navegação por Abas Unificada no Cockpit Operacional)

## Status
Aceito (Planejamento Fase 2, Milestone 2C)

## Contexto
No Milestone 2C, o operador precisa gerenciar três domínios funcionais distintos:
1. **Operação ao Vivo:** Acompanhar cadeiras viradas, placar da rodada e disparar reset.
2. **Fila de Projetos:** Visualizar pitches pendentes, cadastrar novas startups, editar dados e selecionar quem sobe ao palco.
3. **Configuração do Evento:** Ajustar título, descrição e paleta de cores dos neons cênicos.

Se cada uma dessas funções residisse em páginas isoladas com recarregamento completo ou rotas desconectadas, o operador perderia a visibilidade do estado de prontidão e da telemetria das cadeiras ao navegar para cadastrar uma startup ou ajustar uma cor.

## Decisão
Adotou-se o padrão de **Navegação por Abas sob um Único Layout Operacional (Tabbed Layout)** na rota `/operator`:
- O layout mestre (`OperatorPage.jsx`) provê uma barra de cabeçalho unificada contendo:
  - Indicador de conexão SignalR e IP da mesa.
  - Abas contextuais: `[ Cockpit ao Vivo ]`, `[ Fila de Projetos ]`, `[ Configurações do Evento ]`.
- As sub-rotas `/operator/cockpit`, `/operator/projects` e `/operator/event` compartilham o mesmo contexto (`OperatorContext`), mantendo o cache de dados e os listeners de WebSocket ativos em segundo plano.
- O card resumido do projeto ativo no palco permanece acessível ou com feedback contínuo durante a navegação.

## Consequências

### Positivas
- **Foco Operacional Sem Cegueira de Palco:** O operador pode gerenciar a fila sem perder a noção de que um jurado acabou de virar a cadeira.
- **Transição Fluida:** Sem telas brancas de transição ou recarregamento de WebSockets ao mudar de aba.
- **Ergonomia para Tablet/Notebook:** Interface compacta e otimizada para operação rápida em ambientes de evento ao vivo.

### Negativas / Desafios
- Requer gerenciamento cuidadoso do estado compartilhado para evitar re-renderizações desnecessárias em abas inativas.
