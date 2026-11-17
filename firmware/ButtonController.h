#pragma once

#include <Arduino.h>

// =============================================================================
// ARENA VOICE — BUTTON CONTROLLER (FW-01 / ADR-028)
// Leitura Eletromecânica Não-Bloqueante com Debounce (millis) e Lockout Anti-Repulsão
// =============================================================================

class ButtonController {
private:
    int _pin;
    int _lastStableState;
    int _lastRawReading;
    unsigned long _lastDebounceTime;
    unsigned long _lastTriggerSuccessTime;
    uint32_t _debounceWindowMs;
    uint32_t _lockoutWindowMs;

public:
    ButtonController() :
        _pin(18),
        _lastStableState(HIGH),
        _lastRawReading(HIGH),
        _lastDebounceTime(0),
        _lastTriggerSuccessTime(0),
        _debounceWindowMs(50),
        _lockoutWindowMs(1500) {}

    void init(int pin, uint32_t debounceMs, uint32_t lockoutMs) {
        _pin = pin;
        _debounceWindowMs = debounceMs;
        _lockoutWindowMs = lockoutMs;

        // Ativa o resistor interno de pull-up do ESP32 (~45 kΩ para 3.3V)
        pinMode(_pin, INPUT_PULLUP);
        _lastStableState = digitalRead(_pin);
        _lastRawReading = _lastStableState;
    }

    bool pollButtonPress() {
        int currentRaw = digitalRead(_pin);
        unsigned long now = millis();

        // Se a leitura bruta oscilou em relação à anterior, reinicia a janela de debounce
        if (currentRaw != _lastRawReading) {
            _lastDebounceTime = now;
            _lastRawReading = currentRaw;
        }

        // Se a leitura se manteve estável pelo tempo da janela de debounce
        if ((now - _lastDebounceTime) > _debounceWindowMs) {
            // Detecta estritamente a borda de descida: repouso (HIGH) -> acionamento para GND (LOW)
            if (_lastStableState == HIGH && currentRaw == LOW) {
                _lastStableState = currentRaw;

                // Valida a trava de segurança local anti-repulsão (prevenção de double-fire)
                if ((now - _lastTriggerSuccessTime) > _lockoutWindowMs) {
                    return true;
                } else {
                    Serial.println("[Debounce] Clique ignorado: trava de segurança local anti-repulsao ativa.");
                    return false;
                }
            } else if (_lastStableState == LOW && currentRaw == HIGH) {
                // Transição de liberação do botão: botão solto (LOW -> HIGH)
                _lastStableState = currentRaw;
            }
        }

        return false;
    }

    void markTriggerSuccess() {
        _lastTriggerSuccessTime = millis();
    }
};
