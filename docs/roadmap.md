# Roadmap — Arena Voice POC

## Milestone 1: Chair #1 Vertical Integration

**Objective:** Validate that a physical button press on ESP32 #1 rotates Chair #1 in Voice Studio 3D via local backend and SignalR.

### Phases Status

| Phase | Description | Status | Evidence / Artifact |
| :--- | :--- | :---: | :--- |
| **0** | Validate workspace & portable tools | ✅ **CONCLUÍDO** | Tools & repos verified; commits matched |
| **1** | Initialize `arena-voice-poc` repo | ✅ **CONCLUÍDO** | Git repo initialized on `main` branch (`cb4ad72`) |
| **2** | Integrate Voice Studio 3D frontend | ✅ **CONCLUÍDO** | Three.js, GSAP, R3F imported & built (`aaf9f36`) |
| **3** | Decouple visual animation from input | ✅ **CONCLUÍDO** | `turnChair(id)` command + Dev Mode toggle (`667018b`) |
| **4** | Build minimal ASP.NET Core backend | ✅ **CONCLUÍDO** | Net10 Minimal API + SignalR hub (`5bb52cf`) |
| **5** | Connect Voice Studio to SignalR | ✅ **CONCLUÍDO** | `useSignalR` hook + E2E test passed (`a50a74b`) |
| **6** | ESP32 Chair #1 firmware | ✅ **CONCLUÍDO** | `sketch.ino` + externalized secrets (`ed188e2`) |
| **7** | Hotspot & network documentation | ✅ **CONCLUÍDO** | `docs/network.md` step-by-step (`1e97f71`) |
| **8** | Ingestion verification & batch scripts | ✅ **CONCLUÍDO** | Batch wrappers immune to ExecutionPolicy (`7a68820`) |
| **9** | Full vertical E2E validation | ✅ **CONCLUÍDO** | Automated pipeline test passed with 100% success |
| **10** | Complete architectural documentation | ✅ **CONCLUÍDO** | All docs and README updated |

---

## Milestone 2: 5-Chair Full Hardware Replication (Next Milestone)

* Assemble ESP32 #2, #3, #4, #5 with their respective arcade buttons.
* Flash identical firmware altering only `#define CHAIR_ID` from 2 to 5.
* Validate all 5 chairs rotating concurrently in the 3D studio.

---

## Milestone 3: Production Backend Evolution (Future)

* Re-evaluate and selectively migrate the `ArenaVoice.Domain` aggregates from `arena-choice` (`PitchSession`, `EvaluatorSeat`, `ProjectSupport`).
* Introduce SQLite / PostgreSQL persistence.
* Implement Moderator/Host control dashboard.
