# Network Configuration — Arena Voice POC

## Local Hotspot Topology

```
CELL PHONE HOTSPOT (2.4 GHz Wi-Fi)
│
├── PC (Windows corporate machine)
│   ├── Wi-Fi IP:     192.168.43.x (or 172.20.10.x / 192.168.137.x)
│   ├── Backend:      http://0.0.0.0:5000 (binds all interfaces)
│   └── Voice Studio: http://localhost:5173
│
└── ESP32 #1 (arcade button)
    ├── Receives IP from Hotspot DHCP (e.g., 192.168.43.50)
    └── Sends HTTP POST to http://<PC_WIFI_IP>:5000/api/chair-press
```

## Step-by-Step Hotspot Setup

### 1. Configure the Phone Hotspot
1. On your smartphone, enable **Personal Hotspot / Roteador Wi-Fi**.
2. **CRITICAL**: Ensure the hotspot band is set to **2.4 GHz** (often labeled *"Maximize Compatibility"* or *"Banda de 2.4 GHz"*). The ESP32 does not support 5 GHz.
3. Note your Hotspot SSID and Password.

### 2. Connect the Corporate PC to the Hotspot
1. Connect your PC's Wi-Fi adapter to the phone hotspot.
2. Open PowerShell and run:
   ```powershell
   Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi' } | Select-Object InterfaceAlias, IPAddress
   ```
   Or simply:
   ```powershell
   ipconfig
   ```
3. Look for the **IPv4 Address** of your Wi-Fi adapter (e.g., `192.168.43.150`).

### 3. Configure the ESP32 Firmware
1. In the `firmware/` directory, copy the template:
   ```powershell
   Copy-Item "firmware\config_secrets.h.example" "firmware\config_secrets.h"
   ```
2. Open `firmware/config_secrets.h` and update:
   ```cpp
   #define WIFI_SSID     "SeuHotspot"
   #define WIFI_PASSWORD "SuaSenha"
   #define BACKEND_HOST  "192.168.43.150" // O IP obtido no passo 2
   #define BACKEND_PORT  5000
   #define CHAIR_ID      1
   ```
3. Flash the firmware to ESP32 #1.

### 4. Windows Firewall & Port 5000
Because the backend binds to `0.0.0.0:5000` by default (configurable via `BACKEND_HOST` and `BACKEND_PORT` in `.env`), it accepts incoming connections from any active network adapter, including the Wi-Fi hotspot.

If the ESP32 logs an HTTP connection failure (-1 or connection refused):
- Verify if Windows Firewall is prompting for permission.
- Ensure the computer and ESP32 are connected to the same Wi-Fi hotspot network.
- Test connection locally:
  ```powershell
  Test-NetConnection -ComputerName 127.0.0.1 -Port 5000
  ```

### 5. Security & Versioning Policy
- `firmware/config_secrets.h` is strictly local and listed in `.gitignore`. **NEVER COMMIT THIS FILE**.
- Only `firmware/config_secrets.h.example` is committed as a reference template.
- Similarly, `.env` is local and `.env.example` is the committed template.

## Current Machine Network Diagnostic (Audited)

Interfaces currently active on this machine:
- `Ethernet 4`: `10.148.156.136` (Corporate network)
- When Wi-Fi hotspot is activated, the new Wi-Fi adapter IP will appear in the output of `Get-NetIPAddress`.
