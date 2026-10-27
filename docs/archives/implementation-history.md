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

