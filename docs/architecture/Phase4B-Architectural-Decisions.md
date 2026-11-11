# Registro de Decisões Arquiteturais — Milestone 4B
## State Persistence & Session Re-hydration

> **Projeto:** Arena Voice / Arena de Inovação  
> **Fase:** Fase 4 — Platform Reliability & Data Resilience  
> **Data:** 11 de Novembro de 2026  

---

## 1. Decisão 1: Snapshot Pattern & Lock Separation

### Contexto
No Milestone 4A, o `PostgresArenaProjectStore` executava operações de banco de dados diretamente dentro do lock principal do contexto (`_contextLock`). À medida que adicionamos a persistência de estado ativo com cadeiras físicas e timers, manter transações do Entity Framework e I/O de rede/disco dentro do mesmo lock causaria contenção severa, atrasaria a entrega de pacotes SignalR e poderia induzir travamentos no cronômetro do palco.

### Alternativas Consideradas
1. **Persistência Síncrona Dentro do Lock Único:** Simples de implementar, mas degradaria o tempo de resposta da Minimal API de < 1ms para 15-40ms durante gravações no PostgreSQL.
2. **Channel / Background Queue com Fila Assíncrona Total:** Altamente escalável, mas introduziria complexidade de consistência eventual e risco de perda de snapshots em caso de crash no exato milissegundo antes do dreno da fila.
3. **Snapshot Pattern com Locks Separados (Escolhida):** Extrai uma cópia imutável dos dados sob o lock de memória rápido e persiste a cópia logo em seguida sob um lock de I/O independente.

### Decisão & Justificativa
Adotamos o **Snapshot Pattern com Separação Estrita de Locks**:
- `_contextLock`: protege o estado volátil em memória RAM por frações de milissegundo.
- `_dbPersistenceLock`: serializa a persistência relacional fora do lock de memória.
- **Trade-off:** A persistência permanece síncrona em relação ao término do request HTTP (garantindo durabilidade antes de responder 200 OK ao cliente), mas sem reter o lock de memória da aplicação.

---

## 2. Decisão 2: Estratégia Paused Recovery (Sem Descarte para Waiting)

### Contexto
Se o backend sofre um encerramento forçado enquanto uma startup está apresentando seu pitch (ex: no segundo 75 de 180, com 2 cadeiras já viradas), o sistema precisa decidir qual estágio adotar ao reiniciar.

### Alternativas Consideradas
1. **Descarte Automático para `Waiting`:** Reverte a sessão para o início do pitch. Desvantagem crítica: perda do contexto cênico, notas e tempo já transcorrido, exigindo reinício manual constrangedor durante o evento ao vivo.
2. **Retomada Automática em Execução (`PitchRunning` com timer correndo):** Desvantagem crítica: o cronômetro começaria a correr imediatamente no boot antes mesmo que o telão e o operador estivessem reconectados, prejudicando o empreendedor no palco.
3. **Paused Recovery (Escolhida):** O sistema detecta a interrupção anômala, restaura o projeto, restaura as cadeiras acionadas, preserva o estágio original, mas **força o cronômetro para o estado `Paused`**.

### Decisão & Justificativa
Adotamos a estratégia **Paused Recovery**:
- Preserva o contexto completo da arena.
- Congela o tempo restante com base no último checkpoint persistido.
- Entrega o controle de decisão exclusivamente ao operador humano na mesa técnica: o operador pode optar por **Retomar (`/resume`)** ou **Reiniciar (`/reset`)**.

---

## 3. Decisão 3: Persistência das Cadeiras Físicas no ActiveSessionState

### Contexto
Durante o pitch, jurados viram cadeiras pressionando botões arcade ESP32. Se o servidor cair durante o pitch ou na sessão de perguntas (QA), as cadeiras viradas não podem ser perdidas.

### Alternativas Consideradas
1. **Manter Cadeiras em RAM até o Fim da Rodada:** Simples, mas inaceitável em termos de confiabilidade operacional. Em caso de crash, os jurados teriam que ser consultados sobre quais já haviam votado.
2. **Tabela Associativa Relacional (`active_session_chairs`):** Normalizada, mas excessivamente pesada para armazenar no máximo 5 IDs inteiros (1 a 5).
3. **Array Nativo PostgreSQL (`turned_chairs int[]`) (Escolhida):** Utilização da capacidade nativa do PostgreSQL de persistir arrays de inteiros primitivos na própria tupla singleton.

### Decisão & Justificativa
Adotamos a coluna `turned_chairs int[]`:
- Extremamente eficiente em termos de I/O e armazenamento.
- Mapeamento nativo e transparente no EF Core 10 via Npgsql.
- Permite restauração atômica em uma única query SQL no boot.

---

## 4. Decisão 4: Rastreabilidade Temporal via LastCheckpointAt

### Contexto
Quando o processo sofre um crash abrupto (ex: falta de energia ou `kill -9`), o backend desligado é incapaz de executar código de finalização. Ao reiniciar, o sistema precisa saber quanto tempo do pitch realmente decorreu antes da falha.

### Alternativas Consideradas
1. **Subtrair `DateTimeOffset.UtcNow - PitchStageStartedAt`:** Incorreto: contaria todo o tempo em que o servidor esteve desligado ou sem energia como tempo de pitch decorrido, fazendo o cronômetro zerar indevidamente.
2. **Persistir o Cronômetro a Cada Segundo (Tick):** Causaria 1 escrita por segundo no PostgreSQL durante todo o evento, gerando sobrecarga desnecessária de I/O e desgaste em unidades SSD locais.
3. **Âncora no Último Checkpoint (`LastCheckpointAt`) (Escolhida):** O tempo decorrido no momento da falha é computado como a diferença entre o início do estágio e o momento do último evento registrado (transição, pausa, ajuste ou voto de cadeira).

### Decisão & Justificativa
Adotamos `LastCheckpointAt`:
- Elimina escritas periódicas contínuas em disco.
- Garante precisão com base na última ação válida dos jurados ou operador na arena.
- Atua como metadado de auditoria e diagnóstico para troubleshooting.

---

## 5. Matriz Consolidada de Decisões e Trade-offs

| Decisão | Benefício Principal | Trade-off Aceito |
| :--- | :--- | :--- |
| **Snapshot Pattern** | Zero contenção de lock em RAM; SignalR ultra-reativo | Cópia de memória adicional por mutação (desprezível) |
| **Paused Recovery** | Proteção ao participante; sem perda de notas ou tempo | Requer ação deliberada do operador pós-queda |
| **`turned_chairs int[]`** | Gravação atômica sem joins relacionais | Acoplamento ao suporte de arrays do PostgreSQL |
| **`LastCheckpointAt`** | Zero I/O periódico a cada segundo | Perda potencial de tempo decorrido entre o último voto e a queda |
