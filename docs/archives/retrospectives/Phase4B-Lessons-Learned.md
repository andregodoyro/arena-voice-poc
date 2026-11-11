# Lições Aprendidas — Milestone 4B
## State Persistence & Session Re-hydration

> **Projeto:** Arena Voice / Arena de Inovação  
> **Fase:** Fase 4 — Platform Reliability & Data Resilience  
> **Data:** 11 de Novembro de 2026  

---

## 1. Principais Desafios Encontrados

### 1.1. Separação de Locks e Reentrância Interna
- **Desafio:** Ao separar o lock de memória (`_contextLock`) da persistência em banco (`_dbPersistenceLock`), métodos utilitários internos que já rodavam dentro de um lock (como `ResetChairs()`) provocavam reentrância indevida e duplicação desnecessária de snapshots em disco.
- **Resolução:** Foi estabelecida uma convenção arquitetural rigorosa: métodos públicos (`ResetChairs`, `SelectProject`) adquirem o lock e persistem o snapshot; métodos auxiliares internos (`ResetChairsInternal`) operam estritamente sobre a memória sem reabrir locks nem persistir em disco.

### 1.2. Cálculo de Tempo Congelado sem Ticks em Disco
- **Desafio:** O teste automatizado de reidratação (`test-crash-rehydration.cjs`) aguardava 1.5s após iniciar o pitch e derrubava o backend abruptamente. Como nenhum evento ocorreu durante esse intervalo, o snapshot persistido ainda continha o timestamp inicial, resultando em 180s restantes em vez de < 180s.
- **Resolução:** Compreendeu-se que o tempo restante em caso de crash é rigorosamente indexado ao **último checkpoint operacional registrado**. Ao simular uma ação de jurado durante a apresentação (acionando uma cadeira a 1.5s), o checkpoint avançou e o sistema congelou precisamente no tempo daquela interação (178.4s), espelhando com fidelidade a dinâmica real de um palco.

---

## 2. Decisões Que se Provaram Altamente Eficazes

1. **Array Nativo `int[]` do PostgreSQL:** Evitou a criação de uma tabela intermediária `active_session_chairs`, reduzindo a complexidade de queries e mantendo o modelo enxuto e atômico.
2. **Snapshot Pattern Imutável (`record` C#):** Desacoplou completamente o tempo de resposta da Minimal API do tempo de I/O do PostgreSQL, preservando a experiência em tempo real dos WebSockets SignalR.
3. **Estratégia Paused Recovery:** A decisão de nunca retornar automaticamente para `Waiting` salva a integridade do espetáculo, permitindo que a mesa técnica retome uma apresentação interrompida com apenas um clique.

---

## 3. Recomendações Críticas para o Milestone 4C (Audit Trail & Event Sourcing)

1. **Evitar I/O Síncrono no Audit Trail:**
   O Milestone 4C introduzirá o registro imutável de eventos (audit log / event store). Recomenda-se aplicar o mesmo princípio do Snapshot Pattern: despachar os eventos de auditoria através de um canal em memória (`System.Threading.Channels.Channel<AuditEvent>`) consumido por um `BackgroundService` em lote, para que a gravação do log não impacte o loop de execução principal.
2. **Aproveitar o `LastCheckpointAt` para Correlação Temporal:**
   Os eventos de auditoria do 4C devem referenciar o `LastCheckpointAt` e os metadados de recovery gerados no 4B, permitindo identificar com precisão quando uma anomalia operacional foi contornada.
3. **Preservar a Suíte Central de Regressão:**
   Manter o script `tests/run-regression-suite.cjs` como portão obrigatório de qualidade para todos os marcos subsequentes da Fase 4.
