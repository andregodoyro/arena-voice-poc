# Network Configuration — Arena Voice POC

## Topology

```
CELL PHONE HOTSPOT (2.4 GHz Wi-Fi)
│
├── PC (Windows corporate machine)
│   ├── Backend:      http://0.0.0.0:5000
│   └── Voice Studio: http://localhost:5173
│
└── ESP32 #1 (arcade button)
    └── Sends POST to http://<PC_IP>:5000/api/chair-press
```

## Important Notes

- The ESP32 operates **only on 2.4 GHz**. The phone hotspot must broadcast on 2.4 GHz.
- The system does **NOT** require internet access. All relevant traffic is local.
- **`localhost` on the ESP32 means the ESP32 itself**, not the PC. The firmware must use the PC's actual IP address.

## How to Find the PC's IP Address

After connecting the PC to the phone hotspot:

```powershell
ipconfig
```

Look for the Wi-Fi adapter connected to the hotspot. The **IPv4 Address** (e.g., `192.168.x.x`) is what the ESP32 firmware needs.

## Firmware Configuration

In `firmware/config_secrets.h` (not committed to Git):

```cpp
#define WIFI_SSID     "YourHotspotName"
#define WIFI_PASSWORD "YourHotspotPassword"
#define BACKEND_HOST  "192.168.x.x"
#define BACKEND_PORT  5000
```

## Firewall Considerations

The PC's Windows Firewall may block incoming HTTP connections on port 5000.
If the ESP32 cannot reach the backend:

1. Check if the backend is listening on `0.0.0.0:5000` (not just `localhost:5000`).
2. Check Windows Firewall rules for port 5000.
3. If blocked by corporate policy, document as `[BLOCKED BY CORPORATE ENVIRONMENT]`.

## Ports Used

| Service | Port | Accessible From |
|---------|------|-----------------|
| Backend HTTP | 5000 | PC + ESP32 (local network) |
| Backend SignalR | 5000 (same) | PC (localhost) |
| Frontend Dev Server | 5173 | PC (localhost only) |
