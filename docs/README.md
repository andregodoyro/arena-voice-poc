# Índice Mestre da Documentação — Arena Voice

> **Status da Plataforma:** Fase 3 Concluída e Homologada (`v0.3.0-phase3`)  
> **Cobertura Automatizada:** 466 verificações em 9 suítes (100% aprovadas, zero falhas, zero regressões)  
> **Última Atualização:** Novembro de 2026

Bem-vindo ao índice central da documentação técnica e de produto do **Arena Voice**. Utilize este guia para navegar pelos documentos oficiais organizados por área temática.

---

## 🏛️ Arquitetura e Engenharia

Documentos que regem as regras de negócio, contratos de integração, padrões de projeto e decisões formais de engenharia:

- **[Arquitetura do Sistema (`docs/architecture.md`)](architecture.md):** Documento mestre da arquitetura. Detalha a separação dos quatro papéis (Operator, Stage, Backend, Infraestrutura), `ActiveContext`, ciclo de vida de eventos (5 estados), ciclo do pitch (6 estágios), cronômetros autoritativos, lockout físico/digital (HTTP 409), Result Engine em dois níveis, catálogo de jurados, tabela completa com os 34 endpoints REST e 9 contratos SignalR.
- **[Registros de Decisão Arquitetural — ADRs (`docs/decision-records/`)](decision-records/):** Catálogo formal de todas as 17 decisões arquiteturais homologadas no projeto:
  - `ADR-001` a `ADR-010`: Fundações da Fase 1 e Fase 2 (Backend autoritativo, Snapshot-First, Desacoplamento Cênico, etc.).
  - `ADR-011` a `ADR-015`: Decisões críticas da Fase 3 (Governança de Eventos, Pitch Lifecycle, Timers & Lockout, Result Engine, Identidade de Jurados).
  - `ADR-016` e `ADR-017`: Decisões estratégicas da Fase 4 e Roadmap V2 (Persistência Offline-First com SQLite e Priorização de Confiabilidade sobre Telas Prematuras).

---

## 🚀 Produto e Visão Estratégica

- **[Roadmap e Planejamento Progressivo (`docs/roadmap.md`)](roadmap.md):** Documento mestre de produto (Roadmap V2 — Show-Ready Architecture). Apresenta a visão geral da plataforma corporativa, o princípio de reutilização, a evolução pós-Fase 3 (Fase 4: Confiabilidade e Dados; Fase 5: Áudio Cênico; Fase 6: Ranking e Relatórios; Fase 7: Hardening; Fase 8: Scorecards Satélite), glossário, matriz de rastreabilidade e análise de riscos.

---

## 🔌 Infraestrutura, Hardware e Rede de Campo

Guias práticos para montagem, configuração e operação física em eventos presenciais:

- **[Hardware e Firmware ESP32 (`docs/hardware.md`)](hardware.md):** Pinout do microcontrolador ESP32 DevKit V4, ligação do botão arcade microswitch, debounce de 50ms, rate limit de segurança e protocolo de feedback LED com tratamento de Lockout (`HTTP 200 OK` vs `HTTP 409 Conflict`).
- **[Configuração de Rede e Hotspot (`docs/network.md`)](network.md):** Guia passo a passo para configuração de rede local autônoma via hotspot Wi-Fi (2.4 GHz obrigatório), binding de portas, descoberta de IP local e configuração de segredos de conexão.

---

## 📜 Histórico Operacional e Técnico (Memória do Projeto)

Registros acumulados de evolução contínua mantidos ativamente em todas as fases:

- **[Tabela Mestra de Marcos (`docs/archives/milestone-history.md`)](archives/milestone-history.md):** Visão executiva de todos os marcos entregues (1A..1E, 2A..2E, 3A..3E), status de homologação, contagem de testes por etapa e notas de encerramento.
- **[Diário Técnico de Implementação (`docs/archives/implementation-history.md`)](archives/implementation-history.md):** Registro granular do *como* e do *porquê* de cada marco técnico implementado, incluindo classes criadas, rotas, contratos, testes associados e sprints de correção.

---

## 🔄 Retrospectivas de Fase

Documentos formais de fechamento, lições aprendidas e governança emitidos ao final de cada fase:

- **[Retrospectiva da Fase 1 (`docs/archives/retrospectives/phase1-retrospective.md`)](archives/retrospectives/phase1-retrospective.md):** Validação técnica da fundação de software e hardware (tag `v0.1.0-phase1`).
- **[Retrospectiva da Fase 2 (`docs/archives/retrospectives/phase2-retrospective.md`)](archives/retrospectives/phase2-retrospective.md):** Event Setup, gestão de projetos, anfiteatro 3D procedural e governança (tag `v0.2.0-phase2`).
- **[Retrospectiva da Fase 3 (`docs/archives/retrospectives/phase3-retrospective.md`)](archives/retrospectives/phase3-retrospective.md):** *[Documento reservado para o encerramento formal da Fase 3 — tag `v0.3.0-phase3`]*

---

## 📋 Auditorias e Conformidade

- **[Auditoria do Marco 1 (`docs/archives/audits/software-foundation-audit.md`)](archives/audits/software-foundation-audit.md):** Fotografia técnica oficial de encerramento do Marco 1, com auditoria de contratos, testes e limitações iniciais da prova de conceito.
- **[Rascunho Inicial de Roadmap (`docs/archives/historical/roadmap-initial.md`)](archives/historical/roadmap-initial.md):** Primeiro planejamento da POC preservado para fins de memória histórica.
