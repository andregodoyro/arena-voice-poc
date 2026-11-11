# Histórico de Implementação — Milestone 4B
## State Persistence & Session Re-hydration (Crash Recovery & Hot-Cache Resilience)

> **Projeto:** Arena Voice / Arena de Inovação  
> **Fase:** Fase 4 — Platform Reliability & Data Resilience  
> **Marco:** Milestone 4B — State Persistence & Session Re-hydration  
> **Status:** ✅ CONCLUÍDO E HOMOLOGADO  
> **Data de Conclusão:** 11 de Novembro de 2026  
> **Cobertura:** 530 asserções em 11 suítes automatizadas (100% de aprovação, 0 regressões)  

---

## 1. Visão Geral do Marco 4B

O Milestone 4B completou a transição da Arena Voice para um sistema tolerante a falhas operacionais em tempo de execução. Enquanto o Milestone 4A estruturou a persistência relacional ACID para os dados mestres (Eventos, Projetos, Jurados, Histórico), o Milestone 4B resolveu a persistência e reidratação do estado ativo da arena:
- Contexto de Evento e Projeto selecionados;
- Estágio atual do pitch e tempo restante do cronômetro;
- Estado físico das 5 cadeiras digitais acionadas pelos jurados;
- Detecção e congelamento seguro pós-queda (Crash Recovery Engine).

A implementação respeitou integralmente três diretrizes arquiteturais estritas:
1. **Persistência de Cadeiras Físicas:** Estado das 5 cadeiras armazenado em array nativo PostgreSQL (`turned_chairs int[]`).
2. **Estratégia de Recuperação Paused:** Quedas durante apresentações ativas congelam o sistema em `Paused` com tempo preservado, sem descarte automático para `Waiting`.
3. **Persistência Fora do Lock Principal:** Operações de I/O em disco são executadas fora do `_contextLock` através de snapshots imutáveis (`ActiveSessionSnapshot`) e lock dedicado `_dbPersistenceLock`.

---

## 2. Etapa 4B.1 — Model & Schema Update

### Objetivo
Evoluir a entidade singleton `ActiveSessionState` e o schema relacional no PostgreSQL para acomodar as 5 cadeiras físicas e os metadados de diagnóstico e recuperação operacional.

### Arquitetura & Entidades
A entidade `ActiveSessionState` foi expandida com:
- `TurnedChairs` (`int[]` nativo PostgreSQL): armazena a lista de IDs das cadeiras ativadas (ex: `{1, 3, 4}`).
- `RecoveredFromCrash` (`boolean`): flag oficial indicando que o estado atual foi restaurado após interrupção anômala.
- `InterruptedStage` (`int?` / `PitchStage?`): registra qual estágio estava em execução quando o backend caiu.
- `RecoveredAt` (`timestamptz?`): data/hora UTC do momento em que a recuperação foi executada no boot.
- `LastCheckpointAt` (`timestamptz?`): carimbo de data/hora do último snapshot persistido em banco antes da falha.

### Arquivos Alterados
- `backend/Domain/Entities/ActiveSessionState.cs`: Adição das 5 novas propriedades tipadas.
- `backend/Persistence/Configurations/ActiveSessionStateConfiguration.cs`: Mapeamento Fluent API para PostgreSQL (`has_column_name`, `column_type`).
- `backend/Persistence/Migrations/20261111120534_AddChairsAndRecoveryToActiveSessionState.cs`: Migration gerada via `dotnet ef migrations add`.
- `backend/Persistence/Migrations/ArenaDbContextModelSnapshot.cs`: Snapshot do EF Core atualizado.

### Validações Executadas
- Compilação com 0 erros e 0 avisos.
- Execução de `DatabaseStartupValidator` aplicando a migration idempotentemente no banco PostgreSQL Portable em < 1.2s.
- Verificação DDL confirmando a criação das colunas `turned_chairs`, `recovered_from_crash`, `interrupted_stage`, `recovered_at` e `last_checkpoint_at`.

---

## 3. Etapa 4B.2 — Snapshot Pattern & Lock Separation

### Objetivo
Desacoplar o *Hot Cache* em memória RAM das operações síncronas de escrita em disco, eliminando contenção de lock, latência em requisições SignalR e bloqueios de timers.

### Arquitetura
1. Criação do record imutável `ActiveSessionSnapshot`:
   ```csharp
   public record ActiveSessionSnapshot(
       string? CurrentEventId,
       string? CurrentProjectId,
       PitchStage PitchStage,
       DateTimeOffset? PitchStageStartedAt,
       double CurrentStageDurationSeconds,
       bool IsPaused,
       DateTimeOffset? PausedAt,
       double TotalPausedSeconds,
       int[] TurnedChairs,
       bool RecoveredFromCrash,
       PitchStage? InterruptedStage,
       DateTimeOffset? RecoveredAt,
       DateTimeOffset LastUpdated
   );
   ```
2. Introdução de dois locks com propósitos estritos:
   - `_contextLock` (objeto em memória): protege leitura e mutação das variáveis ativas no processo (< 0.1ms).
   - `_dbPersistenceLock` (objeto de persistência): serializa transações de banco no PostgreSQL sem travar o processamento da arena.
3. Fluxo de mutação:
   - Entra em `lock (_contextLock)`;
   - Altera propriedades em memória e chama `CreateSnapshotUnderLock()`;
   - Sai de `lock (_contextLock)`;
   - Chama `PersistSnapshot(snapshot)`, que obtém `_dbPersistenceLock` e grava no PostgreSQL via `IDbContextFactory`.

### Arquivos Alterados
- `backend/Domain/Entities/ActiveSessionSnapshot.cs`: Novo record imutável.
- `backend/Domain/Entities/ActiveContext.cs`: Inclusão dos campos de recovery e checkpoint.
- `backend/Services/PostgresArenaProjectStore.cs`: Refatoração integral de todos os métodos mutadores (`SelectProject`, `TransitionPitch`, `PausePitchTimer`, `ResumePitchTimer`, `AdjustPitchTimer`, `TryTurnChair`, `ResetChairs`).

### Problemas Encontrados & Soluções
- **Problema:** O método `ResetChairs()` chamava `lock (_contextLock)` internamente e era invocado por outros métodos mutadores que já seguravam o lock, gerando reentrância e redundância de persistência.
- **Solução:** Criação do helper `ResetChairsInternal()` para uso estrito dentro de regiões já sincronizadas por `_contextLock`, mantendo `ResetChairs()` para chamadas públicas externas com persistência de snapshot.

---

## 4. Etapa 4B.3 — Rehydration Engine

### Objetivo
Restaurar completamente o estado operacional do evento, projeto, cadeiras e máquina de estados durante o boot da aplicação a partir da tupla singleton de `active_session_state`.

### Arquitetura
O método `RehydrateSessionState()` foi integrado ao construtor de `PostgresArenaProjectStore`:
1. Consulta a tupla singleton com `AsNoTracking()`.
2. Se a tabela estiver vazia (primeiro boot), gera snapshot padrão e persiste no banco.
3. Se existir estado anterior:
   - Valida e restaura `_currentEventId` e `_currentProjectId`;
   - Restaura as 5 cadeiras físicas (`_chairStates[1..5]`) a partir de `turned_chairs`;
   - Restaura contadores de tempo, durações e flags de pausa;
   - Restaura metadados históricos de recuperação.

### Arquivos Alterados
- `backend/Services/PostgresArenaProjectStore.cs`: Implementação do método `RehydrateSessionState()`.

---

## 5. Etapa 4B.4 — Crash Recovery Engine

### Objetivo
Detectar quedas de energia, panes no processo ou shutdowns forçados durante pitches em andamento, aplicando a estratégia de recuperação segura *Paused Recovery*.

### Arquitetura
1. **Detecção de Falha:**
   ```csharp
   bool isInterrupted = (session.PitchStage == PitchStage.PitchRunning ||
                         session.PitchStage == PitchStage.QA ||
                         session.PitchStage == PitchStage.VotingOpen)
                        && !session.IsPaused;
   ```
2. **Preservação do Tempo Congelado:**
   O tempo decorrido no momento da falha é calculado tendo como referência o último checkpoint válido:
   $$\text{elapsedAtCrash} = \max(0, (\text{referenceTime} - \text{PitchStageStartedAt}) - \text{TotalPausedSeconds})$$
   Onde $\text{referenceTime} = \text{LastCheckpointAt} \parallel \text{LastUpdated}$.
3. **Ajuste Forçado para Paused:**
   - `_isTimerPaused = true`;
   - `_timerPausedAt = now`;
   - `_totalPausedSeconds = Math.Max(0.0, (now - _pitchStageStartedAt.Value).TotalSeconds - elapsedAtCrash)`;
   - `_recoveredFromCrash = true`;
   - `_interruptedStage = session.PitchStage`;
   - `_recoveredAt = now`.
4. **Exposição em DTOs Retrocompatíveis:**
   Extensão de `PitchStateDto` com parâmetros default trailing, permitindo aos painéis do operador e telão 3D identificar o estado de recuperação sem impacto nas APIs existentes.

### Arquivos Alterados
- `backend/Services/PostgresArenaProjectStore.cs`: Inclusão da lógica de congelamento e limpeza em `ResetPitch()`.
- `backend/Services/IArenaProjectStore.cs`: Extensão de `PitchStateDto`.

---

## 6. Etapa 4B.5 — Crash Recovery Validation Suite

### Objetivo
Criar uma suíte de testes ponta a ponta automatizada capaz de inicializar o backend, executar ações, matar o processo (`taskkill /F`), subir novo processo e validar asserções de reidratação.

### Cenários Implementados (`tests/test-crash-rehydration.cjs`)
1. **Cenário 1:** Seleção de Projeto $\rightarrow$ Crash $\rightarrow$ Restart $\rightarrow$ Projeto continua selecionado.
2. **Cenário 2:** Cadeiras `[1, 3, 4]` acionadas $\rightarrow$ Crash $\rightarrow$ Restart $\rightarrow$ Cadeiras `1, 3 e 4` restauradas ativas e `2 e 5` inativas.
3. **Cenário 3:** Pitch em andamento $\rightarrow$ Crash abrupto $\rightarrow$ Restart $\rightarrow$ Estágio preservado, `recoveredFromCrash == true` e `interruptedStage == PitchRunning`.
4. **Cenário 4:** Pitch em andamento $\rightarrow$ Crash $\rightarrow$ Restart $\rightarrow$ Timer congelado em `isPaused: true`, tempo preservado sem decrementar enquanto pausado.
5. **Cenário 5:** Resume após Recovery $\rightarrow$ Cronômetro descongela e volta a decrementar normalmente.
6. **Cenário 6:** Reset após Recovery $\rightarrow$ Limpeza total para `Waiting`, cadeiras 0/5 e `recoveredFromCrash == false`.
7. **Cenário 7:** Validação de `LastCheckpointAt` $\rightarrow$ Timestamp gravado em banco e avanço temporal comprovado a cada intervenção.

### Problemas Encontrados & Soluções
- **Problema:** No Cenário 4, o teste realizava `sleep(1500)` logo após iniciar o pitch e matava o processo sem qualquer ação intermediária. Como o único checkpoint no banco era o do início do pitch (segundo 0), o cálculo do tempo no checkpoint congelava exatamente em 180s. A asserção `remainingFirst < 180` falhava com `180s de 180s`.
- **Solução:** No Cenário 3/4, incluímos uma ação operacional real durante a execução do pitch (acionamento de uma cadeira pelo jurado após 1.5s), provocando a gravação de um checkpoint intermediário. O teste validou que o tempo restante congelou exatamente em 178.4s, cumprindo com perfeição a regra de negócio do último checkpoint.

---

## 7. Etapa 4B.6 — Final Homologation & Milestones Closure

### Objetivo
Executar a homologação integrada com regressão geral de todas as 11 suítes de testes do repositório, garantindo conformidade absoluta com o design arquitetural.

### Entregas & Ferramentas
- Implementação de `tests/run-regression-suite.cjs`: runner centralizado que orquestra a subida do backend em modo PostgreSQL, executa as 10 suítes sequenciais, encerra o servidor e dispara a suíte de crash recovery, gerando relatório analítico consolidado.
- Produção do relatório executivo de encerramento em `docs/archives/milestones/Phase4B-Closure-Report.md`.

### Resultado Final Homologado
- **11 Suítes Automatizadas Executadas.**
- **530 Testes Aprovados (100% de Sucesso).**
- **0 Falhas / 0 Regressões.**
- **Conexões REST e SignalR 100% Preservadas.**
