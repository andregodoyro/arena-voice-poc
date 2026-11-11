# Changelog — Arena Voice

Todas as alterações notáveis da plataforma Arena Voice são documentadas neste arquivo.  
O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
