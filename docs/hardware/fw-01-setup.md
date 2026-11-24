# FW-01: Guia de Setup, Compilação e Gravação
## Firmware Baseline v0.5.0 para ESP32 DevKit C V4

> **Marco:** FW-01  
> **Público:** Engenheiros de Hardware, Técnicos de Bancada e Operadores de Palco  
> **Placa Alvo:** ESP32 DevKit C V4 (ESP-WROOM-32)

---

## 1. Requisitos de Ambiente de Desenvolvimento

### 1.1. Arduino IDE
* **Versão Recomendada:** Arduino IDE 2.3.x ou superior (ou Arduino CLI 0.35+);
* **Download Oficial:** [arduino.cc/en/software](https://www.arduino.cc/en/software).

### 1.2. Pacote de Placas ESP32 (ESP32 Board Package)
1. No Arduino IDE, abra **File > Preferences** (ou `Ctrl + ,`);
2. No campo **Additional boards manager URLs**, adicione:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Abra **Tools > Board > Boards Manager...**;
4. Pesquise por **`esp32`** (por *Espressif Systems*);
5. Instale a versão **2.0.14** ou **3.0.x** oficial.

### 1.3. Bibliotecas Requeridas
O Firmware Baseline v0.5.0 foi projetado com **zero dependências externas**. Todas as bibliotecas utilizadas são nativas do core oficial do ESP32:
* `<WiFi.h>` (Nativa do core ESP32);
* `<HTTPClient.h>` (Nativa do core ESP32);
* `<ESPmDNS.h>` (Nativa do core ESP32);
* `<Arduino.h>` (Core C++).

Nenhuma biblioteca de terceiros precisa ser instalada via Library Manager.

---

## 2. Configurações da Placa no Arduino IDE

No menu **Tools**, selecione os seguintes parâmetros:

* **Board:** `"ESP32 Dev Module"` (ou `"DOIT ESP32 DEVKIT V1"`);
* **Upload Speed:** `921600` (ou `115200` caso ocorram erros de sincronismo USB);
* **CPU Frequency:** `240MHz (WiFi/BT)`;
* **Flash Frequency:** `80MHz`;
* **Flash Mode:** `QIO`;
* **Flash Size:** `4MB (32Mb)`;
* **Partition Scheme:** `"Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)"` ou `"Minimal SPIFFS (1.9MB APP)"`;
* **Core Debug Level:** `"None"` (em produção) ou `"Info"` (em bancada);
* **Port:** Selecione a porta COM correspondente ao adaptador USB-Serial (ex: `COM3`, `COM4` no Windows).

> [!TIP]
> Caso a porta COM não apareça ao plugar o cabo USB, instale o driver do chip conversor correspondente à sua placa: **CP2102** (Silicon Labs) ou **CH340** (WCH).

---

## 3. Parametrização Local do Dispositivo

1. Abra a pasta `firmware/` no seu explorador de arquivos;
2. Se o arquivo `config_secrets.h` não existir, crie uma cópia a partir do template:
   ```cmd
   copy firmware\config_secrets.h.example firmware\config_secrets.h
   ```
3. Abra `firmware/config_secrets.h` no editor de texto de sua preferência;
4. Configure as credenciais da rede e o ID desta cadeira específica:

```cpp
#pragma once

// Credenciais da rede Wi-Fi 2.4 GHz do evento ou laboratório
#define WIFI_SSID     "ArenaVoice-Palco"
#define WIFI_PASSWORD "palmeiras98"

// Nome anunciado pelo computador do backend na rede
#define MDNS_TARGET_HOST "arena-voice"

// IP de contingência caso o mDNS seja bloqueado
#define BACKEND_FALLBACK_IP "192.168.43.100"

// Porta da Minimal API
#define BACKEND_PORT 5000

// Identificação exclusiva desta placa física (1, 2, 3, 4 ou 5)
#define CHAIR_ID 1
```

> [!IMPORTANT]
> Para cada uma das 5 cadeiras físicas, **altere apenas a constante `CHAIR_ID`** (1 para Cadeira 1, 2 para Cadeira 2, etc.) antes de compilar e gravar a placa correspondente.

---

## 4. Compilação e Gravação (Flash)

1. No Arduino IDE, abra o arquivo `firmware/sketch.ino`;
2. Conecte a placa ESP32 ao computador via cabo USB de dados (certifique-se de que não é um cabo exclusivo de carregamento);
3. Clique no botão **Verify** (`Ctrl + R`) para validar a compilação:
   * **Resultado esperado:** `Done compiling` sem warnings ou erros;
4. Clique no botão **Upload** (`Ctrl + U`):
   * Se o console exibir `Connecting........_____.....`, pressione e segure o botão físico **BOOT** da placa ESP32 por 2 segundos até o início da gravação (`Writing at 0x00010000...`);
5. Aguarde até a mensagem `Hard resetting via RTS pin...` indicando a conclusão bem-sucedida.

---

## 5. Validação Pós-Gravação via Serial Monitor

1. No Arduino IDE, abra o **Serial Monitor** (`Ctrl + Shift + M`);
2. Configure a velocidade para **`115200 baud`**;
3. Pressione o botão **EN / RST** da placa ESP32;
4. O console serial exibirá o banner oficial da baseline v0.5.0:

```text
=============================================================
   ARENA VOICE — FIRMWARE BASELINE v0.5.0 (FW-01)           
   Subsistema de Hardware Oficial da Banca de Jurados        
=============================================================
[Hardware] Botao Arcade configurado no pino GPIO 18 com pull-up interno.
[Hardware] LED de status configurado no pino GPIO 2.

[Wi-Fi] Conectando ao SSID: ArenaVoice-Palco
....
>>> [Wi-Fi] CONECTADO COM SUCESSO!
>>> IP do ESP32: 192.168.43.50
>>> Gateway:    192.168.43.1
>>> Sinal RSSI: -54 dBm
-------------------------------------------------------------
[mDNS] Inicializando cliente mDNS e consultando 'arena-voice.local'...
>>> [mDNS SUCESSO] Host 'arena-voice.local' resolvido para: 192.168.43.100
-------------------------------------------------------------
[Identidade] Cadeira Atribuida: #1
[Identidade] Tag do Dispositivo: CHAIR-01
[Identidade] Firmware:           v0.5.0
[Identidade] MAC Address:        24:6F:28:AB:CD:EF
[Conexao]   Backend Alvo:       http://192.168.43.100:5000/api/chair-press
=============================================================
>>> ARENA VOICE PRONTO. Aguardando acionamento do jurado...
```
