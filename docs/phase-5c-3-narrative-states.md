# ARENA VOICE — RELATÓRIO TÉCNICO DE ENGENHARIA E DESIGN VISUAL
## Phase 5C.3: Narrative States & Simplified Media Engine (The Project on Stage)

**Projeto:** Arena Voice / Arena de Inovação  
**Branch:** `feat/phase5-live-show-experience`  
**Marco:** Phase 5C.3 — Narrative States & Media Architecture Simplification  
**Status:** ✅ **Concluído e Homologado com Testes Automatizados**  
**Data:** 23 de Novembro de 2026  

---

## 1. Visão Geral e Objetivo

A **Phase 5C.3** estabeleceu a máquina de estados narrativos do **Hero Showcase Wall**, simplificando radicalmente a infraestrutura de projeção 3D ao adotar loaders declarativos nativos do ecossistema `@react-three/drei` (`useTexture` e `useVideoTexture`), banindo pipelines frágeis de dual-mesh, loaders manuais imperativos e dispose queues assíncronas complexas.

### Princípio Arquitetural
O telão monumental deixa de gerenciar transições manuais desnecessárias e passa a ser orquestrado exclusivamente por um seletor determinístico de estados: a propriedade `wallMode`.

---

## 2. A Máquina de Estados Narrativos (5 Estados Oficiais)

O hook central [`useHeroWallMedia.js`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/frontend/src/hooks/useHeroWallMedia.js) mapeia o contexto global da sessão (`activeEvent`, `currentProject`, `pitchStage`) para um dos 5 estados narrativos de exibição no telão:

```
[Sessão sem Projeto] ──────────► EventIdle ────► Imagem/Billboard Institucional do Evento
                                     │
[Projeto Selecionado] ─────────► Waiting ──────► Imagem de Capa do Projeto (Cover Image)
                                     │
[Início do Pitch] ─────────────► PitchRunning ──► Vídeo do Projeto (com fallback suave para Capa)
                                     │
[Perguntas / Votação] ─────────► Voting ───────► Imagem de Capa do Projeto (Foco e Atenção)
                                     │
[Aprovação / Encerramento] ────► Result ───────► Imagem do Projeto + Iluminação de Celebração
```

| `wallMode` | Gatilho de Negócio | Mídia em Exibição | Comportamento de Áudio |
|---|---|---|---|
| **`event-idle`** | Sem projeto ativo no palco (`!currentProject`) | Billboard do Evento (`event.logoUrl`, `event.coverImageUrl`, cores institucionais) | Mudo |
| **`waiting`** | Projeto selecionado, pitch em `Waiting` | Imagem de capa do projeto (`project.media.coverImageUrl`) | Mudo |
| **`pitch-live`** | Apresentação em andamento (`PitchRunning` / `QA`) | Vídeo do projeto (`project.media.videoUrl`) via `ScreenVideo` (ou fallback para capa via `ScreenImage`) | **Áudio Habilitado** (volume configurável pelo operador) |
| **`voting`** | Votação aberta ou fechada (`VotingOpen` / `VotingClosed`) | Imagem de capa do projeto (`project.media.coverImageUrl`) | Mudo (áudio de vídeo descartado) |
| **`result`** | Rodada concluída (`Finished`) | Imagem do projeto com iluminação cênica de aprovação/celebração | Mudo |

---

## 3. Arquitetura Simplificada: `ScreenImage` e `ScreenVideo`

Em conformidade com a auditoria de simplificação da Phase 5C.3, o componente [`HeroShowcaseWall.jsx`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/frontend/src/components/stage/HeroShowcaseWall.jsx) foi decomposto em subcomponentes declarativos:

```
HeroShowcaseWall
│
├── ScreenImage (useTexture)  ─── Utilizado em: event-idle, waiting, voting, result e fallback
│
└── ScreenVideo (useVideoTexture) ── Utilizado estritamente em: pitch-live
```

### 3.1. Eliminação de Complexidade Técnica
- **Remoção de Dual-Mesh:** Não há mais duas malhas sobrepostas disputando buffer de profundidade e gerando z-fighting ou vazamento de texturas.
- **Remoção de Loaders Manuais:** Eliminados `THREE.TextureLoader` e `THREE.VideoTexture` imperativos com handlers manuais de erro.
- **Dispose Automático:** `@react-three/drei` gerencia o ciclo de vida WebGL da textura automaticamente durante a desmontagem do componente.
- **Resiliência a Falhas:** Se o vídeo não for fornecido ou falhar no carregamento, `useHeroWallMedia` comuta imediatamente para o fallback da imagem de capa (`mediaType: 'image'`), garantindo que o telão permaneça sempre preenchido.

---

## 4. Testes e Validação Automatizada

A lógica narrativa foi coberta com testes unitários no frontend:
- **Arquivo de Teste:** `frontend/tests/heroWallMedia.test.js`
- **Cobertura:**
  1. Resolução para `event-idle` quando não há projeto selecionado;
  2. Resolução para `waiting` quando o projeto está em espera;
  3. Resolução para `pitch-live` com prioridade para `videoUrl` durante `PitchRunning`;
  4. Resolução para `voting` mantendo a imagem de capa em foco;
  5. Fallback determinístico para imagem de capa caso o projeto não possua vídeo cadastrado.
- **Resultado:** 5/5 asserções aprovadas com 100% de sucesso.
