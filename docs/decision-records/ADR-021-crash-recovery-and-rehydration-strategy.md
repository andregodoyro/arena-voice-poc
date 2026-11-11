# ADR-021: Crash Recovery & Rehydration Strategy

## Status
Aceito (Homologado no Milestone 4B)

## Data
2026-11-11

## Contexto
Durante eventos corporativos ao vivo, quedas abruptas de energia, desconexões acidentais de hardware ou panes no processo do backend não podem resultar na perda do contexto operacional. Caso uma startup esteja no meio de sua apresentação com cadeiras já viradas pelos jurados, reiniciar o sistema em `Waiting` com cadeiras em zero invalidaria a dinâmica do palco e causaria constrangimento no espetáculo. Da mesma forma, retomar o pitch com cronômetro correndo automaticamente antes do operador reconectar prejudicaria o tempo da equipe.

## Decisão
Adotar a estratégia **Paused Recovery com Reidratação Atômica**:
1. **Persistência de Cadeiras Físicas:** O estado das 5 cadeiras é armazenado em coluna nativa PostgreSQL (`turned_chairs integer[]`) na tupla singleton `active_session_state`.
2. **Detecção de Sessão Interrompida:** No boot, se o estágio recuperado for ativo (`PitchRunning`, `QA`, `VotingOpen`) e `IsPaused == false`, o sistema identifica que houve uma queda abrupta.
3. **Congelamento Seguro (Paused Recovery):** O sistema não reverte para `Waiting`. Em vez disso:
   - Força `isPaused = true`;
   - Congela o cronômetro no valor válido no momento do último checkpoint persistido (`LastCheckpointAt`);
   - Grava os metadados oficiais: `RecoveredFromCrash = true`, `InterruptedStage = PitchStage`, `RecoveredAt = DateTimeOffset.UtcNow`.
4. **Modelo de Decisão do Operador:** O operador na mesa técnica tem autoridade exclusiva para decidir:
   - Enviar `POST /api/pitch/timer/resume`: descongela o timer e continua o pitch;
   - Enviar `POST /api/pitch/reset`: limpa o palco e recomeça a rodada em `Waiting`.

## Consequências

### Positivas
- **Preservação Integral do Contexto:** Nenhum voto de jurado é perdido em um crash.
- **Segurança Temporal:** O tempo restante fica congelado e não escorre enquanto o servidor estiver desligado.
- **Auditoria Transparente:** O operador e a audiência recebem informação clara de que o estado atual decorre de uma recuperação assistida.

### Negativas / Mitigações
- Exige uma intervenção intencional do operador (Resume ou Reset) para que o cronômetro volte a correr, o que é um comportamento deliberadamente seguro para eventos ao vivo.
