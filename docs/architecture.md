# Architecture — Arena Voice POC

## Overview

This POC validates the **physical-digital integration** pipeline:

```
                     PHYSICAL LAYER (Local Wi-Fi)
   [Arcade Button] ──> [ESP32 #1] ──> HTTP POST /api/chair-press
                                              │
                                              ▼
                                 ┌─────────────────────────┐
                                 │   BACKEND (ASP.NET Core) │
                                 │   Minimal Event Bridge   │
                                 ├─────────────────────────┤
                                 │ • Receives chair press   │
                                 │ • Validates chairId 1–5  │
                                 │ • Emits SignalR event    │
                                 │ • Console logging        │
                                 └────────────┬────────────┘
                                              │
                                              ▼ SignalR WebSocket
                                 ┌─────────────────────────┐
                                 │   VOICE STUDIO 3D        │
                                 │   (React + Three.js)     │
                                 ├─────────────────────────┤
                                 │ • Receives ChairTurned   │
                                 │ • Updates chair state    │
                                 │ • GSAP animates rotation │
                                 └─────────────────────────┘
```

## Event Flow

1. **Button press** → GPIO 18 transitions HIGH→LOW
2. **ESP32** detects transition with 50ms debounce
3. **ESP32** sends `POST http://<PC_IP>:5000/api/chair-press` with `{"chairId": 1}`
4. **Backend** validates `chairId` (1–5), logs the event
5. **Backend** broadcasts `ChairTurned` event via SignalR hub at `/hubs/arena-poc`
6. **Voice Studio** receives the event, updates React state
7. **GSAP** animates the chair rotation (180° over 1.5s)

## HTTP Contract

```
POST /api/chair-press
Content-Type: application/json

{"chairId": 1}

Response 200: {"accepted": true, "chairId": 1}
Response 400: {"error": "chairId must be between 1 and 5"}
```

## SignalR Contract

- Hub endpoint: `/hubs/arena-poc`
- Server→Client event: `ChairTurned` with payload `{ chairId: number }`

## Design Decisions

### Why a backend even for a POC?
The backend acts as an **event bridge**, preserving the natural event direction:
hardware → backend → frontend. This creates a clean upgrade path to the full
Arena Voice API without rewriting the visual layer.

### Why not use arena-choice?
Arena-choice contains the future production domain model (PitchSession, EvaluatorSeat,
ProjectSupport, PostgreSQL). It is intentionally excluded from this POC to keep
complexity minimal. The POC backend is a throwaway bridge, not the final architecture.

### Event source decoupling
The Chair animation code receives only a `turnChair(id)` command. It does not know
whether the command came from a mouse click (dev mode), SignalR (POC mode), or a
future production API. This allows swapping the event source without touching visuals.
