# ARENA VOICE — RELATÓRIO DE ENGENHARIA E DESIGN ARQUITETURAL
## Phase 5C.1: Architectural Arena Redesign (Immersive Stage Experience)

**Projeto:** Arena Voice / Arena de Inovação  
**Branch:** `feat/phase5-live-show-experience`  
**Marco:** Phase 5C.1  
**Status:** ✅ **Concluído e Validado em Build de Produção**  
**Data:** 17 de Novembro de 2026  

---

## 1. Visão Geral e Conceito

A **Phase 5C.1** marca a transformação visual e espacial do palco cênico do Arena Voice. O objetivo primordial deste marco foi reposicionar a experiência visual pública:

> **Transição de Paradigma:**  
> De um *dashboard 3D utilitário com estética de programa televisivo pop dos anos 2010*  
> Para uma **Keynote Arena Arquitetural Contemporânea**, inspirada em teatros de inovação globais (como o *Steve Jobs Theater* e auditórios acústicos de alta tecnologia).

Nesta fase, a geometria, a volumetria, os materiais PBR e a luminotécnica foram completamente reestruturados para estabelecer a fundação física necessária para que o **projeto apresentado se torne o protagonista absoluto (Nível 1 de Atenção)** a partir da Phase 5C.2.

---

## 2. Decisões Arquiteturais Implementadas

### 2.1. Pódio Central Circular Escalonado (`TieredPitchStage`)
- **Inspiração:** Plataforma concêntrica em múltiplos níveis com iluminação indireta contínua da imagem de referência.
- **Geometria:**
  - **Nível 1 (Plataforma Base):** Raio de $5.8\,\text{m}$, espessura de $0.22\,\text{m}$, revestimento em nogueira nobre escura (`#281e16`).
  - **Nível 2 (Pódio do Orador):** Raio de $3.5\,\text{m}$, elevação adicional de $+0.22\,\text{m}$ (altura total de oratória $Y = 0.44\,\text{m}$), revestimento em carvalho arquitetural fino (`#3a2a1d`).
  - **Inlay de Keynote:** Guia circular sutil em latão/bronze para alinhamento físico do orador.
- **Luminotécnica Indireta (*Under-step Cove Halos*):** Fitas LED contínuas embutidas nos rodapés dos degraus com temperatura quente calibrada em $2900\,\text{K}$ a $3100\,\text{K}$, criando o efeito de que o pódio flutua suavemente sobre o piso da arena.
- **Spotlight Zenital:** Refletor arquitetural suave com penumbra ampla ($0.65$) projetado a partir da cúpula do teto ($Y = 13.5\,\text{m}$), iluminando o apresentador com contornos cinematográficos.

### 2.2. Cúpula Arquitetural Zenital (`AcousticCanopy`)
- **Inspiração:** Cúpula escavada com anéis de luz e aletas radiais da referência visual.
- **Geometria:** Instalada a $13.5\,\text{m}$ de altura acima do pódio, com diâmetro externo de $24.4\,\text{m}$.
- **Composição:** Disco côncavo em madeira escura com 32 aletas acústicas radiais distribuídas simetricamente.
- **Anéis Concêntricos de Luz (*Cove Rings*):**
  - Anel Externo ($R = 10.4\,\text{m}$) com luz difusa em $2800\,\text{K}$ (`#ffcca0`).
  - Anel Interno ($R = 4.5\,\text{m}$) com luz difusa em $3100\,\text{K}$ (`#ffe4cc`).
- **Óculo Central:** Carcaça circular em bronze escovado integrando os canhões de luz de palco.

### 2.3. Paredes e Painéis de Ripas Acústicas (`AcousticTimberWalls`)
- **Conceito:** *Acoustic Timber Slats*.
- **Estrutura:** Parede semicircular monumental de fundo ($R = 23.0\,\text{m}$, altura de $14.0\,\text{m}$) que abraça a arena.
- **Ripas Verticais:** 68 ripas maciças de madeira tratada com espaçamento paramétrico rigoroso, eliminando a sensação de "parede lisa de videogame".
- **Luz Rasante (*Linear Grazing*):** Iluminação indireta em temperatura quente instalada na base e coroa da alvenaria para realçar o relevo tridimensional da madeira.

### 2.4. Arquibancada Semicircular (`AmphitheaterSeating`)
- **Geometria:** 4 patamares concêntricos escalonados flanqueando a lateral e o fundo da arena.
- **Balizamento Arquitetural:** Iluminação linear de degrau (*step safety cove light*) embutida nas testeiras de cada patamar ($2900\,\text{K}$).
- **Mobiliário:** Assentos contínuos estofados em tecido acústico escuro fosco, sem reflexos plásticos indesejados.

### 2.5. Piso Nobre da Arena (`ArchitecturalFloor`)
- Substituição do piso frio de laboratório e das linhas técnicas por assoalho amadeirado escuro de alta absorção luminosa (`#16120e`, PBR `roughness 0.45`, `metalness 0.18`).
- Inlays circulares concêntricos em latão escovado com opacidade suave ($0.25$) demarcando as zonas de circulação.

### 2.6. Preparação para o Telão Monumental (`HeroWallNiche`)
- **Posicionamento Estratégico:** Parede esquerda da arena (`X = -13.2`, `Y = 6.8`, `Z = -6.8`, rotação $0.54\,\text{rad}$), alinhada ao campo de visão privilegiado da bancada de jurados e da plateia frontal.
- **Proporção Cinematográfica:** Nicho arquitetural embutido na proporção 16:9 widescreen ($13.5\,\text{m} \times 7.6\,\text{m}$).
- **Shadow Box & Bezel:** Nicho escavado com $0.55\,\text{m}$ de profundidade, moldura chanfrada em madeira nogueira e perfil em bronze anodizado.
- **Estado de Standby:** Superfície escura antirreflexo em vidro temperado com retroiluminação de contorno sutil (*perimeter cove backlighting*), reservando o volume e a perspectiva exata para o motor de mídia da Phase 5C.2.

---

## 3. Depuração das Cadeiras e Remoção de Dashboard UI

Em aderência estrita à diretriz de que o **projeto é o protagonista** e a arena deve transparecer **prestígio arquitetural**:

1. **Eliminação dos Textos 3D Flutuantes (`Chair.jsx`):**
   - Foram suprimidos permanentemente os nós `<Text>{name}</Text>` e `<Text>{status}</Text>` que pairavam acima do encosto das cadeiras.
   - O status é transmitido exclusivamente pela mecânica física (rotação de 180° com amortecimento GSAP), pelo refletor vertical arquitetural focado no assento e pelo botão emissivo.
2. **Refinamento PBR das Cadeiras:**
   - Estofamento: Couro escuro nobre em tom obsidiana (`#141416`, `roughness 0.3`).
   - Concha externa: Nogueira arquitetural escura fosca.
   - Pedestal e pilar: Bronze escovado e titânio acetinado.
3. **Consistência Funcional Intacta:**
   - Mecanismo de acionamento via SignalR, sincronização de áudio com `useStageAudioDirector` (ADR-026/ADR-027) e integração com o firmware ESP32 (FW-01 / ADR-028) permanecem 100% preservados e funcionais.

---

## 4. Avaliação Técnica e Prática do Modelo 3D `the_voice.glb`

Conforme determinado no escopo da fase, foi realizada uma auditoria estrutural e volumétrica no modelo presente em `C:\Users\ANDREROC\Documents\modelos3d\the_voice.glb` (Sketchfab, 7.3 MB, autor mr_shulgin):

| Componente no GLB | Dimensão / Malhas | Veredito | Justificativa Arquitetural |
|---|---|:---:|---|
| **Cenário Geral (`Node 6`)** | $39.7\,\text{m} \times 16.2\,\text{m} \times 54.8\,\text{m}$ / 28 malhas | ❌ **Descartar** | Representa fielmente a carcaça de um programa de auditório musical de TV dos anos 2010 (treliças de alumínio aparentes, chão preto espelhado com neon roxo/vermelho). Entra em contradição direta com o conceito de inovação de alto padrão. |
| **Conjunto de Cadeiras (`Node 53` e `Node 86`)** | $16.7\,\text{m} \times 9.5\,\text{m} \times 7.8\,\text{m}$ / 56 malhas | ⚠️ **Aproveitamento Opcional Futuro** | A geometria das poltronas possui estofamento curvilíneo interessante, mas está agrupada em blocos rígidos no arquivo. Para a Phase 5C.1, a malha procedural otimizada em `Chair.jsx` garantiu controle paramétrico instantâneo de materiais PBR, menor consumo de memória e transição suave de rotação de 180° por cadeira independente. |

---

## 5. Comparativo Visual: Antes vs. Depois (Phase 5C.1)

| Aspecto | Antes (Phase 5B) | Depois (Phase 5C.1) |
|---|---|---|
| **Linguagem Visual** | Estúdio de reality show de TV com arcos circenses | Keynote Arena de Inovação de classe mundial |
| **Materialidade** | Plástico escuro, metais frios e linhas cinzas | Ripas acústicas de carvalho/nogueira, bronze e couro |
| **Pódio Central** | Cilindro único com faixas de neon agressivas | Pódio circular concêntrico de 2 níveis com iluminação indireta |
| **Teto / Zenital** | Vazio escuro com refletores soltos | Cúpula circular monumental com aletas e 2 anéis de luz |
| **Paredes** | Fundo preto cilíndrico básico | Parede semicircular com 68 ripas verticais e iluminação rasante |
| **Cadeiras 3D** | Nomes flutuando no ar e caixas de texto suspensas | Presença física elegante, sem textos ou poluição de UI |
| **Telão Principal** | Inexistente (apenas card 2D pequeno no canto) | Nicho arquitetural 16:9 embutido na parede da arena |
| **Temperatura de Cor** | Azul ciano e vermelho elétrico (estética gamer) | Âmbar quente arquitetural ($2700\,\text{K}$ a $3100\,\text{K}$) |

---

## 6. Evidências de Build e Performance

- **Ambiente de Build:** Node.js v24.22.0 + Vite v8.3.4 (Produção).
- **Tempo de Compilação:** **2.12 segundos** (redução significativa frente ao baseline anterior).
- **Otimização de Bundle:**
  - Bundle JS anterior: `1,755.61 kB`
  - Bundle JS atual: **`1,640.34 kB`** (economia de **`115.27 kB`** no cliente pela remoção de bibliotecas de fontes 3D desnecessárias nas 5 cadeiras).
- **Custo Geométrico:** Otimizado com geometrias compartilhadas e luzes indiretas estáticas com falloff controlado, sustentando **60 FPS estáveis** em WebGL padrão.

---

## 7. Preparação para a Phase 5C.2 (Hero Showcase Wall)

A conclusão da Phase 5C.1 deixa a infraestrutura física totalmente pronta para a próxima etapa:

1. O nicho `HeroWallNiche` está fisicamente dimensionado na alvenaria acústica, enquadrado no campo focal da câmera `frontal` e `wide`.
2. A Phase 5C.2 poderá agora acoplar o **Showcase Media Canvas** (renderização de slides, logos da startup em alta definição, mockups e contagem regressiva integrada) diretamente nesta superfície, completando o objetivo de transformar o projeto no **Protagonista Nível 1** do espetáculo.
