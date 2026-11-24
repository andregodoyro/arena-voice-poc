import React, { useState, useEffect } from 'react';
import { Rocket, Layers, Radio, Sparkles } from 'lucide-react';
import { useStageTimer } from '../../hooks/useStageTimer';

/**
 * StageProjectBanner — Componente Legado de Notificação Broadcast (Phase 5C.2B).
 * 
 * @deprecated Preparado para futura remoção no marco Phase 5C.4 (Desconstrução do HUD 2D).
 * 
 * Conforme diretrizes da Phase 5C.2B (Hero Wall Occupancy Pass):
 * - O Hero Showcase Wall agora é o protagonista absoluto e concentra 100% da identidade visual,
 *   branding, imagens e narrativa da apresentação;
 * - O StageProjectBanner foi reduzido a um mini-badge discreto e semitransparente no rodapé lateral,
 *   garantindo desobstrução visual total do palco 3D e da parede de fundo.
 */
export function StageProjectBanner({ project, branding, pitchState = null }) {
  const [logoFailed, setLogoFailed] = useState(false);

  // Ticker sincronizado com o servidor
  const timer = useStageTimer(pitchState);

  useEffect(() => {
    setLogoFailed(false);
  }, [project?.id]);

  const primaryColor = branding?.primaryColor || '#d90429';

  // ── ESTADO INATIVO: Palco Livre sem Pitch Ativo ──────────────────
  if (!project) {
    return (
      <div className="pointer-events-none transition-all duration-500 ease-out opacity-60 hover:opacity-100">
        <div className="glass-panel rounded-xl px-3.5 py-1.5 border border-white/10 flex items-center gap-2.5 shadow-lg backdrop-blur-md bg-black/40">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
            Palco em Espera
          </span>
        </div>
      </div>
    );
  }

  // ── ESTADO ATIVO: Mini-badge discreto (legado) ────────────────────
  const logoUrl = project.media?.logoUrl || project.logoUrl;
  const hasValidLogo = logoUrl && !logoFailed;

  return (
    <aside
      aria-label="Informações legadas do projeto"
      className="pointer-events-none transition-all duration-500 ease-out transform translate-y-0 opacity-80 hover:opacity-100 max-w-xs md:max-w-sm"
    >
      <div
        className="glass-panel rounded-2xl px-3 py-2 border shadow-xl flex items-center gap-3 backdrop-blur-lg bg-black/50"
        style={{
          borderColor: `${primaryColor}30`,
          boxShadow: `0 8px 24px rgba(0, 0, 0, 0.7), 0 0 15px ${primaryColor}10`,
        }}
      >
        {/* Mini Logo */}
        <div className="flex-shrink-0">
          {hasValidLogo ? (
            <div className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 p-1 flex items-center justify-center overflow-hidden">
              <img
                src={logoUrl}
                alt={project.title}
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ background: `${primaryColor}40` }}
            >
              <Rocket className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Informação Resumida em Linha Única */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded"
              style={{ backgroundColor: `${primaryColor}30`, color: '#ffffff' }}
            >
              {project.track ? project.track.slice(0, 14) : 'PITCH'}
            </span>
            <span className="text-[10px] text-gray-400 truncate font-mono">
              #{project.orderIndex || 1}
            </span>
          </div>

          <h2 className="text-xs font-bold text-white truncate leading-tight mt-0.5">
            {project.title}
          </h2>
        </div>
      </div>
    </aside>
  );
}

export default StageProjectBanner;
