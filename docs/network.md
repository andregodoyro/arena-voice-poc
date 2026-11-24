# Network Architecture & Connectivity — Arena Voice

> **Baseline Oficial:** Firmware Baseline `v0.5.0` & ADR-028  
> **Topologia:** Rede Local Fechada (2.4 GHz) / Offline-First / Zero Dependências de Nuvem

---

## 1. Topologia da Rede Local de Palco

Em eventos presenciais e ensaios técnicos, a plataforma Arena Voice opera em uma **sub-rede privada e autocontida**:

```text
               ROTEADOR / HOTSPOT DEDICADO DE PALCO (2.4 GHz Wi-Fi)
                (Sem dependência de conexão com a Internet externa)
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
┌───────────────────────────────────┐           ┌───────────────────────────────────┐
│     NOTEBOOK DA MESA TÉCNICA      │           │     5× BOTÕES ESP32 (BANCADA)     │
│   (Windows 10/11 / Servidor Local)│           │   (Cadeiras #1 a #5 dos Jurados)  │
├───────────────────────────────────┤           ├───────────────────────────────────┤
│ • Anúncio mDNS: arena-voice.local │           │ • Resolução mDNS no boot (UDP 5353│
│ • Backend .NET: 0.0.0.0:5000      │◄──────────┤ • Fallback para IP de contingência│
│ • Postgres 18: localhost:5432     │ HTTP POST │ • Envio atômico: /api/chair-press │
│ • Frontend Vite: localhost:5173   │           │ • Latência de envio: < 20 ms      │
└───────────────────────────────────┘           └───────────────────────────────────┘
```

---

## 2. Estratégia Oficial de Descoberta de Serviço (mDNS)

Para erradicar a necessidade de alterar código-fonte e regravar o firmware dos 5 ESP32 a cada novo evento ou troca de sala, a rede opera com resolução dinâmica de nomes:

### 2.1. Como o Host (Mesa Técnica) Anuncia o Serviço
1. **Nome do Computador no Windows:** O notebook da mesa técnica pode ser configurado com o nome de dispositivo `arena-voice`.  
   O serviço mDNS nativo do Windows 10/11 responde automaticamente pelo hostname `arena-voice.local` em qualquer rede local onde esteja conectado.
2. **Porta e Firewall:** A Minimal API escuta em `0.0.0.0:5000`. O firewall do Windows deve permitir conexões de entrada na porta TCP 5000 para a rede local (privada).

### 2.2. Como o ESP32 Descobre o Backend
1. **Prioridade 1 — Consulta mDNS:** No `setup()`, o ESP32 consulta o responder da rede por `arena-voice` na porta UDP 5353 com timeout de 2.500 ms. Ao obter resposta, armazena o endereço IPv4 resolvido na memória RAM.
2. **Prioridade 2 — Hostname Local:** Resolução auxiliar de nome NetBIOS quando suportada pelo ambiente.
3. **Prioridade 3 — Fallback Determinístico:** Caso a consulta mDNS expire ou o roteador bloqueie tráfego multicast, o firmware chaveia silenciosamente para `BACKEND_FALLBACK_IP` (definido em `config.h`, ex: `192.168.43.100`), garantindo continuidade operacional sem travar a inicialização.

---

## 3. Diretrizes de Segurança e Isolamento

1. **Rede Exclusiva para o Palco:** A rede Wi-Fi que atende aos ESP32 **não deve ser compartilhada com o público geral**. Celulares da plateia podem saturar a faixa de 2.4 GHz e introduzir jitter por disputa de canal.
2. **Desacoplamento do Voto Popular (Plateia):** O engajamento do público via smartphones (módulo satélite do Voto Popular) é atendido via navegadores móveis em redes de operadora (4G/5G) ou Wi-Fi de convidados, totalmente segregado da rede crítica de botões da mesa.
3. **Imunidade a Interrupções de Link Externo:** O show no palco (áudio, visual 3D, jurados, timers) opera **100% offline**. Se o link de internet do auditório cair por completo, o Arena Voice continua operando sem interrupções (ADR-016).

---

## 4. Configuração Operacional do Hotspot / AP Dedicado

### 4.1. Parâmetros Recomendados do Roteador / Hotspot
* **Frequência de Rádio:** **2.4 GHz obrigatório** (o rádio do ESP32 WROOM-32 não detecta redes de 5 GHz). No smartphone, ativar a opção *"Maximizar Compatibilidade"*.
* **Canal:** Fixar nos canais menos congestionados (1, 6 ou 11) com largura de banda de 20 MHz.
* **Segurança:** WPA2-PSK com senha de alta entropia.
* **Reserva DHCP (Recomendada para Produção Oficial):** Criar amarrações estáticas por endereço MAC no roteador:
  * Mesa Técnica: `192.168.10.100`
  * ESP32 Cadeira #1: `192.168.10.101`
  * ESP32 Cadeira #2: `192.168.10.102`
  * ESP32 Cadeira #3: `192.168.10.103`
  * ESP32 Cadeira #4: `192.168.10.104`
  * ESP32 Cadeira #5: `192.168.10.105`

---

## 5. Diagnóstico e Testes de Conectividade

### 5.1. Teste de Conexão na Mesa Técnica (PowerShell)
```powershell
# 1. Verificar o IP do notebook na interface Wi-Fi ativa
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi' } | Select-Object InterfaceAlias, IPAddress

# 2. Verificar se a porta 5000 está escutando em todas as interfaces
Test-NetConnection -ComputerName 127.0.0.1 -Port 5000

# 3. Testar a resolução de mDNS local
Resolve-DnsName -Name arena-voice.local
```

### 5.2. Simulação de Disparo de Cadeira via Rede
```powershell
# Executa um disparo simulando a Cadeira #1 contra o endpoint oficial
.\scripts\simulate-esp32.ps1 -ChairId 1 -HostUrl "http://arena-voice.local:5000"
```
