/*
  =============================================================================
  ARENA VOICE — FIRMWARE BASELINE v0.5.0 (FW-01)
  Subsistema de Hardware Oficial da Banca de Jurados (Cadeiras #1 a #5)
  =============================================================================

  Conformidade Arquitetural:
  - ADR-001 (Backend Authoritative)
  - ADR-013 (Authoritative Timers & Voting Lockout)
  - ADR-015 (Decoupled Judge Identity)
  - ADR-016 (Offline-First Persistence Strategy)
  - ADR-028 (Firmware Architecture & Hardware Integration Strategy)

  Conexão de Hardware (ESP32 DevKit C V4):
  - GPIO 18 -> Botão Arcade Industrial (Terminal NO)
  - GND     -> Botão Arcade Industrial (Terminal COM)
  - GPIO 2  -> LED Azul de Feedback IHM (Embutido)

  Transmissão:
  - Prioridade 1: mDNS "arena-voice.local" (UDP 5353)
  - Prioridade 3: Fallback determinístico para BACKEND_FALLBACK_IP
  - Protocolo: HTTP/1.1 POST para /api/chair-press (Fail-Fast <= 1.000 ms)
  =============================================================================
*/

#include <Arduino.h>
#include "config.h"
#include "DeviceIdentity.h"
#include "LedController.h"
#include "NetworkManager.h"
#include "ButtonController.h"
#include "HttpTransport.h"
#include "Telemetry.h"

// -----------------------------------------------------------------------------
// INSTÂNCIAS DOS CONTROLADORES MODULARES
// -----------------------------------------------------------------------------
DeviceIdentity   identity;
LedController    led;
NetworkManager   network;
ButtonController button;
HttpTransport    transport;
TelemetryManager telemetry;

// =============================================================================
// SETUP (INICIALIZAÇÃO DO MICROCONTROLADOR)
// =============================================================================
void setup() {
    Serial.begin(SERIAL_BAUD_RATE);
    delay(500);

    Serial.println();
    Serial.println("=============================================================");
    Serial.println("   ARENA VOICE — FIRMWARE BASELINE v0.5.0 (FW-01)           ");
    Serial.println("   Subsistema de Hardware Oficial da Banca de Jurados        ");
    Serial.println("=============================================================");

    // 1. Inicialização dos Periféricos de Hardware
    led.init(LED_PIN);
    button.init(BUTTON_PIN, DEBOUNCE_MS, LOCKOUT_MS);
    transport.init(HTTP_TIMEOUT_MS); // M-03: Inicialização explícita com timeout oficial calibrado

    Serial.print("[Hardware] Botao Arcade configurado no pino GPIO ");
    Serial.print(BUTTON_PIN);
    Serial.println(" com pull-up interno.");
    Serial.print("[Hardware] LED de status configurado no pino GPIO ");
    Serial.println(LED_PIN);

    // 2. Conexão à Rede Wi-Fi Local (2.4 GHz)
    network.init(BACKEND_PORT, BACKEND_PATH);
    network.connectWiFi(WIFI_SSID, WIFI_PASSWORD, led);

    // 3. Inicialização da Identidade Estruturada do Dispositivo
    initDeviceIdentity(identity, CHAIR_ID, FIRMWARE_VERSION, HARDWARE_REVISION);

    // 4. Resolução de Endereço do Servidor (mDNS com Fallback e Hostname Único por Cadeira - M-02)
    network.resolveBackendHost(MDNS_TARGET_HOST, BACKEND_FALLBACK_IP, MDNS_TIMEOUT_MS, identity.deviceTag);

    Serial.println("-------------------------------------------------------------");
    Serial.print("[Identidade] Cadeira Atribuida: #");
    Serial.println(identity.chairId);
    Serial.print("[Identidade] Tag do Dispositivo: ");
    Serial.println(identity.deviceTag);
    Serial.print("[Identidade] Firmware:           ");
    Serial.println(identity.firmwareVersion);
    Serial.print("[Identidade] MAC Address:        ");
    Serial.println(identity.macAddress);
    Serial.print("[Conexao]   Backend Alvo:       ");
    Serial.println(network.getBackendURL());
    Serial.println("=============================================================");
    Serial.println(">>> ARENA VOICE PRONTO. Aguardando acionamento do jurado...");
    Serial.println();

    // 5. Inicialização de Telemetria (Stubs inativos para Fase 7)
    telemetry.init();
}

// =============================================================================
// LOOP PRINCIPAL (100% NÃO-BLOQUEANTE)
// =============================================================================
void loop() {
    // 1. Atualização Contínua da IHM de LED (Máquina de Estados millis)
    led.update();

    // 2. Monitoramento de Reconexão Wi-Fi em Segundo Plano
    if (!network.isConnected()) {
        led.triggerSearching();
        delay(10);
        return;
    }

    // 3. Detecção Eletromecânica do Botão Arcade com Debounce
    if (button.pollButtonPress()) {
        Serial.println();
        Serial.println("-------------------------------------------------------------");
        Serial.print("[BOTAO FISICO ACIONADO] Jurado pressionou a Cadeira #");
        Serial.println(identity.chairId);

        // Monta o payload JSON enriquecido
        String payload = buildChairPayload(identity);
        String targetUrl = network.getBackendURL();

        // Dispara o envio HTTP atômico com política Fail-Fast
        TransportStatus status = transport.sendChairPress(targetUrl, payload, led);

        if (status == STATUS_SUCCESS_200) {
            // Sucesso: marca o timestamp para trava local anti-repulsão (1.500 ms)
            button.markTriggerSuccess();
        } else if (status == STATUS_LOCKOUT_409) {
            // Lockout de negócio: não atualiza sucesso, LED apaga sem piscar
            Serial.println("[Aviso] Voto bloqueado pelas regras de negocio do evento.");
        } else if (status == STATUS_NETWORK_FAILURE) {
            // Falha persistente de rádio/rede
            Serial.println("[Alerta] Falha de conexao com o backend.");

            // Se falhou repetidamente (>= 2 vezes), invalida cache e força novo mDNS
            if (transport.getConsecutiveFailures() >= 2) {
                network.invalidateCache(MDNS_TARGET_HOST, BACKEND_FALLBACK_IP, MDNS_TIMEOUT_MS, identity.deviceTag);
                transport.resetFailures();
            }
        }
    }

    // 4. Processamento de Telemetria (Stubs dormindo — Zero overhead na Fase 5)
    telemetry.processTelemetry(identity);

    // 5. Alívio de CPU para o escalonador do RTOS do ESP32
    delay(5);
}
