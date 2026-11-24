#pragma once

// =============================================================================
// ARENA VOICE — FIRMWARE BASELINE v0.5.0 (FW-01)
// Configurações Globais de Engenharia e Parâmetros Padrão de Hardware
// Decisão Arquitetural: ADR-028 (Firmware Architecture & Integration Strategy)
// =============================================================================

// Carrega as credenciais locais do dispositivo se existirem (ignorado no Git)
#if __has_include("config_secrets.h")
#include "config_secrets.h"
#endif

// -----------------------------------------------------------------------------
// 1. PINAGEM OFICIAL DO HARDWARE (ESP32 DevKit C V4)
// -----------------------------------------------------------------------------
#ifndef BUTTON_PIN
#define BUTTON_PIN 18         // GPIO 18 -> Microswitch Arcade (Terminal NO para GND)
#endif

#ifndef LED_PIN
#define LED_PIN 2             // GPIO 2  -> LED azul embutido na placa DevKit V4
#endif

// -----------------------------------------------------------------------------
// 2. TEMPORIZAÇÕES MECÂNICAS E DE REDE (Milissegundos)
// -----------------------------------------------------------------------------
#define DEBOUNCE_MS 50        // Janela de debounce mecânico não-bloqueante
#define LOCKOUT_MS 1500       // Trava local anti-repulsão de clique consecutivo
#define HTTP_TIMEOUT_MS 350   // Timeout por tentativa HTTP (calibrado para rede local)
#define MDNS_TIMEOUT_MS 2500  // Timeout limite para resolução mDNS no setup

// Parâmetros da Política Fail-Fast Within Window (ADR-028 / FW-01 Calibrado)
#define MAX_RETRY_ATTEMPTS 3      // Máximo de 3 tentativas rápidas
#define MAX_RETRY_WINDOW_MS 1000  // Janela temporal total de expiração (1 segundo)
#define RETRY_BACKOFF_MS 100      // Backoff curto entre retries de transporte (100 ms)

// -----------------------------------------------------------------------------
// 3. COMUNICAÇÃO SERIAL
// -----------------------------------------------------------------------------
#define SERIAL_BAUD_RATE 115200

// -----------------------------------------------------------------------------
// 4. PARÂMETROS PADRÃO DE REDE E RESOLUÇÃO (Substituíveis em config_secrets.h)
// -----------------------------------------------------------------------------
#ifndef WIFI_SSID
#define WIFI_SSID "YOUR_WIFI_SSID"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif

// Hostname canônico anunciado pelo notebook da mesa técnica via mDNS
#ifndef MDNS_TARGET_HOST
#define MDNS_TARGET_HOST "arena-voice"
#endif

// IP de contingência determinística caso mDNS seja bloqueado no roteador
#ifndef BACKEND_FALLBACK_IP
#define BACKEND_FALLBACK_IP "192.168.43.100"
#endif

// Porta oficial da Minimal API do Backend .NET
#ifndef BACKEND_PORT
#define BACKEND_PORT 5000
#endif

// Endpoint canônico de ingestão de votos da banca
#define BACKEND_PATH "/api/chair-press"

// -----------------------------------------------------------------------------
// 5. IDENTIFICAÇÃO DESTE DISPOSITIVO DE BANCADA
// -----------------------------------------------------------------------------
#ifndef CHAIR_ID
#define CHAIR_ID 1            // Identificador da cadeira: 1, 2, 3, 4 ou 5
#endif

#define FIRMWARE_VERSION "v0.5.0"
#define HARDWARE_REVISION "DEV_KIT_V4_ARCADE"

// -----------------------------------------------------------------------------
// 6. TELEMETRIA E HEARTBEAT (Stubs da Fase 7B — Inativo por Padrão)
// -----------------------------------------------------------------------------
#ifndef ENABLE_TELEMETRY
#define ENABLE_TELEMETRY 0    // 0 = Desativado (Fase 5), 1 = Ativado (Fase 7B)
#endif
