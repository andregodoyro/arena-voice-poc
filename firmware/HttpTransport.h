#pragma once

#include <Arduino.h>
#include <HTTPClient.h>
#include "config.h"
#include "LedController.h"

// =============================================================================
// ARENA VOICE — HTTP TRANSPORT (FW-01 / ADR-028)
// Transporte REST Atômico com Política Fail-Fast Within Window (<= 1.000 ms)
// =============================================================================

enum TransportStatus {
    STATUS_SUCCESS_200,         // Voto computado e persistido no backend
    STATUS_LOCKOUT_409,         // Voto bloqueado pelo backend (VotingOpen ou timer pausado)
    STATUS_BAD_REQUEST_400,     // Payload inválido ou chairId fora de 1..5
    STATUS_SERVER_ERROR_500,    // Falha interna do servidor
    STATUS_NETWORK_FAILURE      // Timeout, conexão recusada ou link down
};

class HttpTransport {
private:
    uint32_t _httpTimeoutMs;
    uint8_t _consecutiveFailures;

public:
    HttpTransport() : _httpTimeoutMs(2000), _consecutiveFailures(0) {}

    void init(uint32_t timeoutMs) {
        _httpTimeoutMs = timeoutMs;
        _consecutiveFailures = 0;
    }

    uint8_t getConsecutiveFailures() const {
        return _consecutiveFailures;
    }

    void resetFailures() {
        _consecutiveFailures = 0;
    }

    TransportStatus sendChairPress(const String &url, const String &payload, LedController &led) {
        unsigned long windowStartTime = millis();
        int attempt = 1;
        const int maxAttempts = MAX_RETRY_ATTEMPTS;
        const unsigned long maxWindowMs = MAX_RETRY_WINDOW_MS; // Janela estrita de 1 segundo

        Serial.println();
        Serial.println("=============================================================");
        Serial.print("[HTTP POST] Disparando evento para: ");
        Serial.println(url);
        Serial.print("[HTTP POST] Payload: ");
        Serial.println(payload);

        led.triggerSolid();

        while (attempt <= maxAttempts) {
            // Verifica se a janela cênica de 1s expirou antes de nova tentativa
            if (millis() - windowStartTime > maxWindowMs) {
                Serial.println(">>> [FAIL-FAST] Janela maxima de 1.000ms expirou. Abortando retries.");
                break;
            }

            Serial.print("[Transport] Tentativa ");
            Serial.print(attempt);
            Serial.print(" de ");
            Serial.print(maxAttempts);
            Serial.println("...");

            HTTPClient http;
            http.begin(url);
            http.addHeader("Content-Type", "application/json");
            http.setTimeout(_httpTimeoutMs);

            unsigned long startPost = millis();
            int httpCode = http.POST(payload);
            unsigned long durationMs = millis() - startPost;

            Serial.print("[Transport] Codigo de Retorno HTTP: ");
            Serial.print(httpCode);
            Serial.print(" (duracao: ");
            Serial.print(durationMs);
            Serial.println(" ms)");

            // -----------------------------------------------------------------
            // CENÁRIO 1: HTTP 200 OK — Voto Aceito com Sucesso
            // -----------------------------------------------------------------
            if (httpCode >= 200 && httpCode <= 299) {
                String responseBody = http.getString();
                http.end();

                _consecutiveFailures = 0;
                led.triggerSuccess(); // Duplo pisca de confirmação cênica

                Serial.println(">>> [SUCESSO 200 OK] Voto aceito pelo backend!");
                Serial.print(">>> Resposta do Servidor: ");
                Serial.println(responseBody);
                Serial.println("=============================================================");
                return STATUS_SUCCESS_200;
            }

            // -----------------------------------------------------------------
            // CENÁRIO 2: HTTP 409 CONFLICT — Lockout Autoritativo de Negócio
            // -----------------------------------------------------------------
            if (httpCode == 409) {
                String responseBody = http.getString();
                http.end();

                _consecutiveFailures = 0;
                led.triggerOff(); // Apaga o LED (não emite duplo pisca)

                Serial.println(">>> [BLOQUEIO 409 CONFLICT] Voto rejeitado pelo Lockout do Backend.");
                Serial.println("    Motivo: Votacao nao esta aberta (VotingOpen) ou cronometro pausado.");
                Serial.print(">>> Detalhes do Servidor: ");
                Serial.println(responseBody);
                Serial.println("=============================================================");
                return STATUS_LOCKOUT_409;
            }

            // -----------------------------------------------------------------
            // CENÁRIO 3: HTTP 400 Bad Request
            // -----------------------------------------------------------------
            if (httpCode == 400) {
                String responseBody = http.getString();
                http.end();

                _consecutiveFailures = 0;
                led.triggerOff();

                Serial.println(">>> [ERRO 400 BAD REQUEST] Payload malformado ou chairId fora de 1..5.");
                Serial.println(responseBody);
                Serial.println("=============================================================");
                return STATUS_BAD_REQUEST_400;
            }

            // -----------------------------------------------------------------
            // CENÁRIO 4: Falha de Transporte / Timeout / Servidor Inacessível
            // -----------------------------------------------------------------
            http.end();
            Serial.print(">>> [FALHA DE TRANSPORTE] Erro: ");
            Serial.println(http.errorToString(httpCode));

            attempt++;

            // Se ainda dentro da janela, aguarda backoff curto antes da próxima tentativa
            if (attempt <= maxAttempts && (millis() - windowStartTime + RETRY_BACKOFF_MS <= maxWindowMs)) {
                delay(RETRY_BACKOFF_MS); // Backoff curto calibrado de retry
            }
        }

        // Falha persistente após esgotar retries dentro da janela de 1s
        _consecutiveFailures++;
        led.triggerError(); // 3 piscas longos de erro de link

        Serial.println(">>> [ERRO DE TRANSPORTE PERSISTENTE] O voto nao pode ser entregue.");
        Serial.println("    O operador da mesa tecnica deve acionar o Bypass Manual (Fase 7A).");
        Serial.println("=============================================================");
        return STATUS_NETWORK_FAILURE;
    }
};
