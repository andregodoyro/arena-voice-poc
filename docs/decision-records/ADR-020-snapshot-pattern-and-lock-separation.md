# ADR-020: Snapshot Pattern & Lock Separation

## Status
Aceito (Homologado no Milestone 4B)

## Data
2026-11-11

## Contexto
No Milestone 4A, as operações de persistência do `PostgresArenaProjectStore` executavam I/O relacional diretamente dentro da região crítica protegida pelo lock de contexto (`_contextLock`). Com a introdução da persistência do estado ativo da arena no Milestone 4B (incluindo as 5 cadeiras físicas, timers de alta precisão e transições de pitch), manter conexões de banco de dados e transações do Entity Framework dentro do mesmo lock de memória causaria contenção de threads (*lock contention*), latência perceptível nos eventos SignalR e bloqueios no cálculo de tempo do cronômetro.

## Decisão
Implementar o **Snapshot Pattern com Separação Estrita de Locks**:
1. Criar o record imutável `ActiveSessionSnapshot` para representar uma fotografia consistente do estado ativo da arena.
2. Manter dois locks com responsabilidades distintas e independentes:
   - `_contextLock` (objeto em memória): protege o *Hot Cache* em RAM. Suas seções críticas duram frações de microssegundo, apenas o tempo necessário para atualizar variáveis locais e instanciar o `ActiveSessionSnapshot`.
   - `_dbPersistenceLock` (objeto de persistência): serializa o I/O no PostgreSQL fora do lock de memória principal.
3. Todo método mutador da arena segue a sequência:
   - Entra em `lock (_contextLock)`;
   - Atualiza o estado em memória e gera o snapshot via `CreateSnapshotUnderLock()`;
   - Libera `_contextLock`;
   - Invoca `PersistSnapshot(snapshot)`, que sob `_dbPersistenceLock` utiliza `IDbContextFactory<ArenaDbContext>` para salvar a tupla no PostgreSQL.

## Consequências

### Positivas
- **Latência Ultra-Baixa no Hot Path:** Requisições de leitura (`GET /api/state`) e eventos SignalR nunca esperam por I/O de disco.
- **Isolamento de Falhas de Concorrência:** Timers e hardware ESP32 continuam respondendo sem atrasos ou bloqueios concorrentes.
- **Simplicidade de Consistência:** A imutabilidade do `record` C# elimina riscos de mutação concorrente enquanto o banco grava em disco.

### Negativas / Mitigações
- Uma nova alocação de snapshot é realizada a cada mutação de estado. Como as mutações ocorrem em cadência humana (segundos a minutos), o impacto no Garbage Collector é virtualmente nulo.
