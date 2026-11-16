# Decisões Arquiteturais — Milestone 4C
## Operational Audit Trail & Event Sourcing Leve

> **Projeto:** Arena Voice / Arena de Inovação  
> **Fase:** Fase 4 — Platform Reliability & Data Resilience  
> **Marco:** Milestone 4C — Operational Audit Trail & Event Sourcing Leve  
> **Status:** ✅ CONSOLIDADO E APROVADO  
> **Data:** 16 de Novembro de 2026  

---

## Registro de Decisões Aprovadas

### 1. ADR-022: Segregação de Visibilidade da Timeline de Auditoria
* **Status:** Aceito e homologado nas camadas de backend e frontend.
* **Decisão:** Separar rigorosamente eventos de negócio/operacionais dos eventos técnicos de recuperação periódica do Snapshot Pattern (`RecoveryCheckpointCreated`) e sincronização pontual de sessão (`ActiveSessionUpdated`).
* **Implementação na API:** Endpoints de timeline (`GET /api/audit`, `GET /api/audit/project/{id}`, `GET /api/audit/event/{id}`) retornam exclusivamente eventos de negócio por padrão (`includeTechnical = false`). A inclusão de dados de infraestrutura exige opt-in explícito (`includeTechnical=true`).
* **Implementação no Frontend:** O cliente [`auditApi.js`](../../frontend/src/api/auditApi.js) e o bootstrap do [`OperatorContext.jsx`](../../frontend/src/contexts/OperatorContext.jsx) fixam `includeTechnical: false` por padrão, garantindo alto signal-to-noise ratio para o operador de palco.

### 2. Padrão CQRS Leve com Canal Assíncrono Desacoplado
* **Decisão:** A escrita da auditoria não pode bloquear as rotinas transacionais em memória nem atrasar os disparos de broadcast SignalR ou respostas HTTP dos botões arcade ESP32.
* **Mecanismo:** Utilização de `System.Threading.Channels.Channel<AuditEventRecord>` bounded em 10.000 mensagens com escrita assíncrona não bloqueante. O consumo e gravação em disco são realizados pelo Hosted Service `AuditEventWriter` em background através de contextos instanciados efemeramente por `IDbContextFactory<ArenaDbContext>`.
* **Separação de Leitura:** A camada de leitura (`AuditQueryService`) consulta diretamente a tabela `audit_events` com consultas compiladas `AsNoTracking()` e projeção em DTOs imutáveis, eliminando contenção com o pipeline de escrita.

### 3. Modelo Híbrido de Re-hidratação de Timeline no Frontend (ADR-002 Snapshot First)
* **Decisão:** O histórico exibido na interface deve ser durável (sobrevivência ao F5) sem perder a fluidez instantânea da conexão SignalR.
* **Mecanismo:** No carregamento inicial do `OperatorProvider`, a aplicação executa `GET /api/audit?pageSize=30&includeTechnical=false` e mapeia as entradas via `mapAuditEventToActivityItem`. Conforme novos eventos ocorrem via SignalR, eles são integrados no topo do feed com chave de desduplicação e timestamp, mantendo o feed consistente e fluido.
