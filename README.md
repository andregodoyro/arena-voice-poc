# Arena Voice — Plataforma de Avaliação e Espetáculo de Inovação

> **Status:** Fase 1 Concluída (Operator + Stage Foundation)  
> **Objetivo:** Estabelecer a fundação das duas superfícies principais da plataforma — o Telão 3D Público (`/stage`) e o Cockpit Operacional da Mesa Técnica (`/operator`) —, com comunicação em tempo real e backend autoritativo.

---

## 🏗️ Visão Geral e Arquitetura da Plataforma

O **Arena Voice** é uma plataforma reutilizável projetada para conduzir dinâmicas imersivas de bancas avaliadoras inspiradas no formato The Voice (Demo Days, Hackathons, mostras de MVPs e bancas corporativas). 

A plataforma divide-se com rigor em **quatro papéis arquiteturais**:

```text
                                  REDE LOCAL / WI-FI (2.4 GHz)
             [Botão Físico ESP32]                   [Simulador de Testes]
             (GPIO 18 / Debounce)                   (scripts/simulate-esp32)
                      │                                       │
                      └───────────────────┬───────────────────┘
                                          │ HTTP POST /api/chair-press {"chairId": 1}
                                          ▼
                      ┌──────────────────────────────────────────────┐
                      │             BACKEND ARENA VOICE              │
                      │     ASP.NET Core (.NET 10 Minimal API)       │
                      │             Binds em 0.0.0.0:5000            │
                      ├──────────────────────────────────────────────┤
                      │ • ÚNICA FONTE OFICIAL DA VERDADE (chairStates│
                      │ • Validação de regras e integridade          │
                      │ • Hub SignalR Realtime em /hubs/arena-poc    │
                      │ • Endpoints: /api/chair-press, /state, /reset│
                      └──────────────┬───────────────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼ Broadcast Realtime (ChairTurned, ChairsReset)     ▼ Snapshot REST (/api/state)
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│      /stage — TELÃO PÚBLICO 3D       │     │    /operator — COCKPIT DA MESA       │
│    (Experiência Cênica / Telão)      │     │     (Gestão e Operação da Sessão)    │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│ • React 19 + Three.js + GSAP 3.15    │     │ • Dashboard 2D rápido e ergonômico   │
│ • 5 Cadeiras 3D animadas em tempo real│    │ • Placar consolidado de votos (X / 5)│
│ • StageHUD cênico (sem dados técnicos│     │ • Grade visual de status das cadeiras│
│ • Zero botões ou cliques manuais     │     │ • Histórico da sessão em tempo real  │
│ • 100% dirigido pelo backend         │     │ • Botão de Reset Autoritativo        │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## 🖥️ Superfícies Disponíveis no Frontend

O frontend opera como uma Single Page Application com roteamento oficial via **React Router**:

| Rota | Superfície | Público-Alvo | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **`http://localhost:5173/`** | Redirecionamento | Todos | Redireciona automaticamente para `/stage`. |
| **`http://localhost:5173/stage`** | **Telão Público 3D** | Plateia / Apresentadores | Exibição em tela cheia do palco 3D interativo, rotação cinematográfica das cadeiras e placar consolidado. Superfície estritamente contemplativa, sem controles manuais. |
| **`http://localhost:5173/operator`** | **Cockpit Operacional** | Mesa Técnica / Operador | Monitoramento do status do sistema (*"Sistema Pronto"*), estado individual das 5 cadeiras, linha do tempo de eventos e controle autoritativo de reset da rodada. |

---

## 🔄 Fluxo Operacional da Arena

1. **Preparação da Apresentação:**
   - O computador conectado ao projetor/telão abre **`/stage`** em modo tela cheia.
   - O operador na mesa técnica abre **`/operator`** para acompanhar o evento.
2. **Dinâmica de Voto (Live Pitch):**
   - Quando um avaliador aciona o botão da sua cadeira (via ESP32 físico ou script de simulação), o backend processa o voto e dispara o evento `ChairTurned` via SignalR.
   - O **`/stage`** executa imediatamente a rotação suave de 180° da cadeira 3D via GSAP, acende os holofotes e atualiza o placar cênico.
   - O **`/operator`** atualiza a cadeira correspondente para `VIRADA`, incrementa o placar e registra o horário no histórico da sessão.
3. **Reset Autoritativo de Rodada:**
   - Ao final do pitch, o operador clica em **"Resetar Arena"** no `/operator`.
   - O cockpit envia `POST /api/reset` ao backend.
   - O backend zera o estado oficial em memória e emite o broadcast `ChairsReset`.
   - Ambas as telas (`/stage` e `/operator`) retornam imediatamente as cadeiras para a posição inicial de forma sincronizada.

---

## 📡 Contratos e Comunicação

### O Backend como Fonte Oficial da Verdade
Nenhuma tela muta o estado das cadeiras localmente. O backend é a única autoridade sobre o estado do palco:
- **`GET /api/state`:** Retorna o snapshot atual do estado da arena (`{"chairs": {"1": true, ...}, "activeCount": X}`). Utilizado para hidratação inicial ao carregar a página e para resincronização automática pós-reconexão.
- **`POST /api/chair-press`:** Ingestão de acionamento de cadeira (`{"chairId": 1}`). Valida o intervalo de 1 a 5 e emite `ChairTurned`.
- **`POST /api/reset`:** Comando autoritativo que zera todas as cadeiras e emite o broadcast `ChairsReset`.

### Eventos em Tempo Real (SignalR `/hubs/arena-poc`)
- **`ChairTurned`:** `{ chairId: int, timestamp: string, source: string }`
- **`ChairsReset`:** Broadcast sem payload notificando que todas as 5 cadeiras retornaram à posição inicial.

---

## 💻 Cenários de Execução Local

Ambiente compatível com Windows corporativo (ferramentas portáteis) e máquinas convencionais:

### 1. Separação Estrita de Configurações e Segredos
Copie `.env.example` para `.env` se suas ferramentas portáteis estiverem fora do `PATH`:
```cmd
copy .env.example .env
```

### 2. Iniciar o Backend (.NET 10)
Em um terminal, execute:
```cmd
scripts\start-backend.cmd
```
*(ou PowerShell: `.\scripts\start-backend.ps1`)*  
O backend iniciará ouvindo em `http://0.0.0.0:5000`.

### 3. Iniciar o Frontend (React 19 + Vite)
Em um segundo terminal, execute:
```cmd
scripts\start-frontend.cmd
```
*(ou PowerShell: `.\scripts\start-frontend.ps1`)*  
Acesse o sistema no navegador:
- Telão Público: [http://localhost:5173/stage](http://localhost:5173/stage)
- Cockpit da Mesa: [http://localhost:5173/operator](http://localhost:5173/operator)

### 4. Simulação de Acionamento (Sem Hardware Físico)
Para simular o voto de uma cadeira:
```cmd
scripts\simulate-esp32.cmd 1
```
*(ou PowerShell: `.\scripts\simulate-esp32.ps1 -ChairId 1`)*

### 5. Execução de Testes Automatizados
Com o backend em execução:
```powershell
# Suíte de Contratos REST (48 verificações)
node tests/test-api.cjs

# Suíte de Integração Realtime SignalR (46 verificações)
node tests/test-signalr-e2e.cjs
```

---

## 🔌 Conexão de Botões Físicos ESP32

1. Conecte o computador e a placa ESP32 à mesma rede Wi-Fi **2.4 GHz** (ex: Hotspot móvel).
2. Configure as credenciais em `firmware/config_secrets.h`:
   ```cpp
   #define WIFI_SSID     "NomeDoHotspot"
   #define WIFI_PASSWORD "SenhaDoHotspot"
   #define BACKEND_HOST  "192.168.x.x" // IPv4 do computador na rede
   #define BACKEND_PORT  5000
   #define CHAIR_ID      1             // Identificador desta cadeira (1 a 5)
   ```
3. Grave o sketch no microcontrolador via Arduino IDE / PlatformIO.
4. O botão físico conectado no pino **GPIO 18 e GND** comandará diretamente a virada da cadeira no palco.

---

## 📚 Documentação Técnica

- **[Roadmap Oficial e Arquitetura de Produto (docs/roadmap.md)](docs/roadmap.md):** Visão completa de produto, princípios de UX e planejamento das 10 fases da plataforma.
- **[Arquitetura Detalhada e Fluxos do Sistema (docs/architecture.md)](docs/architecture.md):** Separação de papéis, fluxos de acionamento, reset autoritativo, resiliência e contratos.
- **[Auditoria da Fundação de Software (docs/software-foundation-audit.md)](docs/software-foundation-audit.md):** Registro dos marcos e validações das suítes de teste.
