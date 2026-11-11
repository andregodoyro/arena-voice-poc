# Arena Voice — Plataforma de Avaliação e Espetáculo de Inovação

> **Status:** Fases 1 a 3 e Milestones 4A/4B Concluídos e Homologados \| 530/530 Testes Aprovados (100% Verde)  
> **Versão Estável Atual:** `v0.4.1-phase4b`  
> **Objetivo:** Plataforma completa para condução de bancas avaliadoras, pitch days e demo days corporativos com dinamismo cênico em tempo real, backend autoritativo, telão 3D procedural, cockpit operacional da mesa técnica e persistência relacional resiliente com recuperação automática pós-crash.

---

## 🏗️ 1. Visão Geral do Produto e Arquitetura

O **Arena Voice** é uma plataforma corporativa configurável projetada para transformar bancas tradicionais de inovação e aceleração (Demo Days, Hackathons, mostras de MVPs e Pitch Days) em espetáculos dinâmicos e memoráveis inspirados no formato televisivo *The Voice* e *Shark Tank*.

A plataforma separa com rigor quatro papéis funcionais interligados por rede local:

```text
                                  REDE LOCAL / WI-FI (2.4 GHz)
             [Botão Físico ESP32]                   [Simulador de Testes]
             (GPIO 18 / Debounce)                   (scripts/simulate-esp32)
                      │                                       │
                      └───────────────────┬───────────────────┘
                                          │ HTTP POST /api/chair-press {"chairId": 1}
                                          ▼
                      ┌──────────────────────────────────────────────┐
                      │             BACKEND ARENA VOICE              │
                      │     ASP.NET Core (.NET 10 Minimal API)       │
                      │             Binds em 0.0.0.0:5000            │
                      ├──────────────────────────────────────────────┤
                      │ • ÚNICA FONTE DA VERDADE (ActiveContext)     │
                      │ • Governança de Eventos (Draft..Archived)    │
                      │ • Pitch Lifecycle Engine (6 Estágios)        │
                      │ • Timers Autoritativos & Lockout (HTTP 409)  │
                      │ • Round History & Result Engine              │
                      │ • Catálogo de Jurados & Alocação de Banca    │
                      │ • Hub SignalR Realtime em /hubs/arena-poc    │
                       │ • Persistência Relacional (PostgreSQL 18.6)  │
                      └──────────────┬───────────────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼ Broadcast Realtime (SignalR)                      ▼ Snapshot REST (/api/state)
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│      /stage — TELÃO PÚBLICO 3D       │     │    /operator — COCKPIT DA MESA       │
│    (Experiência Cênica / Telão)      │     │     (Gestão e Operação da Sessão)    │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│ • React 19 + Three.js + R3F + GSAP   │     │ • Dashboard Unificado em 4 Abas:     │
│ • Anfiteatro 3D procedural e pódio   │     │   - Cockpit: telemetria, stepper,    │
│ • Neons com theming reativo de cores │     │     timers, placar e reset           │
│ • Cronômetro central Glass-Panel HUD │     │   - Projetos: fila de startups       │
│ • Ficha da startup (StageProjectBanner)    │ • Evento: catálogo e branding      │
│ • Dock dos 5 jurados com foto e glow │     │   - Jurados: catálogo mestre e banca │
│ • 100% contemplativo (sem controles) │     │ • Ações de pitch, timers e lockout   │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## 🖥️ 2. Superfícies Disponíveis no Frontend

O frontend é uma SPA reativa desenvolvida em **React 19**, **Vite** e **TailwindCSS**, com roteamento oficial via **React Router**:

| Rota | Superfície | Público-Alvo | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **`http://localhost:5173/`** | Redirecionamento | Todos | Redireciona automaticamente para a experiência cênica `/stage`. |
| **`http://localhost:5173/stage`** | **Telão Público 3D** | Plateia / Startups | Projeção em tela cheia do anfiteatro 3D procedural, rotação das cadeiras via GSAP, cronômetro de broadcast, banner da startup e dock nominal dos jurados. Superfície 100% contemplativa sem botões interativos (ADR-009). |
| **`http://localhost:5173/operator`** | **Cockpit Operacional** | Mesa Técnica | Painel administrativo unificado estruturado em 4 abas contextuais persistentes (ADR-007). |

### Sub-Navegação da Mesa Técnica (`/operator/*`):
1. **`/operator/cockpit` (Cockpit ao Vivo):** Stepper visual de controle do pitch (6 estágios), controles de cronômetro (Pausar, Retomar, +30s, +60s, +120s), monitoramento individual das 5 cadeiras, placar consolidado e reset autoritativo.
2. **`/operator/projects` (Fila de Projetos):** Cadastro de startups, ordenação, edição de dados e workflow de seleção atômica no palco (`POST /api/projects/{id}/select`) com proteção `HTTP 409 Conflict`.
3. **`/operator/event` (Configurações do Evento):** Catálogo corporativo de eventos com filtros por status (`Draft`, `Ready`, `Active`, `Finished`, `Archived`), ativação atômica no palco, duplicação e seletor de paletas com `ColorSwatch`.
4. **`/operator/jury` (Banca & Jurados):** Alocação nominal dos 5 jurados às cadeiras físicas (`ChairId: 1..5`) e catálogo global de especialistas com fotos, bios, empresas e tags.

---

## ⚙️ 3. Motores de Negócio Homologados (Fase 3)

### 3.1. Governança e Ciclo de Vida de Eventos (Milestone 3A)
- Máquina de estados explícita: `Draft (0)`, `Ready (1)`, `Active (2)`, `Finished (3)` e `Archived (4)`.
- **Ativação Não-Destrutiva:** O endpoint `POST /api/events/{id}/activate` promove o evento para `Active` e retorna o evento ativo anterior para `Ready` (não para `Finished`), higienizando o palco para a nova dinâmica.
- Proteção `HTTP 409 Conflict` impedindo o arquivamento de eventos que estão ativos no palco.
- Duplicação para novos ciclos de aceleração em status `Draft`.

### 3.2. Pitch Lifecycle Engine (Milestone 3B)
- Máquina de estados formal de 6 estágios acoplada a `ActiveContext`:
  $$\text{Waiting (0)} \longrightarrow \text{PitchRunning (1)} \longrightarrow \text{QA (2)} \longrightarrow \text{VotingOpen (3)} \longrightarrow \text{VotingClosed (4)} \longrightarrow \text{Finished (5)}$$
- Validação estrita de transições com rejeição `HTTP 422 Unprocessable Entity` para pulos ou etapas ilegais.
- **Terminalidade de Finished:** O estágio `Finished` é estritamente terminal e conclui automaticamente o projeto no palco (`ProjectStatus.Completed`). O retorno para `Waiting` ocorre exclusivamente via seleção de uma nova startup.
- Endpoint `POST /api/pitch/reset`: neutraliza as 5 cadeiras para 0° e reinicia a rodada em `Waiting` mantendo o projeto atual selecionado.

### 3.3. Timers Autoritativos & Voting Lockout (Milestone 3C)
- **Timers Baseados em Timestamp:** Recálculo temporal de alta precisão ancorado em `stageStartedAt` e `totalPausedSeconds`, imune a travamentos ou perda de sincronia (*drift-free*).
- **Ações de Tempo:** Pausar (`/pause`), Retomar (`/resume`) e Ajustar Duração (+30s, +60s, +120s via `/adjust`).
- **Lockout Autoritativo de Votação:** Votos via hardware ESP32 ou HTTP são aceitos **exclusivamente durante o estágio `VotingOpen`**. Qualquer tentativa de voto em `Waiting`, `PitchRunning`, `QA`, `VotingClosed`, `Finished` ou enquanto o timer estiver pausado é rejeitada com **`HTTP 409 Conflict`**.

### 3.4. Round History & Result Engine (Milestone 3D)
- **Snapshot Imutável da Rodada:** Ao transicionar para `Finished` ou ao trocar de projeto durante um pitch em andamento, um registro histórico (`Round`) é congelado com durações, pausas, snapshot de timers e cadeiras viradas.
- **Classificação em Dois Níveis:**
  - `Result`: **`Approved (1)`** ($\ge 3$ cadeiras), **`Rejected (2)`** ($< 3$ cadeiras com votação aberta), **`Inconclusive (3)`** (interrompido antes de VotingOpen).
  - `ApprovalMode`: **`Unanimous (1)`** (5/5 cadeiras), **`Majority (2)`** (3-4/5 cadeiras), **`Minority (3)`** (1-2/5 cadeiras), **`None (0)`** (sem apoio ou inconclusivo).
- **Proteção Contra Double-Fire:** A troca de projeto após uma conclusão formal nunca duplica o arquivamento da rodada no histórico.

### 3.5. Catálogo de Jurados & Alocação de Banca (Milestone 3E)
- **Catálogo Global de Jurados (`Judge`):** Cadastro permanente de avaliadores com dados profissionais, fotos, bios, tags de especialidade e campos preventivos `IsActive` e `Email`.
- **Alocação de Banca (`EventJuryAssignment`):** Mapeamento das posições físicas de palco (`ChairId: 1..5`) para jurados específicos por evento, com validações de limites (1 a 5), unicidade de cadeiras e unicidade de jurados.
- **Soberania do Botão Físico:** A virada física de cadeira (`ChairTurned`) permanece como a decisão oficial e canônica em tempo real.
- **Dock de Jurados no Palco:** O Telão 3D exibe a banca no rodapé com realce luminoso, glow da cor primária e badge de apoio instantâneo quando a cadeira vira.

---

### 3.6. Persistência Relacional & Storage Engine (Milestone 4A)
- **PostgreSQL Portable 18.6:** Cluster ACID local executado sem instalador de SO e sem necessidade de permissões de administrador de TI.
- **EF Core 10 & Npgsql 10:** Modelagem objeto-relacional avançada com suporte nativo a 	ext[] (expertises de jurados), int[] (cadeiras que votaram) e jsonb (snapshots imutáveis de temporizadores).
- **DatabaseStartupValidator:** Teste de conectividade TCP em localhost:5432 no boot e aplicação automática e idempotente de migrações (InitialCreate).
- **Store Híbrido com IDbContextFactory:** PostgresArenaProjectStore isola contextos efêmeros por operação de banco e mantém o estado de palco em tempo real em memória.
- **Sobrevivência Pós-Restart:** Registros de eventos, startups, jurados e histórico persistem intactos após encerramento forçado e reinicialização a frio.
## 📡 4. Contratos de Comunicação e APIs

### Endpoints REST Auditados

| Método | Endpoint | Papel | Resposta |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/status` | Health check de prontidão | `200 OK` |
| `GET` | `/api/state` | Snapshot autoritativo completo (cadeiras, evento, projeto, pitch, banca) | `200 OK` |
| `POST` | `/api/reset` | Reset autoritativo global das cadeiras para 0° | `200 OK` |
| `POST` | `/api/chair-press` | Ingestão oficial de voto de cadeira (ESP32 ou operador) com Lockout 409 | `200 OK` / `409 Conflict` |
| `POST` | `/api/support` | Alias de compatibilidade com acionamento legado | `200 OK` / `409 Conflict` |
| `GET` | `/api/events` | Lista catálogo de eventos com filtro opcional `?status=` | `200 OK` |
| `GET` | `/api/events/{id}` | Detalhes de um evento específico | `200 OK` / `404 Not Found` |
| `POST` | `/api/events` | Cadastro de novo evento no catálogo | `201 Created` / `400 Bad Request` |
| `PUT` | `/api/events/{id}` | Atualização de metadados, branding e timers (bloqueia ativação via PUT) | `200 OK` / `400 Bad Request` |
| `POST` | `/api/events/{id}/activate` | Ativação atômica não-destrutiva de evento no palco | `200 OK` |
| `POST` | `/api/events/{id}/finish` | Encerramento formal do evento | `200 OK` |
| `POST` | `/api/events/{id}/archive` | Arquivamento histórico (protegido com 409 se ativo) | `200 OK` / `409 Conflict` |
| `POST` | `/api/events/{id}/duplicate` | Clonagem de evento para novo ciclo em `Draft` | `201 Created` |
| `GET` | `/api/projects` | Lista projetos do evento ativo (`?includeCompleted=bool`) | `200 OK` |
| `POST` | `/api/projects` | Cadastro de nova startup na fila do evento | `201 Created` |
| `PUT` | `/api/projects/{id}` | Edição de startup existente | `200 OK` |
| `DELETE` | `/api/projects/{id}` | Exclusão de projeto (bloqueia projeto ativo no palco) | `200 OK` / `409 Conflict` |
| `POST` | `/api/projects/{id}/select` | Promoção atômica de startup para o palco e início de rodada | `200 OK` |
| `GET` | `/api/pitch/state` | Estado detalhado da máquina de pitch e timers | `200 OK` |
| `POST` | `/api/pitch/transition` | Transição canônica de estágio com validação estrita | `200 OK` / `422 Unprocessable` |
| `POST` | `/api/pitch/reset` | Reset do pitch para Waiting neutralizando cadeiras | `200 OK` |
| `POST` | `/api/pitch/timer/pause` | Congela o cronômetro oficial da rodada | `200 OK` |
| `POST` | `/api/pitch/timer/resume` | Retoma o cronômetro oficial sem salto temporal | `200 OK` |
| `POST` | `/api/pitch/timer/adjust` | Adiciona ou subtrai segundos do timer ativo (+30, +60, +120) | `200 OK` |
| `GET` | `/api/rounds` | Consulta histórico de rodadas arquivadas (`?eventId=`) | `200 OK` |
| `GET` | `/api/rounds/last` | Detalhes da última rodada arquivada | `200 OK` / `404 Not Found` |
| `GET` | `/api/rounds/{id}` | Detalhes de uma rodada específica por ID | `200 OK` / `404 Not Found` |
| `GET` | `/api/judges` | Catálogo global de jurados (`?includeInactive=bool`) | `200 OK` |
| `GET` | `/api/judges/{id}` | Detalhes de um jurado por ID | `200 OK` / `404 Not Found` |
| `POST` | `/api/judges` | Cadastro de jurado com validações estritas | `201 Created` / `400 Bad Request` |
| `PUT` | `/api/judges/{id}` | Atualização cadastral de jurado | `200 OK` |
| `DELETE` | `/api/judges/{id}` | Exclusão com proteção 409 se alocado na banca ativa | `200 OK` / `409 Conflict` |
| `GET` | `/api/events/{id}/jury` | Composição da banca (Cadeiras 1 a 5) do evento | `200 OK` |
| `PUT` | `/api/events/{id}/jury` | Alocação das 5 cadeiras da banca do evento | `200 OK` / `400 Bad Request` |

### Eventos em Tempo Real (SignalR Hub `/hubs/arena-poc`)

- `ChairTurned`: Notifica virada de cadeira `{ chairId, timestamp, source }`.
- `ChairsReset`: Notifica retorno de todas as cadeiras para a posição 0°.
- `CurrentProjectChanged`: Transmite a nova startup promovida para o palco.
- `EventBrandingUpdated`: Atualiza neons e paleta visual cênica do evento.
- `ActiveEventChanged`: Notifica troca de evento ativo na arena.
- `PitchStageChanged`: Notifica avanço de estágio na máquina de estados do pitch.
- `PitchTimerUpdated`: Sincroniza pausas, retomadas e ajustes do cronômetro.
- `RoundArchived`: Notifica arquivamento formal da rodada concluída com resultado.
- `EventJuryUpdated`: Notifica alterações na composição da banca avaliadora.

---

## 🚦 5. Status Atual do Projeto e Testes Automatizados

| Macrobloco | Escopo | Status |
| :--- | :--- | :---: |
| **Fase 1** | Operator + Stage Foundation (Cadeiras, Reset, 3D Canvas, SignalR) | ✅ **Concluída e Homologada** |
| **Fase 2** | Event Setup & Project Management (Startups, Branding Dinâmico, Anfiteatro 3D) | ✅ **Concluída e Homologada** |
| **Fase 3A** | Event Lifecycle & Governance (Draft, Ready, Active, Finished, Archived) | ✅ **Concluída e Homologada** |
| **Fase 3B** | Pitch Lifecycle Engine (6 Estágios de Apresentação, Validações 422) | ✅ **Concluída e Homologada** |
| **Fase 3C** | Pitch Timers, Pause/Resume & Voting Lockout (HTTP 409 Conflict) | ✅ **Concluída e Homologada** |
| **Fase 3D** | Round History & Result Engine (Approved, Rejected, Inconclusive) | ✅ **Concluída e Homologada** |
| **Fase 3E** | Judge Catalog & Event Jury Assignment (Banca 1..5, Palco Nominal) | ✅ **Concluída e Homologada** |
| **Fase 4** | Platform Reliability & Data Resilience (PostgreSQL Portable, Crash Recovery, Audit, Backup) | 📅 **Planejada (Próxima Fase)** |
| **Fase 5** | Live Show Experience & Audio Atmosphere (Áudio Cênico, Web Audio API, Sound FX) | 📅 **Roadmap V2** |
| **Fase 6** | Awards Ceremony, Ranking & Executive Reports (Pódio 3D, Ata Oficial PDF/CSV) | 📅 **Roadmap V2** |
| **Fase 7** | Operational Hardening, Contingency & Fleet Telemetry (Bypass no Cockpit, ESP32) | 📅 **Roadmap V2** |
| **Fase 8** | Evaluator Portal & Qualitative Rubrics (Módulo Satélite / Complementar) | 📅 **Roadmap V2** |

### Bateria Consolidada de Testes Automatizados (466 Asserções / 100% Verde):
```text
  tests/test-api.cjs               -> 48 / 48 PASS  (Hardware Bridge & Base API)
  tests/test-projects-api.cjs      -> 53 / 53 PASS  (Projects API & ActiveContext)
  tests/test-events-api.cjs        -> 38 / 38 PASS  (Event Lifecycle & Governance 3A)
  tests/test-signalr-e2e.cjs       -> 55 / 55 PASS  (SignalR Broadcasts & Sincronização)
  tests/test-pitch-lifecycle.cjs   -> 76 / 76 PASS  (Pitch Lifecycle Engine 3B)
  tests/homologation-2d5.cjs       -> 35 / 35 PASS  (Homologação E2E Palco 3D & Unanimidade)
  tests/test-timers-lockout.cjs    -> 50 / 50 PASS  (Timers, Pause/Resume & Lockout 3C)
  tests/test-round-history.cjs     -> 61 / 61 PASS  (Round History & Result Engine 3D)
  tests/test-judges-jury.cjs       -> 50 / 50 PASS  (Judge Catalog & Event Jury 3E)
  ──────────────────────────────────────────────────────────────────────────────
  TOTAL CONSOLIDADO                -> 466 / 466 PASS (Zero falhas, zero regressões)
```

---

## 💻 6. Execução e Desenvolvimento Local

### 1. Pré-Requisitos
- .NET 10 SDK (ou versão portátil configurada em `.env`)
- Node.js 20+ e npm
- Porta 5000 (Backend) e 5173 (Frontend) livres

### 2. Configuração de Ambiente
Copie o template de ambiente:
```cmd
copy .env.example .env
```

### 3. Inicialização dos Serviços
- **Backend:**
  ```cmd
  dotnet run --project backend\ArenaVoicePocBackend.csproj
  ```
- **Frontend:**
  ```cmd
  cd frontend
  npm install
  npm run dev
  ```

### 4. Execução da Bateria Completa de Testes
Com o backend em execução na porta 5000:
```cmd
node tests/test-api.cjs
node tests/test-projects-api.cjs
node tests/test-events-api.cjs
node tests/test-signalr-e2e.cjs
node tests/test-pitch-lifecycle.cjs
node tests/homologation-2d5.cjs
node tests/test-timers-lockout.cjs
node tests/test-round-history.cjs
node tests/test-judges-jury.cjs
node tests/test-postgres-persistence.cjs
```


---

## 📚 7. Documentação Técnica do Projeto

Consulte o **[Índice Mestre da Documentação (`docs/README.md`)](docs/README.md)** para acessar a estrutura organizada:

| Área Temática | Documentos Principais |
| :--- | :--- |
| **Arquitetura & Decisões** | [Arquitetura Geral (`docs/architecture.md`)](docs/architecture.md) • [Catálogo de ADRs — ADR-001 a ADR-019 (`docs/decision-records/`)](docs/decision-records/) |
| **Produto & Visão** | [Roadmap e Planejamento Progressivo (`docs/roadmap.md`)](docs/roadmap.md) |
| **Infraestrutura & Campo** | [Guia de Hardware ESP32 (`docs/hardware.md`)](docs/hardware.md) • [Guia de Rede e Hotspot (`docs/network.md`)](docs/network.md) |
| **Histórico Operacional** | [Tabela Mestra de Marcos (`docs/archives/milestone-history.md`)](docs/archives/milestone-history.md) • [Diário Técnico (`docs/archives/implementation-history.md`)](docs/archives/implementation-history.md) |
| **Retrospectivas** | [Fase 1](docs/archives/retrospectives/phase1-retrospective.md) • [Fase 2](docs/archives/retrospectives/phase2-retrospective.md) • [Fase 3](docs/archives/retrospectives/phase3-retrospective.md) |
| **Auditorias & Histórico** | [Auditoria Marco 1 (`docs/archives/audits/software-foundation-audit.md`)](docs/archives/audits/software-foundation-audit.md) • [Rascunho Inicial](docs/archives/historical/roadmap-initial.md) |
