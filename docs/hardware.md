# Hardware — Arena Voice POC

## ESP32 Module

* **Target Board:** ESP32 DevKit C V4 (ESP-WROOM-32)
* **Wi-Fi Radio:** 2.4 GHz only (802.11 b/g/n)
* **USB Interface:** Micro-USB / USB-C (CP2102 or CH340 driver)
* **Baud Rate:** 115200 bps

## Pinout and Wiring

```
ESP32 DevKit V4              Arcade Pushbutton (Microswitch)
┌─────────────────┐          ┌────────────────────────────────┐
│         GPIO 18 ├──────────┤ NO (Normally Open terminal)    │
│                 │          │                                │
│             GND ├──────────┤ COM (Common terminal)          │
└─────────────────┘          └────────────────────────────────┘

Feedback LED:
GPIO 2 (Built-in Blue LED on DevKit V4)
- Blinking: Searching for Wi-Fi connection
- Solid ON: HTTP transmission in progress
- Double-blink: Transmission confirmed (HTTP 200 OK)
```

## Debounce and Rate Limiting

1. **Hardware / Pull-up:** `pinMode(BUTTON_PIN, INPUT_PULLUP)` uses the ESP32 internal 45kΩ pull-up resistor. No external resistors or breadboards needed.
2. **Software Debounce:** 50ms window via `millis()` comparison, detecting strictly the `HIGH -> LOW` falling edge.
3. **Safety Rate Limit:** 1.5s lock out prevents repeated HTTP requests if the user holds the arcade button down continuously.

## Externalized Secrets Management

Credentials and target IPs are separated from source code:
* `firmware/config.h`: Default fallback constants.
* `firmware/config_secrets.h`: Untracked user file (in `.gitignore`).
* `firmware/config_secrets.h.example`: Template for quick setup.
