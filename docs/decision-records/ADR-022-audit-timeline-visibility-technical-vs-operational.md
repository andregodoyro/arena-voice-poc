# ADR-022: Segregação de Visibilidade da Timeline de Auditoria (Eventos Operacionais vs. Técnicos)

## Status
Aceito (Homologado no Milestone 4C.4)

## Data
2026-11-11

## Contexto
Durante o desenvolvimento do Milestone 4C, a infraestrutura assíncrona de Audit Trail passou a persistir na tabela `audit_events` todos os eventos decorrentes de mutações de domínio no Arena Voice.

A auditoria da base de dados após a execução da suíte de testes revelou que dos primeiros ~900 eventos registrados:
- `RecoveryCheckpointCreated` corresponde a aproximadamente **38%** de todas as tuplas gravadas;
- `ActiveSessionUpdated` também representa um volume considerável de registros operacionais de baixa granularidade (sincronização de ponteiro de sessão).

Cada pulso de persistência do Snapshot Pattern (`PersistSnapshot`), acionado a cada mudança de estado da rodada, ajuste de cronômetro ou virada de cadeira, gera um registro de checkpoint de recuperação. Embora esses registros sejam vitais para **forense de sistema, resiliência de crash recovery e recuperação de falhas**, expô-los indiscriminadamente na linha do tempo principal causa poluição visual severa. Operadores de palco, jurados, diretores de evento e integrações de visualização necessitam de uma timeline de negócio legível (ex: saber quando o pitch começou, quando as cadeiras viraram, quem pausou o timer e quando a rodada encerrou), sem que cada ação seja soterrada por dezenas de checkpoints técnicos do motor de persistência.

## Decisão

Adotar a **Segregação de Visibilidade com Ocultação Padrão de Eventos Técnicos**:

1. **Classificação em Duas Categorias de Eventos:**
   - **Eventos Operacionais / de Negócio:** Mudanças que representam marcos funcionais e de domínio na dinâmica da arena:
     - Eventos: `EventCreated`, `EventUpdated`, `EventDeleted`, `EventActivated`, `EventArchived`
     - Projetos: `ProjectCreated`, `ProjectUpdated`, `ProjectDeleted`, `ProjectActivated`, `ProjectCompleted`
     - Júri: `JudgeAssigned`, `JudgeUnassigned`
     - Pitch: `PitchStarted`, `PitchPaused`, `PitchResumed`, `PitchCompleted`, `PitchExpired`, `PitchTransitioned`
     - Cadeiras: `ChairPressed`, `ChairReset`
   - **Eventos Técnicos / de Infraestrutura:** Mensagens de estado interno emitidas por subsistemas automatizados de resiliência:
     - `RecoveryCheckpointCreated` (checkpoints periódicos e atômicos do snapshot recovery)
     - `ActiveSessionUpdated` (sincronização pontual de ponteiro ativo de sessão)

2. **Comportamento Padrão da Camada de Consulta (`AuditQueryService`):**
   - As consultas de timeline (`GET /api/audit`, `GET /api/audit/project/{id}`, `GET /api/audit/event/{id}`, `GET /api/audit/session`) **ocultam por padrão** eventos técnicos (`includeTechnical = false`).
   - A ordenação cronológica padrão é sempre decrescente (`occurred_at DESC, id DESC`).

3. **Exibição Sob Demanda (`includeTechnical=true`):**
   - Parâmetro explícito de query string `?includeTechnical=true` permite a ferramentas de diagnóstico, engenheiros de confiabilidade (SRE) e telas de depuração visualizar 100% dos eventos registrados, sem qualquer perda de auditoria.
   - Caso o consumidor filtre explicitamente por um tipo técnico (ex: `?eventType=RecoveryCheckpointCreated`), o filtro explícito tem precedência e os registros são retornados normalmente.

4. **Preservação Integral da Escrita:**
   - O pipeline de escrita (`IAuditEventPublisher` -> `Channel` -> `AuditEventWriter` -> PostgreSQL) permanece **100% agnóstico e completo**. Nenhuma filtragem ou descarte ocorre na gravação: todos os checkpoints continuam sendo fielmente gravados na tabela `audit_events`.

## Consequências

### Positivas
- **Alto Signal-to-Noise Ratio:** As interfaces de usuário e APIs consomem uma história limpa e inteligível do evento ao vivo, sem centenas de linhas repetitivas de checkpoints de recuperação.
- **Eficiência de Consulta e Rede:** Redução imediata de ~40% no volume de dados trafegados nas requisições padrão de timeline.
- **Fidelidade Histórica Absoluta:** O banco de dados preserva o rastro completo de recuperação em caso de auditoria pós-incidente ou perícia de falha elétrica/crash.
- **CQRS Limpo:** A regra de filtragem reside exclusivamente na camada de leitura (`AuditQueryService`), sem acoplamento com o domínio de escrita.

### Negativas / Mitigações
- Operadores técnicos que necessitarem inspecionar a cadência de checkpoints precisarão incluir explicitamente `includeTechnical=true` em suas consultas. Esta exigência foi documentada na especificação da API e implementada de forma explícita na suíte de testes.
