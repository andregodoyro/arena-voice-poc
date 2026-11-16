# Lições Aprendidas e Recomendações — Milestone 4A
## Storage Engine & Relational Schema (PostgreSQL Portable 18.6 + EF Core 10)

> **Documento:** Síntese de Aprendizados e Recomendações Técnicas  
> **Data:** Novembro de 2026  
> **Status:** Ativo  

---

## 1. Desafios Encontrados

1. **Rigor de Tipagem Temporal no Npgsql**:
   - O PostgreSQL lida com timezones com alto grau de estipulação matemática. O driver Npgsql não converte silenciosamente fusos locais para UTC na inserção; ele exige que o `DateTimeOffset` possua `Offset == 0`.
   - *Lição*: Todas as entidades persistidas devem normalizar suas datas para UTC no momento do mapeamento.

2. **Transição de Testes em Memória para Testes Relacionais**:
   - Testes que rodavam sobre `ArenaProjectStore` partiam sempre de um estado volátil zerado a cada nova inicialização de processo. Com o PostgreSQL persistindo dados em disco, as tuplas criadas no teste A continuavam presentes no teste B.
   - *Lição*: Suítes de homologação contra bancos de dados reais exigem isolamento com teardown/setup idempotente que limpe registros criados dinamicamente sem apagar o seed oficial.

3. **Validação de Check Constraints em Enums C#**:
   - Mapear constraints de verificação (`BETWEEN X AND Y`) baseadas em enums deve considerar todos os valores possíveis do enum (incluindo estados não-terminais como `Inconclusive`).

---

## 2. Erros Evitados

- **Uso Incorreto de DbContext Scoped em Serviço Singleton**:
  - Evitou-se o antipattern clássico de manter uma conexão aberta perpetuamente no `IArenaProjectStore`, optando-se por `IDbContextFactory`, o que garantiu conexões de curta duração e evitou travamentos e memory leaks.
- **Normalização Excessiva Desnecessária**:
  - Ao invés de criar 4 tabelas relacionais associativas para arrays simples e configurações de temporizador, utilizou-se arrays nativos do PostgreSQL (`text[]`, `int[]`) e `JSONB`, simplificando a modelagem e aumentando a velocidade das consultas.
- **Quebra de Contratos Existentes**:
  - Toda a reengenharia de persistência foi implementada atrás da interface `IArenaProjectStore`, garantindo que nenhum dos 34 endpoints REST ou 9 eventos SignalR sofressem quebra.

---

## 3. Recomendações Críticas para o Milestone 4B

1. **Escrita Não-Bloqueante de Checkpoints de Sessão**:
   - Ao persistir o estado de palco (`ActiveSessionState`) durante as transições de pitch e votos, a escrita não deve congelar a thread de mensageria SignalR.
2. **Cálculo Preciso de Compensação Temporal Pós-Crash**:
   - Na reidratação do cronômetro após reinicialização do backend, o cálculo de tempo decorrido deve considerar o delta entre o timestamp gravado e `DateTimeOffset.UtcNow`.
3. **Limpeza Atômica de Sessão**:
   - Ao disparar um `POST /api/reset` ou concluir um pitch formalmente, o registro `ActiveSessionState` deve ser resetado para impedir recuperações fantasmas de sessões anteriores em reboots posteriores.

---

## 4. Riscos Remanescentes

- **Disponibilidade do Processo do PostgreSQL Portable**:
  - Sendo um processo portátil iniciado via script, caso o processo seja morto manualmente pelo operador da máquina, o backend bloqueará o boot. O `DatabaseStartupValidator` mitiga esse risco no startup, mas a introdução de um health check em tempo de execução na Fase 7 será recomendável.
