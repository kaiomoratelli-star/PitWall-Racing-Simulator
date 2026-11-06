/* ============================================================
   PIT WALL — motor de simulação: carro, acerto, clima,
   classificação e corrida volta a volta
   ============================================================ */
'use strict';

const Engine = {};

/* ---------- desempenho do carro ---------- */
Engine.engineOf = (db, team) => byId(db.engines, team.engine) || db.engines[0];

Engine.carPerf = (db, team, track) => {
  const eng = Engine.engineOf(db, team);
  const w = track.weights;
  const tot = w.aero + w.chassis + w.engine || 1;
  return (team.car.aero * w.aero + team.car.chassis * w.chassis + (eng.power + (team.car.engineBonus || 0)) * w.engine) / tot;
};

Engine.carRating = (db, team) => {
  const eng = Engine.engineOf(db, team);
  return team.car.aero * 0.36 + team.car.chassis * 0.34 + (eng.power + (team.car.engineBonus || 0)) * 0.30;
};

Engine.reliability = (db, team) => {
  const eng = Engine.engineOf(db, team);
  return team.car.reliability * 0.55 + eng.reliability * 0.45;
};

/* ---------- atributos efetivos com moral ---------- */
Engine.eff = (d) => {
  const m = ((d.morale ?? 70) - 70) / 30; // −2.3 .. +1
  return {
    pace: d.pace + clamp(m, -1.5, 1) * 0.7,
    qualifying: d.qualifying + clamp(m, -1.5, 1) * 0.7,
    consistency: clamp(d.consistency + clamp(m, -1.5, 1) * 3, 30, 100),
    racecraft: d.racecraft, tyre: d.tyre, wet: d.wet, overtaking: d.overtaking,
    defending: d.defending, aggression: d.aggression, experience: d.experience,
  };
};

/* ---------- acerto (setup) ---------- */
Engine.SETUP_KEYS = [
  ['wing', 'Asa (carga)', 'Menos carga', 'Mais carga'],
  ['susp', 'Suspensão', 'Macia', 'Rígida'],
  ['gear', 'Relação de marchas', 'Curta', 'Longa'],
  ['brake', 'Balanço de freio', 'Traseiro', 'Dianteiro'],
];

Engine.genOptimum = (track, team, rng) => {
  const w = track.weights;
  const aeroNeed = clamp((w.aero - 0.18) / 0.32, 0, 1);  // 0 = Monza, 1 = Mônaco
  const engNeed = clamp((w.engine - 0.12) / 0.43, 0, 1);
  const j = (s) => (rng() - 0.5) * s;
  return {
    wing: Math.round(clamp(12 + aeroNeed * 76 + j(30), 3, 97)),
    susp: Math.round(clamp(track.street ? 26 + j(36) : 62 + j(50), 3, 97)),
    gear: Math.round(clamp(20 + engNeed * 62 + j(34), 3, 97)),
    brake: Math.round(clamp(50 + j(64), 3, 97)),
  };
};

Engine.setupQuality = (setup, opt) => {
  const keys = ['wing', 'susp', 'gear', 'brake'];
  const wts = { wing: 1.3, susp: 1, gear: 1, brake: 0.7 };
  let d = 0;
  for (const k of keys) d += Math.abs((setup[k] ?? 50) - opt[k]) * wts[k];
  return clamp(1 - d / 125, 0, 1);
};

/* Feedback do piloto — quanto mais experiente, mais preciso */
Engine.setupFeedback = (setup, opt, driver) => {
  const noise = (100 - driver.experience) / 100 * 14 + 3;
  const out = [];
  const say = {
    wing: ['O carro desliza muito nas curvas, falta carga.', 'Estamos lentos demais nas retas, carga em excesso.'],
    susp: ['O carro rola demais e fica preguiçoso na troca de direção.', 'Muito rígido, está pulando nas zebras.'],
    gear: ['Batendo no limitador antes do fim da reta, marchas curtas.', 'Falta força na saída das curvas lentas, marchas longas.'],
    brake: ['A traseira escapa nas frenagens, freio muito atrás.', 'Travando as dianteiras, freio muito à frente.'],
  };
  for (const [k] of Engine.SETUP_KEYS) {
    const diff = (setup[k] - opt[k]) + RNG.normal(0, noise);
    const mag = Math.abs(diff);
    let level;
    if (mag < 6) level = 0; else if (mag < 16) level = 1; else if (mag < 30) level = 2; else level = 3;
    const dir = diff < 0 ? 0 : 1;
    out.push({ key: k, level, dir, text: level === 0 ? 'Equilíbrio bom aqui.' : say[k][dir] });
  }
  return out;
};

/* ---------- clima ---------- */
Engine.genWeather = (track, laps, rainMult = 1) => {
  const pRain = clamp(track.rain * rainMult, 0, 0.95);
  const wet = new Array(laps + 2).fill(0);
  const quali = { wet: 0 };
  let rainyWeekend = RNG.chance(pRain);
  let raceRain = [];
  if (rainyWeekend) {
    // até 2 frentes de chuva espalhadas entre classificação e corrida
    quali.wet = RNG.chance(0.45) ? RNG.range(0.2, 0.85) : 0;
    const fronts = RNG.chance(0.3) ? 2 : 1;
    for (let f = 0; f < fronts; f++) {
      const start = RNG.chance(0.35) ? 0 : RNG.int(3, Math.max(4, laps - 8));
      const dur = RNG.int(5, Math.max(6, Math.round(laps * 0.6)));
      const peak = RNG.range(0.3, 1.0);
      raceRain.push({ start, dur, peak });
    }
    // pista: chuva molha rápido, seca devagar
    let w = raceRain.some(r => r.start === 0) ? RNG.range(0.35, 0.9) : 0;
    for (let l = 0; l <= laps + 1; l++) {
      let target = 0;
      for (const r of raceRain) {
        if (l >= r.start && l < r.start + r.dur) {
          const t = (l - r.start) / r.dur;
          target = Math.max(target, r.peak * Math.sin(Math.PI * clamp(t * 1.15, 0, 1)));
        }
      }
      if (target > w) w = lerp(w, target, 0.55); else w = Math.max(target, w - RNG.range(0.03, 0.07));
      wet[l] = clamp(w, 0, 1);
    }
  }
  return { wet, quali, rainyWeekend, pRain };
};

/* Previsão que o jogador vê — precisão depende do estrategista */
Engine.forecast = (weather, laps, strategy) => {
  const err = (100 - strategy) / 100 * 0.45 + 0.08;
  const seg = (a, b) => {
    const slice = weather.wet.slice(a, b + 1);
    const real = slice.some(x => x > 0.15) ? 1 : 0;
    const p = clamp(real ? 0.75 + RNG.range(-err, err * 0.4) : 0.08 + RNG.range(0, err), 0.02, 0.98);
    return Math.round(p * 100);
  };
  const third = Math.floor(laps / 3);
  return {
    quali: Math.round(clamp((weather.quali.wet > 0.15 ? 0.75 : 0.1) + RNG.range(-err, err * 0.5), 0.02, 0.98) * 100),
    race: [seg(0, third), seg(third, third * 2), seg(third * 2, laps)],
  };
};

Engine.wetLabel = (w) => w < 0.08 ? 'Seca' : w < 0.25 ? 'Úmida' : w < 0.55 ? 'Molhada' : w < 0.8 ? 'Chuva forte' : 'Temporal';

/* ---------- tempo de volta base ---------- */
Engine.weatherPenalty = (compound, w) => {
  if (compound === 'I') return w < 0.2 ? (0.2 - w) * 9 + 0.9 : (w > 0.68 ? (w - 0.68) * 14 : 0);
  if (compound === 'W') return w < 0.55 ? (0.55 - w) * 8 + 0.7 : 0;
  return Math.max(0, w - 0.1) * 22;
};

Engine.tyreDeg = (wear) => wear * 0.017 + (wear > 64 ? Math.pow((wear - 64) / 10, 2) * 0.34 : 0);

Engine.wearRate = (compound, track, drv, team, mode, w) => {
  let base = TYRES[compound].wear;
  if ((compound === 'I' || compound === 'W') && w < 0.18) base *= compound === 'W' ? 3.2 : 2.4; // superaquece no seco
  const modeMul = mode === 'push' ? 1.35 : mode === 'save' ? 0.72 : 1;
  return base * track.tyreStress * (1.25 - drv.tyre * 0.004) * (1.2 - team.car.tyreCare * 0.0035) * modeMul;
};

Engine.paceComponents = (ctx) => {
  // ctx: {db, track, team, drv(eff), setupQ, compound, wear, fuel, w, mode, quali, carPerf}
  const sc = ctx.track.baseLap / 90;
  const drvPace = ctx.quali ? ctx.drv.qualifying * 0.6 + ctx.drv.pace * 0.4 : ctx.drv.pace;
  const wetBlend = clamp(ctx.w * 1.4, 0, 1);
  const effPace = lerp(drvPace, (drvPace + ctx.drv.wet) / 2, wetBlend);
  const car = (100 - ctx.carPerf) * 0.058 * sc;
  const driver = (100 - effPace) * 0.036 * sc;
  const setup = (0.62 - ctx.setupQ) * 0.9;
  const tyre = TYRES[ctx.compound].offset * sc * (ctx.compound === 'I' || ctx.compound === 'W' ? 0 : 1) + Engine.tyreDeg(ctx.wear) * sc;
  const fuel = ctx.fuel * 0.031;
  const weather = ctx.w * 7.5 * sc + Engine.weatherPenalty(ctx.compound, ctx.w) * sc;
  const mode = ctx.mode === 'push' ? -0.32 : ctx.mode === 'save' ? 0.42 : 0;
  return { car, driver, setup, tyre, fuel, weather, mode, total: ctx.track.baseLap + car + driver + setup + tyre + fuel + weather + mode };
};

/* ---------- classificação (Q1/Q2/Q3) ---------- */
Engine.runQualifying = (wk, entries, opts = {}) => {
  // entries: [{did, tid, team, drv, setupQ, carPerf, risk}]
  const n = entries.length;
  const out1 = n > 12 ? Math.ceil((n - 10) / 2) : 0;
  const out2 = n > 12 ? (n - 10) - out1 : 0;
  const sessions = n > 12 ? [{ name: 'Q1', keep: n - out1 }, { name: 'Q2', keep: n - out1 - out2 }, { name: 'Q3', keep: 0 }] : [{ name: 'Q', keep: 0 }];
  const track = wk.track;
  let alive = entries.map(e => e.did);
  const res = {};
  entries.forEach(e => (res[e.did] = { did: e.did, tid: e.tid, times: {}, best: Infinity, eliminatedIn: null, incidents: [] }));
  const log = [];
  const qWet = wk.weather.quali.wet;
  sessions.forEach((s, si) => {
    const evo = [0, -0.18, -0.34][si] || 0;
    const sessWet = clamp(qWet + RNG.range(-0.08, 0.08) * (qWet > 0 ? 1 : 0), 0, 1);
    alive.forEach(did => {
      const e = entries.find(x => x.did === did);
      const comp = sessWet > 0.6 ? 'W' : sessWet > 0.18 ? 'I' : 'S';
      let best = Infinity;
      for (let run = 0; run < 2; run++) {
        const pc = Engine.paceComponents({ db: wk.db, track, team: e.team, drv: e.drv, setupQ: e.setupQ, compound: comp, wear: 2, fuel: 5, w: sessWet, mode: 'normal', quali: true, carPerf: e.carPerf });
        const riskMean = e.risk === 'push' ? -0.17 : e.risk === 'safe' ? 0.12 : 0;
        const sd = 0.12 + (100 - e.drv.consistency) * 0.008 + sessWet * 0.25;
        let t = pc.total + evo + riskMean + RNG.normal(0, sd);
        const errP = (0.012 + (100 - e.drv.consistency) * 0.0012) * (e.risk === 'push' ? 2.2 : e.risk === 'safe' ? 0.5 : 1) * (1 + sessWet * 2);
        if (RNG.chance(errP)) {
          const big = RNG.chance(0.18);
          t = big ? Infinity : t + RNG.range(0.8, 3.5);
          res[did].incidents.push(`${s.name}: ${big ? 'bateu e não marcou tempo nesta tentativa' : 'erro na volta rápida'}`);
          log.push({ s: s.name, did, text: big ? 'batida' : 'erro' });
          if (big) break;
        }
        best = Math.min(best, t);
      }
      res[did].times[s.name] = best;
    });
    const sorted = alive.slice().sort((a, b) => res[a].times[s.name] - res[b].times[s.name]);
    if (s.keep > 0) {
      sorted.slice(s.keep).forEach(did => (res[did].eliminatedIn = s.name));
      alive = sorted.slice(0, s.keep);
    } else {
      alive = sorted;
    }
  });
  // grid: Q3 order, depois Q2 eliminados, depois Q1
  const order = [];
  const lastS = sessions[sessions.length - 1].name;
  const byS = (sn, list) => list.sort((a, b) => res[a].times[sn] - res[b].times[sn]);
  order.push(...byS(lastS, entries.map(e => e.did).filter(d => !res[d].eliminatedIn)));
  if (sessions.length > 1) {
    order.push(...byS('Q2', entries.map(e => e.did).filter(d => res[d].eliminatedIn === 'Q2')));
    order.push(...byS('Q1', entries.map(e => e.did).filter(d => res[d].eliminatedIn === 'Q1')));
  }
  order.forEach((did, i) => {
    res[did].pos = i + 1;
    const ts = Object.values(res[did].times).filter(isFinite);
    res[did].best = ts.length ? Math.min(...ts) : null;
  });
  return { order, res, sessions: sessions.map(s => s.name), wet: qWet };
};

/* ---------- corrida ---------- */
const FAILURES = ['Falha no motor', 'Problema de câmbio', 'Perda de pressão hidráulica', 'Falha elétrica', 'Superaquecimento', 'Problema nos freios', 'Falha na unidade de energia'];

Engine.createRace = (wk, grid, opts = {}) => {
  // grid: [{did, tid, team, drv(eff), driver(raw), setupQ, carPerf, startTyre, auto, plan}]
  const track = wk.track;
  const pct = clamp(wk.db.rules.raceDistancePct || 100, 10, 100) / 100;
  const laps = Math.max(5, Math.round(track.laps * pct));
  const race = {
    trackId: track.id, laps, lap: 0, sc: null, scHistory: [], events: [], finished: false,
    fastest: null, wet: wk.weather.wet.slice(0, laps + 2), lapLeaderTimes: [],
    cars: grid.map((g, i) => ({
      did: g.did, tid: g.tid, grid: i + 1, pos: i + 1,
      T: i * 0.22, laps: 0, lastLap: null, best: null,
      tyre: { c: g.startTyre, wear: g.startWear || 0, age: 0 }, used: [g.startTyre],
      fuel: 100, mode: 'normal', damage: { wing: 0, power: 0 }, status: 'run', dnfReason: null,
      pits: 0, pitReq: null, auto: g.auto !== false, plan: g.plan || null, penalty: 0, pendingPen: 0,
      stints: [{ c: g.startTyre, from: 0, to: null }], times: [], positions: [i + 1], gaps: [0],
      lastPitLap: -10, overtakes: 0, setupQ: g.setupQ, carPerf: g.carPerf, isPlayer: !!g.isPlayer,
      pitNow: false, lastGapAhead: 9, drs: false,
    })),
  };
  race.cars.forEach(c => { if (!c.plan) c.plan = Engine.makePlan(race, c, wk); });
  return race;
};

Engine.makePlan = (race, car, wk) => {
  const track = wk.track;
  const stops = track.tyreStress > 1.15 || race.laps > 65 ? (RNG.chance(0.65) ? 2 : 1) : (RNG.chance(0.8) ? 1 : 2);
  return { stops, pitWear: RNG.range(60, 74), scOpportunist: RNG.chance(0.75) };
};

Engine.event = (race, type, text, did) => race.events.push({ lap: race.lap, type, text, did });

Engine.chooseCompound = (race, car, wk, lapsLeft) => {
  const track = wk.track;
  const w = race.wet[race.lap + 1] ?? 0;
  if (w > 0.62) return 'W';
  if (w > 0.2) return 'I';
  const team = byId(wk.db.teams, car.tid);
  const drv = wk.effOf(car.did);
  const ok = (c) => Engine.wearRate(c, track, drv, team, 'normal', 0) * lapsLeft <= 72;
  const usedDry = car.used.filter(c => 'SMH'.includes(c));
  const needDiff = wk.db.rules.mandatoryTwoCompounds && new Set(usedDry).size < 2 && race.wet.slice(0, race.lap + 1).every(x => x < 0.2);
  const stopsLeft = Math.max(0, car.plan.stops - car.pits - 1);
  const cands = stopsLeft > 0 ? ['M', 'S', 'H'] : ['S', 'M', 'H'];
  for (const c of cands) {
    if (needDiff && stopsLeft === 0 && usedDry.length && usedDry.every(u => u === c)) continue;
    if (stopsLeft === 0 ? ok(c) : true) return c;
  }
  return needDiff && usedDry.includes('H') ? 'M' : 'H';
};

Engine.aiWantsPit = (race, car, wk, strategyRating) => {
  const lapsLeft = race.laps - race.lap;
  const w = race.wet[race.lap] ?? 0;
  const wNext = race.wet[race.lap + 1] ?? w;
  const c = car.tyre.c;
  const react = strategyRating / 100;
  const dry = 'SMH'.includes(c);
  if (car.damage.wing > 0 && lapsLeft > 3) return true;
  if (car.tyre.puncture) return true;
  if (dry && wNext > 0.22 && RNG.chance(0.35 + react * 0.55)) return true;
  if (c === 'I' && wNext > 0.72 && RNG.chance(0.3 + react * 0.5)) return true;
  if (c === 'W' && wNext < 0.5 && RNG.chance(0.3 + react * 0.5)) return true;
  if (!dry && wNext < 0.13 && lapsLeft > 2 && RNG.chance(0.25 + react * 0.6)) return true;
  if (lapsLeft <= 3) return false;
  if (dry) {
    const usedDry = new Set(car.used.filter(x => 'SMH'.includes(x)));
    const allDryRace = race.wet.slice(0, race.lap + 1).every(x => x < 0.2);
    if (car.tyre.wear >= car.plan.pitWear) return true;
    if (car.tyre.wear > 82) return true;
    if (race.sc && car.plan.scOpportunist && car.tyre.wear > 35 && lapsLeft > 8 && race.lap - car.lastPitLap > 6) return RNG.chance(0.45 + react * 0.4);
    if (lapsLeft <= 6 && allDryRace && wk.db.rules.mandatoryTwoCompounds && usedDry.size < 2) return true;
  }
  return false;
};

Engine.stepLap = (race, wk) => {
  if (race.finished) return;
  race.lap++;
  const L = race.lap;
  const track = wk.track;
  const db = wk.db;
  const w = race.wet[L] ?? 0;
  const prevW = race.wet[L - 1] ?? 0;
  if (w > 0.2 && prevW <= 0.2) Engine.event(race, 'weather', `Começa a chover! Pista ${Engine.wetLabel(w).toLowerCase()}.`);
  if (w <= 0.12 && prevW > 0.12) Engine.event(race, 'weather', 'A pista está secando, linha seca aparecendo.');

  // Safety car
  let scType = null;
  if (race.sc) {
    race.sc.left--;
    if (race.sc.left <= 0) {
      Engine.event(race, 'sc', race.sc.type === 'SC' ? 'Safety Car recolhe neste fim de volta. Relargada!' : 'Fim do Safety Car Virtual. Bandeira verde.');
      race.sc = null; race.restartLap = L;
    } else scType = race.sc.type;
  }

  const running = race.cars.filter(c => c.status === 'run');
  const order = running.slice().sort((a, b) => a.T - b.T);
  const leaderPrevT = order.length ? order[0].T : 0;
  const scPace = track.baseLap * 1.38;
  const pitted = new Set();
  const incidentCars = new Set();

  // gaps no início da volta (DRS / ar sujo)
  order.forEach((c, i) => { c.lastGapAhead = i === 0 ? 99 : c.T - order[i - 1].T; });

  for (const c of order) {
    const team = byId(db.teams, c.tid);
    const drv = wk.effOf(c.did);
    const lapsLeft = race.laps - L + 1;
    // decisão de pit (a parada acontece no fim desta volta)
    let doPit = false, newC = null;
    if (c.pitReq) { doPit = true; newC = c.pitReq; c.pitReq = null; }
    else if (c.auto && L > 1 && L < race.laps && Engine.aiWantsPit(race, c, wk, team.staff.strategy)) {
      doPit = true; newC = Engine.chooseCompound(race, c, wk, race.laps - L);
    }
    // tempo de volta
    const pc = Engine.paceComponents({ db, track, team, drv, setupQ: c.setupQ, compound: c.tyre.c, wear: c.tyre.wear, fuel: c.fuel, w, mode: c.mode, quali: false, carPerf: c.carPerf - c.damage.power * 2 });
    let t = pc.total + c.damage.wing * 0.9;
    const sd = 0.14 + (100 - drv.consistency) * 0.009 + w * 0.3;
    t += RNG.normal(0, sd);
    if (c.tyre.age === 0) t += TYRES[c.tyre.c].warm * 0.35;
    if (L === 1) t += 2.6 + RNG.normal(0, 0.6) - (drv.racecraft - 80) * 0.02;
    // DRS / ar sujo
    c.drs = false;
    if (!scType && L >= 3 && (!race.restartLap || L - race.restartLap >= 2) && w < 0.3 && c.lastGapAhead < 1.0 && track.drs > 0) {
      c.drs = true; t -= 0.16 * Math.sqrt(track.drs);
    }
    if (!scType && c.lastGapAhead < 1.3) t += 0.1 + track.weights.aero * 0.45;
    if (scType === 'SC') t = scPace + RNG.range(0, 0.4);
    if (scType === 'VSC') t = Math.max(t, track.baseLap * 1.3) + RNG.range(0, 0.3);

    // incidentes
    const rel = Engine.reliability(db, team);
    const pFail = 0.000042 * Math.max(4, 106 - rel) * (c.mode === 'push' ? 1.25 : 1);
    if (RNG.chance(pFail)) {
      if (RNG.chance(0.72)) {
        c.status = 'dnf'; c.dnfReason = RNG.pick(FAILURES); c.T += t;
        Engine.event(race, 'dnf', `${wk.nameOf(c.did)} abandona: ${c.dnfReason.toLowerCase()}.`, c.did);
        if (RNG.chance(0.35) && !race.sc) Engine.deploySC(race, 'VSC', 'carro parado na pista');
        continue;
      } else {
        c.damage.power = Math.min(3, c.damage.power + 1);
        Engine.event(race, 'issue', `${wk.nameOf(c.did)} relata perda de potência.`, c.did);
      }
    }
    if (!scType) {
      const errP = (0.00035 + (100 - drv.consistency) * 0.00006) * (c.mode === 'push' ? 1.8 : c.mode === 'save' ? 0.6 : 1) * (1 + w * 4 + Engine.weatherPenalty(c.tyre.c, w) * 0.6) * (L === 1 ? 3 : 1);
      if (RNG.chance(errP)) {
        incidentCars.add(c);
        const crash = RNG.chance(0.32 + w * 0.25 + (track.street ? 0.18 : 0));
        if (crash) {
          c.status = 'dnf'; c.dnfReason = 'Acidente'; c.T += t;
          Engine.event(race, 'crash', `${wk.nameOf(c.did)} bate sozinho e está fora da corrida!`, c.did);
          const r = RNG.next();
          if (r < 0.5 * track.scFactor) Engine.deploySC(race, 'SC', 'acidente');
          else if (r < 0.8) Engine.deploySC(race, 'VSC', 'detritos na pista');
          continue;
        } else {
          const loss = RNG.range(3, 11);
          t += loss;
          if (RNG.chance(0.3)) { c.damage.wing = 1; Engine.event(race, 'issue', `${wk.nameOf(c.did)} roda e danifica a asa dianteira.`, c.did); }
          else Engine.event(race, 'spin', `${wk.nameOf(c.did)} roda e perde ${loss.toFixed(1)}s.`, c.did);
        }
      }
    }
    if (c.tyre.wear > 92 && RNG.chance(0.08)) {
      c.tyre.puncture = true; t += RNG.range(14, 26);
      Engine.event(race, 'issue', `Pneu furado para ${wk.nameOf(c.did)}! Pneus totalmente gastos.`, c.did);
      if (!c.auto) { doPit = true; newC = newC || Engine.chooseCompound(race, c, wk, race.laps - L); }
    }
    // pit stop
    if (doPit) {
      const loss = track.pitLoss * (scType === 'SC' ? 0.5 : scType === 'VSC' ? 0.62 : 1);
      let stop = 2.1 + (100 - team.pitCrew) * 0.022 + Math.abs(RNG.normal(0, 0.25));
      if (RNG.chance((100 - team.pitCrew) / 450 + 0.02)) { const extra = RNG.range(1.5, 8); stop += extra; Engine.event(race, 'pit', `Parada lenta para ${wk.nameOf(c.did)}: ${stop.toFixed(1)}s parado.`, c.did); }
      t += loss + stop;
      c.pits++; c.lastPitLap = L; pitted.add(c);
      c.stints[c.stints.length - 1].to = L;
      c.stints.push({ c: newC, from: L, to: null });
      c.tyre = { c: newC, wear: 0, age: -1 }; c.used.push(newC);
      if (c.damage.wing) c.damage.wing = 0;
      if (c.pendingPen) { t += c.pendingPen; c.pendingPen = 0; }
      if (c.isPlayer || c.pos <= 6) Engine.event(race, 'pit', `${wk.nameOf(c.did)} para nos boxes: ${TYRES[newC].name} (${stop.toFixed(1)}s).`, c.did);
    }
    c.lapTime = t;
    c.T += t;
    c.laps = L;
    // pneus e combustível
    c.tyre.wear = clamp(c.tyre.wear + Engine.wearRate(c.tyre.c, track, drv, team, scType ? 'save' : c.mode, w) * (scType ? 0.45 : 1), 0, 100);
    c.tyre.age++;
    c.fuel = Math.max(0, c.fuel - 100 / race.laps);
  }

  // ultrapassagens — percorre do líder para trás
  const live = order.filter(c => c.status === 'run');
  if (scType === 'SC') {
    // pelotão compacta atrás do SC
    live.sort((a, b) => a.T - b.T);
    for (let i = 1; i < live.length; i++) {
      const target = live[i - 1].T + 0.6;
      if (pitted.has(live[i])) continue;
      live[i].T = lerp(live[i].T, target, 0.6);
      if (live[i].T < live[i - 1].T + 0.3) live[i].T = live[i - 1].T + 0.3;
    }
  } else {
    for (let i = 1; i < live.length; i++) {
      let j = i;
      while (j > 0) {
        const cur = live[j], ahead = live[j - 1];
        if (cur.T >= ahead.T + 0.25) break;
        if (scType === 'VSC') { cur.T = ahead.T + 0.3; break; }
        // passagem automática: carro da frente parou no box ou teve problema
        if (pitted.has(ahead) || incidentCars.has(ahead) || ahead.T - cur.T > 1.5) {
          if (cur.T > ahead.T - 0.05) cur.T = ahead.T - 0.05;
          live[j] = ahead; live[j - 1] = cur; j--; continue;
        }
        const dc = wk.effOf(cur.did), da = wk.effOf(ahead.did);
        const adv = (ahead.T + 0.25 - cur.T);
        const x = adv * 1.6 + (dc.overtaking - da.defending) / 22 + (cur.drs ? 0.7 : 0) + track.overtaking * 2.3 - 3.4 - (L === 1 ? -0.6 : 0) + (cur.mode === 'push' ? 0.25 : 0);
        const p = 1 / (1 + Math.exp(-x));
        if (RNG.chance(p)) {
          cur.overtakes++;
          if (cur.T > ahead.T - 0.12) cur.T = ahead.T - 0.12;
          ahead.T += RNG.range(0.05, 0.35);
          live[j] = ahead; live[j - 1] = cur;
          if (cur.isPlayer || ahead.isPlayer || j <= 3) Engine.event(race, 'overtake', `${wk.nameOf(cur.did)} ultrapassa ${wk.nameOf(ahead.did)} pela ${ordinal(j)} posição.`, cur.did);
          j--;
        } else {
          // briga roda a roda — chance de toque
          const aggr = (dc.aggression + da.aggression) / 2;
          const pCol = 0.0045 * (aggr / 55) * (1.4 - track.overtaking) * (L === 1 ? 4 : 1) * (1 + w * 2);
          if (RNG.chance(pCol)) {
            Engine.collision(race, wk, cur, ahead);
            break;
          }
          cur.T = ahead.T + RNG.range(0.28, 0.65);
          break;
        }
      }
    }
  }

  // classificação provisória
  const runSorted = race.cars.filter(c => c.status === 'run').sort((a, b) => a.T - b.T);
  const out = race.cars.filter(c => c.status !== 'run').sort((a, b) => b.laps - a.laps || a.T - b.T);
  const lead = runSorted[0];
  runSorted.concat(out).forEach((c, i) => {
    c.pos = i + 1;
    c.positions[L] = c.status === 'run' ? i + 1 : null;
    c.gaps[L] = c.status === 'run' ? c.T - lead.T : null;
    if (c.status === 'run' && c.lapTime) {
      c.times[L] = c.lapTime;
      c.lastLap = c.lapTime;
      if (!scType && !pitted.has(c) && (c.best == null || c.lapTime < c.best)) c.best = c.lapTime;
      if (!scType && !pitted.has(c) && (!race.fastest || c.lapTime < race.fastest.time)) {
        if (race.fastest && L > 5) Engine.event(race, 'fastest', `Volta mais rápida: ${wk.nameOf(c.did)} ${fmtLap(c.lapTime)}.`, c.did);
        race.fastest = { did: c.did, time: c.lapTime, lap: L };
      }
    }
  });
  race.lapLeaderTimes[L] = lead ? lead.T : 0;
  // relargada / SC: chance de lançar no fim desta volta já tratada nos incidentes
  if (L >= race.laps || runSorted.length === 0) Engine.finishRace(race, wk);
};

Engine.collision = (race, wk, a, b) => {
  const da = wk.effOf(a.did), dbb = wk.effOf(b.did);
  const blameA = RNG.chance(clamp(0.5 + (da.aggression - dbb.aggression) / 120, 0.2, 0.85));
  const culprit = blameA ? a : b;
  const sev = RNG.next();
  const names = `${wk.nameOf(a.did)} e ${wk.nameOf(b.did)}`;
  if (sev < 0.22) {
    const victim = RNG.chance(0.5) ? a : b;
    victim.status = 'dnf'; victim.dnfReason = 'Colisão';
    Engine.event(race, 'crash', `Batida entre ${names}! ${wk.nameOf(victim.did)} está fora.`, victim.did);
    if (RNG.chance(0.55 * wk.track.scFactor)) Engine.deploySC(race, 'SC', 'colisão'); else Engine.deploySC(race, 'VSC', 'detritos');
  } else if (sev < 0.6) {
    const victim = RNG.chance(0.5) ? a : b;
    victim.damage.wing = 1; victim.T += RNG.range(1, 4);
    Engine.event(race, 'contact', `Toque entre ${names}. ${wk.nameOf(victim.did)} com asa danificada.`, victim.did);
  } else {
    a.T += RNG.range(0.5, 2); b.T += RNG.range(0.5, 2);
    Engine.event(race, 'contact', `Roda a roda e toque leve entre ${names}. Os dois seguem.`, a.did);
  }
  if (RNG.chance(0.45)) {
    const pen = RNG.chance(0.7) ? 5 : 10;
    culprit.pendingPen += pen; culprit.penalty += pen;
    Engine.event(race, 'penalty', `Comissários: ${pen}s de punição para ${wk.nameOf(culprit.did)} por causar a colisão.`, culprit.did);
  }
};

Engine.deploySC = (race, type, why) => {
  if (race.sc || race.laps - race.lap < 2) return;
  const left = type === 'SC' ? RNG.int(3, 5) : RNG.int(2, 3);
  race.sc = { type, left, from: race.lap };
  race.scHistory.push({ type, from: race.lap, to: race.lap + left });
  Engine.event(race, 'sc', type === 'SC' ? `SAFETY CAR na pista (${why}).` : `Safety Car Virtual acionado (${why}).`);
};

Engine.finishRace = (race, wk) => {
  race.finished = true;
  race.cars.forEach(c => {
    if (c.stints.length) c.stints[c.stints.length - 1].to = c.stints[c.stints.length - 1].to ?? race.lap;
    if (c.status === 'run') { c.status = 'fin'; c.T += c.pendingPen; c.pendingPen = 0; }
  });
  const fin = race.cars.filter(c => c.status === 'fin').sort((a, b) => a.T - b.T);
  const out = race.cars.filter(c => c.status === 'dnf').sort((a, b) => b.laps - a.laps);
  const winnerT = fin.length ? fin[0].T : 0;
  const avgLap = fin.length ? winnerT / race.laps : 90;
  fin.forEach(c => {
    const down = Math.floor((c.T - winnerT) / avgLap);
    c.lapsDown = down > 0 ? down : 0;
  });
  // carros com voltas a menos vão para trás de quem completou mais
  fin.sort((a, b) => a.lapsDown - b.lapsDown || a.T - b.T);
  const classified = fin.concat(out);
  classified.forEach((c, i) => (c.pos = i + 1));
  race.classification = classified.map(c => c.did);
  // pilotos com menos de 90% de distância não pontuam (abandonos)
  const pts = wk.db.rules.points;
  race.points = {};
  classified.forEach((c, i) => {
    let p = c.status === 'fin' ? (pts[i] || 0) : 0;
    race.points[c.did] = p;
  });
  if (wk.db.rules.fastestLapPoint && race.fastest) {
    const fc = race.cars.find(c => c.did === race.fastest.did);
    if (fc && fc.status === 'fin' && fc.pos <= (wk.db.rules.fastestLapTopN || 10)) race.points[fc.did] += wk.db.rules.fastestLapPoint;
  }
  const w = classified[0];
  if (w) Engine.event(race, 'finish', `BANDEIRADA! ${wk.nameOf(w.did)} vence o ${wk.track.gp}!`, w.did);
};
