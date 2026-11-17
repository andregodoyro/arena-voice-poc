#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include "LedController.h"

// =============================================================================
// ARENA VOICE — NETWORK MANAGER (FW-01 / ADR-028)
// Gerenciador de Wi-Fi, Resolução mDNS (arena-voice.local) e Fallback de IP
// =============================================================================

class NetworkManager {
private:
    IPAddress _resolvedIP;
    bool _isMdnsResolved;
    bool _isFallbackActive;
    uint16_t _backendPort;
    String _backendPath;

public:
    NetworkManager() : _isMdnsResolved(false), _isFallbackActive(false), _backendPort(5000), _backendPath("/api/chair-press") {}

    void init(uint16_t port, const char* path) {
        _backendPort = port;
        _backendPath = path;
    }

    bool connectWiFi(const char* ssid, const char* password, LedController &led) {
        if (WiFi.status() == WL_CONNECTED) {
            return true;
        }

        Serial.println();
        Serial.println("=============================================================");
        Serial.print("[Wi-Fi] Conectando ao SSID: ");
        Serial.println(ssid);

        WiFi.mode(WIFI_STA);
        WiFi.setAutoReconnect(true);
        WiFi.begin(ssid, password);

        led.triggerSearching();

        int tentativas = 0;
        const int maxTentativas = 40; // 40 * 250ms = 10 segundos limite no boot

        while (WiFi.status() != WL_CONNECTED && tentativas < maxTentativas) {
            delay(250);
            led.update();
            Serial.print(".");
            tentativas++;
        }
        Serial.println();

        if (WiFi.status() == WL_CONNECTED) {
            led.triggerOff();
            Serial.println(">>> [Wi-Fi] CONECTADO COM SUCESSO!");
            Serial.print(">>> IP do ESP32: ");
            Serial.println(WiFi.localIP());
            Serial.print(">>> Gateway:    ");
            Serial.println(WiFi.gatewayIP());
            Serial.print(">>> Sinal RSSI: ");
            Serial.print(WiFi.RSSI());
            Serial.println(" dBm");
            return true;
        } else {
            led.triggerError();
            Serial.println(">>> [Wi-Fi FALHA] Nao foi possivel conectar a rede dentro do tempo limite.");
            Serial.println("    O dispositivo continuara tentando reconectar em segundo plano.");
            return false;
        }
    }

    bool resolveBackendHost(const char* targetHost, const char* fallbackIpStr, uint32_t timeoutMs, const char* localHostname = "esp32-chair") {
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[mDNS] Wi-Fi desconectado. Impossivel resolver host.");
            return false;
        }

        Serial.println("-------------------------------------------------------------");
        Serial.print("[mDNS] Inicializando responder local como '");
        Serial.print(localHostname);
        Serial.println(".local'...");

        if (!MDNS.begin(localHostname)) {
            Serial.println("[mDNS] Erro ao inicializar responder mDNS local.");
        }

        Serial.print("[mDNS] Consultando serviço '");
        Serial.print(targetHost);
        Serial.println(".local'...");

        // Prioridade 1: Consulta mDNS
        IPAddress hostIP = MDNS.queryHost(targetHost, timeoutMs);

        if (hostIP != INADDR_NONE && hostIP.toString() != "0.0.0.0") {
            _resolvedIP = hostIP;
            _isMdnsResolved = true;
            _isFallbackActive = false;
            Serial.print(">>> [mDNS SUCESSO] Host '");
            Serial.print(targetHost);
            Serial.print(".local' resolvido para: ");
            Serial.println(_resolvedIP);
            return true;
        }

        // Prioridade 3: Fallback de Contingência Determinística (ADR-028)
        Serial.print("[mDNS FALHA] Timeout de ");
        Serial.print(timeoutMs);
        Serial.println("ms excedido sem resposta multicast.");
        Serial.print(">>> [FALLBACK ATIVADO] Chaveando para IP fixo de contingencia: ");
        Serial.println(fallbackIpStr);

        if (_resolvedIP.fromString(fallbackIpStr)) {
            _isMdnsResolved = false;
            _isFallbackActive = true;
            return true;
        }

        Serial.println("[ERRO CRITICO] O IP de contingencia fornecido e invalido.");
        return false;
    }

    void invalidateCache(const char* targetHost, const char* fallbackIpStr, uint32_t timeoutMs, const char* localHostname = "esp32-chair") {
        Serial.println("[Network] Invalidando cache de IP do backend devido a falhas consecutivas...");
        _isMdnsResolved = false;
        resolveBackendHost(targetHost, fallbackIpStr, timeoutMs, localHostname);
    }

    String getBackendURL() const {
        return "http://" + _resolvedIP.toString() + ":" + String(_backendPort) + _backendPath;
    }

    IPAddress getResolvedIP() const {
        return _resolvedIP;
    }

    bool isConnected() const {
        return WiFi.status() == WL_CONNECTED;
    }

    bool isMdnsActive() const {
        return _isMdnsResolved;
    }

    bool isFallbackActive() const {
        return _isFallbackActive;
    }
};
