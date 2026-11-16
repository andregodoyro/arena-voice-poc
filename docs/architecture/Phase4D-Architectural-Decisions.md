# Decisões Arquiteturais — Milestone 4D
## Automated Snapshots, Backup & Disaster Recovery

> **Projeto:** Arena Voice / Arena de Inovação  
> **Fase:** Fase 4 — Platform Reliability & Data Resilience  
> **Marco:** Milestone 4D — Automated Snapshots, Backup & Disaster Recovery  
> **Status:** ✅ CONSOLIDADO E APROVADO  
> **Data:** 16 de Novembro de 2026  

---

## Registro de Decisões Aprovadas

### 1. ADR-023: Estratégia do BackupOrchestrator e Execução Isolada de Processos
* **Contexto:** A plataforma necessita produzir cópias de segurança confiáveis do cluster PostgreSQL Portable sem interromper a execução da arena, sem introduzir travas nas tabelas e com garantia de portabilidade entre ambientes locais (notebook corporativo) e futuros ambientes de nuvem.
* **Decisão:** Utilizar a ferramenta canônica `pg_dump` executada via processo isolado do sistema operacional (`System.Diagnostics.Process`), acionada de forma desacoplada através de um canal em segundo plano (`System.Threading.Channels.Channel<BackupRequest>` processado por `BackupWorker`). O formato adotado é o custom compressed (`-Fc`), que encapsula esquema, catálogo TOC e dados com taxa de compressão superior a 85%.
* **Consequências:**
  - Desacoplamento total do hot-path: o tempo de resposta da API para comandos do operador e arquivamento de rodada permanece em poucos milissegundos (< 10ms de overhead).
  - Integridade transacional sem locks bloqueantes em leituras ou escritas.
  - Filesystem como fonte da verdade (`backups/`), eliminando complexidade e fragilidade de bancos secundários de metadados de backup.

---

### 2. ADR-024: Estratégia de Gatilho de Backup (RoundArchived vs. Periodic Timer)
* **Contexto:** Em um evento corporativo ao vivo, backups periódicos baseados em tempo (ex: cron a cada 5 ou 10 minutos) criam riscos de contenção de CPU e I/O exatamente durante a execução de um pitch ou momento de tensão cênica de votação. Além disso, backups baseados em tempo podem capturar estados intermediários incompletos ou não garantir a persistência imediata de uma rodada recém-concluída.
* **Decisão:** Adotar uma estratégia orientada estritamente a eventos de domínio (**Domain-Driven Trigger**): cada rodada oficialmente concluída e arquivada (`RoundArchived`) dispara automaticamente uma solicitação de snapshot assíncrono nomeado com o índice sequencial da rodada (`round_{N}_{timestamp}.pgdump`).
* **Consequências:**
  - **RPO = 0 garantido:** Nenhuma rodada arquivada é perdida.
  - Zero I/O desnecessário durante apresentações em andamento (o backup ocorre no intervalo natural entre apresentações).
  - Rastreabilidade total via Audit Trail: cada snapshot registra eventos `AutoSnapshotTriggered`, `AutoSnapshotCreated` ou `AutoSnapshotFailed` correlacionados ao ID da rodada.

---

### 3. ADR-025: Arquitetura de Disaster Recovery e Restauração Fora do Processo (Out-of-Process Restore)
* **Contexto:** A restauração de dados precisa ser rápida (RTO < 30s) e à prova de falhas. Uma restauração a quente ("in-flight") via endpoint HTTP contra o próprio processo em execução causaria conflitos severos de conexões ativas nos pools do Npgsql/EF Core, locks de tabelas e, criticamente, tornaria os estados em memória (cache e instâncias singleton do `PostgresArenaProjectStore`) inconsistentes em relação ao banco físico recém-restaurado.
* **Decisão:** A restauração física é realizada estritamente **fora do processo da aplicação (Out-of-Process)** através de script utilitário (`scripts\restore-backup.cmd` / `scripts\restore-backup.cjs`) que aciona o binário nativo `pg_restore` com opções de idempotência (`--clean --if-exists`). O fluxo de recuperação exige o ciclo: **Parar Backend $\rightarrow$ Restaurar Banco $\rightarrow$ Iniciar Backend**.
* **Consequências:**
  - **Zero lock de conexões:** O PostgreSQL Portable aceita a limpeza e recriação dos objetos sem rejeições por sessões abertas.
  - **Reidratação automática perfeita:** Ao inicializar, o backend executa `RehydrateSessionState()`, recompondo 100% da sessão ativa, projetos, jurados e timeline de auditoria a partir da base restaurada.
  - Operação simples, sem telas complexas ou endpoints perigosos de restore expostos em rede.
