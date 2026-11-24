# ADR-030: Estrutura de Persistência Relacional de Mídia de Projetos com JSONB

> **Status:** ✅ APROVADO  
> **Data:** 23 de Novembro de 2026  
> **Decisores:** Arquiteto Principal & Equipe de Engenharia Arena Voice  
> **Fase:** Phase 5C — Live Show Experience (Persistência & Suporte a Mídia)  

---

## 1. Contexto

A expansão multimídia do Arena Voice exigiu que o modelo de dados de projetos (`Project`) armazenasse não apenas imagens estáticas básicas (`LogoUrl` e `CoverImageUrl`), mas também a URL do vídeo de demonstração (`VideoUrl`) e um conjunto dinâmico de itens adicionais de galeria (`MediaItems`).

Houve duas opções técnicas em deliberação arquitetural:
- **Opção A:** Persistir apenas `LogoUrl`, `CoverImageUrl` e `VideoUrl` em colunas simples no PostgreSQL, postergando itens de galeria.
- **Opção B:** Antecipar a estrutura completa persistindo `LogoUrl`, `CoverImageUrl`, `VideoUrl` e uma coleção flexível `MediaItems` serializada em coluna nativa `JSONB` no PostgreSQL.

---

## 2. Decisão

Aprovou-se integralmente a **Opção B**:

1. **Campos Primitivos na Entidade `Project`:**
   - Adição das colunas de texto direto para os ativos de uso primário:
     - `LogoUrl` (text, opcional)
     - `CoverImageUrl` (text, opcional)
     - `VideoUrl` (text, opcional)

2. **Galeria Dinâmica em Coluna Nativa `JSONB` (`MediaItems`):**
   - Mapeamento da coleção de itens de mídia complementares como `jsonb` no PostgreSQL via EF Core 10:
     ```csharp
     b.Property(p => p.MediaItems)
      .HasColumnType("jsonb");
     ```
   - Cada item armazena: `{ id, type, url, order }`.

3. **Justificativa da Adoção de JSONB:**
   - Os itens de mídia de um projeto são estritamente agregados a ele: são sempre lidos e gravados em conjunto com a entidade `Project`, inexistindo necessidade de consultas independentes por item ou joins complexos.
   - Evita a criação e manutenção de uma tabela associativa intermediária (`project_media_items`) e suas migrações relacionais prematuras.
   - Oferece flexibilidade total para futura expansão de metadados de mídia (duração de vídeo, aspect ratio, legenda, mime-type) sem necessidade de alterações estruturais de DDL.

---

## 3. Consequências

### Positivas
- **Sobrevivência Total a Restarts:** Toda a mídia cadastrada sobrevive a reboots do servidor, restarts de container e fechamentos do navegador.
- **Alta Performance:** Leitura e escrita serializada em uma única tupla da tabela `projects`.
- **Compatibilidade Retroativa:** Migração idempotente no PostgreSQL sem quebrar dados legados de projetos já cadastrados.
- **Validação Automatizada:** Cobertura de 72 asserções automatizadas na suíte de testes de persistência.

### Negativas / Mitigações
- **Integridade Referencial:** Não há chaves estrangeiras clássicas para cada arquivo de mídia individual. Mitigado através de validação autoritativa na camada de aplicação no backend (`ProjectsService` / `ProjectValidator`).
