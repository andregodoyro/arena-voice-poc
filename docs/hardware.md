# Hardware — Arena Voice POC

## ESP32 Module

- **Board**: ESP32 DevKit C V4 (or compatible)
- **Wi-Fi**: 2.4 GHz only (802.11 b/g/n)
- **USB**: Micro-USB or USB-C depending on board variant

## Button Wiring

```
ESP32 GPIO 18 ─────────┐
                      [BUTTON]
ESP32 GND      ─────────┘
```

- **Pin**: GPIO 18
- **Mode**: `INPUT_PULLUP` (uses the ESP32 internal pull-up resistor)
- **No external resistor needed**
- **Detection**: Transition from HIGH → LOW (button pressed)

## Debounce

- **Duration**: 50ms
- **Method**: Software debounce via `millis()` comparison
- **Behavior**: Only the first HIGH→LOW transition triggers the HTTP POST. Holding the button does NOT generate repeated events.

## Chair Assignment

For this POC, only Chair #1 is implemented:

| ESP32 | GPIO | Chair ID | Status |
|-------|------|----------|--------|
| #1 | 18 | 1 | **Active** |
| #2 | 18 | 2 | Future |
| #3 | 18 | 3 | Future |
| #4 | 18 | 4 | Future |
| #5 | 18 | 5 | Future |

## Firmware Source

The firmware in `firmware/sketch.ino` is adapted from `../teste/esp32/sketch.ino`.

Key adaptations:
- Wi-Fi credentials externalized to `config_secrets.h`
- Backend URL uses configurable host/port constants
- HTTP endpoint changed to `/api/chair-press`
- Payload changed to `{"chairId": 1}`
- HTTPS support removed (local network only, no TLS needed)
