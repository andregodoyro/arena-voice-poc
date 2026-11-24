# ARENA VOICE — RELATÓRIO DE REFINAMENTO ESPACIAL E ARQUITETURAL
## Phase 5C.5 (Fase 1): Hero Wall Visual Clearance (Liberação Total do Telão)

**Projeto:** Arena Voice / Arena de Inovação  
**Branch:** `feat/phase5-live-show-experience`  
**Marco:** Phase 5C.5 — Fase 1 (Visual Clearance)  
**Status:** ✅ **Concluído e Homologado (Commit `972dc80`)**  
**Data:** 23 de Novembro de 2026  

---

## 1. Contexto e Diagnóstico

Após a centralização monumental do **Hero Showcase Wall** na Phase 5C.2B e a ativação de vídeos com áudio na Phase 5C.4A, foi realizada uma auditoria de composição visual e espacial da cena 3D.

### O Problema Identificado
Identificou-se que o componente `AmphitheaterSeating` (estrutura concêntrica de arquibancada criada originalmente na Phase 5C.1 para simular um auditório clássico) estava posicionado na linha de visão frontal entre o pódio central/cadeiras e o Hero Wall.

Na prática, a arquibancada estava:
- Cortando a terça parte inferior dos vídeos projetados no telão;
- Interceptando a leitura de lower-thirds, teses e nomes de startups;
- Quebrando a hierarquia visual primária onde o **projeto deve ser o protagonista absoluto**.

---

## 2. Decisão Arquitetural e Execução

Foi aprovada a **Opção C (Somente Fase 1)**: a remoção completa da renderização do componente `AmphitheaterSeating` em [`frontend/src/components/StudioScene.jsx`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/frontend/src/components/StudioScene.jsx).

### Hierarquia Visual Consolidada (Plano Frontal até o Fundo)

```text
[ Câmera Frontal ]
        │
        ▼
5 × Cadeiras da Banca (PBR, GSAP 180°, Primeiro Plano Z ≈ 4.2 a 6.0m)
        │
        ▼
Pódio Central Escalonado (TieredPitchStage — Orador no Centro)
        │
        ▼
[ Vão Livre Arquitetural — Assoalho Nobre Desobstruído ]
        │
        ▼
Hero Showcase Wall Panorâmico (33.6m × 11.6m — Fundo Z = -20.6m)
```

---

## 3. Benefícios e Próximos Passos (Fase 2)

- **Benefícios Imediatos:**
  - 100% da área útil do Hero Showcase Wall visível a partir da câmera principal;
  - Zero cortes em vídeos, fotos de capa ou slides das startups;
  - Limpeza composicional de alto padrão arquitetural (*Keynote Theater*).

- **Fase 2 (Plateia Lateral em Leque — Em Planejamento):**
  - A remoção da arquibancada frontal deixou a arena limpa e monumental, porém gerou uma sensação de amplitude vazia no horizonte.
  - A futura **Fase 2** prevê assentos laterais em leque (*Lateral Amphitheater Wings*), posicionados estritamente fora do cone de visão do Hero Wall, pendente de aprovação visual prévia.
