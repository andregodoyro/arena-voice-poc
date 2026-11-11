# Histórico Detalhado de Implementação — Milestone 4A
## Storage Engine & Relational Schema (PostgreSQL Portable 18.6 + EF Core 10)

> **Documento:** Registro de Memória Arquitetural e Técnica da Fase 4A  
> **Data:** Novembro de 2026  
> **Status:** Homologado e Integrado  

---

## 4A.1 — Pacotes EF Core e Npgsql
- **Objetivo**: Integrar os pacotes NuGet oficiais do Entity Framework Core 10 e Npgsql 10 no projeto backend .NET 10.
- **Entregas**: Adicionados ao arquivo `backend/ArenaVoicePocBackend.csproj`:
  - `Npgsql.EntityFrameworkCore.PostgreSQL` (10.0.3)
  - `Microsoft.EntityFrameworkCore.Design` (10.0.14)
- **Arquivos Envolvidos**: `backend/ArenaVoicePocBackend.csproj`.
- **Problemas Encontrados**: O comando `dotnet` não estava no PATH padrão do ambiente isolado, exigindo apontamento para a instalação portable.
- **Soluções Aplicadas**: Execução com caminho absoluto `devtools/portable/dotnet/dotnet.exe`.
- **Resultado Final**: Build com 0 erros e 0 avisos; dependências restauradas.

---

## 4A.2 — ArenaPersistenceOptions
- **Objetivo**: Implementar classe de configuração fortemente tipada para externalizar opções de armazenamento.
- **Entregas**: Classe `ArenaPersistenceOptions` com propriedades de `StorageEngine` (`postgres` ou `memory`), `ConnectionString`, `CommandTimeoutSeconds`, `ConnectionTimeoutSeconds` e `EnableSensitiveDataLogging`.
- **Arquivos Envolvidos**:
  - `backend/Persistence/Options/ArenaPersistenceOptions.cs`
  - `backend/appsettings.json`
- **Problemas Encontrados**: Nenhum.
- **Soluções Aplicadas**: Isolamento correto no namespace `ArenaVoicePocBackend.Persistence.Options`.
- **Resultado Final**: Seção `ArenaPersistence` configurada com timeout de conexão de 3 segundos para detecção rápida de indisponibilidade.

---

## 4A.3 — ArenaDbContext Base & ActiveSessionState
- **Objetivo**: Implementar o contexto central do EF Core e criar a entidade de sessão ativa singleton para o futuro Milestone 4B.
- **Entregas**:
  - `backend/Domain/Entities/ActiveSessionState.cs`: Entidade com chave singleton (`SingletonId = 1`) contendo snapshots JSONB e arrays nativos.
  - `backend/Persistence/ArenaDbContext.cs`: Classe derivada de `DbContext` expondo 6 `DbSet`s (`Events`, `Projects`, `Judges`, `EventJuryAssignments`, `RoundHistoryEntries`, `ActiveSessionStates`).
- **Arquivos Envolvidos**:
  - `backend/Domain/Entities/ActiveSessionState.cs`
  - `backend/Persistence/ArenaDbContext.cs`
- **Problemas Encontrados**: Alerta do compilador sobre valor default em chave primária singleton.
- **Soluções Aplicadas**: Configuração via Fluent API definindo `b.HasKey(s => s.SingletonId);` e controle de unicidade.
- **Resultado Final**: Contexto pronto para receber mapeamentos modulares.

---

## 4A.4 — Entity Configurations (Fluent API)
- **Objetivo**: Mapear todas as entidades de domínio usando configurações declarativas separadas por classe.
- **Entregas**: Criação de 6 arquivos em `backend/Persistence/Configurations/`:
  - `EventConfiguration.cs`: Mapeamento de `BrandingConfig` e `TimerConfig` como Owned Types;
  - `ProjectConfiguration.cs`: Chaves estrangeiras com `events` e owned type de mídia;
  - `JudgeConfiguration.cs`: Mapeamento de array nativo `text[]` para `expertise`;
  - `EventJuryAssignmentConfiguration.cs`: Chave composta (`event_id`, `chair_id`), índice único e foreign keys;
  - `RoundHistoryConfiguration.cs`: Mapeamento de array nativo `int[]` para `turned_chairs`, JSONB para `timer_config_snapshot`, índices e check constraints;
  - `ActiveSessionStateConfiguration.cs`: Mapeamento de snapshot e status de sessão.
- **Arquivos Envolvidos**: `backend/Persistence/Configurations/*.cs`.
- **Problemas Encontrados**:
  1. `Round.JudgeScores` e `Round.Scorecards` não mapeavam nativamente no EF Core.
  2. A check constraint `ck_round_result` foi gerada inicialmente como `BETWEEN 0 AND 2`, colidindo com `RoundResult.Inconclusive = 3`.
- **Soluções Aplicadas**:
  1. Uso de `builder.Ignore(r => r.JudgeScores); builder.Ignore(r => r.Scorecards);`.
  2. Ampliação da constraint para `result BETWEEN 0 AND 3`.
- **Resultado Final**: Schema relacional 100% tipado e compatível com as regras de negócio.

---

## 4A.5 — Model Validation Gate
- **Objetivo**: Garantir que as ferramentas de design-time do EF Core consigam inspecionar o modelo sem erros.
- **Entregas**: Implementação de `backend/Persistence/ArenaDbContextFactory.cs` (`IDesignTimeDbContextFactory<ArenaDbContext>`).
- **Arquivos Envolvidos**: `backend/Persistence/ArenaDbContextFactory.cs`.
- **Problemas Encontrados**: Falha ao rodar `dotnet ef dbcontext info` devido à falta de contexto sem parâmetros em tempo de design.
- **Soluções Aplicadas**: Criação do factory de design-time apontando para a connection string local do PostgreSQL Portable.
- **Resultado Final**: `dotnet ef dbcontext info` validou com sucesso o provedor Npgsql e as 6 entidades.

---

## 4A.6 — InitialCreate Migration
- **Objetivo**: Gerar a primeira migração declarativa do schema relacional.
- **Entregas**: Migration `20261110142657_InitialCreate.cs` e `ArenaDbContextModelSnapshot.cs`.
- **Arquivos Envolvidos**: `backend/Persistence/Migrations/*`.
- **Problemas Encontrados**: Nenhum durante a geração do código C#.
- **Soluções Aplicadas**: Revisão minuciosa das instruções `CreateTable`, `CreateIndex` e `AddForeignKey`.
- **Resultado Final**: Código de migração versionado no repositório.

---

## 4A.7 — DatabaseStartupValidator
- **Objetivo**: Garantir que o backend verifique a porta do PostgreSQL antes de subir e execute migrações pendentes de forma segura.
- **Entregas**: Implementação de `backend/Persistence/Startup/DatabaseStartupValidator.cs`.
- **Arquivos Envolvidos**: `backend/Persistence/Startup/DatabaseStartupValidator.cs`.
- **Problemas Encontrados**: O cluster PostgreSQL Portable local não possuía a role `postgres` e o database `arena_voice`.
- **Soluções Aplicadas**: Execução de scripts locais de preparação do cluster e teste de bloqueio amigável com mensagem explicativa quando o PostgreSQL está desligado.
- **Resultado Final**: Inicialização com migração automática aplicada em < 1.2s.

---

## 4A.8 — PostgresArenaProjectStore
- **Objetivo**: Implementar `IArenaProjectStore` persistindo dados permanentes no PostgreSQL e mantendo estado de palco em memória.
- **Entregas**: `backend/Services/PostgresArenaProjectStore.cs` suportado por `IDbContextFactory<ArenaDbContext>`.
- **Arquivos Envolvidos**: `backend/Services/PostgresArenaProjectStore.cs`.
- **Problemas Encontrados**:
  1. `DateTimeOffset` com offset local era rejeitado pelo Npgsql.
  2. Métodos de inserção não geravam IDs quando vazios.
  3. Faltavam regras canônicas da máquina de estados do pitch no store relacional.
- **Soluções Aplicadas**:
  1. Normalização forçada de todas as datas para UTC (`.ToUniversalTime()`).
  2. Implementação da geração de identificadores semânticos (`evt-`, `proj-`, `judge-`).
  3. Alinhamento da máquina de estados e marcação de `project.Status = Completed` ao atingir `Finished`.
- **Resultado Final**: Store relacional com 100% de paridade com o store volátil anterior.

---

## 4A.9 — Program.cs Wire-up
- **Objetivo**: Conectar o novo store e o validador ao pipeline de inicialização da aplicação ASP.NET Core.
- **Entregas**: Registro de `ArenaPersistenceOptions`, `AddPooledDbContextFactory`, injeção condicional e chamada ao `DatabaseStartupValidator`.
- **Arquivos Envolvidos**: `backend/Program.cs`.
- **Problemas Encontrados**: Processos órfãos do backend retendo a porta 5000.
- **Soluções Aplicadas**: Script de encerramento seguro de instâncias prévias antes do start.
- **Resultado Final**: Alternância transparente de engine via configuração sem alterar código.

---

## 4A.10 — Persistência & Regressão
- **Objetivo**: Homologar a persistência com suíte dedicada e bateria completa de testes de regressão.
- **Entregas**: Suíte `tests/test-postgres-persistence.cjs` (31 asserções) e homologação das 9 suítes legadas.
- **Arquivos Envolvidos**:
  - `tests/test-postgres-persistence.cjs`
  - `tests/test-projects-api.cjs`
- **Problemas Encontrados**: Estado residual de testes anteriores no banco afetava suítes sequenciais.
- **Soluções Aplicadas**: Inclusão de rotinas de reset e setup idempotente no início dos testes.
- **Resultado Final**: 497/497 testes aprovados em 10 suítes (100% de sucesso).
