# Índice Mestre da Documentação — Arena Voice

> **Status da Plataforma:** Fases 1 a 4 e Phase 5 (5A a 5C.5 Fase 1) Concluídas e Homologadas (`v0.5.0-phase5`)  
> **Cobertura Automatizada:** 705+ verificações automatizadas (100% aprovadas, zero falhas, zero regressões)  
> **Última Atualização:** Novembro de 2026

Bem-vindo ao índice central da documentação técnica e de produto do **Arena Voice**. Utilize este guia para navegar pelos documentos oficiais organizados por área temática.

---

## 🏛️ Arquitetura e Engenharia

Documentos que regem as regras de negócio, contratos de integração, padrões de projeto e decisões formais de engenharia:

- **[Arquitetura do Sistema (`docs/architecture.md`)](architecture.md):** Documento mestre da arquitetura. Detalha a separação dos quatro papéis (Operator, Stage, Backend, Infraestrutura), `ActiveContext`, ciclo de vida de eventos (5 estados), ciclo do pitch (6 estágios), cronômetros autoritativos, lockout físico/digital (HTTP 409), Result Engine em dois níveis, catálogo de jurados, tabela completa com os endpoints REST, contratos SignalR e o Motor de Mídia do Hero Showcase Wall.
- **[Registros de Decisão Arquitetural — ADRs (`docs/decision-records/`)](decision-records/):** Catálogo formal de decisões arquiteturais homologadas no projeto:
  - `ADR-001` a `ADR-010`: Fundações da Fase 1 e Fase 2 (Backend autoritativo, Snapshot-First, Desacoplamento Cênico, etc.).
  - `ADR-011` a `ADR-015`: Decisões críticas da Fase 3 (Governança de Eventos, Pitch Lifecycle, Timers & Lockout, Result Engine, Identidade de Jurados).
  - `ADR-016` a `ADR-022`: Decisões da Fase 4 (Persistência Offline-First, PostgreSQL Portable, EF Core 10, Snapshot Pattern, Crash Recovery).
  - `ADR-026`: React Three Fiber e Expansão para Live Show Imersivo.
  - `ADR-027`: Procedural Audio e Sincronização Audiovisual.
  - `ADR-028`: Firmware Architecture & Hardware Integration Strategy (ESP32).
  - `ADR-029`: Hero Wall Media Engine, Estados Narrativos e BroadcastChannel.
  - `ADR-030`: Persistência Relacional de Mídia de Projetos com JSONB.

---

## 🎬 Especificações e Relatórios da Phase 5 (Live Show Experience)

Documentos detalhados da evolução cênica e multimídia da arena:

- **[Phase 5C.1: Architectural Arena Redesign](phase-5c-1-arena-redesign.md):** Redesign da arena, cúpula zenital, pódio escalonado e paredes acústicas.
- **[Phase 5C.2: Hero Showcase Wall](phase-5c-2-hero-showcase-wall.md):** O projeto como protagonista absoluto no telão monumental.
- **[Phase 5C.2A: Hero Showcase Content Pass](phase-5c-2a-hero-showcase-content-pass.md):** Ocupação visual dominante e lower-thirds broadcast.
- **[Phase 5C.2B: Hero Wall Occupancy Pass](phase-5c-2b-hero-wall-occupancy-pass.md):** Telão panorâmico de 33.6m centralizado e upload de mídias.
- **[Phase 5C.3: Narrative States](phase-5c-3-narrative-states.md):** Máquina de estados narrativos do telão (`wallMode`) e loaders Drei.
- **[Phase 5C.4: Operator Media Controls](phase-5c-4-operator-media-controls.md):** Controles de Play/Pause/Restart no Cockpit.
- **[Phase 5C.4A: Operator Media Transport Controls](phase-5c-4a-operator-media-transport-controls.md):** Áudio, volume, timeline scrubbing e saltos de tempo.
- **[Phase 5C.5 Fase 1: Hero Wall Visual Clearance](phase-5c-5-hero-wall-visual-clearance.md):** Desobstrução visual frontal pela remoção do AmphitheaterSeating.

---

## 📘 Guias Operacionais e de Campo

Instruções práticas para operação do sistema e montagem de palco em eventos:

- **[Guia Operacional de Mídia no Cockpit (`docs/guides/cockpit-media-operations.md`)](guides/cockpit-media-operations.md):** Procedimentos para o operador conduzir a apresentação, gerenciar vídeos, volumes, timelines e troubleshooting de áudio.
- **[Guia de Arquitetura Cênica 3D (`docs/guides/arena-architecture.md`)](guides/arena-architecture.md):** Composição espacial da cena, hierarquia visual, dimensões e mapeamento de componentes de palco.
- **[Hardware e Firmware ESP32 (`docs/hardware.md`)](hardware.md):** Pinout do microcontrolador ESP32 DevKit V4, ligação do botão arcade microswitch, debounce de 50ms, rate limit de segurança e protocolo de feedback LED com tratamento de Lockout (`HTTP 200 OK` vs `HTTP 409 Conflict`).
- **[Configuração de Rede e Hotspot (`docs/network.md`)](network.md):** Guia passo a passo para configuração de rede local autônoma via hotspot Wi-Fi (2.4 GHz obrigatório), binding de portas, descoberta de IP local e configuração de segredos de conexão.
- **[Runbook de Disaster Recovery (`docs/runbooks/disaster-recovery-runbook.md`)](runbooks/disaster-recovery-runbook.md):** Procedimento de contingência e restauração out-of-process de backups.

---

## 🚀 Produto e Visão Estratégica

- **[Roadmap e Planejamento Progressivo (`docs/roadmap.md`)](roadmap.md):** Documento mestre de produto (Roadmap V2 — Show-Ready Architecture). Apresenta a visão geral da plataforma corporativa, o princípio de reutilização, histórico de fases entregues e planejamento das fases subsequentes.

---

## 📜 Histórico Operacional e Técnico (Memória do Projeto)

Registros acumulados de evolução contínua mantidos ativamente em todas as fases:

- **[Tabela Mestra de Marcos (`docs/archives/milestone-history.md`)](archives/milestone-history.md):** Visão executiva de todos os marcos entregues, status de homologação, contagem de testes por etapa e notas de encerramento.
- **[Diário Técnico de Implementação (`docs/archives/implementation-history.md`)](archives/implementation-history.md):** Registro granular de cada marco técnico implementado.
- **[Fechamento dos Milestones 5A e 5B (`docs/archives/milestones/Phase5AB-Closure-Report.md`)](archives/milestones/Phase5AB-Closure-Report.md):** Relatório de infraestrutura de áudio e sincronização cênica.
- **[Relatórios de Fechamento da Fase 4 (`docs/archives/milestones/`)](archives/milestones/):** Relatórios de 4A, 4B, 4C e 4D.

---

## 🔄 Retrospectivas de Fase

Documentos formais de fechamento, lições aprendidas e governança:

- **[Retrospectiva da Fase 1 (`docs/archives/retrospectives/phase1-retrospective.md`)](archives/retrospectives/phase1-retrospective.md):** Validação técnica da fundação de software e hardware (tag `v0.1.0-phase1`).
- **[Retrospectiva da Fase 2 (`docs/archives/retrospectives/phase2-retrospective.md`)](archives/retrospectives/phase2-retrospective.md):** Event Setup, gestão de projetos e cenografia 3D procedural (tag `v0.2.0-phase2`).
- **[Retrospectiva da Fase 3 (`docs/archives/retrospectives/phase3-retrospective.md`)](archives/retrospectives/phase3-retrospective.md):** Governança de eventos, motor de pitch e catálogo de jurados (tag `v0.3.0-phase3`).
