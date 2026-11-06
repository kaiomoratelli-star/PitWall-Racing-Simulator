/* ============================================================
   PIT WALL — outras categorias (F2, F3, regionais, F4, Super Formula, Fórmula E)
   Simuladas em segundo plano e sincronizadas pelas datas do calendário da F1.
   Os pilotos são os mesmos do banco de dados: sobem de categoria, ganham
   pontos de superlicença e chegam à F1 (ou seguem para a FE e a Super Formula).
   ============================================================ */
'use strict';

const Cats = {};
Cats.SECONDARY = { frme: true, e4: true };            // séries de inverno/paralelas: pilotos vêm de outras categorias
Cats.PRO = { fe: true, sf: true };                    // categorias profissionais (fim de linha fora da F1)
Cats.UP = { f4it: 'freca', f4es: 'freca', f4gb: 'freca', e4: 'freca', f4br: 'freca', f4us: 'fram', f4jp: 'frj', freca: 'f3', frme: 'f3', fram: 'f3', frj: 'f3', f3: 'f2' };
Cats.FEEDERS = {
  f2: ['f3', 'freca'], f3: ['freca', 'frme', 'fram', 'frj', 'f4it', 'f4es', 'f4gb'], freca: ['f4it', 'f4es', 'f4gb', 'e4', 'f4br'], fram: ['f4us'], frj: ['f4jp'],
  fe: ['f2', 'sf'], sf: ['f2', 'frj', 'f3'],
};
Cats.defs = () => (typeof REAL_CATS !== 'undefined' ? REAL_CATS.cats : []);
Cats.on = (G) => !!(G && G.cats && G.cats.order.length);
Cats.get = (G, id) => G.cats && G.cats.byId[id];
Cats.list = (G, all) => (G.cats ? G.cats.order.map(id => G.cats.byId[id]).filter(c => c && (all || c.enabled)) : []);
Cats.norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
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
  const ids = Cats._ids || (Cats._ids = new Set(G.db.drivers.map(d => d.id)));
  let id = 'c-' + Cats.norm(spec.name).replace(/ /g, '-').slice(0, 30);
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
  const d = Cats.makeDriver(G, { name: randomName(nat), nat, regen: true }, C, ovr, age);
  d.potential = Cats.rollPotential(ovr, age, 0, () => RNG.next());
  G.db.drivers.push(d);
  return d;
};

/* vagas por categoria: equipes × carros por equipe (substituições ao longo do ano não contam) */
Cats.seatCount = (C) => {
  const teams = Math.max(1, C.teams.length);
  if (['f2', 'f3', 'fe', 'freca', 'frme'].includes(C.id)) return teams * Math.max(1, Math.floor(C.drivers.length / teams));
  return Math.min(Math.max(teams, Math.round(C.drivers.length * 0.85)), C.tier >= 5 ? 30 : 34);
};

/* ---------- inicialização: grids reais de 2026 → temporada 2027 ---------- */
Cats.init = (G) => {
  const defs = Cats.defs();
  if (!defs.length || G.cats) return;
  Cats._ids = null;
  G.cats = { order: [], byId: {} };
  const byName = new Map(G.db.drivers.map(d => [Cats.norm(d.name), d]));
  const sorted = defs.slice().sort((a, b) => (Cats.SECONDARY[a.id] ? 1 : 0) - (Cats.SECONDARY[b.id] ? 1 : 0) || a.tier - b.tier);
  sorted.forEach(C => {
    const n = Math.max(2, C.standings.length);
    const tst = C.teamStandings || [];
    const spread = Cats.PRO[C.id] ? 22 : 10;
    const cat = {
      id: C.id, name: C.name, short: C.short, tier: C.tier, sl: C.sl, color: C.color, races: C.races, range: C.range, ageRef: C.age, seasonLabel: C.season,
      secondary: !!Cats.SECONDARY[C.id], pro: !!Cats.PRO[C.id], enabled: true, source: C.page,
      teams: C.teams.map((t, i) => {
        const p = tst.findIndex(x => Cats.norm(x[1]).includes(Cats.norm(t.name).split(' ')[0]));
        const q = p >= 0 ? 1 - p / Math.max(1, tst.length - 1) : 0.4;
        return { ...t, str: Math.round(50 + (q - 0.5) * spread + (hashStr(t.id) % 5) - 2) };
      }),
      baseCal: C.calendar, entries: [], seats: Cats.seatCount(C), archive: [], season: null,
    };
    C.drivers.forEach(spec => {
      const st = C.standings.find(x => Cats.norm(x[1]) === Cats.norm(spec.name));
      const pos = spec.pos || (st && st[0]) || null;
      const q = pos ? 1 - (pos - 1) / (n - 1) : 0.25;
      const [lo, hi] = C.range;
      const ovr = Math.round(clamp(lo + (hi - lo) * Math.pow(clamp(q, 0, 1), 1.15) + ((hashStr(spec.name) % 25) - 12) / 10, lo - 3, hi + 1));
      const age = spec.dob ? 2027 - Number(spec.dob.slice(0, 4)) : C.age + ((hashStr(spec.name) % 3) - 1);
      let d = byName.get(Cats.norm(spec.name));
      if (!d) {
        d = Cats.makeDriver(G, { ...spec, q }, C, ovr, age);
        G.db.drivers.push(d); byName.set(Cats.norm(spec.name), d);
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
    if (C.standings.length) {
      cat.archive.push({ y: 2026, real: true, top: C.standings.slice(0, 10).map(([p, name, pts]) => { const d = byName.get(Cats.norm(name)); return [d ? d.id : null, pts, name]; }), teamChamp: tst[0] ? tst[0][1] : null });
      const table = REAL_EXTRA.superlicense[cat.sl] || [];
      C.standings.slice(0, 10).forEach(([p, name]) => { const d = byName.get(Cats.norm(name)); if (d && table[p - 1]) { d.sl = d.sl || []; if (!d.sl.some(x => x.y === 2026 && x.cat === cat.sl)) d.sl.push({ y: 2026, cat: cat.sl, pts: table[p - 1] }); } });
    }
    G.cats.order.push(cat.id);
    G.cats.byId[cat.id] = cat;
  });
  // grids reais têm convidados e substitutos: mantém os mais bem classificados até o número de vagas
  Cats.list(G, true).forEach(cat => {
    if (cat.entries.length <= cat.seats) return;
    const r0 = cat.rank0 || {};
    cat.entries.sort((a, b) => (r0[a.did] || 99) - (r0[b.did] || 99));
    cat.entries.slice(cat.seats).forEach(e => { const d = Career.driver(G, e.did); if (d && d.cat === cat.id) d.cat = null; });
    cat.entries.length = cat.seats;
  });
  // F1: pilotos que já correm na F1 não ocupam vaga nas categorias em 2027
  Cats.progression(G, true);
  Cats.startSeason(G, G.season.year);
  if (typeof Market !== 'undefined') Market.syncAcademies(G);
};

/* aplica um ganho/perda igual em todos os atributos de pilotagem */
Cats.shift = (d, delta) => {
  ['pace', 'qualifying', 'racecraft', 'consistency', 'tyre', 'wet', 'overtaking', 'defending', ...NEW_ATTRS].forEach(k => { d[k] = +clamp((d[k] ?? d.pace) + delta, 30, 99).toFixed(2); });
};

/* ---------- temporada ---------- */
Cats.dateFor = (cat, iso, year) => {
  const m = iso.slice(5);
  // FE: a temporada começa em dezembro do ano anterior
  if (cat.id === 'fe' && m.startsWith('12')) return `${year - 1}-${m}`;
  return `${year}-${m}`;
};
Cats.startSeason = (G, year) => {
  Cats.list(G, true).forEach(cat => {
    cat.season = { year, cal: (cat.baseCal || []).map(e => ({ ...e, date: Cats.dateFor(cat, e.date, year) })).sort((a, b) => a.date.localeCompare(b.date)), next: 0, res: [], pts: {}, tpts: {}, st: {} };
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
    if (RNG.chance(cat.id === 'f2' ? 0.8 : 0.45)) Career.news(G, `${cat.short}: ${w.name} vence ${cat.pro ? 'em' : 'a corrida principal em'} ${ev.place || ev.circuit} (etapa ${ev.r})`, 'categorias', `${ac ? `Membro da academia da ${ac.name}. ` : ''}${w.name} soma ${s.pts[w.id] || 0} pontos na ${cat.name} ${s.year}.`, { dr: [w.id], outlet: cat.pro ? 'motorsport' : 'f1' });
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
      Career.news(G, `${champ.name} é campeão da ${cat.name} ${y}`, 'categorias', `${champ.name} fechou o ano com ${sd[0].pts} pontos e ${sd[0].w || 0} vitória(s).${tsd[0] ? ` ${tsd[0].name} venceu entre as equipes.` : ''}`, { dr: [champ.id], main: big && cat.id === 'f2' });
      Career.record(G, 'categorias', `${y}: ${champ.name} campeão da ${cat.name}.`, { drivers: [champ.id], year: y });
      if (big && typeof Social !== 'undefined') Social.post(G, { driver: champ.id, kind: 'title', text: `Campeão da ${cat.name}! Obrigado à equipe e a todos que me apoiaram. Próximo passo: ${cat.id === 'f2' ? 'Fórmula 1' : 'subir mais um degrau'}.`, hype: 1.6 });
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
    const k = d.age <= 17 ? 0.22 : d.age <= 19 ? 0.18 : d.age <= 21 ? 0.14 : d.age <= 24 ? 0.1 : d.age <= 27 ? 0.05 : d.age >= 32 ? -0.04 : 0;
    const res = d.lastCat && d.lastCat.y === G.season.year ? clamp((10 - d.lastCat.pos) * 0.08, -0.6, 0.8) : 0;
    const gain = k > 0 ? Math.max(0, (d.potential - o) * k) + res + RNG.normal(0, 0.6) : k * 10 + RNG.normal(0, 0.4);
    if (gain) Cats.shift(d, gain);
    d.experience = clamp((d.experience || 10) + 4, 1, 99);
  });
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
        if (d.age >= 39 || (d.age >= 34 && RNG.chance(0.18))) { if (!d.team && !d.futureTeam) { d.retired = true; d.retiredYear = y; } d.cat = null; return false; }
        if (pos > cat.entries.length - 3 && RNG.chance(0.35)) { d.cat = null; return false; }
        return true;
      }
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
      const fits = (Cats.UP[m.from] === cat.id) || (feeders.includes(m.from) && (cat.pro ? (m.from === 'f2' || m.d.nat === 'JPN') : m.pos <= 3));
      if (fits) pool.push({ d: m.d, sc: driverOverall(m.d) * 1.6 + (m.d.potential || 0) * 0.4 - m.pos * 0.6 + (m.d.academy ? 4 : 0) + RNG.normal(0, 2) });
    });
    // sem vaga na F1: veteranos e ex-F2 livres vão para a FE e a Super Formula
    if (cat.pro) G.db.drivers.forEach(d => { if (!d.team && !d.cat && !d.series && !d.retired && !d.dead && !taken.has(d.id) && d.age >= 21 && d.age <= 36 && driverOverall(d) >= cat.range[0] - 1 && !pool.some(p => p.d === d)) pool.push({ d, sc: driverOverall(d) * 1.6 + (d.career && d.career.starts ? 6 : 0) + (cat.id === 'sf' && d.nat === 'JPN' ? 8 : 0) + RNG.normal(0, 3) }); });
    pool.sort((a, b) => b.sc - a.sc);
    const teamsBySeat = Cats.freeSeats(cat);
    for (let i = 0; i < free; i++) {
      let d = pool[i] && pool[i].d;
      if (!d || driverOverall(d) < cat.range[0] - 8) d = cat.pro ? null : Cats.newRegen(G, cat);
      if (!d) d = Cats.newRegen(G, cat);
      taken.add(d.id);
      const team = teamsBySeat[i] || RNG.pick(cat.teams).id;
      d.cat = cat.id; d.ctm = team;
      cat.entries.push({ did: d.id, team, no: d.number });
      if (!initial && !d.regen && cat.tier <= 3) Career.record(G, 'categorias', `${d.name} vai correr na ${cat.name} em ${y + 1} pela ${(cat.teams.find(t => t.id === team) || {}).name || 'equipe'}.`, { drivers: [d.id], year: y });
    }
  });
  // quem ficou sem vaga: jovens desistem, veteranos ficam livres
  movers.forEach(m => { if (!taken.has(m.d.id) && !f1Race(m.d) && !m.d.team && !m.d.futureTeam) { m.d.cat = null; if (m.d.age < 21 && !m.d.academy && RNG.chance(0.7)) { m.d.retired = true; m.d.retiredYear = y; m.d.quit = true; } } });
  // sem vaga em lugar nenhum e sem passado na F1: com o tempo, deixam o automobilismo de monoposto
  if (!initial) G.db.drivers.forEach(d => {
    if (d.retired || d.team || d.cat || d.futureTeam || (d.career && d.career.starts) || d.academy) return;
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
