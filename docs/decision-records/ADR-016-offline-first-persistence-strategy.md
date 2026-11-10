# ADR-016: Offline-First Embedded Persistence Strategy (Estratégia de Persistência Incorporada Offline-First com SQLite)

## Status
Aceito (Fase 4 — Planejamento Arquitetural de Confiabilidade de Plataforma)

## Contexto
Durante as Fases 1 a 3, a plataforma Arena Voice operou com estado volátil armazenado exclusivamente na memória do processo .NET (`ArenaProjectStore`). Essa abordagem foi intencional e altamente eficaz para acelerar a validação da prova de conceito, modelagem de domínio e entrega de 5 motores de negócio (Event Lifecycle, Pitch Lifecycle, Timers, Round History e Banca de Jurados), culminando em 466 testes automatizados aprovados.

No entanto, para a entrada em **eventos presenciais reais** (Demo Days corporativos, Hackathons, convenções de inovação), a volatilidade da memória RAM tornou-se o principal risco operacional do projeto:
- Uma queda de energia, encerramento acidental do processo ou falha do sistema operacional no notebook da mesa técnica resultaria na **perda irreversível de todos os eventos, projetos, votos e histórico de rodadas já apurados**.
- O sistema opera tipicamente em **notebook corporativo Windows único**, frequentemente sob políticas rígidas de TI (sem privilégios de administrador, sem suporte a Docker Desktop/WSL2, portas de rede restritas por firewall e proxy).
- O ambiente do evento ao vivo opera em **rede local autônoma (hotspot Wi-Fi 2.4 GHz)**, onde a internet externa é instável, congestionada pelo público ou inexistente.

A plataforma necessitava de uma estratégia definitiva de persistência que garantisse **Zero Data Loss**, recuperação instantânea pós-queda e independência total de conexão externa ou instalações complexas.

## Problema
Qual tecnologia e padrão arquitetural de persistência devem ser adotados para garantir que:
1. Os dados da arena sobrevivam a falhas de processo e quedas de energia (ACID / Crash-Safety);
2. A aplicação opere com **zero dependência de internet** durante o evento ao vivo (100% Offline-First);
3. A instalação seja **autocontida (Zero Setup)**, funcionando em máquinas corporativas sem demandar direitos de administrador ou serviços de fundo (background services);
4. O backup e a recuperação de desastres sejam triviais (ex: copiar um único arquivo para pendrive de contingência);
5. Os 466 testes automatizados continuem rápidos, determinísticos e executáveis em qualquer ambiente;
6. A migração não quebre nenhum dos 34 contratos REST, 9 eventos SignalR ou componentes do frontend.

## Decisão
Adota-se o **SQLite incorporado (via biblioteca oficial `Microsoft.Data.Sqlite` e SQL parametrizado/Dapper)** como o motor canônico de persistência local da Arena Voice, operando sob o padrão de Repositório (`SqliteArenaProjectStore`) que substitui transparentemente o armazenamento em memória.

### Diretrizes de Implementação

1. **Biblioteca Oficial e Execução In-Process:**
   - Utilização do pacote NuGet `Microsoft.Data.Sqlite`. O motor C do SQLite é compilado diretamente dentro do binário da aplicação .NET, sem serviços de background externos, sem dependência de portas TCP e sem instaladores Windows.

2. **Modo Write-Ahead Logging (WAL Mode):**
   - Na inicialização da conexão, o banco é configurado com:
     ```sql
     PRAGMA journal_mode = WAL;
     PRAGMA synchronous = NORMAL;
     PRAGMA busy_timeout = 5000;
     PRAGMA foreign_keys = ON;
     ```
   - O modo WAL permite que leituras simultâneas ocorram sem bloquear escritas e vice-versa, garantindo concorrência fluida entre requisições HTTP da API e emissões de eventos SignalR.

3. **Arquivo Único Local (`App_Data/arena_voice.db`):**
   - Toda a base de dados reside em um único arquivo no disco local. O backup a quente é atômico via comando nativo `VACUUM INTO 'backups/arena_backup.db'`, permitindo cópias consistentes para dispositivos externos (pendrive) sem necessidade de paralisar o servidor.

4. **Isolamento via Interface `IArenaProjectStore`:**
   - A Minimal API e os controladores SignalR continuam consumindo estritamente a interface `IArenaProjectStore`. A nova implementação `SqliteArenaProjectStore` encapsula toda a persistência relacional, mantendo intactos os contratos de entrada e saída.

5. **Crash Recovery Determinístico no Boot:**
   - Ao iniciar o backend, o sistema reidrata o `ActiveContext` a partir da tabela `ActiveSessionState`.
   - **Regra de Sanitização:** Caso o sistema tenha caído durante um pitch em andamento (`PitchRunning` ou `VotingOpen`), o estado é recuperado de forma segura reposicionando o pitch para `Waiting` com cadeiras físicas neutralizadas (0°), preservando integralmente o histórico de rodadas anteriores já arquivadas.

## Consequências

### Positivas
- **Zero Dependência Externa e Zero Setup:** Funciona imediatamente após download do repositório, em qualquer máquina Windows/Linux/macOS sem instalar PostgreSQL, Docker ou SQL Server.
- **Sobrevivência Transacional (ACID):** Quedas de energia não corrompem os dados; transições não commitadas sofrem rollback automático via WAL log.
- **Portabilidade Total de Dados:** O estado completo de uma convenção corporativa de 3 dias cabe em um único arquivo de poucos megabytes, facilitando auditoria, arquivamento e backups de contingência.
- **Performance Sub-Milissegundo:** Acesso direto a arquivo em disco local elimina a latência de rede e handshake de conexões TCP com bancos cliente-servidor.
- **Suporte Total a Testes Automatizados:** Testes podem instanciar bancos SQLite isolados em memória (`:memory:`) ou em arquivos temporários descartáveis, preservando a velocidade das suítes de teste.

### Negativas / Desafios
- **Bloqueio de Arquivo em Concorrência Extrema (Locks Windows):** No Windows, concorrência mal gerenciada pode disparar `database is locked`. Mitigado pela configuração de `busy_timeout = 5000ms`, connection pooling do ADO.NET e serialização de mutações sob lock thread-safe no repositório.
- **Não Suporta Escalar para Múltiplos Servidores Gravando Simultaneamente:** O SQLite é mono-servidor. Como o Arena Voice opera localmente em uma única máquina técnica por arena física, essa limitação não afeta o produto.

## Alternativas Consideradas

| Alternativa | Motivo da Rejeição |
| :--- | :--- |
| **JSON Snapshot em Disco** | Frágil contra corrupção em desligamento abrupto no meio do `File.WriteAllText`; sem suporte a transações ACID ou consultas relacionais indexadas. |
| **PostgreSQL Local (Serviço Windows)** | Inviável em notebooks corporativos restritos (exige permissões de administrador de TI, instalador pesado e serviço de fundo que pode ser bloqueado). |
| **PostgreSQL em Docker** | Inviável em máquinas corporativas sem licença/permissão de Docker Desktop ou WSL2; complexidade operacional desnecessária para um evento presencial. |
| **SQL Server Express / LocalDB** | Setup pesado (~1.5 GB), restrito a Windows e dependente de serviços locais de autenticação do SO. |
| **Supabase / Firebase (Cloud BaaS)** | Violação inegociável do princípio **Offline-First**. Se o link de internet do hotel/convenção cair por 5 segundos, a votação dos jurados falha. |
| **LiteDB (NoSQL Embedded)** | Boa opção, mas menos maduro que o SQLite, ecossistema menor e sem o padrão universal de migração SQL para o futuro. |

## Motivos da Escolha
- O SQLite é o motor de banco de dados embutido mais estável, testado e resiliente do mundo.
- Atende 100% aos requisitos de um evento corporativo presencial: funciona sem internet, sem admin de TI, sem Docker e sem instaladores.
- Garante proteção contra o único risco fatal da arquitetura atual: a perda de dados por reinicialização inesperada do servidor.

## Impacto Futuro
- **Fase 4 (Data Resilience):** Implementa o schema relacional, reidratação e backup a quente.
- **Fase 6 (Ranking e Relatórios):** Consultas analíticas SQL estruturadas permitirão apurar rankings e gerar atas executivas em milissegundos.
- **Escala Empresarial Futura:** Caso no futuro haja demanda de nuvem multi-arena, o esquema SQL já estará modelado, permitindo migração limpa para PostgreSQL sem reescrever regras de negócio.
