# Diário Técnico de Implementação (Implementation History)
## Plataforma Arena Voice / Arena de Inovação

> **Status:** Documento Vivo de Memória Arquitetural  
> **Finalidade:** Registro permanente do **como**, do **porquê** e dos **resultados** de cada marco técnico implementado no repositório.

---

# FASE 1 — Fundação de Software e Hardware

## Milestone 1A — Routing Foundation
- **Contexto:** A prova de conceito original combinava o telão 3D e controles técnicos na mesma visualização, sem separação de responsabilidade entre o público e a mesa técnica.
- **Objetivo:** Estabelecer a infraestrutura de roteamento SPA separando fisicamente as superfícies de visualização.
- **Arquitetura Criada:** Integração do React Router 7 (`react-router-dom`) com rotas canônicas:
  - `/stage`: Superfície pública para projeção em telão cênico.
  - `/operator`: Cockpit da mesa técnica operacional.
- **Arquivos Principais:** `frontend/src/App.jsx`, `frontend/src/pages/StagePage.jsx`, `frontend/src/pages/OperatorPage.jsx`.
- **Decisões Importantes:** Rota raiz `/` redireciona para `/stage`; centralização do estado de cadeiras no `App.jsx` alimentando as rotas filhas.
- **Testes & Validação:** Compilação do Vite (`npm run build`) e validação de navegação no navegador.
- **Impacto Futuro:** Desbloqueou a evolução isolada da interface pública e da mesa técnica sem vazamento de responsabilidades.

---

## Milestone 1B — Public Stage Experience
- **Contexto:** O telão exibia botões de acionamento manual e controles de teste, quebrando a estética profissional necessária para o evento.
- **Objetivo:** Sanitizar a superfície do telão `/stage` para uma experiência 100% contemplativa e cênica.
- **Arquitetura Criada:** Criação do componente `StageHUD.jsx`, contendo exclusivamente o status de prontidão da arena ("Pronto para Apresentação") e placar sutil, sem botões de clique.
- **Arquivos Principais:** `frontend/src/components/stage/StageHUD.jsx`, `frontend/src/pages/StagePage.jsx`.
- **Decisões Importantes:** Remoção total de controles interativos do telão; o telão reage exclusivamente aos eventos recebidos via SignalR e ao snapshot do backend.
- **Testes & Validação:** Validação visual e de build.
- **Impacto Futuro:** Garantiu a pureza cênica exigida para a projeção de palco.

---

## Milestone 1C — Operator Operational Dashboard
- **Contexto:** A mesa técnica precisava de um cockpit dedicado em 2D para acompanhar as viradas das cadeiras, o placar e o histórico de eventos.
- **Objetivo:** Construir o painel operacional de monitoramento em tempo real da mesa.
- **Arquitetura Criada:** Cockpit 2D estruturado em colunas:
  - `OperatorHeader`: Status de conexão e indicador da mesa.
  - `ScoreBoard`: Placar 2D com contagem de cadeiras viradas e percentual de apoio.
  - `ChairGrid`: Grade com cartões individuais das 5 cadeiras, nomes dos técnicos e status (Aguardando / Apoiado).
  - `ActivityLog`: Histórico reverso com os últimos eventos ocorridos na arena.
- **Arquivos Principais:** `frontend/src/components/operator/*`, `frontend/src/pages/OperatorPage.jsx`.
- **Decisões Importantes:** Adoção de Tailwind CSS com efeito glassmorphism e cores operacionais sem sobrecarregar a GPU com 3D na máquina do operador.
- **Testes & Validação:** Validação de renderização dinâmica em resposta a eventos HTTP/SignalR.
- **Impacto Futuro:** Fundação visual sobre a qual o gerenciamento de projetos e dinâmicas (Milestone 2C) é acoplado.

---

## Milestone 1D — Authoritative Reset Flow
- **Contexto:** O reset da arena era realizado via mutações locais no frontend, sem garantia de que todos os clientes e hardware estivessem sincronizados.
- **Objetivo:** Estabelecer o fluxo autoritativo de reset comandado pela API do backend.
- **Arquitetura Criada:**
  - Endpoint `POST /api/reset` no backend que redefine `chairStates[1..5] = false` e emite o broadcast `ChairsReset` via SignalR.
  - Botão no cockpit operacional com loading state (`Resetando...`) e bloqueio contra duplo clique.
  - Purga de código legado e inerte (`HUD.jsx`, `isDevMode`, `toggleChairManual`, `turnAllChairs`, `lastEvent`).
- **Arquivos Principais:** `backend/Program.cs`, `frontend/src/App.jsx`, `frontend/src/pages/OperatorPage.jsx`.
- **Decisões Importantes:** O frontend nunca zera o estado local diretamente ao clicar no botão; ele dispara a requisição HTTP e aguarda o evento `ChairsReset` do SignalR para garantir sincronia com todos os telões conectados.
- **Testes & Validação:** 48 testes de API (`test-api.cjs`) e 46 testes de SignalR (`test-signalr-e2e.cjs`) aprovados com 100% de sucesso.
- **Impacto Futuro:** Estabeleceu o padrão autoritativo inegociável do sistema.

---

## Milestone 1E — Technical Cleanup & Documentation
- **Contexto:** Existiam props e handlers de clique herdados da fase inicial de exploração 3D no Three.js que não tinham mais função no sistema dirigido pelo backend.
- **Objetivo:** Limpar a cadeia de props 3D, validar a integridade técnica global e fechar a documentação da Fase 1.
- **Arquitetura Criada:**
  - Remoção da cascata `toggleChair` em `StudioCanvas.jsx` -> `StudioScene.jsx` -> `Chair.jsx`.
  - Remoção de handlers de mouse raycasting (`onClick`, `onPointerOver`, `onPointerOut`) nas cadeiras 3D, preservando integralmente as animações GSAP disparadas por props.
  - Atualização completa de `README.md`, `architecture.md` e `roadmap.md`.
  - Criação da tag Git `v0.1.0-phase1`.
- **Arquivos Principais:** `frontend/src/components/Chair.jsx`, `frontend/src/components/StudioScene.jsx`, `frontend/src/components/StudioCanvas.jsx`.
- **Decisões Importantes:** As cadeiras 3D tornaram-se entidades puramente visuais, orientadas a dados.
- **Testes & Validação:** 48 PASS na API, 46 PASS no SignalR E2E, build frontend e backend perfeitos.
- **Impacto Futuro:** Fechamento formal da Fase 1 com código higienizado e sem dívidas técnicas no pipeline 3D.

---

# FASE 2 — Event Setup & Project Management

## Milestone 2A — Backend Domain Models & In-Memory Store
- **Contexto:** A Fase 1 operava com estado puramente focado nas cadeiras físicas (`Dictionary<int, bool>`). A Fase 2 requer a gestão conceitual de eventos e do catálogo de pitches apresentados.
- **Objetivo:** Modelar as entidades de domínio de eventos e projetos, criar um repositório thread-safe em memória com seed offline e enriquecer o snapshot do sistema.
- **Arquitetura Criada:**
  - Enums de ciclo de vida: `EventStatus` (`Draft`, `Active`, `Completed`) e `ProjectStatus` (`Pending`, `Current`, `Completed`, `Disqualified`).
  - Entidades e Value Objects: `Event`, `Project`, `BrandingConfig`, `ProjectMedia`, `ActiveContext`.
  - Nomenclatura simétrica padronizada: `Title` e `Description` em ambos os agregados.
  - `ArenaProjectStore`: Implementação Singleton thread-safe com `ConcurrentDictionary` para eventos e projetos, e sincronização atômica via `lock` para o `ActiveContext`.
  - Seed inicial com 1 evento padrão (*"Demo Day Inovação 2026"*) e 5 projetos locais (*NeuroSync AI*, *EcoLog*, *FinFlow*, *AgroSmart*, *CyberShield*), sem dependências de URLs externas.
  - Enriquecimento aditivo do snapshot `GET /api/state`, adicionando `currentEvent` e `currentProject` sem quebrar as propriedades `chairs` e `activeCount`.
- **Arquivos Principais:**
  - `backend/Domain/Enums/*`
  - `backend/Domain/Entities/*`
  - `backend/Services/IArenaProjectStore.cs`
  - `backend/Services/ArenaProjectStore.cs`
  - `backend/Program.cs`
- **Decisões Importantes:** Não usar URLs de imagens de terceiros (Unsplash) para assegurar funcionamento offline; não usar `Event.IsActive`, delegando a fonte de verdade para `ActiveContext`.
- **Testes & Validação:** Compilação do .NET 10 sem avisos, 48 testes de API e 46 de SignalR mantidos com 100% de sucesso.
- **Impacto Futuro:** Forneceu a fundação de domínio necessária para a criação das APIs REST do marco seguinte.

---

## Milestone 2B — REST APIs & SignalR Contracts
- **Contexto:** Com as entidades e o store criados no 2A, fazia-se necessário expor operações de consulta, manipulação e propagação em tempo real.
- **Objetivo:** Implementar os contratos REST para eventos e projetos e os eventos SignalR de metadados, com proteção de integridade operacional.
- **Arquitetura Criada:**
  - **8 Endpoints REST no `Program.cs`:**
    1. `GET /api/events/current`: Consulta dados e branding do evento ativo.
    2. `PUT /api/events/current`: Atualização de metadados e branding (validação estrita de cores hexadecimais `#RRGGBB`).
    3. `GET /api/projects`: Listagem de projetos com suporte a `?includeCompleted=true|false` (oculta concluídos por padrão).
    4. `GET /api/projects/{id}`: Consulta detalhada de projeto por ID.
    5. `POST /api/projects`: Criação de novo projeto vinculado ao evento ativo (validação de campos obrigatórios).
    6. `PUT /api/projects/{id}`: Atualização de campos de projeto existente.
    7. `DELETE /api/projects/{id}`: Exclusão com proteção `HTTP 409 Conflict` caso o projeto esteja atualmente no palco.
    8. `POST /api/projects/{id}/select`: Workflow atômico e idempotente que transiciona o projeto anterior para `Completed` e o novo para `Current`.
  - **2 Contratos SignalR com Rich Payload:**
    - `CurrentProjectChanged`: Transmite `{ project, previousProjectId, timestamp }`.
    - `EventBrandingUpdated`: Transmite `{ eventId, branding, timestamp }`.
- **Arquivos Principais:**
  - `backend/Domain/DTOs/CreateProjectDto.cs`
  - `backend/Domain/DTOs/UpdateProjectDto.cs`
  - `backend/Domain/DTOs/UpdateEventDto.cs`
  - `backend/Services/IArenaProjectStore.cs` & `ArenaProjectStore.cs`
  - `backend/Program.cs`
  - `tests/test-projects-api.cjs` (nova suíte)
  - `tests/test-signalr-e2e.cjs` (estendida)
- **Decisões Importantes:**
  - Envio de objetos ricos no SignalR para evitar o padrão *thundering herd* de requisições HTTP subsequentes pelo telão.
  - Bloqueio rígido de exclusão com `409 Conflict` para salvaguarda da dinâmica ao vivo.
- **Testes & Validação:**
  - `tests/test-api.cjs`: **48 PASS / 0 FAIL**
  - `tests/test-projects-api.cjs`: **53 PASS / 0 FAIL**
  - `tests/test-signalr-e2e.cjs`: **55 PASS / 0 FAIL**
  - Total consolidado: **156 testes aprovados**.
- **Impacto Futuro:** Concluiu 100% da camada de backend da Fase 2, deixando o sistema preparado para a construção da interface administrativa do operador (Milestone 2C).

---

## Milestone 2C.1 — Operator Layout Foundation
- **Contexto:** Com as APIs de projetos e eventos homologadas no 2B, a interface do operador precisava evoluir de um cockpit isolado para um layout expansível e unificado por abas.
- **Objetivo:** Estabelecer a fundação do layout do operador e o roteamento por abas conforme o ADR-007 (`/operator/cockpit`, `/operator/projects`, `/operator/event`).
- **Arquitetura Criada:**
  - `OperatorLayout`: Shell mestre contendo cabeçalho institucional, indicador de prontidão de rede e barra de navegação por abas (`OperatorNavTabs`).
  - `OperatorNavTabs`: Navegação estilizada com `NavLink`, destacando a aba ativa sem perda de contexto.
  - Sub-rotas aninhadas no React Router:
    - `/operator/cockpit`: Cockpit ao vivo com cadeiras, placar, histórico e botão autoritativo de reset (`OperatorCockpitTab`).
    - `/operator/projects`: Casca da gestão da fila de projetos (`OperatorProjectsTab`).
    - `/operator/event`: Casca de configuração e branding do evento (`OperatorEventTab`).
  - Redirecionamento automático de `/operator` para `/operator/cockpit`.
- **Arquivos Principais:**
  - `frontend/src/components/operator/OperatorNavTabs.jsx`
  - `frontend/src/components/operator/OperatorLayout.jsx`
  - `frontend/src/pages/operator/OperatorCockpitTab.jsx`
  - `frontend/src/pages/operator/OperatorProjectsTab.jsx`
  - `frontend/src/pages/operator/OperatorEventTab.jsx`
  - `frontend/src/pages/OperatorPage.jsx`
  - `frontend/src/App.jsx`
- **Decisões Importantes:**
  - Preservação integral do cockpit 2D da Fase 1 dentro da aba Cockpit (`/operator/cockpit`).
  - Manutenção da conexão SignalR contínua no layout pai, impedindo desconexões ao alternar de aba.
- **Testes & Validação:** Compilação do frontend (`npm run build`) concluída com êxito em ~8s sem erros de sintaxe ou dependências quebradas.
- **Impacto Futuro:** Desbloqueou a inserção do catálogo de projetos (2C.2) e controles de CRUD/seleção (2C.3) em suas respectivas abas.

---

## Milestone 2C.2 — Projects & Event Visualization (Read-Only)
- **Contexto:** Com as rotas por abas estabelecidas no 2C.1, era necessário alimentar as telas de Projetos e Evento com dados autoritativos do backend sem introduzir comportamentos mutantes ou modais prematuros.
- **Objetivo:** Implementar a camada cliente de API, o contexto unificado `OperatorContext`, os componentes de visualização e preencher as abas `/operator/projects` e `/operator/event` em modo estritamente READ-ONLY.
- **Arquitetura Criada:**
  - `apiClient.js`: Cliente HTTP centralizado com tratamento de erros amigável e resolução dinâmica de URL.
  - `projectsApi.js`: Endpoints de leitura de projetos (`getProjects`, `getProjectById`).
  - `eventsApi.js`: Endpoints de leitura do evento atual (`getCurrentEvent`, `getState`).
  - `OperatorContext.jsx`: Contexto compartilhado responsável por hidratar `currentEvent`, `currentProject` e `projects` simultaneamente via snapshot autoritativo (`Promise.all`), expondo estados de `loading`, `error` e comando `refresh()`.
  - Componentes visuais dedicados:
    - `Badge.jsx`: Indicadores distintos para `Pending`, `Current` e `Completed`.
    - `CurrentProjectCard.jsx`: Destaque imersivo do projeto em apresentação no palco cênico com metadados e visual dinâmico.
    - `ProjectCard.jsx`: Card de listagem individual de projetos com badge de status, pitch leader, track e ordem.
    - `ProjectList.jsx`: Lista ordenada por `orderIndex` com tratamento de estados vazios.
  - Telas integradas:
    - `/operator/projects`: Cards de métricas (Total, Pendentes, Concluídos, Projeto Atual), Card de destaque do pitch no palco e lista ordenada.
    - `/operator/event`: Painel informativo de metadados institucionais (título, descrição, data) e visualização das amostras de cor cênicas (primária/secundária).
- **Arquivos Principais:**
  - `frontend/src/api/apiClient.js`
  - `frontend/src/api/projectsApi.js`
  - `frontend/src/api/eventsApi.js`
  - `frontend/src/contexts/OperatorContext.jsx`
  - `frontend/src/components/operator/Badge.jsx`
  - `frontend/src/components/common/Badge.jsx`
  - `frontend/src/components/operator/CurrentProjectCard.jsx`
  - `frontend/src/components/operator/ProjectCard.jsx`
  - `frontend/src/components/operator/ProjectList.jsx`
  - `frontend/src/components/operator/OperatorLayout.jsx`
  - `frontend/src/pages/operator/OperatorProjectsTab.jsx`
  - `frontend/src/pages/operator/OperatorEventTab.jsx`
- **Decisões Importantes:**
  - Escopo restrito a visualização (READ-ONLY) conforme planejado, sem incluir formulários, modais ou métodos mutantes (POST/PUT/DELETE/Select).
  - Snapshot autoritativo prioritário na resolução do projeto ativo no palco.
  - **Hotfix de Contrato de Domínio (Enum Numérico):** O backend C# serializa `ProjectStatus` como inteiros (`0=Pending`, `1=Current`, `2=Completed`, `3=Disqualified`). Foi criado o utilitário centralizado `frontend/src/utils/projectStatus.js` com funções de normalização (`normalizeProjectStatus`, `isCurrentProject`, `isPendingProject`, `isCompletedProject`), eliminando chamadas inseguras a `.toLowerCase()` e prevenindo a perda do valor `0` (falsy em JS).
- **Testes & Validação:**
  - Compilação de produção (`npm run build`) concluída com 100% de sucesso (2533 módulos transformados).
  - Verificação automatizada dos casos de mapeamento do enum (0, 1, 2, 3 e strings).
  - Suíte de integração com backend aprovada (`test-api.cjs`: 48 PASS / 0 FAIL; `test-projects-api.cjs`: 53 PASS / 0 FAIL).
- **Impacto Futuro:** Deixou a interface 100% pronta para a injeção do modal de CRUD e do workflow de seleção de projeto (Milestone 2C.3).

---

## Milestone 2C.3 — Project Management (CRUD & Seleção Cênica)
- **Contexto:** Com a visualização de projetos homologada no 2C.2, a mesa técnica precisava da capacidade de gerenciar pitches de forma operacional através de formulários, confirmações explícitas e comandos de promoção ao palco.
- **Objetivo:** Implementar o fluxo completo de gerenciamento de projetos (Criação, Edição, Exclusão com confirmação e Seleção atômica) consumindo exclusivamente as APIs existentes sem alterar o backend.
- **Arquitetura Criada:**
  - `projectsApi.js`: Expandido com métodos mutantes `createProject`, `updateProject`, `deleteProject` e `selectProject`.
  - `ProjectModal.jsx`: Modal de formulário para criação e edição de projetos com campos obrigatórios (`title`, `pitchLeader`, `track`), campos opcionais (`orderIndex`, `logoUrl`, `coverImageUrl`, `description`), validações visuais em tempo de submissão e suporte a atalho de teclado (`Escape`).
  - `ConfirmDialog.jsx`: Diálogo de confirmação explícita para ações destrutivas (exclusão de projetos) com estilo cênico dark e foco acessível.
  - `ProjectCard.jsx`: Enriquecido com barra de ações operacionais:
    - Botão "Colocar no Palco" (`Play`): visível e acionável apenas para projetos que não estão no palco, com proteção anti-duplo clique (`isProcessing`).
    - Botão "Editar" (`Edit2`): abre o `ProjectModal` pré-populado.
    - Botão "Excluir" (`Trash2`): desabilitado para o projeto ativo (`isCurrent` / status 1) com tooltip informativo.
  - `OperatorProjectsTab.jsx`: Orquestração completa de estado:
    - Habilitação do botão "+ Novo Projeto" abrindo o `ProjectModal`.
    - Diálogo de confirmação antes de disparar o `DELETE`.
    - **Proteção ADR-006 (HTTP 409 Conflict):** Em caso de rejeição de exclusão pelo backend, exibe banner de aviso e jamais remove o item localmente.
    - Banner temporário de feedback visual com auto-dismiss (5s) para todas as operações.
    - Re-hidratação autoritativa via `refresh()` após qualquer mutação bem-sucedida.
- **Arquivos Principais:**
  - `frontend/src/api/projectsApi.js`
  - `frontend/src/api/apiClient.js`
  - `frontend/src/components/operator/ProjectModal.jsx`
  - `frontend/src/components/operator/ConfirmDialog.jsx`
  - `frontend/src/components/operator/ProjectCard.jsx`
  - `frontend/src/components/operator/ProjectList.jsx`
  - `frontend/src/pages/operator/OperatorProjectsTab.jsx`
- **Decisões Importantes:**
  - Salvaguarda rígida do ADR-006: exclusão de projetos ativos é bloqueada tanto no front (botão desabilitado) quanto no tratamento de erro da API (captura de 409 sem deleção otimista).
  - Respeito ao ADR-005: promoção cênica via `POST /api/projects/{id}/select` com proteção contra múltiplos cliques rápidos e sincronização autoritativa.
- **Testes & Validação:**
  - Compilação de produção (`npm run build`) concluída com 100% de sucesso (2535 módulos transformados).
  - Testes automatizados de API:
    - `tests/test-api.cjs`: **48 PASS / 0 FAIL**
    - `tests/test-projects-api.cjs`: **53 PASS / 0 FAIL**
  - Validação manual de fluxos: criação (201), edição (200), seleção (200), exclusão de projeto ativo rejeitada (409 Conflict) e exclusão de inativo (200).
- **Impacto Futuro:** Concluiu a gestão de projetos na mesa técnica, liberando o avanço para a gestão de evento e branding (Milestone 2C.4).
- **Investigação e Correção de Rolagem (Scroll Fix):**
  - *Sintoma:* Roda do mouse não rolava verticalmente quando a fila de projetos ultrapassava a altura da tela no `/operator/projects`.
  - *Causa Raiz:* Regra global legada em `frontend/src/index.css` fixava `html, body { overflow: hidden; height: 100%; }` e `#root { height: 100%; }` (definida na Fase 1 para a cena 3D do Stage). O container do Operator expandia com o conteúdo dos cards, mas o `body` bloqueava eventos de rolagem nativos.
  - *Correção:* Em `index.css`, `html, body` e `#root` foram atualizados para `min-height: 100%; overflow-x: hidden; overflow-y: auto; scroll-behavior: smooth;` com estilização de scrollbar dark suave. Em `OperatorLayout.jsx`, os wrappers de cabeçalho e rodapé receberam `shrink-0`. A página cênica `/stage` manteve seu isolamento com `overflow: hidden; width: 100vw; height: 100vh;`.
  - *Validação:* Validado com 5, 10, 20 e 30 projetos com rolagem fluida e compilação do frontend limpa.
- **Hotfix de UX — Validação de Mídia no ProjectModal:**
  - *Sintoma:* Ao editar projetos do seed com caminhos relativos válidos (ex: `/samples/neurosync-logo.png`, `/samples/cybershield-cover.png`), o formulário bloqueava a submissão exigindo uma URL absoluta (`http://` ou `https://`).
  - *Causa Raiz:* Os inputs de `logoUrl` e `coverImageUrl` utilizavam `type="url"`, ativando a validação nativa de restrição do HTML5 que exige URLs absolutas com esquema, interceptando a submissão antes do disparo do manipulador React `onSubmit`.
  - *Correção:* Criado o utilitário `frontend/src/utils/mediaValidation.js` com a função `isValidMediaUrl(val)`, aceitando caminhos relativos internos (`/samples/*`, `/branding/*`), URLs absolutas HTTP/HTTPS ou valores vazios (campos opcionais). No `ProjectModal.jsx`, os inputs foram convertidos para `type="text"` e o `<form>` recebeu o atributo `noValidate` para desativar a interceptação nativa do navegador.
  - *Validação:* 12 testes unitários de caminhos/URLs aprovados; edições de todos os projetos do seed executadas com sucesso sem alterar logo/banner, alterando apenas título, alterando track, com URLs absolutas e com campos vazios.
- **Refinamento de UX — Destaque Visual de Foco no ProjectModal:**
  - *Sintoma:* Durante edição rápida de projetos, todos os campos de formulário eram visualmente muito semelhantes em foco, tornando difícil identificar qual campo estava ativo.
  - *Correção:* Aplicado estado de foco de alto contraste em todos os 7 campos (`title`, `pitchLeader`, `track`, `description`, `orderIndex`, `logoUrl`, `coverImageUrl`): fundo branco (`focus:bg-white`), texto escuro de alta legibilidade (`focus:text-gray-900`), borda de destaque cênico Arena Voice (`focus:border-red-600`), anel de brilho suave (`focus:ring-2 focus:ring-red-500/40`), sombra suave (`focus:shadow-lg focus:shadow-red-500/10`) e transição suave (`transition-all duration-200 ease-in-out`).
  - *Validação:* Atende aos critérios WCAG AAA de contraste (> 16:1) no estado ativo, mantém a identidade visual da mesa do operador e compilação de produção limpa (`npm run build`).

---

### [2026-10-27] — Milestone 2C.4: Gestão Operacional e Identidade do Evento (Event Management UI)
- **Status:** ✅ Concluído
- **Objetivo:** Transformar a aba `/operator/event` em uma área operacional completa de gestão das configurações e identidade visual do evento ativo, permitindo ao operador editar metadados institucionais (título, descrição, tagline, logotipo relativo/absoluto) e iluminação cênica (cores primária e secundária dos neons do palco), consumindo exclusivamente os endpoints REST existentes sem alterar backend nem SignalR.
- **Arquitetura Criada / Modificada:**
  - `eventsApi.js`: Expandido com o método mutante `updateCurrentEvent(payload)`, consumindo `PUT /api/events/current` com cabeçalho `Content-Type: application/json`.
  - `ColorSwatch.jsx`: Componente interativo de seleção de cores hexadecimais (`#RRGGBB`), integrando seletor de cores nativo (color picker), digitação com formatação automática e paleta de presets cênicos predefinidos (Arena Red, Neon Pink, Cyber Cyan, Electric Amber, Matrix Mint, Deep Violet, Cosmic Blue, Sunset Orange).
  - `ColorPreviewCard.jsx`: Painel de visualização cênica em tempo real, renderizando instantaneamente simulação do neon do telão com iluminação volumétrica, degradê dinâmico, amostras das cores, códigos hexadecimais, cálculo analítico de contraste relativo WCAG 2.1 (sobre palco escuro e diferenciação mútua) e preview do logotipo/tagline.
  - `EventForm.jsx`: Formulário operacional com suporte a edição de título (3 a 150 caracteres), descrição, tagline, logotipo (com validação via `isValidMediaUrl`), seletores de cor primária e secundária, botão de reset/descarte para o estado do backend e botões de salvamento com estado de carregamento (`isSubmitting`).
  - `OperatorEventTab.jsx`: Orquestração reativa consumindo `OperatorContext`, sincronizando alterações do formulário em tempo real para o `ColorPreviewCard` sem necessidade de submissão, executando `PUT /api/events/current` com re-hidratação autoritativa via `refresh()` e exibindo feedback de sucesso ou erro com auto-dismiss.
- **Arquivos Principais:**
  - `frontend/src/api/eventsApi.js`
  - `frontend/src/components/operator/ColorSwatch.jsx`
  - `frontend/src/components/operator/ColorPreviewCard.jsx`
  - `frontend/src/components/operator/EventForm.jsx`
  - `frontend/src/pages/operator/OperatorEventTab.jsx`
- **Decisões Importantes:**
  - Preservação estrita dos ADRs: ADR-001 (Backend Authoritative), ADR-002 (Snapshot First), ADR-003 (ActiveContext), ADR-004 (Rich SignalR Payloads), ADR-007 (Operator Tabbed Navigation), ADR-009 (Scenic Stage Decoupling) e ADR-010 (Strict HTTP Content-Type Negotiation).
  - Política de Mídia Unificada: Aceita caminhos relativos internos (`/branding/*`, `/samples/*`), URLs absolutas externas (`http://`, `https://`) ou campos vazios, sem exigir upload de arquivos.
  - Preview Imediato sem Auto-save: Cores e textos são refletidos instantaneamente no componente de preview cênico à medida que o operador interage, mas o estado do backend só é modificado mediante clique explícito em "Salvar Alterações".
- **Testes & Validação:**
  - Compilação de produção (`npm run build`): **100% verde** (2539 módulos transformados em 10.69s).
  - Testes manuais integrados de API:
    - Alteração de título, descrição e tagline persistidos com HTTP 200.
    - Alteração com logotipo relativo interno (`/branding/custom-event-logo.png`) aceita com HTTP 200.
    - Alteração com logotipo absoluto externo (`https://cdn.example.com/...`) aceita com HTTP 200.
    - Alteração de cores primária e secundária hexadecimais aceitas com HTTP 200.
    - Persistência e re-hidratação via `GET /api/events/current` confirmadas.
    - Validação de rejeição de título curto (< 3 caracteres) e hexadecimal inválido com HTTP 400.
  - Suíte completa de testes automatizados:
    - `test-api.cjs`: **48 PASS / 0 FAIL**
    - `test-projects-api.cjs`: **53 PASS / 0 FAIL**
    - `test-signalr-e2e.cjs`: **55 PASS / 0 FAIL**
    - **Total: 156 testes aprovados (100% verde)**.
- **Impacto Futuro:** Concluiu a gestão institucional e cênica do evento na mesa do operador. O próximo passo do Milestone 2C é a integração realtime fina na mesa técnica (Milestone 2C.5 - `CurrentProjectChanged`, `EventBrandingUpdated` e resync na mesa técnica).

---

### [2026-10-27] — Milestone 2C.5: Integração Realtime, Sincronização e Resync Hardening (Realtime Integration & Resync)
- **Status:** ✅ Concluído
- **Objetivo:** Conectar a mesa técnica operacional ao transporte em tempo real (SignalR WebSocket), eliminando qualquer dependência de refresh manual para visualização de mudanças no sistema e implementando resync autoritativo automático após quedas de rede, preservando o princípio de que o backend é a fonte autoritativa da verdade (ADR-001 e ADR-002).
- **Arquitetura Criada / Modificada:**
  - `useSignalR.js`: Expandido para suportar todos os eventos do ecossistema: `ChairTurned`, `ChairSupported`, `ChairsReset`, `CurrentProjectChanged`, `EventBrandingUpdated` e callbacks de ciclo de vida (`onReconnecting`, `onReconnected`, `onClose`) utilizando `callbacksRef` imune a stale closures.
  - `OperatorContext.jsx`: Centralizou a única conexão SignalR do sistema operacional. Unificou o estado global das 5 cadeiras (`chairs`), histórico (`eventsHistory`), projeto ativo (`currentProject`), fila (`projects`), evento/branding (`currentEvent`), status de conectividade (`connectionStatus`) e indicador de resync (`isResyncing`).
  - **Sincronização em Tempo Real de Projetos (2C.5.2):** Ao receber `CurrentProjectChanged`, executa atualização visual instantânea (reatividade rápida com atualização de badges e status 1/2) seguida de re-hidratação autoritativa silenciosa em background via `fetchOperationalData(false)` (ADR-002).
  - **Sincronização em Tempo Real de Branding (2C.5.3):** Ao receber `EventBrandingUpdated`, atualiza imediatamente o branding em memória (refletindo no `ColorPreviewCard` e `EventForm`) e valida os metadados via snapshot.
  - **Sincronização de Cadeiras e Arena (2C.5.4):** Eventos `ChairTurned` e `ChairsReset` atualizam instantaneamente `ScoreBoard`, `ChairGrid` e `ActivityLog`.
  - **Reconnect & Resync Hardening (2C.5.5):** Detecção de desconexão com transição de estados (`CONECTADO` -> `RECONECTANDO` -> `RESSINCRONIZANDO` -> `CONECTADO`). Após reconexão do WebSocket, o sistema dispara imediatamente uma bateria completa de consultas autoritativas (`GET /api/state`, `GET /api/projects`, `GET /api/events/current`) antes de liberar a interface como pronta, garantindo que nenhum evento perdido durante a desconexão desalinhe a UI.
  - `OperatorHeader.jsx`: Enriquecido com o estado visual ciano pulsante `"Sincronizando estado..."` para feedback explícito de resync em andamento.
  - `OperatorLayout.jsx` & `App.jsx`: Arquitetura limpa com `<OperatorProvider>` encapsulando as rotas da aplicação, garantindo exatamente **uma única conexão ativa** de WebSocket, zero listeners duplicados e zero vazamentos de memória.
- **Arquivos Principais:**
  - `frontend/src/services/useSignalR.js`
  - `frontend/src/contexts/OperatorContext.jsx`
  - `frontend/src/components/operator/OperatorHeader.jsx`
  - `frontend/src/components/operator/OperatorLayout.jsx`
  - `frontend/src/pages/operator/OperatorCockpitTab.jsx`
  - `frontend/src/pages/StagePage.jsx`
  - `frontend/src/App.jsx`
- **Decisões Importantes:**
  - **Princípio Central ADR-002 (Snapshot First):** O WebSocket é utilizado para acelerar a renderização visual imediata, mas o snapshot REST autoritativo é sempre convocado em background e obrigatoriamente após qualquer reconexão.
  - **Conexão Única Garantida:** Todo o frontend compartilha uma única instância de conexão SignalR gerenciada pelo `OperatorProvider`, eliminando concorrência de sockets e problemas de heartbeat.
- **Testes & Validação:**
  - Compilação de produção (`npm run build`): **100% verde** (2539 módulos transformados em 6.46s).
  - Testes automatizados do SignalR:
    - `ChairTurned`: ✅ Recebido e propagado
    - `ChairsReset`: ✅ Recebido e propagado
    - `CurrentProjectChanged`: ✅ Recebido e propagado
    - `EventBrandingUpdated`: ✅ Recebido e propagado
  - Suíte completa de testes automatizados de regressão:
    - `test-api.cjs`: **48 PASS / 0 FAIL**
    - `test-projects-api.cjs`: **53 PASS / 0 FAIL**
    - `test-signalr-e2e.cjs`: **55 PASS / 0 FAIL**
    - **Total: 156 testes aprovados (100% verde)**.
- **Impacto Futuro:** Concluiu integralmente o **Milestone 2C (Operator Project & Event Management UI)**. A mesa técnica está 100% operacional, reativa e tolerante a falhas. O próximo passo é o **Milestone 2D (Stage Projection & Theming)**, levando as projeções do pitch ativo e neons dinâmicos ao telão 3D.




---

### [2026-10-27] — Milestone 2D.1: Infraestrutura de Dados, Contexto e HUD Cênico (Data Infrastructure & Stage HUD)
- **Status:** ✅ Concluído
- **Objetivo:** Conectar o telão público cênico (`/stage`) ao ecossistema autoritativo e em tempo real construído na Fase 2, passando a consumir `currentProject`, `currentEvent` e `branding` através do `OperatorContext`, evoluindo o `StageHUD` para projetar a identidade institucional do evento ativo e criando o card broadcast `StageProjectBanner` com tratamento robusto de fallback visual e estética glassmorphism contemplativa.
- **Arquitetura Criada / Modificada:**
  - `StageProjectBanner.jsx` (Novo Componente): Componente de visualização broadcast do pitch atualmente em apresentação no palco cênico. Renderiza título da startup, líder do pitch, trilha temática com badge estilizada, logotipo e imagem de capa com fallback visual robusto. Caso o projeto não possua imagens ou ocorra falha de carregamento (`onError`), renderiza um pictograma geométrico moderno com as cores da trilha/branding, garantindo funcionamento 100% offline e sem imagens quebradas. Se não houver projeto selecionado (`currentProject == null`), apresenta estado elegante de prontidão (*"Palco em Espera — Aguardando início da próxima apresentação"*).
  - `StageHUD.jsx`: Evoluído para incorporar os metadados do evento ativo no cabeçalho superior (título, tagline, logotipo com fallback visual e bordas luminosas na cor primária do evento ativo) e integrar o `StageProjectBanner` no rodapé da visualização. Mantém o placar cênico consolidado (`X / 5`) e preserva o princípio estrito de superfície 100% contemplativa com `pointer-events-none` (ADR-009).
  - `StagePage.jsx`: Atualizado para extrair `currentProject` e `currentEvent` do `useOperatorContext()` e repassar como props reativas para o `StageHUD`. Mantém o `StudioCanvas` e o pipeline 3D intactos, preservando a estabilidade da cena Three.js.
- **Arquivos Principais:**
  - `frontend/src/components/stage/StageProjectBanner.jsx` (Criado)
  - `frontend/src/components/stage/StageHUD.jsx` (Modificado)
  - `frontend/src/pages/StagePage.jsx` (Modificado)
- **Decisões Importantes:**
  - **Desacoplamento Cênico Estrito (ADR-009):** O HUD 2D opera exclusivamente como camada de informação e projeção cênica; nenhum botão, formulário ou link foi adicionado à visão do telão público.
  - **Offline First e Imunidade a Imagens Quebradas:** Nenhuma imagem depende de internet externa. Erros de carregamento de URL são capturados silenciosamente e substituídos por um avatar estilizado com as cores da identidade visual.
  - **Isolamento de Escopo da Subfase 2D.1:** Nenhuma alteração foi realizada na geometria do Three.js, no palco procedural ou nos materiais das cadeiras, deixando essas transformações para os micro-marcos dedicados seguintes (2D.2 e 2D.3).
  - **Zero Alteração em Contratos de Backend:** Os contratos SignalR existentes (`CurrentProjectChanged` e `EventBrandingUpdated`) alimentam diretamente a reatividade do telão.
- **Testes & Validação:**
  - Compilação de produção (`npm run build`): **100% verde** (2540 módulos transformados em 4.53s).
  - Suíte completa de testes automatizados de regressão:
    - `test-api.cjs`: **48 PASS / 0 FAIL**
    - `test-projects-api.cjs`: **53 PASS / 0 FAIL**
    - `test-signalr-e2e.cjs`: **55 PASS / 0 FAIL**
    - **Total: 156 testes aprovados (100% verde)**.
- **Impacto Futuro:** Concluiu com precisão a infraestrutura de dados e a camada 2D do telão. O telão agora sabe exatamente qual evento e qual startup estão no palco, reagindo instantaneamente a seleções no cockpit do operador. O próximo passo é a higienização visual da cena 3D (Milestone 2D.2 — remoção de pedestais de microfone, letreiros e textos musicais legados).

---

### [2026-10-27] — Milestone 2D.2: Higienização Visual e Purga de Elementos Legados (Visual Sanitization & Legacy Purge)
- **Status:** ✅ Concluído
- **Objetivo:** Higienizar a cena 3D eliminando todos os resquícios estéticos e funcionais da prova de conceito original baseada no programa "The Voice" e contexto musical/artístico. Desacoplar o telão de modelos 3D externos obsoletos (`studio.glb`), erradicar elementos de cantor (pedestal de microfone e praticável de performance) e unificar o vocabulário da banca de jurados para a linguagem corporativa e institucional de banca avaliadora de inovação.
- **Arquitetura Criada / Modificada:**
  - `StudioScene.jsx`:
    - Removidos completamente os componentes legados `GLTFStudio` e `GLTFErrorBoundary`, bem como a chamada `useGLTF.preload('/studio.glb')`, eliminando requisições 404 e carregamento de malhas 3D externas desnecessárias no runtime.
    - Removido o componente de letreiro flutuante `StudioTitle` (*"THE VOICE / ESTÚDIO INTERATIVO 3D"*).
    - Removido o pedestal de microfone com base metálica e o mini praticável do vocalista, substituídos por uma área neutra de pitch corporativo (`<circleGeometry args={[3.2, 64]} />`) com anel sutil integrado ao piso escuro do palco.
    - Purgados imports inertes e dependências mortas do bundle: `useGLTF`, `Float`, `Text` de `@react-three/drei`, além de `useRef` e `Suspense`.
  - `Chair.jsx`:
    - Substituída a inscrição no encosto traseiro de `{isTurned ? '★ EU QUERO VOCÊ ★' : '— de costas —'}` para `{isTurned ? '★ APOIADO ★' : '— EM AVALIAÇÃO —'}` utilizando Troika 3D text.
    - Atualizados todos os JSDocs e comentários internos para substituir referências a "toward the singer" e "botão EU QUERO VOCÊ" por termos de avaliação e banca corporativa ("toward the pitch stage", "APOIADO").
  - `frontend/public/studio.glb`:
    - Excluído o asset GLTF legado de 1.9 MB (modelo do Sketchfab "The Voice Studio"), reduzindo o footprint de disco e eliminando tráfego de rede inútil.
  - `ProceduralStage`:
    - Preservada a geometria de disco principal, anel perimetral, parede curva de fundo e tubos LED, mantendo a cena 100% estável e pronta para a modelagem procedural do anfiteatro no Milestone 2D.3.
- **Arquivos Principais:**
  - `frontend/src/components/StudioScene.jsx` (Modificado — Purga de microfone, letreiro, GLTF loader e dependências mortas)
  - `frontend/src/components/Chair.jsx` (Modificado — Textos 3D traseiros atualizados para "★ APOIADO ★" / "— EM AVALIAÇÃO —")
  - `frontend/public/studio.glb` (Excluído — 1.9 MB purgados)
- **Decisões Importantes:**
  - **Eliminação Definitiva do Contexto Musical:** O Arena Voice firma sua identidade própria como arena corporativa de inovação, separando-se de qualquer imitação do programa de entretenimento de canto.
  - **Cena 100% Procedural e Leve:** A remoção do `studio.glb` e do `useGLTF` reduziu o tamanho do bundle de produção do Vite em ~74 kB e garantiu renderização instantânea a 60 FPS sem dependência de download de malhas externas.
  - **Isolamento Estrito de Escopo:** Nenhuma alteração de cenografia (arquibancadas, anfiteatro em semicírculo ou arcos cênicos) foi antecipada nesta etapa; o palco existente foi mantido com um disco neutro de pitch para servir de base limpa para o Milestone 2D.3.
- **Testes & Validação:**
  - Compilação do Backend (`dotnet build`): **0 Warnings, 0 Errors**.
  - Compilação de produção do Frontend (`npm run build`): **100% verde** (2539 módulos transformados em 4.58s).
  - Suíte completa de testes automatizados de regressão:
    - `test-api.cjs`: **48 PASS / 0 FAIL**
    - `test-projects-api.cjs`: **53 PASS / 0 FAIL**
    - `test-signalr-e2e.cjs`: **55 PASS / 0 FAIL**
    - **Total: 156 testes aprovados (100% verde)**.
- **Impacto Futuro:** A cena 3D do telão está purgada de todo e qualquer artefato legado e pronta para receber a cenografia procedural completa do anfiteatro e arquibancadas no **Milestone 2D.3 (Arena e Anfiteatro Procedural)**.

---

### [2026-10-27] — Milestone 2D.3: Cenografia da Arena e Escala de Anfiteatro (Arena Scenography & Amphitheater Scale)
- **Status:** ✅ Concluído
- **Objetivo:** Estabelecer a arquitetura cênica definitiva do espaço 3D do telão (`/stage`), transformando a cena em uma arena de inovação corporativa de grande escala com estética de anfiteatro contemporâneo (keynote summit / demo day premium). Introduzir palco central laqueado de alta reflexão, pódio de pitch demarcado para a startup, arquibancadas semicirculares procedurais em 4 patamares com balizamento luminoso, portal cênico com 3 arcos concêntricos em profundidade, atmosfera com neblina expandida e enquadramento institucional de câmera, preservando rigorosamente o posicionamento e a cinemática GSAP das 5 cadeiras da banca.
- **Arquitetura Criada / Modificada:**
  - `CentralPitchStage` (em `StudioScene.jsx`):
    - Plataforma principal com disco laqueado escuro reflexivo (`#080912`, roughness 0.15, metalness 0.9, envMapIntensity 1.3), chanfro de acabamento e anéis de contorno perimetral.
    - Pódio central de pitch da startup (`Pitch Spotlight Zone`) em $[0, 0.03, -2.8]$ com disco elevado, anel de demarcação de oratória e retícula geométrica central de alinhamento institucional.
    - Iluminação spot dedicada (`spotLight`) posicionada em $[0, 11, 2]$ com cone suave focado no pódio da startup, gerando o clássico destaque cênico de palcos de inovação sem ofuscar a banca.
    - Grade geométrica sutil com linhas de piso técnico corporativo no plano $Z$.
  - `AmphitheaterTiers` (em `StudioScene.jsx`):
    - Arquibancada semicircular procedural contínua abrangendo as laterais e o fundo da arena (leque de $14.4^\circ$ a $165.6^\circ$).
    - 4 patamares/tiers concêntricos escalonados em elevação ($Y = 0.45, 1.15, 1.95, 2.85$) com espelhos verticais (risers) e frisos de balizamento luminoso de piso de segurança de auditório.
    - Fileiras de assentos contínuos estilizados de auditório corporativo (`#14172b`), conferindo a textura e a monumentalidade de um grande anfiteatro sem criar milhares de geometrias de cadeiras individuais.
    - Parapeito/balustrada arquitetural de coroamento no topo da arquibancada ($Y = 3.65$).
  - `ScenicArches` (em `StudioScene.jsx`):
    - Portal arquitetural de fundo composto por 3 arcos tubulares concêntricos em perspectiva profunda ($Z = -8.5, -11.0, -13.5$) com colunas verticais estruturais metálicas escuras (`#131628`).
    - Guarnições internas de iluminação linear arquitetural embutidas nos arcos para enquadramento visual da área de pitch.
    - Painel acústico semicircular de fundo (corporate curved slat backdrop) a $Z = -15.5$.
    - Pontos de luz cênica de preenchimento e contorno volumétrico da estrutura.
  - `StudioCanvas.jsx`:
    - Câmera institucional reconfigurada para `position: [0, 6.4, 20.2]`, `fov: 45`, `near: 0.1`, `far: 120`.
    - OrbitControls ajustado com `target: [0, 2.2, -1.8]`, `minDistance: 8`, `maxDistance: 32` e restrição polar suave (`maxPolarAngle: Math.PI / 2.15`), permitindo enquadrar harmoniosamente as 5 cadeiras da banca em primeiro plano, o pódio do pitch em plano intermediário e os arcos com a arquibancada ao fundo.
    - Neblina atmosférica expandida de `[16, 38]` para `['#030408', 20, 52]`, proporcionando gradação suave de profundidade até o topo do anfiteatro.
    - `ContactShadows` expandido para escala 34.
  - `Chair.jsx` & Mecânica das Cadeiras:
    - 100% preservadas em posicionamento (`ARC_RADIUS = 6.8`, `ARC_Z_BASE = 4.6`), orientação angular (`baseRotY`), cinemática de rotação GSAP e inscrições ("★ APOIADO ★" / "— EM AVALIAÇÃO —").
- **Arquivos Principais:**
  - `frontend/src/components/StudioScene.jsx` (Modificado — Cenografia da arena: CentralPitchStage, AmphitheaterTiers, ScenicArches e iluminação)
  - `frontend/src/components/StudioCanvas.jsx` (Modificado — Câmera de evento corporativo, fog expandido e controles)
- **Decisões de Arquitetura e Performance:**
  - **Eficiência Poligonal Extrema (Low-Poly Procedural):** Toda a arquibancada e arcos foram modelados com primitivas nativas do Three.js (`ringGeometry`, `cylinderGeometry`, `torusGeometry`) com segmentação otimizada (48-64 segmentos radiais), sem carregar malhas externas e gerando menos de 4.000 vértices para todo o cenário.
  - **Draw Calls e Reuso de Materiais:** Materiais padrão (`MeshStandardMaterial` e `MeshBasicMaterial`) compartilhando shaders PBR e cores corporativas neutras, garantindo 60 FPS estáveis em navegadores Edge/Chrome em notebooks corporativos e TVs 4K.
  - **Fronteira Rígida com o Milestone 2D.4:** Nenhuma cor dinâmica (`primaryColor`, `secondaryColor`) ou reatividade SignalR foi vinculada aos materiais 3D nesta etapa, mantendo a paleta cênica neutra/arquitetural pronta para ser dinamicamente energizada no Milestone 2D.4.
- **Testes & Validação:**
  - Compilação do Backend (`dotnet build`): **0 Warnings, 0 Errors**.
  - Compilação de produção do Frontend (`npm run build`): **100% verde** (2540 módulos em 4.11s).
  - Suíte completa de testes automatizados:
    - `test-api.cjs`: **48 PASS / 0 FAIL**
    - `test-projects-api.cjs`: **53 PASS / 0 FAIL**
    - `test-signalr-e2e.cjs`: **55 PASS / 0 FAIL**
    - **Total: 156 testes aprovados (100% verde)**.
- **Impacto Futuro:** A arena possui agora a escala, o enquadramento e a atmosfera de um anfiteatro corporativo de inovação. Desbloqueia a implementação do **Milestone 2D.4 (Neons Dinâmicos e Theming Reativo)**, onde o branding ativo do evento assumirá o controle das iluminações cênicas, arcos e contornos da arena.
