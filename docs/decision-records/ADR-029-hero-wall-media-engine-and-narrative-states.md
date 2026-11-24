# ADR-029: Hero Wall Media Engine, Máquina de Estados Narrativos e Transporte via BroadcastChannel

> **Status:** ✅ APROVADO  
> **Data:** 23 de Novembro de 2026  
> **Decisores:** Arquiteto Principal & Equipe de Engenharia Arena Voice  
> **Fase:** Phase 5C — Live Show Experience (5C.2 a 5C.4A)  

---

## 1. Contexto

Com a promoção do projeto apresentado ao status de protagonista visual da Arena Voice (Hero Showcase Wall), surgiu a necessidade de exibir conteúdos dinâmicos de alta resolução (imagens de capa, logotipos e vídeos promocionais) sincronizados com o ciclo de vida do pitch e controlados em tempo real pela mesa técnica (Cockpit).

Anteriormente, avaliou-se construir uma infraestrutura complexa baseada em:
- Dual-Mesh com blend manual de transparência e crossfade de shaders;
- Loaders imperativos de texturas e filas de dispose manuais em WebGL;
- Transmissão de comandos de reprodução de vídeo (Play/Pause/Seek) via endpoints REST no backend e deltas no SignalR.

Essa abordagem mostrou-se excessivamente frágil, suscetível a vazamentos de memória na GPU e introduziu latência desnecessária na rede para ações puramente locais do operador.

---

## 2. Decisão

Ficam estabelecidas e homologadas as seguintes diretrizes arquiteturais para o motor de mídia da arena:

1. **Adoção Declarativa de `@react-three/drei` (`useTexture` e `useVideoTexture`):**
   - O telão monumental abandona loaders manuais imperativos de Three.js.
   - Texturas de imagem são carregadas via `useTexture` e texturas de vídeo via `useVideoTexture`.
   - O ciclo de vida e liberação de recursos WebGL (`dispose`) são delegados ao ecossistema declarativo do Drei/R3F na desmontagem dos componentes (`ScreenImage` e `ScreenVideo`).

2. **Orquestração por Máquina de Estados Narrativos (`wallMode`):**
   - Um hook central (`useHeroWallMedia.js`) mapeia o estado da sessão em 5 modos determinísticos:
     - `event-idle`: Billboard institucional do evento.
     - `waiting`: Imagem de capa do projeto selecionado.
     - `pitch-live`: Vídeo do projeto (com fallback determinístico para capa).
     - `voting`: Imagem de capa do projeto (foco atencional na decisão da banca).
     - `result`: Imagem de capa do projeto acompanhada de iluminação cênica de celebração.

3. **Comunicação Intra-Navegador via `BroadcastChannel`:**
   - As ações de controle de mídia da mesa técnica (Play, Pause, Restart, Seek, Volume, Unmute) são despachadas através do canal nativo `BroadcastChannel('arena_media_controls')`.
   - **Zero tráfego no backend:** Comandos de vídeo não passam por requisições HTTP REST nem pelo Hub SignalR, garantindo latência < 5ms entre o Cockpit e a tela do palco na mesma máquina ou rede de abas.

4. **Diretriz Rígida de Áudio e Mitigação de Autoplay:**
   - O áudio do vídeo é liberado **exclusivamente durante o modo `pitch-live`** (`PitchRunning` / `QA`). Em qualquer outro modo (`waiting`, `voting`, `result`, `event-idle`), o elemento de vídeo é pausado e desmontado com volume zero.
   - O desbloqueio de permissão de áudio do navegador no Stage é viabilizado pelo componente `AudioUnlockOverlay`, com detecção de `isAudioBlocked` e botão de desmute assistido no Cockpit.

---

## 3. Consequências

### Positivas
- **Estabilidade Extrema:** Eliminação total de erros de desalocação de buffers WebGL e z-fighting.
- **Responsividade Instantânea:** Operações de Play, Scrubbing na timeline e Volume refletem no telão em tempo real sem latência de rede.
- **Isolamento de Responsabilidades:** O backend permanece focado exclusivamente em regras de negócio autoritativas (timers, lockout, votos, persistência), sem se sobrecarregar com telemetria contínua de playback de vídeo.

### Negativas / Mitigações
- **Escopo do BroadcastChannel:** Funciona exclusivamente dentro do mesmo navegador/origem (mesmo host/porta). Caso a mesa técnica opere em máquina fisicamente apartada sem tela estendida, a sincronização de mídia requer espelhamento de display ou futura extensão por WebSocket local.
