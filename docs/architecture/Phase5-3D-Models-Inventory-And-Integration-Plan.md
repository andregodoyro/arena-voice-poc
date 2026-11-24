# Inventário de Ativos 3D e Plano de Integração Progressiva
## Fase 5 — Live Show Experience & Immersive Stage

> **Projeto:** Arena Voice / Arena de Inovação  
> **Status:** 📋 PLANEJADO PARA INTEGRAÇÃO GRADUAL (Milestones 5B a 5E)  
> **Referência Arquitetural:** ADR-026  
> **Data:** 16 de Novembro de 2026  

---

## 1. Visão Geral

Atualmente, a cena cênica do telão (`/stage`) utiliza primitivas geométricas procedurais do Three.js (`cylinderGeometry`, `boxGeometry`, `torusGeometry`). 

Para transformar o ambiente em um espetáculo televisivo de padrão internacional (formato "The Voice"), este documento estabelece o **inventário técnico e o plano de transição gradual para modelos 3D profissionais (GLTF/GLB)** otimizados para WebGL e React Three Fiber.

---

## 2. Inventário Técnico dos Modelos 3D Planejados

| Ativo / Modelo | Formato & Compressão | Orçamento Poligonal | Texturas & Mapas | Estrutura de Nós / Hierarquia | Animações Embutidas | Uso Recomendado | Marco de Entrada |
|---|:---:|:---:|---|---|:---:|---|:---:|
| **`evaluator_chair_v2.glb`** | GLB (Draco / Meshopt) | ~12.500 tris | PBR 2K (Albedo, Roughness, Metalness, Normal, Emissive) | `Base_Pedestal` (estático), `Seat_Pivot` (rotativo Y), `Button_Console` (emissivo) | Nenhuma (rotação física orientada por GSAP a 180°) | Substituição da cadeira procedural atual por poltrona fotorrealista com botão central luminoso. | **5B** (Sincronismo com Som) |
| **`stage_scenery_rig.glb`** | GLB (Draco) | ~28.000 tris | PBR 2K (Metal escovado, treliças pretas, emissivo) | `Truss_Roof`, `LED_Backdrop_Frame`, `Curved_Panel_Screen` | Nenhuma (estático de teto e fundo) | Estrutura cenográfica de auditório, pórticos aéreos metálicos e moldura do telão curvo de fundo. | **5C** (Visual FX & Atmosfera) |
| **`robotic_moving_head.glb`** | GLB (Draco) | ~6.800 tris | PBR 1K (Plástico industrial preto, lente de vidro) | `Base_Mount`, `Yoke_Pan` (rotação X), `Head_Tilt` (inclinação Z), `Light_Cone_Target` | Controlada via código (GSAP/useFrame) | Refletores robóticos de iluminação móvel cujos feixes varrem a arena durante a apresentação e celebram em 5/5. | **5C** (Visual FX & Atmosfera) |
| **`stage_pitch_podium.glb`** | GLB (Draco) | ~8.400 tris | PBR 2K (Acrílico preto, anel emissivo, metal) | `Podium_Body`, `Reticle_Floor`, `Aura_Ring_PBR` | Nenhuma (pulso emissivo por shader) | Pódio central onde o empreendedor apresenta o pitch, com iluminação de chão reativa ao branding. | **5C** (Visual FX & Atmosfera) |
| **`cinematic_rig_markers.glb`** | GLB | ~1.200 tris | Wireframe / Invisível em runtime | `Cam_Wide`, `Cam_Stage`, `Cam_Jury`, `Cam_Hero`, `Cam_Podium` | Nenhuma | Marcadores de posicionamento espacial 3D para direcionar a câmera cinematográfica em cada modo. | **5D** (Câmeras Cinematográficas) |
| **`trophy_grand_prix.glb`** | GLB (Draco) | ~14.000 tris | PBR Ouro/Vidro (Transmission, Roughness 0.1, Metalness 0.95) | `Pedestal_Marble`, `Trophy_Body`, `Emblem_Glow` | Rotação orbital suave em `useFrame` | Troféu da premiação oficial revelado durante a celebração máxima de 5/5 e utilizado na Fase 6. | **5E / Fase 6** (Premiação) |
| **`audience_silhouette_instanced.glb`** | GLB (Draco) | ~800 tris (instanciado) | Matriz simplificada (Diffuse escuro) | InstancedMesh x 120 posições no auditório | Variação procedural de sutil respiração | Plateia em silhueta para criar sensação de casa cheia no auditório sem onerar draw calls. | **5E / Fase 7** (Ensaio & Show) |

---

## 3. Diretrizes de Otimização e Performance Gráfica

Para garantir a meta inegociável de **60 FPS estáveis** em qualquer navegador com resolução Full HD (1080p) e 4K:

1. **Compressão Draco & KTX2:**
   - Todos os arquivos `.glb` devem ser processados via `gltf-pipeline` ou `glTF-Transform` com compressão Draco de malha e texturas KTX2/Basis Universal para VRAM reduzida.
2. **Pré-Carregamento em Memória (`useGLTF.preload`):**
   - No bootstrap do `StagePage.jsx`, os modelos do ciclo corrente devem ser pré-carregados para evitar *hiccups* ou telas brancas no primeiro acionamento.
3. **InstancedMesh para Elementos Repetidos:**
   - Cadeiras (5 instâncias com uniformes de cores distintos), refletores e plateia devem compartilhar geometrias e buffers através de instanciamento GPU.
4. **Orçamento Global da Cena 3D:**
   - **Polígonos totais da cena:** Máximo de 150.000 triângulos.
   - **Draw calls:** Menos de 60 por quadro renderizado.
   - **Texturas:** Máximo de 2048x2048 para elementos de primeiro plano e 1024x1024 para cenografia secundária.

---

## 4. Plano de Aproveitamento Progressivo por Marco

### No Milestone 5B: Cadeira Fotorrealista (`evaluator_chair_v2.glb`)
- Substitui a composição de cilindros atual em `Chair.jsx`.
- Conecta o nó `Seat_Pivot` à interpolação de rotação de 180° via GSAP.
- Vincula o nó `Button_Console` ao material emissivo ativado na virada, sincronizado com o som de catraca mecânica (`whoosh`).

### No Milestone 5C: Cenografia, Pódio e Refletores
- Insere `stage_scenery_rig.glb`, `stage_pitch_podium.glb` e `robotic_moving_head.glb`.
- Aplica material reflexivo de estúdio no piso (`MeshReflectorMaterial`).
- Conecta os feixes dos refletores robóticos ao estado de celebração da Unanimidade (5/5).

### No Milestone 5D: Rigs de Câmera Cinematográfica
- Utiliza os marcadores de `cinematic_rig_markers.glb` para definir os alvos vetoriais e de FOV para as transições de câmera dirigidas por estado (*Modo Espera*, *Modo Pitch*, *Modo Votação*, *Modo Vitória*).

### No Milestone 5E: Troféu e Controle de Direção
- Carrega `trophy_grand_prix.glb` para demonstração visual no painel do operador e acionamento no modo celebração.
