import React, { useState, useEffect } from 'react';
import { Rocket, User, Layers, Radio, Sparkles } from 'lucide-react';
import { useStageTimer } from '../../hooks/useStageTimer';

/**
 * StageProjectBanner — Card cênico do projeto atualmente em apresentação no palco.
 * 
 * Milestone 2D.1: Infraestrutura de Dados, Contexto e HUD Cênico.
 * 
 * Características:
 * - Visual broadcast de alto nível com glassmorphism leve;
 * - Resiliente e offline-first: fallback visual automático caso imagens não existam ou falhem;
 * - Zero botões, zero links e totalmente pointer-events-none (ADR-009);
 * - Reativo em tempo real via SignalR (CurrentProjectChanged).
 */
const PITCH_STAGE_CONFIG = {
  Waiting: { label: 'Aguardando Pitch', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  PitchRunning: { label: 'Pitch ao Vivo', color: 'bg-red-500/25 text-red-300 border-red-500/60 animate-pulse' },
  QA: { label: 'Perguntas e Respostas (Q&A)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  VotingOpen: { label: 'Votação Aberta', color: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 animate-pulse' },
  VotingClosed: { label: 'Votação Encerrada', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  Finished: { label: 'Apresentação Concluída', color: 'bg-gray-500/20 text-gray-300 border-gray-500/40' },
};

export function StageProjectBanner({ project, branding, pitchState = null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  // Ticker de alta precisão sincronizado com o servidor e com o HUD superior
  const timer = useStageTimer(pitchState);

  // Reseta os estados de erro sempre que o projeto mudar
  useEffect(() => {
    setLogoFailed(false);
    setCoverFailed(false);
  }, [project?.id]);

  const primaryColor = branding?.primaryColor || '#d90429';
  const secondaryColor = branding?.secondaryColor || '#00ffff';

  // ── ESTADO INATIVO / ESPERA: Palco Livre sem Pitch Ativo ──────────────────
  if (!project) {
    return (
      <div className="pointer-events-none transition-all duration-500 ease-out">
        <div className="glass-panel rounded-2xl px-5 py-3.5 border border-white/10 flex items-center gap-3.5 shadow-2xl max-w-md">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Radio className="w-5 h-5 text-gray-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                Palco em Espera
              </p>
            </div>
            <p className="text-sm font-medium text-gray-300 mt-0.5">
              Aguardando início da próxima apresentação...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── ESTADO ATIVO: Projeto em Apresentação no Palco ────────────────────────
  const hasValidLogo = project.media?.logoUrl && !logoFailed;
  const hasValidCover = project.media?.coverImageUrl && !coverFailed;

  return (
    <div className="pointer-events-none transition-all duration-500 ease-out transform translate-y-0 opacity-100 max-w-xl md:max-w-2xl">
      <div
        className="glass-panel rounded-3xl p-4 md:p-5 border shadow-2xl relative overflow-hidden backdrop-blur-xl"
        style={{
          borderColor: `${primaryColor}40`,
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px ${primaryColor}20`,
        }}
      >
        {/* Glow dinâmico sutil no topo do card baseado na cor primária */}
        <div
          className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{ background: primaryColor }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5">
          {/* Logo da Startup / Avatar com Fallback Elegante */}
          <div className="flex-shrink-0">
            {hasValidLogo ? (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-black/40 border border-white/10 p-2 flex items-center justify-center shadow-lg overflow-hidden">
                <img
                  src={project.media.logoUrl}
                  alt={project.title}
                  onError={() => setLogoFailed(true)}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border flex items-center justify-center shadow-lg overflow-hidden relative"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}30 0%, #10101c 100%)`,
                  borderColor: `${primaryColor}60`,
                }}
              >
                <div className="text-center">
                  <Rocket className="w-7 h-7 mx-auto" style={{ color: secondaryColor }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300 mt-1 block">
                    {project.track ? project.track.slice(0, 8) : 'PITCH'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dados do Pitch / Apresentação */}
          <div className="flex-1 min-w-0">
            {/* Badges superiores: Status + Trilha */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm"
                style={{
                  backgroundColor: `${primaryColor}25`,
                  borderColor: `${primaryColor}60`,
                  color: '#ffffff',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                No Palco
              </span>

              {project.track && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-gray-300">
                  <Layers className="w-3 h-3 text-gray-400" />
                  <span>{project.track}</span>
                </span>
              )}

              {/* Badge de Estágio do Pitch & Cronômetro Cênico Sincronizado (Milestone 3B, 3C & 3D) */}
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${PITCH_STAGE_CONFIG[timer.stageName]?.color || PITCH_STAGE_CONFIG.Waiting.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {PITCH_STAGE_CONFIG[timer.stageName]?.label || timer.stageLabel}
                </span>

                {timer.isTimedStage && (
                  <span className={`
                    inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border shadow-sm transition-all
                    ${timer.isExpired
                      ? 'bg-red-500/30 text-red-300 border-red-500/60 animate-pulse'
                      : timer.isPaused
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : timer.isUrgent
                      ? 'bg-orange-500/30 text-orange-300 border-orange-500/60 animate-pulse'
                      : 'bg-black/40 text-gray-200 border-white/10'
                    }
                  `}>
                    {timer.isPaused ? `PAUSA ${timer.formattedTime}` : timer.formattedTime}
                  </span>
                )}
              </div>
            </div>

            {/* Título da Startup / Pitch */}
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate leading-tight">
              {project.title}
            </h2>

            {/* Apresentador / Líder do Pitch */}
            {project.pitchLeader && (
              <div className="flex items-center gap-1.5 mt-1 text-xs md:text-sm text-gray-300">
                <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-400 font-normal">Apresentação por:</span>
                <span className="font-semibold text-gray-200 truncate">{project.pitchLeader}</span>
              </div>
            )}

            {/* Descrição resumida (opcional, quando disponível) */}
            {project.description && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-1 max-w-lg hidden sm:block">
                {project.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StageProjectBanner;
