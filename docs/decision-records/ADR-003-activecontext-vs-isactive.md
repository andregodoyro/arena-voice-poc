# ADR-003: ActiveContext vs IsActive (Desacoplamento do Estado de Sessão das Entidades de Domínio)

## Status
Aceito (Fase 2, Milestone 2A)

## Contexto
Na modelagem da Fase 2, precisávamos representar qual evento e qual projeto de startup estão atualmente no palco em exibição.

Uma abordagem comum é adicionar flags booleanas nas entidades: `Event.IsActive` e `Project.IsActive` (ou `IsCurrent`). No entanto, isso gera sérios problemas de concorrência e integridade referencial:
- Para ativar um projeto, é necessário percorrer todo o catálogo para definir `IsCurrent = false` nos demais, sob risco de múltiplos projetos ficarem marcados como ativos simultaneamente caso ocorra uma falha parcial ou condição de corrida.
- Mistura metadados duradouros da entidade (título, descrição, ordem) com o estado volátil e temporal da sessão de palco.

## Decisão
Desacoplou-se o estado de tempo de execução da entidade de domínio criando o registro específico **`ActiveContext`**:
```csharp
public record ActiveContext
{
    public string? CurrentEventId { get; init; }
    public string? CurrentProjectId { get; init; }
    public DateTimeOffset LastUpdated { get; init; }
}
```
- A determinação do evento ativo ocorre **exclusivamente via `ActiveContext.CurrentEventId`**.
- A determinação do projeto ativo no palco ocorre **exclusivamente via `ActiveContext.CurrentProjectId`**.
- As entidades `Event` e `Project` possuem apenas seu ciclo de vida natural (`EventStatus`: `Draft`, `Active`, `Completed`; e `ProjectStatus`: `Pending`, `Current`, `Completed`, `Disqualified`).
- No `ArenaProjectStore`, as mutações em `ActiveContext` são sincronizadas atomicamente sob um bloco `lock (_contextLock)`.

## Consequências

### Positivas
- **Garantia de Singularidade:** Impossível haver dois projetos ou eventos marcados como ativos ao mesmo tempo.
- **Rastreabilidade:** A propriedade `LastUpdated` provê auditoria imediata de quando ocorreu a última alternância de palco.
- **Simplicidade de Consulta:** O método `GetCurrentProject()` resolve o objeto ativo diretamente através do ponteiro do contexto.

### Negativas / Desafios
- Exige sincronização bidirecional do status na entidade para fins de histórico (`Project.Status = Current` e `PresentationStartedAt`), o que é gerenciado pelo método `SelectProject` do store.
