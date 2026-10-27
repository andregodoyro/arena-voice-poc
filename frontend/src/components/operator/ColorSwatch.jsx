import React, { useState, useEffect } from 'react';
import { Pipette, Check } from 'lucide-react';

/**
 * Paleta de cores cênicas predefinidas para o palco do Arena Voice.
 */
export const PRESET_COLORS = [
  { name: 'Arena Red', hex: '#d90429' },
  { name: 'Neon Pink', hex: '#ff0055' },
  { name: 'Cyber Cyan', hex: '#00ffff' },
  { name: 'Electric Amber', hex: '#ffd166' },
  { name: 'Matrix Mint', hex: '#06d6a0' },
  { name: 'Deep Violet', hex: '#7209b7' },
  { name: 'Cosmic Blue', hex: '#3a86ff' },
  { name: 'Sunset Orange', hex: '#f77f00' },
];

/**
 * ColorSwatch — Componente interativo de seleção e edição de cor cênica.
 * 
 * Permite seleção via:
 * 1. Color picker nativo do sistema
 * 2. Digitação manual do código hexadecimal (#RRGGBB)
 * 3. Seleção rápida por paleta de presets cênicos
 */
export function ColorSwatch({
  label,
  value = '#d90429',
  onChange,
  disabled = false,
  description = null,
}) {
  const [internalHex, setInternalHex] = useState(value);

  useEffect(() => {
    setInternalHex(value);
  }, [value]);

  const isValidHex = (hex) => /^#([A-Fa-f0-9]{6})$/.test(hex);

  const handleTextChange = (e) => {
    let input = e.target.value.trim();
    if (!input.startsWith('#') && input.length > 0) {
      input = '#' + input;
    }
    setInternalHex(input);
    if (isValidHex(input)) {
      onChange(input.toLowerCase());
    }
  };

  const handleColorPickerChange = (e) => {
    const newColor = e.target.value.toLowerCase();
    setInternalHex(newColor);
    onChange(newColor);
  };

  const handleSelectPreset = (presetHex) => {
    if (disabled) return;
    const lower = presetHex.toLowerCase();
    setInternalHex(lower);
    onChange(lower);
  };

  const isCurrentValid = isValidHex(internalHex);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-300">
          {label} <span className="text-red-400">*</span>
        </label>
        {description && (
          <span className="text-[10px] text-gray-500">{description}</span>
        )}
      </div>

      {/* Caixa de Entrada e Amostra */}
      <div className="flex items-center gap-3">
        {/* Amostra com Seletor Nativo Oculto */}
        <div className="relative group shrink-0">
          <input
            type="color"
            id={`picker-${label.replace(/\s+/g, '-').toLowerCase()}`}
            value={isCurrentValid ? internalHex : '#000000'}
            onChange={handleColorPickerChange}
            disabled={disabled}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
            title="Clique para abrir o seletor de cores"
          />
          <div
            className="w-10 h-10 rounded-xl border border-white/20 shadow-lg flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-hover:border-white/40"
            style={{
              backgroundColor: isCurrentValid ? internalHex : '#222222',
              boxShadow: isCurrentValid ? `0 0 16px ${internalHex}55` : 'none',
            }}
          >
            <Pipette className="w-3.5 h-3.5 text-white/80 drop-shadow group-hover:text-white" />
          </div>
        </div>

        {/* Input Text Hexadecimal */}
        <div className="flex-1">
          <input
            type="text"
            value={internalHex}
            onChange={handleTextChange}
            placeholder="#RRGGBB"
            maxLength={7}
            disabled={disabled}
            className={`w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border text-xs font-mono uppercase transition-all duration-200 ease-in-out focus:bg-white focus:text-gray-900 focus:placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/40 focus:outline-none focus:shadow-lg focus:shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed ${
              isCurrentValid ? 'border-white/10 text-white' : 'border-red-500/50 text-red-300'
            }`}
          />
        </div>
      </div>

      {/* Presets Cênicos Rápidos */}
      <div className="pt-1">
        <span className="text-[10px] text-gray-500 block mb-1.5 uppercase tracking-wider font-semibold">
          Presets Cênicos
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_COLORS.map((preset) => {
            const isSelected = value.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                onClick={() => handleSelectPreset(preset.hex)}
                disabled={disabled}
                title={`${preset.name} (${preset.hex})`}
                className={`w-6 h-6 rounded-lg border transition-all duration-150 flex items-center justify-center ${
                  isSelected
                    ? 'border-white scale-110 shadow-md ring-2 ring-white/20'
                    : 'border-white/20 hover:scale-105 hover:border-white/40 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: preset.hex }}
              >
                {isSelected && <Check className="w-3 h-3 text-white drop-shadow stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ColorSwatch;
