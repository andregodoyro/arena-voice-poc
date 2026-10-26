# ADR-005: Project Selection Lifecycle (Transição Atômica e Idempotente de Apresentações de Palco)

## Status
Aceito (Fase 2, Milestone 2B)

## Contexto
Na dinâmica do Arena Voice, apenas um projeto/startup pode se apresentar no palco por vez. A troca de projeto envolve atualizar múltiplas propriedades temporais e relacionais:
- Concluir a apresentação do projeto que estava no palco.
- Iniciar a contagem de tempo da nova startup.
- Garantir que requisições concorrentes ou duplo-cliques do operador não deixem projetos com status inconsistente.

## Decisão
Implementou-se o método atômico e idempotente `SelectProject(string projectId)` no `ArenaProjectStore`, consumido pelo endpoint `POST /api/projects/{id}/select`:
1. **Proteção por Lock:** Toda a operação ocorre sob `lock (_contextLock)`.
2. **Idempotência Estrita:** Se o projeto solicitado já for o ativo (`_currentProjectId == projectId`), a chamada retorna sucesso imediato (`HTTP 200 OK`) sem alterar `PresentationStartedAt` nem reexecutar transições.
3. **Validação de Pertinência de Evento:** Apenas projetos pertencentes ao evento ativo (`EventId == _currentEventId`) podem ser selecionados; caso contrário, a API rejeita com `HTTP 400 Bad Request`.
4. **Ciclo de Vida Automático:**
   - O projeto anterior tem seu status alterado para `ProjectStatus.Completed` (2) e o campo `PresentationEndedAt` preenchido com `DateTimeOffset.UtcNow`.
   - O novo projeto tem seu status alterado para `ProjectStatus.Current` (1) e `PresentationStartedAt` preenchido.
   - Os ponteiros `_currentProjectId`, `_currentEventId` e `_lastUpdated` são sincronizados.
5. **Broadcast:** Dispara o evento SignalR `CurrentProjectChanged` contendo o novo projeto e o ID do projeto anterior.

## Consequências

### Positivas
- **Integridade Temporal:** Rastreabilidade precisa da duração dos pitches para auditoria e cronômetro.
- **Tolerância a Duplo-Clique:** A interface do operador e o telão não quebram caso o botão "Chamar ao Palco" seja pressionado repetidas vezes.
- **Consistência em Memória:** Impossibilidade matemática de dois projetos coexistirem no estado `Current` dentro do mesmo evento.

### Negativas / Desafios
- O endpoint `select` gerencia exclusivamente a troca do projeto ativo; ele não força automaticamente o reset mecânico das cadeiras físicas, mantendo a autoridade do operador sobre o momento de acionar `POST /api/reset`.
