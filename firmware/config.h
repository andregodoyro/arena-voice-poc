#pragma once

/**
 * ============================================================================
 * ARENA VOICE POC — CONFIGURAÇÃO DO FIRMWARE ESP32
 * ============================================================================
 * 
 * Para personalizar sem expor credenciais no Git, crie um arquivo chamado:
 *   firmware/config_secrets.h
 * e defina seus valores locais lá. O arquivo config_secrets.h está no .gitignore.
 */

#if __has_include("config_secrets.h")
#include "config_secrets.h"
#endif

// ── Credenciais Wi-Fi (Padrão para desenvolvimento/hotspot) ────────────────
#ifndef WIFI_SSID
#define WIFI_SSID "Hotspot-ArenaVoice"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "arena123456"
#endif

// ── Endereço do Servidor Backend Local ─────────────────────────────────────
// IMPORTANTE: NÃO use "localhost". O ESP32 deve usar o endereço IPv4 real
// do seu computador na rede do hotspot (ex: 192.168.43.150 ou 192.168.137.1)
#ifndef BACKEND_HOST
#define BACKEND_HOST "192.168.43.100"
#endif

#ifndef BACKEND_PORT
#define BACKEND_PORT 5000
#endif

#ifndef BACKEND_PATH
#define BACKEND_PATH "/api/chair-press"
#endif

// ── Identificação da Cadeira Física ────────────────────────────────────────
// Para este primeiro marco (Milestone 1), CHAIR_ID = 1
#ifndef CHAIR_ID
#define CHAIR_ID 1
#endif

// ── Pinos e Temporização ───────────────────────────────────────────────────
#ifndef BUTTON_PIN
#define BUTTON_PIN 18 // GPIO 18 ligado ao terminal do botão (outro terminal no GND)
#endif

#ifndef DEBOUNCE_MS
#define DEBOUNCE_MS 50 // 50 milissegundos para debounce de botão mecânico arcade
#endif
