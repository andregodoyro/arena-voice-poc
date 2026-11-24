import * as THREE from 'three';
import { HERO_WALL_CONFIG } from '../components/stage/HeroShowcaseWall.constants';

/**
 * createFallbackTexture — Gera uma THREE.CanvasTexture institucional para
 * projetos ou eventos sem mídia cadastrada.
 *
 * Deve ser chamado apenas em resposta a mudanças de estado (useEffect),
 * não por frame — a textura é gerada uma vez e reutilizada.
 *
 * @param {string} label      - Título do projeto ou evento (exibido no telão)
 * @param {string} themeColor - Cor primária do branding (#hex)
 * @returns {THREE.CanvasTexture}
 */
export function createFallbackTexture(label = 'Arena Voice', themeColor = '#d90429') {
  const W = HERO_WALL_CONFIG.FALLBACK_CANVAS_WIDTH;
  const H = HERO_WALL_CONFIG.FALLBACK_CANVAS_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');

  // Fundo: gradiente radial centrado com cor do branding
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, themeColor + '28'); // 16% opacidade
  bg.addColorStop(1, '#06080d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Linha decorativa horizontal sutil
  ctx.strokeStyle = themeColor + '44';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.1, H * 0.635);
  ctx.lineTo(W * 0.9, H * 0.635);
  ctx.stroke();

  // Texto principal: nome do projeto/evento
  ctx.fillStyle = '#ffffffcc';
  ctx.font = 'bold 88px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Truncar label longo para caber no canvas
  const maxChars = 30;
  const displayLabel = label.length > maxChars
    ? label.slice(0, maxChars - 1) + '…'
    : label;

  ctx.fillText(displayLabel.toUpperCase(), W / 2, H / 2 - 20);

  // Subtítulo fixo "ARENA VOICE"
  ctx.fillStyle = themeColor + 'aa';
  ctx.font = '500 26px system-ui, -apple-system, sans-serif';
  ctx.fillText('ARENA VOICE', W / 2, H * 0.69);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

export default createFallbackTexture;
