# ROADMAP ARENA VOICE / ARENA DE INOVAÇÃO
## Versão 2.1 — Roadmap V2: Show-Ready & Production-Ready First

> **Classificação:** Documento Mestre de Produto e Arquitetura  
> **Status:** Fases 1 a 4 e Phase 5 (5A a 5C.5 Fase 1) Concluídas e Homologadas (`v0.5.0-phase5`)  
> **Cobertura Automatizada:** 705+ verificações em 15+ suítes de testes (100% aprovadas, zero falhas, zero regressões)  
> **Data de Atualização:** Novembro de 2026  
> **Público-alvo:** Desenvolvedores, arquitetos de software, product engineers e operadores de evento

---

## Sumário Executivo

O **Arena Voice** é uma plataforma interativa em tempo real projetada para bancas de avaliação e apresentação de projetos/MVPs corporativos. Evoluindo de uma inspiração inicial em formatos dinâmicos como *The Voice* e *Shark Tank*, a plataforma consolidou-se como uma **Arena Multimídia de Apresentação e Avaliação de Projetos** (*Keynote Arena*), transformando o projeto apresentado no protagonista absoluto da experiência visual através de um telão panorâmico monumental (*Hero Showcase Wall*).

### Novo Contexto de Produto e Princípio de Reutilização
O Arena Voice **NÃO é um sistema exclusivo da "Arena de Inovação"**. A *Arena de Inovação* representa apenas uma possível configuração e caso de uso da plataforma. O produto foi concebido como uma **plataforma configurável e reutilizável** para múltiplos contextos corporativos compatíveis:
- **Arena de Inovação** (avaliação de MVPs e projetos internos);
- **Demo Days** (apresentação de startups e squads de aceleração);
- **Pitch Days** (bancas de seleção e alocação de investimento);
- **Hackathons** (julgamento final de protótipos desenvolvidos);
- **Mostras de MVPs e feiras de tecnologia corporativa**.

**Regra de Reutilização:** O produto **não deve exigir alteração de código-fonte** para mudar o nome do evento, os projetos participantes, as equipes, as categorias, a ordem de apresentação, a identidade visual (logos, capas, cores, vídeos) ou os jurados. Todas essas variáveis são tratadas como **configuração e dados da plataforma**, administradas via painel operacional.

> [!IMPORTANT]
> **Síntese Arquitetural e de Experiência (Princípio Transversal):**  
> - **Operator** opera o evento e controla as mídias da apresentação.  
> - **Stage** apresenta o evento ao público com o projeto como protagonista.  
> - **Backend** executa as regras de negócio e mantém o estado oficial e a persistência relacional.  
> - **Infraestrutura** conecta as partes (comunicação SignalR, transporte BroadcastChannel e persistência PostgreSQL).  
> *APIs, protocolos de rede, mecanismos de transporte, modelos de armazenamento e detalhes de implementação permanecem encapsulados nas camadas técnicas e não fazem parte da linguagem padrão das interfaces do produto.*

---

## 1. Visão do Arena Voice

O Arena Voice transforma bancas tradicionais de inovação corporativa — tipicamente frias e centradas em planilhas manuais — em experiências dinâmicas, memoráveis e altamente visuais:
- **Tensão Cênica e Dramática:** Jurados decidem durante ou logo após a apresentação.
- **Feedback Sensorial Imediato:** Cada decisão aciona a rotação da cadeira 3D correspondente no telão com iluminação dinâmica e efeitos de palco.
- **Hero Showcase Wall Panorâmico:** O projeto ocupa de $75\%$ a $85\%$ do plano de fundo em formato $33.6\,\text{m} \times 11.6\,\text{m}$, com vídeos de alta definição, mockups e teses de inovação legíveis a distância.
- **Desacoplamento de Entradas:** O sistema aceita votos vindos de botões físicos arcade (com microcontroladores ESP32 em trilha de hardware paralela), interfaces web ou consoles manuais de operação.
- **Multi-Evento por Design:** O mesmo software atende a diferentes programas e edições com identidades visuais e mídias distintas.

---

## 2. Problema que a Plataforma Resolve

| Problema Antigo / Banca Tradicional | Solução do Arena Voice |
| :--- | :--- |
| Avaliação burocrática e postergada para formulários pós-apresentação. | Decisão em tempo real com reação instantânea no palco/telão. |
| Baixo engajamento da plateia e dos apresentadores. | Atmosfera de keynote imersivo e auditório de inovação contemporâneo. |
| Dependência de infraestruturas complexas de nuvem e internet estável em eventos. | Solução leve, autocontida, com operação em rede local (offline-first). |
| Fragilidade a oscilações de rede durante a dinâmica. | Arquitetura resiliente de dupla via: SignalR (push de eventos) + REST Snapshot (reidratação e reconciliação automática). |
| Customização por código para cada novo evento ou feira. | Plataforma configurável: evento, projetos, mídias, branding e banca definidos operacionalmente. |

---

## 3. Conceitos Principais e Princípio Arquitetural Operator + Stage

A arquitetura do Arena Voice adota como princípio basilar a separação estrita de responsabilidades entre superfícies conectadas a um backend autoritativo:

```text
                  ┌─────────────────────────────────┐
                  │        BACKEND ASP.NET          │
                  │   Mantém o Estado Oficial       │
                  │   Intermedeia a Sincronização   │
                  └────────┬───────────────┬────────┘
                           │ REST          │ SignalR
             ┌─────────────┘               └─────────────┐
             ▼                                           ▼
┌─────────────────────────┐                 ┌─────────────────────────┐
│     OPERATOR SCREEN     │                 │      STAGE SCREEN       │
│  "Configura e Opera"    │                 │   "Apresenta ao Público"│
│                         │                 │                         │
│ • Setup do Evento       │                 │ • Hero Showcase Wall    │
│ • Gestão de Projetos    │                 │ • Keynote Arena 3D      │
│ • Gestão da Banca       │                 │ • Identidade do Evento  │
│ • Controle da Rodada    │                 │ • Vídeo & Capa do Pitch │
│ • Controle de Mídia     │                 │ • Cadeiras & Placar     │
└─────────────────────────┘                 └─────────────────────────┘
```

1. **OPERATOR (Configura e Opera):** Dashboard administrativo e operacional único da plataforma estruturado em 4 abas (Cockpit, Projetos, Evento, Jurados). O Cockpit incorpora controles profissionais de transporte de mídia (Play, Pause, Restart, Scrubbing e Volume) comunicando-se diretamente com o telão via `BroadcastChannel`.
2. **STAGE (Apresenta ao Público):** Telão público cinematográfico em tela cheia sem qualquer botão interativo. Apresenta o Hero Showcase Wall, pódio central escalonado, cúpula acústica zenital e as 5 cadeiras da banca.
3. **Cadeira Lógica (`chairId` de 1 a 5):** Posição física e lógica de avaliação no palco.
4. **Avaliador vs. Cadeira (`Evaluator != Chair`):** Segregação formal entre a pessoa (identidade) e a posição física no palco (1 a 5).
5. **Hero Showcase Wall:** Telão panorâmico que executa a máquina de estados narrativos (`wallMode`: `event-idle`, `waiting`, `pitch-live`, `voting`, `result`).

---

## 21. Roadmap Oficial de Evolução (Versão 2.1 — Roadmap V2)

### Princípio Estratégico: Show-Ready & Production-Ready First
O Roadmap V2 reorienta a evolução da plataforma com base em dois pilares inegociáveis para eventos ao vivo: **Resiliência de Dados (Zero Data Loss)** e **Excelência Sensorial de Palco (Som & Espetáculo)**.

```text
════════════════════════════════════════════════════════════════════════════════
FASES ENTREGUES E HOMOLOGADAS (CONCLUÍDAS)
════════════════════════════════════════════════════════════════════════════════
  ✅ FASE 1: Operator + Stage Foundation (v0.1.0-phase1)
  ✅ FASE 2: Event Setup & Project Management (v0.2.0-phase2)
  ✅ FASE 3: Event Governance, Pitch Dynamics & Jury (v0.3.0-phase3)
  ✅ FASE 4: Platform Reliability & Data Resilience (v0.4.3-phase4d)
       ├─ [x] 4A: Storage Engine & Relational Schema (PostgreSQL Portable 18.6, EF Core 10)
       ├─ [x] 4B: State Persistence & Session Re-hydration (Crash Recovery Paused & TurnedChairs)
       ├─ [x] 4C: Operational Audit Trail & Event Sourcing Leve (AuditEvents & ActivityLog Sync)
       └─ [x] 4D: Automated Snapshots, Backup & Disaster Recovery (BackupOrchestrator & DR)
  ✅ FASE 5: Live Show Experience & Immersive Stage (v0.5.0-phase5)
       ├─ [x] 5A: Audio Engine Infrastructure & Visual Rendering Foundation
       ├─ [x] 5B: Audio & Visual Event Synchronization (Whoosh, Glow, Ticker)
       ├─ [x] 5C.1: Architectural Arena Redesign (Pódio, Cúpula e Paredes Acústicas)
       ├─ [x] 5C.2 / 2A / 2B: Hero Showcase Wall (Painel Panorâmico 33.6m e Uploads)
       ├─ [x] 5C.3: Narrative States & Simplified Engine (useHeroWallMedia, useTexture, useVideoTexture)
       ├─ [x] 5C.4 / 5C.4A: Operator Media Transport Controls (Áudio, Timeline, Volume, BroadcastChannel)
       ├─ [x] 5C.5 Fase 1: Hero Wall Visual Clearance (Remoção da arquibancada frontal)
       └─ [x] 5C.X: Event Media Foundation (Mídia de standby do evento no BrandingConfig)
════════════════════════════════════════════════════════════════════════════════
PRÓXIMAS ENTREGAS PRIORITÁRIAS (ROADMAP V2 INTEGRADO AO EVOLUTION PLAN)
════════════════════════════════════════════════════════════════════════════════
  │
  ├─► [x] FASE 5C.6: HUD Cleanup & Fechamento da Trilha 5C (CONCLUÍDA)
  │     └─ Remoção definitiva do componente legado StageProjectBanner em StageHUD
  │
  ├─► [x] FASE 5H: Architectural Foundation, Auth/RBAC & Experience Event Bus (CONCLUÍDA)
  │     ├─ 5H.1: ExperienceEventBus no frontend + Recuperação de estado pós-refresh/SignalR
  │     ├─ 5H.2: Autenticação JWT, Roles (Admin/Operator/Viewer), Proteção de Rotas & Endpoints + Audit
  │     ├─ 5H.3: Autenticação independente para Hardware ESP32 (X-Device-Key compatível v0.5.0)
  │     └─ 5H.4: Política e validação de segurança para Uploads (extensão, magic bytes, autorização)
  │     └─ [x] 6A (Antecipação Integrada): Motor de Ranking Oficial consolidado (GET /api/events/:id/results)
  │
  ├─► [x] FASE 5I: Database Hardening (PostgreSQL RLS) & Admin Governance (CONCLUÍDA)
  │     ├─ Row-Level Security (RLS) nas tabelas `users` e `audit_events` (`20261124200000_EnableRowLevelSecurity.cs`)
  │     ├─ Role PostgreSQL `arena_readonly` sem acesso a linhas (isolamento validado via `SET LOCAL ROLE`)
  │     └─ Painel Admin (`/admin`, `/api/admin/users/*`), auditoria de operações e suíte de regressão JWT (692/692 + 32/32 Admin Panel)
  │
  ├─► 🔄 FASE 5D: Arena Soundscape & Configurable Audio System (EM ANDAMENTO — 5D.3 Concluída)
  │     ├─ [x] 5D.1: Audio Asset Curation & Sound Map (`frontend/public/audio/`, `soundCatalog.js`, `soundMap.js`)
  │     ├─ [x] 5D.2: AudioEngine (4 barramentos Master/SFX/Ambient/Music, cooldown, prioridade, ducking, crossfade, `playEvent`, `triggerDucking`, `stopLoop`, persistência localStorage, 41/41 testes)
  │     ├─ [x] 5D.3: Sound Library Backend (`sound_library`, `sound_event_mappings`, REST `/api/audio/*`, RBAC, SignalR `AudioConfigUpdated`, seed idempotente, `audioConfigClient.js`, 16/16 testes)
  │     ├─ [ ] 5D.4: Cockpit Audio Control Center (Mixer, Preview, Upload, Sync com Stage)
  │     ├─ [ ] 5D.5: QA & Regression
  │     └─ [ ] 5D.6: Sound Design Polish (calibragem de volumes, timing e testes em ambiente real)
  │
  ├─► FASE 5E: Arena Population & Audience Reactions (HIGH PRIORITY)
  │     ├─ Phase 5C.5 Fase 2: Plateia fictícia 3D em leque (InstancedMesh leve)
  │     └─ Reações visuais e partículas sincronizadas exclusivamente com eventos reais ChairTurned
  │
  ├─► FASE 5F: Visual Refinements, Stage Lighting & Cinematography (MEDIUM PRIORITY)
  │     ├─ Iluminação de borda (Rim Lighting) por estado nas cadeiras + Feixes de votação (VoteBeams)
  │     ├─ Identidade institucional integrada ao palco (BrandLogo3D / CPTM) + 3 presets de arco
  │     ├─ Câmera cinematográfica automática via GSAP (useCinematicCamera) + Redesign cronômetro
  │     └─ Framework modular de Easter Eggs da marca/evento
  │
  ├─► FASE 5G: Background Music Adaptativa (MEDIUM PRIORITY)
  │     └─ Trilha de abertura corporativa de keynote com crossfade e crescendo no resultado
  │
  ├─► FASE 6: Awards Ceremony, Ranking & Executive Reports (ROADMAP V2)
  │     ├─ 6A: Motor de Ranking Oficial (Antecipado junto à 5H — desempate oficial no backend)
  │     ├─ 6B: Pódio Cinematográfico Integrado à Cena 3D Existente (Revelação sequencial 3º → 2º → 1º)
  │     └─ 6C: Emissão da Ata da Banca (Exportação Executiva em PDF e CSV)
  │
  ├─► FASE 7: Operational Hardening, Contingency & Fleet Telemetry
  │     ├─ 7A: Cockpit de Contingência (Bypass de Voto Manual em 1 Clique na Mesa)
  │     ├─ 7B: Telemetria da Frota de ESP32 (Monitor de Liveness e Status das 5 Cadeiras)
  │     ├─ 7C: Runbook Operacional de Produção e Checklist de Ensaio Técnico
  │     └─ 7D: Chaos Engineering & Resiliência Holística de Campo (Reabsorvido do 4E)
  │
  └─► FASE 8 (Módulo Satélite / Complementar): Evaluator Portal & Qualitative Rubrics
        ├─ 8A: Parametrização Opcional de Critérios e Rubricas por Evento
        ├─ 8B: Web App Responsivo do Jurado para Pareceres Complementares
        └─ 8C: Integração Híbrida: Decisão Cênica Soberana + Dossiê Quantitativo
```

---

### Detalhamento da FASE 5: Live Show Experience & Immersive Stage (Homologada)

A Phase 5 superou a meta original de ser apenas uma "fase de áudio" e transformou integralmente a experiência cênica da Arena Voice:
1. **5A e 5B (Fundação Audiovisual):** Sintetizador procedural Web Audio API, Bloom seletivo e sincronismo estrito de som e luz na virada das cadeiras.
2. **5C.1 (Redesign Arquitetural da Arena):** Pódio circular escalonado de dois níveis, cúpula acústica zenital e paredes de ripas acústicas.
3. **5C.2, 5C.2A e 5C.2B (Hero Showcase Wall Panorâmico):** Painel monumental de $33.6\,\text{m} \times 11.6\,\text{m}$ em $Z = -20.6\,\text{m}$, ocupando $75\%$ a $85\%$ do horizonte da arena.
4. **5C.3 (Máquina de Estados Narrativos):** Hook `useHeroWallMedia.js` orquestrando os 5 estados narrativos (`event-idle`, `waiting`, `pitch-live`, `voting`, `result`) via loaders declarativos Drei (`useTexture` e `useVideoTexture`).
5. **5C.4 e 5C.4A (Operator Media Transport Controls):** Player profissional no Cockpit com Play, Pause, Restart, Scrubbing em timeline, saltos de -10s/+10s, volume a 70% com persistência e comunicação via `BroadcastChannel('arena_media_controls')`.
6. **5C.5 Fase 1 (Visual Clearance):** Remoção da arquibancada frontal desobstruindo 100% da visibilidade do telão a partir da câmera principal.
7. **5C.X (Event Media Foundation):** Mídia institucional de standby (imagem/vídeo/auto) configurável por evento em `BrandingConfig` e reproduzida no estado `event-idle`.
8. **5C.6 (HUD Cleanup — ✅ Concluída):** Remoção definitiva do `StageProjectBanner` em `StageHUD.jsx`, encerrando 100% da trilha 5C.
9. **5H (Architectural Foundation, Auth/RBAC & Experience Event Bus — ✅ Concluída):** `ExperienceEventBus` reativo no frontend, autenticação JWT com roles (`Admin`, `Operator`, `Viewer`), autenticação independente para dispositivos ESP32 (`X-Device-Key`), proteção de rotas (`/login`, `<RequireAuth>`) e endpoints, validação de uploads por magic bytes e auditoria de segurança (`tests/test-auth-and-ranking.cjs`: 32/32 aprovados).
10. **5I (PostgreSQL RLS & User Governance — ✅ Concluída):** Ativação de Row-Level Security nas tabelas `users` e `audit_events`, criação da role isolada `arena_readonly` validada com `SET LOCAL ROLE`, Painel Administrativo de Usuários (`/admin` + `/api/admin/users/*` protegido por `PolicyAdminOnly`) com auditoria e adaptação integral das 14 suítes de regressão para JWT (`tests/test-admin-panel.cjs`: 32/32, `tests/run-regression-suite.cjs`: 692/692).

---

### FASE 6: Awards Ceremony, Ranking & Executive Reports
*Consolidar a apuração do evento com pódio visual integrado à cena 3D e emissão de ata executiva formal.*

- **STATUS:** 🔄 EM INÍCIO (6A antecipado junto à fundação 5H)
- **OBJETIVO:** Computar a classificação geral dos pitches apresentados, projetar a cerimônia de premiação integrada ao palco 3D existente e exportar a ata oficial em PDF e CSV para a comissão organizadora.
- **PRÉ-REQUISITOS:** Fase 4 (Persistência), Fase 3D (Result Engine) e Fase 5H (Segurança & EventBus).
- **DIRETRIZ DE HARDWARE:** **Firmware Congelado.** Nenhuma alteração no código embarcado dos ESP32 é introduzida na Fase 6. O firmware baseline `v0.5.0` permanece intacto e estável enquanto a evolução ocorre exclusivamente no backend e frontend.
- **SUBFASES E ESCOPO:**
  - **Milestone 6A — Motor de Ranking Oficial (✅ Concluído junto à 5H):** Algoritmo determinístico no backend (`GET /api/events/:id/results`) baseado nos snapshots do `RoundHistoryEntry` com desempate por: `Result` (`Approved` primeiro) ➔ `ApprovalMode` (`Unanimous` > `Majority` > `Minority` > `None`) ➔ `TurnedChairCount` ➔ Menor duração efetiva / ordem cronológica.
  - **Milestone 6B — Pódio Cinematográfico Integrado à Cena 3D:** Modo integrado na cena `StagePage`/`StudioScene` reutilizando palco, cadeiras, luzes, câmera e `AudioEngine`, com revelação sequencial obrigatória (`3º Lugar` → `2º Lugar` → `1º Lugar`) e persistência de estado em recuperação pós-refresh.
  - **Milestone 6C — Emissão de Ata da Banca:** Endpoints `GET /api/reports/minutes?format=pdf|csv` e botão no cockpit "Exportar Ata do Evento", gerando documento executivo pronto para assinatura do comitê.

---

### FASE 7: Operational Hardening, Contingency & Fleet Telemetry (Com Chaos Engineering Reabsorvido)
*Blindagem operacional de campo, procedimentos de contingência técnica e resiliência holística de evento ao vivo.*

- **STATUS:** 📅 PLANEJADA (Roadmap V2)
- **OBJETIVO:** Fornecer à mesa técnica ferramentas de diagnóstico de frota ESP32 em tempo real, comandos de bypass manual imediato em caso de pane física, runbooks de pré-show e validação de caos holístico no ecossistema completo.
- **PRÉ-REQUISITOS:** Fases 4, 5 e 6 homologadas.
- **SUBFASES E ESCOPO:**
  - **Milestone 7A — Cockpit de Contingência (Bypass Manual):** Ação no cockpit "Forçar Voto Manual da Cadeira N" no `/operator` para uso exclusivo da mesa técnica em caso de quebra mecânica de botão ou bateria fraca durante o pitch ao vivo.
  - **Milestone 7B — Telemetria da Frota de ESP32:** Ativação da flag `#define ENABLE_TELEMETRY 1` no firmware baseline v0.5.0, envio periódico de heartbeat em background com RSSI, uptime e tensão, e tela de radar de liveness das 5 cadeiras no cockpit.
  - **Milestone 7C — Runbook de Produção e Checklist Pré-Show:** Manual operacional minuto a minuto para alinhamento entre mesa técnica, mestre de cerimônias e direção de palco.
  - **Milestone 7D — Chaos Engineering & Resiliência Holística de Campo (Reabsorvido do 4E):** Simulações práticas de pane durante show ao vivo (queda de Wi-Fi, desconexão de botão físico, reinício forçado de servidor e recuperação sob pressão temporal).

---

### FASE 8 (Módulo Satélite / Complementar): Evaluator Portal & Qualitative Rubrics
*Módulo opcional para bancas acadêmicas ou eventos que exijam pareceres técnicos detalhados.*

- **STATUS:** 📅 PLANEJADA COMO COMPLEMENTAR (Roadmap V2)
- **OBJETIVO:** Permitir a configuração de critérios de avaliação com notas (ex: Inovação, Viabilidade, Pitch) via portal responsivo para jurados, operando como camada acessória à decisão física soberana da cadeira.
- **PRÉ-REQUISITOS:** Fases 4, 6 e 7 homologadas.

---

## 22. Matriz de Rastreabilidade e Critérios de Conclusão por Fase (Roadmap V2)

| Fase | Foco Principal | Critério de Aceite Inegociável | Teste Chave |
| :---: | :--- | :--- | :--- |
| **Fase 1** | Operator + Stage Foundation | Telão passivo sem controles de mouse; operador controla a arena com linguagem de produto. | Duas abas sincronizadas via SignalR com reset remoto. |
| **Fase 2** | Event Setup & Projects | Operador configura branding e catálogo; telão reflete startup atual e neons dinâmicos. | Alternância de pitches no palco e hidratação REST. |
| **Fase 3** | Pitch Dynamics & Jury | 6 estágios de pitch, timers sem drift, lockout HTTP 409, histórico e jurados nominais. | 466 verificações automatizadas em 9 suítes (100% verde). |
| **Fase 4** | Platform Reliability & Data | Reinício forçado do servidor restaura 100% do estado sem perda de histórico; backup em 1 clique e restore em < 30s. | `tests/test-disaster-recovery.cjs` e `tests/test-crash-rehydration.cjs` (14 suítes, 688 testes verdes). |
| **Fase 5** | Live Show Experience | Hero Showcase Wall panorâmico reproduzindo vídeo/áudio com controles na mesa técnica e clearance visual total. | `tests/test-hero-wall-uploads.cjs`, `operatorMediaControls.test.js` e `heroWallMedia.test.js`. |
| **Fase 6** | Ranking & Executive Reports | Ata oficial em PDF/CSV gerada com fidelidade auditável; pódio exibido no telão. | Validação de consistência do ranking e download da ata. |
| **Fase 7** | Hardening & Contingency | Bypass manual de cadeira executado na mesa técnica em caso de falha do ESP32; teste de caos holístico. | Simulação de botão desconectado com contingência manual e teste de resiliência integrada (7D). |
| **Fase 8** | Evaluator Portal (Opcional) | Pareceres técnicos complementares anexados à ata sem afetar a soberania do botão físico. | Submissão de notas via smartphone em rede local. |

---

## 🎯 PRÓXIMA FASE OFICIAL RECOMENDADA

> [!IMPORTANT]
> **Hardening 5I + Security Quick Wins Concluídos (`5I` ✅):** PostgreSQL RLS (`users`, `audit_events`, `arena_readonly`), Painel Administrativo de Usuários (`/admin` + `/api/admin/users/*`), Security Quick Wins e Suíte de Regressão JWT 100% verde (`692/692` em 14 suítes + `32/32` Admin Panel + `32/32` Auth/Ranking).  
> **Fase Atual (`5D` 🔄):** Subfases **5D.1 ✅, 5D.2 ✅ e 5D.3 ✅ Concluídas**. Próxima subfase aguardando autorização: **5D.4 (ExperienceEventBus + Cockpit Audio Management UI)**.  
> **Próxima Fase Recomendada:** **5D.4 — Cockpit Audio Control Center** (Mixer, Preview, Sync com Stage via SignalR) aguardando autorização.  
> Branch oficial: `feat/phase5-live-show-experience`
