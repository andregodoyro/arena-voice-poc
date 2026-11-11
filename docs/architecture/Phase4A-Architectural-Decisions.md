# Decisões Arquiteturais — Milestone 4A
## Storage Engine & Relational Schema (PostgreSQL Portable 18.6 + EF Core 10)

> **Documento:** Registro de Decisões de Arquitetura e Ajustes Técnicos do Marco 4A  
> **Data:** Novembro de 2026  
> **Status:** Homologado e Válido  

---

## 1. Justificativas das Escolhas Tecnológicas

### 1.1. Por que PostgreSQL Portable 18.6?
- **Rigor Transacional (ACID)**: Garante que os dados do evento estejam protegidos por WAL (*Write-Ahead Logging*), sobrevivendo a quedas abruptas de energia ou congelamentos do sistema operacional.
- **Portabilidade Total**: A versão portable permite executar o cluster local de banco de dados diretamente a partir de um diretório de ferramentas (`devtools/portable/pgsql`), sem instaladores MSI, sem criação de serviços no Windows e sem privilégios de administrador de TI corporativa.
- **Conformidade com o Mercado**: O PostgreSQL é o banco relacional open source de referência da indústria, garantindo compatibilidade direta caso o sistema venha a ser migrado para a nuvem no futuro.

### 1.2. Por que Entity Framework Core 10 & Npgsql 10?
- **Aceleração e Tipagem Forte**: O EF Core 10 elimina a escrita manual de queries SQL frágeis em strings, oferecendo compilação estática de consultas LINQ e mapeamento bidirecional seguro.
- **Npgsql de Alta Performance**: Driver oficial líder para .NET com implementação nativa de tipos complexos do PostgreSQL, mapeamento direto de arrays primitivos e serialização eficiente de JSONB.
- **Pooled DbContext Factories**: Otimização nativa de pooling de instâncias que reduz drasticamente o custo de alocação de memória por transação.

### 1.3. Por que Code-First Migrations?
- O versionamento do banco acompanha o código-fonte C#. Todas as alterações estruturais são rastreáveis via Git e aplicadas automaticamente no boot via `db.Database.Migrate()`, eliminando scripts SQL executados manualmente em produção.

### 1.4. Por que `IDbContextFactory<ArenaDbContext>`?
- O `IArenaProjectStore` precisa ser registrado como Singleton para preservar o estado de memória em tempo real das cadeiras físicas e sincronização SignalR.
- Injetar um `DbContext` com tempo de vida tradicional em um serviço Singleton causaria o antipattern de dependência cativa (*captive dependency*). O `IDbContextFactory` permite criar instâncias de contexto sob demanda (`short-lived`), utilizadas e descartadas dentro do escopo de cada método.

### 1.5. Por que `ActiveSessionState` Singleton?
- Tabela com chave estática (`singleton_id = 1`) criada preventivamente no 4A para permitir que o Milestone 4B persista o estado corrente do palco (projeto em apresentação, tempo decorrido e cadeiras viradas) sem poluir as tabelas de histórico ou dados mestres.

### 1.6. Por que `DatabaseStartupValidator`?
- Impede inicializações silenciosas em que o backend subiria mas não conseguiria persistir dados. Se a porta 5432 estiver indisponível, o sistema exibe orientações claras de diagnóstico e encerra o processo com código de erro.

### 1.7. Por que Tipos Nativos PostgreSQL (Arrays e JSONB)?
- **Arrays (`text[]` e `int[]`)**: Evitam a necessidade de criar tabelas associativas como `judge_expertise_tags` ou `round_turned_chairs` apenas para guardar listas simples de texto ou números.
- **JSONB**: Permite salvar o snapshot das configurações de temporizadores (`timer_config_snapshot`) de forma imutável, garantindo que alterações posteriores no evento não afetem o histórico passado.

---

## 2. Ajustes Realizados Durante a Homologação

1. **Exigência de UTC no Npgsql**:
   - *Ocorrência*: Erro ao gravar `DateTimeOffset` com offset não-zero (`-03:00`) em colunas `timestamp with time zone`.
   - *Resolução*: Aplicação de `.ToUniversalTime()` e `TimeSpan.Zero` em todas as manipulações de data em `PostgresArenaProjectStore.cs`.
2. **Correção de Check Constraint de Resultado**:
   - *Ocorrência*: A restrição `ck_round_result` previa `result BETWEEN 0 AND 2`, falhando ao tentar gravar rodadas interrompidas com status `Inconclusive = 3`.
   - *Resolução*: Constraint atualizada para `result BETWEEN 0 AND 3`.
3. **Geração Autônoma de IDs**:
   - *Ocorrência*: O store em memória gerava IDs caso o cliente não os enviasse, mas o store relacional esperava IDs já preenchidos.
   - *Resolução*: Implementada a geração de IDs com prefixos semânticos (`evt-`, `proj-`, `judge-`) nos métodos `AddEvent`, `AddProject` e `AddJudge`.
4. **Idempotência de Suítes de Testes**:
   - *Ocorrência*: Suítes de teste de fases anteriores que esperavam banco limpo falhavam devido a dados persistidos por testes anteriores.
   - *Resolução*: Adicionadas rotinas de reset de estado no setup dos testes automatizados.
