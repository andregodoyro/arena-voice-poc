# FW-01: Plano de Testes e Homologação de Firmware
## Validação da Baseline v0.5.0 para ESP32 DevKit C V4

> **Marco:** FW-01  
> **Escopo:** Homologação Técnica de Rede, Eletrônica, Debounce, Lockout e Semântica HTTP  
> **Ambiente:** Bancada de Engenharia e Laboratório SENAI

---

## Matriz Geral de Casos de Teste

| ID | Teste | Objetivo | Criticidade | Status |
| :---: | :--- | :--- | :---: | :---: |
| **TC-01** | **Resolução mDNS Nominal** | Validar descoberta de `arena-voice.local` no boot | 🔴 Crítico | ✅ Aprovado |
| **TC-02** | **Fallback Determinístico** | Validar chaveamento automático para `BACKEND_FALLBACK_IP` | 🔴 Crítico | ✅ Aprovado |
| **TC-03** | **Voto Aceito (HTTP 200 OK)** | Validar integração com backend em `VotingOpen` e duplo pisca | 🔴 Crítico | ✅ Aprovado |
| **TC-04** | **Bloqueio por Lockout (HTTP 409)** | Validar rejeição semântica fora de `VotingOpen` sem piscar | 🔴 Crítico | ✅ Aprovado |
| **TC-05** | **Reconexão Wi-Fi Assíncrona** | Validar recuperação autônoma pós-queda de AP | 🟡 Alto | ✅ Aprovado |
| **TC-06** | **Debounce Mecânico (50 ms)** | Validar imunidade a ruído e repique de chave | 🟡 Alto | ✅ Aprovado |
| **TC-07** | **Lockout Local Anti-Repulsão (1.500 ms)** | Validar proteção contra duplo clique rápido acidental | 🟡 Alto | ✅ Aprovado |
| **TC-08** | **Carga & Fail-Fast ($\le 1.000\text{ ms}$)** | Validar descarte estrito dentro da janela cênica | 🟡 Alto | ✅ Aprovado |

---

## 1. Detalhamento dos Casos de Teste

### TC-01: Resolução mDNS Nominal (`arena-voice.local`)
* **Pré-condição:** Notebook com backend executando na porta 5000. Nome do computador ou serviço mDNS ativo respondendo por `arena-voice.local`.
* **Procedimento:**
  1. Ligar o ESP32 gravado com o Firmware v0.5.0;
  2. Acompanhar a saída no Serial Monitor a 115200 bps.
* **Resultado Esperado:**
  * O log serial exibe: `[mDNS SUCESSO] Host 'arena-voice.local' resolvido para: 192.168.x.x`;
  * O LED azul emite o padrão de prontidão (apaga após a conexão).
* **Critério de Aceite:** Resolução concluída em menos de 2.500 ms no boot.

---

### TC-02: Fallback Determinístico de IP
* **Pré-condição:** Configurar propositalmente `MDNS_TARGET_HOST "host-inexistente-xyz"` no `config_secrets.h`. O `BACKEND_FALLBACK_IP` configurado com o IP real do notebook.
* **Procedimento:**
  1. Reiniciar o ESP32 via botão RST;
  2. Observar a expiração do timeout de mDNS no Serial Monitor.
* **Resultado Esperado:**
  * Log serial exibe: `[mDNS FALHA] Timeout de 2500ms excedido sem resposta multicast.`;
  * Log serial exibe: `[FALLBACK ATIVADO] Chaveando para IP fixo de contingencia: 192.168.43.100`;
  * Ao pressionar o botão, o voto é entregue ao IP de contingência com sucesso.
* **Critério de Aceite:** O microcontrolador não entra em loop infinito e chaveia com sucesso para o IP fixo.

---

### TC-03: Voto Aceito (`HTTP 200 OK`) e Feedback Visual
* **Pré-condição:** Backend rodando com evento ativo e pitch no estágio `VotingOpen` e timer rodando (`IsPaused == false`).
* **Procedimento:**
  1. Pressionar o botão arcade conectado ao `GPIO 18`;
  2. Observar o LED azul do ESP32, o Serial Monitor, o Telão 3D (`/stage`) e o Cockpit (`/operator`).
* **Resultado Esperado:**
  * O LED azul acende contínuo durante o envio e imediatamente executa o **duplo pisca rápido (Double-Blink)**;
  * O backend retorna `HTTP 200 OK` com `accepted: true`;
  * O Telão 3D gira a cadeira correspondente e dispara o Whoosh do Audio Engine;
  * O log serial exibe: `>>> [SUCESSO 200 OK] Voto aceito pelo backend!`.
* **Critério de Aceite:** Latência do clique até o duplo pisca do LED $< 100\text{ ms}$.

---

### TC-04: Bloqueio por Lockout Autoritativo (`HTTP 409 Conflict`)
* **Pré-condição:** Backend rodando com pitch no estágio `PitchRunning` ou com timer pausado (`IsPaused == true`).
* **Procedimento:**
  1. Pressionar o botão arcade no `GPIO 18`;
  2. Observar o comportamento do LED e o console do backend.
* **Resultado Esperado:**
  * O backend responde com `HTTP 409 Conflict` (`accepted: false, error: "Chair press blocked..."`);
  * O LED azul apaga silenciosamente ao término da requisição **sem executar o duplo pisca**;
  * O log serial exibe: `>>> [BLOQUEIO 409 CONFLICT] Voto rejeitado pelo Lockout do Backend.`;
  * Nenhuma cadeira vira no telão e nenhum som é emitido.
* **Critério de Aceite:** O hardware respeita integralmente a autoridade do servidor e não fornece falso feedback de sucesso ao jurado.

---

### TC-05: Reconexão Wi-Fi Assíncrona
* **Pré-condição:** ESP32 conectado e operando em standby.
* **Procedimento:**
  1. Desligar o ponto de acesso Wi-Fi (hotspot/roteador);
  2. Pressionar o botão durante a indisponibilidade;
  3. Religar o ponto de acesso Wi-Fi.
* **Resultado Esperado:**
  * Durante a queda: O LED azul entra no modo `LED_SEARCHING` (pisca a 2 Hz);
  * O clique durante a queda é descartado rapidamente sem travar a CPU;
  * Ao religar o roteador: o ESP32 reconecta automaticamente via `WiFi.setAutoReconnect(true)` em $< 3\text{ segundos}$ sem necessidade de apertar o botão RST.
* **Critério de Aceite:** Recuperação total de conectividade sem travamento da aplicação.

---

### TC-06: Debounce Mecânico (50 ms)
* **Pré-condição:** Osciloscópio ou analisador lógico monitorando o pino `GPIO 18` durante o acionamento de microswitch com repique elétrico.
* **Procedimento:**
  1. Pressionar o botão arcade 20 vezes com diferentes intensidades de impacto.
* **Resultado Esperado:**
  * Repiques de descida dentro da janela de 50 ms são ignorados;
  * Apenas 1 transição formal é registrada por descida.
* **Critério de Aceite:** Zero disparos espúrios ou múltiplos por clique.

---

### TC-07: Lockout Local Anti-Repulsão (1.500 ms)
* **Pré-condição:** Pitch em estágio `VotingOpen`.
* **Procedimento:**
  1. Pressionar o botão arcade e, imediatamente após (300 ms depois), pressionar uma segunda vez;
  2. Em outro teste, pressionar e manter o botão pressionado continuamente por 5 segundos.
* **Resultado Esperado:**
  * O 1º clique é transmitido e aceito (`HTTP 200`);
  * O 2º clique (aos 300 ms) é bloqueado localmente com log: `[Debounce] Clique ignorado: trava de segurança local anti-repulsao ativa.`;
  * Manter pressionado gera estritamente 1 envio.
* **Critério de Aceite:** Proteção absoluta contra disparos involuntários repetidos.

---

### TC-08: Política Fail-Fast ($\le 1.000\text{ ms}$) sob Falha de Servidor
* **Pré-condição:** Backend propositalmente desligado.
* **Procedimento:**
  1. Pressionar o botão arcade.
* **Resultado Esperado:**
  * O firmware executa a Tentativa 1 ➔ falha de conexão ➔ aguarda backoff curto ➔ Tentativa 2;
  * Ao atingir o limite da janela de 1.000 ms, aborta as tentativas;
  * O LED azul emite o padrão de erro (3 piscas longos);
  * Log serial exibe: `>>> [FAIL-FAST] Janela maxima de 1.000ms expirou. Abortando retries.`.
* **Critério de Aceite:** Nenhum voto fica retido em fila para envio futuro. A thread principal é liberada em $\le 1\text{ segundo}$.
