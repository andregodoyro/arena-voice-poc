# Retrospectiva da Fase 1 (Software & Hardware Foundation)
## Plataforma Arena Voice / Arena de Inovação

> **Marco de Referência:** Fechamento formal da Fase 1 e tag `v0.1.0-phase1`  
> **Data:** Outubro de 2026

---

## 1. Objetivo da Fase

A Fase 1 teve como meta primordial validar a **viabilidade técnica da fundação de ponta a ponta**: estabelecer a comunicação física entre hardware (botão arcade via Wi-Fi com ESP32), processamento central autoritativo no backend (.NET 10 Minimal API), propagação em tempo real (SignalR) e renderização gráfica 3D e 2D (Three.js / React 19 / GSAP), comprovando tolerância a falhas, resiliência de rede e integridade de estado.

---

## 2. Arquitetura de Saída (Estado Validado)

A arquitetura final comprovada no fechamento da Fase 1 operou segundo o modelo:

```text
  [ ESP32 / Botão Arcade Físico ]
                 │
                 ▼ POST /api/chair-press  {"chairId": 1}
  ┌────────────────────────────────────────────────────────┐
  │         BACKEND MINIMAL API (.NET 10)                  │
  │ • Validação de faixa (1..5)                            │
  │ • Log com IP de origem e timestamp local               │
  │ • Atualização de estado em memória                     │
  │ • Disparo do evento SignalR ChairTurned                │
  └────────────────────────┬───────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
    Snapshot Inicial                Realtime Stream
    GET /api/state                  ws://.../hubs/arena-poc
           │                               │
           └───────────────┬───────────────┘
                           │
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │          SUPERFÍCIES FRONTEND REACT 19                 │
  │                                                        │
  │  1. Telão Cênico (/stage):                             │
  │     - Cena 3D Three.js com 5 cadeiras                  │
  │     - Animação cinemática 180° via GSAP                │
  │     - HUD exclusivamente contemplativo                 │
  │                                                        │
  │  2. Cockpit Operacional (/operator):                   │
  │     - Placar consolidado de votos                      │
  │     - Grade de status das 5 cadeiras                   │
  │     - Log reverso de atividades                        │
  │     - Botão autoritativo "Resetar Arena"               │
  └────────────────────────────────────────────────────────┘
```

---

## 3. Principais Entregas Homologadas

1. **Separação Rígida de Superfícies:** Rotas `/stage` (público) e `/operator` (mesa) via React Router.
2. **Cena 3D Cênica:** Iluminação de estúdio, materiais PBR, modelo 3D estilizado e rotações de 180° com interpolação suave via GSAP.
3. **Cockpit Operacional:** Monitoramento 2D leve, com placar ao vivo e histórico de eventos.
4. **Authoritative Reset Flow:** Fluxo de zeramento centralizado via `POST /api/reset`, garantindo que toda a arena retorne à estaca zero sincronizadamente.
5. **Automação de Testes:** Suíte `test-api.cjs` (48 testes) e `test-signalr-e2e.cjs` (46 testes) validando contratos e concorrência sem falhas.

---

## 4. Erros Encontrados e Correções Realizadas

### 4.1 Sobrecarga de Papéis em Tela Única
- **Problema:** No início, o telão 3D possuía botões de clique e controles de depuração expostos.
- **Correção:** Criação de rotas distintas (`/stage` e `/operator`) e isolamento completo da interface do operador.

### 4.2 Reset Cosmético Local
- **Problema:** O botão de reset original apenas alterava o estado do React localmente no navegador, gerando dessincronização com o backend e com outros telões conectados.
- **Correção:** Implementação do endpoint autoritativo `POST /api/reset` e broadcast SignalR `ChairsReset`.

### 4.3 Dívida Técnica de Código Morto no 3D
- **Problema:** O pipeline Three.js herdava manipuladores de mouse (`onClick`, raycasting) e a prop `toggleChair` descendo por três níveis de componentes.
- **Correção:** Execução do Milestone 1E-A, purgando completamente a cascata de props e os listeners de clique nas cadeiras 3D, mantendo apenas a leitura orientada a dados.

### 4.4 Bloqueio de Executável no Windows durante Compilação
- **Problema:** O processo `ArenaVoicePocBackend.exe` mantinha o arquivo bloqueado na pasta `bin/`, impedindo novos builds do `dotnet`.
- **Correção:** Estabelecimento da rotina de encerramento prévio de instâncias antigas antes da recompilação.

---

## 5. Lições Aprendidas

1. **Backend Authoritative é Inegociável:** Qualquer tentativa do frontend de "adivinhar" o estado ou aplicar mutações locais resulta em descompasso em ambientes de exibição pública. O backend deve ser sempre a única fonte de verdade.
2. **Snapshot First Resolve Conexões Tardias:** Telões ou operadores que abrem o navegador com o evento já em andamento só exibem o estado correto graças ao snapshot inicial via `GET /api/state`. O WebSocket serve para manter a sincronia, não para hidratar o início.
3. **Ambiente Portátil sem Dependências Globais:** O uso de ferramentas portáteis (.NET, Node, Git) em caminhos previsíveis garantiu reprodutibilidade sem poluir o sistema operacional corporativo.

---

## 6. Recomendações para as Próximas Fases

1. **Manter Simetria de Nomenclatura:** Evitar nomes divergentes entre agregados (ex: `Title` e `Description` padronizados na Fase 2).
2. **Preservar a Pureza do Telão Cênico:** Jamais adicionar formulários, tabelas de dados brutos ou botões de controle na rota `/stage`.
3. **Isolamento de Testes de Integração:** Assegurar que as suítes de teste de integração sejam capazes de rodar de forma previsível e que mutações em memória sejam compreendidas e documentadas.
