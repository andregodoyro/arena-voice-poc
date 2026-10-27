import React from 'react';
import { Eye, Sparkles, Image as ImageIcon, Flame } from 'lucide-react';

/**
 * Calcula a luminância relativa de uma cor hexadecimal (WCAG 2.1).
 */
function getRelativeLuminance(hex) {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calcula a taxa de contraste entre duas cores hexadecimais.
 */
function getContrastRatio(hex1, hex2) {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * ColorPreviewCard — Preview cênico em tempo real da iluminação e identidade do palco.
 * 
 * Exibe imediatamente o impacto das alterações de cores e branding sem necessidade de salvar:
 * - Amostras das cores primária e secundária com seus códigos hexadecimais
 * - Simulação do neon do palco e iluminação volumétrica
 * - Avaliação de contraste sobre o fundo cênico escuro e entre as cores
 * - Preview do logo institucional e frase de impacto (tagline)
 */
export function ColorPreviewCard({
  title = 'Arena Voice',
  tagline = '',
  logoUrl = '',
  primaryColor = '#d90429',
  secondaryColor = '#00ffff',
}) {
  const safePrimary = /^#([A-Fa-f0-9]{6})$/.test(primaryColor) ? primaryColor : '#d90429';
  const safeSecondary = /^#([A-Fa-f0-9]{6})$/.test(secondaryColor) ? secondaryColor : '#00ffff';

  // Contraste contra o fundo cênico do palco (#0a0a12)
  const contrastPrimaryOnDark = getContrastRatio(safePrimary, '#0a0a12').toFixed(1);
  const contrastSecondaryOnDark = getContrastRatio(safeSecondary, '#0a0a12').toFixed(1);
  const contrastBetween = getContrastRatio(safePrimary, safeSecondary).toFixed(1);

  return (
    <div className="glass-panel rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
      {/* ── CABEÇALHO DO PREVIEW ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Preview Cênico do Palco</h3>
            <p className="text-[11px] text-gray-400">Simulação da iluminação e neon ao vivo</p>
          </div>
        </div>

        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Tempo Real
        </span>
      </div>

      {/* ── SIMULAÇÃO DA MOLDURA CÊNICA / TELÃO ──────────────────────────────── */}
      <div
        className="relative rounded-2xl p-6 overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: '#0a0a14',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: safePrimary,
          boxShadow: `0 0 30px ${safePrimary}25, inset 0 0 40px ${safeSecondary}15`,
        }}
      >
        {/* Glow de fundo decorativo */}
        <div
          className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-500"
          style={{ backgroundColor: safePrimary }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-500"
          style={{ backgroundColor: safeSecondary }}
        />

        <div className="relative z-10 space-y-4">
          {/* Logo e Título Cênico */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={logoUrl}
                  alt="Logo do Evento"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300"
                style={{
                  backgroundColor: `${safePrimary}20`,
                  borderColor: safePrimary,
                  boxShadow: `0 0 15px ${safePrimary}40`,
                }}
              >
                <Flame className="w-6 h-6" style={{ color: safePrimary }} />
              </div>
            )}

            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
                Palco Principal • Arena Voice
              </span>
              <h4 className="text-base font-bold text-white truncate drop-shadow">
                {title || 'Título do Evento'}
              </h4>
            </div>
          </div>

          {/* Tagline Cênica com Destaque Secundário */}
          <div
            className="p-3 rounded-xl border backdrop-blur-sm transition-all duration-300"
            style={{
              backgroundColor: `${safeSecondary}10`,
              borderColor: `${safeSecondary}40`,
            }}
          >
            <p className="text-xs italic flex items-center gap-1.5 text-gray-200">
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: safeSecondary }} />
              <span>"{tagline || 'Apresente sua ideia. Conquiste as cadeiras.'}"</span>
            </p>
          </div>

          {/* Barra de Efeito Gradiente Neon */}
          <div
            className="h-2 rounded-full w-full transition-all duration-300 shadow-md"
            style={{
              background: `linear-gradient(90deg, ${safePrimary} 0%, ${safeSecondary} 100%)`,
              boxShadow: `0 0 16px ${safePrimary}60`,
            }}
          />
        </div>
      </div>

      {/* ── AMOSTRAS DE COR E CÓDIGOS HEXADECIMAIS ──────────────────────────── */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-2">
          Amostras & Hexadecimais
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Amostra Primária */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg border border-white/20 shadow-md shrink-0 transition-all duration-200"
              style={{
                backgroundColor: safePrimary,
                boxShadow: `0 0 14px ${safePrimary}66`,
              }}
            />
            <div className="min-w-0">
              <span className="block text-[10px] text-gray-400 uppercase font-medium">Primária</span>
              <span className="text-xs font-mono font-bold text-white uppercase">{safePrimary}</span>
            </div>
          </div>

          {/* Amostra Secundária */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg border border-white/20 shadow-md shrink-0 transition-all duration-200"
              style={{
                backgroundColor: safeSecondary,
                boxShadow: `0 0 14px ${safeSecondary}66`,
              }}
            />
            <div className="min-w-0">
              <span className="block text-[10px] text-gray-400 uppercase font-medium">Secundária</span>
              <span className="text-xs font-mono font-bold text-white uppercase">{safeSecondary}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ANÁLISE DE CONTRASTE CÊNICO (WCAG) ───────────────────────────────── */}
      <div>
        <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-2">
          Análise de Contraste Cênico
        </label>
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Primária sobre Palco Escuro:</span>
            <span className="font-mono font-semibold text-white">
              {contrastPrimaryOnDark}:1{' '}
              <span className={Number(contrastPrimaryOnDark) >= 4.5 ? 'text-emerald-400' : 'text-amber-400'}>
                ({Number(contrastPrimaryOnDark) >= 4.5 ? 'Ótimo' : 'Médio'})
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Secundária sobre Palco Escuro:</span>
            <span className="font-mono font-semibold text-white">
              {contrastSecondaryOnDark}:1{' '}
              <span className={Number(contrastSecondaryOnDark) >= 4.5 ? 'text-emerald-400' : 'text-amber-400'}>
                ({Number(contrastSecondaryOnDark) >= 4.5 ? 'Ótimo' : 'Médio'})
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-gray-400">Diferenciação Mútua (Primária/Secundária):</span>
            <span className="font-mono font-semibold text-amber-300">
              {contrastBetween}:1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ColorPreviewCard;
