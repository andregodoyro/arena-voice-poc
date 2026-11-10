# ADR-016: Offline-First Persistence Strategy — PostgreSQL Portable (Revisado)

## Status
Aceito — Revisado (2026-11-10)

> **Histórico de revisão:**
> - **v1.0 (2026-11-09):** Decisão original adotava SQLite embedded (`Microsoft.Data.Sqlite`) como motor de persistência.
> - **v2.0 (2026-11-10):** Decisão revisada após validação bem-sucedida do PostgreSQL Portable no ambiente corporativo. SQLite substituído por PostgreSQL Portable como Storage Engine oficial da Fase 4.

---

## Contexto

Durante as Fases 1 a 3, a plataforma Arena Voice operou com estado volátil armazenado exclusivamente na memória do processo .NET (`ArenaProjectStore`). Essa abordagem foi intencional e altamente eficaz para acelerar a validação da prova de conceito, modelagem de domínio e entrega de 5 motores de negócio (Event Lifecycle, Pitch Lifecycle, Timers, Round History e Banca de Jurados), culminando em 466 testes automatizados aprovados.

Para a entrada em **eventos presenciais reais** (Demo Days corporativos, Hackathons, convenções de inovação), a volatilidade da memória RAM tornou-se o principal risco operacional do projeto:
- Uma queda de energia, encerramento acidental do processo ou falha do sistema operacional no notebook da mesa técnica resultaria na **perda irreversível de todos os eventos, projetos, votos e histórico de rodadas já apurados**.
- O sistema opera tipicamente em **notebook corporativo Windows único**, frequentemente sob políticas rígidas de TI.
- O ambiente do evento ao vivo opera em **rede local autônoma (hotspot Wi-Fi 2.4 GHz)**, onde a internet externa é instável ou inexistente.

### Nova Evidência (2026-11-10)

A decisão original (v1.0) rejeitou PostgreSQL com o argumento de "inviabilidade em notebooks corporativos restritos — exige permissões de administrador". Essa premissa foi **invalidada por validação prática no ambiente corporativo real**:

| Validação | Resultado |
|:---|:---:|
| PostgreSQL 17 binários portáteis sem instalador | ✅ Operacional |
| `initdb` sem privilégios de administrador | ✅ Confirmado |
| `pg_ctl start` iniciando cluster local | ✅ Confirmado |
| Conexão em `localhost:5432` sem Docker/WSL | ✅ Confirmado |
| `CREATE TABLE`, `INSERT`, `SELECT` validados | ✅ Confirmado |
| Operação 100% offline (sem internet) | ✅ Confirmado |

---

## Problema

Qual tecnologia e padrão arquitetural de persistência devem ser adotados para garantir que:
1. Os dados da arena sobrevivam a falhas de processo e quedas de energia (ACID / Crash-Safety);
2. A aplicação opere com **zero dependência de internet** durante o evento ao vivo (100% Offline-First);
3. O backup e a recuperação de desastres sejam realizáveis sem expertise técnica avançada;
4. Os 466 testes automatizados continuem rápidos, determinísticos e executáveis em qualquer ambiente;
5. A migração não quebre nenhum dos 34 contratos REST, 9 eventos SignalR ou componentes do frontend;
6. A arquitetura esteja alinhada com práticas de mercado e preparada para evolução a longo prazo.

---

## Decisão

Adota-se o **PostgreSQL Portable** (binários portáteis sem instalador, cluster local via `pg_ctl`) como o motor canônico de persistência da Arena Voice, operando sob o padrão de Repositório (`PostgresArenaProjectStore`) que substitui transparentemente o armazenamento em memória via interface `IArenaProjectStore`.

O driver oficial .NET é o **Npgsql** (`Npgsql` NuGet), com queries via Dapper ou EF Core conforme o milestone.

### Diretrizes de Implementação

1. **Cluster Portable e Inicialização Assistida:**
   - Os binários do PostgreSQL ficam em `devtools/portable/pgsql/bin/`.
   - O cluster de dados fica em `devtools/portable/pgsql/pgdata/`.
   - Script de startup único `start-arena.bat` inicializa o cluster e o backend em sequência:
     ```bat
     @echo off
     .\devtools\portable\pgsql\bin\pg_ctl -D .\devtools\portable\pgsql\pgdata start -w
     timeout /t 2 /nobreak >nul
     .\devtools\portable\dotnet\dotnet.exe run --project backend\ArenaVoicePocBackend.csproj
     ```

2. **Verificação de Saúde na Inicialização do Backend (ConnectionLifecycleManager):**
   - O backend tenta conectar ao PostgreSQL na inicialização.
   - Se a porta `5432` estiver indisponível, exibe mensagem de erro clara e termina com código de saída não-zero.
   - Evita silent failures onde o backend sobe mas persiste em memória sem aviso.

3. **Schema Relacional Estrito e Migrações Versionadas:**
   - Tabelas: `Events`, `Projects`, `Judges`, `EventJuryAssignments`, `RoundHistoryEntries`, `ActiveSessionState`, `AuditEvents`.
   - Constraints de integridade referencial (`FOREIGN KEY`), unicidade e valores (`CHECK`) em todas as colunas críticas.
   - Migrações aplicadas automaticamente na inicialização via `MigrationRunner` (EF Core Migrations ou Evolve).

4. **Isolamento via Interface `IArenaProjectStore`:**
   - A Minimal API e os hubs SignalR continuam consumindo estritamente a interface `IArenaProjectStore`.
   - A nova implementação `PostgresArenaProjectStore` encapsula toda a persistência relacional, mantendo intactos os 34 contratos REST e 9 contratos SignalR existentes.

5. **Crash Recovery Determinístico no Boot:**
   - Na inicialização, o backend consulta `ActiveSessionState` e reidrata o evento ativo, projeto selecionado e banca.
   - **Regra de Sanitização:** Caso o sistema tenha caído durante pitch em andamento (`PitchRunning` ou `VotingOpen`), o estágio é recuperado para `Waiting` com cadeiras físicas neutralizadas (0°), preservando integralmente o histórico de rodadas anteriores já arquivadas.

6. **Backup Operacional via `pg_dump`:**
   - Endpoint `POST /api/admin/backup` dispara `BackupOrchestrator`, que executa `pg_dump` em processo separado gerando arquivo comprimido com timestamp.
   - Snapshot automático a cada `RoundArchived`.
   - Procedimento de restauração documentado no runbook operacional.

---

## Consequências

### Positivas
- **Alinhamento com Stack de Mercado:** ASP.NET Core + Npgsql + PostgreSQL é a combinação mais usada em aplicações .NET corporativas modernas.
- **SQL Completo:** Window functions, CTEs recursivas, JSONB, índices parciais e `EXPLAIN ANALYZE` disponíveis para a Fase 6 (Ranking e Relatórios) sem limitações.
- **MVCC Nativo:** Sem risco de `database is locked`; concorrência leitura/escrita via MVCC sem serialização manual.
- **Sobrevivência Transacional (ACID):** WAL nativo do PostgreSQL garante crash-safety completo.
- **Valor Educacional e Arquitetural:** Repositório demonstra stack de produção real, com maior impacto como portfólio e referência técnica.
- **Preparação para Futuro:** Migração para ambiente cloud (RDS, Cloud SQL, Supabase managed) não exige reescrever regras de negócio — apenas mudar a connection string.

### Negativas / Desafios
- **Dois Processos no Evento ao Vivo:** O operador precisa garantir que o cluster PG está rodando antes de subir o backend. *Mitigação:* Script `start-arena.bat` único que inicializa ambos sequencialmente.
- **Risco de Porta Ocupada:** `localhost:5432` pode estar em uso por outra aplicação corporativa. *Mitigação:* Configuração de porta alternativa e `ConnectionLifecycleManager` com mensagem de erro clara.
- **Backup Mais Complexo que `VACUUM INTO`:** `pg_dump` requer processo separado. *Mitigação:* `BackupOrchestrator` encapsula o processo; operador não interage diretamente com o comando.
- **Inicialização de Cluster (`initdb`) Obrigatória Uma Vez:** Configuração inicial do cluster é necessária na primeira execução. *Mitigação:* Script `setup-pgdata.bat` automatiza `initdb` e cria o banco `arena_voice`.

---

## Alternativas Consideradas

| Alternativa | Motivo da Rejeição |
| :--- | :--- |
| **SQLite embedded (`Microsoft.Data.Sqlite`)** | Válido tecnicamente, mas limitado para analytics futuro (Fase 6+), sem SQL completo (window functions, partições), ecossistema menor e alinhamento de mercado inferior. Adequado para POC; insuficiente para produto de médio prazo. |
| **JSON Snapshot em Disco** | Frágil contra corrupção em desligamento abrupto; sem suporte a transações ACID ou consultas relacionais indexadas. |
| **PostgreSQL em Docker** | Inviável em máquinas corporativas sem licença/permissão de Docker Desktop ou WSL2. |
| **SQL Server Express / LocalDB** | Setup pesado (~1.5 GB), restrito a Windows e dependente de serviços locais de autenticação do SO. |
| **Supabase / Firebase (Cloud BaaS)** | Violação inegociável do princípio **Offline-First**. Se o link de internet do hotel/convenção cair, a votação falha. |
| **LiteDB (NoSQL Embedded)** | Menos maduro que SQLite, ecossistema menor, sem SQL padrão. |

---

## Motivos da Escolha

1. **Validação prática confirma viabilidade:** PostgreSQL Portable demonstrou operação completa no ambiente corporativo Windows sem privilégios de administrador — a premissa de impossibilidade da v1.0 foi empiricamente refutada.
2. **Alinhamento estratégico de longo prazo:** A Arena Voice tem horizonte de evolução para Fase 8+ (módulo satélite, possível cloud multi-arena); PostgreSQL elimina a dívida técnica de migração futura.
3. **SQL completo sem limitações:** A Fase 6 (Rankings e Relatórios) requer agregações complexas; window functions e índices parciais do PostgreSQL entregam isso nativamente.
4. **Único risco operacional real é mitigável:** O gerenciamento de dois processos (pg_ctl + dotnet) é resolvido com script de startup único.

---

## Impacto na Fase 4

| Milestone | Adaptações com PostgreSQL |
|:---:|:---|
| **4A** | `PostgresArenaProjectStore` via Npgsql; DDL PostgreSQL; EF Core Migrations |
| **4B** | Re-hidratação idêntica — mesma lógica, tabela `ActiveSessionState` em PG |
| **4C** | Tabela `AuditEvents` em PG — sem diferença na lógica; ganho em particionamento futuro |
| **4D** | `BackupOrchestrator` via `pg_dump`; `ConnectionLifecycleManager`; runbook operacional |
| **4E** | Adicionar cenários de chaos: porta indisponível, cluster não iniciado, restart de PG |

## Impacto Futuro
- **Fase 6 (Ranking e Relatórios):** Window functions e CTEs do PostgreSQL entregam rankings complexos e atas executivas em milissegundos sem limitações de SQL.
- **Fase 7+ (Hardening e Fleet):** Row-level security e roles do PostgreSQL habilitam governança granular.
- **Escala Empresarial Futura:** Connection string aponta para PG managed (RDS/Cloud SQL) — zero reescrita de regras de negócio.
