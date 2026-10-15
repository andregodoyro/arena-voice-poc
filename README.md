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

## 🚀 Como Executar no Computador Corporativo

Os scripts em lote (`.cmd`) contornam automaticamente restrições de `ExecutionPolicy` do PowerShell no ambiente corporativo:

### 1. Iniciar o Backend
Abra um terminal ou clique duas vezes em:
```cmd
scripts\start-backend.cmd
```
O backend iniciará ouvindo em `http://0.0.0.0:5000`.

### 2. Iniciar o Frontend 3D
Abra um segundo terminal ou clique duas vezes em:
```cmd
scripts\start-frontend.cmd
```
Abra o navegador em: [http://localhost:5173](http://localhost:5173).

### 3. Testar a Simulação (Sem ESP32 físico)
Abra um terceiro terminal e execute:
```cmd
scripts\simulate-esp32.cmd
```
A Cadeira #1 girará imediatamente no navegador via SignalR.

---

## 🔌 Conectando o Hardware ESP32 Real

1. Configure seu hotspot móvel para **2.4 GHz**.
2. Conecte seu computador corporativo ao hotspot e anote seu IPv4 (via `ipconfig`).
3. Crie `firmware/config_secrets.h` a partir do template `firmware/config_secrets.h.example`:
   ```cpp
   #define WIFI_SSID     "SeuHotspot"
   #define WIFI_PASSWORD "SuaSenha"
   #define BACKEND_HOST  "192.168.x.x" // IPv4 do computador
   #define BACKEND_PORT  5000
   #define CHAIR_ID      1
   ```
4. Grave o código `firmware/sketch.ino` no ESP32 #1 via Arduino IDE ou PlatformIO.
5. Pressione o botão físico conectado no pino **GPIO 18 e GND**.
6. A Cadeira #1 girará no Voice Studio 3D sem nenhuma interação manual na tela!

---

## 📚 Documentação Técnica

* [Arquitetura e Fluxo do Evento](docs/architecture.md)
* [Configuração de Rede e Hotspot](docs/network.md)
* [Ligação de Hardware e Firmware](docs/hardware.md)
* [Roadmap e Próximos Passos](docs/roadmap.md)
