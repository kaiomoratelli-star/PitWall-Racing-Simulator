/* ============================================================
   PIT WALL — retrato ilustrado para quem não tem foto
   Busto em vetor, sempre no mesmo estilo; os traços saem do id do piloto
   (sempre iguais para a mesma pessoa e diferentes entre pessoas):
   formato do rosto, tom de pele, cabelo (corte e cor), sobrancelhas, olhos,
   nariz, boca, barba, óculos. Macacão e fundo nas cores da equipe.
   ============================================================ */
'use strict';

const Avatar = {};
Avatar.SKIN = ['#f6d7c3', '#eec1a0', '#e0a882', '#c98d66', '#a8714d', '#8a5a3c', '#6b4329', '#f1cdb0'];
Avatar.HAIR = ['#1d1612', '#3b2a1f', '#5a3b24', '#7b5534', '#a87d4c', '#d3b06c', '#b5532d', '#8e8e8e', '#2c2c34'];
Avatar.cache = new Map();
/* nomes claramente femininos (para pilotas fora da base, sem o dado de gênero) */
Avatar.FEM_NAMES = new Set(['Lucía', 'Lucia', 'Riona', 'Maite', 'Chloe', 'Chloé', 'Ella', 'Emma', 'Sofia', 'Sophia', 'Mia', 'Hamda', 'Amna', 'Marta', 'Nerea', 'Laura', 'Bianca', 'Julia', 'Giulia', 'Chiara', 'Martina', 'Valentina', 'Isabella', 'Olivia', 'Ava', 'Aurelia', 'Ginevra', 'Doriane', 'Lena', 'Lia', 'Megan', 'Jessica', 'Abbi', 'Tina', 'Emely', 'Nina', 'Aiko', 'Yuka', 'Miki', 'Rin', 'Juju', 'Bruna', 'Antonella', 'Carrie', 'Courtney', 'Hannah', 'Léa', 'Lea', 'Manon', 'Inès', 'Ines', 'Alba', 'Aiva', 'Alexia', 'Alisha', 'Maya', 'Zoe', 'Zoé', 'Amelia', 'Grace', 'Lily', 'Ruby', 'Tiana', 'Joanne', 'Ximena', 'Regina', 'Delfina', 'Abril', 'Mariana', 'Rafaela', 'Ananya', 'Diya', 'Freja', 'Ida', 'Linnea', 'Ebba', 'Aino', 'Marie', 'Lisa', 'Lotte', 'Sanne', 'Hanna', 'Madison', 'Avery', 'Mei', 'Yue', 'Natalia', 'Gabriela', 'Victoria', 'Camila', 'Paula']);
Avatar.rng = (id) => localRng('avatar:' + id);
Avatar.colors = (d) => {
  let c1 = '#3a3a44', c2 = '#15151e';
  if (d.team && G) { const t = Career.team(G, d.team); if (t) { c1 = t.color; c2 = t.color2 || '#15151e'; } }
  else if (d.cat && G && typeof Cats !== 'undefined') { const C = Cats.get(G, d.cat); const t = C && C.teams.find(x => x.id === d.ctm || x.name === d.ctm); if (t && t.color) c1 = t.color; else if (C) c1 = C.color; }
  return [c1, c2];
};
Avatar.svg = (d) => {
  const key = d.id + ':' + (d.team || d.cat || '');
  if (Avatar.cache.has(key)) return Avatar.cache.get(key);
  const r = Avatar.rng(d.id);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const first = String(d.name || '').split(' ')[0];
  const fem = (typeof Disc !== 'undefined' ? Disc.isWoman(d) : d.gender === 'F') || Avatar.FEM_NAMES.has(first);
  const regionDark = ['BRA', 'USA', 'GBR', 'FRA', 'RSA', 'COL', 'VEN', 'IND', 'MEX'].includes(d.nat);
  const asian = ['JPN', 'CHN', 'KOR', 'THA', 'MAS', 'IDN', 'SGP', 'HKG', 'MAC'].includes(d.nat);
  const skin = asian ? pick([Avatar.SKIN[0], Avatar.SKIN[1], Avatar.SKIN[7]]) : regionDark && r() < 0.35 ? pick(Avatar.SKIN.slice(3, 7)) : pick(Avatar.SKIN.slice(0, 5).concat([Avatar.SKIN[7]]));
  const age = d.age || 25;
  const hair = age >= 50 && r() < 0.6 ? pick(['#8e8e8e', '#b9b9b9', '#6d6d6d']) : asian ? pick(['#1d1612', '#2c2c34', '#3b2a1f']) : pick(Avatar.HAIR);
  const [c1, c2] = Avatar.colors(d);
  const fw = 30 + r() * 7, fh = 38 + r() * 6;            // largura/altura do rosto
  const ey = 54 + r() * 3, ex = 10 + r() * 3;             // olhos
  const style = fem ? pick(['long', 'long', 'bob', 'pony']) : pick(['short', 'buzz', 'side', 'wavy', 'curly', 'quiff']);
  const beard = !fem && age >= 22 && r() < 0.32 ? pick(['stubble', 'beard', 'goatee']) : null;
  const glasses = r() < 0.08;
  const smile = r() < 0.6;
  const brow = 1.6 + r() * 1.6;
  const cx = 50;
  const hairBack = {
    long: `<path d="M${cx - fw - 4} 50 Q${cx - fw - 8} 96 ${cx - fw + 2} 104 L${cx + fw - 2} 104 Q${cx + fw + 8} 96 ${cx + fw + 4} 50 Z" fill="${hair}"/>`,
    pony: `<path d="M${cx - fw - 3} 46 Q${cx - fw - 7} 80 ${cx - fw + 2} 92 L${cx - fw + 9} 92 Q${cx - fw + 4} 70 ${cx - fw + 4} 50 Z M${cx + fw + 3} 46 Q${cx + fw + 7} 80 ${cx + fw - 2} 92 L${cx + fw - 9} 92 Q${cx + fw - 4} 70 ${cx + fw - 4} 50 Z" fill="${hair}"/>`,
    bob: `<path d="M${cx - fw - 3} 48 Q${cx - fw - 5} 78 ${cx - fw + 4} 82 L${cx + fw - 4} 82 Q${cx + fw + 5} 78 ${cx + fw + 3} 48 Z" fill="${hair}"/>`,
    bun: `<circle cx="${cx}" cy="${22 - fh * 0.05}" r="9" fill="${hair}"/>`,
  }[style] || '';
  const hairTop = {
    short: `<path d="M${cx - fw} 50 Q${cx - fw - 2} 22 ${cx} 20 Q${cx + fw + 2} 22 ${cx + fw} 50 Q${cx + fw - 6} 34 ${cx} 33 Q${cx - fw + 6} 34 ${cx - fw} 50 Z" fill="${hair}"/>`,
    buzz: `<path d="M${cx - fw + 1} 46 Q${cx - fw} 24 ${cx} 23 Q${cx + fw} 24 ${cx + fw - 1} 46 Q${cx} 36 ${cx - fw + 1} 46 Z" fill="${hair}" opacity=".85"/>`,
    side: `<path d="M${cx - fw} 52 Q${cx - fw - 3} 20 ${cx + 4} 19 Q${cx + fw + 3} 22 ${cx + fw} 48 Q${cx + 8} 30 ${cx - 12} 34 Q${cx - fw + 4} 38 ${cx - fw} 52 Z" fill="${hair}"/>`,
    wavy: `<path d="M${cx - fw - 1} 52 Q${cx - fw - 6} 18 ${cx} 17 Q${cx + fw + 6} 18 ${cx + fw + 1} 52 Q${cx + fw - 4} 36 ${cx + 10} 36 Q${cx} 30 ${cx - 10} 36 Q${cx - fw + 4} 36 ${cx - fw - 1} 52 Z" fill="${hair}"/>`,
    curly: `<g fill="${hair}">${[-1, -0.6, -0.2, 0.2, 0.6, 1].map((k, i) => `<circle cx="${cx + k * fw * 0.9}" cy="${28 + (i % 2) * 4}" r="${9 + r() * 2}"/>`).join('')}<path d="M${cx - fw} 50 Q${cx - fw} 30 ${cx} 28 Q${cx + fw} 30 ${cx + fw} 50 Q${cx} 38 ${cx - fw} 50Z"/></g>`,
    quiff: `<path d="M${cx - fw} 50 Q${cx - fw - 2} 26 ${cx - 6} 22 Q${cx + 6} 10 ${cx + fw + 2} 26 Q${cx + fw + 1} 40 ${cx + fw} 50 Q${cx + 4} 32 ${cx - fw} 50 Z" fill="${hair}"/>`,
    long: `<path d="M${cx - fw - 1} 54 Q${cx - fw - 4} 18 ${cx} 18 Q${cx + fw + 4} 18 ${cx + fw + 1} 54 Q${cx + fw - 6} 32 ${cx + 2} 32 Q${cx - fw + 4} 34 ${cx - fw - 1} 54 Z" fill="${hair}"/>`,
    pony: `<path d="M${cx - fw} 50 Q${cx - fw - 2} 20 ${cx} 19 Q${cx + fw + 2} 20 ${cx + fw} 50 Q${cx + 4} 32 ${cx - fw} 50 Z" fill="${hair}"/>`,
    bob: `<path d="M${cx - fw - 2} 56 Q${cx - fw - 4} 18 ${cx} 18 Q${cx + fw + 4} 18 ${cx + fw + 2} 56 Q${cx + fw - 2} 34 ${cx - 6} 32 Q${cx - fw + 2} 36 ${cx - fw - 2} 56 Z" fill="${hair}"/>`,
    bun: `<path d="M${cx - fw} 50 Q${cx - fw - 2} 22 ${cx} 21 Q${cx + fw + 2} 22 ${cx + fw} 50 Q${cx} 34 ${cx - fw} 50 Z" fill="${hair}"/>`,
  }[style];
  const beardSvg = beard === 'beard' ? `<path d="M${cx - fw + 3} 60 Q${cx - fw + 6} ${50 + fh * 0.9} ${cx} ${52 + fh * 0.95} Q${cx + fw - 6} ${50 + fh * 0.9} ${cx + fw - 3} 60 Q${cx} 74 ${cx - fw + 3} 60 Z" fill="${hair}" opacity=".9"/>`
    : beard === 'goatee' ? `<path d="M${cx - 7} 76 Q${cx} ${52 + fh * 0.92} ${cx + 7} 76 Q${cx} 80 ${cx - 7} 76 Z" fill="${hair}" opacity=".85"/>`
    : beard === 'stubble' ? `<path d="M${cx - fw + 4} 62 Q${cx} ${54 + fh * 0.95} ${cx + fw - 4} 62 Q${cx} 76 ${cx - fw + 4} 62 Z" fill="${hair}" opacity=".28"/>` : '';
  const lashes = fem ? [-1, 1].map(s => `<path d="M${cx + s * ex - 3.6} ${ey - 2.6} L${cx + s * ex - 5.2} ${ey - 4.6} M${cx + s * ex + s * 3.2} ${ey - 2.8} L${cx + s * ex + s * 4.8} ${ey - 4.8}" stroke="#1d1612" stroke-width="1.2" stroke-linecap="round"/>`).join('') : '';
  const mouth = fem ? `<path d="M${cx - 6} 73.5 Q${cx} ${smile ? 78.5 : 76} ${cx + 6} 73.5 Q${cx} 71.8 ${cx - 6} 73.5 Z" fill="#c4626b"/>` : smile ? `<path d="M${cx - 7} 73 Q${cx} 79 ${cx + 7} 73" stroke="#5a2d22" stroke-width="2" fill="none" stroke-linecap="round"/>` : `<path d="M${cx - 6} 74.5 L${cx + 6} 74.5" stroke="#5a2d22" stroke-width="2" stroke-linecap="round"/>`;
  const eyes = asian ? [-1, 1].map(s => `<path d="M${cx + s * ex - 3.5} ${ey} Q${cx + s * ex} ${ey - 2.2} ${cx + s * ex + 3.5} ${ey}" stroke="#1d1612" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join('')
    : [-1, 1].map(s => `<ellipse cx="${cx + s * ex}" cy="${ey}" rx="2.6" ry="3" fill="#1d1612"/><circle cx="${cx + s * ex + 0.8}" cy="${ey - 1}" r=".8" fill="#fff"/>`).join('');
  const brows = [-1, 1].map(s => `<path d="M${cx + s * (ex - 5)} ${ey - 7} Q${cx + s * ex} ${ey - 9 - r() * 1.5} ${cx + s * (ex + 5)} ${ey - 7}" stroke="${hair === '#d3b06c' ? '#8a6a3a' : hair}" stroke-width="${brow.toFixed(1)}" fill="none" stroke-linecap="round"/>`).join('');
  const glassesSvg = glasses ? `<g fill="none" stroke="#222" stroke-width="1.6"><rect x="${cx - ex - 6}" y="${ey - 5}" width="12" height="10" rx="3"/><rect x="${cx + ex - 6}" y="${ey - 5}" width="12" height="10" rx="3"/><path d="M${cx - ex + 6} ${ey} L${cx + ex - 6} ${ey}"/></g>` : '';
  const svg = `<svg class="avatar" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="avbg-${hashStr(key)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="#0f0f15"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#avbg-${hashStr(key)})"/>${hairBack}
    <path d="M14 104 Q16 82 34 78 L66 78 Q84 82 86 104 Z" fill="${c1}"/><path d="M14 104 Q16 86 30 81 L38 104 Z M86 104 Q84 86 70 81 L62 104 Z" fill="${c2}" opacity=".55"/>
    <path d="M40 76 L60 76 L58 86 L42 86 Z" fill="${skin}" filter="brightness(.92)"/><path d="M38 80 L50 90 L62 80" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8"/>
    <ellipse cx="${cx - fw + 1}" cy="${ey + 2}" rx="4" ry="6" fill="${skin}"/><ellipse cx="${cx + fw - 1}" cy="${ey + 2}" rx="4" ry="6" fill="${skin}"/>
    <ellipse cx="${cx}" cy="${54}" rx="${fw - 2}" ry="${fh / 1.55}" fill="${skin}"/>
    ${hairTop}${beardSvg}${brows}${eyes}${lashes}${glassesSvg}
    <path d="M${cx} ${ey + 4} Q${cx - 3} ${ey + 11} ${cx} ${ey + 13}" stroke="#000" stroke-opacity=".22" stroke-width="1.6" fill="none" stroke-linecap="round"/>${mouth}</svg>`;
  Avatar.cache.set(key, svg);
  return svg;
};

/* retrato: foto quando existe; senão, o retrato ilustrado */
headshot = function (d, cls = '') {
  const face = d && typeof Assets !== 'undefined' ? Assets.face(d) : null;
  const u = face || (d && imgUrl(d.img));
  const tc = d && d.team && G ? teamColor(d.team) : '#3a3a44';
  if (u) return `<span class="hs ${cls}" style="--tc:${tc}"><img src="${u}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()"></span>`;
  if (!d) return `<span class="hs noimg ${cls}" style="--tc:${tc}"><b></b></span>`;
  return `<span class="hs av ${cls}" style="--tc:${tc}" title="${esc(byLang('Retrato ilustrado (sem foto)', 'Illustrated portrait (no photo)'))}">${Avatar.svg(d)}</span>`;
};
