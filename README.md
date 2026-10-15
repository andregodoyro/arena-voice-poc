# Arena Voice POC — Physical-Digital Integration

> **Status**: In Development — Phase 1 (Chair #1 Vertical)
> **Goal**: Prove that a physical arcade button connected to an ESP32 can trigger a 3D chair animation in Voice Studio via a local backend bridge.

## Architecture

```
[Button] → [ESP32 #1] → Wi-Fi → HTTP POST → [Backend] → SignalR → [Voice Studio 3D] → Chair #1 rotates 180°
```

## Prerequisites

| Tool | Version | Location |
|------|---------|----------|
| .NET SDK | 10.0.x | `devtools/portable/dotnet/dotnet.exe` |
| Node.js | 24.x | `devtools/portable/node/node.exe` |
| npm | 11.x | `devtools/portable/node/npm.cmd` |
| Git | 2.56.x | `devtools/portable/git/cmd/git.exe` |

## Project Structure

```
arena-voice-poc/
├── backend/          # Minimal ASP.NET Core HTTP→SignalR bridge
├── frontend/         # Voice Studio 3D (React + Three.js + GSAP)
├── firmware/         # ESP32 button firmware (Arduino C++)
├── docs/             # Architecture, network, hardware docs
├── .gitignore
└── README.md
```

## Running Locally

### Backend
```powershell
& "C:\Users\ANDREROC\Documents\devtools\portable\dotnet\dotnet.exe" run --project backend
```
Backend starts on `http://0.0.0.0:5000`.

### Frontend
```powershell
& "C:\Users\ANDREROC\Documents\devtools\portable\node\npm.cmd" --prefix frontend run dev
```
Frontend starts on `http://localhost:5173`.

### Firmware
Flash `firmware/sketch.ino` to ESP32 via Arduino IDE / PlatformIO.
Configure Wi-Fi credentials in `firmware/config_secrets.h` (not committed).

## Network (Hotspot Mode)

```
CELL PHONE HOTSPOT
├── PC (backend + frontend)
└── ESP32 #1 (button)
```

ESP32 sends `POST http://<PC_IP>:5000/api/chair-press` to the backend.
The backend relays the event via SignalR to Voice Studio.

## Related Repositories (Reference Only)

| Repo | Purpose |
|------|---------|
| `../teste` | ESP32/SignalR POC reference |
| `../arena-choice` | Future domain model / backend architecture |
| `../voice-studio-3d` | 3D studio visual reference |
