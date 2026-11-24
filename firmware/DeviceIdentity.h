#pragma once

#include <Arduino.h>
#include <WiFi.h>

// =============================================================================
// ARENA VOICE — DEVICE IDENTITY (FW-01 / ADR-028)
// Identificação Estruturada e Rastreabilidade do Hardware
// =============================================================================

struct DeviceIdentity {
    uint8_t chairId;                  // Posição física na banca (1 a 5)
    char deviceTag[16];               // Ex: "CHAIR-01"
    const char* firmwareVersion;      // Ex: "v0.5.0"
    const char* hardwareRevision;     // Ex: "DEV_KIT_V4_ARCADE"
    char macAddress[18];              // Endereço MAC físico (ex: "AA:BB:CC:DD:EE:FF")
};

inline void initDeviceIdentity(DeviceIdentity &identity, uint8_t chairId, const char* fwVersion, const char* hwRev) {
    identity.chairId = chairId;
    snprintf(identity.deviceTag, sizeof(identity.deviceTag), "CHAIR-%02d", chairId);
    identity.firmwareVersion = fwVersion;
    identity.hardwareRevision = hwRev;

    // Obtém o MAC address físico real do rádio Wi-Fi
    String mac = WiFi.macAddress();
    strncpy(identity.macAddress, mac.c_str(), sizeof(identity.macAddress) - 1);
    identity.macAddress[sizeof(identity.macAddress) - 1] = '\0';
}

inline String buildChairPayload(const DeviceIdentity &identity) {
    // Monta o payload JSON compatível com o DTO ChairPressRequest do backend .NET:
    // public record ChairPressRequest(int? ChairId, int? SeatNumber, string? Source = null)
    String payload = "{";
    payload += "\"chairId\":" + String(identity.chairId) + ",";
    payload += "\"seatNumber\":" + String(identity.chairId) + ",";
    payload += "\"source\":\"" + String(identity.deviceTag) + "\",";
    payload += "\"firmware\":\"" + String(identity.firmwareVersion) + "\",";
    payload += "\"mac\":\"" + String(identity.macAddress) + "\"";
    payload += "}";
    return payload;
}
