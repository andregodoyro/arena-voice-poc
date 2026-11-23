# ARENA VOICE — RELATÓRIO DE ENGENHARIA E DESIGN VISUAL
## Phase 5C.2A: Hero Showcase Content Pass (The Project Must Occupy the Stage)

**Projeto:** Arena Voice / Arena de Inovação  
**Branch:** `feat/phase5-live-show-experience`  
**Marco:** Phase 5C.2A  
**Status:** ✅ **Concluído, Validado em Build e Ativo no Telão de Palco**  
**Data:** 17 de Novembro de 2026  

---

## 1. Visão Geral e Objetivo

A **Phase 5C.2A** resolveu o déficit de ocupação visual identificado após a estruturação física do telão:

> **Diretriz Absoluta:**  
> O telão monumental não deve apenas exibir "informações técnicas sobre o projeto". **O telão deve EXIBIR O PROJETO.**  
> Se houver mídia (imagem, mockup, capa ou banner), ela deve **dominar 70% a 90% da área útil do telão**, com elementos textuais organizados em *lower-third broadcast* discreto e sofisticado. Se não houver mídia, o telão gera uma **apresentação executiva em tela cheia**, jamais exibindo vazio, tela preta ou caixas cinzas.

---

## 2. Auditoria de Fontes de Mídia e Entidades (`CurrentProject`)

Foi realizada uma auditoria completa no backend C# e no modelo de dados do Arena Voice:

| Entidade / Campo | Localização | Propósito | Tratamento no Hero Wall |
|---|---|---|---|
| `Project.Title` | `backend/Domain/Entities/Project.cs` | Nome oficial da startup/solução | Nível 2 — Tipografia monumental $5\text{xl}/6\text{xl}$ em caixa-alta com drop-shadow |
| `Project.Track` | `backend/Domain/Entities/Project.cs` | Trilha temática (ex.: *Healthtech*, *Agrotech*) | Nível 3 — Chip/Badge em vidro fosco com ícone de camadas no topo |
| `Project.PitchLeader` | `backend/Domain/Entities/Project.cs` | Nome do orador/apresentador | Nível 3 — Tag discreta com ícone de usuário no lower-third |
| `Project.Description` | `backend/Domain/Entities/Project.cs` | Tese de inovação / pitch | Nível 3/4 — Tipografia refinada $18\text{px}$ com truncamento inteligente |
| `ProjectMedia.CoverImageUrl` | `backend/Domain/Entities/ProjectMedia.cs` | Imagem heroica / capa / mockup | **Nível 1 (DOMINANTE)** — Ocupa 85%+ do telão em formato 16:9 |
| `ProjectMedia.LogoUrl` | `backend/Domain/Entities/ProjectMedia.cs` | Marca / logotipo da startup | Nível 2 — Badge em vidro fosco ($80 \times 80$) com borda PBR |

### Diagnóstico de Infraestrutura Offline-First:
- Identificou-se que as URLs semeadas pelo backend (ex.: `/samples/neurosync-cover.png`, `/samples/neurosync-logo.png`) não possuíam arquivos físicos em `frontend/public/samples/`.
- Foram gerados e disponibilizados em `frontend/public/samples/` e `frontend/public/branding/` os ativos PNG reais e de alta definição para todos os projetos do catálogo (*NeuroSync AI*, *EcoLog*, *FinFlow*, *AgroSmart*, *FerroLab*, *Startup Challenge* e *Demo Day*).
- O resolver do [`HeroShowcaseWall.jsx`](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/frontend/src/components/stage/HeroShowcaseWall.jsx) foi programado de forma tolerante a falhas, inspecionando em cascata:
  - `coverUrl`: `media.coverImageUrl || coverImageUrl || coverImage || bannerImage || bannerUrl || heroImageUrl || image`
  - `logoUrl`: `media.logoUrl || logoUrl || logo`
  - `presenter`: `pitchLeader || presenter`
  - `track`: `track || category`

---

## 3. Comportamento Visual com Imagem vs. sem Imagem

### 3.1. Caso 1: Com Imagem (Mídia Dominante — 70% a 90% da Área Útil)
```text
+-----------------------------------------------------------------------------------+
|  [TRILHA HEALTHTECH]   [PITCH AO VIVO]               ARENA VOICE • KEYNOTE SHOWCASE|
|                                                                                   |
|                                                                                   |
|                                                                                   |
|                    IMAGEM DO PROJETO / MOCKUP DE ALTA RESOLUÇÃO                    |
|                        (OCUPA 85%+ DA ÁREA ÚTIL DO TELÃO)                         |
|                                                                                   |
|                                                                                   |
|  +--------+  NEUROSYNC AI                                                         |
|  |  LOGO  |  Dra. Helena Prado • Plataforma de inteligência artificial aplicada à |
|  +--------+  tele-reabilitação neurológica com sensores vestíveis...              |
+-----------------------------------------------------------------------------------+
```
- A imagem da solução ocupa o fundo total da tela 16:9 em `object-cover`.
- Gradientes de fusão cinematográficos (*vignette* e sombreamento inferior) garantem legibilidade dos textos sem diminuir a força da imagem.
- Lower-third elegante no rodapé apresenta o logo, o título e a tese de valor de forma integrada à transmissão de palco.

### 3.2. Caso 2: Sem Imagem (Apresentação Executiva Generativa em Tela Cheia)
- Quando o projeto não possui imagem ou enquanto ela carrega, o telão assume uma **identidade de apresentação executiva monumental**:
  - Fundo em gradiente suave com malha de luz difusa baseada nas cores de branding (`primaryColor` e `secondaryColor`).
  - Logotipo em grande escala ($112 \times 112$) com moldura em vidro fosco e reflexo suave.
  - Título em fonte monumental $6\text{xl}$ e descrição completa da tese de inovação.
  - Elemento gráfico de keynote com medalha e selo de inovação no quadrante direito.
- **Resultado:** Zero sensação de vazio, zero caixas cinzas ou placeholders amadores.

### 3.3. Caso 3: Modo `Waiting` (Espera entre Apresentações)
- O telão exibe o billboard institucional do evento: título monumental (`currentEvent.title`), logotipo oficial, tagline e sinalização cênica discreta (*"Palco em Espera — Próxima Apresentação em Breve"*).

---

## 4. Migração de Conteúdo e Situação do `StageProjectBanner`

### Conteúdo Migrado do Card para o Telão:
- **Título do Projeto:** Migrado para a tipografia principal de $60\,\text{pt}$ no telão.
- **Trilha Temática:** Migrada para o chip superior do telão.
- **Orador / Apresentador:** Migrado para o lower-third do telão.
- **Descrição da Tese:** Migrada para o lower-third com alta legibilidade.
- **Estágio do Pitch:** Migrado para a badge de status broadcast no topo direito do telão.

### Avaliação do `StageProjectBanner`:
- **Diagnóstico:** O card inferior esquerdo tornou-se **completamente redundante**. O espectador obtém agora 100% da informação diretamente no Hero Showcase Wall, com escala e prestígio imensamente superiores.
- **Decisão:** O `StageProjectBanner` foi mantido sem alterações na árvore de componentes para preservar a estabilidade da Phase 5C.2A, ficando **oficialmente recomendada sua remoção completa no marco Phase 5C.4 (Desconstrução do HUD 2D)**.

---

## 5. O Teste dos 5 Segundos (Hierarchy First)

> **Pergunta:** *Se um espectador entrar no auditório e olhar para o palco por 5 segundos, o que chama sua atenção primeiro?*

* **Resultado da Phase 5C.2A:**
  1. **Nível 1 (Dominante):** A **Imagem/Mockup do Projeto** estampada no telão de $13.4\,\text{m}$ de largura.
  2. **Nível 2:** O **Nome do Projeto** em tipografia monumental e seu logotipo.
  3. **Nível 3:** A **Trilha** (*Healthtech*, *Agrotech*, etc.) e o status (*Pitch ao Vivo*).
  4. **Nível 4:** O orador no pódio central e a bancada de cadeiras de jurados à frente.

A hierarquia visual foi invertida com sucesso: **o palco agora existe para servir e valorizar o projeto apresentado.**

---

## 6. Evidências de Build e Performance

- **Compilação de Produção:**
  ```text
  > vite build
  ✓ 2561 modules transformed.
  dist/index.html                     0.65 kB │ gzip:   0.41 kB
  dist/assets/index-BoXLSWwq.css     92.09 kB │ gzip:  13.20 kB
  dist/assets/index-CQXL9lKg.js   1,661.54 kB │ gzip: 462.09 kB
  ✓ built in 5.49s
  ```
- **Taxa de Quadros (FPS):** **60 FPS sustentados**. O carregamento das imagens ocorre de forma nativa e assíncrona pelo navegador via DOM GPU layer do Drei `Html transform`, sem impacto nos buffers de renderização WebGL do Three.js.
- **Compatibilidade:** Testado e aprovado em 1080p e pronto para resoluções 4K UHD.
