# ARENA VOICE — GUIA OPERACIONAL
## Operação de Mídia e Controle de Apresentação ao Vivo no Cockpit

**Destinatários:** Operadores de Mesa Técnica, Diretores de Palco e Equipe de Transmissão  
**Versão:** 1.0 (Phase 5C Consolidada)  
**Data:** Novembro de 2026  

---

## 1. Visão Geral da Operação

O **Hero Showcase Wall** é o telão monumental central da Arena Voice. O operador da mesa técnica controla a exibição de mídias, vídeos, áudio e transições diretamente pela aba **Cockpit** (`/operator/cockpit`), sem necessidade de abrir abas técnicas ou alternar entre softwares auxiliares.

---

## 2. Preparação Pré-Evento (Setup de Mídia)

Antes de iniciar a sessão, todas as mídias das startups devem estar cadastradas e verificadas:

1. **Acessar a Aba de Projetos (`/operator/projects`):**
   - Para cada projeto participante, clique em **Editar** (ou adicione um novo).
2. **Carregar os Ativos de Mídia:**
   - **Logotipo do Projeto:** Formato PNG/SVG com fundo transparente recomendado ($80 \times 80\text{px}$ a $512 \times 512\text{px}$).
   - **Imagem de Capa (Hero Banner):** Formato 16:9 widescreen em alta definição ($1920 \times 1080\text{px}$ ou superior, JPG/PNG/WebP, máx. 20MB).
   - **Vídeo de Demonstração (Pitch Video):** Vídeo MP4 (H.264/AAC) em 1080p ou URL estática servida em `/samples/*` ou `/uploads/*`.
3. **Validar a Persistência:**
   - Ao salvar, os dados são gravados no PostgreSQL.
   - Selecione o projeto no palco (`Promover para o Palco`) e confirme no telão (`/stage`) se o billboard e a imagem de capa carregam perfeitamente.

---

## 3. Dinâmica de Apresentação Durante o Evento

A apresentação de cada startup transiciona através de 5 momentos narrativos automáticos refletidos no telão:

```
[1. Waiting] ────────► [2. PitchRunning] ────────► [3. Voting] ────────► [4. Result]
 (Capa sem som)       (Vídeo com som ativo)       (Capa sem som)       (Capa + Celebração)
```

### 3.1. Aguardando o Orador (`Waiting`)
- O telão exibe a imagem de capa e a identidade do projeto.
- O canal de áudio permanece silencioso.
- Os controles de transporte de vídeo no Cockpit ficam desabilitados.

### 3.2. Pitch ao Vivo (`PitchRunning`)
- Ao clicar em **"Iniciar Pitch"** no cronômetro do Cockpit:
  - O telão inicia a reprodução do vídeo instantaneamente.
  - O áudio é aberto automaticamente no volume configurado (padrão: **70%**).
  - A barra de telemetria do Cockpit passa para: `● Reproduzindo com Áudio`.

### 3.3. Controles em Tempo Real Disponíveis para o Operador
Durante o pitch, o operador dispõe dos seguintes comandos no componente de controle:
- **Play / Pause:** Para pausar o vídeo caso o apresentador interrompa a fala para uma explicação oral.
- **Reiniciar (Restart):** Retorna o vídeo para o início (`00:00`) com 1 clique caso haja recomeço de apresentação.
- **Pulos Rápidos:**
  - Botão **-10s**: Retrocede 10 segundos caso a banca peça para rever um trecho ou slide.
  - Botão **+10s**: Avança 10 segundos para pular introduções longas.
- **Timeline Slider (Scrubbing):** Permite arrastar o ponteiro diretamente para qualquer instante do vídeo.
- **Controle de Volume:**
  - Slider contínuo de 0% a 100%.
  - Botão de **Mudo Rápido** (ícone de alto-falante) para silenciamento emergencial instantâneo.

### 3.4. Transição para Votação (`VotingOpen` / `VotingClosed`)
- Ao abrir votos ou encerrar o tempo do pitch:
  - O telão transiciona imediatamente para a imagem estática de capa do projeto;
  - O áudio do vídeo é cortado de forma imediata e elegante, permitindo que a plateia ouça a arguição dos jurados e a rotação das cadeiras.

### 3.5. Resultado e Celebração (`Result`)
- Ao concluir a rodada em `Finished`:
  - O telão exibe a capa do projeto banhada por iluminação cênica festiva em caso de aprovação.

---

## 4. Resolução de Problemas Comuns (Troubleshooting)

### A. O vídeo começou a tocar mas está sem áudio
- **Causa provável:** O navegador do telão bloqueou o autoplay com som por ausência de interação humana prévia.
- **Sintoma no Cockpit:** O badge exibirá `● Reproduzindo (Mudo)` e um botão destacado aparecerá: **"Ativar Áudio"**.
- **Solução 1 (Remota via Cockpit):** Clique no botão **"Ativar Áudio"** no Cockpit (dispara o comando `UNMUTE` via broadcast).
- **Solução 2 (Direta no Telão):** Certifique-se de que, ao abrir a tela `/stage` no início do dia, o operador tenha clicado uma vez em qualquer ponto do banner `AudioUnlockOverlay` para conceder permissão de áudio permanente à janela.

### B. O projeto não possui vídeo cadastrado
- **Comportamento do Sistema:** A Arena Voice ativa o *fallback determinístico* automaticamente.
- O telão exibirá a imagem de capa em formato panorâmico com gradiente de alta definição, e o badge do Cockpit indicará `● Imagem Estática`. A operação pode prosseguir normalmente sem qualquer erro ou tela preta.

### C. Vídeo travado ou fora de sincronia
- Clique em **Pause** e em seguida em **Play**.
- Se necessário, clique em **Reiniciar** ou arraste a timeline para restabelecer a reprodução.
