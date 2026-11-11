# ADR-019: Padrão IDbContextFactory e Arquitetura Híbrida de Armazenamento

## Status
Aceito (Milestone 4A — Novembro de 2026)

---

## Contexto
O serviço central de orquestração da plataforma (`IArenaProjectStore`) precisa coordenar o estado físico em tempo real das 5 cadeiras da arena e a sincronização WebSocket via SignalR. Por essa razão, ele é registrado no container de injeção de dependência do ASP.NET Core com ciclo de vida **Singleton**.

A persistência relacional com o Entity Framework Core introduz instâncias de `ArenaDbContext`, que operam tradicionalmente com escopo **Scoped** (por requisição HTTP). Injetar um contexto scoped em um singleton constitui um antipattern grave conhecido como *Captive Dependency*, levando a memory leaks, conexões zumbis e problemas de concorrência multithread.

---

## Problema
Como conciliar a necessidade de gerenciar o estado volátil das cadeiras e timers em tempo real (em memória) com a persistência segura de dados mestres e históricos no PostgreSQL sem violar o ciclo de vida do ASP.NET Core?

---

## Decisão
Adota-se o padrão **Pooled DbContext Factory** (`IDbContextFactory<ArenaDbContext>`) e uma **arquitetura híbrida de armazenamento** implementada em `PostgresArenaProjectStore`:

1. **Ciclo de Vida do Store**: `PostgresArenaProjectStore` permanece registrado como **Singleton**, garantindo a coordenação atômica de locks do palco, timers e dicionário concorrente de cadeiras.
2. **Contextos Efêmeros**: Todas as operações de leitura e gravação no PostgreSQL criam e descartam contextos curtos sob demanda via `using var context = _contextFactory.CreateDbContext()`.
3. **Divisão de Responsabilidade**:
   - **PostgreSQL**: Eventos, Projetos, Jurados, Alocação da Banca e Histórico de Rodadas Arquivadas.
   - **Memória RAM (Volátil)**: Posição atual das cadeiras (`_chairStates`), cronômetros de palco em contagem regressiva e flags de votação aberta. *(A persistência e reidratação desse bloco pertence ao Milestone 4B)*.

---

## Consequências

### Positivas
- **Zero Captive Dependencies**: Nenhum contexto de banco fica aberto além da duração estrita de cada operação de CRUD.
- **Thread Safety**: Múltiplas requisições concorrentes da API ou do SignalR operam sobre instâncias independentes de `ArenaDbContext`.
- **Preservação de Desempenho**: O uso do pool nativo do EF Core (`AddPooledDbContextFactory`) reutiliza instâncias de contexto sem sobrecarregar o Garbage Collector.
