#pragma once

// ============================================================
// ARENA VOICE POC - CONFIGURAÇÃO TÉCNICA ESTRUTURAL (FIRMWARE)
// ============================================================
//
// Parâmetros técnicos fixos e não sensíveis do ESP32.
// Para credenciais de Wi-Fi e IP do backend, copie:
// config_secrets.h.example -> config_secrets.h
// ============================================================

// Carrega as credenciais e configurações locais do dispositivo se existirem
#if __has_include("config_secrets.h")
#include "config_secrets.h"
#endif

// ------------------------------------------------------------
// PINOS E ELETRÔNICA DO HARDWARE
// ------------------------------------------------------------

#define BUTTON_PIN 18         // GPIO 18 -> Botão arcade (pull-up interno) para GND
#define LED_PIN 2             // GPIO 2 -> LED azul embutido na placa DevKit V4

// ------------------------------------------------------------
// TEMPORIZAÇÃO E DEBOUNCE
// ------------------------------------------------------------

#define DEBOUNCE_MS 50        // Janela de debounce mecânico (50 ms)
#define LOCKOUT_MS 1500       // Trava de segurança anti-repulsão de clique (1.5 s)

// ------------------------------------------------------------
// COMUNICAÇÃO SERIAL
// ------------------------------------------------------------

#define SERIAL_BAUD_RATE 115200

// ------------------------------------------------------------
// ROTA HTTP PADRÃO DA API
// ------------------------------------------------------------

#define BACKEND_PATH "/api/chair-press"

// ------------------------------------------------------------
// VALORES PADRÃO SEGUROS (caso config_secrets.h não exista)
// ------------------------------------------------------------

#ifndef WIFI_SSID
#define WIFI_SSID "YOUR_WIFI_SSID"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif

#ifndef BACKEND_HOST
#define BACKEND_HOST "192.168.1.100"
#endif

#ifndef BACKEND_PORT
#define BACKEND_PORT 5000
#endif

#ifndef CHAIR_ID
#define CHAIR_ID 1
#endif
