#pragma once

#include <Arduino.h>

// =============================================================================
// ARENA VOICE — LED FEEDBACK CONTROLLER (FW-01 / ADR-028)
// IHM Visual Não-Bloqueante com Máquina de Estados Temporizada (millis)
// =============================================================================

enum LedPattern {
    LED_OFF,            // Apagado: Standby de operação ou lockout silencioso
    LED_SOLID_ON,       // Ligado fixo: Transmissão HTTP em andamento
    LED_SEARCHING,      // Pisca contínuo (2 Hz): Conectando Wi-Fi / Buscando mDNS
    LED_DOUBLE_BLINK,   // Duplo pisca rápido: Confirmação de voto aceito (HTTP 200 OK)
    LED_ERROR_PATTERN   // 3 piscas longos: Falha de rede / Timeout / Link down
};

class LedController {
private:
    int _pin;
    LedPattern _currentPattern;
    unsigned long _patternStartTime;
    unsigned long _lastToggleTime;
    bool _pinState;
    uint8_t _step;

public:
    LedController() : _pin(2), _currentPattern(LED_OFF), _patternStartTime(0), _lastToggleTime(0), _pinState(false), _step(0) {}

    void init(int pin) {
        _pin = pin;
        pinMode(_pin, OUTPUT);
        setPattern(LED_OFF);
    }

    void setPattern(LedPattern pattern) {
        _currentPattern = pattern;
        _patternStartTime = millis();
        _lastToggleTime = millis();
        _step = 0;

        switch (_currentPattern) {
            case LED_OFF:
                _pinState = false;
                digitalWrite(_pin, LOW);
                break;
            case LED_SOLID_ON:
                _pinState = true;
                digitalWrite(_pin, HIGH);
                break;
            case LED_SEARCHING:
                _pinState = true;
                digitalWrite(_pin, HIGH);
                break;
            case LED_DOUBLE_BLINK:
                _pinState = true;
                digitalWrite(_pin, HIGH);
                break;
            case LED_ERROR_PATTERN:
                _pinState = true;
                digitalWrite(_pin, HIGH);
                break;
        }
    }

    void triggerSuccess() {
        // Disparado estritamente em HTTP 200 OK
        setPattern(LED_DOUBLE_BLINK);
    }

    void triggerError() {
        // Disparado em falha de conexão física ou timeout
        setPattern(LED_ERROR_PATTERN);
    }

    void triggerSolid() {
        // Durante envio de evento
        setPattern(LED_SOLID_ON);
    }

    void triggerOff() {
        // Standby ou Lockout HTTP 409
        setPattern(LED_OFF);
    }

    void triggerSearching() {
        setPattern(LED_SEARCHING);
    }

    void update() {
        unsigned long now = millis();

        switch (_currentPattern) {
            case LED_OFF:
            case LED_SOLID_ON:
                // Estados estáticos: não requerem alternância de timer
                break;

            case LED_SEARCHING:
                // Alterna a cada 250ms (2 Hz)
                if (now - _lastToggleTime >= 250) {
                    _lastToggleTime = now;
                    _pinState = !_pinState;
                    digitalWrite(_pin, _pinState ? HIGH : LOW);
                }
                break;

            case LED_DOUBLE_BLINK:
                // Sequência: ON (70ms) -> OFF (70ms) -> ON (70ms) -> OFF
                if (_step == 0 && (now - _lastToggleTime >= 70)) {
                    _step = 1;
                    _lastToggleTime = now;
                    digitalWrite(_pin, LOW);
                } else if (_step == 1 && (now - _lastToggleTime >= 70)) {
                    _step = 2;
                    _lastToggleTime = now;
                    digitalWrite(_pin, HIGH);
                } else if (_step == 2 && (now - _lastToggleTime >= 70)) {
                    _step = 3;
                    _lastToggleTime = now;
                    digitalWrite(_pin, LOW);
                    setPattern(LED_OFF); // Retorna ao standby
                }
                break;

            case LED_ERROR_PATTERN:
                // 3 pulsos lentos de 180ms ON / 100ms OFF
                if ((_step % 2 == 0) && (now - _lastToggleTime >= 180)) {
                    _step++;
                    _lastToggleTime = now;
                    digitalWrite(_pin, LOW);
                } else if ((_step % 2 != 0) && (now - _lastToggleTime >= 100)) {
                    _step++;
                    _lastToggleTime = now;
                    if (_step >= 6) {
                        setPattern(LED_OFF); // Fim da sequência de erro
                    } else {
                        digitalWrite(_pin, HIGH);
                    }
                }
                break;
        }
    }
};
