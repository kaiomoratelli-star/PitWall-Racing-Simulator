/* ============================================================
   PIT WALL — utilidades: RNG com semente, matemática, formatação
   ============================================================ */
'use strict';

/* RNG mulberry32 — o estado fica salvo na carreira, então cada carreira
   tem sua própria sequência e o save continua de onde parou. */
const RNG = {
  state: 1,
  seed(s) { this.state = (typeof s === 'number' ? s : hashStr(String(s))) >>> 0 || 1; },
  next() {
    let t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  range(a, b) { return a + (b - a) * this.next(); },
  int(a, b) { return Math.floor(this.range(a, b + 1)); },
  chance(p) { return this.next() < p; },
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
  normal(mu = 0, sd = 1) {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  weighted(items, wfn) {
    const ws = items.map(wfn);
    const tot = ws.reduce((a, b) => a + b, 0);
    let r = this.next() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
};

/* RNG local e determinístico (não mexe no estado global) — usado para
   formas de pista e geração estável a partir de um id. */
function localRng(seed) {
  let s = (typeof seed === 'number' ? seed : hashStr(String(seed))) >>> 0 || 1;
  return () => {
    let t = (s = (s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function localRngNormal(seed) {
  const r = localRng(seed);
  let u = r() || 1e-9, v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* idioma do texto gerado pelo jogo (narração, rádio, eventos): 'pt' ou 'en'.
   A interface troca por I18N (i18n.js); o núcleo usa byLang(pt, en) nas frases montadas no código.
   O nome é longo de propósito: na 0.7 ele se chamava "tr" e colidia com variáveis locais de
   circuito (const tr = Career.track(...)), travando a corrida. scripts/check-scope.js impede a volta. */
let LANG = 'pt';
const byLang = (pt, en) => (LANG === 'en' && en != null ? en : pt);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sum = arr => arr.reduce((a, b) => a + b, 0);
const avg = arr => arr.length ? sum(arr) / arr.length : 0;
const deepClone = o => JSON.parse(JSON.stringify(o));
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const byId = (arr, id) => arr.find(x => x.id === id);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtLap(sec) {
  if (sec == null || !isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}
function fmtGap(sec) {
  if (sec == null || !isFinite(sec)) return '—';
  return (sec >= 0 ? '+' : '−') + Math.abs(sec).toFixed(3);
}
function fmtRaceTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}
function fmtMoney(m) {
  // valores em milhões
  const neg = m < 0;
  const v = Math.abs(m);
  const txt = v >= 1 ? `$${v.toFixed(v >= 100 ? 0 : 1)}M` : `$${Math.round(v * 1000)}K`;
  return neg ? `−${txt}` : txt;
}
function ordinal(n) { return `${n}º`; }

/* Nomes para staff, novatos e pilotos gerados — por nacionalidade */
const NAME_POOL = {
  BRA: { f: ['Lucas', 'Pedro', 'Thiago', 'Bruno', 'Caio', 'Felipe', 'Enzo', 'Vitor', 'Henrique', 'Murilo', 'Beatriz', 'Larissa'], l: ['Silva', 'Souza', 'Andrade', 'Barros', 'Monteiro', 'Pacheco', 'Teixeira', 'Rocha', 'Prado', 'Fontes', 'Bastos'] },
  GBR: { f: ['James', 'Harry', 'Oliver', 'George', 'Jack', 'Alfie', 'Thomas', 'Emily', 'Charlotte'], l: ['Whitmore', 'Hale', 'Carter', 'Bennett', 'Pryce', 'Sutton', 'Lowe', 'Barrow', 'Fenwick'] },
  ITA: { f: ['Marco', 'Andrea', 'Giulio', 'Matteo', 'Davide', 'Riccardo', 'Giulia'], l: ['Rossetti', 'Galli', 'Ferraresi', 'Conti', 'Moretti', 'Bellandi', 'Caruso'] },
  GER: { f: ['Jonas', 'Lukas', 'Tobias', 'Niklas', 'Florian', 'Lena'], l: ['Hoffmann', 'Wagner', 'Krüger', 'Lehmann', 'Vogel', 'Schäfer'] },
  FRA: { f: ['Julien', 'Hugo', 'Mathis', 'Louis', 'Baptiste', 'Camille'], l: ['Moreau', 'Lefèvre', 'Girard', 'Roux', 'Fontaine', 'Chevalier'] },
  ESP: { f: ['Pablo', 'Álvaro', 'Javier', 'Sergio', 'Iker', 'Lucía'], l: ['Navarro', 'Ortega', 'Castillo', 'Romero', 'Vidal', 'Serrano'] },
  NED: { f: ['Daan', 'Sem', 'Bram', 'Luuk', 'Thijs'], l: ['de Wit', 'Bakker', 'Visser', 'Smit', 'Meijer'] },
  JPN: { f: ['Haruto', 'Ren', 'Sota', 'Takumi', 'Riku', 'Yui'], l: ['Tanaka', 'Sato', 'Watanabe', 'Kobayashi', 'Nakamura'] },
  USA: { f: ['Tyler', 'Cole', 'Logan', 'Mason', 'Hunter', 'Avery'], l: ['Mitchell', 'Reed', 'Brooks', 'Hayes', 'Parker'] },
  AUS: { f: ['Lachlan', 'Cooper', 'Mitchell', 'Jai'], l: ['Kerr', 'Doyle', 'Bradshaw', 'Quinlan'] },
  MEX: { f: ['Emiliano', 'Santiago', 'Rodrigo', 'Andrés'], l: ['Guerrero', 'Villalobos', 'Cárdenas', 'Treviño'] },
  ARG: { f: ['Franco', 'Facundo', 'Nicolás', 'Tomás'], l: ['Ibarra', 'Quiroga', 'Ledesma', 'Sosa'] },
  FIN: { f: ['Aleksi', 'Eetu', 'Joonas', 'Valtteri'], l: ['Korhonen', 'Laine', 'Virtanen', 'Heikkinen'] },
  CHN: { f: ['Hao', 'Jun', 'Lei', 'Yifan'], l: ['Zhang', 'Liu', 'Wang', 'Zhou'] },
  CAN: { f: ['Liam', 'Nathan', 'Étienne', 'Owen'], l: ['Tremblay', 'Roy', 'MacLeod', 'Bouchard'] },
  POR: { f: ['Duarte', 'Rodrigo', 'Tiago', 'Inês'], l: ['Ferreira', 'Carvalho', 'Pinto', 'Correia'] },
  IND: { f: ['Rohan', 'Kabir', 'Vikram'], l: ['Sharma', 'Iyer', 'Kapoor'] },
  SWE: { f: ['Axel', 'Viktor', 'Elias'], l: ['Lindgren', 'Sjöberg', 'Nyström'] },
  BEL: { f: ['Arthur', 'Lars', 'Jules'], l: ['Peeters', 'Janssens', 'Maes'] },
  DEN: { f: ['Magnus', 'Mads', 'Frederik'], l: ['Holm', 'Lund', 'Dahl'] },
};
const NATS = Object.keys(NAME_POOL);
function randomName(nat) {
  const pool = NAME_POOL[nat] || NAME_POOL[RNG.pick(NATS)];
  return `${RNG.pick(pool.f)} ${RNG.pick(pool.l)}`;
}

const NAT_NAMES = {
  BRA: 'Brasil', GBR: 'Reino Unido', ITA: 'Itália', GER: 'Alemanha', FRA: 'França', ESP: 'Espanha', NED: 'Holanda',
  JPN: 'Japão', USA: 'EUA', AUS: 'Austrália', MEX: 'México', ARG: 'Argentina', FIN: 'Finlândia', CHN: 'China',
  CAN: 'Canadá', POR: 'Portugal', IND: 'Índia', SWE: 'Suécia', BEL: 'Bélgica', DEN: 'Dinamarca', MON: 'Mônaco',
  SUI: 'Suíça', AUT: 'Áustria', IRL: 'Irlanda', NOR: 'Noruega', NZL: 'Nova Zelândia', THA: 'Tailândia',
  BHR: 'Bahrein', KSA: 'Arábia Saudita', HUN: 'Hungria', AZE: 'Azerbaijão', SGP: 'Singapura', QAT: 'Catar', UAE: 'Emirados Árabes'
};
