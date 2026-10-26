# ADR-008: Test State Isolation & In-Memory Store Lifecycle (Isolamento de Estado em Testes e Ciclo de Vida do Store)

## Status
Aceito (Fase 2, Auditoria do Milestone 2B)

## Contexto
Durante a auditoria e homologação do Milestone 2B, foi observado que:
- A execução da suíte de testes `tests/test-projects-api.cjs` contra um backend recém-iniciado resultava em **53 PASS / 0 FAIL**.
- Ao reexecutar a mesma suíte imediatamente na sequência sem reiniciar o processo do backend, ocorriam falhas por asserção de estado.

A investigação comprovou que a suíte realiza mutações reais e permanentes no store em memória durante os testes:
1. O título do evento é alterado via `PUT /api/events/current` para `"Demo Day Inovação 2026 - Edição Especial"` e as cores são modificadas.
2. A seleção de pitch (`POST /api/projects/{id}/select`) transiciona o primeiro projeto do catálogo (`proj-neurosync-01`) para o status `Completed` (2).
3. A chamada padrão `GET /api/projects` oculta projetos concluídos, retornando uma contagem menor do que a esperada pelo teste inicial.

Além disso, constatou-se que o endpoint `POST /api/reset` zera exclusivamente as 5 cadeiras físicas da arena (`chairStates[1..5] = false`), não restaurando o catálogo de projetos nem as configurações do evento.

## Decisão
1. **O Backend é o Responsável pela Memória Corrente:**
   O `ArenaProjectStore` opera como um Singleton volátil em memória. Ele deve reter cumulativamente todas as alterações efetuadas pelo operador enquanto o processo estiver em execução. A separação entre o reset operacional de cadeiras (`POST /api/reset`) e a persistência de catálogo é intencional e necessária para a dinâmica do evento.
2. **Ciclo de Vida do Seed:**
   O seed inicial de demonstração é restaurado exclusivamente através da **reinicialização do processo do backend**.
3. **Diretriz de Execução de Testes:**
   As suítes completas de integração (`test-api.cjs`, `test-projects-api.cjs`, `test-signalr-e2e.cjs`) assumem como premissa que o backend foi recém-inicializado em seu estado baseline.

## Consequências

### Positivas
- **Fidelidade Operacional:** Projetos cadastrados e cores alteradas pelo operador permanecem íntegros durante toda a dinâmica do evento, mesmo que ocorram múltiplos resets de cadeiras entre os pitches.
- **Simplicidade do Store:** Ausência de mecanismos complexos de rollback em produção que poderiam introduzir bugs de perda de dados.

### Negativas / Recomendações
- Para automação contínua (CI/CD ou testes em lote), os scripts devem orquestrar a inicialização do backend antes de cada suíte ou, futuramente, utilizar endpoints de teste dedicados (`/api/test/reseed`) restritos ao ambiente de desenvolvimento.
