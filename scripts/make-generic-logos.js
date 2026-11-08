/* Gera os 20 logos genéricos (emblemas brancos em SVG) para equipes criadas pelo jogador.
   Ficam sobre a cor da equipe no quadrado do logo, como os emblemas monocromáticos das equipes reais.
   Uso: node scripts/make-generic-logos.js */
'use strict';
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'app', 'assets', 'img', 'logos', 'generic');
fs.mkdirSync(OUT, { recursive: true });

const W = '#FFFFFF';
const S = (body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256"${extra}>${body}</svg>\n`;
const LOGOS = [
  // 1 escudo com faixa diagonal
  `<path d="M50 6 88 18v30c0 24-17 38-38 46C29 86 12 72 12 48V18z" fill="none" stroke="${W}" stroke-width="7"/><path d="M28 66 70 24" stroke="${W}" stroke-width="10" stroke-linecap="round"/>`,
  // 2 chevrons de velocidade
  `<path d="M14 22 40 50 14 78M40 22 66 50 40 78M66 22 92 50 66 78" fill="none" stroke="${W}" stroke-width="9" stroke-linejoin="round"/>`,
  // 3 asa estilizada
  `<path d="M8 58c20-4 44-22 84-40-10 16-22 30-36 40l20 2c-18 12-40 20-68 18z" fill="${W}"/>`,
  // 4 estrela de cinco pontas em anel
  `<circle cx="50" cy="50" r="42" fill="none" stroke="${W}" stroke-width="6"/><path d="M50 18 58 42h25L63 57l8 25-21-15-21 15 8-25-20-15h25z" fill="${W}"/>`,
  // 5 bandeira quadriculada em losango
  `<g transform="rotate(45 50 50)"><rect x="22" y="22" width="56" height="56" fill="none" stroke="${W}" stroke-width="5"/>${[0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => (i + j) % 2 ? '' : `<rect x="${22 + i * 14}" y="${22 + j * 14}" width="14" height="14" fill="${W}"/>`).join('')).join('')}</g>`,
  // 6 hexágono com raio
  `<path d="M50 6 88 28v44L50 94 12 72V28z" fill="none" stroke="${W}" stroke-width="6"/><path d="M56 18 30 56h18l-6 28 28-40H52z" fill="${W}"/>`,
  // 7 círculo dividido por linha de corrida
  `<circle cx="50" cy="50" r="40" fill="${W}"/><path d="M6 64C30 50 64 48 96 30" stroke="#000" stroke-opacity=".55" stroke-width="10" fill="none"/>`,
  // 8 ponta de flecha com recorte
  `<path d="M10 20 92 50 10 80 30 50z" fill="${W}"/><path d="M40 50 70 50" stroke="#000" stroke-opacity=".45" stroke-width="6"/>`,
  // 9 três faixas inclinadas
  `<path d="M18 84 44 16h12L30 84zM38 84 64 16h12L50 84zM58 84 84 16h12L70 84z" fill="${W}"/>`,
  // 10 coroa
  `<path d="M12 74 18 30 36 52 50 22 64 52 82 30 88 74z" fill="${W}"/><rect x="12" y="80" width="76" height="9" rx="3" fill="${W}"/>`,
  // 11 volante
  `<circle cx="50" cy="50" r="38" fill="none" stroke="${W}" stroke-width="9"/><circle cx="50" cy="50" r="9" fill="${W}"/><path d="M12 50h29M59 50h29M50 59v29" stroke="${W}" stroke-width="9"/>`,
  // 12 falcão (V aberto com cabeça)
  `<path d="M6 30 50 62 94 30 76 70 50 88 24 70z" fill="${W}"/><circle cx="50" cy="40" r="9" fill="${W}"/>`,
  // 13 triângulo com ápice cortado
  `<path d="M50 8 94 88H6z" fill="none" stroke="${W}" stroke-width="7" stroke-linejoin="round"/><path d="M50 40 70 78H30z" fill="${W}"/>`,
  // 14 capacete
  `<path d="M14 64c0-26 16-44 40-44 20 0 34 14 34 34v10H58l-8 14H18c-3 0-4-6-4-14z" fill="${W}"/><path d="M48 44h38v12H52z" fill="#000" fill-opacity=".5"/>`,
  // 15 pistão
  `<rect x="30" y="10" width="40" height="34" rx="6" fill="${W}"/><rect x="30" y="18" width="40" height="4" fill="#000" fill-opacity=".45"/><rect x="30" y="26" width="40" height="4" fill="#000" fill-opacity=".45"/><path d="M50 44v30" stroke="${W}" stroke-width="8"/><circle cx="50" cy="80" r="11" fill="none" stroke="${W}" stroke-width="7"/>`,
  // 16 cometa
  `<circle cx="68" cy="34" r="16" fill="${W}"/><path d="M56 46 10 92M62 52 24 92M50 40 10 76" stroke="${W}" stroke-width="6" stroke-linecap="round"/>`,
  // 17 brasão quadrado com número 1 estilizado
  `<rect x="12" y="12" width="76" height="76" rx="14" fill="none" stroke="${W}" stroke-width="7"/><path d="M42 30 56 22v56" stroke="${W}" stroke-width="10" fill="none" stroke-linecap="square"/>`,
  // 18 onda tripla
  `${[30, 50, 70].map(y => `<path d="M8 ${y}c14-12 28 12 42 0s28 12 42 0" fill="none" stroke="${W}" stroke-width="7" stroke-linecap="round"/>`).join('')}`,
  // 19 seta de curva
  `<path d="M20 80V46a26 26 0 0 1 52 0v6" fill="none" stroke="${W}" stroke-width="10"/><path d="M58 50h28L72 74z" fill="${W}"/>`,
  // 20 diamante facetado
  `<path d="M24 14h52l18 24-44 52L6 38z" fill="none" stroke="${W}" stroke-width="6" stroke-linejoin="round"/><path d="M6 38h88M24 14l12 24 14 52 14-52 12-24M36 38 50 14l14 24" fill="none" stroke="${W}" stroke-width="4"/>`,
];
LOGOS.forEach((b, i) => fs.writeFileSync(path.join(OUT, `${i + 1}.svg`), S(b)));
console.log('logos genéricos:', LOGOS.length, '->', OUT);
