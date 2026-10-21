# Auditoria Marco 1 — Software Foundation
## Plataforma Arena Voice / Arena de Inovação

> **Status do Marco:** CONCLUÍDO  
> **Data de Fechamento:** Outubro de 2026  
> **Objetivo:** Registro do estado técnico comprovado da plataforma após a validação da fundação de software (Marco 1).  
> **Referência Arquitetural:** POC funcional validada nos cenários automatizados e manuais documentados.

---

## 1. Objetivo

Este documento registra a fotografia técnica oficial do projeto **Arena Voice / Arena de Inovação** no encerramento do **Marco 1 (Software Foundation / Software Validation)**.

Sua finalidade é fornecer a qualquer desenvolvedor, arquiteto ou engenheiro que ingresse no projeto uma referência factual e auditada do que efetivamente existe no código, o que foi validado por testes automatizados e manuais, quais são as limitações conhecidas da fase atual e qual é o ponto de partida inegociável para as próximas fases.

---

## 2. Estado do Repositório

O repositório atual organiza-se nas seguintes frentes:

| Componente | Localização | Tecnologia / Stack | Papel no Sistema |
| :--- | :--- | :--- | :--- |
| **Backend** | `backend/` | .NET 10 (C# Minimal API) | Servidor HTTP de eventos, hub SignalR e estado volátil em memória. |
| **Frontend** | `frontend/` | React 19, Three.js, R3F, GSAP 3.15, TailwindCSS, Vite 8 | Aplicação de visualização do telão (*Voice Studio 3D*) e controles temporários de teste. |
| **Testes Automatizados** | `tests/` | Node.js (CommonJS, `@microsoft/signalr`) | Suítes de validação automatizada de contratos REST, integridade de estado e eventos SignalR. |
| **Scripts Operacionais** | `scripts/` | PowerShell (`.ps1`) e CMD Batch (`.cmd`) | Scripts para inicialização local e simulação de disparos com resolução de ferramentas portáteis. |
| **Firmware de Referência** | `firmware/` | C++ (Arduino / ESP32) | Implementação de referência para protótipo de botão arcade físico via Wi-Fi (trilha paralela de hardware). |
| **Documentação Técnica** | `docs/` e raiz | Markdown | Arquitetura, rede, hardware, auditoria do Marco 1 e Roadmap Mestre v1.1. |

---

## 3. Arquitetura Atual Confirmada

A espinha dorsal de software validada e operacional opera estritamente conforme o fluxo unidirecional:

```text
  [ Fonte de Evento ]
  (Botão Físico / Script de Teste / Interface Manual)
           │
           ▼ HTTP POST /api/chair-press  {"chairId": 1}
  ┌────────────────────────────────────────────────────────┐
  │         BACKEND MINIMAL API (.NET 10)                  │
  │ • Validação de chairId (1..5)                          │
  │ • Log de auditoria no console com IP de origem e hora  │
  │ • Atualização do Arena State em memória                │
  └────────────────────────┬───────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼ SignalR (Push Realtime)       ▼ REST Snapshot (Pull Hydration)
       Evento: ChairTurned             Endpoint: GET /api/state
           │                               │
           └───────────────┬───────────────┘
                           │
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │       FRONTEND REACT 19 + THREE.JS (VOICE STUDIO 3D)   │
  │ • Hook useSignalR com reconexão resiliente contínua    │
  │ • Sincronização e reidratação de estado com o backend  │
  │ • Transição cinemática de rotação 180° via GSAP        │
  │ • Cena 3D com iluminação cênica e HUD 2D de status     │
  └────────────────────────────────────────────────────────┘
```

---

## 4. Contratos Confirmados no Código

### 4.1. Contratos REST (HTTP)

Auditados diretamente em `backend/Program.cs`:

| Método | Endpoint | Payload de Entrada | Resposta de Sucesso | Status Code | Papel |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/chair-press` | `{"chairId": 1..5}` *(ou `{"seatNumber": 1..5}`)* | `{"accepted": true, "chairId": n, "message": "...", "serverTime": "..."}` | `200 OK` | Endpoint canônico primário de acionamento. |
| `POST` | `/api/support` | `{"seatNumber": 1..5}` *(ou `{"chairId": 1..5}`)* | `{"accepted": true, "seatNumber": n, "chairId": n}` | `200 OK` | Endpoint mantido exclusivamente para retrocompatibilidade histórica. |
| `GET` | `/api/state` | *Nenhum* | `{"chairs": {"1": bool, ..., "5": bool}, "activeCount": int}` | `200 OK` | Retorna o snapshot completo das 5 cadeiras e total ativas. |
| `POST` | `/api/reset` | *Nenhum* | `{"message": "...", "chairs": {...}}` | `200 OK` | Redefine todas as cadeiras para `false` e notifica clientes via SignalR. |
| `GET` | `/api/status` | *Nenhum* | `{"status": "ONLINE", "service": "...", "port": int, "timestamp": "..."}` | `200 OK` | Health check básico de liveness do serviço. |

### 4.2. Contratos SignalR (WebSocket)

Auditados em `backend/Hubs/ArenaPocHub.cs` e `backend/Program.cs`:
- **Rotas ativas:** `/hubs/arena-poc` (principal) e `/arenaHub` (alias legado).
- **Eventos emitidos pelo servidor:**
  - `ChairTurned`: Payload `{ chairId: int, timestamp: DateTimeOffset, source: string }`.
  - `ChairSupported`: Payload `{ seatNumber: int, chairId: int }` *(alias legado)*.
  - `ChairsReset`: *Sem payload* (comando para reset global das 5 cadeiras).

### 4.3. Convenções de Identificação
- **Canônico:** `chairId` numérico inteiro de `1` a `5`.
- **Retrocompatibilidade:** `seatNumber` continua aceito pelo backend na deserialização via método auxiliar `request.GetEffectiveChairId()`.

---

## 5. Validações Realizadas

O Marco 1 cobriu formalmente os seguintes eixos de verificação:

1. **Validação de Contratos da API:** Respostas HTTP corretas para dados válidos e tratamento de requisições maliciosas ou corrompidas.
2. **Validação E2E com SignalR:** Acionamento via HTTP com recebimento assíncrono de eventos WebSocket pelo cliente SignalR oficial.
3. **Compilação de Produção do Frontend:** Build de distribuição gerado com sucesso via `vite build`.
4. **Hidratação Inicial de Estado:** Frontend consulta `GET /api/state` na montagem inicial e renderiza corretamente cadeiras já ativas.
5. **Comportamento em Quedas Prolongadas:** Frontend tenta reconexão automática e entra em loop contínuo caso os retries padrão se esgotem.
6. **Reconciliação Pós-Reconexão:** Ao restabelecer contato com o backend, o frontend refaz o snapshot via `GET /api/state` e ajusta a cena 3D caso o estado tenha mudado durante o período de desconexão.

---

## 6. Resultados Automatizados Confirmados

A auditoria direta dos arquivos da pasta `tests/` confirma as seguintes baterias de testes:

### Suíte 1: `tests/test-api.cjs`
- **Total de verificações:** 48 verificações automatizadas aprovadas (48 PASS / 0 FAIL).
- **Cenários cobertos:**
  - `GET /api/status` retornando `200 OK` e `status: "ONLINE"`;
  - `POST /api/reset` e `GET /api/state` inicializando em `activeCount: 0` e cadeiras 1–5 em `false`;
  - `POST /api/chair-press` para cada uma das cadeiras 1, 2, 3, 4 e 5 retornando `accepted: true` e preservando `chairId`;
  - Verificação de estado consolidado após 5 acionamentos (`activeCount: 5`);
  - `POST /api/reset` restaurando `activeCount: 0` e cadeiras em `false`;
  - Rejeição de `chairId` inválido (`0`, `6`, `-1`) com `400 Bad Request`;
  - Rejeição de payloads inválidos (payload vazio `{}`, campos desconhecidos `{"foo":1}`, tipos textuais `{"chairId":"abc"}` e JSON malformado) com `400 Bad Request`;
  - Imunidade do estado em memória contra requests inválidos (estado preservado);
  - Retrocompatibilidade de `seatNumber` em `/api/chair-press`;
  - Retrocompatibilidade do endpoint `/api/support`;
  - Limpeza final do ambiente.

### Suíte 2: `tests/test-signalr-e2e.cjs`
- **Total de verificações:** 46 verificações automatizadas aprovadas (46 PASS / 0 FAIL).
- **Cenários cobertos:**
  - Estabelecimento de conexão com `/hubs/arena-poc`;
  - Disparo de acionamento sequencial das cadeiras 1 a 5 via REST e escuta de eventos `ChairTurned` via SignalR;
  - Validação de entrega dos 5 eventos correspondentes sem perda de pacotes;
  - Validação de `GET /api/state` confirmando `activeCount: 5`;
  - Reset remoto via `POST /api/reset` com escuta do evento de broadcast `ChairsReset`;
  - Validação de retorno a `activeCount: 0` e desconexão limpa.

> [!NOTE]
> Os resultados acima correspondem a **94 verificações automatizadas aprovadas** nas suítes existentes. Isso comprova o funcionamento correto dos cenários testados, não devendo ser interpretado como cobertura total do sistema.

---

## 7. Comportamentos Confirmados em Operação

1. **Cadeiras Lógicas 1 a 5:** Cada cadeira reage de forma independente. O acionamento de uma cadeira não afeta o estado visual das demais.
2. **Reset Global:** O reset redefine todas as 5 cadeiras simultaneamente para a orientação de costas (`isTurned = false`) e zera o contador no HUD.
3. **Resiliência a Requisições Inválidas:** Erros de formato ou IDs inexistentes não derrubam o processo do backend nem poluem o dicionário `chairStates`.
4. **Isolamento de Modo:** No frontend, quando o *Modo Dev* está desativado (*Modo Hardware Exclusivo*), cliques do mouse no HUD e nos modelos 3D são ignorados, garantindo que somente eventos externos acionem as cadeiras.
5. **Re-hidratação Pós-Desconexão:** Testado o cenário em que o backend é derrubado com 3 cadeiras ativas, 2 novas são ativadas e o telão reconecta: o frontend busca `GET /api/state` via gatilho de `reconnectVersion` e sincroniza o telão.

---

## 8. Limitações Conhecidas no Estado Atual

As seguintes limitações são inerentes ao escopo da POC do Marco 1 e não constituem falhas, mas sim escopo postergado para as próximas fases:

1. **Volatilidade do Arena State:** O estado reside em um `Dictionary<int, bool>` na memória volátil do processo backend. Se o backend reiniciar, o estado retorna para 0/5 ativas.
2. **Inexistência das Entidades de Domínio:** O backend atual não possui conceito de *Evento*, *Projeto*, *Rodada* ou *Avaliador*. Ele opera unicamente como comutador de estado das 5 cadeiras.
3. **Ausência de Janela Temporal de Votação (Round State):** Qualquer acionamento em `/api/chair-press` é aceito a qualquer momento; não existe bloqueio por rodada fechada ou cronômetro.
4. **Ausência de Motor de Regras e Resultados (Result Engine):** O sistema apenas conta quantas cadeiras viraram (0 a 5); não existe cálculo de aprovação, notas, pesos ou empates.
5. **Acoplamento de Interface (Stage e Operator):** Os controles de teste e o botão de reset coexistem na mesma tela do estúdio 3D que seria projetada no telão do evento.
6. **Alerta de Tamanho de Chunks no Frontend:** O build de produção pelo Vite emite warning informando que o chunk principal atinge 1.542 kB (devido às bibliotecas Three.js, R3F, Drei e GSAP). Em execução de rede local, o impacto é insignificante.
7. **Hardware como Trilha Paralela:** O firmware do ESP32 existe como referência funcional, mas a integração de múltiplos dispositivos físicos e hardware definitivo corre em frente separada e não bloqueia a evolução do software.

---

## 9. Decisões em Standby (Não Implementadas Prematuramente)

As seguintes decisões técnicas foram deliberadamente colocadas em espera e **NÃO** devem ser decididas ou implementadas agora:

- **Tecnologia de Banco de Dados:** Não definir SQLite, PostgreSQL, SQL Server ou arquivos JSON até a consolidação formal do modelo de dados (Fase 7).
- **Mecanismos de Autenticação / Autorização:** Não adicionar JWT, OAuth2 ou ASP.NET Identity enquanto a aplicação operar em rede local controlada de evento.
- **Arquitetura Distribuída ou Nuvem:** O sistema deve permanecer 100% autossuficiente e funcional em ambiente offline local.
- **Estratégia Definitiva de Deploy:** Contêineres, orquestração ou pipelines de nuvem serão avaliados na fase de hardening operacional.
- **Otimizações Prematuras de Bundle:** Divisão dinâmica de código e lazy loading serão aplicados quando a estrutura de rotas estiver consolidada.

---

## 10. Declaração de Encerramento do Marco 1

> **MARCO 1 — SOFTWARE FOUNDATION / SOFTWARE VALIDATION**  
> **Status:** CONCLUÍDO  
> **Parecer da Auditoria:** A fundação de software do Arena Voice está homologada e validada nos cenários automatizados e manuais documentados. A espinha dorsal `Fonte de Eventos -> REST -> Backend -> Arena State -> SignalR -> Frontend -> Voice Studio 3D` comprovou sua estabilidade operacional para tráfego de eventos em tempo real com reidratação e recuperação de falha de conexão.

---

## 11. Ponto de Partida para a Próxima Fase

Com a fundação técnica consolidada, a evolução deve prosseguir estritamente pela:

### 👉 **PRÓXIMA FASE: FASE 1 — STAGE SCREEN + OPERATOR SCREEN**

**Justificativa Arquitetural:**  
O telão projetado para o auditório (*Stage Screen*) precisa rodar limpo em tela cheia com visual cinematográfico, sem botões de clique manual ou de reset. Simultaneamente, a mesa técnica precisa de uma interface dedicada (*Operator Screen*) para acompanhar o status da conexão, monitorar as cadeiras e comandar o reset do palco. Essa separação é o primeiro passo para transformar a POC técnica em uma experiência operacional viável para eventos reais.

---

## 12. Guia de Onboarding Rápido para Novo Desenvolvedor

Siga este roteiro sequencial para assumir o projeto:

```text
[1] Leitura Obrigatória:
    ├── README.md (visão geral e setup de ferramentas portáteis)
    ├── docs/AUDITORIA_MARCO_1_SOFTWARE_FOUNDATION.md (este documento)
    └── ROADMAP_ARENA_VOICE.md (visão de produto e roadmap v1.1)

[2] Validação do Ambiente:
    ├── Confirmar presença de .NET 10 SDK e Node.js 18+ (ou configurar .env com binários portáteis)
    ├── Executar: scripts\start-backend.cmd (ou .ps1) -> Backend escutando em 0.0.0.0:5000
    └── Executar: scripts\start-frontend.cmd (ou .ps1) -> Frontend em http://localhost:5173

[3] Homologação das Suítes de Testes:
    ├── Terminal com backend ativo
    ├── Executar: node tests/test-api.cjs (esperado: 48 PASS / 0 FAIL)
    └── Executar: node tests/test-signalr-e2e.cjs (esperado: 46 PASS / 0 FAIL)

[4] Experimentação Prática:
    ├── Acessar http://localhost:5173 no navegador
    ├── Executar: scripts\simulate-esp32.cmd -> Cadeira #1 gira 180° no navegador
    └── Observar reconexão e reidratação: derrubar o backend, subir novamente e ver o status voltar a CONECTADO

[5] Início do Desenvolvimento:
    └── Abrir ROADMAP_ARENA_VOICE.md na FASE 1 e seguir o plano sem inventar escopo fora do previsto.
```
