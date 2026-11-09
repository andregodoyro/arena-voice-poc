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


---

## Protocolo de Lockout & Respostas HTTP

A partir do Milestone 3C, o backend implementa **Lockout Autoritativo** sobre os acionamentos de cadeira. O firmware ESP32 deve interpretar as respostas HTTP para fornecer feedback visual correto ao avaliador via LED.

### Respostas Possíveis do `POST /api/chair-press`

| Código HTTP | Body (JSON) | Significado de Negócio | Feedback do LED |
| :---: | :--- | :--- | :--- |
| `200 OK` | `{ "accepted": true, "chairId": 1, ... }` | Voto registrado com sucesso. Cadeira vira no telão 3D e placar é atualizado. | **Double-blink** (confirmação de transmissão aceita) |
| `409 Conflict` | `{ "accepted": false, "error": "Chair press blocked: voting not open or timer is paused" }` | Voto **rejeitado** por Lockout. A votação está fechada, o cronômetro está pausado, ou o pitch não está no estágio `VotingOpen`. | *(Sem double-blink — apenas Solid ON durante a requisição HTTP)* |
| `400 Bad Request` | `{ "error": "Invalid chairId" }` | `chairId` fora do intervalo válido (1..5) ou payload malformado. | *(Sem double-blink)* |

### Condições de Lockout (HTTP 409 Conflict)

O backend retorna `HTTP 409 Conflict` em qualquer um dos cenários abaixo:

1. **Estágio do Pitch ≠ `VotingOpen`:** O pitch está em `Waiting`, `PitchRunning`, `QA`, `VotingClosed` ou `Finished`.
2. **Timer Pausado (`IsPaused == true`):** O operador pausou o cronômetro mesmo com o pitch em `VotingOpen`.
3. **Nenhum evento ativo na arena:** A arena está sem evento ativo configurado.
4. **Nenhum projeto ativo no palco:** O `ActiveContext.CurrentProject` está vazio.

> [!IMPORTANT]
> O Lockout é **físico e digital**: o backend rejeita o voto, o LED **não** executa o double-blink, e nenhuma mutação de estado ocorre em memória nem nenhum evento SignalR é emitido. A cadeira no telão 3D permanece na posição atual.

### Notas Operacionais

- O hardware ESP32 deve checar o **código HTTP** (não apenas o corpo) para decidir o feedback LED.
- O debounce de software de 50ms e o rate limit de 1,5s previnem múltiplas requisições em caso de segurada do botão — essencial especialmente durante períodos de lockout.
- A configuração de `VotingOpen` pode ser verificada pelo operador no cockpit em `/operator/cockpit` via o Stepper de Estágio do Pitch.
- O firmware **não precisa conhecer** o estado do pitch; a lógica de bloqueio é centralizada e exclusiva do backend.
