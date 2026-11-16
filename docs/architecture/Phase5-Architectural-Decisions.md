# Decisões Arquiteturais — Fase 5
## Live Show Experience & Immersive Stage

> **Projeto:** Arena Voice / Arena de Inovação  
> **Fase:** Fase 5 — Live Show Experience & Immersive Stage  
> **Status:** ✅ CONSOLIDADO E APROVADO  
> **Data:** 16 de Novembro de 2026  

---

## 1. Visão Geral da Reestruturação da Fase 5

A Fase 5 foi formalmente reestruturada de uma fase puramente sonora para uma **experiência integrada de espetáculo ao vivo**. A plataforma une o motor de áudio Web Audio API de baixa latência à camada de computação gráfica 3D com React Three Fiber, Drei, GSAP e pós-processamento cinemático.

---

## 2. Decisões Arquiteturais Consolidadas

### ADR-026: Permanência no React Three Fiber e Expansão para Live Show Imersivo
- **Contexto:** Necessidade de elevar drasticamente a qualidade visual e sensorial do telão (`/stage`) sem gerar atrasos de cronograma com reescritas de motores gráficos.
- **Decisão:** Rejeição de migração para Babylon.js, PlayCanvas, OGL ou Three.js imperativo. Confirmação do stack oficial: React 19 + Three.js + React Three Fiber + Drei + GSAP + SignalR + React Three Postprocessing.
- **Estrutura de Marcos Aprovada:**
  - **5A:** *Audio Engine Infrastructure & Visual Rendering Foundation*
  - **5B:** *Audio & Visual Event Synchronization*
  - **5C:** *Stage Visual FX & Immersive Atmosphere*
  - **5D:** *Cinematic Camera & Stage Direction*
  - **5E:** *Operator Show Control*
  - **5F:** *Live Show Validation & Performance Certification*

---

## 3. Matriz de Integração Audiovisual por Marco

| Marco | Dimensão Sonora (Web Audio API) | Dimensão Visual 3D (R3F + Drei + Shaders) | Sincronismo SignalR |
|---|---|---|---|
| **5A** | `AudioEngine`, `AudioContext`, Unlock Policy, Master Gain | `EffectComposer`, `Bloom`, `ToneMapping`, DPR Adaptativo | Inicialização de Hub |
| **5B** | Whoosh mecânico, Ticker de 15s, Gongo final | Glow emissivo, cone de luz reativo, rotação GSAP | `ChairTurned`, `PitchTimerUpdated`, `VotingClosed` |
| **5C** | Trilha contínua de suspense, Fanfarra 5/5 | Volumetric lights, piso reflexivo, confetes 3D, lasers | `PitchStarted`, `PitchPaused`, `RoundArchived` |
| **5D** | Ducking automático em transições de câmera | Câmeras cinematográficas: Wide, Stage, Jury, Hero | `PitchStageChanged`, `ActiveEventChanged` |
| **5E** | Soundboard no cockpit, Mute de emergência | Presets de diretor de palco, blackout e celebração | `AudioMuted`, `AudioVolumeChanged`, `StagePresetChanged` |
| **5F** | Auditoria de latência auditiva (< 50ms) | Auditoria de 60 FPS estáveis sob carga máxima | Regressão completa com 15 suítes verdes |
