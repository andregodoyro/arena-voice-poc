# ADR-018: Adoção do EF Core 10 com Npgsql e Migrations no PostgreSQL Portable

## Status
Aceito (Milestone 4A — Novembro de 2026)

---

## Contexto
Após a revisão da estratégia de persistência no ADR-016 (que substituiu SQLite por PostgreSQL Portable 18.6 como banco oficial da Fase 4), fez-se necessário definir a tecnologia de acesso a dados e a estratégia de evolução de schema para o ecossistema .NET 10.

As alternativas consideradas foram:
1. Micro-ORM Dapper com scripts SQL manuais ou Evolve.
2. Entity Framework Core 10 com driver oficial Npgsql 10 e Code-First Migrations.

---

## Problema
Como estruturar a camada de persistência para garantir:
1. Modelagem relacional tipada e declarativa, aproveitando recursos avançados do PostgreSQL (`text[]`, `int[]`, `jsonb`, `Owned Types`);
2. Evolução controlada e versionada do schema de banco atrelada ao histórico Git;
3. Inicialização determinística e idempotente sem intervenção manual do operador em eventos presenciais.

---

## Decisão
Adota-se o **Entity Framework Core 10** (`Npgsql.EntityFrameworkCore.PostgreSQL` versão 10.0.3) com **Code-First Migrations** aplicadas automaticamente no boot via `db.Database.Migrate()`.

### Diretrizes de Modelagem:
1. **Configurações Fluent API Modulares**: Cada entidade possui sua própria classe de mapeamento (`IEntityTypeConfiguration<T>`) na pasta `backend/Persistence/Configurations/`.
2. **Tipos Nativos do PostgreSQL**:
   - `Expertise` de jurados mapeada como `text[]`.
   - `TurnedChairs` do histórico de rodadas mapeada como `int[]`.
   - `TimerConfig` arquivado em histórico mapeado como coluna `jsonb` (`timer_config_snapshot`).
   - `BrandingConfig` e `TimerConfig` mapeados como `Owned Types` em tabelas principais.
3. **Validador de Startup**: O `DatabaseStartupValidator` verifica a disponibilidade da porta 5432 antes de disparar a migração, exibindo diagnósticos amigáveis em caso de falha.

---

## Consequências

### Positivas
- **Produtividade e Segurança de Tipos**: Elimina fragilidades de SQL cru montado em strings.
- **Rastreabilidade de Schema**: As migrações (`InitialCreate`) ficam versionadas em C# dentro do repositório.
- **Performance**: O Npgsql compila consultas de forma otimizada e serializa JSONB e arrays binariamente.

### Desafios / Mitigações
- **Timezone UTC**: O Npgsql exige `DateTimeOffset` com offset zero (UTC) para colunas `timestamp with time zone`. Resolvido padronizando `.ToUniversalTime()` no store.
