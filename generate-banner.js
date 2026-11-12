const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const W = 3840;
const H = 1080;
const NAVY = '#0f1c2e';
const TEAL = '#14b894';
const BLUE = '#0a5aa0';
const ACCENT = '#7cc4ff';

async function generateBanner(outPath) {
  // Build HTML canvas content with fiber-optic style SVG
  const svgContent = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a1628"/>
          <stop offset="50%" stop-color="#0f1c2e"/>
          <stop offset="100%" stop-color="#0a1a2e"/>
        </linearGradient>
        <radialGradient id="glow1" cx="30%" cy="50%" r="60%">
          <stop offset="0%" stop-color="${TEAL}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glow2" cx="75%" cy="30%" r="50%">
          <stop offset="0%" stop-color="${BLUE}" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
        </radialGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
        <filter id="blur2">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <rect width="${W}" height="${H}" fill="url(#glow1)"/>
      <rect width="${W}" height="${H}" fill="url(#glow2)"/>
      <!-- Fiber strands -->
      ${Array.from({length: 28}, (_, i) => {
        const y = 80 + Math.random() * (H - 160);
        const spread = 100 + Math.random() * 300;
        const op = 0.15 + Math.random() * 0.35;
        const color = Math.random() > 0.5 ? TEAL : ACCENT;
        const len = 400 + Math.random() * 1200;
        return `<line x1="${-100}" y1="${y}" x2="${W + 100}" y2="${y + (Math.random() - 0.5) * spread}" stroke="${color}" stroke-width="${0.8 + Math.random() * 2.5}" stroke-opacity="${op}" filter="url(#blur${Math.random() > 0.5 ? '2' : ''})"/>`;
      }).join('\n      ')}
      <!-- Bright pulse points -->
      ${Array.from({length: 40}, () => {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 2 + Math.random() * 6;
        const op = 0.3 + Math.random() * 0.5;
        const color = Math.random() > 0.6 ? TEAL : ACCENT;
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${op}"/>`;
      }).join('\n      ')}
      <!-- Brand text area overlay (dark fade on left) -->
      <rect x="0" y="0" width="${W * 0.55}" height="${H}" fill="url(#fadeLeft)" opacity="0.6"/>
      <defs>
        <linearGradient id="fadeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${NAVY}" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <!-- Subtle grid overlay -->
      <g opacity="0.04" stroke="#fff" stroke-width="0.5">
        ${Array.from({length: 20}, (_, i) => `<line x1="${i * (W/19)}" y1="0" x2="${i * (W/19)}" y2="${H}"/>`).join('')}
        ${Array.from({length: 6}, (_, i) => `<line x1="0" y1="${i * (H/5)}" x2="${W}" y2="${i * (H/5)}"/>`).join('')}
      </g>
    </svg>`;

  // Write SVG then convert to PNG
  const tmpSvg = path.join(__dirname, '_banner_tmp.svg');
  fs.writeFileSync(tmpSvg, svgContent);

  await sharp(tmpSvg)
    .png()
    .toFile(outPath);

  fs.unlinkSync(tmpSvg);
  console.log(`Generated: ${outPath}`);
}

generateBanner(path.join(__dirname, 'hero-banner-4k.png'))
  .then(() => console.log('Done!'))
  .catch(err => console.error('Error:', err));
