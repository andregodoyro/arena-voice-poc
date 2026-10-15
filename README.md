# Arena Voice POC — Integração Físico-Digital Local

> **Status:** Marco 1 Concluído (Vertical Ponta a Ponta: Botão Físico -> ESP32 -> Backend -> SignalR -> Voice Studio 3D)  
> **Objetivo:** Comprovar a integração físico-digital de menor complexidade e maior impacto do produto: pressionar o botão físico acoplado ao ESP32 gira a cadeira digital correspondente em 180° no Voice Studio 3D.

---

## 🏗️ Arquitetura Implementada

```text
                     REDE WI-FI LOCAL (HOTSPOT DO CELULAR 2.4 GHz)
   [Botão Físico Arcade] ──> [ESP32 #1 DevKit V4]
   (GPIO 18 / GND)           (Debounce 50ms)
                                    │
                                    ▼ HTTP POST /api/chair-press (payload: {"chairId": 1})
                     ┌────────────────────────────────────────┐
                     │   ARENA VOICE POC BACKEND (ASP.NET)    │
                     │   Minimal API (.NET 10) em 0.0.0.0:5000│
                     ├────────────────────────────────────────┤
                     │ • Validação de cadeira (1 a 5)         │
                     │ • Auditoria e logs detalhados          │
                     │ • Hub SignalR em /hubs/arena-poc       │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼ SignalR WebSocket (Evento: ChairTurned)
                     ┌────────────────────────────────────────┐
                     │       VOICE STUDIO 3D (TELÃO)          │
                     │   React 19 + Three.js + GSAP 3.15      │
                     ├────────────────────────────────────────┤
                     │ • useSignalR hook desacoplado          │
                     │ • Comando turnChair(1)                 │
                     │ • Giro de 180° com curva suave GSAP    │
                     │ • Modo Dev vs Modo Hardware            │
                     └────────────────────────────────────────┘
```

---

## ⚙️ Configuração Portátil de Ambientes

O projeto foi projetado para rodar em múltiplos ambientes sem alteração de código versionado:

### 1. Separação Estrita de Configurações e Segredos

| Arquivo | Função | Versionado no Git? |
| :--- | :--- | :--- |
| `.env.example` | Template de variáveis de ambiente do PC | ✅ **SIM** |
| `.env` | Configuração local da máquina | ❌ **NÃO (ignorado)** |
| `firmware/config.h` | Parâmetros técnicos fixos do firmware | ✅ **SIM** |
| `firmware/config_secrets.h.example` | Template de credenciais do ESP32 | ✅ **SIM** |
| `firmware/config_secrets.h` | Credenciais Wi-Fi e IP da sua placa | ❌ **NÃO (ignorado)** |

> [!CAUTION]
> **NUNCA COMMITE** os arquivos `.env` ou `firmware/config_secrets.h`. Eles contêm credenciais locais e caminhos privados de sua estação de trabalho.

---

## 💻 Cenários de Execução

### Cenário A: PC Corporativo (Ferramentas Portáteis fora do PATH)
1. Copie `.env.example` para `.env`:
   ```cmd
   copy .env.example .env
   ```
2. Abra o `.env` e aponte para seus executáveis portáteis locais:
   ```ini
   BACKEND_HOST=0.0.0.0
   BACKEND_PORT=5000
   VITE_BACKEND_URL=http://localhost:5000
   VITE_SIGNALR_URL=http://localhost:5000/hubs/arena-poc
   DOTNET_EXE=C:\caminho\para\devtools\portable\dotnet\dotnet.exe
   NODE_EXE=C:\caminho\para\devtools\portable\node\node.exe
   NPM_EXE=C:\caminho\para\devtools\portable\node\npm.cmd
   GIT_EXE=C:\caminho\para\devtools\portable\git\cmd\git.exe
   ```
3. Utilize os scripts `.cmd` (ou `.ps1`) normalmente na pasta `scripts/`.

### Cenário B: Computador Convencional (Ferramentas no PATH global)
1. O `.env` é opcional. Se desejar customizar portas ou URLs, copie `.env.example` para `.env` mantendo as variáveis de executáveis vazias:
   ```ini
   DOTNET_EXE=
   NODE_EXE=
   NPM_EXE=
   GIT_EXE=
   ```
2. Os scripts detectarão automaticamente `dotnet`, `node` e `npm` presentes no `PATH`.

### Cenário C: GitHub Codespaces / Containers Linux
1. As ferramentas (.NET 10 SDK e Node.js) já estarão presentes globalmente no ambiente.
2. Não é necessário criar `.env` (valores padrão `0.0.0.0:5000` serão usados).
3. Execute diretamente via terminal:
   ```bash
   dotnet run --project backend/ArenaVoicePocBackend.csproj
   npm --prefix frontend run dev
   ```

---

## 🚀 Como Executar

### 1. Iniciar o Backend
Abra um terminal e execute (via CMD ou PowerShell):
```cmd
scripts\start-backend.cmd
```
*(ou no PowerShell: `.\scripts\start-backend.ps1`)*

O backend iniciará ouvindo em `http://0.0.0.0:5000`.

### 2. Iniciar o Frontend 3D
Abra um segundo terminal e execute:
```cmd
scripts\start-frontend.cmd
```
*(ou no PowerShell: `.\scripts\start-frontend.ps1`)*

Abra o navegador em: [http://localhost:5173](http://localhost:5173).

### 3. Testar a Simulação (Sem ESP32 físico)
Para simular o acionamento do botão sem o hardware real:
```cmd
scripts\simulate-esp32.cmd
```
*(ou no PowerShell: `.\scripts\simulate-esp32.ps1 -ChairId 1`)*

A Cadeira #1 girará imediatamente no navegador 3D via SignalR!

### 4. Teste Automatizado E2E
Com o backend em execução, execute o teste de ponta a ponta:
```bash
node tests/test-signalr-e2e.cjs
```

---

## 🔌 Conectando o Hardware ESP32 Real

1. Configure seu hotspot móvel para **2.4 GHz**.
2. Conecte seu computador ao hotspot e anote seu IPv4 (via `ipconfig`).
3. Crie `firmware/config_secrets.h` a partir do template:
   ```cmd
   copy firmware\config_secrets.h.example firmware\config_secrets.h
   ```
4. Edite `firmware/config_secrets.h`:
   ```cpp
   #define WIFI_SSID     "NomeDoSeuHotspot"
   #define WIFI_PASSWORD "SenhaDoSeuHotspot"
   #define BACKEND_HOST  "192.168.x.x" // IPv4 do computador no hotspot
   #define BACKEND_PORT  5000
   #define CHAIR_ID      1
   ```
5. Grave o código `firmware/sketch.ino` no ESP32 #1 via Arduino IDE ou PlatformIO.
6. Pressione o botão físico conectado no pino **GPIO 18 e GND**.
7. A Cadeira #1 girará no Voice Studio 3D instantaneamente.

---

## 📚 Documentação Técnica

* [Arquitetura e Fluxo do Evento](docs/architecture.md)
* [Configuração de Rede e Hotspot](docs/network.md)
* [Ligação de Hardware e Firmware](docs/hardware.md)
* [Roadmap e Próximos Passos](docs/roadmap.md)
