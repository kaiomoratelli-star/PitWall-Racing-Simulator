/* ============================================================
   PIT WALL — base de pilotos reais (DRIVER_DB, gerada por scripts/import_drivers.py)
   1. Pilotos já no jogo ganham id único (uid), apelidos e a carreira real
      temporada a temporada (série, equipe, posição, status, fonte).
   2. Pilotos de séries que o jogo ainda não simula (IndyCar, WEC, IMSA,
      NASCAR, DTM, Stock Car, F1 Academy...) entram no universo como pilotos
      empregados na série deles (d.series): aparecem no mercado para a
      temporada seguinte, nunca como substitutos imediatos.
   3. Superlicença: as classificações reais rendem pontos pela tabela da FIA.
   Nada aqui inventa contratos: a situação de 2027 só vale como anunciada
   quando a fonte a lista; o resto fica como "a definir".
   ============================================================ */
'use strict';

const DriverDB = {};
/* faixa de nota (equivalente F1) por série: [mínimo, máximo] */
DriverDB.RANGE = {
  f1: [80, 94], indycar: [75, 85], fe: [75, 85], sf: [73, 83], wec: [70, 82], f2: [72, 81], imsa: [68, 80], dtm: [67, 79], f3: [66, 78], nxt: [65, 76],
  elms: [64, 76], supercars: [65, 77], stockcar: [63, 76], nascup: [64, 77], nasxf: [61, 72], nastr: [57, 68], sfl: [62, 72], freca: [61, 74], efo: [60, 71], gb3: [59, 71],
  eurocup3: [58, 70], frme: [59, 72], fram: [57, 69], frj: [56, 68], froc: [56, 68], usfpro: [57, 69], alms: [57, 70], f1a: [50, 65], usf2000: [53, 65], fws: [52, 64],
  f4it: [52, 66], f4es: [52, 66], f4gb: [52, 66], e4: [52, 65], f4br: [50, 63], f4us: [49, 62], f4jp: [50, 63], f4uae: [51, 64], f4cez: [49, 62], f4au: [48, 61], f4de: [50, 64],
};
/* tabela de superlicença (Apêndice L da FIA) para as séries fora do jogo; "estimado" quando não conferido linha a linha */
DriverDB.SL = { indycar: [40, 30, 20, 10, 8, 6, 4, 3, 2, 1], wec: [20, 16, 12, 10, 8, 6, 4, 3, 2, 1], nxt: [15, 12, 10, 7, 5, 3, 2, 1, 0, 0], f1a: [10, 7, 5, 3, 2, 1, 0, 0, 0, 0], dtm: [10, 8, 6, 4, 3, 2, 1, 0, 0, 0], imsa: [10, 8, 6, 4, 3, 2, 1, 0, 0, 0], f2: [40, 40, 40, 30, 20, 10, 8, 6, 4, 3], f3: [30, 25, 20, 15, 12, 9, 7, 5, 3, 2], fe: [30, 25, 20, 10, 8, 6, 4, 3, 2, 1], sf: [25, 20, 15, 10, 8, 6, 5, 4, 3, 2], freca: [25, 20, 15, 10, 7, 5, 3, 2, 1, 0], usfpro: [10, 8, 6, 4, 3, 2, 1, 0, 0, 0] };
DriverDB.SL_ESTIMATED = ['nxt', 'f1a', 'dtm', 'imsa', 'usfpro', 'wec'];
DriverDB.on = () => typeof DRIVER_DB !== 'undefined' && DRIVER_DB.drivers && DRIVER_DB.drivers.length > 0;
DriverDB.norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(.*?\)/g, '').replace(/[^a-z]+/g, ' ').trim();
DriverDB.seriesName = (sid) => (DriverDB.on() && DRIVER_DB.series[sid] ? DRIVER_DB.series[sid].name : sid);

/* carreira real compacta: [ano, série, equipe, posição, status] */
DriverDB.compact = (p) => p.seasons.map(s => [s.y, s.s, s.team || '', s.pos || null, s.status, s.pts ?? null, s.w || 0]);
/* nota estimada pela melhor campanha recente, na faixa da série */
DriverDB.rating = (p) => {
  let best = null;
  p.seasons.filter(s => s.y >= 2024 && s.y <= 2026).forEach(s => {
    const r = DriverDB.RANGE[s.s]; if (!r) return;
    const n = (DRIVER_DB.series[s.s] && DRIVER_DB.series[s.s].seasons[s.y] && DRIVER_DB.series[s.s].seasons[s.y].n) || 24;
    const q = s.pos ? 1 - (s.pos - 1) / Math.max(1, n - 1) : 0.3;
    const v = r[0] + (r[1] - r[0]) * Math.pow(Math.max(0, q), 1.2) + (s.y === 2026 ? 0.5 : 0);
    if (best == null || v > best) best = v;
  });
  return best == null ? null : Math.round(best);
};
DriverDB.latest = (p, maxY = 2027) => p.seasons.filter(s => s.y <= maxY).slice(-1)[0] || null;

DriverDB.init = (G) => {
  if (!DriverDB.on() || G.driverDbDone) return;
  const year = G.db.rules.startYear || 2027;
  const idx = new Map();
  G.db.drivers.forEach(d => { idx.set(DriverDB.norm(d.name), d); });
  const pool = [];
  DRIVER_DB.drivers.forEach(p => {
    const keys = [p.name, ...(p.aliases || [])].map(DriverDB.norm);
    const d = keys.map(k => idx.get(k)).find(Boolean);
    if (d) {
      if (d.uid && d.uid !== p.uid) return; // homônimo já ligado a outra pessoa
      d.uid = p.uid; d.aliases = p.aliases; d.realSeasons = DriverDB.compact(p);
      if (!d.dob && p.dob) d.dob = p.dob;
      if (!d.img && p.img) d.commonsImg = p.img;
      DriverDB.addSl(d, p);
      return;
    }
    pool.push(p);
  });
  // pilotos de outras séries entram no universo (vivos, ativos em 2025–2027, idade coerente)
  let added = 0;
  pool.forEach(p => {
    if (p.dod) return;
    if ([p.name, ...(p.aliases || [])].some(n => idx.has(DriverDB.norm(n)))) return; // mesmo nome já no universo
    const last = DriverDB.latest(p);
    if (!last || last.y < 2025) return;
    const age = p.dob ? year - Number(p.dob.slice(0, 4)) : null;
    if (age != null && (age < 14 || age > 45)) return;
    const ovr = DriverDB.rating(p) ?? (DriverDB.RANGE[last.s] ? DriverDB.RANGE[last.s][0] + 1 : null);
    if (ovr == null) return;
    const C = { id: last.s, tier: 3 };
    const d = Cats.makeDriver(G, { name: p.name, nat: p.nat || 'GBR', dob: p.dob, no: (p.seasons.slice(-1)[0] || {}).no, team: last.team }, C, ovr, age ?? 26);
    d.cat = null; d.series = last.s; d.seriesTeam = last.team || null; d.seriesStatus = last.status;
    d.uid = p.uid; d.aliases = p.aliases; d.realSeasons = DriverDB.compact(p); d.origin = 'driverdb';
    if (p.img) d.commonsImg = p.img;
    DriverDB.addSl(d, p);
    G.db.drivers.push(d); added++;
    [p.name, ...(p.aliases || [])].forEach(n => idx.set(DriverDB.norm(n), d));
  });
  // situação do assento na F1 para a temporada inicial, conforme a fonte (sem inventar contratos)
  G.db.drivers.filter(d => d.team && d.seat !== 'R').forEach(d => {
    const p = d.uid && DRIVER_DB.drivers.find(x => x.uid === d.uid);
    const s = p && p.seasons.find(x => x.y === year && x.s === 'f1');
    d.seatStatus = s ? { y: year, status: 'confirmado (lista anunciada)', src: s.src, ver: s.ver } : { y: year, status: 'vaga ainda não definida na fonte', src: DRIVER_DB.meta.source, ver: DRIVER_DB.meta.verified };
  });
  G.driverDbDone = { year, matched: DRIVER_DB.drivers.length - pool.length, added, verified: DRIVER_DB.meta.verified };
  Career.record(G, 'inicio', `Base de pilotos reais: ${G.driverDbDone.matched} pilotos ligados à carreira real e ${added} pilotos de outras categorias no universo (fonte: ${DRIVER_DB.meta.source}, verificada em ${DRIVER_DB.meta.verified}).`);
};
DriverDB.addSl = (d, p) => {
  d.sl = d.sl || [];
  p.seasons.forEach(s => {
    const tab = DriverDB.SL[s.s];
    if (!tab || !s.pos || s.y > 2026 || d.sl.some(x => x.y === s.y && x.cat === s.s)) return;
    const pts = tab[s.pos - 1] || 0;
    if (pts) d.sl.push({ y: s.y, cat: s.s, pts, real: true });
  });
};
/* duplicidades: mesmo uid em dois pilotos, ou mesmo nome e nascimento */
DriverDB.duplicates = (G) => {
  const seen = new Map(), out = [];
  G.db.drivers.forEach(d => {
    const keys = [d.uid ? 'u:' + d.uid : null, 'n:' + DriverDB.norm(d.name) + ':' + (d.dob || '')].filter(Boolean);
    keys.forEach(k => { if (seen.has(k) && seen.get(k) !== d) out.push([seen.get(k).id, d.id, k]); else seen.set(k, d); });
  });
  return out;
};

/* fim de temporada: quem corre em série profissional segue lá até se aposentar pela idade;
   quem estava numa série de base passa a disputar vaga nas categorias do jogo */
DriverDB.PRO = new Set(['indycar', 'fe', 'sf', 'wec', 'imsa', 'elms', 'alms', 'nascup', 'nasxf', 'nastr', 'dtm', 'stockcar', 'supercars', 'nxt', 'f2', 'f3', 'sfl']);
DriverDB.endSeason = (G) => {
  const y = G.season.year;
  G.db.drivers.forEach(d => {
    if (!d.series || d.retired || d.team) { if (d.team) { d.series = null; d.seriesTeam = null; } return; }
    if (d.series === 'kart') return;                                   // kart: ciclo próprio (kart.js)
    if (!DriverDB.PRO.has(d.series)) { d.series = null; d.seriesTeam = null; return; }
    const r = localRng(`ser:${G.seed}:${d.id}:${y}`)();
    if (d.age >= 42 || (d.age >= 36 && r < 0.12 + (d.age - 36) * 0.06)) { d.retired = true; d.retiredYear = y; }
  });
};
