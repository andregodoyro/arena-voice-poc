# ADR-015: Decoupled Judge Identity & Event Jury Assignment (Desacoplamento da Identidade do Jurado e Alocação de Banca por Evento)

## Status
Aceito (Fase 3, Milestone 3E — Judge Catalog & Event Jury Assignment)

## Contexto
Antes do Milestone 3E, o sistema reconhecia cadeiras físicas (1 a 5) e acionamentos (`ChairTurned`), mas não tinha noção de **quem** estava sentado em cada cadeira. A cadeira era apenas uma posição lógica, não uma identidade.

Dois problemas surgiram ao expandir para operações com bancas nominais:

1. **Identidade fugaz:** Sem um cadastro global, jurados precisariam ser re-cadastrados a cada evento, tornando o uso da plataforma em múltiplas edições operacionalmente custoso.
2. **Acoplamento posicional:** Se a identidade do jurado fosse amarrada diretamente à cadeira (ex: `chair1Name = "Maria"`), a troca de posição entre eventos exigiria alteração estrutural, e o histórico de quem votou o quê ficaria dependente da posição, não da pessoa.

A solução precisava separar dois conceitos distintos:
- **Jurado** (identidade permanente: quem é a pessoa, sua empresa, seu cargo, sua especialidade)
- **Cadeira** (posição efêmera: onde a pessoa senta em um evento específico)

## Problema
Como modelar a identidade dos avaliadores de forma que:
- Jurados possam ser cadastrados uma única vez e reutilizados em múltiplos eventos;
- A alocação por cadeira seja específica ao evento, não global;
- O telão exiba nominalmente quem está em cada cadeira em tempo real;
- O acionamento de cadeira (`ChairTurned`) continue sendo o mecanismo soberano de votação sem depender da identidade do jurado;
- O histórico de rodadas registre permanentemente quem ocupava cada cadeira durante a votação;
- A fundação suporte extensões futuras (scorecards individuais, portal do jurado) sem retrabalho arquitetural.

## Decisão
Implementação de um **catálogo global de jurados (`Judge`)** desacoplado de um modelo de **alocação por evento (`EventJuryAssignment`)**, preservando `ChairTurned` como o mecanismo soberano e canônico de votação.

### Entidade `Judge` — Catálogo Global
```csharp
Judge {
    Id          // Guid — identificador permanente do jurado
    Name        // Nome completo
    Company     // Empresa / organização
    Role        // Cargo / função
    Specialty   // Especialidade ou área de avaliação
    Bio         // Biografia curta
    PhotoUrl    // URL da foto de perfil
    IsActive    // bool — indica se o jurado está ativo no catálogo
    Email       // E-mail de contato (campo preventivo para Fase 4)
}
```

**Decisões sobre `IsActive` e `Email`:** Esses campos foram adicionados preventivamente. `IsActive` permite desativar logicamente jurados sem excluí-los, preservando a integridade dos históricos que os referenciam. `Email` antecipa o Portal do Jurado da Fase 4, onde jurados precisarão de autenticação ou convite nominado. Nenhum dos dois altera o comportamento da Fase 3.

### Entidade `EventJuryAssignment` — Alocação por Evento
```csharp
EventJuryAssignment {
    EventId     // Referência ao evento
    Assignments // Dictionary<int, string>: chairId (1..5) → judgeId
}
```

A alocação é por evento, não global. O mesmo jurado pode estar na Cadeira 3 no Evento A e na Cadeira 1 no Evento B. Essa flexibilidade é essencial para operações multi-bloco e eventos com bancas rotativas.

### `ChairTurned` como Mecanismo Soberano (Invariante Preservada)
O fluxo de votação permanece inalterado:
```
Jurado → Pressiona Botão Físico → ESP32 → POST /api/chair-press → ChairTurned → Result Engine
```

A identidade do jurado **não participa** do fluxo de votação em tempo real. `ChairTurned` carrega apenas `chairId` — simples, rápido, infalível. A resolução nominal (quem era aquele jurado naquela cadeira) ocorre **apenas no momento do arquivamento** da rodada, via consulta ao `EventJuryAssignment` vigente.

Isso preserva três invariantes críticas:
1. **O hardware não precisa conhecer o jurado:** O ESP32 continua enviando apenas `{ "chairId": N }`.
2. **A votação não falha por ausência de jurado cadastrado:** Se uma cadeira não tiver jurado alocado, o voto é aceito normalmente; a posição fica como "Cadeira N (não identificada)" no histórico.
3. **A latência de votação é mínima:** A resolução nominal é assíncrona e não bloqueia o caminho crítico de aceitação do voto.

### Integração com `RoundHistoryEntry`
Ao arquivar a rodada (ADR-014), o sistema gera um `JurySnapshot` a partir do `EventJuryAssignment` vigente:
```csharp
JurySnapshot = assignments.ToDictionary(
    kv => kv.Key,  // chairId
    kv => judges.TryGetValue(kv.Value, out var judge) ? new JurySnapshotEntry(judge) : null
);
```
O snapshot é imutável — alterações futuras no cadastro de jurados ou na alocação não retroagem sobre rodadas já arquivadas.

### Dock Cênico Nominal no Telão (`StageJuryDock`)
O telão exibe os cards da banca alocada em tempo real:
- Avatares circulares com foto, nome e cargo de cada jurado alocado
- Anel de neon pulsante com `primaryColor` do evento ao redor do avatar
- O anel acende e pulsa ao receber `ChairTurned` para a cadeira correspondente
- O anel apaga ao receber `ChairsReset`
- Apresentação puramente contemplativa — sem botões, cliques ou interações

### Sincronização em Tempo Real
- Evento `EventJuryUpdated` via SignalR a cada `PUT /api/events/{id}/jury` bem-sucedido
- Cockpit do operador atualiza o painel de banca ao vivo
- Telão atualiza o `StageJuryDock` ao vivo

## Consequências

### Positivas
- **Reutilização de jurados entre eventos:** Um jurado cadastrado uma vez está disponível em todos os eventos futuros via catálogo.
- **Flexibilidade posicional:** A alocação por evento permite bancas completamente diferentes em eventos distintos sem recadastro.
- **Resiliência do fluxo de votação:** A ausência de um jurado alocado não bloqueia o acionamento de cadeira — o sistema degrada graciosamente.
- **Histórico nominalmente identificado:** Cada rodada arquivada sabe quem eram os jurados, eliminando a necessidade de cruzamentos externos para auditoria.
- **Preparação para Fase 4:** `IsActive` e `Email` já estão no modelo, eliminando uma migração de schema na fase de scorecards.

### Negativas / Desafios
- O operador precisa realizar dois passos para configurar a banca: (1) cadastrar jurado no catálogo, (2) alocá-lo ao evento. Para eventos recorrentes com banca fixa, isso é uma operação única que se reutiliza.
- O catálogo global de jurados cresce sem depuração automática — requer política de desativação (`IsActive = false`) para jurados que não participam mais.

## Alternativas Consideradas

| Alternativa | Motivo da Rejeição |
| :--- | :--- |
| **Identidade amarrada à cadeira (ex: `chair1Name` como campo de `ActiveContext`)** | Impede reutilização entre eventos; histórico perde semântica de identidade; troca de posição exige alteração estrutural. |
| **Jurado como subentidade de evento (recadastrado a cada evento)** | Retrabalho operacional em eventos recorrentes; históricos de jurados fragmentados sem visão consolidada. |
| **Resolver identidade do jurado no momento do `ChairTurned`** | Adiciona latência e complexidade ao caminho crítico de votação; vulnerável a falhas de cadastro que interrompam votos. |
| **Integrar identidade de jurado no payload de `ChairTurned`** | Acoplamento desnecessário do mecanismo de votação à camada de dados de identidade; viola o princípio de separação de responsabilidades (ADR-001). |
| **Scorecards digitais como substituto do botão físico** | Fora do escopo da Fase 3; viola a decisão de manter `ChairTurned` como mecanismo soberano de votação. |

## Motivos da Escolha
- O desacoplamento `Judge` / `EventJuryAssignment` / `ChairTurned` reflete com precisão a realidade operacional de bancas corporativas: a pessoa é permanente, a posição é contextual, e o voto é instantâneo.
- Preservar `ChairTurned` como mecanismo soberano e inalterado garante que toda a fundação de hardware (ESP32, lockout, result engine) continue funcionando independentemente de qualquer evolução no modelo de identidade de jurados.
- A resolução nominal assíncrona (apenas no momento do arquivamento) é o ponto de encontro ideal entre o real-time do evento ao vivo e a rastreabilidade histórica permanente.

## Impacto Futuro
- **Fase 4 (Scorecards):** Scorecards individuais de jurados serão associados via `judgeId` ao `EventJuryAssignment`, utilizando a mesma estrutura de alocação por evento já estabelecida. O campo `Email` viabiliza convites para o portal individual.
- **Fase 9 (Analytics):** O `JurySnapshot` no `RoundHistoryEntry` permite queries analíticas do tipo "quais jurados aprovaram mais projetos" sem necessidade de joins complexos.
- **Fase 8 (Persistência):** `Judge` e `EventJuryAssignment` mapeiam para tabelas relacionais: `Judge(Id, Name, Company, ...)` e `EventJuryAssignment(EventId, ChairId, JudgeId)` com chave composta.
- **Sistemas Complementares:** O catálogo global de jurados com `Email` e `IsActive` é a interface de integração natural com sistemas de gestão de talentos, credenciamento de eventos e plataformas de RH corporativo — sem alterar o fluxo principal de votação.
