# Fase 5D.1 — Curadoria de Assets & Sound Map

Documento técnico da subfase **5D.1**, registrando os assets selecionados de `C:\Users\ANDREROC\Documents\sfx` (originais preservados intactos), o catálogo estruturado ([soundCatalog.js](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/frontend/src/audio/soundCatalog.js)) e o mapeamento de eventos ([soundMap.js](file:///c:/Users/ANDREROC/Documents/arena-voice-poc/frontend/src/audio/soundMap.js)).

---

## 1. Estrutura de Diretórios Criada (`frontend/public/audio/`)

- `ui/`: `ui-hover-tick.mp3`, `ui-sci-fi-click.mp3`, `ui-error-pop.mp3`
- `stage/`: `chair-bass-whoosh.mp3`, `transition-dreamy.mp3`, `braam-impact-dark.mp3`, `ability-sci-fi-shift.mp3`
- `music/`: `idle-keep-moving.mp3`, `voting-tension-loop.mp3`
- `celebration/`: `victory-fanfare.mp3`, `applause-stage.mp3`, `crowd-cheer.mp3`

## 2. Assets Descartados (Mantidos apenas na pasta de origem)

| Arquivo Original | Motivo do Descarte |
| :--- | :--- |
| `gr0za-christmas-christmas-logo-638446.mp3` | Tema natalino incompatível com estética tecnológica/competitiva. |
| `mfcc-brazil-carnival-samba-music-632957.mp3` | Tema de carnaval incompatível com identidade da Arena Voice. |
| `u_l5xum8z250-losing-horn-313723.mp3` | Trombeta cômica/infantil; substituída por `ui-error-pop.mp3` / `braam-impact-dark.mp3`. |
| `freesound_community-buzzer-of-car-wash-107990.mp3` | Buzzer industrial áspero (160 kbps); substituído por `braam-impact-dark.mp3` no encerramento de votação. |

## 3. Lacunas Mapeadas para Downloads Futuros (Pixabay)

- `pitch.ambience`: **SEM ASSET** — buscar `subtle dark tech ambient pad loop` (não competir com a voz do apresentador).
- `voting.countdown_tick`: **SEM ASSET EXTERNO** — preservado o ticker sincopado procedural de `SoundSynthesizer.js`; opcionalmente buscar `digital countdown clock tick sci fi`.
- `chair.turn` *(camada mecânica complementar)*: buscar `futuristic hydraulic servo mechanical whoosh`.
- `gamification.ability_special` *(alternativa caso `ability-sci-fi-shift.mp3` soe caricato na 5D.6)*: buscar `sci fi energy shield power up`.

## 4. Preparação para Expansão (5D.2 e 5D.3)

- `AudioEngine.js` e `SoundSynthesizer.js` permanecem **100% preservados** nesta etapa (nenhum disparo alterado).
- `SOUND_CATALOG` já segue o modelo de metadados (`id`, `category`, `bus`, `url`, `defaultVolume`, `isLoop`, `offsetSeconds`, `clipDurationSeconds`, `packName`, `isBuiltIn`) pronto para migração à tabela `sound_library` na **5D.3**.
