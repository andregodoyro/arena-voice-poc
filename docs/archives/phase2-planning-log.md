# Diário de Planejamento e Decisões — Fase 2 (Event Setup & Project Management)
## Plataforma Arena Voice / Arena de Inovação

> **Status:** Documento Vivo de Registro e Alinhamento da Fase 2  
> **Última Atualização:** Outubro de 2026 (Execução do Milestone 2D.3)

---

## 1. Planejamento Original da Fase 2

A Fase 2 foi desenhada para elevar o Arena Voice de um protótipo de hardware de cadeiras para um **sistema completo de apresentação de startups e projetos de inovação**. 

### Divisão da Fase 2 em Cinco Marcos Sequenciais:
1. **Milestone 2A:** Backend Domain Models & In-Memory Store.
2. **Milestone 2B:** REST APIs & SignalR Contracts.
3. **Milestone 2C:** Operator Project Management Interface (Cockpit Web).
4. **Milestone 2D:** Stage Projection & Dynamic Theming (Telão 3D).
5. **Milestone 2E:** Validation, Documentation & Phase 2 Closure (Tag `v0.2.0-phase2`).

---

## 2. Execução do Milestone 2A (Modelos e Store)

- **Planejamento Aprovado:** Criação das entidades `Event`, `Project`, `BrandingConfig`, `ProjectMedia`, `ActiveContext` e o serviço singleton `ArenaProjectStore`.
- **Ajustes Críticos de Arquitetura Aplicados:**
  1. *Ajuste 1 (Offline First):* Proibição de imagens de terceiros (Unsplash) no seed inicial. Uso de caminhos locais (`/samples/...`) e `string.Empty` para permitir operação 100% offline.
  2. *Ajuste 2 (Auditoria e Telemetria):* Reintrodução da propriedade `ActiveContext.LastUpdated` para rastreamento de mudanças.
  3. *Ajuste 3 (Simetria de Linguagem):* Padronização de `Title` e `Description` em ambos os agregados (`Event` e `Project`), evitando assimetrias de vocabulário.
  4. *Ajuste 4 (Escopo Essencial de Mídia):* Simplificação de `ProjectMedia` para apenas `LogoUrl` e `CoverImageUrl` (adiando URLs de deck e vídeo para fases futuras).
  5. *Fonte de Verdade:* Adoção de `ActiveContext.CurrentEventId` como ponteiro oficial, eliminando o atributo `Event.IsActive`.
- **Resultado Técnico:** Entidades criadas, store thread-safe com lock em `ActiveContext`, e enriquecimento aditivo do snapshot `GET /api/state`.

---

## 3. Execução do Milestone 2B (APIs e Contratos)

- **Planejamento Aprovado:** Exposição de 8 endpoints REST e 2 contratos SignalR.
- **Ajustes Críticos Aplicados durante o 2B:**
  1. *Filtro de Concluídos (`GET /api/projects`):* Inclusão do parâmetro `?includeCompleted=true|false`. Por padrão (`false`), o endpoint oculta projetos `Completed`, retornando apenas a fila ativa (`Pending` e `Current`).
  2. *Proteção de Exclusão (`DELETE /api/projects/{id}`):* Caso o operador tente deletar o projeto que está no palco (`id == CurrentProjectId`), a API rejeita com `HTTP 409 Conflict` e mensagem explicativa, garantindo estabilidade do live show.
  3. *Seleção Atômica e Idempotente (`POST /api/projects/{id}/select`):* Transição atômica em lock: o projeto anterior muda para `Completed` com `PresentationEndedAt`, e o novo muda para `Current` com `PresentationStartedAt`. Re-selecionar o mesmo projeto é uma operação idempotente que retorna 200 OK sem alterar datas.
  4. *Rich SignalR Payloads:* Adoção de payloads ricos contendo o objeto completo em `CurrentProjectChanged` e `EventBrandingUpdated`, eliminando *thundering herd* de requisições HTTP subsequentes pelo telão.
- **Resultado Técnico:**
  - 8 rotas mapeadas no `Program.cs`.
  - 156 testes automatizados aprovados (48 na API base, 53 na API de projetos, 55 no SignalR E2E).

---

## 4. Auditoria Técnica e Homologação do Milestone 2B

### 4.1 Testes de Integração e Homologação Manual
- `GET /api/events/current` e `PUT /api/events/current` homologados com validação estrita de cores hexadecimais `#RRGGBB`.
- `GET /api/projects` homologado com e sem `includeCompleted`.
- `POST /api/projects` e `PUT /api/projects/{id}` validados.
- `DELETE /api/projects/{id}` homologado: rejeição com `HTTP 409` quando aplicado ao projeto ativo e sucesso `HTTP 200` para projetos inativos.
- Sincronização SignalR validada: recepção imediata dos eventos `CurrentProjectChanged` e `EventBrandingUpdated`.

### 4.2 Constatações da Auditoria Técnica
1. **Mutação Cumulativa do Store em Memória:**
   O `ArenaProjectStore` é um Singleton de processo. Os testes de integração realizam mutações reais (alteram título, cores e selecionam projetos). Ao repetir a suíte sem reiniciar o backend, os testes falhavam ao esperar valores literais do seed original.
   *Deliberação:* Trata-se do comportamento esperado de um store em memória (persistência durante o processo). Formalizado no **ADR-008**.
2. **Interoperabilidade HTTP (PowerShell vs. Node):**
   Requisições enviadas via PowerShell sem o parâmetro `-ContentType "application/json; charset=utf-8"` recebiam `HTTP 400 Bad Request` pelo middleware do Kestrel, pois o PowerShell assumia `application/x-www-form-urlencoded`.
   *Deliberação:* O backend exige estritamente `Content-Type: application/json`. Formalizado no **ADR-010**.

---

## 5. Planejamento Aprovado do Milestone 2C (Operator UI)

O Milestone 2C construiu a interface administrativa e operacional do Arena Voice sob o prefixo `/operator`, utilizando **Navegação por Abas (Tabbed Layout)**:

1. **Aba Cockpit (`/operator/cockpit`):**
   - Banner do pitch ativo no palco (título, líder, trilha e cronômetro de apresentação).
   - Placar de cadeiras viradas (X/5) e percentual.
   - Grade das 5 cadeiras com status em tempo real.
   - Controle autoritativo de reset de cadeiras (`POST /api/reset`).
2. **Aba Projetos (`/operator/projects`):**
   - Tabela/Fila de startups ordenadas por `orderIndex`.
   - Badges de status: `Pending`, `Current`, `Completed`.
   - Botão "Chamar ao Palco" (`POST /select`) com loading e proteção de duplo clique.
   - Modais para Cadastrar e Editar projetos.
   - Exclusão com confirmação e bloqueio visual para a startup ativa.
   - Filtro para exibir/ocultar projetos já concluídos.
3. **Aba Evento (`/operator/event`):**
   - Formulário para editar título, descrição e data do evento.
   - Editor de paleta de cores (primária e secundária) com visualizador de neon cênico.
4. **Sincronização Dupla:**
   - Hidratação primária via `GET /api/state` + `GET /api/projects?includeCompleted=true`.
   - Recepção realtime de deltas via SignalR (`CurrentProjectChanged`, `EventBrandingUpdated`).
   - Resync automático em caso de reconexão de rede.

---

## 6. Próximos Passos (Roadmap da Fase 2)

- [x] **Milestone 2A:** Modelos de Domínio e In-Memory Store.
- [x] **Milestone 2B:** REST APIs e Contratos SignalR.
- [x] **Milestone 2C:** Implementação da Interface Administrativa do Operador.
  - [x] **2C.1:** Operator Layout Foundation (`OperatorLayout`, `OperatorNavTabs`, rotas `/operator/cockpit`, `/operator/projects`, `/operator/event`).
  - [x] **2C.2:** Projects Visualization (`ProjectsApiClient`, `CurrentProjectCard`, `ProjectList`, `ProjectCard`).
  - [x] **2C.3:** Project Management (`ProjectModal`, Criar, Editar, Excluir com 409, Selecionar atômico).
  - [x] **2C.4:** Event Management (`EventForm`, `ColorSwatch`, `ColorPreviewCard`, preview de neons cênicos).
  - [x] **2C.5:** Realtime Integration (`CurrentProjectChanged`, `EventBrandingUpdated`, resync).
- [ ] **Milestone 2D:** Projeção Cênica e Neons Dinâmicos no Telão 3D (`/stage`) — Em Andamento:
  - [x] **2D.1:** Infraestrutura de Dados, Contexto e HUD Cênico (`StagePage`, `StageHUD`, `StageProjectBanner`, consumo autoritativo de `currentProject`, `currentEvent` e `branding`).
  - [x] **2D.2:** Higienização Visual e Purga de Elementos Legados (Remoção de microfones, letreiros, studio.glb e textos musicais).
  - [x] **2D.3:** Cenografia da Arena e Escala de Anfiteatro (Palco escuro laqueado, arquibancada procedural e arcos cênicos).
  - [ ] **2D.4:** Neons Dinâmicos e Theming Reativo (Reatividade SignalR de `primaryColor` e `secondaryColor`).
  - [ ] **2D.5:** Homologação Integrada, Resync e Fechamento do 2D.
- [ ] **Milestone 2E:** Validação Integrada, Documentação Final e Tag `v0.2.0-phase2`.
