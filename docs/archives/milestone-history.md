# Índice Histórico de Marcos (Milestone History)
## Plataforma Arena Voice / Arena de Inovação

> **Status Geral do Projeto:** FASE 3 CONCLUÍDA E HOMOLOGADA (Milestones 3A, 3B, 3C, 3D e 3E Concluídos)  
> **Tag Estável Mais Recente:** `v0.3.0-phase3` (Encerramento da Fase 3)  
> **Cobertura Automatizada:** 466 verificações em 9 suítes (100% aprovadas, zero regressões)  
> **Última Atualização:** Novembro de 2026 (Consolidação Final e Fechamento da Fase 3)

---

## 1. Visão Executiva

O **Arena Voice** é uma plataforma cênica e operacional para dinâmicas de apresentação de pitches de inovação inspirada no formato "The Voice". Avaliadores e técnicos sentam-se em cadeiras físicas que giram 180° quando acionadas via botões físicos (hardware ESP32 via Wi-Fi) ou comandos de bancada, sincronizadas em tempo real via WebSockets (SignalR) com uma cena 3D interativa de telão (Three.js / React 19) e um cockpit de controle da mesa técnica (Operator UI).

Este documento é a **fonte oficial de índice de marcos**, permitindo rastrear o status de cada entrega, métricas de validação, commits e tags de fechamento.

---

## 2. Tabela Mestra de Marcos

| Fase | Marco | Nome do Marco | Status | Validações Principais | Artefatos e Testes | Tag / Versão |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: |
| **1** | **1A** | Routing Foundation | ✅ Concluído | Rotas `/stage` e `/operator` via React Router 7 | Frontend Build OK | `v0.1.0-phase1` |
| **1** | **1B** | Public Stage Experience | ✅ Concluído | Telão cênico 3D com HUD limpo (sem botões de controle) | Sanitização do HUD | `v0.1.0-phase1` |
| **1** | **1C** | Operator Operational Dashboard | ✅ Concluído | Cockpit operacional 2D com status das 5 cadeiras e placar | Placar + Grade 2D | `v0.1.0-phase1` |
| **1** | **1D** | Authoritative Reset Flow | ✅ Concluído | `POST /api/reset` zerando cadeiras via SignalR `ChairsReset` | 48 testes API / 46 SignalR | `v0.1.0-phase1` |
| **1** | **1E** | Technical Cleanup & Documentation | ✅ Concluído | Remoção de código morto, purga de listeners 3D e docs | Tag formal de encerramento | `v0.1.0-phase1` |
| **2** | **2A** | Domain Models & In-Memory Store | ✅ Concluído | Entidades `Event`, `Project`, `BrandingConfig`, `ActiveContext` | Snapshot `/api/state` | main |
| **2** | **2B** | REST APIs & SignalR Contracts | ✅ Concluído | CRUD Projetos, Seleção Atômica, 409 Conflict, Realtime | 156 testes (48+53+55) | main |
| **2** | **2C** | Operator Project & Event Management UI | ✅ Concluído | Mesa Técnica Completa & Realtime Sync (2C.1 a 2C.5) | Frontend Build OK / 156 testes | main |
| **2** | **2D** | Stage Projection & Dynamic Experience | ✅ Concluído | Telão 3D institucional, anfiteatro, pódio de pitch, neons e branding dinâmico (2D.1 a 2D.5) | 191 testes (156 base + 35 homolog) | main |
| **2** | **2E** | Phase 2 Validation & Closure | ✅ Concluído | Homologação integrada, governança, release notes e fechamento | 191 testes / Build verde | `v0.2.0-phase2` |
| **3** | **3A** | Event Lifecycle & Management | ✅ Concluído | 5 estados (Draft, Ready, Active, Finished, Archived), ativação não-destrutiva, catálogo no cockpit | 229 testes (191 base + 38 events) | main |
| **3** | **3B** | Pitch Lifecycle Engine | ✅ Concluído | Máquina de estados formal (6 estágios), 422 Unprocessable, reset cadeiras, SignalR PitchStageChanged | 305 testes (229 base + 76 pitch) | main |
| **3** | **3C** | Pitch Timers & Authoritative Lockout | ✅ Concluído | Cronômetro ancorado em timestamp, pause/resume sem drift, +tempo, lockout 409 Conflict fora de VotingOpen | 355 testes (305 base + 50 timers) | main |
| **3** | **3D** | Round History & Result Engine | ✅ Concluído | Snapshot imutável de rodada, Result (Approved/Rejected/Inconclusive), ApprovalMode (Unanimous/Majority/Minority/None) | 416 testes (355 base + 61 history) | main |
| **3** | **3E** | Judge Catalog & Event Jury Assignment | ✅ Concluído | Catálogo global de jurados, alocação nas cadeiras 1..5, StageJuryDock, integração com RoundHistoryEntry | 466 testes (416 base + 50 jury) | `v0.3.0-phase3` |
| **4** | **4A** | Storage Engine & Relational Schema | 📅 Próximo | SQLite WAL Mode, schema relacional estrito, Foreign Keys & Check Constraints | Testes de migração e integridade | `v0.4.0-phase4` |
| **4** | **4B** | State Persistence & Session Re-hydration | 📅 Próximo | `SqliteArenaProjectStore`, re-hidratação de sessão, Crash Boot Recovery | Testes de persistência e re-hidratação | `v0.4.0-phase4` |
| **4** | **4C** | Operational Audit Trail & Event Sourcing Leve | 📅 Próximo | Tabela `AuditEvents`, ActivityLog persistido, rastreabilidade de operações críticas | Testes de auditoria e rastreabilidade | `v0.4.0-phase4` |
| **4** | **4D** | Automated Snapshots, Backup & Disaster Recovery | 📅 Próximo | `VACUUM INTO` hot-backup, snapshots automáticos, Recovery Manager | Testes de backup e recuperação de desastre | `v0.4.0-phase4` |
| **4** | **4E** | Chaos Engineering & Reliability Test Suite | 📅 Próximo | `test-chaos-reliability.cjs`, simulações de falha, validação de idempotência | 50+ asserções de caos e confiabilidade | `v0.4.0-phase4` |
| **5** | **5A-5D** | Live Show Experience (Áudio & Dinâmicas) | 🔮 Futuro | Integração de áudio cênico, dinâmicas de show ao vivo, animações de entrada | A definir na Fase 5 | `v0.5.0-phase5` |
| **6** | **6A-6C** | Awards, Ranking & Reports | 🔮 Futuro | Pódio de premiação, ranking acumulado, exportação PDF/CSV de resultados | A definir na Fase 6 | `v0.6.0-phase6` |
| **7** | **7A-7C** | Operational Hardening & Fleet Management | 🔮 Futuro | Multi-dispositivo, monitoramento de frota, hardening operacional | A definir na Fase 7 | `v0.7.0-phase7` |
| **8** | **8A-8C** | Evaluator Portal & Scorecards (Satélite) | 🔮 Futuro | Portal web do avaliador, critérios quantitativos, scorecards digitais (módulo satélite) | A definir na Fase 8 | `v0.8.0-phase8` |

---

## 3. Resumo por Marco

### Fase 1 — Fundação de Software e Hardware (Concluída)
- **1A (Routing Foundation):** Separação estrita de rotas entre a visão pública cênica (`/stage`) e a mesa técnica (`/operator`), eliminando a sobreposição de papéis em tela única.
- **1B (Public Stage Experience):** Transformação do telão em superfície exclusivamente contemplativa, removendo botões interativos e depuração técnica da visão do público.
- **1C (Operator Dashboard):** Construção do cockpit operacional com telemetria das 5 cadeiras, placar 2D em tempo real e histórico de eventos.
- **1D (Authoritative Reset):** Criação do fluxo de reset autoritativo pelo backend (`POST /api/reset`), acionando o broadcast SignalR `ChairsReset` com retorno das cadeiras para a posição 0° via GSAP.
- **1E (Technical Cleanup & Closure):** Remoção de hooks e estados órfãos (`HUD.jsx`, `toggleChairManual`, `turnAllChairs`, raycasting 3D inerte) e consolidação da documentação da Fase 1, tagueada como `v0.1.0-phase1`.

### Fase 2 — Event Setup & Project Management (Concluída)
- **2A (Domain Models & Store):** Introdução das entidades fundamentais do negócio (`Event`, `Project`, `BrandingConfig`, `ProjectMedia`, `ActiveContext`) e implementação do `ArenaProjectStore` como Singleton thread-safe com seed offline de 5 projetos. Enriquecimento aditivo do snapshot `GET /api/state`.
- **2B (REST APIs & SignalR Contracts):** Implementação de 8 endpoints REST com validações rigorosas (CRUD de projetos, alteração de branding do evento ativo, workflow de seleção atômica no palco e proteção `HTTP 409 Conflict` contra exclusão de pitch ativo) e 2 contratos SignalR (`CurrentProjectChanged`, `EventBrandingUpdated`). Suíte de testes expandida para 156 verificações automatizadas com 100% de sucesso.
- **2C (Operator Project & Event Management Interface):** Construção completa da interface administrativa do operador em React 19 com sub-navegação em abas (`/operator/cockpit`, `/operator/projects`, `/operator/event` - 2C.1), visualização dos dados de pitches e branding (2C.2), formulários modais de CRUD de projetos com proteção 409 e UX refinada (2C.3), gestão operacional de evento e branding cênico com ColorSwatch e preview em tempo real (2C.4) e integração realtime com resync autoritativo via SignalR para projetos, branding, cadeiras e reset com detecção de queda e recuperação automática de conexão (2C.5).
- **2D (Stage Projection & Dynamic Experience):** Transformação integral do telão cênico 3D (`/stage`) na identidade definitiva da Arena de Inovação com cenografia procedural (Arena > Palco > Pódio), neons dinâmicos conectados ao branding e celebração de Unanimidade (5/5 cadeiras).
- **2E (Phase 2 Validation & Closure):** Auditoria integral de governança, consolidação das 4 suítes de testes automatizados (191 testes 100% verdes), homologação das decisões de arquitetura (ADR-001 a ADR-008) e emissão da tag `v0.2.0-phase2`.

### Fase 3 — Event Governance, Pitch Dynamics & Jury (Concluída e Homologada)
- **3A (Event Lifecycle & Management):** Implementação da governança e catálogo de eventos com modelo explícito de 5 estados (`Draft`, `Ready`, `Active`, `Finished`, `Archived`). Ativação atômica não-destrutiva (evento ativo anterior retorna para `Ready`), ações explícitas de encerramento (`finish`) e arquivamento protegido com `HTTP 409 Conflict`, duplicação para novos ciclos em `Draft`, 8 novos endpoints REST, reatividade SignalR com `ActiveEventChanged` e painel com abas de filtros por status e `ColorSwatch` no cockpit do operador. Suíte automatizada expandida para **229 testes** (100% verdes).
- **3B (Pitch Lifecycle Engine):** Implementação da máquina de estados operacional do pitch com 6 estados formais (`Waiting = 0`, `PitchRunning = 1`, `QA = 2`, `VotingOpen = 3`, `VotingClosed = 4`, `Finished = 5`) acoplada a `ActiveContext`, endpoint canônico de transição `POST /api/pitch/transition` com validação rígida e rejeição `HTTP 422 Unprocessable Entity` para transições ilegais, estado `Finished` estritamente terminal, reset de pitch (`POST /api/pitch/reset`) neutralizando as cadeiras para 0°, evento SignalR `PitchStageChanged`, Stepper visual e controles no cockpit do operador, e badge cênico do estágio no telão público (`StageProjectBanner`). Suíte automatizada expandida para **305 testes** (100% verdes).
- **3C (Pitch Timers & Authoritative Lockout):** Implementação do cronômetro oficial de palco ancorado em `PitchStageStartedAt` no backend, com compensação acumulada de pausas (`TotalPausedSeconds`) para eliminação de drift. Sincronização contínua via evento `PitchTimerUpdated` (emissão periódica). Endpoints `POST /api/pitch/pause`, `resume` e `add-time` (+30s, +60s, +120s). Lockout autoritativo no `POST /api/chair-press`: fora de `VotingOpen` ou com timer pausado, retorna `HTTP 409 Conflict` (`{ accepted: false }`). Ticker local sincronizado no frontend do operador e no telão. StageHUD cênico com alerta visual dos últimos 15s e badge "PAUSADO". Suíte automatizada expandida para **355 testes** (100% verdes).
- **3D (Round History & Result Engine):** Arquivamento imutável de rodadas (`RoundHistoryEntry`) ao transicionar para `Finished` ou encerrar evento com rodada em andamento. Result Engine com classificação em dois níveis: `Result` (Approved/Rejected/Inconclusive) e `ApprovalMode` (Unanimous/Majority/Minority/None). Snapshot da rodada inclui histórico de estágios, composição da banca e registro individual de cadeiras. Proteção idempotente contra duplo arquivamento. Endpoints `GET /api/history` e `GET /api/history/{id}`. Evento `RoundArchived` via SignalR. Painel de histórico consultável no cockpit. Suíte automatizada expandida para **416 testes** (100% verdes).
- **3E (Judge Catalog & Event Jury Assignment):** Catálogo global de jurados corporativos (`Judge`) com campos `Id`, `Name`, `Company`, `Role`, `Specialty`, `Bio`, `PhotoUrl`, `IsActive`, `Email`. Alocação de jurados nas cadeiras 1 a 5 do evento via `EventJuryAssignment` e endpoint `PUT /api/events/{id}/jury`. Aba `/operator/judges` completa com CRUD e painel de alocação. Dock cênico nominal no telão (`StageJuryDock`) com avatares, nomes e anéis de neon reativos ao acionamento. Integração dos nomes de jurados com `RoundHistoryEntry`. Evento `EventJuryUpdated` via SignalR. Suíte automatizada expandida para **466 testes** (100% verdes). Tag `v0.3.0-phase3` emitida.

### Fase 4 — Platform Reliability & Data Resilience (Próxima Fase)

> **Branch planejada:** `feat/phase4-data-resilience`  
> **Estratégia:** SQLite em WAL mode com `Microsoft.Data.Sqlite` (ADR-016)  
> **Prioridade:** Confiabilidade operacional antes de expansão de features (ADR-017)

- **4A (Storage Engine & Relational Schema):** Substituição do `ArenaProjectStore` em memória por `SqliteArenaProjectStore` com banco embedded. Schema relacional estrito com tabelas normalizadas para `Events`, `Projects`, `Judges`, `EventJuryAssignments`, `PitchHistory`, `AuditEvents`. WAL mode ativado, `PRAGMA foreign_keys = ON` e `CHECK CONSTRAINTS` em todas as colunas críticas.
- **4B (State Persistence & Session Re-hydration):** Persistência completa do estado operacional da arena entre reinicializações do backend. Implementação do `Crash Boot Recovery`: ao inicializar, o backend detecta sessão interrompida e restaura o `ActiveContext` com o último estado coerente gravado. Zero perda de estado operacional em quedas de energia.
- **4C (Operational Audit Trail & Event Sourcing Leve):** Tabela `AuditEvents` registrando automaticamente toda ação crítica do sistema (seleção de projeto, transição de pitch, acionamento de cadeira, encerramento de rodada). Integração com o `ActivityLog` do frontend para sincronia de histórico pós-reconexão. Rastreabilidade de operações para suporte e auditoria pós-evento.
- **4D (Automated Snapshots, Backup & Disaster Recovery):** Sistema de hot-backup via `VACUUM INTO` para snapshots automáticos do banco. Snapshots pré-evento, pós-rodada e agendados por intervalo. `RecoveryManager` com seleção do snapshot mais recente coerente em caso de corrupção. Preservação do histórico completo de edições entre sessões.
- **4E (Chaos Engineering & Reliability Test Suite):** Suíte `test-chaos-reliability.cjs` simulando falhas reais: queda de energia mid-session, corrupção de banco, restart durante votação ativa, replay de rollback e validação de idempotência em todas as operações críticas. Meta: 50+ asserções de confiabilidade com 100% de aprovação.

---

## 4. Sprints de Correção (Pós-Entrega)

### Bugfix Sprint Pós-3D — EventModal Clock Import & Stage Timer Ticker
- **Período:** Pós-validação do Milestone 3D
- **BUG #1 (Event Editor Crash):** Tela preta ao editar qualquer evento em `/operator/event`. Causa raiz: `EventModal.jsx` referenciava o componente `Clock` sem importar o ícone da biblioteca `lucide-react`. Correção: adição de `Clock` ao bloco de imports.
- **BUG #2 (Stage Timer Estático):** Cronômetro do telão pequeno e virtualmente estático, não acompanhando pause/resume/add-time. Causa raiz: ausência de ticker local sincronizado no Stage (diferente do Operator). Correção: implementação do hook `useStageTimer` com ticker local ancorado em `remainingSeconds`, respeitando todos os eventos `PitchTimerUpdated` e `PitchStageChanged`. Aumento significativo da visibilidade do cronômetro no telão e badge "PAUSADO".

### Bugfix Sprint Pós-3A — Active Event In-Place Editing Fix
- **Período:** Validação funcional integrada
- **BUG:** Edição comum de evento ativo (TimerConfig, Branding, Nome) via `PUT /api/events/{id}` retornava mensagem de erro sobre promoção para `Active` via PUT, mesmo sem o operador tentar alterar o status.
- **Causa raiz:** O payload de edição incluía o campo `status` com o valor `Active` (refletindo o estado atual), e o backend interpretava isso como tentativa de promoção direta para `Active` via PUT (ação bloqueada por design).
- **Correção:** Backend passou a ignorar o campo `status` no payload do `PUT /api/events/{id}` quando o valor recebido já é igual ao estado corrente do evento. Frontend ajustado para não enviar `status` no payload de edição de metadados.

---

## 5. Referências Documentais Rápidas
- **Índice Mestre da Documentação:** [`docs/README.md`](../README.md)
- **Diário Técnico de Implementação:** [`docs/archives/implementation-history.md`](implementation-history.md)
- **Retrospectiva da Fase 1:** [`docs/archives/retrospectives/phase1-retrospective.md`](retrospectives/phase1-retrospective.md)
- **Retrospectiva da Fase 2:** [`docs/archives/retrospectives/phase2-retrospective.md`](retrospectives/phase2-retrospective.md)
- **Retrospectiva da Fase 3:** [`docs/archives/retrospectives/phase3-retrospective.md`](retrospectives/phase3-retrospective.md)
- **Catálogo de Decisões de Arquitetura (ADRs):** [`docs/decision-records/`](../decision-records/)
- **Arquitetura Técnica Completa:** [`docs/architecture.md`](../architecture.md)
- **Roadmap V2 (Linha Evolutiva Oficial):** [`docs/roadmap.md`](../roadmap.md)
- **ADR-016 — Estratégia de Persistência Offline-First (SQLite):** [`docs/decision-records/ADR-016-offline-first-persistence-strategy.md`](../decision-records/ADR-016-offline-first-persistence-strategy.md)
- **ADR-017 — Confiabilidade de Plataforma antes de Expansão de Features:** [`docs/decision-records/ADR-017-platform-reliability-over-feature-expansion.md`](../decision-records/ADR-017-platform-reliability-over-feature-expansion.md)
