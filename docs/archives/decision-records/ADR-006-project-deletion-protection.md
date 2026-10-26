# ADR-006: Project Deletion Protection (Proteção contra Exclusão de Projeto Ativo no Palco)

## Status
Aceito (Fase 2, Milestone 2B)

## Contexto
Durante o planejamento inicial do Milestone 2B, foi cogitado que, se o operador solicitasse a exclusão de um projeto que estivesse ativo no palco (`DELETE /api/projects/{id}`), o backend simplesmente desvincularia o ponteiro (`CurrentProjectId = null`) e removeria a entidade.

Contudo, no contexto de um evento ao vivo com plateia e telão público transmitindo o pitch, a exclusão acidental da startup que está discursando no palco causaria um colapso imediato da experiência visual e dos logs de votação dos jurados.

## Decisão
Estabeleceu-se uma **regra de salvaguarda operacional rígida**:
- O backend **proíbe terminantemente** a exclusão do projeto atualmente ativo no palco.
- Caso uma requisição `DELETE /api/projects/{id}` seja enviada com o ID correspondente ao `CurrentProjectId`, o `ArenaProjectStore` intercepta a operação e retorna o resultado tipado `DeleteProjectResult(Success: false, IsActiveProject: true, NotFound: false)`.
- O endpoint no `Program.cs` traduz esse resultado em **`HTTP 409 Conflict`**:
  ```json
  {
    "error": "Cannot delete the currently active project."
  }
  ```
- Para excluir um projeto que esteve no palco, o operador deve obrigatoriamente:
  1. Selecionar outro projeto (concluindo o atual); ou
  2. Desvincular formalmente o palco antes da exclusão.

## Consequências

### Positivas
- **Prevenção de Incidentes no Palco:** Impossível derrubar inadvertidamente a apresentação ativa via UI ou script acidental.
- **Semântica HTTP Precisa:** Uso do código `409 Conflict` para indicar que a requisição conflita com o estado corrente da aplicação.
- **Alinhamento com a UX do Operador:** A interface gráfica no Milestone 2C pode desabilitar visualmente o botão de lixeira no card do projeto ativo.

### Negativas / Desafios
- Exige que o operador execute um passo intermediário (selecionar outro pitch) caso deseje descartar uma apresentação em andamento.
