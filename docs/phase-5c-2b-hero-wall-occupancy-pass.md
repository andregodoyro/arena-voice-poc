# ARENA VOICE — RELATÓRIO TÉCNICO DE ENGENHARIA E DESIGN VISUAL
## Phase 5C.2B: Hero Wall Occupancy Pass (O Palco Existe para Valorizar o Projeto)

**Projeto:** Arena Voice / Arena de Inovação  
**Marco:** Phase 5C.2B — Hero Wall Occupancy Pass  
**Status:** ✅ **Concluído, Validado em Build e Testes de Regressão Automatizados**  
**Data:** 23 de Novembro de 2026  

---

## 1. Visão de Produto & Princípio Fundamental

> *"O palco existe para valorizar o projeto. O projeto não existe para valorizar o palco.*  
> *O Hero Showcase Wall é a principal superfície narrativa da Arena Voice e deve comunicar visualmente a identidade, proposta e presença do projeto apresentado."*

A **Phase 5C.2B** resolveu de forma definitiva o problema de ocupação visual da arena. Anteriormente, o telão 3D encontrava-se confinado na parede lateral esquerda (ocupando área restrita e descentralizada), enquanto o fundo do palco apresentava um grande vazio de ripas escuras e a informação principal ficava dependente do card flutuante `StageProjectBanner`.

Com este passe, a hierarquia de percepção do usuário foi invertida com sucesso:
1. **Projeto (Visual, Mockup e Presença)**
2. **Hero Showcase Wall Panorâmico**
3. **Arena Arquitetural (Cúpula zenital, ripas de emolduramento e palco circular)**
4. **Cadeiras de Jurados em Segundo Plano**
5. **Informações Operacionais e HUD Discreto**

---

## 2. Transformações Arquiteturais na Cena 3D

### 2.1. LED Wall Panorâmico Unificado de Grande Escala
- **Posicionamento Cênico:** Centralizado diretamente atrás do palco circular escalonado em `position={[0, 6.6, -20.6]}`.
- **Envergadura Física:**
  - Largura: **$33.6\,\text{m}$**
  - Altura: **$11.6\,\text{m}$**
  - Proporção: **$2.9:1$ (Ultra-Wide Panoramic LED Wall)**
  - Resolução Virtual HTML: **$2560 \times 880\,\text{px}$**
- **Ocupação Visual:** Ocupa entre **$75\%$ e $85\%$ do campo de visão da parede de fundo**, integrando-se da base do pódio circular central até a cúpula acústica zenital.
- **Estrutura Arquitetural Física:**
  - *Shadow Box* monumental em nogueira nobre e ébano fosco;
  - Vigas superior e inferior chanfradas em bronze arquitetural escovado;
  - Pilastras de transição lateral ($X = \pm 16.9\,\text{m}$) que conectam o telão às alas de ripas de madeira;
  - Fitas luminosas perimetrais (*Cove Halos*) com transições reativas via GSAP sincronizadas com os estágios do pitch (*PitchRunning*, *Urgent 15s*, *VotingOpen*, *Unanimous*);
  - Efeito sutil de curvatura côncava física (*Curved LED illusion*) e micro-matriz de pixels.

### 2.2. Enquadramento Simétrico da Câmera Institucional
- Atualização em `StudioCanvas.jsx`:
  - `position: [0, 4.6, 17.5]`
  - `target: [0, 3.2, -3.2]`
  - `fov: 48`
- O enquadramento frontal posiciona as 5 cadeiras de jurados no primeiro plano inferior, o pódio circular de oratória no plano médio e o Hero Showcase Wall dominando a totalidade do plano de fundo.

### 2.3. Emolduramento pelas Ripas Acústicas Laterais
- Atualização em `StudioScene.jsx` (`AcousticTimberWalls`):
  - As ripas verticais de nogueira foram redistribuídas exclusivamente para as **alas laterais de emolduramento** (Ala Esquerda: $0.58\pi \to 0.74\pi$; Ala Direita: $1.26\pi \to 1.42\pi$), deixando o vão central de $31.4\,\text{m}$ desobstruído para o telão;
  - Adição de escadarias arquiteturais laterais com iluminação linear de balizamento (*Step Cove Lights*).

---

## 3. Comportamento Dinâmico do Hero Showcase Wall

| Cenário | Regra de Renderização | Comportamento Visual no Telão |
|---|---|---|
| **Cenário 1: Projeto com Imagem Principal** | `coverImageUrl` ou imagem heroica cadastrada | Imagem preenche 100% do painel com gradiente cinematográfico lateral. Lado esquerdo: Logo em vidro fosco, Título Monumental $7\text{xl}$, Slogan, Apresentador e 3 Chips de Pilares Estratégicos. Lado direito: Mockup de smartphone e interface em operação no próprio cenário. |
| **Cenário 2: Múltiplas Mídias / Galeria** | `mediaItems` ou galeria com 2+ imagens | Slideshow automático com crossfade suave a cada 7 segundos, indicadores minimalistas de slide e transição cinematográfica. |
| **Cenário 3: Projeto sem Mídias** | Nenhuma imagem cadastrada | Composição executiva generativa monumental em tela cheia com mesh gradient de cores da marca, monograma/logo de alta escala, título 7xl, tese completa, pilares estratégicos e card gráfico holográfico com radar e medalha de inovação. |
| **Cenário 4: Palco em Espera / Intervalo** | `!currentProject` | Billboard institucional monumental da Arena Voice com título do evento em $8\text{xl}$, tagline, logotipo com frosted glow e status operacional da bancada. |

> **Garantia Absoluta:** O Hero Wall permanece **100% preenchido e visualmente impecável em todos os cenários**, banindo telas pretas, vazios ou mensagens de erro.

---

## 4. Gestão de Mídia & Suporte a Uploads pelo Operador

### 4.1. Endpoint de Upload no Backend C#
- Adicionado `POST /api/upload`:
  - Validação estrita de extensões: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`;
  - Limite seguro de tamanho: até $20\,\text{MB}$;
  - Armazenamento em `/uploads/{safeGuid}{ext}`;
  - Configuração de `UseStaticFiles` servindo `/uploads/*`;
  - Espelhamento automático para `frontend/public/uploads` para disponibilidade imediata no ambiente Vite.

### 4.2. Preparação do Modelo Futuro (`ProjectMedia`)
- Estrutura de dados estendida em C# e TypeScript:
  ```typescript
  interface ProjectMediaItem {
    id: string;
    type: "image" | "video";
    url: string;
    order: number;
  }

  interface ProjectMedia {
    logoUrl: string;
    coverImageUrl: string;
    items: ProjectMediaItem[];
  }
  ```
- EF Core configurado com `m.Ignore(x => x.Items)` para compatibilidade retroativa e sem migrações bloqueantes.

### 4.3. Interface de Upload no `ProjectModal.jsx`
- Upload com drag & drop e seletor de arquivos para **Logotipo do Projeto**;
- Upload com preview panorâmico para **Imagem de Capa / Hero Banner**;
- Seção de **Galeria de Mockups / Screenshots** com adição de múltiplos arquivos, thumbnails em grid e remoção individual;
- Fallback offline-first resiliente via FileReader DataURL.

---

## 5. Desconstrução do `StageProjectBanner` (Componente Legado)

- Conforme especificação da Phase 5C.2B, o `StageProjectBanner` deixou de ser a fonte primária de informações;
- Reduzido a um **mini-badge discreto e semitransparente** no rodapé lateral esquerdo (`max-w-xs`), desobstruindo totalmente a visualização do palco 3D, dos jurados e do telão;
- Oficialmente anotado com `@deprecated` e preparado para remoção completa no marco Phase 5C.4.

---

## 6. Evidências de Validação e Testes Automatizados

1. **Compilação do Frontend:**
   ```text
   > vite build
   ✓ 2561 modules transformed.
   dist/index.html                     0.65 kB
   dist/assets/index-DfHuRpLh.css     93.81 kB
   dist/assets/index-DIuB6ngO.js   1,673.53 kB
   ✓ built in 4.56s
   ```

2. **Compilação do Backend C#:**
   ```text
   ArenaVoicePocBackend -> ArenaVoicePocBackend.dll
   Compilação com êxito. 0 Aviso(s), 0 Erro(s).
   ```

3. **Suíte Especializada de Testes de Upload e Mídia (`test-hero-wall-uploads.cjs`):**
   - Validação de rejeição de formato `.exe` (HTTP 400): **PASS**
   - Validação de upload de imagem `.png` (HTTP 200 com URL `/uploads/*`): **PASS**
   - Download de arquivo estático servido pelo backend: **PASS**
   - Persistência e recuperação de `ProjectMedia.Items` via `POST /api/projects`: **PASS**
   - Atualização de itens de galeria via `PUT /api/projects/{id}`: **PASS**
   - **Resultado:** 12/12 testes aprovados.

4. **Regressão Geral do Sistema (`run-regression-suite.cjs`):**
   - 684 testes aprovados em 14 suítes automatizadas.
