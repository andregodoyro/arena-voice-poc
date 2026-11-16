# Changelog — Arena Voice

Todas as alterações notáveis da plataforma Arena Voice são documentadas neste arquivo.  
O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.4.3-phase4d] - 2026-11-16
### Conclusão Oficial do Milestone 4D e Encerramento da Fase 4: Automated Snapshots, Backup & Disaster Recovery

#### Adicionado
- **Motor de Orquestração de Backup (`BackupOrchestrator`)**: Execução isolada de `pg_dump.exe` em formato custom comprimido (`-Fc`) via processo do sistema operacional com injeção segura de credenciais.
- **Worker Assíncrono (`BackupWorker`)**: Fila `Channel<BackupRequest>` processada em segundo plano, garantindo tempo de resposta HTTP inferior a 20ms e overhead de enfileiramento < 10ms.
- **Endpoints Administrativos de Backup**:
  - `POST /api/admin/backup` — Enfileira job assíncrono de backup manual e retorna `202 Accepted` com `jobId`.
  - `GET /api/admin/backups` — Catálogo em tempo real consultando o filesystem (`backups/`) como fonte única da verdade, ordenado cronologicamente por data de criação.
- **Snapshots Automáticos Orientados a Domínio (Domain-Driven Snapshots)**: Disparo automático de snapshot assíncrono nomeado com o índice sequencial da rodada (`round_{N}_{timestamp}.pgdump`) ao arquivar rodadas em `ArchiveCurrentRound`, `TransitionPitch(Finished)`, `SelectProject` e `FinishEvent`.
- **Rastreabilidade de Snapshots no Audit Trail**: Segregação de eventos operacionais e técnicos: `BackupTriggered`, `BackupSucceeded`, `BackupFailed`, `AutoSnapshotTriggered`, `AutoSnapshotCreated` e `AutoSnapshotFailed`.
- **Engine de Restauração Física (`scripts/restore-backup.cjs`)**: Motor canônico de restauração que localiza dinamicamente o `pg_restore` e executa a recuperação com `--clean --if-exists` de forma idempotente e segura (Out-of-Process).
- **Interface Operacional Windows (`scripts/restore-backup.cmd`)**: Script amigável para operadores com flags `--help` e `--list` e seleção automática do snapshot mais recente.
- **Suíte de Disaster Recovery (`tests/test-disaster-recovery.cjs`)**: 28 asserções automatizadas validando ciclo completo de desastre e restauração física em banco isolado (`arena_voice_restore_test`) com 100% de conferência estrutural e de contagens.
- **Runbook Operacional de Contingência (`docs/runbooks/disaster-recovery-runbook.md`)**: Guia detalhado passo a passo para operadores em eventos ao vivo, documentando RTO < 30s e RPO = 0.
- **Registros Arquiteturais Formais**:
  - `ADR-023`: Estratégia do BackupOrchestrator e Execução Isolada de Processos.
  - `ADR-024`: Estratégia de Gatilho de Backup (RoundArchived vs. Periodic Timer).
  - `ADR-025`: Arquitetura de Disaster Recovery e Restauração Fora do Processo (Out-of-Process Restore).

#### Alterado
- **Orquestrador Central (`run-regression-suite.cjs`)**: Elevado para 14 suítes automatizadas, integrando `test-backup-recovery.cjs` e `test-disaster-recovery.cjs`.
- **PostgresArenaProjectStore.cs**: Injetado `IBackupOrchestrator` de forma desacoplada para emissão assíncrona de snapshots sem contenção no lock principal.

#### Validação e Confiabilidade
- **14/14 Suítes Automatizadas Aprovadas** (688/688 testes verdes, zero falhas, zero regressões).
- **RTO Comprovado**: Recuperação física em ~18 segundos (< 30s).
- **RPO Comprovado**: Zero rodadas arquivadas perdidas.
- **Auditoria de Portabilidade 100% Aprovada**: Zero caminhos absolutos locais ou dependências de usuário da máquina de desenvolvimento.
- **Encerramento da Fase 4**: Platform Reliability & Data Resilience 100% concluída.

---

## [0.4.2-phase4c] - 2026-11-16
### Conclusão Oficial do Milestone 4C: Operational Audit Trail & Event Sourcing Leve

#### Adicionado
- **Schema e Entidade `AuditEvent`**: Mapeamento da tabela relacional append-only `audit_events` com colunas estruturadas (`event_type`, `aggregate_type`, `aggregate_id`, `actor_type`, `actor_name`, `occurred_at`) e campos dinâmicos `JSONB` (`payload`, `before_state`, `after_state`, `metadata`).
- **Migration `AddAuditEventsTable`**: Migration EF Core versionada gerando a tabela de auditoria com índices compostos de alta performance para consultas cronológicas.
- **Pipeline de Escrita Assíncrono (`System.Threading.Channels`)**: Fila bounded em memória (10.000 itens) com `IAuditEventPublisher` desacoplando totalmente a gravação física no banco do fluxo crítico de requisições HTTP e SignalR.
- **Background Hosted Service `AuditEventWriter`**: Worker assíncrono para processamento e persistência de lotes de eventos na base PostgreSQL.
- **Instrumentação Global de Domínio**: 100% das mutações operacionais instrumentadas no `PostgresArenaProjectStore` (eventos de criação/edição/deleção, ciclo de pitch, timers, votações em cadeiras e snapshots).
- **Camada de Consulta REST (CQRS Leve)**: Implementação de `AuditQueryService` e endpoints `/api/audit`, `/api/audit/{id}`, `/api/audit/project/{id}`, `/api/audit/event/{id}` e `/api/audit/session`.
- **ADR-022 (Segregação de Visibilidade da Timeline)**: Ocultação padrão de eventos técnicos (`RecoveryCheckpointCreated`, `ActiveSessionUpdated`), reduzindo ruído visual e volume de tráfego em ~40%, com suporte a `?includeTechnical=true` sob demanda.
- **Integração Frontend e Re-hidratação (`auditApi.js` & `auditMapper.js`)**: Cliente de API e conversor de domínio integrados ao `OperatorContext.jsx` para carregar a timeline no boot do cockpit.
- **ActivityLog Aprimorado**: Componente `ActivityLog.jsx` com ícones específicos para cada ciclo operacional (play, pause, unanimidade, votos, governança) e persistência durável após recargas (`F5`).
- **Suíte de Testes de Consulta (`test-audit-query-layer.cjs`)**: 79 asserções cobrindo paginação, filtros e conformidade ADR-022.

#### Alterado
- **Orquestrador Central (`run-regression-suite.cjs`)**: Elevado para 12 suítes automatizadas, integrando a validação formal da camada de auditoria.
- **OperatorContext.jsx**: Fusão transparente entre eventos históricos vindos do banco de dados e eventos que acabaram de ocorrer via SignalR.

#### Validação e Confiabilidade
- **12/12 Suítes Automatizadas Aprovadas** (609/609 testes verdes, 0 falhas, 0 regressões).
- **Persistência Completa de Timeline**: Comprovação de que a linha do tempo do operador sobrevive intacta ao `F5`.

---

## [0.4.1-phase4b] - 2026-11-11
### Conclusão Oficial do Milestone 4B: State Persistence & Session Re-hydration

#### Adicionado
- **ActiveSessionState Evolution**: Adição das propriedades `TurnedChairs` (`int[]`), `RecoveredFromCrash` (`bool`), `InterruptedStage` (`PitchStage?`), `RecoveredAt` (`DateTimeOffset?`) e `LastCheckpointAt` (`DateTimeOffset?`) na entidade singleton relacional.
- **Persistência das Cadeiras Físicas**: Mapeamento do array nativo PostgreSQL `turned_chairs int[]` para armazenamento íntegro do estado das 5 cadeiras acionadas pelos jurados.
- **Migration `AddChairsAndRecoveryToActiveSessionState`**: Nova migration EF Core versionada gerada e aplicada com sucesso.
- **ActiveSessionSnapshot**: Record imutável C# para representação atômica do estado ativo da arena sem contenção de lock.
- **Snapshot Pattern & Lock Separation**:
  - `_contextLock`: lock em memória ultrarrápido (< 0.1ms) protegendo o Hot Cache em RAM.
  - `_dbPersistenceLock`: lock secundário dedicado à persistência de snapshots no PostgreSQL fora da região crítica de memória.
- **Rehydration Engine**: Motor de recomposição de contexto no boot da aplicação restaurando evento ativo, projeto ativo, estágio da máquina de estados, timers e cadeiras viradas.
- **Crash Recovery Engine**: Detecção inteligente de quedas anômalas durante pitches em andamento (`PitchRunning`, `QA`, `VotingOpen`) e aplicação da estratégia **Paused Recovery**:
  - Força `isPaused = true`;
  - Congela tempo restante exatamente no ponto do último checkpoint consistente (`LastCheckpointAt`);
  - Registra metadados oficiais de recuperação (`RecoveredFromCrash = true`, `InterruptedStage`, `RecoveredAt`);
  - Delega a decisão de retomada (*Resume*) ou reinício (*Reset*) com governança soberana ao operador na mesa técnica.
- **LastCheckpointAt Metadata**: Carimbo de data/hora gravado no PostgreSQL a cada transição ou intervenção operacional, eliminando a necessidade de I/O contínuo por segundo.
- **Extensão Retrocompatível de `PitchStateDto`**: Novos campos de recuperação expostos com valores padrão trailing (`RecoveredFromCrash`, `InterruptedStage`, `RecoveredAt`, `LastCheckpointAt`), sem quebrar nenhum dos 34 endpoints REST ou clientes frontend.
- **Suíte de Testes de Crash Recovery (`tests/test-crash-rehydration.cjs`)**: 7 cenários fim a fim simulando shutdowns forçados do processo (`taskkill /F`) e validando reidratação com 33 testes verdes.
- **Orquestrador Central de Regressão (`tests/run-regression-suite.cjs`)**: Runner automatizado para execução sequencial das 11 suítes de testes com relatório analítico de métricas.

#### Validação e Confiabilidade
- **11/11 Suítes Automatizadas Aprovadas** (530/530 testes verdes, 0 falhas, 0 regressões).
- **Sobrevivência Operacional Comprovada**: Prova prática de restauração de contexto, cadeiras e cronômetro congelado pós-queda forçada.

---

## [0.4.0-phase4a] - 2026-11-10
### Conclusão Oficial do Milestone 4A: Storage Engine & Relational Schema

#### Adicionado
- **PostgreSQL Portable 18.6**: Cluster de banco de dados relacional executado de forma 100% autônoma e portátil em `localhost:5432`, sem instaladores de SO e sem permissões de administrador.
- **Entity Framework Core 10 & Npgsql 10**: Adicionados pacotes `Npgsql.EntityFrameworkCore.PostgreSQL` (10.0.3) e `Microsoft.EntityFrameworkCore.Design` (10.0.14) no backend .NET 10.
- **ArenaPersistenceOptions**: Configuração fortemente tipada em `appsettings.json` com timeout de conexão reduzido (3s) e alternância de engine (`postgres` / `memory`).
- **ArenaDbContext**: Contexto oficial de banco mapeando 6 tabelas relacionais do domínio: `events`, `projects`, `judges`, `event_jury_assignments`, `round_history_entries` e `active_session_states`.
- **ActiveSessionState**: Entidade singleton (`singleton_id = 1`) para âncora de reidratação do Milestone 4B.
- **Mapeamento Fluent API Avançado**:
  - `Owned Types` para `BrandingConfig` e `TimerConfig`.
  - Tipo nativo PostgreSQL `text[]` para `expertise` de jurados.
  - Tipo nativo PostgreSQL `int[]` para `turned_chairs` no histórico de rodadas.
  - Coluna `jsonb` para snapshot imutável de `timer_config_snapshot`.
  - Restrições de chave estrangeira (`ON DELETE CASCADE`), índices e check constraints (`ck_round_result`, `ck_round_approval_mode`, `ck_round_last_stage`).
- **InitialCreate Migration**: Migration C# versionada contendo criação completa do schema relacional e snapshot de modelo.
- **DatabaseStartupValidator**: Rotina de inicialização segura com teste de socket TCP na porta 5432, banner de diagnóstico no console e execução idempotente de `db.Database.Migrate()`.
- **PostgresArenaProjectStore**: Implementação corporativa de `IArenaProjectStore` suportada por `IDbContextFactory<ArenaDbContext>` para sessões curtas por operação.
- **Suíte de Homologação de Persistência**: Implementado `tests/test-postgres-persistence.cjs` com 31 asserções cobrindo CRUD de eventos, projetos, jurados, alocação de banca, histórico com JSONB e prova de sobrevivência a restarts.

#### Alterado
- **Program.cs Wire-up**: Injeção condicional de dependências via `ARENA_STORAGE_ENGINE`, registrando `AddPooledDbContextFactory<ArenaDbContext>` e `PostgresArenaProjectStore`.
- **UpdateProjectDto**: Adicionado campo opcional `Status` para permitir resets idempotentes em rotinas de teste automatizadas.
- **Suíte de Testes de Projetos (`test-projects-api.cjs`)**: Adicionado setup e teardown de sanitização de dados no banco para idempotência entre execuções repetidas.

#### Validação e Confiabilidade
- **10/10 Suítes Automatizadas Aprovadas** (497/497 testes verdes, 0 falhas, 0 regressões).
- **Sobrevivência Real de Dados**: Prova prática de integridade dos registros após parada forçada e reinicialização a frio do backend.

---

## [0.3.0-phase3] - 2026-11-09
### Conclusão Oficial da Fase 3: Governança, Ciclo do Pitch, Timers, Histórico e Jurados

#### Adicionado
- **Milestone 3A (Event Lifecycle)**: Governança com 5 estados (`Draft`, `Ready`, `Active`, `Finished`, `Archived`), ativação não-destrutiva e catálogo com filtros por status no cockpit.
- **Milestone 3B (Pitch Lifecycle Engine)**: Máquina de estados formal do pitch (6 estágios: `Waiting`, `PitchRunning`, `QA`, `VotingOpen`, `VotingClosed`, `Finished`), validação de transições via HTTP 422, evento `PitchStageChanged` e stepper visual.
- **Milestone 3C (Pitch Timers & Authoritative Lockout)**: Cronômetro oficial no backend, pause/resume/add-time sem drift, sincronização SignalR `PitchTimerUpdated`, e bloqueio físico/digital de votação (`HTTP 409 Conflict`) fora de `VotingOpen`.
- **Milestone 3D (Round History & Result Engine)**: Arquivamento imutável de rodadas com apuração em dois níveis: `Result` (`Approved`, `Rejected`, `Inconclusive`) e `ApprovalMode` (`Unanimous`, `Majority`, `Minority`, `None`), snapshots imutáveis e evento `RoundArchived`.
- **Milestone 3E (Judges & Jury System)**: Catálogo global de jurados, alocação de cadeiras 1..5 (`EventJuryAssignment`), dock cênico no telão 3D (`StageJuryDock`) e correlação nominal no histórico de rodadas.

#### Validação
- 466 testes automatizados aprovados em 9 suítes.

---

## [0.2.0-phase2] - 2026-11-07
### Conclusão Oficial da Fase 2: Event Setup & Project Management

#### Adicionado
- **Domain Models & Store**: Entidades `Event`, `Project`, `BrandingConfig`, `ProjectMedia`, `ActiveContext` e store thread-safe `ArenaProjectStore`.
- **REST APIs & SignalR**: CRUD de projetos, seleção atômica de pitch no palco, eventos `CurrentProjectChanged` e `EventBrandingUpdated`.
- **Mesa Técnica (Operator UI)**: Interface com sub-navegação em 4 abas contextuais e formulários de gestão em React 19.
- **Telão 3D Dinâmico**: Anfiteatro procedural Three.js com iluminação neon reativa ao branding do evento e comemoração de unanimidade.

#### Validação
- 191 testes automatizados aprovados em 4 suítes.

---

## [0.1.0-phase1] - 2026-11-05
### Conclusão Oficial da Fase 1: Fundação de Software e Hardware

#### Adicionado
- **Roteamento SPA**: Separação física entre `/stage` (experiência pública cênica) e `/operator` (mesa técnica).
- **Telão Cênico 3D**: Superfície 100% contemplativa sem botões de depuração técnica.
- **Cockpit Operacional 2D**: Dashboard com telemetria das 5 cadeiras, placar e histórico de eventos.
- **Reset Autoritativo**: Endpoint `POST /api/reset` e broadcast SignalR `ChairsReset`.
- **Firmware ESP32**: Conexão com botão arcade microswitch com debounce e feedback LED.

#### Validação
- 48 testes de API e 46 testes de SignalR aprovados.
