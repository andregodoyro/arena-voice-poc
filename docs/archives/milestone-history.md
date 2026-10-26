# Índice Histórico de Marcos (Milestone History)
## Plataforma Arena Voice / Arena de Inovação

> **Status Geral do Projeto:** FASE 2 EM ANDAMENTO (Milestones 2A e 2B Concluídos e Homologados)  
> **Tag Estável Mais Recente:** `v0.1.0-phase1` (Encerramento da Fase 1)  
> **Última Atualização:** Outubro de 2026

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
| **2** | **2C** | Operator Project Management UI | ⏳ Planejado | Interface com abas (Cockpit, Projetos, Evento) | Wireframes homologados | - |
| **2** | **2D** | Stage Projection & Theming | ⏳ Pendente | Projeção cênica do pitch no telão 3D e neons dinâmicos | Consumo SignalR no Telão | - |
| **2** | **2E** | Phase 2 Validation & Closure | ⏳ Pendente | Homologação integrada ponta a ponta e tag da Fase 2 | Tag `v0.2.0-phase2` | - |
| **3** | **-** | Dynamic Round Management | 📅 Futuro | Ciclos de votação, cronômetro e bloqueio de cadeiras | Planejado | - |
| **4** | **-** | Multi-Evaluator Governance | 📅 Futuro | Gestão de jurados e cadeiras nominais | Planejado | - |

---

## 3. Resumo por Marco

### Fase 1 — Fundação de Software e Hardware (Concluída)
- **1A (Routing Foundation):** Separação estrita de rotas entre a visão pública cênica (`/stage`) e a mesa técnica (`/operator`), eliminando a sobreposição de papéis em tela única.
- **1B (Public Stage Experience):** Transformação do telão em superfície exclusivamente contemplativa, removendo botões interativos e depuração técnica da visão do público.
- **1C (Operator Dashboard):** Construção do cockpit operacional com telemetria das 5 cadeiras, placar 2D em tempo real e histórico de eventos.
- **1D (Authoritative Reset):** Criação do fluxo de reset autoritativo pelo backend (`POST /api/reset`), acionando o broadcast SignalR `ChairsReset` com retorno das cadeiras para a posição 0° via GSAP.
- **1E (Technical Cleanup & Closure):** Remoção de hooks e estados órfãos (`HUD.jsx`, `toggleChairManual`, `turnAllChairs`, raycasting 3D inerte) e consolidação da documentação da Fase 1, tagueada como `v0.1.0-phase1`.

### Fase 2 — Event Setup & Project Management (Em Andamento)
- **2A (Domain Models & Store):** Introdução das entidades fundamentais do negócio (`Event`, `Project`, `BrandingConfig`, `ProjectMedia`, `ActiveContext`) e implementação do `ArenaProjectStore` como Singleton thread-safe com seed offline de 5 projetos. Enriquecimento aditivo do snapshot `GET /api/state`.
- **2B (REST APIs & SignalR Contracts):** Implementação de 8 endpoints REST com validações rigorosas (CRUD de projetos, alteração de branding do evento ativo, workflow de seleção atômica no palco e proteção `HTTP 409 Conflict` contra exclusão de pitch ativo) e 2 contratos SignalR (`CurrentProjectChanged`, `EventBrandingUpdated`). Suíte de testes expandida para 156 verificações automatizadas com 100% de sucesso.
- **2C (Operator Project Management Interface):** Construção da interface administrativa do operador em React 19 com sub-navegação em abas (`/operator/cockpit`, `/operator/projects`, `/operator/event`), formulários modais de cadastro e edição de pitches, e seleção autoritativa com proteção contra duplo clique.
- **2D (Stage Projection & Theming):** Integração visual do telão público 3D (`/stage`), exibindo dinamicamente o título do projeto, trilha, líder e aplicando as cores do branding aos neons e luzes cênicas via WebSockets.
- **2E (Phase 2 Validation & Closure):** Bateria de testes integrados ponta a ponta, fechamento documental formal da Fase 2 e criação da tag `v0.2.0-phase2`.

---

## 4. Referências Documentais Rápidas
- **Diário Técnico de Implementação:** [`docs/archives/implementation-history.md`](file:///c:/Users/ANDREROC/Documents/arena-voice/arena-voice-poc/docs/archives/implementation-history.md)
- **Retrospectiva da Fase 1:** [`docs/archives/phase1-retrospective.md`](file:///c:/Users/ANDREROC/Documents/arena-voice/arena-voice-poc/docs/archives/phase1-retrospective.md)
- **Log de Planejamento da Fase 2:** [`docs/archives/phase2-planning-log.md`](file:///c:/Users/ANDREROC/Documents/arena-voice/arena-voice-poc/docs/archives/phase2-planning-log.md)
- **Catálogo de Decisões de Arquitetura (ADRs):** [`docs/archives/decision-records/`](file:///c:/Users/ANDREROC/Documents/arena-voice/arena-voice-poc/docs/archives/decision-records/)
- **Auditoria do Marco 1:** [`docs/software-foundation-audit.md`](file:///c:/Users/ANDREROC/Documents/arena-voice/arena-voice-poc/docs/software-foundation-audit.md)
