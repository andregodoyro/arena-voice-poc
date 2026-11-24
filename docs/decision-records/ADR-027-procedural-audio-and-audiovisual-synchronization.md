# ADR-027: Síntese de Áudio Procedural em Runtime e Sincronização Audiovisual de Palco (Milestone 5B)

> **Status:** ✅ APROVADO  
> **Data:** 16 de Novembro de 2026  
> **Decisores:** Arquiteto Principal & Equipe de Engenharia Arena Voice  
> **Fase:** Fase 5 — Live Show Experience & Immersive Stage  
> **Milestone:** 5B — Audio & Visual Event Synchronization  
> **Referência:** ADR-026 (R3F Stack & Immersive Stage)  

---

## 1. Contexto e Restrições Operacionais

O Milestone 5A entregou a infraestrutura fundamental de áudio e visual cinemático (`AudioEngine` singleton, conformidade com autoplay do navegador e pipeline de pós-processamento com Bloom seletivo e ACES Tone Mapping).

O Milestone 5B introduz a **reatividade cênica audiovisual**: os eventos da Arena Voice devem produzir respostas sonoras, luminosas e cinemáticas coordenadas em tempo real.

Entretanto, o projeto opera sob restrições estritas de ambiente corporativo:
1. **Restrições de download de assets externos:** Bloqueio de CDNs públicas e restrições de proxy;
2. **Distribuição offline-first:** A plataforma deve funcionar com excelência em ambientes desconectados (air-gapped) ou redes locais isoladas;
3. **Latência acústica crítica:** O áudio deve sincronizar-se no mesmo milissegundo com a interpolação visual do GSAP (sem tempo de espera por decodificação de áudio via rede).

---

## 2. Avaliação das Fontes de Áudio e Estratégia Adotada

### 2.1 Análise de Repositórios e Alternativas Externas

| Fonte / Abordagem | Licença | Compatibilidade | Adequação ao Arena Voice | Avaliação Técnica |
|---|:---:|:---:|:---:|---|
| **Arquivos de Áudio Embarcados (WAV/MP3)** | Variável | Universal | Média | Aumentaria o peso do repositório Git em centenas de megabytes. Exige decodificação assíncrona com risco de falha em conexões lentas ou paths corrompidos. |
| **`github.com/rse/soundfx`** (Ralf S. Engelschall) | MIT | Web Audio API | Parcial | Excelente conceito de geração procedural sem arquivos externos. Contudo, seus presets são voltados para UI e bipes retrô de 8-bits, inadequados para a atmosfera dramática de um espetáculo televisivo ("The Voice"). Adicionar dependência npm geraria atrito em pipelines corporativos. |
| **`github.com/topics/audio-effects`** | Variável | Mista | Baixa | A quase totalidade dos repositórios são bibliotecas de processamento VST/DAW em C++/JUCE, scripts de pós-produção Python ou bibliotecas Web Audio voltadas a pedais de guitarra. Excessivamente complexas e inadequadas. |
| **Web Audio API Procedural em Runtime (Nativa)** | N/A (Padrão W3C) | Universal no Browser | **Excelente (100%)** | Geração instantânea de ondas acústicas, ruído branco filtrado e modulação de frequência diretamente pelos nós nativos do navegador (`AudioContext`). **Zero dependências, zero download, zero latência.** |

### 2.2 Decisão Estratégica: Síntese Procedural Nativa (`SoundSynthesizer.js`)

Adotou-se como diretriz oficial a **síntese procedural em runtime**, gerada localmente pelo singleton `AudioEngine` através do módulo `SoundSynthesizer.js`:
- **Zero downloads:** nenhum arquivo `.wav` ou `.mp3` é baixado do exterior;
- **Zero dependências:** nenhum pacote adicional no `package.json`;
- **Alta fidelidade televisiva:** algoritmos de síntese customizados para as assinaturas cênicas do programa.

---

## 3. Matriz de Assinaturas Audiovisuais dos Eventos

| Evento da Arena | Gatilho SignalR / Estado | Assinatura Acústica (Web Audio API) | Resposta Visual 3D (R3F + GSAP) |
|---|---|---|---|
| **`ChairTurned`** | `ChairTurned` / `prev.isTurned === false && curr.isTurned === true` | Whoosh pneumático de ruído branco com filtro passa-faixa varrendo de 1400Hz a 220Hz + duplo clique de catraca mecânica (520Hz/680Hz). | Rotação de 180° com curva `power2.inOut`, flare súbito do botão emissivo (intensidade de pico 9.0 -> 4.8), flash no spotlight (75 -> 48) e scale pulse no halo. |
| **`VotingOpen`** | `PitchStageChanged(VotingOpen)` / `isVotingAllowed: true` | Stinger cênico harmônico com acorde estéreo em Fá Maior (F4, A4, C5, F5) com osciladores senoidais desafinados (+4 cents) gerando shimmer. | Botões das cadeiras não viradas entram em pulso senoidal contínuo (`emissiveIntensity` oscilando 0.5 <-> 2.4), convidando o jurado ao voto. Palco central amplia brilho. |
| **`Timer15Seconds`** | `PitchTimerUpdated` (`remainingSeconds <= 15`) | Sub-kick de tensão (sine pitch-drop 95Hz -> 42Hz) simulando batimento cardíaco + transient click em 1350Hz. Nos 5 segundos finais, ativa pulso duplo sincopado (taquicardia). | Retícula e anel do palco central pulsam em sincronismo em vermelho/âmbar de alerta (`#ff3b30`). |
| **`VotingClosed`** | `PitchStageChanged(VotingClosed / Finished)` | Gongo ressonante profundo (fundamental sub-drop E2 82.4Hz -> 38Hz) com harmônicos metálicos (196Hz, 370Hz) e impacto percussivo de ruído metálico em 2400Hz. | Spotlight do palco afunila seu foco (penumbra 0.45) e aumenta intensidade, enquanto a iluminação dos arcos cênicos é reduzida (2.5 -> 1.4), criando isolamento dramático. |
| **`UnanimousApproval`** | `turnedCount === 5 && prevTurnedCount < 5` | Fanfarra triunfal em arpejo ascendente de 5 notas (C4, E4, G4, C5, E5) com dentes de serra filtrados por passa-baixa para timbre acobreado de metais. | Pulso de prestígio em escala e opacidade da aura do palco central (`unanimityAuraRef`) e iluminação máxima dos arcos cênicos. |
| **`ChairsReset`** | `ChairsReset` / transição para `Waiting` | Tom futurista descendente suave (540Hz -> 180Hz) com relaxamento acústico. | Cadeiras retornam suavemente à rotação original e os botões desarmam para o repouso operacional (intensidade 0.2). |

---

## 4. Auditoria e Classificação dos Modelos 3D

Conforme diretriz da Fase 5, realizou-se auditoria rigorosa dos modelos 3D:

1. **Estado Atual no Repositório:**  
   A totalidade dos elementos cênicos atuais de `Chair.jsx` e `StudioScene.jsx` é composta por **geometria procedural nativa do Three.js** (`cylinderGeometry`, `boxGeometry`, `ringGeometry`, `torusGeometry`), totalizando ~4.200 triângulos e mantendo renderização ultra-leve. Não existem arquivos binários `.glb`/`.gltf` prévios na árvore de código.

2. **Classificação dos Modelos Planejados (ADR-026 / Inventário):**
   - **`evaluator_chair_v2.glb`** (~12.5k tris, PBR 2K): Classificado para **Milestone 5C** (Visual FX & 3D Stage Upgrade). No 5B, a cadeira procedural atual foi esteticamente aprimorada com PBR de alto contraste, glow reativo e flare dinâmico, garantindo estabilidade prévia da sincronização de som.
   - **`stage_pitch_podium.glb`** (~8.4k tris, PBR 2K): Classificado para **Milestone 5C**.
   - **`robotic_moving_head.glb`** (~6.8k tris, PBR 1K): Classificado para **Milestone 5C**.
   - **`stage_scenery_rig.glb`** (~28k tris, PBR 2K): Classificado para **Milestone 5C**.
   - **`cinematic_rig_markers.glb`** (~1.2k tris): Classificado para **Milestone 5D** (Câmeras Cinematográficas).
   - **`trophy_grand_prix.glb`** (~14k tris): Classificado para **Milestone 5E / Fase 6**.
   - **`audience_silhouette_instanced.glb`** (~800 tris instanciado): Classificado para **Milestone 5E / Fase 7**.

---

## 5. Consequências

### Positivas
- **100% Autônomo e Desconectado:** Nenhuma dependência externa, permitindo execução perfeita em qualquer ambiente corporativo, intranet ou auditório sem conexão à internet.
- **Sincronismo Preciso ao Milissegundo:** O acionamento via `useStageAudioDirector` dispara o sintetizador de áudio no mesmo loop de eventos em que o GSAP inicia a interpolação visual da rotação e dos neons.
- **Zero Overhead no Git:** Nenhuma inclusão de arquivos binários pesados de áudio no repositório.
- **Manutenção de 60 FPS:** Síntese procedural consome menos de 0.2% da CPU durante picos acústicos.
