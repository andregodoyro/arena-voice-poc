# ADR-013: Authoritative Timers & Voting Lockout (Cronômetros Autoritativos e Lockout de Votação)

## Status
Aceito (Fase 3, Milestone 3C — Pitch Timers & Authoritative Lockout)

## Contexto
Após a implementação da máquina de estados do pitch (3B), a plataforma possuía os estágios formais mas sem controle de tempo. Dois problemas se tornaram imediatos:

1. **Sem cronômetro:** O operador e a plateia não tinham visibilidade do tempo restante para a apresentação. O pitch podia se estender indefinidamente.
2. **Lockout apenas por estágio:** O mecanismo de bloqueio de cadeiras dependia exclusivamente de `PitchStage == VotingOpen`, sem levar em conta situações em que o operador precisasse pausar temporariamente a votação sem encerrar o estágio.

Adicionalmente, a sincronização de tempo entre o backend, o cockpit do operador e o telão 3D apresentava um desafio técnico clássico: cronômetros exibidos no frontend tendem a acumular desvios (`drift`) ao longo do tempo caso não sejam periodicamente re-anchorados a uma fonte de verdade autoritativa.

## Problema
Como implementar um cronômetro de palco que:
- Seja autoritativo (calculado pelo backend, não pelos clientes);
- Permita pause e resume sem acumular drift temporal;
- Permita adição de tempo em voo sem descontinuidade;
- Sincronize tanto o cockpit do operador quanto o telão 3D sem polling constante ao backend;
- Integre ao lockout de cadeiras de forma que pausas também bloqueiem votos;
- Seja protegido contra condições de corrida entre requisições concorrentes de timer.

## Decisão
Implementação de **cronômetros autoritativos ancorados em timestamp** no `ActiveContext`, com compensação acumulada de pausas, sincronização periódica via SignalR e lockout revisado que cobre tanto estágio quanto estado de pausa.

### Modelo de Tempo Autoritativo no Backend
O `ActiveContext` armazena três campos de controle temporal:
```csharp
DateTimeOffset? PitchStageStartedAt     // âncora temporal do início do estágio
bool            IsPaused                // indica se o cronômetro está congelado
int             TotalPausedSeconds      // compensação acumulada de todas as pausas
int             CurrentStageDurationSeconds // duração configurada para o estágio atual
```

O tempo restante é calculado deterministicamente no backend:
```
remainingSeconds = CurrentStageDurationSeconds
                  - (UtcNow - PitchStageStartedAt).TotalSeconds
                  + TotalPausedSeconds
                  - (IsPaused ? (UtcNow - PauseStartedAt).TotalSeconds : 0)
```

### Operações de Timer
- **Pause (`POST /api/pitch/pause`):** Registra `PauseStartedAt = UtcNow` e define `IsPaused = true`. Rejeita `HTTP 409 Conflict` se já pausado.
- **Resume (`POST /api/pitch/resume`):** Acumula `TotalPausedSeconds += (UtcNow - PauseStartedAt)`, limpa `PauseStartedAt` e define `IsPaused = false`. Rejeita `HTTP 409 Conflict` se não estava pausado.
- **Add Time (`POST /api/pitch/add-time`):** Incrementa `CurrentStageDurationSeconds += seconds`. Aceito a qualquer momento (pausado ou não). Payload: `{ "seconds": 30 }`.

Todas as operações ocorrem dentro de bloqueio `lock` no `ArenaProjectStore` para prevenir condições de corrida.

### Sincronização via SignalR (`PitchTimerUpdated`)
O `TimerBroadcastService` (IHostedService) emite o evento `PitchTimerUpdated` periodicamente enquanto o pitch estiver em estágio com cronômetro ativo. O payload contém `remainingSeconds` calculado no momento da emissão. Clientes recebem a âncora autoritativa e ajustam seus tickers locais.

### Tickers Locais Sincronizados (Frontend)
Os clientes (cockpit e telão) **não** dependem de polling ao backend para exibir o cronômetro fluido:
- `useOperatorTimer.js` e `useStageTimer.js` implementam `setInterval` de 1 segundo decrementando `remainingSeconds` localmente
- A cada evento `PitchTimerUpdated` recebido, o ticker local é **recalibrado** (não substituído), eliminando drift acumulado
- A cada evento `PitchStageChanged`, o ticker é reiniciado com o `remainingSeconds` do novo estágio

Isso garante exibição fluida (atualização a cada segundo) sem sobrecarregar o backend com polling.

### Lockout Autoritativo Revisado (`POST /api/chair-press`)
O lockout de cadeiras é revisado para cobrir dois critérios independentes:
```csharp
if (pitchStage != PitchStage.VotingOpen || isPaused)
    return Results.Conflict(new { accepted = false, error = "Chair press blocked: voting not open or timer is paused" });
```

Condições de rejeição (`HTTP 409 Conflict`):
1. `PitchStage != VotingOpen` — estágio errado
2. `IsPaused == true` — cronômetro pausado pelo operador (mesmo com `VotingOpen`)
3. `ActiveContext.CurrentProject == null` — nenhum projeto no palco
4. `ActiveContext.CurrentEvent == null` — nenhum evento ativo

Nenhuma mutação de estado ocorre em caso de rejeição. Nenhum evento SignalR é emitido.

### Configuração de Duração por Estágio (TimerConfig)
Cada evento armazena uma `TimerConfig` com durações padrão por estágio (ex: `PitchRunning = 180s`, `QA = 60s`, `VotingOpen = 30s`). Ao iniciar um estágio, o `CurrentStageDurationSeconds` é inicializado a partir dessa configuração. O operador pode editar a `TimerConfig` via `PUT /api/events/{id}` antes do início.

## Consequências

### Positivas
- **Zero drift temporal:** A fórmula de compensação acumulada garante que pausas de qualquer duração não causem desvio no tempo restante exibido.
- **Consistência perfeita entre telas:** Cockpit do operador e telão 3D exibem o mesmo cronômetro sincronizado, eliminando confusões visuais durante o evento.
- **Lockout físico e digital inviolável:** O hardware (ESP32) recebe `HTTP 409 Conflict`, o LED não pisca duplo, e nenhum estado é alterado em nenhuma camada.
- **Flexibilidade operacional:** Add-time e pause/resume permitem ao operador adaptar o ritmo sem reiniciar o ciclo.
- **Thread-safety:** Todas as mutações de timer são protegidas por `lock`, prevenindo condições de corrida em requisições concorrentes de pause+chair-press.

### Negativas / Desafios
- O `IHostedService` de broadcast consome recursos contínuos enquanto o pitch está ativo — aceitável no contexto de rede local de evento.
- A lógica de compensação de pausas é mais complexa do que um simples decremento; requer testes cuidadosos em cenários de pause/resume múltiplos.

## Alternativas Consideradas

| Alternativa | Motivo da Rejeição |
| :--- | :--- |
| **Cronômetro exclusivamente no frontend** | Viola ADR-001 (backend autoritativo); clientes diferentes exibiriam tempos divergentes sem sincronização. |
| **Polling periódico ao backend (`GET /api/pitch/state`)** | Gera carga desnecessária no backend; latência de atualização degradaria a experiência visual do cronômetro. |
| **Lockout apenas por estágio (sem checar `IsPaused`)** | Permitiria votos durante pausas deliberadas do operador, violando a intenção operacional. |
| **Reiniciar cronômetro a cada `PitchTimerUpdated`** | Causaria saltos visuais no frontend a cada sync; o modelo de calibração suave é superior. |
| **Timer baseado em `System.Timers.Timer` sem compensação** | Acumula drift em ambientes com GC pause ou carga de CPU; o modelo de timestamp-anchor é determinístico. |

## Motivos da Escolha
- O modelo de âncora temporal (`PitchStageStartedAt`) é a abordagem canônica para cronômetros autoritativos em sistemas distribuídos: não importa quando o cliente conecta, ele sempre pode calcular o estado correto do tempo a partir da âncora e da compensação.
- A combinação ticker local + calibração via evento oferece o melhor dos dois mundos: fluidez visual sem polling.
- O lockout duplo (estágio + pausa) é a expressão mais completa da intenção do operador: "votação está aberta" não basta — o cronômetro também não pode estar pausado.

## Impacto Futuro
- **ADR-014 (Round History):** O `IsPaused` e o tempo restante no momento do arquivamento são registrados no snapshot imutável da rodada.
- **Fase 4 (Scorecards):** A janela de coleta de scorecards individuais pode ser delimitada pelo cronômetro do estágio `VotingOpen`.
- **Fase 6 (Experiência Cênica):** Efeitos sonoros e visuais (alerta dos últimos 10s, gongo de encerramento) serão ancorados nos limiares de `remainingSeconds` já disponíveis no payload de `PitchTimerUpdated`.
- **Firmware ESP32:** O protocolo de feedback LED já está documentado em `docs/hardware.md`: `HTTP 200 OK` → double-blink (aceito), `HTTP 409 Conflict` → sem double-blink (lockout).
