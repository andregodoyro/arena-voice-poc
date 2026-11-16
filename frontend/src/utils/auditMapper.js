/**
 * auditMapper — Converte AuditEventDto do backend para o modelo visual do ActivityLog.
 * 
 * Segue ADR-022: Segregação visual e linguagem de produto para eventos operacionais.
 */

/**
 * Traduz um AuditEventDto em um item de exibição para o ActivityLog.
 * @param {Object} dto - AuditEventDto vindo de /api/audit
 * @returns {Object} item de log para renderização
 */
export function mapAuditEventToActivityItem(dto) {
  if (!dto) return null;

  const date = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
  const timeFormatted = date.toLocaleTimeString('pt-BR');

  let type = 'INFO';
  let category = 'system';
  let description = `${dto.eventType} no agregado ${dto.aggregateType}`;
  let subtext = dto.actorName ? `Por ${dto.actorName} (${dto.actorType})` : dto.actorType || 'Sistema';

  switch (dto.eventType) {
    // ── Cadeiras ─────────────────────────────────────────────────────────────
    case 'ChairPressed':
      type = 'CHAIR_TURNED';
      category = 'chair';
      description = `Cadeira #${dto.aggregateId} virou`;
      subtext = dto.payload?.judgeName
        ? `Jurado: ${dto.payload.judgeName}`
        : 'Voto computado';
      break;

    case 'ChairReset':
      type = 'RESET';
      category = 'chair';
      description = 'Arena retornada à posição inicial';
      subtext = 'Comando do sistema';
      break;

    // ── Ciclo de Pitch ───────────────────────────────────────────────────────
    case 'PitchStarted':
      type = 'PITCH_STARTED';
      category = 'pitch';
      description = dto.payload?.projectTitle
        ? `Pitch iniciado: "${dto.payload.projectTitle}"`
        : 'Pitch iniciado no palco';
      subtext = dto.payload?.durationSeconds
        ? `Tempo inicial: ${dto.payload.durationSeconds}s`
        : 'Apresentação em andamento';
      break;

    case 'PitchPaused':
      type = 'PITCH_PAUSED';
      category = 'pitch';
      description = 'Cronômetro do pitch pausado';
      subtext = dto.payload?.remainingSeconds !== undefined
        ? `Tempo congelado em ${dto.payload.remainingSeconds}s`
        : 'Pausa operacional';
      break;

    case 'PitchResumed':
      type = 'PITCH_RESUMED';
      category = 'pitch';
      description = 'Cronômetro do pitch retomado';
      subtext = dto.payload?.remainingSeconds !== undefined
        ? `Retomado com ${dto.payload.remainingSeconds}s restantes`
        : 'Retomada de contagem';
      break;

    case 'PitchCompleted':
      type = 'PITCH_COMPLETED';
      category = 'pitch';
      description = 'Apresentação do pitch concluída';
      subtext = 'Transição para encerramento';
      break;

    case 'PitchExpired':
      type = 'PITCH_EXPIRED';
      category = 'pitch';
      description = 'Tempo do pitch esgotado';
      subtext = 'Sinal sonoro / gongo cênico';
      break;

    case 'PitchTransitioned':
      type = 'PITCH_STAGE';
      category = 'pitch';
      description = dto.payload?.toStage
        ? `Estágio alterado para: ${dto.payload.toStage}`
        : 'Transição de estágio do pitch';
      subtext = dto.payload?.fromStage ? `De ${dto.payload.fromStage}` : 'Ciclo de pitch';
      break;

    // ── Projetos ─────────────────────────────────────────────────────────────
    case 'ProjectActivated':
      type = 'PROJECT_ACTIVATED';
      category = 'project';
      description = dto.payload?.title
        ? `Projeto chamado ao palco: "${dto.payload.title}"`
        : `Projeto #${dto.aggregateId} chamado ao palco`;
      subtext = 'Pitch selecionado para apresentação';
      break;

    case 'ProjectCreated':
      type = 'PROJECT_CREATED';
      category = 'project';
      description = dto.payload?.title
        ? `Novo projeto cadastrado: "${dto.payload.title}"`
        : 'Novo projeto cadastrado';
      subtext = 'Cadastro técnico';
      break;

    case 'ProjectUpdated':
      type = 'PROJECT_UPDATED';
      category = 'project';
      description = dto.payload?.title
        ? `Projeto atualizado: "${dto.payload.title}"`
        : 'Projeto atualizado';
      subtext = 'Alteração de dados cadastrais';
      break;

    case 'ProjectDeleted':
      type = 'PROJECT_DELETED';
      category = 'project';
      description = 'Projeto excluído da esteira';
      subtext = 'Ação administrativa';
      break;

    case 'ProjectCompleted':
      type = 'PROJECT_COMPLETED';
      category = 'project';
      description = 'Avaliação do projeto concluída';
      subtext = 'Rodada encerrada';
      break;

    // ── Eventos ──────────────────────────────────────────────────────────────
    case 'EventActivated':
      type = 'EVENT_ACTIVATED';
      category = 'event';
      description = dto.payload?.title
        ? `Evento ativado: "${dto.payload.title}"`
        : 'Novo evento ativado na arena';
      subtext = 'Governança de evento';
      break;

    case 'EventCreated':
      type = 'EVENT_CREATED';
      category = 'event';
      description = dto.payload?.title
        ? `Evento criado: "${dto.payload.title}"`
        : 'Evento criado';
      subtext = 'Governança de evento';
      break;

    case 'EventUpdated':
      type = 'EVENT_UPDATED';
      category = 'event';
      description = 'Configurações do evento atualizadas';
      subtext = 'Governança de evento';
      break;

    case 'EventArchived':
      type = 'EVENT_ARCHIVED';
      category = 'event';
      description = 'Evento arquivado';
      subtext = 'Governança de evento';
      break;

    // ── Júri / Bancas ────────────────────────────────────────────────────────
    case 'JudgeAssigned':
      type = 'JUDGE_ASSIGNED';
      category = 'jury';
      description = dto.payload?.judgeName
        ? `Jurado ${dto.payload.judgeName} alocado na Cadeira #${dto.payload.chairId}`
        : 'Jurado alocado na bancada';
      subtext = 'Composição do júri';
      break;

    case 'JudgeUnassigned':
      type = 'JUDGE_UNASSIGNED';
      category = 'jury';
      description = dto.payload?.chairId
        ? `Cadeira #${dto.payload.chairId} liberada da bancada`
        : 'Jurado desvinculado';
      subtext = 'Composição do júri';
      break;

    // ── Eventos Técnicos / Checkpoints (ADR-022) ─────────────────────────────
    case 'RecoveryCheckpointCreated':
      type = 'CHECKPOINT';
      category = 'technical';
      description = 'Snapshot de recuperação persistido';
      subtext = 'Checkpoint atômico de tolerância a falhas';
      break;

    case 'ActiveSessionUpdated':
      type = 'SESSION_UPDATE';
      category = 'technical';
      description = 'Ponteiro de sessão sincronizado';
      subtext = 'Sincronização de estado';
      break;

    default:
      type = dto.eventType || 'INFO';
      category = 'system';
      description = dto.eventType || 'Ação operacional';
      subtext = dto.actorType || 'Sistema';
      break;
  }

  return {
    id: `audit-${dto.id}`,
    auditId: dto.id,
    type,
    category,
    eventType: dto.eventType,
    description,
    subtext,
    time: timeFormatted,
    timestamp: date.getTime(),
    raw: dto,
  };
}
