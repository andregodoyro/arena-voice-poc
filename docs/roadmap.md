# Roadmap — Arena Voice POC

## Milestone 1: Chair #1 Vertical (Current)

**Goal**: Physical button #1 → ESP32 → Backend → SignalR → Voice Studio → Chair #1 rotates.

### Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Validate workspace and tools | ✅ Done |
| 1 | Create arena-voice-poc repository | ✅ Done |
| 2 | Integrate Voice Studio frontend | In Progress |
| 3 | Decouple chair animation from event source | Planned |
| 4 | Create minimal backend (HTTP + SignalR) | Planned |
| 5 | Connect frontend to backend via SignalR | Planned |
| 6 | Create ESP32 firmware | Planned |
| 7 | Configure hotspot network | Planned |
| 8 | Validate ESP32 → Backend | Planned |
| 9 | Full vertical validation | Planned |
| 10 | Final documentation | Planned |

## Milestone 2: All 5 Chairs (Future)

- Expand firmware to ESP32 #2–#5
- Each ESP32 sends its own `chairId`
- Voice Studio animates all 5 chairs independently

## Milestone 3: Production Backend Integration (Future)

- Replace POC backend with Arena Voice API (from arena-choice)
- PitchSession, EvaluatorSeat, ProjectSupport
- PostgreSQL persistence
- Swagger API
- Authentication
- Moderator console
