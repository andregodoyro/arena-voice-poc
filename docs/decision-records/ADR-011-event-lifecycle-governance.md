# ADR-011: Event Lifecycle Governance & Non-Destructive Activation (Governança do Ciclo de Vida de Eventos e Ativação Não-Destrutiva)

## Status
Aceito (Fase 3, Milestone 3A — Event Lifecycle & Management)

## Contexto
Antes do Milestone 3A, o Arena Voice possuía um modelo binário simplificado de eventos: um único evento ativo de natureza fixa, configurado diretamente via `PUT /api/events/current`. Esse modelo funcionava para a prova de conceito, mas apresentava limitações críticas ao ser projetado para uso operacional real em múltiplos eventos e edições:

1. **Sem histórico de eventos:** A plataforma não tinha capacidade de registrar edições anteriores, configurações passadas ou reutilizar estruturas de evento em novas edições.
2. **Ausência de estados intermediários:** A operação precisava de estágios como "Pronto para ativar" (configurado mas aguardando) e "Encerrado" (finalizado mas preservado no histórico) além do simples "Ativo".
3. **Risco de perda de dados em trocas de evento:** Se o operador precisasse carregar um novo evento no palco, o evento anterior perdia sua referência no sistema.
4. **Conflito entre edição e ativação:** Sem separação, a API de edição (`PUT`) aceitava qualquer campo — incluindo `status: Active` — podendo promover um evento para ativo de forma não-atômica e concorrentemente insegura.

A plataforma precisava de uma governança formal de ciclo de vida que preservasse a reversibilidade operacional e suportasse a operação em eventos sequenciais sem perda de dados históricos.

## Problema
Como modelar o ciclo de vida de um evento de forma que:
- Apenas 1 evento esteja ativo na arena física em qualquer momento;
- A ativação seja atômica e segura contra condições de corrida;
- Eventos anteriores não sejam destruídos ao ativar um novo;
- Operadores possam preparar, encerrar e arquivar eventos de forma controlada e rastreável;
- A edição de metadados e branding seja estritamente separada da ativação.

## Decisão
Implementação de um **ciclo de vida formal de 5 estados** para eventos, com ativação atômica não-destrutiva e separação canônica entre edição e ativação:

### Estados Formais (`EventStatus`)
```
Draft (0)    → evento em preparação, não apto para o palco
Ready (1)    → configurado e pronto, aguardando momento de ir ao palco
Active (2)   → único evento presente na arena física no momento
Finished (3) → encerrado formalmente, disponível para consulta histórica
Archived (4) → arquivado permanentemente, oculto do catálogo operacional ativo
```

### Regras de Transição
- `Draft` → `Ready` → `Active` → `Finished` → `Archived` (fluxo principal)
- Qualquer estado (exceto `Active` e `Archived`) pode ir diretamente para `Archived`
- **`Active` não pode ser arquivado diretamente** — requer encerramento explícito antes

### Ativação Atômica Não-Destrutiva
- O endpoint `POST /api/events/{id}/activate` é o **único caminho oficial** para promover um evento para `Active`
- Na ativação, o evento atualmente ativo (se existir) é automaticamente retornado para `Ready` (e não para `Finished`), preservando a reversibilidade
- A ativação redefine o `ActiveContext`, reseta as cadeiras para 0° e emite `ActiveEventChanged`, `EventBrandingUpdated` e `ChairsReset` via SignalR — tudo dentro de um único lock thread-safe

### Separação Canônica entre Edição e Ativação
- `PUT /api/events/{id}` permite editar metadados, branding e configurações de timer
- `PUT` **não aceita** o campo `status: Active` — qualquer tentativa retorna `HTTP 400 Bad Request` com mensagem explicativa
- A promoção para `Active` é exclusiva de `POST /api/events/{id}/activate`

### Correção Pós-3A: Edição de Evento Ativo
Durante validação funcional, identificou-se que o frontend enviava `status: Active` no payload do `PUT` ao editar um evento já ativo (refletindo o estado atual). O backend rejeitava a operação como tentativa de promoção ilegal. A correção estabeleceu que:
- O backend ignora o campo `status` quando ele é igual ao estado corrente do evento
- O frontend foi ajustado para não incluir `status` no payload de edições de metadados

### Proteções Adicionais
- Arquivamento de evento ativo: `HTTP 409 Conflict` com mensagem contextual
- Duplicação segura: `POST /api/events/{id}/duplicate` clona a estrutura completa em novo evento `Draft`

## Consequências

### Positivas
- **Reversibilidade operacional total:** O operador pode trocar o evento ativo sem destruir o estado do anterior.
- **Rastreabilidade histórica:** Todos os eventos, em todos os estados, permanecem acessíveis via catálogo com filtros por status.
- **Segurança contra promoções acidentais:** A separação PUT/POST/activate elimina promoções não intencionais via edição de formulários.
- **Thread-safety garantida:** Toda mutação do `ActiveContext` ocorre dentro de bloqueios (`lock`) no `ArenaProjectStore`.

### Negativas / Desafios
- O operador deve aprender que a ativação e a edição são ações distintas com endpoints diferentes.
- O catálogo de eventos pode crescer indefinidamente em memória — mitigado no futuro pela Fase 8 (Persistência).

## Alternativas Consideradas

| Alternativa | Motivo da Rejeição |
| :--- | :--- |
| **Modelo binário com `IsActive` booleano** | Sem histórico de estados; impossível distinguir "pronto" de "encerrado". |
| **Apagar evento ativo ao criar novo** | Perda irreversível de dados históricos e configurações de branding. |
| **Aceitar `status: Active` via `PUT`** | Permitiria promoções não-atômicas e concorrentemente inseguras; viola o princípio de atomicidade. |
| **Único evento global fixo** | Incompatível com suporte a múltiplas edições e reutilização da plataforma. |

## Motivos da Escolha
- O modelo de 5 estados espelha o vocabulário operacional real do evento (preparar → ativar → encerrar → arquivar).
- A ativação atômica elimina a categoria de erros de estado inconsistente mais crítica em sistemas de evento ao vivo.
- A não-destruição garante a reversibilidade necessária para operações com múltiplos blocos de apresentações em um mesmo dia.

## Impacto Futuro
- **Fase 4 (Scorecards):** O ciclo de vida do evento será o contexto de agrupamento dos scorecards e relatórios de banca.
- **Fase 8 (Persistência):** O modelo de 5 estados será mapeado diretamente para a coluna `status` do esquema relacional de eventos.
- **Fase 9 (Analytics):** O filtro por status (`?status=Finished`) viabiliza consultas analíticas de edições históricas.
