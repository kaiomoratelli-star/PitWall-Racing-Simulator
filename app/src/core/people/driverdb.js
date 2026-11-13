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
// (0.9, ids opacos) no Pacote de dados (REAL_EXTRA.series.ratingRange); sem pacote, vazia
Object.defineProperty(DriverDB, 'RANGE', { get: () => seriesTable('ratingRange'), configurable: true });
/* tabela de superlicença (Apêndice L da FIA) para as séries fora do jogo; "estimado" quando não conferido linha a linha */
Object.defineProperty(DriverDB, 'SL', { get: () => seriesTable('slTable'), configurable: true });   // REAL_EXTRA.series.slTable
Object.defineProperty(DriverDB, 'SL_ESTIMATED', { get: () => seriesTable('slEstimated', []), configurable: true });
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
    const d = Cats.makeDriver(G, { id: p.cid, name: p.name, nat: p.nat || 'GBR', dob: p.dob, no: (p.seasons.slice(-1)[0] || {}).no, team: last.team }, C, ovr, age ?? 26);
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
    const s = p && p.seasons.find(x => x.y === year && x.s === mainSeries());
    d.seatStatus = s ? { y: year, status: 'confirmado (lista anunciada)', src: s.src, ver: s.ver } : { y: year, status: 'vaga ainda não definida na fonte', src: DRIVER_DB.meta.source, ver: DRIVER_DB.meta.verified };
  });
  G.driverDbDone = { year, matched: DRIVER_DB.drivers.length - pool.length, added, verified: DRIVER_DB.meta.verified };
  Career.record(G, 'inicio', byLang(`Base de pilotos reais: ${G.driverDbDone.matched} pilotos ligados à carreira real e ${added} pilotos de outras categorias no universo (fonte: ${DRIVER_DB.meta.source}, verificada em ${DRIVER_DB.meta.verified}).`, `Real driver database: ${G.driverDbDone.matched} drivers linked to their real careers and ${added} drivers from other series in the universe (source: ${DRIVER_DB.meta.source}, checked on ${DRIVER_DB.meta.verified}).`));
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
/* DriverDB (driverdb.com, DRIVERDB_2026): fonte de conferência. Liga cada perfil ao piloto do jogo pela mesma
   regra de identidade (persons.js) e só preenche o que falta: apelido, nascimento, nacionalidade, foto.
   Nascimento diferente do da Wikipedia/Wikidata não é trocado: vai para G.ddbConflicts (relatório). */
DriverDB.applyDdb = (G, opts = {}) => {
  if (typeof DRIVERDB_2026 === 'undefined' || typeof Persons === 'undefined') return 0;
  const idx = Persons.index(G.db.drivers);
  const people = DRIVERDB_2026.people || {};
  const seen = new Set(); let n = 0;
  G.ddbConflicts = [];
  Object.entries(DRIVERDB_2026.series || {}).forEach(([sid, rows]) => rows.forEach(row => {
    const [slug, name] = row;
    if (seen.has(slug)) return; seen.add(slug);
    const p = people[slug] || {};
    const nm = p.name || name;
    const d = idx.find(nm, { nat: p.nat || null });
    if (!d) return;
    n++;
    d.ddb = slug;
    if (Persons.key(nm) !== Persons.key(d.name) && !(d.aliases || []).includes(nm)) d.aliases = [...(d.aliases || []), nm];
    if (!d.nat && p.nat) d.nat = p.nat;
    if (p.dob && !d.dob) {
      d.dob = p.dob; d.dobSrc = 'DriverDB';
      if (opts.fixAge !== false && G.db.rules.startYear) d.age = (G.season ? G.season.year : G.db.rules.startYear) - Number(p.dob.slice(0, 4));
    } else if (p.dob && d.dob && d.dob.endsWith('-01-01') && p.dob.slice(0, 4) === d.dob.slice(0, 4) && p.dob !== d.dob) {
      d.dob = p.dob; d.dobSrc = 'DriverDB';                       // a fonte anterior só tinha o ano (gravado como 1º de janeiro)
    } else if (p.dob && d.dob && p.dob !== d.dob) G.ddbConflicts.push({ id: d.id, name: d.name, game: d.dob, ddb: p.dob });
  }));
  return n;
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
// (0.9, ids opacos) no Pacote de dados (REAL_EXTRA.series.dbPro / dbLate); sem pacote, vazios
Object.defineProperty(DriverDB, 'PRO', { get: () => new Set(seriesTable('dbPro', [])), configurable: true });
Object.defineProperty(DriverDB, 'LATE', { get: () => new Set(seriesTable('dbLate', [])), configurable: true });
DriverDB.endSeason = (G) => {
  const y = G.season.year;
  G.db.drivers.forEach(d => {
    if (!d.series || d.retired || d.team) { if (d.team) { d.series = null; d.seriesTeam = null; } return; }
    if (d.series === 'kart') return;                                   // kart: ciclo próprio (kart.js)
    const r = localRng(`ser:${G.seed}:${d.id}:${y}`)();
    // série de formação que o jogo não simula (GB3, USF Pro, Euroformula...): fica 1 a 3 anos, como na vida real, e depois procura vaga
    if (!DriverDB.PRO.has(d.series)) { d.seriesYears = (d.seriesYears || 1) + 1; if (d.age >= 22 || d.seriesYears > 3 || r < 0.35) { d.series = null; d.seriesTeam = null; } return; }
    const late = DriverDB.LATE.has(d.series);              // turismo, stock car e endurance: carreiras mais longas
    const [from, hard] = late ? [42, 54] : [36, 44];
    if (d.age >= hard || (d.age >= from && r < 0.1 + (d.age - from) * 0.05)) { d.retired = true; d.retiredYear = y; }
  });
};
