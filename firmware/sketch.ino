/*
  =============================================================================
  ARENA VOICE — POC FÍSICO-DIGITAL LOCAL
  Firmware ESP32 #1 -> Wi-Fi Hotspot -> HTTP POST -> Backend ASP.NET
  =============================================================================

  Conexão de Hardware:
  GPIO 18 -> Botão Arcade (Microswitch terminal NO)
  GND     -> Botão Arcade (Microswitch terminal COM)
  (Utilizando pull-up interno: pinMode(BUTTON_PIN, INPUT_PULLUP))

  Transição monitorada: HIGH -> LOW (quando o botão é pressionado).
  Debounce de 50ms para evitar registros espúrios ou múltiplos disparos.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"

// LED embutido da placa ESP32 (GPIO 2) para feedback visual de transmissão
const int PINO_STATUS_LED = 2;

// Variáveis de controle de debounce e borda
int ultimoEstadoBotao = HIGH;
unsigned long ultimoTempoDebounce = 0;
unsigned long ultimoDisparoSucesso = 0;

void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.println("-------------------------------------------------------------");
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(PINO_STATUS_LED, !digitalRead(PINO_STATUS_LED)); // Pisca enquanto conecta
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PINO_STATUS_LED, LOW);
    Serial.println();
    Serial.println(">>> Wi-Fi CONECTADO COM SUCESSO!");
    Serial.print(">>> IP do ESP32: ");
    Serial.println(WiFi.localIP());
    Serial.print(">>> Gateway/Hotspot: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print(">>> Backend Alvo: http://");
    Serial.print(BACKEND_HOST);
    Serial.print(":");
    Serial.print(BACKEND_PORT);
    Serial.println(BACKEND_PATH);
    Serial.println("-------------------------------------------------------------");
  } else {
    Serial.println();
    Serial.println(">>> [FALHA] Nao foi possivel conectar ao Wi-Fi.");
    Serial.println("    Verifique se o Hotspot esta ativo em 2.4 GHz e o SSID/senha.");
  }
}

void enviarAcionamentoCadeira() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[AVISO] Wi-Fi desconectado! Reconectando...");
    conectarWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[ERRO] Abortando envio: sem conexao de rede.");
      return;
    }
  }

  // Acende LED para indicar envio em andamento
  digitalWrite(PINO_STATUS_LED, HIGH);

  unsigned long inicioEnvio = millis();
  Serial.println();
  Serial.println("=============================================================");
  Serial.print("[BOTAO FISICO PRESSIONADO] Disparando acionamento Cadeira #");
  Serial.println(CHAIR_ID);

  HTTPClient http;
  String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + String(BACKEND_PATH);
  Serial.print("Enviando HTTP POST para: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2500); // Timeout de 2.5s para evitar travamento em rede instável

  // Payload padrão da POC com suporte retrocompatível
  String payload = "{\"chairId\":" + String(CHAIR_ID) + ",\"seatNumber\":" + String(CHAIR_ID) + "}";
  Serial.print("Payload JSON: ");
  Serial.println(payload);

  int codigoHttp = http.POST(payload);
  unsigned long latencia = millis() - inicioEnvio;

  Serial.print("Resposta HTTP: ");
  Serial.print(codigoHttp);
  Serial.print(" (tempo: ");
  Serial.print(latencia);
  Serial.println(" ms)");

  if (codigoHttp >= 200 && codigoHttp <= 299) {
    String resposta = http.getString();
    Serial.println(">>> [SUCESSO] Backend confirmou o evento!");
    Serial.print(">>> Resposta do Servidor: ");
    Serial.println(resposta);
    ultimoDisparoSucesso = millis();

    // Pisca rápido duas vezes para indicar confirmação
    digitalWrite(PINO_STATUS_LED, LOW);
    delay(70);
    digitalWrite(PINO_STATUS_LED, HIGH);
    delay(70);
    digitalWrite(PINO_STATUS_LED, LOW);
  } else {
    Serial.print(">>> [ERRO] Falha ao contatar backend. Codigo HTTP: ");
    Serial.println(codigoHttp);
    digitalWrite(PINO_STATUS_LED, LOW);
  }

  http.end();
  Serial.println("=============================================================");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n");
  Serial.println("=============================================================");
  Serial.println("   ARENA VOICE — FIRMWARE ESP32 POC INICIADO                ");
  Serial.print("   CADEIRA ATRIBUIDA: #");
  Serial.println(CHAIR_ID);
  Serial.print("   PINO DO BOTAO:     GPIO ");
  Serial.println(BUTTON_PIN);
  Serial.println("=============================================================");

  // Configuração dos pinos
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(PINO_STATUS_LED, OUTPUT);
  digitalWrite(PINO_STATUS_LED, LOW);

  // Conecta ao Wi-Fi configurado
  conectarWiFi();

  Serial.print("Aguardando acionamento fisico do botao (GPIO ");
  Serial.print(BUTTON_PIN);
  Serial.println(" -> GND)...");
}

void loop() {
  int leituraAtual = digitalRead(BUTTON_PIN);

  // Detecção de transição com debounce mecânico
  if ((millis() - ultimoTempoDebounce) > DEBOUNCE_MS) {
    // Detecta EXCLUSIVAMENTE a transição HIGH -> LOW (apertou o botão para o GND)
    if (ultimoEstadoBotao == HIGH && leituraAtual == LOW) {
      ultimoTempoDebounce = millis();

      // Trava de segurança para evitar múltiplos envios se mantiver pressionado (rate limit de 1.5s)
      if (millis() - ultimoDisparoSucesso > 1500) {
        enviarAcionamentoCadeira();
      } else {
        Serial.println("[DEBOUNCE] Clique ignorado (intervalo mínimo entre acionamentos)");
      }
    }
  }

  ultimoEstadoBotao = leituraAtual;

  // Pequeno delay de 10ms para alívio da CPU do microcontrolador
  delay(10);
}
