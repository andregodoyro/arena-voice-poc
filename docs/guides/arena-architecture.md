# ARENA VOICE — GUIA DE ARQUITETURA CÊNICA 3D
## Composição Espacial, Hierarquia Visual e Componentes da Arena

**Documento:** Guia de Referência Espacial da Cena 3D  
**Versão:** 1.0 (Pós-Phase 5C.5 Fase 1)  
**Data:** Novembro de 2026  

---

## 1. Visão Geral da Composição Espacial

A arena cênica da Arena Voice é uma representação tridimensional de alta fidelidade construída sobre **React Three Fiber (R3F)**, **Three.js** e materiais **PBR**. 

O espaço foi concebido sob a premissa de um teatro de inovação de classe internacional (*Keynote Arena*), substituindo antigos clichês de auditórios televisivos escuros por arquitetura acústica contemporânea (nogueira nobre, carvalho escuro, bronze escovado e iluminação indireta difusa).

---

## 2. Hierarquia Visual Estrita (Plano Frontal ao Fundo)

A cena 3D organiza-se em camadas de profundidade rigorosamente calculadas para garantir que o projeto apresentado seja sempre o elemento de maior destaque:

```text
                                CÂMERA PRINCIPAL
                            [position: 0, 4.6, 17.5]
                            [target: 0, 3.2, -3.2]
                                      │
                                      ▼
                      1. BANCADA DE JURADOS (Primeiro Plano)
                      5 Cadeiras Físicas (Z ≈ 4.2m a 6.0m)
                                      │
                                      ▼
                      2. PÓDIO DE APRESENTAÇÃO (Plano Médio)
                      TieredPitchStage — Orador Central (Y = 0.44m)
                                      │
                                      ▼
                      3. VÃO LIVRE ARQUITETURAL
                      Piso amadeirado contínuo e desobstruído
                                      │
                                      ▼
                      4. HERO SHOWCASE WALL (Plano Monumental de Fundo)
                      Painel Panorâmico 33.6m × 11.6m (Z = -20.6m)
```

---

## 3. Mapeamento de Componentes (`StudioScene.jsx`)

A composição da cena em [`frontend/src/components/StudioScene.jsx`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/frontend/src/components/StudioScene.jsx) é estruturada pelos seguintes módulos:

### 3.1. `HeroShowcaseWall` (Plano de Fundo — Protagonista)
- **Dimensões:** $33.6\,\text{m}$ de largura por $11.6\,\text{m}$ de altura.
- **Posição:** `[0, 6.6, -20.6]`.
- **Papel:** Exibição dinâmica de vídeo (via `ScreenVideo`), imagens de capa (via `ScreenImage`) e billboard institucional. Emoldurado por shadow-box em nogueira e bronze com fitas de luz perimetrais reativas ao ciclo de vida do pitch.

### 3.2. `TieredPitchStage` (Pódio Central Escalonado)
- Plataforma concêntrica circular em 2 níveis:
  - Nível 1: Raio $5.8\,\text{m}$, espessura $0.22\,\text{m}$ em nogueira escura.
  - Nível 2: Raio $3.5\,\text{m}$, elevação total de $0.44\,\text{m}$ em carvalho escovado com inlay em bronze.
- Fitas LED embutidas sob os degraus (*Under-step Halos*) em tom quente ($2900\,\text{K}$ a $3100\,\text{K}$).

### 3.3. `AcousticCanopy` (Cúpula Zenital)
- Instalada a $13.5\,\text{m}$ de altura acima do pódio, com $24.4\,\text{m}$ de diâmetro.
- 32 aletas radiais de absorção acústica e 2 anéis concêntricos de iluminação difusa.
- Canhão de luz zenital voltado para o pódio do orador.

### 3.4. `AcousticTimberWalls` (Paredes de Ripas Acústicas)
- Parede semicircular monumental de fundo ($R = 23\,\text{m}$, altura $14\,\text{m}$).
- 68 ripas verticais de madeira maciça distribuídas exclusivamente nas **alas laterais** ($X = \pm 16.9\,\text{m}$), garantindo que o vão central de $31.4\,\text{m}$ permaneça 100% desobstruído para o Hero Showcase Wall.

### 3.5. `ArchitecturalFloor` (Piso da Arena)
- Assoalho nobre amadeirado em tom escuro (`#16120e`, PBR roughness 0.45) com absorção controlada de luz e inlays circulares em latão suave.

### 3.6. `Chair` (As 5 Cadeiras da Banca)
- 5 instâncias posicionadas em arco na cota frontal da arena.
- Rotação de 180° com amortecimento físico GSAP.
- Padrão PBR de alta fidelidade: estofamento em couro obsidiana, concha em nogueira nobre e base em titânio e bronze.
- Zero poluição visual (sem caixas de texto flutuantes).

### 3.7. `AmphitheaterSeating` (DESATIVADO / REMOVIDO)
- **Status:** Removido na **Phase 5C.5 Fase 1** (Commit `972dc80`).
- **Motivo:** A arquibancada frontal obstruía a visualização da porção inferior do telão. Sua remoção desimpediu 100% do campo visual entre os jurados e o Hero Wall.

---

## 4. Evolução Futura da Cena (Phase 5C.5 Fase 2)

- **Plateia Lateral em Leque (*Lateral Amphitheater Wings*):**  
  Para preencher os flancos da arena sem reintroduzir barreiras visuais frontais, a Fase 2 (atualmente em planejamento e aguardando aprovação visual) prevê patamares laterais de assentos orientados em leque, mantendo o cone central do telão completamente livre.
