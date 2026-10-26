# ADR-009: Scenic Stage Decoupling (Desacoplamento Cênico e Estrito do Telão Público)

## Status
Aceito (Fase 1 / Fase 2, Preparatório para Milestone 2D)

## Contexto
O Arena Voice possui duas personas visuais completamente antagônicas:
1. **O Operador da Mesa Técnica:** Precisa de densidade de informação, tempos de resposta, alertas de rede, formulários de edição e botões de comando.
2. **A Plateia e os Apresentadores:** Precisam de imersão cênica, estética visual refinada, iluminação dramática e foco exclusivo na apresentação em andamento.

Qualquer vazamento de elementos de controle (botões de reset, indicadores de IP, formulários de cadastro, alertas de erro de HTTP) para o telão de palco quebra a atmosfera do evento e expõe vulnerabilidades operacionais ao público.

## Decisão
Estabeleceu-se o princípio arquitetural de **Desacoplamento Cênico Estrito do Palco (`/stage`)**:
1. **Superfície Exclusivamente Contemplativa:** A rota `/stage` não possui botões, modais, formulários ou elementos clicáveis.
2. **Consumo Passivo de Metadados:** O telão consome apenas os dados de exibição do projeto ativo (`title`, `pitchLeader`, `track`, `logoUrl`) e as cores de neons do branding (`primaryColor`, `secondaryColor`) entregues pelo snapshot `GET /api/state` e pelo evento SignalR `CurrentProjectChanged`.
3. **Isolamento de Controles:** Toda mutação de dados (selecionar projeto, resetar cadeiras, editar startup) só existe na rota `/operator`.
4. **Sem Telemetria Técnica no Telão:** Mensagens de erro de rede no telão devem se limitar a animações sutis de reconexão visual, sem expor status codes HTTP ou stack traces.

## Consequências

### Positivas
- **Imersão Visual Garantida:** O telão funciona como um painel cenográfico de alta fidelidade para projeções em painéis de LED ou projetores de palco.
- **Segurança contra Cliques Indevidos:** Impossibilidade de qualquer membro da plateia ou operador desatento clicar no telão e desconfigurar a dinâmica.
- **Preparação Limpa para o Milestone 2D:** O telão 3D apenas escuta os eventos do backend e anima as luzes e o HUD sem precisar conter lógica de negócios.

### Negativas / Desafios
- Exige testes automatizados separados para garantir que alterações no cockpit do operador não interfiram visualmente no telão cênico.
