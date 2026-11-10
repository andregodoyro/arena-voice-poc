# ADR-017: Platform Reliability & Live Show over Premature Feature Expansion (Priorização de Confiabilidade e Espetáculo Cênico sobre Expansão Funcional Prematura)

## Status
Aceito (Roadmap V2 — Planejamento Estratégico e Linha Evolutiva)

## Contexto
Após a conclusão bem-sucedida da Fase 3 (com os marcos 3A a 3E entregues e homologados), surgiu no planejamento preliminar a proposta de abrir imediatamente a "Fase 4: Evaluator Scorecards & Mobile Portal", cujo escopo previa o desenvolvimento de um aplicativo web responsivo para que jurados preenchessem notas quantitativas e rubricas por critérios em seus smartphones pessoais.

Ao submeter essa proposta a uma **auditoria de viabilidade operacional em eventos presenciais reais** (Demo Days corporativos, convenções e hackathons), identificou-se um desalinhamento estratégico crítico:
1. **Distorção da Essência de Palco:** O Arena Voice foi concebido para recriar a dinâmica emocional, dramática e televisiva de formatos como *The Voice* e *Shark Tank*. O centro da experiência é o **botão físico arcade na bancada, a rotação cinematográfica de 180° da cadeira no telão 3D e a iluminação pulsante**. Forçar jurados a baixar a cabeça para preencher formulários de 10 perguntas em telas de celular quebra a atmosfera cênica e transforma um espetáculo corporativo em uma sessão burocrática de preenchimento de planilhas.
2. **Atrito Técnico e Infraestrutura Frágil:** Distribuir um web app móvel no dia do evento introduz pontos de falha severos fora do controle da mesa técnica (celulares de jurados sem bateria, incompatibilidade de navegadores móveis, saturação da rede Wi-Fi local de 2.4 GHz, necessidade de telas de login e suporte técnico presencial aos avaliadores).
3. **Fragilidade Existencial da Plataforma (Gap de Confiabilidade):** Enquanto se cogitava criar novas telas móveis, o servidor continuava operando com **estado 100% volátil em memória RAM**, o telão 3D continuava **completamente mudo (sem efeitos sonoros)** e a mesa técnica **não tinha como exportar uma ata em PDF/CSV ao final do evento**.

A liderança técnica e de produto precisava formalizar se o projeto deveria expandir sua superfície para dispositivos móveis ou priorizar a blindagem operacional e a excelência cênica de palco.

## Problema
Qual deve ser a ordem de prioridades evolutivas da Arena Voice para maximizar o sucesso, a segurança e o impacto emocional de eventos corporativos presenciais reais?
- Devemos expandir o escopo para avaliação quantitativa via smartphones de jurados?
- Ou devemos priorizar formalmente a sobrevivência contra falhas (persistência), o espetáculo audiovisual (áudio) e a consolidação de resultados (ranking e ata executiva)?

## Decisão
Estabelece-se a diretriz estratégica **"Show-Ready & Production-Ready First"**:
1. **Rejeição de Scorecards como Pré-Requisito de Operação:**
   - A avaliação quantitativa com notas por critério em smartphone **NÃO é um requisito obrigatório** para a operação da Arena Voice.
   - O acionamento do botão físico (`ChairTurned`) e o veredito computado pelo Result Engine (`Approved` / `Rejected`) continuam sendo a **decisão primária, canônica e soberana** do produto (conforme já estabelecido no ADR-015).
2. **Repriorização Sequencial do Roadmap V2:**
   - A linha evolutiva oficial passa a priorizar estritamente a **segurança de dados, o espetáculo e a apuração**:
     - **Fase 4:** Platform Reliability & Data Resilience (Persistência SQLite, Crash Recovery, Trilha de Auditoria e Backups a Quente).
     - **Fase 5:** Live Show Experience & Audio Atmosphere (Áudio cênico no telão via Web Audio API, efeitos sonoros de rotação, buzzer, gongo de tempo e fanfarra 5/5).
     - **Fase 6:** Awards Ceremony, Ranking & Executive Reports (Motor de ranking por critérios de desempate, pódio cênico no telão 3D e emissão imediata da ata da banca em PDF e CSV).
     - **Fase 7:** Operational Hardening & Fleet Telemetry (Cockpit de contingência com bypass de cadeira em 1 clique, telemetria das 5 cadeiras ESP32 e runbook de ensaio técnico).
3. **Reclassificação do Módulo de Scorecards:**
   - A funcionalidade de Scorecards e Portal do Jurado é deslocada para a **Fase 8**, como um **módulo satélite e complementar**. Ela será ativada exclusivamente em edições específicas onde organizadores de bancas puramente acadêmicas ou comitês de compliance exijam dossiês numéricos individuais.

## Consequências

### Positivas
- **Foco Absoluto no Sucesso do Evento Real:** A mesa técnica ganha segurança contra quedas de energia (Fase 4), o público ganha um espetáculo com áudio imersivo (Fase 5) e os patrocinadores recebem a ata classificada ao final do evento (Fase 6).
- **Zero Atrito de Conectividade com Jurados:** Não há necessidade de conectar smartphones de terceiros à rede local da arena; a operação permanece 100% autossuficiente com o notebook do operador, o telão e os botões físicos.
- **Redução Drástica de Risco de Produção:** Evita a dispersão da equipe de desenvolvimento em dezenas de componentes de UI mobile antes de consolidar a estabilidade do servidor central.
- **Respeito à Persona Cênica da Plataforma:** O jurado atua como uma autoridade de palco (focado no pitch), e não como um digitador de formulários em tela pequena.

### Negativas / Desafios
- Eventos que demandem pontuações fracionárias (ex: "Nota 8.75 em Escalabilidade") não contarão com formulário digital nativo até a Fase 8. *Mitigação:* A decisão binária de apoio da cadeira já seleciona e classifica as melhores startups com precisão e muito mais agilidade.

## Alternativas Consideradas

| Alternativa | Motivo da Rejeição |
| :--- | :--- |
| **Implementar Scorecards na Fase 4 (Plano Provisório)** | Desvio prematuro. Adicionaria semanas de desenvolvimento em formulários mobile enquanto o backend continuava em memória volátil e o telão permanecia sem áudio. |
| **Desenvolver Persistência, Áudio e Scorecards em Paralelo** | Explosão de escopo e perda de foco. Aumentaria exponencialmente o blast radius de bugs antes de validar a resiliência básica de dados. |
| **Substituir o Botão Físico por Votação em Smartphone** | Destruição da proposta de valor do Arena Voice. A emoção do botão físico e o giro da cadeira 3D são o diferencial competitivo do produto. |

## Motivos da Escolha
- Em eventos de inovação de missão crítica ao vivo, **a estabilidade da infraestrutura e o impacto sensorial do espetáculo superam qualquer funcionalidade secundária de tela**.
- Blindar a resiliência de dados (Zero Data Loss) e dotar o telão de som cinematográfico coloca a Arena Voice em condições imediatas de operar eventos corporativos de grande porte com tranquilidade profissional.

## Impacto Futuro
- **Fase 4:** Executa a blindagem de dados com SQLite, reidratação e backups.
- **Fase 5:** Implementa o motor de áudio cênico no telão público.
- **Fase 6:** Conclui a jornada do evento com a tela de premiação e emissão de atas.
- **Fase 8:** Quando implementados, os scorecards serão uma camada complementar que enriquecerá a ata executiva sem interferir no fluxo canônico do botão físico.
