# Runbook Operacional: Disaster Recovery & Restauração de Dados
## Arena Voice / Arena de Inovação — Plataforma de Avaliação em Tempo Real

> **Classificação:** Procedimento Operacional Crítico (Show-Ready / Produção)  
> **Fase:** Phase 4 – Platform Reliability & Data Resilience  
> **Milestone:** 4D – Automated Snapshots, Backup & Disaster Recovery  
> **Público-alvo:** Operadores técnicos de palco, engenheiros de suporte e equipe de infraestrutura  
> **Versão:** 1.0 (Novembro de 2026)  

---

## 1. Visão Geral e Métricas de Resiliência

O objetivo deste runbook é orientar a equipe técnica a restabelecer a operação da Arena Voice no menor tempo possível diante de qualquer anomalia catastrófica (queda de energia do notebook, corrupção do disco, fechamento abrupto de processos ou falha de hardware).

### Métricas Oficiais do Milestone 4D

| Métrica | Meta Oficial | Mecanismo Arquitetural |
|---|---|---|
| **RTO (Recovery Time Objective)** | **< 30 segundos** | Restauração física via `scripts\restore-backup.cmd` + boot com reidratação automática |
| **RPO (Recovery Point Objective)** | **0 rodadas arquivadas perdidas** | Snapshot automático (`round_N_*.pgdump`) gerado imediatamente a cada `RoundArchived` |

---

## 2. Identificação de Incidentes (Quando Acionar este Runbook)

Acione o procedimento de Disaster Recovery nas seguintes situações:
1. **Corrupção de Dados:** O backend falha ao iniciar com erros de integridade relacional do PostgreSQL ou falha na leitura do `ActiveSessionState`.
2. **Inconsistência Operacional Grave:** Uma rodada foi corrompida por intervenção indevida ou operação incorreta e a organização do evento determina o retorno ao estado oficial da rodada anterior.
3. **Falha Física do Notebook:** O notebook principal desliga e a operação precisa ser transferida para o notebook reserva.

---

## 3. Localização e Convenção dos Snapshots

Todos os backups residem no diretório:
```text
arena-voice-poc/backups/
```

### Convenção de Nomenclatura dos Arquivos
- **Snapshots Automáticos de Rodada:** `round_{N}_{timestamp}.pgdump`  
  *Exemplo:* `round_3_20261116T144432Z.pgdump` (Snapshot capturado automaticamente ao arquivar a Rodada 3).
- **Backups Manuais sob Demanda:** `manual_{timestamp}.pgdump`  
  *Exemplo:* `manual_20261116T144103Z.pgdump` (Disparado pelo operador via `POST /api/admin/backup`).

> [!TIP]
> Os arquivos utilizam formato custom comprimido do PostgreSQL (`pg_dump -Fc`), contendo catálogo de objetos (TOC), esquemas e dados com compressão nativa (~100 KB a 180 KB por dump).

---

## 4. Procedimento Padrão de Recuperação Passo a Passo

```text
                  FLUXO DE RECUPERAÇÃO EM PRODUÇÃO
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ 1. Parar o Backend      │ ──► │ 2. Executar Restore     │ ──► │ 3. Iniciar o Backend    │
│    Ctrl+C no console    │     │    restore-backup.cmd   │     │    start-backend.cmd    │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
                                                                             │
                                                                             ▼
                                                                ┌─────────────────────────┐
                                                                │ 4. Reidratação Automática│
                                                                │    F5 no Operador/Stage │
                                                                └─────────────────────────┘
```

### Passo 1: Parar o Backend da Aplicação
Caso o processo do backend ainda esteja em execução, encerre-o para liberar os pools de conexão:
- Se estiver rodando em janela de terminal: pressione `Ctrl+C`.
- Se for necessário forçar a parada no PowerShell:
  ```powershell
  Get-Process ArenaVoicePocBackend -ErrorAction SilentlyContinue | Stop-Process -Force
  ```

### Passo 2: Executar o Script de Restauração
Abra o prompt de comando ou terminal na raiz do projeto e execute:

#### Opção A — Restaurar o snapshot mais recente (Padrão mais comum):
```cmd
scripts\restore-backup.cmd
```
*O script detecta automaticamente o snapshot mais recente em `backups/`, aciona o `pg_restore` e substitui o estado com validação de código de retorno.*

#### Opção B — Restaurar uma rodada específica:
```cmd
scripts\restore-backup.cmd round_2_20261116T144432Z.pgdump
```

#### Opção C — Listar os backups disponíveis antes de escolher:
```cmd
scripts\restore-backup.cmd --list
```

### Passo 3: Reiniciar o Backend da Aplicação
Com a base de dados restaurada, reinicie o backend:
```cmd
scripts\start-backend.cmd
```

### Passo 4: Reidratação Automática e Atualização das Telas
1. O backend carrega o `PostgresArenaProjectStore` e executa o `RehydrateSessionState()`.
2. O último estado da sessão ativa, o projeto em exibição e as contagens da timeline de auditoria são carregados do banco restaurado para a memória.
3. No navegador da mesa do operador (`/operator`) e no telão (`/stage`), pressione `F5` para sincronizar os clientes web com o estado reidratado.

---

## 5. Procedimento de Contingência: Migração para Notebook Reserva

Em caso de quebra de hardware ou falha de inicialização do notebook principal:

1. **Localize o Pen Drive / Compartilhamento de Rede:**  
   Se um pen drive de contingência foi utilizado ou a pasta `backups/` foi sincronizada em rede, copie o último arquivo `round_N_*.pgdump` para o notebook reserva.
2. **No Notebook Reserva:**
   - Abra a pasta do projeto clonado.
   - Inicie o cluster PostgreSQL Portable (caso não esteja rodando):
     ```cmd
     devtools\portable\pgsql\bin\pg_ctl.exe -D devtools\portable\pgsql\data -l pg.log start
     ```
   - Cole o arquivo `.pgdump` na pasta `backups/`.
   - Execute o restore:
     ```cmd
     scripts\restore-backup.cmd
     ```
   - Inicie o backend:
     ```cmd
     scripts\start-backend.cmd
     ```
   - Inicie o frontend:
     ```cmd
     scripts\start-frontend.cmd
     ```
   - O evento pode prosseguir exatamente a partir da última rodada arquivada no palco.

---

## 6. Checklist de Validação Pós-Recuperação

Após o reinício do sistema, verifique em 10 segundos:

- [ ] **Liveness da API:** `GET /api/status` retorna `200 OK` com `status: "ONLINE"`.
- [ ] **Catálogo de Projetos:** Tela do operador lista todos os projetos do evento.
- [ ] **Histórico de Rodadas:** `GET /api/rounds` exibe as rodadas arquivadas anteriores ao desastre.
- [ ] **Activity Log / Timeline:** A timeline de auditoria reflete a trilha histórica de eventos recuperada.
- [ ] **Stage 3D:** O telão conecta via SignalR, exibe a logo e os neons do evento e posiciona as cadeiras corretamente.
