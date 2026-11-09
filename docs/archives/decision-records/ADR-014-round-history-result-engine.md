# ADR-014: Immutable Round History & Two-Tier Result Engine (Histórico Imutável de Rodadas e Motor de Resultado em Dois Níveis)

## Status
Aceito (Fase 3, Milestone 3D — Round History & Result Engine)

## Contexto
Após a implementação da máquina de estados do pitch (3B) e do lockout temporal (3C), a plataforma possuía a dinâmica ao vivo de uma apresentação mas sem memória histórica: ao encerrar uma rodada, o resultado era descartado e o estado da arena voltava a zero para o próximo pitch.

Dois problemas críticos decorriam disso:

1. **Ausência de registro auditável:** Não havia como consultar quais projetos foram apresentados, quantos votos cada um recebeu ou qual foi o resultado formal de cada rodada durante o evento.
2. **Resultado de rodada sem classificação formal:** O sistema sabia quantas cadeiras estavam viradas, mas não computava formalmente se o projeto foi "aprovado" ou "rejeitado" conforme as regras do evento.

Adicionalmente, a decisão de classificação precisava cobrir dois ângulos semânticos distintos:
- **O veredito binário do projeto** (foi aceito pela banca?)
- **A qualidade do apoio recebido** (unanimidade, maioria, minoria, nenhum voto?)

Esses dois ângulos possuem usos diferentes: o veredito binário é o resultado operacional imediato; a qualidade do apoio é a dimensão analítica e histórica. Colapsá-los em um único campo empobreceria ambos os usos.

## Problema
Como arquivar o resultado de uma rodada de forma que:
- O snapshot seja imutável e nunca alterado por operações futuras;
- O resultado seja classificado em duas dimensões ortogonais (veredito + qualidade);
- O arquivamento seja protegido contra disparo duplo (idempotente);
- O histórico seja consultável em tempo real pelo cockpit do operador;
- A composição nominal da banca no momento da votação seja preservada junto ao resultado;
- A fundação permita extensões futuras (scorecards, analytics, relatórios) sem retrabalho.

## Decisão
Implementação de um **sistema de arquivamento imutável de rodadas** (`RoundHistoryEntry`) acionado ao encerrar a apresentação, com um **Result Engine de dois níveis** de classificação independentes.

### Estrutura do Snapshot Imutável (`RoundHistoryEntry`)
```csharp
RoundHistoryEntry {
    Id                  // Guid — identificador único da entrada
    EventId             // Referência ao evento no momento da rodada
    EventName           // Nome do evento (snapshot — imutável)
    ProjectId           // Referência ao projeto apresentado
    ProjectTitle        // Título do projeto (snapshot — imutável)
    ProjectTeam         // Equipe do projeto (snapshot — imutável)
    StagesHistory       // Lista de estágios percorridos com timestamps
    JurySnapshot        // Composição nominal da banca: chairId → { name, role, company }
    ChairsSnapshot      // Estado final de cada cadeira: chairId → bool (virada ou não)
    VoteCount           // Número total de cadeiras viradas (0–5)
    Result              // Enum: Approved | Rejected | Inconclusive
    ApprovalMode        // Enum: Unanimous | Majority | Minority | None
    ArchivedAt          // Timestamp de arquivamento (UTC)
}
```

Todos os campos de texto (nomes, cargos, equipes) são copiados por valor no momento do arquivamento. Alterações futuras nos cadastros não retroagem sobre o histórico.

### Result Engine — Dois Níveis de Classificação

#### Nível 1: `Result` (Veredito Binário)
```
Approved    → 3 ou mais votos (≥ 60% de banca de 5 cadeiras)
Rejected    → 2 ou menos votos (< 60%)
Inconclusive→ encerramento atípico sem apuração regular do ciclo completo
```

#### Nível 2: `ApprovalMode` (Qualidade do Apoio)
```
Unanimous   → 5 votos (100% da banca)
Majority    → 3 ou 4 votos (maioria qualificada/simples)
Minority    → 1 ou 2 votos (minoria)
None        → 0 votos
```

**Separação intencional dos dois níveis:**
- `Result` responde "o projeto passou?" — usado para tomada de decisão operacional imediata.
- `ApprovalMode` responde "com que força o projeto foi aprovado (ou rejeitado)?" — usado para analytics, ranking, comparação histórica e, futuramente, critérios de desempate.
- Um projeto `Rejected` com `ApprovalMode.Minority` (2 votos) é diferente de um `Rejected` com `ApprovalMode.None` (0 votos) — distinção relevante para relatórios e feedback à equipe.
- Um projeto `Approved` com `ApprovalMode.Unanimous` (5 votos) merece celebração especial no telão — o staging de efeitos visuais pode usar `ApprovalMode` independentemente de `Result`.

### Gatilho de Arquivamento
O arquivamento é invocado automaticamente em dois momentos:
1. **Transição para `Finished`:** Via `POST /api/pitch/transition` com `TargetStage = Finished`
2. **Encerramento de evento com pitch em andamento:** Via `POST /api/events/{id}/finish` — garante que nenhuma rodada seja perdida por encerramento abrupto

### Proteção Idempotente Contra Duplo Arquivamento
Um `HashSet<string>` de `roundIds` já arquivados é mantido em memória. Antes de arquivar, o sistema verifica se o `roundId` (derivado do `ProjectId` + `EventId` + timestamp de início) já consta no set. Em caso positivo, o arquivamento é silenciosamente ignorado. Isso protege contra condições de corrida em que `finish` e `close-event` sejam chamados concorrentemente.

### Sincronização em Tempo Real
- Evento `RoundArchived` via SignalR notifica imediatamente todos os clientes conectados com o resultado computado
- O cockpit do operador exibe a aba `/operator/history` com lista expansível de rodadas arquivadas, resultado por projeto e composição da banca

### Endpoints de Consulta
- `GET /api/history`: Lista consolidada de todas as rodadas arquivadas
- `GET /api/history/{id}`: Snapshot completo de uma rodada específica

## Consequências

### Positivas
- **Auditabilidade completa:** Cada rodada fica registrada com snapshot de quem votou, em que cadeira, qual era a banca e qual foi o resultado.
- **Fundação analítica:** O modelo de dois níveis (`Result` + `ApprovalMode`) suporta diretamente os requisitos de analytics e relatórios das fases futuras.
- **Imutabilidade garantida:** O resultado de uma rodada não pode ser alterado por operações subsequentes (mudanças de cadastro de jurado, exclusão de projeto, etc.).
- **Proteção contra duplo arquivamento:** O mecanismo idempotente elimina a categoria de bugs mais comum em fluxos de encerramento concorrentes.

### Negativas / Desafios
- O histórico em memória é volátil — reinicializações do backend apagam o histórico. Mitigado pela Fase 8 (Persistência).
- O `RoundHistoryEntry` cresce com o evento — sem paginação, eventos com muitas rodadas podem gerar payloads grandes no `GET /api/history`.

## Alternativas Consideradas

| Alternativa | Motivo da Rejeição |
| :--- | :--- |
| **Resultado com apenas um campo (ex: `resultLabel: "Aprovado por Maioria"`)** | String não é tipada; perde semântica para código; impossível de comparar/filtrar programaticamente em analytics. |
| **Arquivamento mutável (permitir edição posterior do resultado)** | Viola a finalidade de auditoria histórica; cria risco de adulteração de resultados em eventos corporativos formais. |
| **Único nível de classificação (Approved/Rejected/Unanimous)** | Colapsa dois eixos semânticos independentes; impede ranking por qualidade de apoio e celebração granular no telão. |
| **Arquivamento apenas manual (operador confirma)** | Ponto de falha operacional; operador sob pressão pode esquecer de arquivar e o resultado é perdido. |
| **Invocar Result Engine apenas no fechamento de evento** | Perde a capacidade de exibir o resultado imediatamente ao final de cada pitch; degrada a experiência do evento ao vivo. |

## Motivos da Escolha
- O modelo de snapshot imutável com dois níveis de classificação é a representação mais completa e duradoura de um resultado de banca corporativa.
- A separação `Result` / `ApprovalMode` foi validada como necessária ao antecipar os requisitos de Fase 9 (Relatórios): um relatório de evento precisa distinguir "aprovados por unanimidade" de "aprovados por maioria simples" para gerar rankings e recomendações.
- A proteção idempotente é uma salvaguarda de produção essencial para sistemas onde múltiplos eventos assíncronos podem convergir no mesmo ponto de encerramento.

## Impacto Futuro
- **ADR-015 (Jury):** O `JurySnapshot` no `RoundHistoryEntry` integra os nomes dos jurados alocados via `EventJuryAssignment`, tornando o registro da rodada nominalmente identificado.
- **Fase 4 (Scorecards):** Scorecards individuais de jurados serão associados ao mesmo `RoundHistoryEntry` via `roundId`, estendendo o snapshot sem alterá-lo.
- **Fase 9 (Analytics & Relatórios):** `Result` e `ApprovalMode` são os campos primários para ranking geral de projetos, cálculo de médias e geração de relatórios em CSV/PDF.
- **Fase 8 (Persistência):** O `RoundHistoryEntry` mapeia diretamente para uma tabela relacional com `Id` como chave primária e `ChairsSnapshot`/`JurySnapshot` como colunas JSON.
