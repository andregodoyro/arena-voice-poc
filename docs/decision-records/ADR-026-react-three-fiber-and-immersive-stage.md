# ADR-026: Permanência no React Three Fiber e Expansão da Fase 5 para Live Show Imersivo (Áudio + Visual 3D)

> **Status:** ✅ APROVADO  
> **Data:** 16 de Novembro de 2026  
> **Decisores:** Arquiteto Principal & Equipe de Engenharia Arena Voice  
> **Fase:** Fase 5 — Live Show Experience & Immersive Stage  

---

## 1. Contexto

Com o encerramento formal da Fase 4 (Platform Reliability & Data Resilience), a plataforma Arena Voice alcançou maturidade corporativa em persistência ACID, Crash Recovery, Audit Trail, Auto-Snapshots físicos e Disaster Recovery out-of-process com 100% de paridade validada (688 testes verdes em 14 suítes).

O *Post Phase 4 Decision Workshop* identificou que o maior gargalo atual da plataforma reside na **experiência cênica de palco ao vivo**:
1. O telão (`/stage`) operava em silêncio absoluto, sem o impacto emocional e sonoro característico do formato "The Voice";
2. A camada visual 3D, embora construída sobre React Three Fiber e Three.js, utilizava primitivas procedurais low-poly básicas (`cylinderGeometry`, `boxGeometry`), iluminação direta estática, ausência de pós-processamento cinemático (sem bloom nos neons) e câmeras estáticas.

Avaliou-se se a Fase 5 deveria ser restrita a áudio ou se deveria integrar a evolução visual 3D, e se a plataforma deveria migrar para motores alternativos (Babylon.js, PlayCanvas, OGL ou Three.js imperativo).

---

## 2. Decisão

Ficam formalmente aprovadas as seguintes decisões arquiteturais:

1. **Expansão Conceitual da Fase 5:**  
   A Fase 5 deixa de ser tratada exclusivamente como uma "fase de áudio" e passa a ser **Phase 5 — Live Show Experience & Immersive Stage**, englobando simultaneamente áudio de baixa latência (Web Audio API), renderização 3D cinemática (Postprocessing, iluminação volumétrica, materiais PBR), direção de câmeras dinâmicas e controle de show pela mesa técnica.

2. **Rejeição Categórica de Migração de Engine:**  
   Não haverá migração para Babylon.js, PlayCanvas, OGL ou Three.js imperativo. A pilha atual já conta com Three.js `0.186.1`, `@react-three/fiber` `9.8.1`, `@react-three/drei` `10.7.9` e `gsap` `3.15.0`. Migrar para outro motor destruiria a integração declarativa nativa com o React 19 e a reatividade com o SignalR, sem trazer nenhum ganho visual que o ecossistema R3F não consiga entregar.

3. **Stack Visual Oficial Confirmado:**  
   A camada cênica da Arena Voice é padronizada oficialmente em:
   - **React 19** (`react`, `react-dom`)
   - **Three.js** (`three`)
   - **React Three Fiber** (`@react-three/fiber`)
   - **Drei** (`@react-three/drei`)
   - **GSAP** (`gsap`)
   - **SignalR Client** (`@microsoft/signalr`)
   - **React Three Postprocessing** (`@react-three/postprocessing`, `postprocessing`)

4. **Nova Estrutura em 6 Marcos da Fase 5:**  
   - **5A:** *Audio Engine Infrastructure & Visual Rendering Foundation* (Web Audio API singleton + `@react-three/postprocessing` com Selective Bloom e ACES Tone Mapping).
   - **5B:** *Audio & Visual Event Synchronization* (Sincronização estrita de som e luz com `ChairTurned`, `VotingClosed` e `PitchTimerUpdated`).
   - **5C:** *Stage Visual FX & Immersive Atmosphere* (Iluminação volumétrica, piso reflexivo PBR, partículas de confetes 3D para unanimidade 5/5 e aura de suspense).
   - **5D:** *Cinematic Camera & Stage Direction* (Câmeras dirigidas por eventos: Modo Espera, Modo Pitch, Modo Votação, Modo Vitória e Modo Resultado).
   - **5E:** *Operator Show Control* (Soundboard na mesa técnica, controle master de volume, MUTE de emergência e presets de diretor de palco).
   - **5F:** *Live Show Validation & Performance Certification* (Auditoria de 60 FPS cravados com áudio e 3D concorrentes, latência < 50ms e 15 suítes de regressão).

5. **Aproveitamento Gradual de Modelos 3D (GLTF/GLB):**  
   Substituição progressiva das primitivas geométricas por modelos fotorrealistas GLTF/GLB (cadeiras com botões iluminados, pórticos de palco, refletores e troféu da premiação), utilizando `useGLTF.preload()` e compressão Draco/KTX2.

---

## 3. Consequências

### Positivas
- **Custo Zero de Reescrita:** Todo o investimento de engenharia é canalizado para qualidade de acabamento sensorial e impacto cênico, sem atrasos no cronograma.
- **Sincronismo Natural:** Eventos do SignalR acionam simultaneamente a máquina de áudio e as animações de materiais/câmeras via hooks reativos do React 19.
- **Estética de Transmissão Televisiva:** Pós-processamento com Bloom seletivo confere brilho real aos neons de branding, criando atmosfera de estúdio profissional.
- **Controle Total da Mesa:** O operador ganha capacidades de diretor cênico de TV ao vivo com mute de emergência e atalhos rápidos.

### Negativas / Mitigações
- **Consumo de GPU com Pós-Processamento:** Efeitos de bloom e profundidade de campo podem onerar notebooks com GPUs integradas.  
  *Mitigação:* Calibração do DPR (`dpr={[1, 1.5]}`), selective bloom restrito a materiais emissivos com threshold > 1.0 e tone mapping em pass único.
- **Políticas de Autoplay dos Navegadores:** Navegadores bloqueiam áudio automático sem interação prévia do usuário.  
  *Mitigação:* Componente de desbloqueio suave (`AudioUnlockOverlay`) no Stage com listener de primeiro clique/toque.
