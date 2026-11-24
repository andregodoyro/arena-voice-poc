# Hardware & Firmware — Arena Voice

> **Baseline Oficial:** Firmware Baseline `v0.5.0`  
> **Decisão Arquitetural Homologada:** [ADR-028: Firmware Architecture & Hardware Integration Strategy](decision-records/ADR-028-firmware-architecture-hardware-integration.md)  
> **Topologia:** Backend Authoritative & Offline-First (ADR-001 / ADR-016)

---

## 1. Especificações Técnicas do Módulo ESP32

* **Placa Alvo:** ESP32 DevKit C V4 (ESP-WROOM-32 de 38 pinos)
* **Microcontrolador:** Tensilica Xtensa Dual-Core 32-bit LX6 a 240 MHz
* **Memória:** 520 KB SRAM / 4 MB Flash SPI externa
* **Rádio Wi-Fi:** 2.4 GHz exclusivo (802.11 b/g/n — O ESP32 não opera em 5 GHz)
* **Interface Serial / Gravação:** Micro-USB / USB-C (CP2102 ou CH340) a 115.200 bps
* **Alimentação:** 5V via conector USB (consumo de pico de transmissão de rádio: ~240 mA)

---

## 2. Pinagem, Conexão e Eletrônica de Palco

```text
ESP32 DevKit V4 (Banca)       Botão Arcade Industrial (Microswitch)
┌─────────────────┐          ┌────────────────────────────────────────┐
│         GPIO 18 ├──────────┤ Terminal NO (Normally Open)            │
│                 │          │                                        │
│             GND ├──────────┤ Terminal COM (Common)                  │
└─────────────────┘          └────────────────────────────────────────┘

Feedback Visual IHM:
GPIO 2 (LED Azul Embutido no DevKit V4)
- Piscando Rápido (2 Hz): Conectando ao Wi-Fi / Buscando rede
- Aceso Contínuo (Solid ON): Transmissão HTTP POST em andamento
- Duplo Pisca Rápido (Double-Blink): Confirmação de Voto Aceito (HTTP 200 OK)
- Apagado: Em prontidão (Standby). Em caso de Lockout (HTTP 409), apaga sem piscar.
```

### Detalhes Eletrônicos:
1. **Pull-Up Interno:** O firmware ativa `pinMode(BUTTON_PIN, INPUT_PULLUP)` utilizando o resistor interno de pull-up do ESP32 (~45 kΩ). Nenhum resistor externo ou protoboard é necessário.
2. **Polaridade do Contato:** O botão opera em lógica negativa. Repouso = `HIGH` (3.3V). Acionamento = `LOW` (curto-circuito seguro para o terra/GND).
3. **Debounce Mecânico:** Janela temporal estrita de 50 ms via `millis()` no firmware, detectando exclusivamente a borda de descida (`HIGH` $\to$ `LOW`).
4. **Trava de Segurança Anti-Repulsão (Lockout Local):** Intervalo mínimo de 1.500 ms entre envios consecutivos, impedindo requisições repetidas se o jurado repousar o braço sobre o botão.

---

## 3. Papel Arquitetural do Firmware

Conforme ratificado no [ADR-028](decision-records/ADR-028-firmware-architecture-hardware-integration.md), o firmware ESP32 é formalmente um **sensor transdutor e ponte de eventos de baixa latência**.

* **O que o firmware NÃO faz:** Não controla cadeiras no 3D, não gerencia votação, não avalia timers, não processa pontuações e não possui lógica de negócio.
* **O que o firmware faz:** Detecta o clique com debounce, valida conectividade, resolve o endpoint local, despacha o HTTP POST atômico e fornece feedback no LED.

---

## 4. Estratégia Oficial de Resolução de Endereço

Para eliminar a dependência operacional de IPs numéricos fixos e evitar a necessidade de regravar o firmware a cada mudança de rede, adota-se a resolução hierárquica em 3 níveis:

| Nível | Mecanismo | Endereço Alvo | Comportamento |
| :---: | :--- | :--- | :--- |
| **Prioridade 1 (Oficial)** | **mDNS (Multicast DNS)** | `arena-voice.local` | Consulta UDP 5353 no boot (timeout de 2.500 ms). Se resolvido, salva o IP na RAM. |
| **Prioridade 2** | **Hostname Local** | `arena-voice` | Tentativa via resolução de nome local do sistema operacional. |
| **Prioridade 3 (Contingência)** | **IP Estático Gravado** | `BACKEND_FALLBACK_IP` | Ativado automaticamente se o mDNS falhar ou a rede bloquear pacotes multicast. |

> [!IMPORTANT]
> A resolução mDNS ocorre **exclusivamente no boot (`setup()`) ou após falhas consecutivas de rede**. O acionamento do botão consome o IP diretamente da memória RAM, garantindo que o tempo de envio do voto permaneça **$< 20\text{ ms}$**.

---

## 5. Estrutura de Componentes do Firmware Baseline `v0.5.0`

O firmware organiza-se modularmente nos seguintes blocos lógicos:

1. **`DeviceIdentity`:** Rastreabilidade estruturada de hardware e versão:
   ```cpp
   struct DeviceIdentity {
       const uint8_t chairId;             // Cadeira da banca (1 a 5)
       const char* deviceTag;             // Tag mnemônica (ex: "CHAIR-01")
       const char* firmwareVersion;       // Versão semântica (ex: "v0.5.0")
       const char* hardwareRevision;      // Revisão de hardware (ex: "DEV_KIT_V4_ARCADE")
       char macAddress[18];               // MAC real lido do rádio Wi-Fi
   };
   ```
2. **`WiFiManager`:** Conexão assíncrona não-bloqueante com auto-reconexão (`WiFi.setAutoReconnect(true)`).
3. **`mDNSResolver` & `FallbackResolver`:** Descoberta de `arena-voice.local` com contingência para `BACKEND_FALLBACK_IP`.
4. **`ButtonController` & `DebounceEngine`:** Monitoramento não-bloqueante por `millis()` com 50 ms de debounce e 1.500 ms de rate limit.
5. **`HttpTransport`:** Conexão HTTP/1.1 REST com timeout rígido de 2.000 ms e descarte de socket pós-envio.
6. **`ResponseHandler`:** Decodificação de códigos HTTP de resposta com feedback cênico no LED.
7. **`LedController`:** Gerador de padrões luminosos de 4 estados para feedback instantâneo ao jurado.

---

## 6. Política de Filas e Resiliência de Transporte

O Arena Voice **NÃO utiliza fila persistente de armazenamento (Flash/SPIFFS)** para votos da banca.

* **Fundamentação Cênica:** O acionamento de cadeira é um evento temporal instantâneo. Um voto retido em fila que fosse transmitido minutos após uma queda de roteador entraria fora de hora na máquina de estados do pitch, corrompendo a dinâmica cênica.
* **Estratégia Aprovada: Fail-Fast within Window ($\le 1.000\text{ ms}$):**
  * Tentativa 1: Envio imediato ao clique;
  * Tentativa 2: Retry após 150 ms em caso de falha de conexão;
  * Tentativa 3: Retry após 300 ms se persistir;
  * Se todas falharem, o evento é abortado e o LED sinaliza erro de link. O operador aciona o voto via **Bypass Manual no Cockpit (Fase 7A)**.

---

## 7. Protocolo de Lockout & Respostas HTTP

O backend Minimal API (.NET 10) implementa **Lockout Autoritativo** sobre o endpoint `POST /api/chair-press`:

| Código HTTP | Body (JSON) | Significado de Negócio | Feedback do LED |
| :---: | :--- | :--- | :--- |
| `200 OK` | `{ "accepted": true, "chairId": 1, ... }` | Voto registrado com sucesso. Cadeira vira no telão 3D e áudio dispara. | **Double-blink** (confirmação visual) |
| `409 Conflict` | `{ "accepted": false, "error": "Chair press blocked..." }` | Voto **rejeitado por Lockout**. Votação fechada, pitch fora de `VotingOpen` ou timer pausado. | **Sem double-blink** (apaga após término do POST) |
| `400 Bad Request` | `{ "error": "chairId inválido..." }` | Identificador fora da faixa (1 a 5) ou payload incorreto. | **Sem double-blink** |
| `Timeout / -1` | — | Falha de transporte físico, roteador desligado ou IP inacessível. | **LED piscando rápido** (busca de reconexão) |

---

## 8. Alinhamento com o Roadmap (Fases 5, 6 e 7)

* **Fase 5 (Live Show Experience):** Firmware baseline `v0.5.0` estabilizado para suportar o áudio procedural e o telão 3D com latência $< 100\text{ ms}$.
* **Fase 6 (Ranking & Relatórios):** **Firmware Congelado.** Nenhuma alteração no código embarcado durante a implementação da ata e premiação.
* **Fase 7 (Operational Hardening & Telemetria):**
  * *7A (Bypass Manual):* Mesa técnica assume o controle de virada em caso de pane física;
  * *7B (Telemetria de Frota):* Ativação da flag `#define ENABLE_TELEMETRY 1` para envio de liveness periódico (RSSI, bateria e uptime);
  * *7D (Chaos Engineering):* Testes de estresse de campo com desligamento forçado de AP e injeção de ruído.
