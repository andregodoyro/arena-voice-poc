import React, { useState, useEffect } from 'react';
import { Rocket, User, Layers, Radio, Sparkles } from 'lucide-react';

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
export function StageProjectBanner({ project, branding }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

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
