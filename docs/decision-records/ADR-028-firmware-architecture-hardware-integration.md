# ADR-028: Firmware Architecture & Hardware Integration Strategy (Baseline Oficial do Subsistema de Hardware)

> **Status:** ✅ APROVADO  
> **Data:** 17 de Novembro de 2026  
> **Decisores:** Arquiteto Principal & Equipe de Engenharia Arena Voice  
> **Fase:** Fase 5 — Live Show Experience & Immersive Stage  
> **Alinhamento:** ADR-001 (Backend Authoritative), ADR-013 (Lockout Autoritativo), ADR-015 (Identidade Desacoplada), ADR-016 (Offline-First Persistence), ADR-027 (Áudio Procedural & Sincronização)

---

## 1. Contexto e Motivação

Nas Fases 1 a 4 da plataforma Arena Voice, o ecossistema atingiu maturidade de produção:
- Backend autoritativo em ASP.NET Core (.NET 10);
- Persistência relacional local ACID com PostgreSQL 18.6 Portable e Snapshot Pattern;
- Resiliência contra falhas (Crash Recovery com reidratação em modo Paused e Disaster Recovery RPO=0 / RTO < 30s);
- Linha do tempo auditável com segregação de eventos operacionais e técnicos (ADR-022);
- Sincronização audiovisual de alta performance no telão 3D procedural com síntese Web Audio procedural (ADR-026 e ADR-027).

Contudo, a camada de hardware (ESP32) permaneceu como um protótipo inicial com IP numérico estático compilado no código-fonte, bloqueios de thread com `delay()`, falta de tratamento semântico dos códigos de resposta HTTP (notadamente o `HTTP 409 Conflict` do Lockout Autoritativo) e dependência operacional de regravações frequentes a cada troca de rede ou sala de ensaio.

Além disso, após auditoria arquitetural comparativa com o projeto satélite *Arena Voice Voto Popular* (focado no engajamento de plateia via smartphones na nuvem), definiu-se a necessidade de estabelecer formalmente a **baseline arquitetural do hardware da banca de jurados**, garantindo que o firmware evolua sem retrabalho estrutural para as Fases 6 e 7.

---

## 2. Princípios e Diretrizes Arquiteturais Inegociáveis

### 2.1. Manutenção Integral do Backend Authoritative
O fluxo de dados da virada de cadeiras permanece estritamente unidirecional e centralizado:
$$\mathbf{ESP32} \xrightarrow{\quad\text{HTTP POST}\quad} \mathbf{Backend} \xrightarrow{\quad\text{PostgreSQL}\quad} \mathbf{SignalR} \xrightarrow{\quad\text{Stage 3D}\quad} \mathbf{Operator}$$

Nenhuma mutação de estado de cadeira ou de pontuação é realizada localmente no microcontrolador. O backend é a única autoridade para validar o estado do pitch, o timer e o lockout.

### 2.2. Tecnologias Rejeitadas para o Subsistema de Palco
Fica terminantemente vedada a adoção de:
* ❌ **MQTT ou Brokers Intermediários (Mosquitto/EMQX):** Violam a simplicidade do modelo in-process e o ADR-016 (Offline-First), inserindo mais um ponto único de falha de infraestrutura no evento ao vivo;
* ❌ **SignalR ou WebSockets no ESP32:** Conexões TCP persistentes com ping/pong no microcontrolador consomem RAM excessiva, geram overhead de reconexão em microquedas de Wi-Fi e desviam o papel do hardware;
* ❌ **Dependências de Nuvem Pública para a Banca (Firebase, Supabase, AWS, Render, Railway):** A decisão soberana dos jurados não pode depender da internet do auditório. A latência de nuvem pública (200ms a 3000ms com cold starts) viola o orçamento de latência cênica de $< 100\text{ ms}$;
* ❌ **Filas Persistentes de Votos no Microcontrolador (Flash/SPIFFS):** Um voto de cadeira é um evento cênico temporal. Retransmitir votos acumulados minutos após a perda de rede injetaria "votos fantasmas" em momentos indevidos do pitch.

### 2.3. Tecnologias Confirmadas
* ✅ **HTTP/1.1 REST Transacional:** Conexões atômicas, ultrarrápidas ($< 20\text{ ms}$ em LAN) e sem estado no hardware;
* ✅ **ASP.NET Core Minimal API (`0.0.0.0:5000`):** Ingestão no endpoint `/api/chair-press`;
* ✅ **PostgreSQL 18.6 Portable ACID:** Persistência atômica e Audit Trail com milissegundos;
* ✅ **SignalR Hub Local (`/hubs/arena-poc`):** Distribuição para telão cênico e cockpit;
* ✅ **Estratégia Offline-First:** 100% autocontida em rede local fechada.

---

## 3. Papel Formal do Firmware na Plataforma

O firmware ESP32 é formalmente definido como:
> **Um sensor transdutor eletromecânico e ponte de transporte de baixa latência e alta confiabilidade.**

### O firmware NÃO controla:
* A cadeira ou sua rotação no espaço 3D;
* A máquina de estados do pitch ou suas transições;
* A abertura ou fechamento de votação;
* O lockout de segurança ou pausa de tempo;
* Os cronômetros ou timers autoritativos;
* O resultado ou a pontuação da startup.

### O firmware EXCLUSIVAMENTE:
1. Detecta a transição física do botão arcade industrial (GPIO 18 com pull-up interno e debounce de 50ms);
2. Valida a prontidão de conectividade de rede local;
3. Resolve o endpoint de backend de forma autônoma e resiliente;
4. Envia o evento de acionamento transacional via HTTP POST com timeout rígido;
5. Fornece feedback visual local instantâneo via LED (IHM de 4 estados) interpretando os códigos HTTP (`200 OK` vs `409 Conflict`).

---

## 4. Estratégia Oficial de Resolução de Endereço

Para eliminar a fragilidade operacional de IPs numéricos hardcoded e extinguir a necessidade de regravar o firmware a cada mudança de rede, institui-se a resolução hierárquica em 3 prioridades:

```
                   DESCOBERTA DE SERVIÇO NO BOOT
                                 │
          ┌──────────────────────┴──────────────────────┐
          ▼                                             ▼
  [Prioridade 1: mDNS]                        [Prioridade 3: Fallback]
  Consulta "arena-voice.local"                 IP Estático de Contingência
  via Multicast UDP 5353                       Configurado em config.h
  (Timeout: 2.500 ms)                          (ex: 192.168.43.100)
          │                                             │
   Sucesso? ──► SIM ──► Armazena no Cache de RAM        │
          │                                             │
         NÃO ───────────────────────────────────────────┘
```

1. **Prioridade 1 (Oficial):** `arena-voice.local` via mDNS (Multicast DNS nativo na porta UDP 5353). O computador da mesa técnica anuncia esse nome e o ESP32 resolve o IP no setup sem nenhuma intervenção manual.
2. **Prioridade 2:** Resolução de Hostname NetBIOS/Local quando aplicável pela pilha de rede.
3. **Prioridade 3 (Contingência Determinística):** `BACKEND_FALLBACK_IP` gravado em `config.h` (ex: `192.168.43.100`), ativado automaticamente caso o roteador bloqueie pacotes multicast.

**Invariante de Desempenho:** A resolução mDNS é executada **exclusivamente no boot ou em invalidação preguiçosa de cache pós-falha**. O momento do clique consome o IP diretamente da memória RAM, garantindo envio em $< 20\text{ ms}$.

---

## 5. Arquitetura-Alvo: Firmware Baseline v0.5.0

O firmware atinge a versão baseline `v0.5.0` estruturado em módulos lógicos desacoplados:

### 5.1. Módulos Obrigatórios
1. **Device Identity:** Registro de metadados únicos do hardware;
2. **WiFi Manager:** Conexão assíncrona não-bloqueante com auto-reconexão (`WiFi.setAutoReconnect(true)`);
3. **mDNS Resolver:** Cliente mDNS com timeout estrito de 2.500 ms;
4. **Fallback Resolver:** Fallback automático para IP fixo em caso de falha de mDNS;
5. **Button Controller & Debounce Engine:** Leitura com janela de 50 ms por `millis()` e trava de segurança anti-repulsão de 1.500 ms;
6. **HTTP Transport:** Cliente HTTP com timeout de 2.000 ms, conexão atômica e cabeçalho `Content-Type: application/json`;
7. **Response Handler:** Diferenciação semântica entre `200 OK` (sucesso), `409 Conflict` (lockout), `400 Bad Request` e erros de rede;
8. **LED Feedback Controller:** IHM do LED de status embutido (GPIO 2):
   * *Piscando rápido (2 Hz):* Wi-Fi buscando conexão;
   * *Aceso contínuo (Solid ON):* Transmissão HTTP em andamento;
   * *Duplo pisca rápido (Double-Blink):* Confirmação de voto aceito (`200 OK`);
   * *Apagado:* Prontidão (Standby). Em caso de `409 Conflict`, o LED apenas apaga ao término do POST sem emitir o duplo pisca.

### 5.2. Estrutura de Identidade do Dispositivo (`DeviceIdentity`)
```cpp
struct DeviceIdentity {
    const uint8_t chairId;             // Posição física da cadeira na banca (1 a 5)
    const char* deviceTag;             // Tag mnemônica (ex: "CHAIR-01")
    const char* firmwareVersion;       // Versão semântica (ex: "v0.5.0")
    const char* hardwareRevision;      // Revisão física (ex: "DEV_KIT_V4_ARCADE")
    char macAddress[18];               // MAC Address de fábrica lido do hardware
};
```

---

## 6. Política de Telemetria e Fila de Eventos

### 6.1. Telemetria e Heartbeat
* **Decisão:** A estrutura de dados de telemetria e o ponto de extensão (`onHeartbeatTick()`) passam a existir no firmware desde a versão `v0.5.0`.
* **Estado Operacional:** **Desativado por padrão** através da diretiva:
  ```cpp
  #define ENABLE_TELEMETRY 0
  ```
* **Destino:** A ativação da transmissão periódica de telemetria (ping de sinal Wi-Fi, RSSI, tensão e uptime) fica formalmente reservada para o **Milestone 7B (Fleet Telemetry)**.

### 6.2. Política de Fila e Resiliência (Fail-Fast Within Window)
* **Decisão:** O Arena Voice **NÃO utilizará fila persistente (buffer)** para votos de bancada.
* **Justificativa:** Um acionamento de cadeira no formato *The Voice* possui valor cênico instantâneo acoplado ao cronômetro da rodada. Votos retidos em buffer que fossem entregues com minutos de atraso após a recuperação de um roteador violariam as regras da máquina de estados do pitch e poderiam aprovar startups indevidas.
* **Estratégia Aprovada: Fail-Fast within Window (Janela Máxima $\le 1.000\text{ ms}$):**
  * Tentativa 1: Imediata ao clique;
  * Tentativa 2: Retry após 150 ms se houver falha de rede transitória;
  * Tentativa 3: Retry após 300 ms se persistir;
  * Se todas falharem, o evento é sumariamente abortado e o LED sinaliza falha. O operador da mesa técnica contorna a ocorrência acionando o **Bypass Manual da Cadeira (Fase 7A)**.

---

## 7. Impacto e Alinhamento com Fases Futuras

### 7.1. Fase 6 (Awards Ceremony, Ranking & Executive Reports)
* **Diretriz:** **Congelamento total do firmware.**
* O firmware `v0.5.0` não sofre nenhuma modificação na Fase 6. Toda a evolução da Fase 6 concentra-se no backend (regras de desempate, ranking oficial ponderado com os 20% do Voto Popular e exportação da ata oficial em PDF/CSV) e no frontend cênico de pódio 3D.

### 7.2. Fase 7 (Operational Hardening, Contingency & Fleet Telemetry)
* **7A — Cockpit de Contingência (Bypass Manual):** O operador na mesa técnica ganha comando em 1 clique para virar a cadeira via software em caso de quebra do botão físico. O firmware não é impactado.
* **7B — Telemetria da Frota de ESP32:** Ativação da flag `#define ENABLE_TELEMETRY 1` no firmware e consumo dos pacotes de liveness pelo backend e cockpit.
* **7C — Runbook Operacional de Produção:** Procedimentos formais de ensaio e checklist pré-show das 5 cadeiras.
* **7D — Chaos Engineering Holístico de Campo:** Validação prática de desligamento de AP Wi-Fi, perda forçada de pacotes e reconexão autônoma das 5 cadeiras em ensaio com carga real.

---

## 8. Consequências da Decisão

### Positivas
* **Eliminação Total de IPs Hardcoded:** O hardware descobre o backend via `arena-voice.local` mantendo fallback determinístico;
* **Zero Retrabalho na Fase 7:** As estruturas de identidade e telemetria já nascem compatíveis com o futuro monitor de frota;
* **Integridade Cênica Preservada:** Proibição de filas persistentes elimina risco de "votos fantasmas" pós-queda de rede;
* **Conformidade com ADR-016 (Offline-First):** Operação 100% autônoma e independente de conexão de internet;
* **Preservação dos 688 Testes da Plataforma:** Nenhuma alteração necessária nos contratos REST, bancos de dados ou SignalR da plataforma.

### Negativas / Mitigações
* **Requisito de Multicast na Rede Local:** Se o roteador corporativo bloquear pacotes mDNS (UDP 5353), a resolução via `arena-voice.local` falhará.  
  * *Mitigação:* O firmware implementa fallback automático e silencioso para `BACKEND_FALLBACK_IP`, garantindo que o sistema funcione mesmo em redes restritivas.
