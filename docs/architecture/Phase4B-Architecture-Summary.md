# Sumário Arquitetural — Milestone 4B
## State Persistence & Session Re-hydration (Crash Recovery & Hot-Cache Resilience)

> **Projeto:** Arena Voice / Arena de Inovação  
> **Fase:** Fase 4 — Platform Reliability & Data Resilience  
> **Documento:** Resumo de Arquitetura do Milestone 4B  
> **Data:** 11 de Novembro de 2026  

---

## 1. Visão Geral Comparativa

### ANTES DO MILESTONE 4B
No Milestone 4A, a persistência relacional do PostgreSQL foi introduzida com sucesso para dados mestres do catálogo (eventos, projetos, jurados e histórico consolidado). No entanto, a operação ativa do evento em tempo real continuava 100% volátil:
- O projeto ativo na arena residia exclusivamente em variáveis privadas em RAM.
- As decisões dos jurados (acionamentos de cadeiras 1 a 5) ficavam em um dicionário volátil em memória.
- Qualquer reinício do processo ou queda de hardware forçava o palco a reiniciar em `Waiting` com cadeiras em 0/5, perdendo o momento exato do pitch.
- Não existia histórico de checkpoints nem detecção de interrupção forçada.

```text
[Crash do Servidor] ──► Reinicialização a Frio
                             │
                             ▼
                    ┌──────────────────────────────┐
                    │ ESTADO PERDIDO EM MEMÓRIA:   │
                    │ • Projeto Atual: REVERTIDO   │
                    │ • Cadeiras Ativas: ZERADAS   │
                    │ • Cronômetro: ZERADO         │
                    │ • Estágio do Pitch: WAITING  │
                    │ • Votos Parciais: PERDIDOS   │
                    └──────────────────────────────┘
```

---

### DEPOIS DO MILESTONE 4B
Com o Milestone 4B, a Arena Voice opera com uma arquitetura híbrida de alto desempenho: **Hot Cache em RAM com Snapshot Pattern assíncrono em PostgreSQL e Motor de Recuperação Paused**.

```text
[Crash do Servidor] ──► Reinicialização a Frio
                             │
                             ▼
                    ┌──────────────────────────────────────────────┐
                    │ REHYDRATION & CRASH RECOVERY ENGINE:         │
                    │ • Projeto Atual: RESTAURADO DO BANCO         │
                    │ • Cadeiras Ativas: RESTAURADAS (turned_chairs│
                    │ • Estágio do Pitch: PRESERVADO               │
                    │ • Cronômetro: CONGELADO EM PAUSED NO CHECKPOINT
                    │ • Metadados de Falha: RecoveredFromCrash=true│
                    │ • Operador: Decide entre RESUME ou RESET     │
                    └──────────────────────────────────────────────┘
```

---

## 2. Componentes Fundamentais da Nova Arquitetura

### 2.1. ActiveSessionState (Tabela Relacional Singleton)
Tabela relacional mapeada no PostgreSQL (`active_session_state`) com chave primária fixa `singleton_id = 1`:
- `current_event_id` (`varchar(50)`): ID do evento atualmente governado no palco.
- `current_project_id` (`varchar(50)`): ID da startup apresentando no momento.
- `pitch_stage` (`integer`): código ordinal do estágio do pitch (`0..5`).
- `pitch_stage_started_at` (`timestamptz`): carimbo de início do estágio.
- `current_stage_duration_seconds` (`double precision`): duração regulamentar da etapa.
- `is_paused` (`boolean`): flag de congelamento de cronômetro.
- `paused_at` (`timestamptz`): momento em que a pausa foi disparada.
- `total_paused_seconds` (`double precision`): tempo acumulado de pausas.
- `turned_chairs` (`integer[]`): array PostgreSQL contendo a lista de cadeiras viradas (ex: `{1, 3, 4}`).
- `recovered_from_crash` (`boolean`): indica que a sessão ativa proveio de uma recuperação de pane.
- `interrupted_stage` (`integer`): registra o estágio original que foi interrompido pela queda.
- `recovered_at` (`timestamptz`): carimbo de tempo da restauração no boot.
- `last_checkpoint_at` (`timestamptz`): âncora temporal da última gravação segura em disco.
- `last_updated` (`timestamptz`): data/hora da última mutação de sessão.

---

### 2.2. ActiveSessionSnapshot & Snapshot Pattern
Para evitar que chamadas de I/O de rede ou disco bloqueiem o processamento em memória, a sincronização é desacoplada através do **Snapshot Pattern**:
- **Geração:** Toda operação mutadora executa dentro de `lock (_contextLock)` e chama `CreateSnapshotUnderLock()`.
- **Imutabilidade:** O snapshot é um `record` imutável C# clonado por valor.
- **Persistência Assíncrona:** A persistência (`PersistSnapshot`) ocorre fora do lock de memória, utilizando uma conexão transitória via `IDbContextFactory<ArenaDbContext>` e sincronizada por um lock secundário (`_dbPersistenceLock`).

```text
       REQUISIÇÃO (REST / SignalR / Hardware)
                         │
                         ▼
             lock (_contextLock) {
                 Atualiza Hot Cache em RAM;
                 snapshot = CreateSnapshotUnderLock();
             } // LIBERA LOCK DE MEMÓRIA (< 0.1ms)
                         │
                         ▼
             lock (_dbPersistenceLock) {
                 using var db = _factory.CreateDbContext();
                 Salva snapshot no PostgreSQL (active_session_state);
                 Atualiza _lastCheckpointAt;
             }
```

---

### 2.3. Hot Cache & Lock Separation
A arquitetura assegura que requisições de leitura de alta frequência (`GET /api/state`, `GET /api/pitch/state`) e disparos de hardware do ESP32 (`POST /api/chair-press`) sejam atendidos em microssegundos:
- **`_contextLock`:** Garante exclusão mútua estrita apenas nas estruturas de dados locais em memória (`_chairStates`, `_currentProjectId`, `_pitchStage`, timers).
- **`_dbPersistenceLock`:** Serializa as gravações concorrentes no banco sem competir ou bloquear o `_contextLock`. Nenhuma consulta ao PostgreSQL é feita enquanto o `_contextLock` estiver retido.

---

### 2.4. Crash Recovery Engine (Paused Recovery Strategy)
Durante a inicialização do store em `RehydrateSessionState()`:

```text
               ┌──────────────────────────────────────────────┐
               │         Carrega tupla singleton do DB        │
               └──────────────────────┬───────────────────────┘
                                      │
                     IsInterrupted = (PitchStage in Ativo)
                                     AND (!IsPaused)?
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                       [Sim]                     [Não]
                         │                         │
                         ▼                         ▼
         ┌──────────────────────────────┐  ┌──────────────────────────────┐
         │       CRASH RECOVERY         │  │       BOOT REGULAR           │
         │ • Força isPaused = true      │  │ • Restaura evento e projeto  │
         │ • Congela no LastCheckpointAt│  │ • Restaura cadeiras turned   │
         │ • Seta RecoveredFromCrash=T  │  │ • Restaura estágio original  │
         │ • Persiste snapshot Paused   │  │ • Mantém timers inalterados  │
         └──────────────┬───────────────┘  └──────────────┬───────────────┘
                        │                                 │
                        └────────────────►┬◄──────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │       HOT CACHE PRONTO          │
                         │ Operador pode enviar:           │
                         │ • RESUME (continua o pitch)     │
                         │ • RESET (limpa para Waiting)    │
                         └─────────────────────────────────┘
```

---

## 3. Garantias e Propriedades Arquiteturais

1. **Sub-Milissegundo Hot-Path:** Leituras de estado não tocam em PostgreSQL.
2. **Atomicidade de Hardware:** Acionamento de cadeira altera a memória instantaneamente e agenda a gravação relacional de forma isolada.
3. **Imutabilidade Temporal:** A indisponibilidade física do servidor não consome o tempo regulamentar dos empreendedores no palco.
4. **Idempotência de Boot:** Múltiplos restarts consecutivos sem intervenção do operador mantêm o estado pausado e os metadados íntegros.
5. **Transparência de Interface:** Clientes frontend e dashboards operacionais visualizam imediatamente se a sessão decorre de uma recuperação através dos campos `recoveredFromCrash` e `interruptedStage`.
