# Índice Histórico de Marcos (Milestone History)
## Plataforma Arena Voice / Arena de Inovação

> **Status Geral do Projeto:** FASE 2 CONCLUÍDA E HOMOLOGADA (Milestones 2A, 2B, 2C, 2D e 2E Concluídos)  
> **Tag Estável Mais Recente:** `v0.2.0-phase2` (Encerramento da Fase 2)  
> **Última Atualização:** Novembro de 2026 (Consolidação Final e Fechamento da Fase 2)

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
| **3** | **3B** | Pitch Lifecycle & Timers | 📅 Próximo | Máquina de estados da rodada e cronômetro sincronizado via SignalR | Planejado | - |
| **3** | **3C** | Chair Lockout & Security | 📅 Futuro | Bloqueio autoritativo de virada de cadeiras pós-cronômetro | Planejado | - |
| **3** | **3D** | Evaluator Governance & Scorecards | 📅 Futuro | Jurados nominais nas 5 cadeiras e notas quantitativas | Planejado | - |
| **3** | **3E** | Analytics, Reporting & Phase 3 Closure | 📅 Futuro | Ata executiva em PDF/CSV e tag v0.3.0-phase3 | Planejado | - |

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
- **2D (Stage Projection & Dynamic Experience):** Transformação integral do telão cênico 3D (`/stage`) na identidade definitiva da Arena de Inovação:
  - **2D.1 (Infraestrutura de Dados & HUD Cênico):** Conexão do telão ao `OperatorContext`, projeção institucional do evento ativo no topo e card broadcast `StageProjectBanner` no rodapé com fallback offline de logo e mídia.
  - **2D.2 (Higienização Visual):** Purga completa do modelo externo `studio.glb`, letreiro "THE VOICE", pedestal de microfone, praticável de cantor e substituição das inscrições das cadeiras para "★ APOIADO ★" / "— EM AVALIAÇÃO —".
  - **2D.3 (Cenografia e Escala de Anfiteatro):** Criação da arquitetura cênica em Three.js procedural: Arena Geral (piso escuro $Y=0$) > Palco da Startup (plataforma intermediária laqueada $Y=0.18\,\text{m}$) > Pódio do Pitch (plataforma elevada $Y=0.34\,\text{m}$), 4 patamares de arquibancada com degraus balizados e portal com 3 arcos de keynote corporativo.
  - **2D.4 (Neons Dinâmicos & Theming Reativo):** Conexão em tempo real de `primaryColor` e `secondaryColor` aos materiais emissores do palco, arcos e pódio com interpolação suave via GSAP (1.0s a 1.2s), protagonismo das cadeiras (spotlight de 45, botão emissivo, halo secundário e pedestal glow), e efeito especial de celebração institucional de Unanimidade (5 de 5 cadeiras apoiando).
  - **2D.5 (Homologação Integrada, Resiliência & Fechamento):** Validação dos 6 cenários operacionais, teste de queda/reconexão com protocolo Snapshot-First (ADR-002), suíte formal de homologação com 35 verificações (191 testes no total, 100% verde), inspeção em Edge/Chrome Full HD e fechamento oficial do marco.
- **2E (Phase 2 Validation & Closure):** Auditoria integral de governança, consolidação das 4 suítes de testes automatizados (191 testes 100% verdes), homologação das decisões de arquitetura (ADR-001 a ADR-008), catalogação das dívidas técnicas (P0: 0), geração das release notes profissionais da Fase 2, encerramento formal da Fase 2 e emissão da tag `v0.2.0-phase2`.

### Fase 3 — Event Governance, Pitch Dynamics & Evaluator Experience (Em Andamento)
- **3A (Event Lifecycle & Management):** Implementação da governança e catálogo de eventos com modelo explícito de 5 estados (`Draft`, `Ready`, `Active`, `Finished`, `Archived`). Introdução de ativação atômica não-destrutiva (evento ativo anterior retorna para `Ready`), ações explícitas de encerramento (`finish`) e arquivamento protegido com `HTTP 409 Conflict`, duplicação para novos ciclos em `Draft`, 8 novos endpoints REST, reatividade SignalR com `ActiveEventChanged` e painel com abas de filtros por status e `ColorSwatch` no cockpit do operador. Suíte automatizada expandida para 229 testes (100% verdes).
- **3B (Pitch Lifecycle & Timers):** Máquina de estados de rodada de pitch (`Waiting`, `PitchRunning`, `Q&A`, `VotingClosed`) e cronômetro cênico sincronizado via SignalR no HUD do telão e cockpit (Planejado).
- **3C (Chair Lockout & Security):** Bloqueio autoritativo de virada de cadeiras pós-cronômetro (`HTTP 423 Locked`) e feedback para o microcontrolador ESP32 (Planejado).
- **3D (Evaluator Governance & Nominals):** Cadastro nominal e fotos dos jurados nas 5 cadeiras e scorecards qualitativos (Planejado).
- **3E (Analytics & Phase 3 Closure):** Exportação de ata executiva em PDF/CSV, homologação integrada e emissão da tag `v0.3.0-phase3` (Planejado).

---

## 4. Referências Documentais Rápidas
- **Diário Técnico de Implementação:** [`docs/archives/implementation-history.md`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/docs/archives/implementation-history.md)
- **Retrospectiva da Fase 1:** [`docs/archives/phase1-retrospective.md`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/docs/archives/phase1-retrospective.md)
- **Log de Planejamento da Fase 2:** [`docs/archives/phase2-planning-log.md`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/docs/archives/phase2-planning-log.md)
- **Catálogo de Decisões de Arquitetura (ADRs):** [`docs/archives/decision-records/`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/docs/archives/decision-records/)
