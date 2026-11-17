#pragma once

#include <Arduino.h>
#include "config.h"
#include "DeviceIdentity.h"

// =============================================================================
// ARENA VOICE — TELEMETRY & FLEET MONITORING STUBS (FW-01 / ADR-028)
// Estrutura de Telemetria e Hooks para a Fase 7B (Atualmente Desabilitado)
// =============================================================================

struct TelemetryPacket {
    uint8_t chairId;
    const char* deviceTag;
    int rssi;
    uint32_t uptimeSeconds;
    uint32_t freeHeapBytes;
    uint8_t wifiStatus;
};

class TelemetryManager {
private:
    unsigned long _lastHeartbeatTime;
    uint32_t _heartbeatIntervalMs;

public:
    TelemetryManager() : _lastHeartbeatTime(0), _heartbeatIntervalMs(15000) {}

    void init(uint32_t intervalMs = 15000) {
        _heartbeatIntervalMs = intervalMs;
        _lastHeartbeatTime = millis();
    }

    void processTelemetry(const DeviceIdentity &identity) {
#if ENABLE_TELEMETRY
        // Rotina ativa somente quando a flag for ativada no Milestone 7B
        unsigned long now = millis();
        if (now - _lastHeartbeatTime >= _heartbeatIntervalMs) {
            _lastHeartbeatTime = now;
            onHeartbeatTick(identity);
        }
#else
        // Zero overhead de CPU e rede durante as Fases 5 e 6 (ADR-028)
        (void)identity;
#endif
    }

private:
    void onHeartbeatTick(const DeviceIdentity &identity) {
        // Ponto de extensão para emissão de heartbeat UDP/HTTP na Fase 7B
        Serial.print("[Telemetria Stub] Heartbeat reservado para a Fase 7B: ");
        Serial.print(identity.deviceTag);
        Serial.print(" | RSSI: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    }
};
