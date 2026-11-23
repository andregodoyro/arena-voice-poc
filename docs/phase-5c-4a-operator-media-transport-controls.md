# Phase 5C.4A — Operator Media Transport Controls
## Video Audio, Volume & Timeline Control

**Milestone:** 5C.4A  
**Branch:** `feat/phase5-live-show-experience`  
**Escopo:** Player Profissional de Mídia e Transporte do Hero Showcase Wall no Cockpit do Operador.

---

## 1. Visão Geral e Arquitetura

A **Phase 5C.4A** transforma o módulo de mídia do Hero Showcase Wall em um player de apresentação ao vivo de alto nível, permitindo ao operador controlar integralmente áudio, volume, scrubbing de timeline e ações de transporte (Play, Pause, Restart, -10s, +10s) sem sair da mesa técnica do Cockpit.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COCKPIT DO OPERADOR                             │
│                  (OperatorMediaControl.jsx)                            │
│                                                                        │
│  [Estado Atual: ● REPRODUZINDO COM ÁUDIO]                              │
│  [Timeline: 00:42 / 02:15] ───●────────── [-10s] [+10s]               │
│  [Volume: 🔊 70%] ────────●──── [Play] [Pause] [Reiniciar]             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ BroadcastChannel
                                    │ ('arena_media_controls')
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SUPERFÍCIE CÊNICA 3D (STAGE)                       │
│                       (HeroShowcaseWall.jsx)                           │
│                                                                        │
│  • ScreenVideo (THREE.VideoTexture via @react-three/drei)              │
│  • HTML5 <video> com áudio sincronizado e volume contínuo              │
│  • Resposta instantânea a SEEK, VOLUME, UNMUTE, PLAY, PAUSE            │
│  • Silenciamento e descarte rigoroso fora do estado PitchRunning       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estratégia de Áudio e Políticas do Navegador (Autoplay Policy)

### 2.1. Regras de Estado
- **`PitchRunning`**: Áudio permitido, volume configurável (0% a 100%), sincronizado frame a frame com a textura WebGL do vídeo.
- **`Waiting`**, **`Voting`**, **`Result`**, **`EventIdle`**: Áudio estritamente proibido. O componente `ScreenVideo` é desmontado pelo React; seu cleanup garante:
  ```javascript
  video.pause();
  video.currentTime = 0;
  video.muted = true;
  video.volume = 0;
  ```

### 2.2. Mitigação da Política de Autoplay do HTML5
Navegadores modernos (Chromium, Firefox, Safari) bloqueiam o início de vídeos com som caso não tenha havido gesto do usuário na aba:
1. **Ambiente com Interação Prévia:** Na superfície do telão (`StagePage.jsx`), o componente `AudioUnlockOverlay` exige um primeiro clique de ativação para a trilha cênica. Esse gesto desbloqueia automaticamente a permissão de áudio da janela para toda a sessão.
2. **Fallback Gracioso e Autodetecção:**
   Se por qualquer razão o navegador rejeitar `video.play()` com som (`NotAllowedError`):
   - O player captura o erro silenciosamente, aplica `video.muted = true` e continua executando o vídeo normalmente (sem travar a tela).
   - Emite a flag `isAudioBlocked: true` pelo `BroadcastChannel`.
   - O Cockpit exibe imediatamente um alerta elegante com botão destacado: **"Ativar Áudio"** (1 clique do operador envia `{ action: 'UNMUTE' }`).
3. **Volume Padrão:** **70%** (0.7). Este valor oferece headroom adequado tanto para apresentações gravadas em volume baixo quanto para evitar saturação acústica. O valor é persistido na chave `arena_media_volume` do `localStorage`.

---

## 3. Mecanismo de Sincronização via BroadcastChannel

A sincronização entre o Cockpit e a cena 3D é realizada via **`BroadcastChannel('arena_media_controls')`**, garantindo latência zero (<5ms) intra-navegador sem overhead de polling de rede.

### 3.1. Dicionário de Mensagens

| Direção | Mensagem | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| **Cockpit $\rightarrow$ Stage** | `PLAY` | — | Inicia ou retoma a reprodução do vídeo. |
| **Cockpit $\rightarrow$ Stage** | `PAUSE` | — | Pausa a reprodução no frame atual. |
| **Cockpit $\rightarrow$ Stage** | `RESTART` | — | Move o cursor para `00:00` e inicia o play. |
| **Cockpit $\rightarrow$ Stage** | `SEEK` | `{ time: number }` | Salta diretamente para o timestamp em segundos. |
| **Cockpit $\rightarrow$ Stage** | `VOLUME` | `{ volume: number }` | Atualiza o volume (0.0 a 1.0) e muta se for 0. |
| **Cockpit $\rightarrow$ Stage** | `UNMUTE` | — | Desmuta e restaura o volume de sessão. |
| **Cockpit $\rightarrow$ Stage** | `REQUEST_STATUS` | — | Solicita status atual ao montar o Cockpit. |
| **Stage $\rightarrow$ Cockpit** | `MEDIA_STATUS` | `{ isPlaying, currentTime, duration, volume, isMuted, isEnded, isAudioBlocked }` | Telemetria contínua a cada ~250ms via evento `timeupdate`. |

---

## 4. Controles de Timeline e Scrubbing

- **Display de Progresso:** Formato `MM:SS / MM:SS` (ex: `00:42 / 02:15`).
- **Slider Contínuo (Scrubbing):**
  - Implementado com proteção contra jitter (`isScrubbing` flag). Durante o arrasto pelo operador, os updates recebidos via `BroadcastChannel` não sobrescrevem a posição do ponteiro do mouse/touch.
  - O comando `SEEK` é disparado ao soltar o controle (`onMouseUp` / `onTouchEnd`).
- **Salto Rápido:**
  - Botão **-10s**: retrocede 10 segundos para rever um trecho ou slide específico.
  - Botão **+10s**: adianta 10 segundos para pular introduções longas.

---

## 5. Status Operacional da Apresentação ao Vivo

O Cockpit adota a linguagem dos operadores de switchers de transmissão ao vivo:

| Status | Badge / Visual | Condição |
| :--- | :--- | :--- |
| **● Reproduzindo com Áudio** | Verde esmeralda pulsante + ícone 🔊 | Vídeo ativo, tocando e com som audível |
| **● Reproduzindo (Mudo)** | Verde claro + ícone 🔇 | Vídeo ativo, tocando com volume em 0% ou mutado |
| **● Pausado** | Âmbar + ícone ❚❚ | Vídeo carregado, pausado pelo operador |
| **● Finalizado** | Roxo + ícone 🏁 | Vídeo atingiu o tempo final (`isEnded`) |
| **● Imagem Estática** | Azul + ícone 🖼️ | Estado sem vídeo (Waiting, Voting, Result ou Fallback) |
| **● Standby do Evento** | Sky + ícone 📺 | Estado EventIdle (sem projeto selecionado) |

---

## 6. Fluxo Operacional Típico

1. **Aguardando Início (`Waiting`):** O telão exibe a imagem de capa do projeto sem som. Os botões de transporte ficam desabilitados no Cockpit.
2. **Início do Pitch (`PitchRunning`):** O operador inicia o pitch no timer. O Hero Wall monta instantaneamente o `ScreenVideo`, inicia a reprodução do vídeo e abre o canal de áudio no volume salvo (70%).
3. **Ajuste de Volume:** O operador pode atenuar ou aumentar o volume a qualquer momento arrastando o slider ou clicando no ícone de mute rápido.
4. **Scrubbing durante Perguntas ou Revisão:** Caso o apresentador ou a banca solicite "mostra de novo aquela demonstração", o operador arrasta a barra de progresso ou clica em `-10s` para posicionar exatamente no momento desejado.
5. **Transição para Votação (`Voting`):** O timer encerra ou a banca abre votos. O telão transiciona automaticamente para a imagem do projeto; o áudio do vídeo cessa instantaneamente, mantendo apenas a ambiência e a iluminação pulsante da arena.
