# ADR-012: Pitch Lifecycle Engine & Terminal Finished State (Máquina de Estados Operacional do Pitch e Estado Terminal)

## Status
Aceito (Fase 3, Milestone 3B — Pitch Lifecycle Engine)

## Contexto
Antes do Milestone 3B, o Arena Voice não possuía controle formal sobre as fases de uma apresentação de startup. O operador podia abrir ou fechar votos, mas o sistema não diferenciava entre "startup apresentando", "perguntas da banca", "votação aberta" e "votação encerrada" como estados de máquina distintos e validáveis.

Isso gerava três problemas estruturais:

1. **Ausência de regras de negócio temporais:** Não havia impedimento formal para que o operador pulasse etapas (ex: ir direto para votação sem pitch).
2. **Estado de votação ambíguo:** O lockout de cadeiras (implementado em 3C) não tinha um estágio canônico de referência para decidir se aceita ou rejeita um voto.
3. **Ausência de ponto de encerramento formal:** Sem um estado `Finished`, o sistema não sabia quando invocar o Result Engine e arquivar a rodada (implementado em 3D).

A plataforma precisava de uma máquina de estados formal que cobrisse todo o ciclo de uma apresentação — desde a seleção do projeto no palco até o arquivamento do resultado.

## Problema
Como modelar o fluxo operacional de uma apresentação de startup de forma que:
- Os estágios reflitam a realidade do evento ao vivo (pitch, perguntas, votação, encerramento);
- Transições inválidas sejam rejeitadas pelo backend sem alterar o estado;
- Exista um ponto de encerramento definitivo que acione os subsistemas downstream (Result Engine, Round History);
- O estado seja sincronizado em tempo real com o telão e o cockpit via SignalR;
- O retorno ao início do ciclo ocorra apenas de forma explícita e controlada.

## Decisão
Implementação de uma **máquina de estados formal de 6 estágios** (`PitchStage`) residente no `ActiveContext`, com validação autoritativa de transições e estado terminal inviolável.

### Estágios Formais (`PitchStage`)
```
Waiting (0)      → projeto selecionado no palco, aguardando início
PitchRunning (1) → startup apresentando ao vivo
QA (2)           → sessão de perguntas e respostas da banca
VotingOpen (3)   → janela oficial de votação — único estágio que aceita votos
VotingClosed (4) → votação encerrada, aguardando resultado
Finished (5)     → apresentação concluída, estado TERMINAL
```

### Matriz de Transições Válidas
```
Waiting      → PitchRunning
PitchRunning → QA, VotingOpen, Waiting
QA           → VotingOpen, PitchRunning
VotingOpen   → VotingClosed, QA
VotingClosed → Finished, VotingOpen
Finished     → (nenhuma transição direta é permitida)
```

Qualquer tentativa de transição fora dessa matriz retorna `HTTP 422 Unprocessable Entity` sem alterar o estado.

### Estado Terminal `Finished`
`Finished` é o único estágio que não aceita nenhuma transição direta. O design é deliberado:
- **Protege a integridade do resultado:** Ao atingir `Finished`, o Result Engine é invocado e a rodada é arquivada como snapshot imutável. Permitir retransição após o arquivamento criaria inconsistências entre o histórico registrado e o estado atual.
- **Força reinicialização explícita:** O retorno para `Waiting` ocorre **exclusivamente** via `POST /api/projects/{id}/select`, garantindo que o operador escolha conscientemente o próximo projeto antes de reiniciar o ciclo.
- **Aciona subsistemas downstream automaticamente:** A transição para `Finished` dispara automaticamente `ProjectStatus → Completed` (com `PresentationEndedAt` gravado) e a invocação do Result Engine & Round History (3D).

### Seleção de Projeto como Reset Implícito
`POST /api/projects/{id}/select` tem papel duplo:
1. Define o novo projeto como `Current` no `ActiveContext`
2. Retorna o `PitchStage` para `Waiting`, reiniciando o ciclo para a próxima apresentação
3. Reseta as 5 cadeiras físicas para 0° e emite `ChairsReset` + `PitchStageChanged`

### Sincronização em Tempo Real
- Evento canônico `PitchStageChanged` via SignalR a cada transição, contendo `previousStage`, `currentStage`, `stageCode`, `stageStartedAt` e `allowedTransitions`
- O cockpit do operador exibe o Stepper visual de 6 etapas com indicador de progresso e botão primário contextual de avanço
- O telão exibe badge cênico do estágio: "AGUARDANDO PITCH", "PITCH AO VIVO", "PERGUNTAS (Q&A)", "VOTAÇÃO ABERTA", "VOTAÇÃO ENCERRADA", "APRESENTAÇÃO CONCLUÍDA"

### Normalização Robusta de Entrada
O endpoint `POST /api/pitch/transition` aceita strings de estágio normalizadas (tolerante a `"Q&A"`, `"QA"`, `"qa"`, `" VotingOpen "`) para facilitar integração com ferramentas e scripts de automação sem fragilizar o contrato.

## Consequências

### Positivas
- **Rastreabilidade operacional completa:** O operador sempre sabe em qual estágio a apresentação está e quais ações são permitidas.
- **Fundação para lockout e result engine:** `VotingOpen` é o único estágio autorizado para aceitar votos (3C). `Finished` é o gatilho do Result Engine (3D).
- **Prevenção de erros humanos:** Transições inválidas são rejeitadas com `HTTP 422` antes de qualquer mutação de estado.
- **Auditoria de estágios percorridos:** `RoundHistoryEntry` registra a sequência de estágios vividos pela apresentação.

### Negativas / Desafios
- O operador deve seguir a sequência válida de estágios — não é possível pular etapas arbitrariamente.
- O estado `Finished` terminal pode causar confusão inicial: o operador precisa selecionar explicitamente um novo projeto, não apenas clicar em "reiniciar pitch".

## Alternativas Consideradas

| Alternativa | Motivo da Rejeição |
| :--- | :--- |
| **Modelo binário OPEN/CLOSED de rodada** | Insuficiente para representar `QA`, `PitchRunning` e o pré-pitch `Waiting`; não suporta o lockout granular. |
| **Estágio `Finished` reiniciável via transição direta** | Causaria inconsistência entre o histórico arquivado e o estado ao vivo; viola a imutabilidade do RoundHistoryEntry. |
| **Múltiplos endpoints por estágio (ex: `/start`, `/open-voting`, `/close-voting`)** | Fragmenta o contrato de API; mais difícil de auditar e testar do que um único endpoint canônico com DTO de destino. |
| **Controle de estágio exclusivamente no frontend** | Viola o princípio de backend autoritativo (ADR-001); permite dessincronização entre clientes. |

## Motivos da Escolha
- O modelo de 6 estágios espelha com fidelidade o roteiro operacional real de um evento de pitch corporativo.
- Um único endpoint `POST /api/pitch/transition` com DTO de destino centraliza a lógica de validação e simplifica testes automatizados.
- O estado terminal `Finished` é o ponto de encontro entre o ciclo operacional (3B) e os subsistemas analíticos (3D, 3E), tornando a fronteira entre eles precisa e auditável.

## Impacto Futuro
- **ADR-013 (Timers & Lockout):** `VotingOpen` é a referência canônica que o lockout verifica para aceitar ou rejeitar acionamentos de cadeiras.
- **ADR-014 (Round History):** A transição para `Finished` é o gatilho do arquivamento imutável da rodada.
- **Fase 4 (Scorecards):** Scorecards individuais de jurados serão coletados entre `VotingOpen` e `VotingClosed`, aproveitando o estágio canônico como janela de coleta.
