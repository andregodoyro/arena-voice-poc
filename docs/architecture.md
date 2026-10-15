# Architecture — Arena Voice POC (Local Physical-Digital Integration)

## Status: Milestone 1 Complete

The physical-digital vertical pipeline is fully implemented, decoupled, and verified:

```
                           PHYSICAL / HARDWARE LAYER
   [Arcade Button] ──> [ESP32 #1 DevKit V4] ──> Wi-Fi Hotspot (2.4 GHz)
   (GPIO 18 / GND)     (Debounce 50ms)           │
                                                 ▼ HTTP POST
                                 ┌────────────────────────────────────────┐
                                 │       BACKEND EVENT BRIDGE             │
                                 │   ASP.NET Core (net10.0 Minimal API)   │
                                 │       Binds to 0.0.0.0:5000            │
                                 ├────────────────────────────────────────┤
                                 │ • POST /api/chair-press                │
                                 │ • Validates chairId (1..5)             │
                                 │ • In-memory state tracking             │
                                 │ • Detailed console audit logging       │
                                 └───────────────────┬────────────────────┘
                                                     │
                                                     ▼ SignalR WebSocket
                                 ┌────────────────────────────────────────┐
                                 │       VOICE STUDIO 3D (FRONTEND)       │
                                 │    React 19 + Three.js + GSAP 3.15     │
                                 ├────────────────────────────────────────┤
                                 │ • useSignalR hook (Hub /hubs/arena-poc)│
                                 │ • Decoupled turnChair(1) command       │
                                 │ • 180° GSAP animation + spotlights    │
                                 │ • Dual-mode: DEV MODE vs HARDWARE MODE │
                                 └────────────────────────────────────────┘
```

## Architectural Decoupling

The frontend separates event origins from the visual animation logic:

```
                 EVENT SOURCES
                      │
        ┌─────────────┼─────────────┐
        │             │             │
      MOUSE         ESP32        SIGNALR
    DEV MODE         POC        PRODUÇÃO
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                Chair Command: turnChair(chairId, source)
                      ↓
                Chair State: isTurned = true
                      ↓
                GSAP Animation: y -> Math.PI (180°)
                      ↓
                Telão 3D atualizado
```

When **MODO HARDWARE** is active, manual mouse clicks on 3D meshes and HUD buttons are disabled, guaranteeing that the chair can only turn when triggered by the physical button or SignalR event.

## HTTP Endpoints Implemented

| Method | Route | Description | Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/chair-press` | Primary ESP32 ingestion | `{"chairId": 1}` | `{"accepted": true, "chairId": 1, ...}` |
| `POST` | `/api/support` | Backward-compatibility alias | `{"seatNumber": 1}` | `{"accepted": true, "chairId": 1, ...}` |
| `GET` | `/api/status` | Health check & uptime | *None* | `{"status": "ONLINE", ...}` |
| `GET` | `/api/state` | Current state of all 5 chairs | *None* | `{"chairs": {...}, "activeCount": X}` |
| `POST` | `/api/reset` | Resets all chairs to initial | *None* | `{"message": "...", "chairs": {...}}` |

## SignalR Contracts

* **Hub Endpoint:** `/hubs/arena-poc` (and `/arenaHub` alias)
* **Events Emitted by Server:**
  * `ChairTurned`: `{ chairId: number, timestamp: string, source: string }`
  * `ChairSupported`: `{ seatNumber: number, chairId: number }` (alias)
  * `ChairsReset`: *No payload* (triggers complete 5-chair reset)
