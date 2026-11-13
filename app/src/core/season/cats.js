/* ============================================================
   PIT WALL — outras categorias (F2, F3, regionais, F4, Super Formula, Fórmula E)
   Simuladas em segundo plano e sincronizadas pelas datas do calendário da F1.
   Os pilotos são os mesmos do banco de dados: sobem de categoria, ganham
   pontos de superlicença e chegam à F1 (ou seguem para a FE e a Super Formula).
   ============================================================ */
'use strict';

const Cats = {};
Cats.SECONDARY = { frme: true, e4: true, f4uae: true };            // séries de inverno/paralelas: pilotos vêm de outras categorias
Cats.PRO = { fe: true, sf: true, indycar: true, wec: true, dtm: true, stockcar: true, nascup: true };                    // categorias profissionais (fim de linha fora da F1)
Cats.UP = { f4de: 'freca', f1a: 'freca', f4uae: 'freca', f4it: 'freca', f4es: 'freca', f4gb: 'freca', e4: 'freca', f4br: 'freca', f4us: 'fram', f4jp: 'frj', freca: 'f3', frme: 'f3', fram: 'f3', frj: 'f3', f3: 'f2' };
Cats.FEEDERS = {
  f2: ['f3', 'freca'], f3: ['freca', 'frme', 'fram', 'frj', 'f4it', 'f4es', 'f4gb', 'f4de'], freca: ['f4it', 'f4es', 'f4gb', 'f4de', 'e4', 'f4br', 'f1a', 'f4uae'], fram: ['f4us'], frj: ['f4jp'],
  fe: ['f2', 'sf'], sf: ['f2', 'frj', 'f3'],
  dtm: ['wec', 'f2', 'f3', 'freca', 'f4it', 'f4de', 'f4es', 'f4gb'], stockcar: ['f4br', 'fram', 'freca', 'f3', 'f2'], nascup: ['f4us', 'fram', 'indycar'],
};
/* faixas de nota revisadas (IndyCar estava inflada: 75–85 → 70–80) */
Cats.RANGE_FIX = { indycar: [70, 80] };
Cats.defs = () => (typeof REAL_CATS !== 'undefined' ? REAL_CATS.cats : []);
Cats.on = (G) => !!(G && G.cats && G.cats.order.length);
Cats.get = (G, id) => G.cats && G.cats.byId[id];
Cats.list = (G, all) => (G.cats ? G.cats.order.map(id => G.cats.byId[id]).filter(c => c && (all || c.enabled)) : []);
Cats.norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
/* (0.9) duas grafias da mesma equipe? Nome inteiro igual, ou a primeira palavra distintiva de uma (2+ letras, fora as
   genéricas) entre as palavras da outra. Antes era 'contém a primeira palavra': 'R-ace GP' (primeira palavra 'r') casava
   com qualquer equipe que tivesse um r, e 'Matt Stone Racing' com 'AMattheis Vogel' (piloto na equipe errada). As
   genéricas são as mesmas que o mundo fictício mantém, para os dois mundos casarem igual (regra 19). */
Cats.TEAM_WORDS = new Set(['racing', 'team', 'teams', 'motorsport', 'motorsports', 'grand', 'prix', 'gp', 'junior', 'sport', 'sports', 'by', 'the', 'and', 'de', 'engineering', 'competition', 'autosport', 'corse', 'scuderia']);
Cats.teamWords = (s) => Cats.norm(s).split(' ').filter(w => w.length >= 2 && !Cats.TEAM_WORDS.has(w));
Cats.sameTeam = (a, b) => { const x = Cats.norm(a), y = Cats.norm(b); if (!x || !y) return false; if (x === y) return true; const w = Cats.teamWords(a)[0]; return !!w && Cats.teamWords(b).includes(w); };
Cats.label = (G, d) => { const c = d && d.cat && Cats.get(G, d.cat); return c ? c.short : null; };

/* ---------- criação dos pilotos ---------- */
/* potencial em faixas, como na vida real: ~1,5% de talentos de elite, ~6% bons; a maioria para nas categorias de base.
   q (0–1) = desempenho real em 2026: campeões têm mais chance de ser fora de série */
Cats.rollPotential = (ovr, age, q, rnd) => {
  const pe = 0.015 + q * 0.05, pg = 0.06 + q * 0.14;
  const r = rnd();
  let pot;
  if (r < pe) pot = 89 + rnd() * 7;
  else if (r < pe + pg) pot = 83 + rnd() * 6;
  else pot = ovr + 3 + Math.pow(rnd(), 1.5) * Math.max(0, 83 - ovr - 3) * (age <= 21 ? 1 : 0.4);
  return Math.round(clamp(Math.max(pot, ovr + 1), 40, 97));
};
Cats.STYLES = ['complete', 'aggressive', 'smooth', 'qualifier', 'tyre-whisperer', 'racer', 'wet-master', 'calculator'];
Cats.makeDriver = (G, spec, C, ovr, age) => {
  // ids já usados nesta carreira (o cache é refeito quando a lista de pilotos muda de carreira ou é podada)
  if (!Cats._ids || Cats._idsArr !== G.db.drivers) { Cats._ids = new Set(G.db.drivers.map(d => d.id)); Cats._idsArr = G.db.drivers; }
  const ids = Cats._ids;
  // (0.9, regra 19) o pacote fictício traz o id calculado com o nome real: os mesmos ids nos dois mundos
  // piloto gerado pelo jogo: id pelo contador da carreira, não pelo nome sorteado (no mundo fictício o nome é outro e
  // o id tem de ser o mesmo; o estilo, o número e o potencial saem do id)
  let id = spec.id || (spec.regen ? Career.nextId(G, 'c-g') : 'c-' + Cats.norm(spec.name).replace(/ /g, '-').slice(0, 30));
  while (ids.has(id)) id += 'x';
  ids.add(id);
  const styles = Object.keys(STYLE_PROFILES);
  const style = styles[hashStr(id) % styles.length];
  const pot = Cats.rollPotential(ovr, age, spec.q || 0, localRng('pot:' + id));
  const raw = { id, name: spec.name, nat: spec.nat || 'GBR', age, dob: spec.dob || null, number: Number(spec.no) || (hashStr(id) % 98) + 2, style, ovr, potential: pot, team: null, salary: 0.2, contractYears: 0, img: spec.img || null };
  const d = normalizeDriver(raw, 0, new Set());
  d.cat = C.id; d.ctm = spec.team || null; d.sl = []; d.history = []; d.catYears = {};
  d.career = { starts: 0, wins: 0, podiums: 0, poles: 0, titles: 0, points: 0 };
  d.popularity = Math.round(clamp(8 + (ovr - 55) * 0.9 + (C.tier < 2 ? 15 : 0), 3, 60));
  if (spec.regen) d.regen = true;
  return d;
};
Cats.newRegen = (G, C) => {
  const nat = RNG.pick(NATS);
  const age = clamp(Math.round(C.ageRef + RNG.range(-1.5, 0.5)), 15, 30);
  const [lo, hi] = C.range;
  const ovr = Math.round(clamp(lo + (hi - lo) * Math.pow(RNG.next(), 1.6) * 0.75, lo - 2, hi));
  // nome fictício único: evita dois pilotos gerados com o mesmo nome no universo
  const taken = (n) => G.db.drivers.some(x => x.name === n);
  let name = randomName(nat);
  for (let i = 0; i < 12 && taken(name); i++) name = randomName(nat);
  if (taken(name)) {                                    // poucos nomes para a nacionalidade: sobrenome composto
    const pool = NAME_POOL[nat] || NAME_POOL.GBR;
    for (let i = 0; i < 20 && taken(name); i++) {
      const a = RNG.pick(pool.l), b = RNG.pick(pool.l);
      if (a !== b) name = `${RNG.pick(pool.f)} ${a}-${b}`;
    }
    for (let i = 0; taken(name) && i < 26; i++) name = name.replace(/^(\S+)( [A-Z]\.)? /, `$1 ${'ABCDEFGHIJKLMNOPRSTUVWXYZ'[i % 25]}. `);
  }
  const d = Cats.makeDriver(G, { name, nat, regen: true }, C, ovr, age);
  d.potential = Cats.rollPotential(ovr, age, 0, () => RNG.next());
  G.db.drivers.push(d);
  return d;
};

/* vagas por categoria: equipes × carros por equipe (substituições ao longo do ano não contam) */
Cats.seatCount = (C) => {
  const teams = Math.max(1, C.teams.length);
  if (['f2', 'f3', 'fe', 'freca', 'frme'].includes(C.id)) return teams * Math.max(1, Math.floor(C.drivers.length / teams));
  if (C.crew || C.id === 'indycar') return C.drivers.length;  // endurance: tripulações completas; IndyCar: equipes com 1 a 4 carros
  return Math.min(Math.max(teams, Math.round(C.drivers.length * 0.85)), C.tier >= 5 ? 30 : 34);
};

/* ---------- inicialização: grids reais de 2026 → temporada 2027 ---------- */
Cats.init = (G, only, opts) => {
  // only: lista de ids para acrescentar categorias novas a uma carreira em andamento (migração)
  const defs = Cats.defs().filter(C => !only || only.includes(C.id));
  if (!defs.length || (G.cats && !only)) return;
  Cats._ids = null;
  G.cats = G.cats || { order: [], byId: {} };
  const byName = new Map(G.db.drivers.map(d => [Cats.norm(d.name), d]));
  const people = Persons.index(G.db.drivers);
  const sorted = defs.slice().sort((a, b) => (Cats.SECONDARY[a.id] ? 1 : 0) - (Cats.SECONDARY[b.id] ? 1 : 0) || a.tier - b.tier);
  sorted.forEach(C => {
    const n = Math.max(2, C.standings.length);
    const tst = C.teamStandings || [];
    const spread = Cats.PRO[C.id] ? 22 : 10;
    const cat = {
      id: C.id, name: C.name, short: C.short, tier: C.tier, sl: C.sl, color: C.color, races: C.races, range: Cats.RANGE_FIX[C.id] || C.range, ageRef: C.age, seasonLabel: C.season,
      secondary: !!Cats.SECONDARY[C.id], pro: !!Cats.PRO[C.id], crew: !!C.crew, enabled: true, source: C.page,
      disc: C.disc || (C.crew ? 'end' : 'mono'), brief: C.brief || null, women: !!C.women, playoffs: !!C.playoffs, revived: C.revived || null,
      teams: C.teams.map((t, i) => {
        const p = tst.findIndex(x => Cats.sameTeam(t.name, x[1]));
        const q = p >= 0 ? 1 - p / Math.max(1, tst.length - 1) : 0.4;
        return { ...t, str: Math.round(50 + (q - 0.5) * spread + (hashStr(t.id) % 5) - 2) };
      }),
      baseCal: C.calendar, entries: [], seats: Cats.seatCount(C), archive: [], season: null,
    };
    // categoria que voltou no jogo (ex.: ADAC F4, encerrada em 2022): equipes e calendário reais, mas o grid
    // da última temporada real tem pilotos que hoje estão em outras séries. As vagas são preenchidas no grid inicial.
    (C.revived ? [] : C.drivers).forEach(spec => {
      const st = C.standings.find(x => Cats.norm(x[1]) === Cats.norm(spec.name));
      const pos = spec.pos || (st && st[0]) || null;
      const q = pos ? 1 - (pos - 1) / (n - 1) : 0.25;
      const [lo, hi] = Cats.RANGE_FIX[C.id] || C.range;
      const hn = spec.h != null ? spec.h : hashStr(spec.name);   // (0.9, regra 19) hash do nome real, que o pacote fictício leva pronto
      const ovr = Math.round(clamp(lo + (hi - lo) * Math.pow(clamp(q, 0, 1), 1.15) + ((hn % 25) - 12) / 10, lo - 3, hi + 1));
      const age = spec.dob ? 2027 - Number(spec.dob.slice(0, 4)) : C.age + ((hn % 3) - 1);
      let d = byName.get(Cats.norm(spec.name)) || people.find(spec.name, { nat: spec.nat, dob: spec.dob });
      if (!d) {
        d = Cats.makeDriver(G, { ...spec, q }, C, ovr, age);
        G.db.drivers.push(d); byName.set(Cats.norm(spec.name), d); people.add(d);
      } else if (d.id.startsWith('c-') && !cat.secondary && ovr > driverOverall(d)) {
        Cats.shift(d, ovr - driverOverall(d)); d.potential = Math.max(d.potential, ovr + 2);
      }
      if (!d.img && spec.img) d.img = spec.img;
      if (!cat.secondary && (!d.cat || (Cats.get(G, d.cat) || { tier: 99 }).tier > cat.tier || Cats.get(G, d.cat).secondary)) { d.cat = cat.id; d.ctm = spec.team; }
      if (!d.dob && spec.dob) d.dob = spec.dob;
      d.catYears = d.catYears || {};
      if (pos) { cat.rank0 = cat.rank0 || {}; cat.rank0[d.id] = pos; }
      if (pos) { d.history = d.history || []; d.history.push({ y: 2026, series: cat.short, cat: cat.id, pos, pts: st ? st[2] : 0, real: true }); }
      if (!cat.entries.some(e => e.did === d.id)) cat.entries.push({ did: d.id, team: spec.team, no: spec.no });
    });
    // temporada real de 2026 no histórico da categoria (e pontos de superlicença)
    if (C.revived && C.standings.length) cat.archive.push({ y: C.revived, real: true, top: C.standings.slice(0, 1).map(([p, name]) => [null, null, name]), teamChamp: null });
    else if (C.standings.length) {
      cat.archive.push({ y: 2026, real: true, top: C.standings.slice(0, 10).map(([p, name, pts]) => { const d = byName.get(Cats.norm(name)); return [d ? d.id : null, pts, name]; }), teamChamp: tst[0] ? tst[0][1] : null });
      const table = REAL_EXTRA.superlicense[cat.sl] || [];
      C.standings.slice(0, 10).forEach(([p, name]) => { const d = byName.get(Cats.norm(name)); if (d && table[p - 1]) { d.sl = d.sl || []; if (!d.sl.some(x => x.y === 2026 && x.cat === cat.sl)) d.sl.push({ y: 2026, cat: cat.sl, pts: table[p - 1] }); } });
    }
    G.cats.order.push(cat.id);
    G.cats.byId[cat.id] = cat;
  });
  // grids reais têm convidados e substitutos: mantém os mais bem classificados até o número de vagas
  Cats.list(G, true).filter(cat => !only || only.includes(cat.id)).forEach(cat => {
    if (cat.entries.length <= cat.seats) return;
    const r0 = cat.rank0 || {};
    cat.entries.sort((a, b) => (r0[a.did] || 99) - (r0[b.did] || 99));
    cat.entries.slice(cat.seats).forEach(e => { const d = Career.driver(G, e.did); if (d && d.cat === cat.id) d.cat = null; });
    cat.entries.length = cat.seats;
  });
  if (only) {
    // carreira em andamento: só as categorias novas abrem a temporada agora
    only.forEach(id => { const cat = Cats.get(G, id); if (!cat) return; cat.season = { year: G.season.year, cal: (cat.baseCal || []).map(e => ({ ...e, date: Cats.dateFor(cat, e.date, G.season.year, G, e) })).sort((a, b) => a.date.localeCompare(b.date)), next: 0, res: [], pts: {}, tpts: {}, st: {} }; cat.season.cal.forEach((e, i) => (e.r = i + 1)); });
    return;
  }
  // grid inicial: na criação da carreira roda depois da base de pilotos (DriverDB) e da unificação de pessoas
  if (opts && opts.defer) return;
  Cats.initialGrid(G);
};

/* ---------- grid inicial de 2027: grid real de 2026 + anúncios, sem inventar ----------
   Não há virada de ano simulada antes da primeira temporada: ninguém é promovido, aposentado
   ou transferido pelo jogo. Cada inscrição recebe um status:
   - 'anunciado': a fonte lista o piloto na série para 2027;
   - 'grid 2026': correu a série em 2026 e ainda não há anúncio para 2027 (a confirmar);
   - 'projeção': vaga aberta (piloto foi para a F1, categoria revivida...) preenchida pelo jogo com piloto real
     livre que vem da série de acesso ou da mesma disciplina;
   - 'gerado': sem piloto real disponível, o jogo cria um piloto fictício. */
Cats.STATUS = { anunciado: 'anunciado para 2027', grid2026: 'grid de 2026 (2027 a confirmar)', projecao: 'projeção do jogo', gerado: 'piloto fictício do jogo' };
Cats.realIn = (d, cid, y) => (d.realSeasons || []).some(s => s[0] === y && s[1] === cid);
Cats.initialGrid = (G) => {
  if (!Cats.on(G)) return;
  const y = G.season.year;
  const f1Race = (d) => d.team && d.seat !== 'R';
  const cats = Cats.list(G, true);
  const inMain = new Set();
  cats.filter(c => !c.secondary).forEach(cat => {
    cat.entries = cat.entries.filter(e => { const d = Career.driver(G, e.did); if (!d || d.retired || d.dead || f1Race(d)) { if (d && f1Race(d)) d.cat = null; return false; } return true; });
    // uma pessoa, uma categoria principal: fica na série em que correu de verdade em 2026 (ou na de nível mais alto)
    cat.entries = cat.entries.filter(e => {
      const d = Career.driver(G, e.did);
      if (d.cat && d.cat !== cat.id && cats.some(c => c.id === d.cat && !c.secondary)) return false;
      if (inMain.has(d.id)) return false;
      inMain.add(d.id); d.cat = cat.id; d.ctm = d.ctm || e.team; return true;
    });
    cat.entries.forEach(e => { const d = Career.driver(G, e.did); e.st = Cats.realIn(d, cat.id, y) ? 'anunciado' : 'grid2026'; });
  });
  // vagas abertas
  const free = (d) => !d.retired && !d.dead && !f1Race(d) && !inMain.has(d.id) && !d.futureTeam && d.series !== 'kart';
  const ordered = cats.filter(c => !c.secondary).sort((a, b) => a.tier - b.tier);
  ordered.forEach(cat => {
    let need = cat.seats - cat.entries.length;
    if (need <= 0) return;
    const ok = (d) => free(d) && (!cat.women || (typeof Disc !== 'undefined' ? Disc.isWoman(d) : d.gender === 'F')) && (typeof Disc === 'undefined' || Disc.willing(d, cat.disc || 'mono'));
    const age = (d) => d.age || 99;
    // 1) correu esta série de verdade em 2026/2027 e não está em outro grid
    const A = G.db.drivers.filter(d => ok(d) && !d.regen && (Cats.realIn(d, cat.id, 2026) || Cats.realIn(d, cat.id, y) || d.series === cat.id));
    // 2) projeção: piloto real livre que vem das séries de acesso (ou da mesma série no passado recente)
    const feeders = new Set([...(Cats.FEEDERS[cat.id] || []), ...Object.keys(Cats.UP).filter(k => Cats.UP[k] === cat.id)]);
    const last = (d) => (d.realSeasons || []).slice(-1)[0];
    const B = G.db.drivers.filter(d => ok(d) && !d.regen && !A.includes(d) && last(d) && last(d)[0] >= 2025 && (feeders.has(last(d)[1]) || last(d)[1] === cat.id || (cat.tier >= 5 && /^(f4|e4)/.test(last(d)[1]) && !(Cats.get(G, last(d)[1]) || {}).entries)) && age(d) >= (cat.ageRef || 16) - 3 && age(d) <= (cat.pro ? 45 : (cat.ageRef || 18) + 5));
    const sc = (d) => driverOverall(d) + (d.potential || 0) * 0.2 + (d.series === cat.id ? 3 : 0);
    const pick = [...A.sort((a, b) => sc(b) - sc(a)).map(d => [d, Cats.realIn(d, cat.id, y) ? 'anunciado' : 'grid2026']), ...B.sort((a, b) => sc(b) - sc(a)).map(d => [d, 'projecao'])];
    const seats = Cats.freeSeats(cat);
    for (let i = 0; need > 0; i++) {
      let [d, st] = pick[i] || [];
      if (!d) { d = Cats.newRegen(G, cat); st = 'gerado'; }
      const team = (d.seriesTeam && (cat.teams.find(t => Cats.sameTeam(d.seriesTeam, t.name)) || {}).id) || seats.shift() || RNG.pick(cat.teams).id;
      d.cat = cat.id; d.ctm = team; d.series = null; d.seriesTeam = null;
      inMain.add(d.id);
      cat.entries.push({ did: d.id, team, no: d.number, st });
      need--;
    }
  });
  // séries paralelas (inverno): sem aposentados nem pilotos de F1
  cats.filter(c => c.secondary).forEach(c => { c.entries = c.entries.filter(e => { const d = Career.driver(G, e.did); return d && !d.retired && !d.dead && !f1Race(d); }); });
  Cats.startSeason(G, y);
  if (typeof Market !== 'undefined') Market.syncAcademies(G);
  G.cats.gridDone = y;
};

/* aplica um ganho/perda igual em todos os atributos de pilotagem */
Cats.shift = (d, delta) => {
  ['pace', 'qualifying', 'racecraft', 'consistency', 'tyre', 'wet', 'overtaking', 'defending', ...NEW_ATTRS].forEach(k => { d[k] = +clamp((d[k] ?? d.pace) + delta, 30, 99).toFixed(2); });
};

/* ---------- temporada ---------- */
Cats.SUPPORT = { f2: true, f3: true, f1a: true };       // correm no fim de semana da F1
Cats.dateFor = (cat, iso, year, G, ev) => {
  const m = iso.slice(5);
  // FE: a temporada começa em dezembro do ano anterior
  const y = cat.id === 'fe' && m.startsWith('12') ? year - 1 : year;
  // suporte da F1: mesma pista no calendário da F1 do ano → mesmo domingo
  if (G && G.season && G.season.year === year && Cats.SUPPORT[cat.id] && ev && typeof Time !== 'undefined') {
    const n = (s) => Cats.norm(s || '');
    const i = G.season.calendar.findIndex(id => { const t = Career.track(G, id); return t && ((ev.circuit && n(t.circuit) === n(ev.circuit)) || (ev.place && t.place && n(t.place).split(' ')[0] === n(ev.place).split(' ')[0])); });
    if (i >= 0) return Time.raceDate(G, i);
  }
  // demais: mesmo mês e dia, no mesmo dia da semana da data real (sábado continua sábado, domingo continua domingo)
  let out = `${y}-${m}`;
  if (out.endsWith('-02-29')) out = `${y}-02-28`;
  const w0 = new Date(iso + 'T12:00:00Z').getUTCDay(), w1 = new Date(out + 'T12:00:00Z').getUTCDay();
  let dlt = (w0 - w1 + 7) % 7; if (dlt > 3) dlt -= 7;
  const d = new Date(out + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + dlt);
  return d.toISOString().slice(0, 10);
};
Cats.startSeason = (G, year) => {
  Cats.list(G, true).forEach(cat => {
    cat.season = { year, cal: (cat.baseCal || []).map(e => ({ ...e, date: Cats.dateFor(cat, e.date, year, G, e) })).sort((a, b) => a.date.localeCompare(b.date)), next: 0, res: [], pts: {}, tpts: {}, st: {} };
    cat.season.cal.forEach((e, i) => (e.r = i + 1));
  });
};
Cats.f1Date = (G, track, round) => {
  const y = G.season.year;
  if (track && track.date) return `${y}${track.date.slice(4)}`;
  const n = G.season.calendar.length;
  const t = new Date(Date.UTC(y, 2, 1) + (round / Math.max(1, n - 1)) * 270 * 864e5);
  return t.toISOString().slice(0, 10);
};
Cats.advanceTo = (G, iso) => {
  if (!Cats.on(G)) return;
  Cats.list(G).forEach(cat => {
    const s = cat.season; if (!s) return;
    while (s.next < s.cal.length && s.cal[s.next].date <= iso) { Cats.runEvent(G, cat, s.cal[s.next]); s.next++; }
  });
};

Cats.skill = (d, wet) => {
  const dry = d.pace * 0.38 + d.racecraft * 0.17 + d.consistency * 0.15 + d.qualifying * 0.1 + d.tyre * 0.1 + d.overtaking * 0.05 + (d.start ?? d.pace) * 0.05;
  return wet ? dry * (1 - wet * 0.5) + d.wet * wet * 0.5 : dry;
};
Cats.runEvent = (G, cat, ev) => {
  if (cat.crew) return Cats.runCrewEvent(G, cat, ev);
  const s = cat.season;
  const teams = Object.fromEntries(cat.teams.map(t => [t.id, t]));
  const field = cat.entries.map(e => ({ e, d: Career.driver(G, e.did), t: teams[e.team] || { str: 50 } })).filter(x => x.d && !x.d.retired && !(x.d.injured > 0));
  if (field.length < 4) return;
  const wet = RNG.chance(0.16) ? RNG.range(0.3, 1) : 0;
  const carW = cat.pro ? 0.11 : 0.045;
  const sd = cat.pro ? 3.4 : cat.tier >= 4 ? 3.5 : 3.0;
  const qs = field.map(x => ({ x, s: Cats.skill(x.d, wet) + (x.t.str - 50) * carW + (x.d.qualifying - x.d.pace) * 0.2 + RNG.normal(0, sd * 0.8) })).sort((a, b) => b.s - a.s).map(o => o.x);
  const pole = qs[0];
  const out = { r: ev.r, date: ev.date, circuit: ev.circuit, place: ev.place, nat: ev.nat, wet: +wet.toFixed(2), pole: pole.d.id, races: [] };
  const st = (did) => (s.st[did] = s.st[did] || { st: 0, w: 0, pod: 0, pole: 0, fl: 0, dnf: 0 });
  st(pole.d.id).pole++;
  cat.races.forEach(([label, pts, polePts, flPts, rev]) => {
    let grid = qs.slice();
    if (rev) grid = grid.slice(0, rev).reverse().concat(grid.slice(rev));
    const dnfP = cat.tier >= 5 ? 0.075 : 0.055;
    const res = grid.map((x, gi) => ({ x, dnf: RNG.chance(dnfP * (1 + wet * 0.6)), s: Cats.skill(x.d, wet) + (x.t.str - 50) * carW + RNG.normal(0, sd) - gi * 0.22 }));
    res.sort((a, b) => (a.dnf - b.dnf) || b.s - a.s);
    const fin = res.filter(r => !r.dnf);
    const flr = fin.length ? RNG.weighted(fin.slice(0, 10), (r, i) => 10 - (i || 0)) : null;
    res.forEach((r, i) => {
      const did = r.x.d.id, k = st(did);
      k.st++;
      if (r.dnf) { k.dnf++; return; }
      let p = pts[i] || 0;
      if (flPts && flr === r && i < 10) { p += flPts; k.fl++; }
      if (i === 0) k.w++;
      if (i < 3) k.pod++;
      s.pts[did] = (s.pts[did] || 0) + p;
      s.tpts[r.x.e.team] = (s.tpts[r.x.e.team] || 0) + p;
      r.x.d.morale = clamp((r.x.d.morale ?? 70) + (i === 0 ? 3 : i < 3 ? 1.5 : i > 12 ? -0.6 : 0), 0, 100);
    });
    if (polePts && !rev) { s.pts[pole.d.id] = (s.pts[pole.d.id] || 0) + polePts; s.tpts[pole.e.team] = (s.tpts[pole.e.team] || 0) + polePts; }
    out.races.push({ label, top: fin.slice(0, 10).map(r => r.x.d.id), fl: flr ? flr.x.d.id : null, dnf: res.filter(r => r.dnf).length });
  });
  s.res.push(out);
  // destaque na imprensa: vitórias na F2, na F3, na FE e na Super Formula
  const main = out.races[out.races.length - 1];
  const w = main && Career.driver(G, main.top[0]);
  if (w && (cat.id === 'f2' || cat.id === 'f3' || cat.pro) && typeof Media !== 'undefined') {
    const ac = w.academy && Career.team(G, w.academy);
    if (RNG.chance(cat.id === 'f2' ? 0.8 : 0.45)) Career.news(G, byLang(`${cat.short}: ${w.name} vence ${cat.pro ? 'em' : 'a corrida principal em'} ${ev.place || ev.circuit} (etapa ${ev.r})`, `${cat.short}: ${w.name} wins ${cat.pro ? 'at' : 'the feature race at'} ${ev.place || ev.circuit} (round ${ev.r})`), 'categorias', byLang(`${ac ? `Membro da academia da ${ac.name}. ` : ''}${w.name} soma ${s.pts[w.id] || 0} pontos na ${cat.name} ${s.year}.`, `${ac ? `${ac.name} academy member. ` : ''}${w.name} has ${s.pts[w.id] || 0} points in the ${s.year} ${cat.name}.`), { dr: [w.id], outlet: cat.pro ? 'motorsport' : 'f1' });
  }
};
Cats.standings = (cat) => {
  const s = cat.season; if (!s) return [];
  return cat.entries.map(e => ({ did: e.did, team: e.team, pts: s.pts[e.did] || 0, ...(s.st[e.did] || {}) }))
    .concat(Object.keys(s.pts).filter(did => !cat.entries.some(e => e.did === did)).map(did => ({ did, team: null, pts: s.pts[did], ...(s.st[did] || {}) })))
    .sort((a, b) => b.pts - a.pts || (b.w || 0) - (a.w || 0) || (b.pod || 0) - (a.pod || 0));
};
Cats.teamStandings = (cat) => cat.teams.map(t => ({ id: t.id, name: t.name, pts: (cat.season && cat.season.tpts[t.id]) || 0 })).sort((a, b) => b.pts - a.pts);

/* ---------- fim de temporada: completa o calendário, campeões, superlicença, evolução ---------- */
Cats.finishYear = (G) => {
  if (!Cats.on(G)) return;
  const y = G.season.year;
  Cats.advanceTo(G, `${y}-12-31`);
  Cats.list(G).forEach(cat => {
    const s = cat.season; if (!s || !s.res.length) return;
    const sd = Cats.standings(cat).filter(x => x.st);
    const tsd = Cats.teamStandings(cat);
    const champ = sd[0] && Career.driver(G, sd[0].did);
    cat.archive.push({ y, sim: true, top: sd.slice(0, 10).map(x => [x.did, x.pts, (Career.driver(G, x.did) || {}).name]), teamChamp: tsd[0] ? tsd[0].name : null, events: s.res.length });
    if (cat.archive.length > 60) cat.archive.splice(0, cat.archive.length - 60);
    const table = REAL_EXTRA.superlicense[cat.sl] || [];
    sd.forEach((x, i) => {
      const d = Career.driver(G, x.did); if (!d) return;
      d.history = d.history || [];
      d.history.push({ y, series: cat.short, cat: cat.id, pos: i + 1, pts: x.pts, st: x.st, w: x.w || 0, pod: x.pod || 0, pole: x.pole || 0, sim: true });
      if (table[i] && !cat.secondary) { d.sl = d.sl || []; d.sl.push({ y, cat: cat.sl, pts: table[i] }); }
      else if (table[i]) { d.sl = d.sl || []; d.sl.push({ y, cat: cat.sl, pts: table[i] }); }
      d.lastCat = { cat: cat.id, pos: i + 1, y };
      if (i === 0) { d.catTitles = d.catTitles || []; d.catTitles.push({ y, cat: cat.id, short: cat.short }); d.popularity = clamp((d.popularity || 20) + 8, 0, 99); }
    });
    if (champ) {
      const big = cat.id === 'f2' || cat.id === 'f3' || cat.pro;
      Career.news(G, byLang(`${champ.name} é campeão da ${cat.name} ${y}`, `${champ.name} is the ${y} ${cat.name} champion`), 'categorias', byLang(`${champ.name} fechou o ano com ${sd[0].pts} pontos e ${sd[0].w || 0} vitória(s).${tsd[0] ? ` ${tsd[0].name} venceu entre as equipes.` : ''}`, `${champ.name} finished the year with ${sd[0].pts} points and ${sd[0].w || 0} win(s).${tsd[0] ? ` ${tsd[0].name} took the teams' title.` : ''}`), { dr: [champ.id], main: big && cat.id === 'f2' });
      Career.record(G, 'categorias', `${y}: ${champ.name} campeão da ${cat.name}.`, { drivers: [champ.id], year: y });
      if (big && typeof Social !== 'undefined') Social.post(G, { driver: champ.id, kind: 'title', text: byLang(`Campeão da ${cat.name}! Obrigado à equipe e a todos que me apoiaram. Próximo passo: ${cat.id === 'f2' ? 'Fórmula 1' : 'subir mais um degrau'}.`, `${cat.name} champion! Thank you to the team and everyone who backed me. Next step: ${cat.id === 'f2' ? 'Formula 1' : 'one more rung up the ladder'}.`), hype: 1.6 });
    }
  });
  Cats.develop(G);
};
/* evolução anual dos jovens: rumo ao potencial, mais rápido quanto mais novo */
Cats.develop = (G) => {
  G.db.drivers.forEach(d => {
    // vale para quem está nas categorias e para quem saiu delas (inclusive já na F1) enquanto jovem
    if (d.retired || !(d.cat || ((d.regen || d.id.startsWith('c-')) && d.age <= 27))) return;
    const o = driverOverall(d);
    // a queda por idade fica em talent.js (Talent.age), igual para todas as séries
    const k = d.age <= 17 ? 0.22 : d.age <= 19 ? 0.18 : d.age <= 21 ? 0.14 : d.age <= 24 ? 0.1 : d.age <= 27 ? 0.05 : 0;
    const res = d.lastCat && d.lastCat.y === G.season.year ? clamp((10 - d.lastCat.pos) * 0.08, -0.6, 0.8) : 0;
    const gain = k > 0 ? Math.max(0, (d.potential - o) * k) + res + RNG.normal(0, 0.6) : k * 10 + RNG.normal(0, 0.4);
    if (gain) Cats.shift(d, gain);
    d.experience = clamp((d.experience || 10) + 4, 1, 99);
  });
};

/* aposentadoria nas séries profissionais: veteranos correm até mais tarde em turismo, stock car e endurance */
Cats.RETIRE_AGE = { mono: [36, 44], gt: [42, 54], end: [42, 55], stock: [42, 54], oval: [40, 50] };
Cats.proRetires = (cat, d) => {
  const disc = cat.id === 'nascup' || cat.id === 'stockcar' ? 'stock' : cat.id === 'indycar' ? 'oval' : cat.disc || 'mono';
  const [from, hard] = Cats.RETIRE_AGE[disc] || Cats.RETIRE_AGE.mono;
  if (d.age >= hard) return true;
  if (d.age < from) return false;
  const ovr = driverOverall(d), [lo, hi] = cat.range;
  const form = clamp((ovr - lo) / Math.max(1, hi - lo), 0, 1);      // quem ainda anda na frente fica mais tempo
  return RNG.chance(clamp(0.08 + (d.age - from) * 0.05 - form * 0.08, 0.02, 0.6));
};

/* ---------- progressão entre categorias e preenchimento das vagas ---------- */
Cats.progression = (G, initial) => {
  if (!Cats.on(G)) return;
  const y = G.season.year;
  const cats = Cats.list(G, true);
  const rank = {};      // posição na última temporada (por categoria)
  cats.forEach(cat => {
    if (cat.season && cat.season.res.length) Cats.standings(cat).forEach((x, i) => { rank[cat.id + ':' + x.did] = i + 1; });
    else Object.entries(cat.rank0 || {}).forEach(([did, p]) => { rank[cat.id + ':' + did] = p; });
  });
  const f1Race = (d) => d.team && d.seat !== 'R';
  const movers = [];     // pilotos liberados para procurar vaga acima
  cats.filter(c => !c.secondary).forEach(cat => {
    cat.entries = cat.entries.filter(e => {
      const d = Career.driver(G, e.did);
      if (!d || d.retired || f1Race(d)) { if (d && f1Race(d)) d.cat = null; return false; }
      if (d.cat !== cat.id) return false;
      d.catYears = d.catYears || {}; d.catYears[cat.id] = (d.catYears[cat.id] || 0) + 1;
      const pos = rank[cat.id + ':' + d.id] || 99;
      const yrs = d.catYears[cat.id];
      const ovr = driverOverall(d);
      if (cat.pro) {
        if (Cats.proRetires(cat, d)) { if (!d.team && !d.futureTeam) { d.retired = true; d.retiredYear = y; } d.cat = null; return false; }
        if (pos > cat.entries.length - 3 && RNG.chance(0.35)) { d.cat = null; return false; }
        return true;
      }
      // plano da academia: ficar mais um ano na categoria
      if (d.acPlan && d.acPlan.y === y && d.acPlan.opt === 'stay') return true;
      const up = Cats.UP[cat.id];
      const champion = pos === 1;
      const promote = champion || (pos <= (cat.id === 'f3' ? 6 : 5) && ovr >= cat.range[1] - 3) || yrs >= 3 || (cat.tier >= 5 && d.age >= 18);
      if (cat.id === 'f2' && (champion || yrs >= 3 || d.age >= 26 || (yrs >= 2 && pos > 12 && RNG.chance(0.5)))) { d.cat = null; movers.push({ d, from: cat.id, pos }); return false; }
      if (promote && up) { movers.push({ d, from: cat.id, pos }); return false; }
      if (yrs >= 4 || (pos > 18 && yrs >= 2 && RNG.chance(0.4))) { d.cat = null; movers.push({ d, from: cat.id, pos, out: true }); return false; }
      return true;
    });
  });
  // vagas: das categorias de cima para baixo
  const taken = new Set();
  cats.filter(c => !c.secondary).sort((a, b) => (a.pro ? 1 : 0) - (b.pro ? 1 : 0) || a.tier - b.tier).forEach(cat => {
    const free = cat.seats - cat.entries.length;
    if (free <= 0) return;
    const feeders = Cats.FEEDERS[cat.id] || [];
    const pool = [];
    movers.forEach(m => {
      if (taken.has(m.d.id) || m.d.retired || f1Race(m.d)) return;
      if (cat.women && !(typeof Disc !== 'undefined' ? Disc.isWoman(m.d) : m.d.gender === 'F')) return;
      const gt = cat.disc === 'gt';
      if (typeof Disc !== 'undefined' && !Disc.willing(m.d, cat.disc || 'mono')) return;
      const fits = (Cats.UP[m.from] === cat.id) || (feeders.includes(m.from) && (gt ? m.d.age >= 18 : cat.pro ? (m.from === 'f2' || m.d.nat === 'JPN') : m.pos <= 3));
      if (fits) pool.push({ d: m.d, sc: driverOverall(m.d) * 1.6 + (m.d.potential || 0) * 0.4 - m.pos * 0.6 + (m.d.academy ? 4 : 0) + (typeof Disc !== 'undefined' && gt ? Disc.affinity(G, cat, m.d) : 0) + RNG.normal(0, 2) });
    });
    // pilotos reais da própria série que estavam fora do grid (meio período, reservas): primeiros da fila
    G.db.drivers.forEach(d => { if (d.series === cat.id && !d.team && !d.cat && !d.retired && !d.dead && !taken.has(d.id) && !pool.some(p => p.d === d) && (!cat.women || (typeof Disc !== 'undefined' ? Disc.isWoman(d) : d.gender === 'F'))) pool.push({ d, sc: driverOverall(d) * 1.6 + 12 + RNG.normal(0, 2) }); });
    // sem vaga na F1: veteranos e ex-F2 livres vão para a FE e a Super Formula
    if (cat.pro) G.db.drivers.forEach(d => { if (!d.team && !d.cat && !d.series && !d.retired && !d.dead && !taken.has(d.id) && d.age >= 21 && d.age <= (cat.disc === 'mono' ? 36 : 42) && driverOverall(d) >= cat.range[0] - 1 && !pool.some(p => p.d === d) && (typeof Disc === 'undefined' || Disc.willing(d, cat.disc || 'mono'))) pool.push({ d, sc: driverOverall(d) * 1.6 + (d.career && d.career.starts ? 6 : 0) + (cat.id === 'sf' && d.nat === 'JPN' ? 8 : 0) + (typeof Disc !== 'undefined' && cat.disc !== 'mono' ? Disc.affinity(G, cat, d) : 0) + RNG.normal(0, 3) }); });
    pool.sort((a, b) => b.sc - a.sc);
    const teamsBySeat = Cats.freeSeats(cat);
    for (let i = 0; i < free; i++) {
      let d = pool[i] && pool[i].d;
      if (!d || driverOverall(d) < cat.range[0] - 8) d = cat.pro ? null : Cats.newRegen(G, cat);
      if (!d) d = Cats.newRegen(G, cat);
      taken.add(d.id);
      const team = teamsBySeat[i] || RNG.pick(cat.teams).id;
      d.cat = cat.id; d.ctm = team; if (d.series === cat.id) { d.series = null; d.seriesTeam = null; }
      cat.entries.push({ did: d.id, team, no: d.number, st: d.regen ? 'gerado' : 'projecao' });
      if (!initial && !d.regen && cat.tier <= 3) Career.record(G, 'categorias', `${d.name} vai correr na ${cat.name} em ${y + 1} pela ${(cat.teams.find(t => t.id === team) || {}).name || 'equipe'}.`, { drivers: [d.id], year: y });
    }
  });
  // quem ficou sem vaga: jovens desistem, veteranos ficam livres
  movers.forEach(m => { if (!taken.has(m.d.id) && !f1Race(m.d) && !m.d.team && !m.d.futureTeam) { m.d.cat = null; if (m.d.age < 21 && !m.d.academy && RNG.chance(0.7)) { m.d.retired = true; m.d.retiredYear = y; m.d.quit = true; } } });
  // séries paralelas (inverno): quem desistiu sai também da lista de inscritos
  cats.filter(c => c.secondary).forEach(c => { c.entries = c.entries.filter(e => { const d = Career.driver(G, e.did); return d && !d.retired && !d.dead; }); });
  // sem vaga em lugar nenhum e sem passado na F1: com o tempo, deixam o automobilismo de monoposto
  if (!initial) G.db.drivers.forEach(d => {
    if (d.retired || d.team || d.cat || d.series || d.futureTeam || (d.career && d.career.starts) || d.academy) return;
    if (!d.id.startsWith('c-') && !d.regen) return;
    if (RNG.chance(d.age >= 23 ? 0.55 : 0.35)) { d.retired = true; d.retiredYear = y; d.quit = true; }
  });
  // séries paralelas (inverno): pilotos das categorias de base
  cats.filter(c => c.secondary).forEach(cat => {
    if (initial) return;
    const src = cat.id === 'frme' ? ['freca', 'f3', 'f4it', 'f4es', 'f4gb', 'e4'] : ['f4it', 'f4es', 'f4gb'];
    const pool = G.db.drivers.filter(d => !d.retired && d.cat && src.includes(d.cat) && (cat.id !== 'frme' || d.cat !== 'f3' || (d.catYears && d.catYears.f3 <= 1)));
    pool.sort((a, b) => (b.academy ? 3 : 0) + driverOverall(b) + RNG.normal(0, 4) - ((a.academy ? 3 : 0) + driverOverall(a)));
    const teams = Cats.freeSeats({ ...cat, entries: [] });
    cat.entries = pool.slice(0, cat.seats).map((d, i) => ({ did: d.id, team: (cat.teams.find(t => t.id === d.ctm) || {}).id || teams[i] || RNG.pick(cat.teams).id, no: d.number }));
  });
  // equipes: força muda um pouco a cada ano
  if (!initial) cats.forEach(cat => cat.teams.forEach(t => { const tp = cat.season ? Cats.teamStandings(cat).findIndex(x => x.id === t.id) : -1; const q = tp >= 0 ? 1 - tp / Math.max(1, cat.teams.length - 1) : 0.5; t.str = Math.round(clamp(50 + (t.str - 50) * 0.7 + (q - 0.5) * (cat.pro ? 8 : 4) + RNG.normal(0, 2.5), 30, 75)); }));
  Cats.prune(G);
};
/* vagas livres por equipe, das mais fortes para as mais fracas */
Cats.freeSeats = (cat) => {
  const per = Math.max(2, Math.round(cat.seats / Math.max(1, cat.teams.length)));
  const out = [];
  cat.teams.slice().sort((a, b) => b.str - a.str).forEach(t => { const used = cat.entries.filter(e => e.team === t.id).length; for (let i = used; i < per; i++) out.push(t.id); });
  return out;
};
/* remove do banco quem desistiu cedo e nunca correu na F1 (mantém o save leve; os nomes ficam nos arquivos das categorias) */
Cats.prune = (G) => {
  const y = G.season.year;
  const keep = new Set();
  (G.academies || []).forEach(a => a.members.forEach(id => { const d = Career.driver(G, id); if (d && !d.retired) keep.add(id); }));
  if (G.player && G.player.teamId) Career.teamDrivers(G, G.player.teamId).forEach(d => keep.add(d.id));
  const notable = (d) => (d.catTitles || []).some(t => ['f2', 'f3', 'fe', 'sf'].includes(t.cat));
  G.db.drivers = G.db.drivers.filter(d => !(d.retired && !(d.career && d.career.starts) && !notable(d) && (d.retiredYear || y) <= y - (d.quit ? 2 : 4) && !keep.has(d.id)));
  // academias não guardam quem saiu do esporte
  const ids = new Set(G.db.drivers.map(d => d.id));
  (G.academies || []).forEach(a => { a.members = a.members.filter(id => ids.has(id)); });
  Cats._ids = null;
};

/* endurance (WEC): quem corre é o carro; a tripulação divide posição e pontos */
Cats.runCrewEvent = (G, cat, ev) => {
  const s = cat.season;
  const teams = Object.fromEntries(cat.teams.map(t => [t.id, t]));
  const cars = {};
  cat.entries.forEach(e => { const d = Career.driver(G, e.did); if (d && !d.retired && !d.dead && !(d.injured > 0)) (cars[e.team] = cars[e.team] || { team: e.team, t: teams[e.team] || { str: 50 }, crew: [] }).crew.push(d); });
  const field = Object.values(cars).filter(c => c.crew.length);
  if (field.length < 4) return;
  const wet = RNG.chance(0.18) ? RNG.range(0.3, 1) : 0;
  const skill = (c) => avg(c.crew.map(d => Cats.skill(d, wet))) + (c.t.str - 50) * 0.13;
  const st = (did) => (s.st[did] = s.st[did] || { st: 0, w: 0, pod: 0, pole: 0, fl: 0, dnf: 0 });
  const qs = field.map(c => ({ c, s: skill(c) + RNG.normal(0, 2.4) })).sort((a, b) => b.s - a.s).map(o => o.c);
  const out = { r: ev.r, date: ev.date, circuit: ev.circuit, place: ev.place, nat: ev.nat, wet: +wet.toFixed(2), pole: qs[0].crew[0].id, races: [] };
  qs[0].crew.forEach(d => st(d.id).pole++);
  const [label, pts, polePts] = cat.races[0];
  // corridas longas: mais abandono mecânico, ordem decidida pelo ritmo médio da tripulação
  const res = qs.map((c, gi) => ({ c, dnf: RNG.chance(0.09 * (1 + wet * 0.4)), s: skill(c) + RNG.normal(0, 3.2) - gi * 0.12 }));
  res.sort((a, b) => (a.dnf - b.dnf) || b.s - a.s);
  const le = /sarthe|le mans/i.test(ev.circuit || ev.place || '') ? 2 : 1; // 24 Horas de Le Mans vale pontos em dobro
  res.forEach((r, i) => {
    const p = r.dnf ? 0 : (pts[i] || 0) * le + (i === 0 && polePts ? 0 : 0);
    r.c.crew.forEach(d => { const k = st(d.id); k.st++; if (r.dnf) { k.dnf++; return; } if (i === 0) k.w++; if (i < 3) k.pod++; s.pts[d.id] = (s.pts[d.id] || 0) + p; d.morale = clamp((d.morale ?? 70) + (i === 0 ? 3 : i < 3 ? 1.5 : 0), 0, 100); });
    if (!r.dnf) s.tpts[r.c.team] = (s.tpts[r.c.team] || 0) + p;
  });
  if (polePts) qs[0].crew.forEach(d => { s.pts[d.id] = (s.pts[d.id] || 0) + polePts; });
  const fin = res.filter(r => !r.dnf);
  out.races.push({ label, top: fin.slice(0, 10).map(r => r.c.crew[0].id), crews: fin.slice(0, 10).map(r => r.c.crew.map(d => d.id)), fl: null, dnf: res.filter(r => r.dnf).length });
  s.res.push(out);
  const w = fin[0];
  if (w && typeof Media !== 'undefined' && RNG.chance(0.6)) Career.news(G, byLang(`${cat.short}: ${w.c.crew.map(d => d.name).join(', ')} vencem em ${ev.place || ev.circuit} (etapa ${ev.r})`, `${cat.short}: ${w.c.crew.map(d => d.name).join(', ')} win at ${ev.place || ev.circuit} (round ${ev.r})`), 'categorias', `${byLang('Carro', 'Car')} ${cat.teams.find(t => t.id === w.c.team)?.name || ''}.`, { dr: w.c.crew.map(d => d.id), outlet: 'motorsport' });
};
