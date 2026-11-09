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
  return team.car.reliability * 0.55 + eng.reliability * 0.45 + (typeof Staff !== 'undefined' && team.staffList ? Staff.engineRel(team) : 0);
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
    start: d.start ?? d.racecraft, energy: d.energy ?? d.tyre, adaptability: d.adaptability ?? 75, concentration: clamp((d.concentration ?? d.consistency) + clamp(m, -1.5, 1) * 2, 30, 100), feedback: d.feedback ?? d.experience,
    b: (typeof STYLE_BEHAVIOR !== 'undefined' && STYLE_BEHAVIOR[d.style]) || {},
  };
};

/* ---------- acerto (setup) ---------- */
Engine.SETUP_KEYS = [
  ['wing', 'Asa (carga)', 'Menos carga', 'Mais carga'],
  ['susp', 'Suspensão', 'Macia', 'Rígida'],
  ['gear', 'Relação de marchas', 'Curta', 'Longa'],
  ['brake', 'Balanço de freio', 'Traseiro', 'Dianteiro'],
];




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

Engine.wetLabel = (w) => w < 0.08 ? byLang('Seca', 'Dry') : w < 0.25 ? byLang('Úmida', 'Damp') : w < 0.55 ? byLang('Molhada', 'Wet') : w < 0.8 ? byLang('Chuva forte', 'Heavy rain') : byLang('Temporal', 'Storm');

/* ---------- tempo de volta base ---------- */
Engine.weatherPenalty = (compound, w) => {
  if (compound === 'I') return w < 0.2 ? (0.2 - w) * 9 + 0.9 : (w > 0.68 ? (w - 0.68) * 14 : 0);
  if (compound === 'W') return w < 0.55 ? (0.55 - w) * 8 + 0.7 : 0;
  return Math.max(0, w - 0.1) * 22;
};

Engine.tyreDeg = (wear) => wear * 0.017 + (wear > 64 ? Math.pow((wear - 64) / 10, 2) * 0.34 : 0);

Engine.wearRate = (compound, track, drv, team, mode, w, temp) => {
  const props = Engine.CPROPS ? Engine.tprops(track, compound) : null;
  let base = props && 'SMH'.includes(compound) ? props.wear : TYRES[compound].wear;
  if (props && temp != null && temp > props.hi) base *= 1 + (temp - props.hi) / 45;
  if ((compound === 'I' || compound === 'W') && w < 0.18) base *= compound === 'W' ? 3.2 : 2.4; // superaquece no seco
  const modeMul = Engine.tyreWearMul(mode);
  const styleMul = (drv.b && drv.b.wear) || 1;
  return base * track.tyreStress * (1.25 - drv.tyre * 0.004) * (1.2 - team.car.tyreCare * 0.0035) * modeMul * styleMul;
};

/* ---------- gestão de pneus e de energia (mesmos controles para jogador e equipes do jogo) ----------
   Pneus: CONSERVAR desgasta ~30% menos e custa 0,4–0,7 s; ATACAR ganha 0,5–0,8 s e desgasta até ~45% mais.
   O efeito depende do piloto (controle de pneus), do desgaste, da janela de temperatura e da pista.
   Energia (ERS): RECARREGAR enche a bateria e custa tempo; ULTRAPASSAGEM gasta energia e ganha tempo e
   chance de ultrapassar. A escala segue a parte elétrica do regulamento da temporada. */
Engine.TYRE_MODES = ['save', 'normal', 'push'];
Engine.ERS_MODES = ['harvest', 'balanced', 'overtake'];
Engine.tyreModeOf = (c) => c.tyreMode || (c.mode === 'push' ? 'push' : c.mode === 'save' ? 'save' : 'normal');
Engine.ersModeOf = (c) => c.ersMode || (c.mode === 'push' ? 'overtake' : c.mode === 'save' ? 'harvest' : 'balanced');
Engine.tyreWearMul = (m) => (m === 'push' ? 1.42 : m === 'save' ? 0.7 : 1);
Engine.tyreModeDelta = (ctx) => {
  const m = ctx.tyreMode || (ctx.mode === 'push' ? 'push' : ctx.mode === 'save' ? 'save' : 'normal');
  if (m === 'normal' || ctx.quali) return 0;
  const sc = ctx.track.baseLap / 90;
  const tyreSkill = (ctx.drv.tyre ?? 75) / 100;
  const dry = 'SMH'.includes(ctx.compound);
  if (m === 'save') return (0.7 - tyreSkill * 0.3) * sc;           // 0,4 s (bom gestor) a 0,7 s
  const props = Engine.CPROPS && dry ? Engine.tprops(ctx.track, ctx.compound) : null;
  const overheated = props && ctx.ttemp != null && ctx.ttemp > props.hi;
  const fresh = 1 - clamp((ctx.wear || 0) / 100, 0, 1);
  return -(0.5 + 0.3 * fresh) * (overheated ? 0.5 : 1) * sc;     // pneu gasto ou superaquecido rende menos
};
Engine.ersModeDelta = (ctx) => {
  const m = ctx.ersMode || (ctx.mode === 'push' ? 'overtake' : ctx.mode === 'save' ? 'harvest' : 'balanced');
  if (m === 'balanced' || ctx.quali || !(ctx.share > 0)) return 0;
  const k = ctx.share / 50;
  const en = (ctx.drv.energy ?? 75) / 100;
  return m === 'overtake' ? -0.22 * (0.8 + en * 0.4) * k : 0.28 * (1.15 - en * 0.3) * k;
};
Engine.paceComponents = (ctx) => {
  // ctx: {db, track, team, drv(eff), setupQ, compound, wear, fuel, w, mode, quali, carPerf}
  const sc = ctx.track.baseLap / 90;
  const drvPace = ctx.quali ? ctx.drv.qualifying * 0.6 + ctx.drv.pace * 0.4 : ctx.drv.pace;
  const wetBlend = clamp(ctx.w * 1.4, 0, 1);
  const effPace = lerp(drvPace, (drvPace + ctx.drv.wet) / 2 + ((ctx.drv.b && ctx.drv.b.wetGain) || 0) * 2, wetBlend) + (ctx.quali && ctx.drv.b && ctx.drv.b.quali ? -ctx.drv.b.quali * 10 : 0);
  // o carro pesa mais que o piloto (como na F1 real); a constante mantém os tempos absolutos calibrados
  // 0.8.3: o carro pesa mais (diferença real entre o mais rápido e o mais lento ~1,5–2 s); a constante mantém os tempos absolutos
  const car = ((100 - ctx.carPerf) * 0.15 - 1.02) * sc;
  const driver = ((100 - effPace) * 0.023 + 0.06) * sc;   // 0.8.3: o carro decide mais que o piloto (constante mantém os tempos)
  const setup = (0.62 - ctx.setupQ) * 0.9;
  const dry = 'SMH'.includes(ctx.compound);
  const props = Engine.CPROPS ? Engine.tprops(ctx.track, ctx.compound) : null;
  const relOff = props && dry ? (props.offset - Engine.CPROPS[Engine.alloc(ctx.track)[2]].offset) * 1.35 : (dry ? TYRES[ctx.compound].offset : 0);
  const trackGrip = ctx.trackT != null ? Math.abs(ctx.trackT - 36) * 0.006 : 0;
  const evo = ctx.evo ? -Math.min(0.35, ctx.evo * 0.006) : 0;
  const tyre = relOff * sc + Engine.tyreDeg(ctx.wear) * sc + (props ? Engine.tyreTempPenalty(props, ctx.ttemp) : 0) + trackGrip + evo;
  const R = (ctx.db && ctx.db.rules && ctx.db.rules.regs) || {};
  const fuel = ctx.fuel * 0.031 * ((R.fuelLimit || 70) / 70) + ((R.minWeight || 768) - 768) * 0.003;
  const weather = ctx.w * 7.5 * sc + Engine.weatherPenalty(ctx.compound, ctx.w) * sc;
  // modo de ataque rende mais para quem gerencia bem a energia (bateria/ERS)
  const mode = Engine.tyreModeDelta(ctx) + Engine.ersModeDelta(ctx);
  return { car, driver, setup, tyre, fuel, weather, mode, total: ctx.track.baseLap + car + driver + setup + tyre + fuel + weather + mode };
};


/* ---------- corrida ---------- */
const FAILURES = ['Falha no motor', 'Problema de câmbio', 'Perda de pressão hidráulica', 'Falha elétrica', 'Superaquecimento', 'Problema nos freios', 'Falha na unidade de energia'];

Engine.createRace = (wk, grid, opts = {}) => {
  // grid: [{did, tid, team, drv(eff), driver(raw), setupQ, carPerf, startTyre, auto, plan}]
  const track = wk.track;
  const pct = clamp(opts.sprint ? (wk.db.rules.sprintDistancePct || 33) : (wk.db.rules.raceDistancePct || 100), 5, 100) / 100;
  const laps = Math.max(opts.sprint ? 3 : 5, Math.round(track.laps * pct));
  const race = {
    trackId: track.id, laps, sprint: !!opts.sprint, lap: 0, sc: null, scHistory: [], events: [], finished: false,
    fastest: null, wet: wk.weather.wet.slice(0, laps + 2), lapLeaderTimes: [], bestS: [null, null, null], boostName: ((wk.db.rules.regs || {}).overtakeMode ?? wk.db.rules.overtakeMode) ? 'Ultrapassagem' : 'DRS', R: Object.assign({ electricShare: 50, scMultiplier: 1, vsc: true, redFlags: true, trackLimitWarnings: 3, penaltyStrictness: 1, fuelLimit: 70, minWeight: 768 }, wk.db.rules.regs || {}),
    cars: grid.map((g, i) => ({
      did: g.did, tid: g.tid, grid: i + 1, pos: i + 1,
      T: i * 0.22, laps: 0, lastLap: null, best: null,
      tyre: { c: g.startTyre, wear: g.startWear || 0, age: 0, temp: 78 }, used: [g.startTyre], soc: 100, secs: [], bestS: [null, null, null], lastS: null, vmax: 0, tl: 0,
      fuel: 100, mode: 'normal', damage: { wing: 0, power: 0, floor: 0, susp: 0, brakes: 0, gbx: 0 }, status: 'run', dnfReason: null,
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
  if (race.sprint) return { stops: 0, pitWear: 96, scOpportunist: false };
  const stops = track.tyreStress > 1.15 || race.laps > 65 ? (RNG.chance(0.65) ? 2 : 1) : (RNG.chance(0.8) ? 1 : 2);
  return { stops, pitWear: RNG.range(60, 74), scOpportunist: RNG.chance(0.75) };
};

Engine.event = (race, type, text, did, extra) => { const e = { lap: race.lap, type, text, did, ...(extra || {}) }; race.events.push(e); return e; };

Engine.chooseCompound = (race, car, wk, lapsLeft) => {
  const track = wk.track;
  const w = race.wet[race.lap + 1] ?? 0;
  if (w > 0.62) return 'W';
  if (w > 0.2) return 'I';
  const team = byId(wk.db.teams, car.tid);
  const drv = wk.effOf(car.did);
  const ok = (c) => Engine.wearRate(c, track, drv, team, 'normal', 0) * lapsLeft <= 72;
  const usedDry = car.used.filter(c => 'SMH'.includes(c));
  const needDiff = !race.sprint && wk.db.rules.mandatoryTwoCompounds && new Set(usedDry).size < 2 && race.wet.slice(0, race.lap + 1).every(x => x < 0.2);
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
  // (0.8.7) peça solta com bandeira preta e laranja: para já. Asa muito danificada: para. Dano leve: só se perder mais do que a parada custa
  if (car.meatball) return true;
  const wd = car.damage.wing || 0;
  if (wd >= 0.6 && lapsLeft > 3) return true;
  if (wd > 0 && lapsLeft > 3 && wd * 0.9 * lapsLeft > ((wk.track && wk.track.pitLoss) || 20) + 3.4) return true;
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
    if (!race.sprint && lapsLeft <= 6 && allDryRace && wk.db.rules.mandatoryTwoCompounds && usedDry.size < 2) return true;
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
  if (w > 0.2 && prevW <= 0.2) Engine.event(race, 'weather', byLang(`Começa a chover! Pista ${Engine.wetLabel(w).toLowerCase()}.`, `It's starting to rain! Track ${Engine.wetLabel(w).toLowerCase()}.`));
  if (w <= 0.12 && prevW > 0.12) Engine.event(race, 'weather', byLang('A pista está secando, linha seca aparecendo.', 'The track is drying, a dry line is appearing.'));

  // Safety car
  let scType = null;
  if (race.sc) {
    race.sc.left--;
    if (race.sc.left <= 0) {
      Engine.event(race, 'sc', race.sc.type === 'SC' ? byLang('Safety Car recolhe neste fim de volta. Relargada!', 'Safety Car in this lap. Restart!') : byLang('Fim do Safety Car Virtual. Bandeira verde.', 'Virtual Safety Car ending. Green flag.'));
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
  order.forEach((c, i) => { c.lastGapAhead = i === 0 ? 99 : c.T - order[i - 1].T; c.lastGapBehind = i === order.length - 1 ? 99 : order[i + 1].T - c.T; });
  const trackT = wk.weather && wk.weather.trackT ? wk.weather.trackT[L] : 32;
  // estrategistas da IA escolhem o modo de pilotagem (ataque, normal, economia de energia)
  order.forEach(c => {
    if (!c.tyreMode) c.tyreMode = Engine.tyreModeOf(c);
    if (!c.ersMode) c.ersMode = Engine.ersModeOf(c);
    if ((!c.isPlayer || c.autoModes) && Engine.aiModes) { const m = Engine.aiModes(race, c, c.lastGapAhead, c.lastGapBehind); c.tyreMode = m.tyre; c.ersMode = m.ers; }
    c.mode = c.tyreMode; // compatibilidade com telas e saves antigos
  });

  for (const c of order) {
    const team = byId(db.teams, c.tid);
    const drv = wk.effOf(c.did);
    const o = Engine.ord(c, L);   // ordens de rádio do jogador (zebras, ar sujo, defesa, ataque, economia)
    const lapsLeft = race.laps - L + 1;
    // decisão de pit (a parada acontece no fim desta volta)
    let doPit = false, newC = null;
    if (c.pitReq) { doPit = true; newC = c.pitReq; c.pitReq = null; }
    else if (c.auto && L > 1 && L < race.laps && !(c.noPitUntil && L < c.noPitUntil && c.tyre.wear < 90) && Engine.aiWantsPit(race, c, wk, team.staff.strategy)) {
      doPit = true; newC = Engine.chooseCompound(race, c, wk, race.laps - L);
    }
    // tempo de volta
    const lowBatt = c.ersMode === 'overtake' && (c.soc ?? 100) < 8;
    const pc = Engine.paceComponents({ db, track, team, drv, setupQ: c.setupQ, compound: c.tyre.c, wear: c.tyre.wear, fuel: c.fuel, w, tyreMode: scType ? 'normal' : c.tyreMode, ersMode: lowBatt || scType ? 'balanced' : c.ersMode, share: race.R.electricShare, quali: false, carPerf: c.carPerf - c.damage.power * 2, ttemp: c.tyre.temp, trackT, evo: L });
    let t = pc.total + c.damage.wing * 0.9 + (c.damage.floor || 0) * 0.55 + (c.damage.susp || 0) * 0.7 + (c.damage.brakes || 0) * 0.25 + (c.puPace || 0) + (lowBatt ? 0.25 : 0) + ((c.soc ?? 100) < 3 ? 0.4 : 0);
    c.pure = t; // ritmo limpo, sem tráfego (usado no rádio e no relatório)
    const sd = (0.14 + (100 - drv.consistency) * 0.009 + w * 0.3) * ((drv.b && drv.b.sd) || 1);
    t += RNG.normal(0, sd);
    if (!scType && !o.kerbs && RNG.chance(0.0006 * (track.street ? 0.6 : 1) * (c.tyreMode === 'push' ? 1.4 : 1))) { const pt = RNG.chance(0.7) ? 'floor' : 'susp'; Engine.hurt(race, c, pt, RNG.range(0.15, 0.45)); Engine.event(race, 'issue', byLang(`${wk.nameOf(c.did)} pega a zebra com força: ${Engine.PARTS[pt][0]} danificad${pt === 'susp' ? 'a' : 'o'}.`, `${wk.nameOf(c.did)} hits the kerb hard: ${Engine.PARTS[pt][1]} damaged.`), c.did); }
    if (!scType) t += (o.kerbs ? 0.07 : 0) + (o.lift ? 0.22 : 0) + (o.defend ? 0.06 : 0) + (o.shield ? 0.1 : 0) - (o.attack ? 0.06 : 0) - (o.motivated ? 0.03 : 0);

    if (L === 1) t += 2.6 + RNG.normal(0, 0.6) - (drv.start - 80) * 0.03 - (drv.racecraft - 80) * 0.01 - ((drv.b && drv.b.lap1) || 0);
    if (L === 1 && RNG.chance(0.0025 * (race.R ? race.R.penaltyStrictness : 1) * (1.4 - (drv.start || 80) / 200))) Engine.penalize(race, wk, c, 5, 'largada', 0);   // largada queimada
    // DRS / ar sujo
    c.drs = false;
    if (!scType && L >= 3 && (!race.restartLap || L - race.restartLap >= 2) && w < 0.3 && c.lastGapAhead < 1.0 && track.drs > 0) {
      c.drs = true; t -= 0.16 * Math.sqrt(track.drs) * (race.R.activeAero ? 1.15 : 1);   // aerodinâmica ativa: asas abrem mais nas retas
    }
    if (!scType && c.lastGapAhead < 1.3) t += o.cleanAir ? (1.5 - c.lastGapAhead) * 0.6 : 0.1 + track.weights.aero * 0.45;   // ar sujo: com a ordem, o piloto recua e protege os pneus
    if (scType === 'SC') t = scPace + RNG.range(0, 0.4);
    if (scType === 'VSC') t = Math.max(t, track.baseLap * 1.3) + RNG.range(0, 0.3);

    // incidentes
    const rel = Engine.reliability(db, team);
    const air = wk.weather && wk.weather.air ? wk.weather.air[L] : 22;
    const heat = air > 28 ? 1 + (air - 28) * 0.05 * clamp(1 - ((team.car.cooling ?? 80) - 80) / 40, 0.3, 1.5) : 1;
    const pFail = 0.000042 * Math.max(4, 106 - rel) * (c.tyreMode === 'push' ? 1.12 : 1) * (c.ersMode === 'overtake' ? 1.1 : 1) * heat * (o.lift ? 0.85 : 1) * (o.kerbs ? 0.9 : 1) * (c.puRisk || 1);
    if (RNG.chance(pFail)) {
      if (RNG.chance(0.72)) {
        c.status = 'dnf'; c.dnfReason = RNG.pick(FAILURES); c.T += t;
        Engine.event(race, 'dnf', byLang(`${wk.nameOf(c.did)} abandona: ${c.dnfReason.toLowerCase()}.`, `${wk.nameOf(c.did)} retires: ${c.dnfReason.toLowerCase()}.`), c.did);
        if (RNG.chance(0.35) && !race.sc) Engine.deploySC(race, 'VSC', byLang('carro parado na pista', 'car stopped on track'));
        continue;
      } else {
        c.damage.power = Math.min(3, c.damage.power + 1);
        Engine.event(race, 'issue', byLang(`${wk.nameOf(c.did)} relata perda de potência.`, `${wk.nameOf(c.did)} reports a loss of power.`), c.did);
      }
    }
    // peça danificada que cede (câmbio, suspensão ou freios)
    { const dm = c.damage; const fail = dm.gbx && RNG.chance(0.03 * dm.gbx) ? 'gbx' : dm.susp > 0.6 && RNG.chance(0.05 * dm.susp) ? 'susp' : dm.brakes && RNG.chance(0.012 * dm.brakes) ? 'brakes' : null;
      if (fail) { const P = Engine.PARTS[fail]; c.status = 'dnf'; c.dnfReason = byLang(P[2], P[3]); c.T += t; (race.dmg = race.dmg || []).push({ did: c.did, tid: c.tid, part: fail, sev: 1, lap: L, dnf: true });
        Engine.event(race, 'dnf', byLang(`${wk.nameOf(c.did)} abandona: ${P[0]} danificado${fail === 'susp' ? 'a' : fail === 'brakes' ? 's' : ''} cede.`, `${wk.nameOf(c.did)} retires: the damaged ${P[1]} gives up.`), c.did);
        if (RNG.chance(0.3) && !race.sc) Engine.deploySC(race, 'VSC', byLang('carro parado na pista', 'car stopped on track'));
        continue; } }
    if (!scType) {
      const errP = (0.00035 + (100 - drv.consistency) * 0.00006) * ((drv.b && drv.b.err) || 1) * (1.35 - drv.concentration / 100 * 0.45) * (c.tyreMode === 'push' ? 1.6 : c.tyreMode === 'save' ? 0.7 : 1) * (1 + w * 4 + Engine.weatherPenalty(c.tyre.c, w) * 0.6) * (L === 1 ? 3 : 1) * (o.kerbs ? 0.6 : 1) * (o.attack ? 1.25 : 1) * (o.lift ? 0.85 : 1);
      if (RNG.chance(errP)) {
        incidentCars.add(c);
        const crash = RNG.chance(0.32 + w * 0.25 + (track.street ? 0.18 : 0));
        if (crash) {
          c.status = 'dnf'; c.dnfReason = byLang('Acidente', 'Accident'); c.T += t;
          Engine.event(race, 'crash', byLang(`${wk.nameOf(c.did)} bate sozinho e está fora da corrida!`, `${wk.nameOf(c.did)} crashes out on his own!`), c.did);
          const r = RNG.next();
          if (race.R.redFlags && (w > 0.75 || (L <= 2 && track.street)) && RNG.chance(0.35)) Engine.deploySC(race, 'RED', byLang('barreira danificada', 'damaged barrier'), wk);
          else if (r < 0.5 * track.scFactor * race.R.scMultiplier) Engine.deploySC(race, 'SC', byLang('acidente', 'accident'));
          else if (r < 0.68) Engine.deploySC(race, 'VSC', byLang('detritos na pista', 'debris on track'));   // nem toda batida neutraliza a corrida
          continue;
        } else {
          const loss = RNG.range(3, 11);
          t += loss;
          if (RNG.chance(0.3)) { const ws = RNG.range(0.3, 1); Engine.hurt(race, c, 'wing', ws); Engine.event(race, 'issue', ws < 0.6 ? byLang(`${wk.nameOf(c.did)} roda e perde um pedaço da asa dianteira.`, `${wk.nameOf(c.did)} spins and loses part of the front wing.`) : byLang(`${wk.nameOf(c.did)} roda e danifica a asa dianteira.`, `${wk.nameOf(c.did)} spins and damages the front wing.`), c.did); }
          else if (RNG.chance(0.18)) { const pt = RNG.chance(0.75) ? 'floor' : 'gbx'; Engine.hurt(race, c, pt, RNG.range(0.3, 0.8)); Engine.event(race, 'issue', byLang(`${wk.nameOf(c.did)} roda pela brita e danifica o ${Engine.PARTS[pt][0]}.`, `${wk.nameOf(c.did)} spins through the gravel and damages the ${Engine.PARTS[pt][1]}.`), c.did); }
          else Engine.event(race, 'spin', byLang(`${wk.nameOf(c.did)} roda e perde ${loss.toFixed(1)}s.`, `${wk.nameOf(c.did)} spins and loses ${loss.toFixed(1)}s.`), c.did);
        }
      }
    }
    if (c.tyre.wear > 92 && RNG.chance(0.08)) {
      c.tyre.puncture = true; t += RNG.range(14, 26);
      Engine.event(race, 'issue', byLang(`Pneu furado para ${wk.nameOf(c.did)}! Pneus totalmente gastos.`, `Puncture for ${wk.nameOf(c.did)}! Tyres completely worn.`), c.did);
      if (!c.auto) { doPit = true; newC = newC || Engine.chooseCompound(race, c, wk, race.laps - L); }
    }
    // pit stop
    if (doPit) {
      const loss = track.pitLoss * (scType === 'SC' ? 0.5 : scType === 'VSC' ? 0.62 : 1);
      let stop = 2.1 + (100 - team.pitCrew) * 0.022 + Math.abs(RNG.normal(0, 0.25));
      let slow = false;
      if (RNG.chance((100 - team.pitCrew) / 450 + 0.02)) { const extra = RNG.range(1.5, 8); stop += extra; slow = true; }
      const fromC = c.tyre.c, fromAge = c.tyre.age;
      t += loss + stop;
      c.pits++; c.lastPitLap = L; pitted.add(c);
      // infrações no pit (diretrizes da FIA): excesso de velocidade no pit lane ou liberação insegura = 5 s
      { const strict = race.R ? race.R.penaltyStrictness : 1;
        if (RNG.chance(0.004 * strict)) Engine.penalize(race, wk, c, 5, 'pitspeed', 0);
        else if (RNG.chance(0.0025 * strict * (130 - team.pitCrew) / 40)) Engine.penalize(race, wk, c, 5, 'unsafe', 0); }
      c.stints[c.stints.length - 1].to = L;
      c.stints.push({ c: newC, from: L, to: null });
      c.tyre = { c: newC, wear: 0, age: -1, temp: 70 }; c.used.push(newC);
      if (c.damage.wing) { c.damage.wing = 0; c.loosePart = null; c.meatball = null; const nose = RNG.range(2.5, 4.5); t += nose; c.lastNose = +nose.toFixed(1); (race.dmg = race.dmg || []).push({ did: c.did, tid: c.tid, part: 'nose', sev: 1, lap: L, fix: true }); }
      if (c.pendingPen) { t += c.pendingPen; c.pendingPen = 0; }
      c.lastStop = +stop.toFixed(1);
      // toda parada fica registrada; o texto com a posição de volta é completado no fim da volta
      (race.pitLog = race.pitLog || []).push({ lap: L, did: c.did, tid: c.tid, stop: +stop.toFixed(1), loss: +(loss + stop).toFixed(1), from: fromC, fromAge, to: newC, posIn: c.pos, slow, sc: scType || null });
      Engine.event(race, 'pit', byLang(`${wk.nameOf(c.did)} para nos boxes: ${Engine.tyreLabel ? Engine.tyreLabel(track, newC) : TYRES[newC].name} (${stop.toFixed(1)}s).`, `${wk.nameOf(c.did)} pits: ${Engine.tyreLabel ? Engine.tyreLabel(track, newC) : TYRES[newC].name} (${stop.toFixed(1)}s).`), c.did, { stop: +stop.toFixed(1), slow, tyre: newC, imp: true }); c._pitEvIdx = race.events.length - 1;
    }
    // limites de pista: três advertências e a quarta vira punição
    if (track.tlF == null) track.tlF = /aut|austria|spielberg|red-bull-ring|qat|losail|lusail|bhr|bahrain|sakhir|abu|yas|americas|austin|ricard|jeddah|ksa/i.test(track.id + ' ' + (track.circuit || '')) ? 3 : track.street ? 0.4 : 1;   // pistas com muita área asfaltada geram mais exclusões de volta
    if (!scType && RNG.chance(0.012 * track.tlF * clamp(((drv.aggression || 50) / 55) * (1.4 - drv.concentration / 120), 0.55, 1.15))) {   // fator do piloto limitado: pilotos novos mais agressivos não podem inflar as punições ao longo das décadas
      c.tl++;
      const tlw = race.R.trackLimitWarnings;
      if (c.tl === tlw) Engine.event(race, 'flag', byLang(`Bandeira preta e branca para ${wk.nameOf(c.did)}: ${tlw}ª advertência por limite de pista.`, `Black and white flag for ${wk.nameOf(c.did)}: track limits warning number ${tlw}.`), c.did);
      if (c.tl === tlw + 1) { const tlPts = Engine.tlPoint(race, c, track); c.pendingPen += 5; c.penalty += 5; if (tlPts) (race.pp = race.pp || []).push({ did: c.did, pts: tlPts, why: 'limites' }); (race.pens = race.pens || []).push({ did: c.did, s: 5, why: 'limites', lap: race.lap, pts: tlPts }); Engine.event(race, 'penalty', byLang(`5s de punição para ${wk.nameOf(c.did)} por exceder os limites de pista.`, `5s penalty for ${wk.nameOf(c.did)} for exceeding track limits.`), c.did); }
    }
    c.lapTime = t;
    if (!scType) { c.lastS = Engine.sectorSplit(track, t - (pitted.has(c) ? (t - pc.total) * 0.8 : 0), sd); c.secs[L] = c.lastS; } else c.lastS = null;
    c.vlap = Engine.topSpeed(db, team, track, c.setupQ, c.drs, w); if (!scType && c.vlap > c.vmax) c.vmax = c.vlap;
    Engine.tyreTempStep(c, track, Engine.tprops(track, c.tyre.c), trackT, c.tyreMode, w, scType);
    if (race.R.electricShare > 0) { const s0 = c.soc ?? 100; Engine.socStep(c, drv, c.ersMode, c.drs, scType, race.R.electricShare, team.car.energy); const dS = c.soc - s0; c.ersH = (c.ersH || []).concat([+dS.toFixed(1)]).slice(-15); c.ersIn = +((c.ersIn || 0) + Math.max(0, dS)).toFixed(1); c.ersOut = +((c.ersOut || 0) + Math.max(0, -dS)).toFixed(1); } else c.soc = 100;
    c.T += t;
    c.laps = L;
    // pneus e combustível
    const wr = Engine.wearRate(c.tyre.c, track, drv, team, scType ? 'save' : c.tyreMode, w, c.tyre.temp) * (scType ? 0.45 : 1);
    c.tyre.wear = clamp(c.tyre.wear + wr * (o.lift ? 0.94 : 1) * (o.attack ? 1.08 : 1) * (o.defend ? 1.04 : 1) * (o.shield ? 1.06 : 1) * (o.cleanAir && c.lastGapAhead < 1.3 ? 0.93 : 1), 0, 100);
    if (!scType) c.wearPerLap = +(wr / Engine.tyreWearMul(c.tyreMode)).toFixed(2); // ritmo de desgaste no modo equilibrado (base da estratégia)
    c.tyre.age++;
    c.fuel = Math.max(0, c.fuel - 100 / race.laps * (o.lift ? 0.9 : 1));
  }

  // ultrapassagens — percorre do líder para trás
  const live = order.filter(c => c.status === 'run');
  if (scType === 'SC' || scType === 'RED') {
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
        const oc = Engine.ord(cur, L), oa = Engine.ord(ahead, L);
        // ordens: não briga com o companheiro / não ataca para fugir do ar sujo
        if (oc.hold && cur.tid === ahead.tid && !cur.ignoredHold && cur.T < ahead.T + 0.15 && RNG.chance((1 - Engine.obeyP(wk, cur, ahead)) * 0.05)) {
          cur.ignoredHold = true;   // vai brigar com o companheiro até o fim
          Engine.orderLog(race, { type: 'hold', did: cur.did, mate: ahead.did, tid: cur.tid, obeyed: false, lap: L, pos: j + 1 });
          Engine.event(race, 'radio', `${wk.nameOf(cur.did)}: "${Engine.orderLine('ignoreHold', wk.nameOf(ahead.did))}"`, cur.did, { imp: true });
          Engine.event(race, 'order', byLang(`${wk.nameOf(cur.did)} desobedece a ordem de manter posições e ataca ${wk.nameOf(ahead.did)}!`, `${wk.nameOf(cur.did)} defies the hold-position order and attacks ${wk.nameOf(ahead.did)}!`), cur.did, { b: ahead.did, imp: true });
        }
        if ((oc.hold && cur.tid === ahead.tid && !cur.ignoredHold) || oc.cleanAir) { cur.T = Math.max(cur.T, ahead.T + (oc.cleanAir ? 0.9 : 0.45)); break; }
        const dc = wk.effOf(cur.did), da = wk.effOf(ahead.did);
        const adv = (ahead.T + 0.25 - cur.T);
        const x = adv * 1.6 + (dc.overtaking - da.defending) / 22 + ((dc.b && dc.b.ovt) || 0) - ((da.b && da.b.def) || 0) + (cur.drs ? 0.7 : 0) + track.overtaking * 2.3 - 3.4 - (L === 1 ? -0.6 : 0) + (cur.ersMode === 'overtake' ? 0.35 : 0) + (cur.tyreMode === 'push' ? 0.12 : 0) + (oc.attack ? 0.3 : 0) - (oa.defend ? 0.55 : 0) - (oa.shield && cur.tid !== ahead.tid && race.cars.some(m => m !== ahead && m.tid === ahead.tid && m.status === 'run' && m.T < ahead.T && ahead.T - m.T < 3) ? 0.7 : 0);   // segura quem vem atrás para proteger o companheiro
        const p = 1 / (1 + Math.exp(-x));
        if (RNG.chance(p)) {
          cur.overtakes++;
          if (cur.T > ahead.T - 0.12) cur.T = ahead.T - 0.12;
          ahead.T += RNG.range(0.05, 0.35);
          live[j] = ahead; live[j - 1] = cur;
          // todas as ultrapassagens entram no relatório (narradas com o nome da curva)
          const ro = localRng(`ov:${race.trackId}:${L}:${cur.did}:${ahead.did}`);
          const ovTxt = typeof Narr !== 'undefined' ? Narr.fill(Narr.pick('rO', Narr.R.overtake, ro), { a: wk.nameOf(cur.did), b: wk.nameOf(ahead.did), c: Narr.corner(track, Math.floor(ro() * 3), ro), p: j }) : `${wk.nameOf(cur.did)} ultrapassa ${wk.nameOf(ahead.did)} pela ${ordinal(j)} posição.`;
          Engine.event(race, 'overtake', ovTxt, cur.did, { b: ahead.did, pos: j, imp: cur.isPlayer || ahead.isPlayer || j <= 10 });
          if (!scType && RNG.chance(0.004 * (race.R ? race.R.penaltyStrictness : 1))) Engine.investigate(race, wk, cur, 'vantagem', { other: ahead.did });   // passou por fora da pista
          j--;
        } else {
          // briga roda a roda — chance de toque
          const aggr = (dc.aggression + da.aggression) / 2;
          const riv = race.rivals && race.rivals.length && race.rivals.includes([cur.did, ahead.did].sort().join('|')) ? 1.6 : 1; // rivais brigam mais duro
          const pCol = 0.0045 * (aggr / 55) * (1.4 - track.overtaking) * (L === 1 ? 4 : 1) * (1 + w * 2) * riv;
          if (RNG.chance(pCol)) {
            Engine.collision(race, wk, cur, ahead);
            break;
          }
          cur.T = ahead.T + RNG.range(0.28, 0.65);
          // defesa que vale registro: briga real pelas primeiras posições ou com o seu carro
          if (p > 0.3 && (j <= 8 || cur.isPlayer || ahead.isPlayer) && !scType) {
            const rd = localRng(`df:${race.trackId}:${L}:${cur.did}`);
            if (rd() < 0.3 && typeof Narr !== 'undefined') Engine.event(race, 'defend', Narr.fill(Narr.pick('rD', Narr.R.defend, rd), { a: wk.nameOf(cur.did), b: wk.nameOf(ahead.did), c: Narr.corner(track, Math.floor(rd() * 3), rd) }), ahead.did, { b: cur.did, pos: j - 1 });
          }
          break;
        }
      }
    }
  }

  Engine.applyOrders(race, wk, L, scType);
  Engine.stewardsLap(race, wk, L, scType);
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
        if (race.fastest && L > 5) Engine.event(race, 'fastest', byLang(`Volta mais rápida: ${wk.nameOf(c.did)} ${fmtLap(c.lapTime)}.`, `Fastest lap: ${wk.nameOf(c.did)} ${fmtLap(c.lapTime)}.`), c.did);
        race.fastest = { did: c.did, time: c.lapTime, lap: L };
      }
      if (c.lastS) c.lastS.forEach((v, k) => { if (c.bestS[k] == null || v < c.bestS[k]) c.bestS[k] = v; if (race.bestS[k] == null || v < race.bestS[k]) race.bestS[k] = v; });
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
  const names = `${wk.nameOf(a.did)} ${byLang('e', 'and')} ${wk.nameOf(b.did)}`;
  (race.clashes = race.clashes || []).push([a.did, b.did, culprit.did, sev < 0.22 ? 'crash' : 'contact']);
  if (sev < 0.22) {
    const victim = RNG.chance(0.5) ? a : b;
    victim.status = 'dnf'; victim.dnfReason = byLang('Colisão', 'Collision'); (race.dmg = race.dmg || []).push({ did: victim.did, tid: victim.tid, part: 'chassis', sev: 1, lap: race.lap, dnf: true });
    { const other = victim === a ? b : a; if (RNG.chance(0.55)) Engine.hurt(race, other, RNG.chance(0.6) ? 'wing' : 'susp', RNG.range(0.4, 1)); }
    Engine.event(race, 'crash', byLang(`Batida entre ${names}! ${wk.nameOf(victim.did)} está fora.`, `Crash between ${names}! ${wk.nameOf(victim.did)} is out.`), victim.did);
    const rs = RNG.next();
    if (rs < 0.45 * wk.track.scFactor) Engine.deploySC(race, 'SC', byLang('colisão', 'collision')); else if (rs < 0.8) Engine.deploySC(race, 'VSC', byLang('detritos', 'debris'));
  } else if (sev < 0.6) {
    const victim = RNG.chance(0.5) ? a : b;
    const pt = RNG.weighted(['wing', 'floor', 'susp', 'brakes', 'gbx'], p => ({ wing: 55, floor: 20, susp: 15, brakes: 5, gbx: 5 })[p]);
    Engine.hurt(race, victim, pt, pt === 'wing' ? RNG.range(0.25, 1) : RNG.range(0.3, 0.9)); victim.T += RNG.range(1, 4);
    Engine.event(race, 'contact', byLang(`Toque entre ${names}. ${wk.nameOf(victim.did)} com ${Engine.PARTS[pt][0]} danificad${pt === 'susp' ? 'a' : pt === 'brakes' ? 'os' : 'o'}.`, `Contact between ${names}. ${wk.nameOf(victim.did)} has ${Engine.PARTS[pt][1]} damage.`), victim.did);
  } else {
    a.T += RNG.range(0.5, 2); b.T += RNG.range(0.5, 2);
    Engine.event(race, 'contact', byLang(`Roda a roda e toque leve entre ${names}. Os dois seguem.`, `Wheel to wheel and light contact between ${names}. Both continue.`), a.did);
  }
  if (RNG.chance(clamp(0.6 * (race.R ? race.R.penaltyStrictness : 1), 0, 0.95))) Engine.investigate(race, wk, culprit, 'colisao', { other: culprit === a ? b.did : a.did, heavy: sev < 0.22 });
};

Engine.deploySC = (race, type, why, wk) => {
  if (race.sc || race.laps - race.lap < 2) return;
  if (race.R && type === 'VSC' && !race.R.vsc) type = 'SC';
  if (race.R && type === 'RED' && !race.R.redFlags) type = 'SC';
  const left = type === 'SC' ? RNG.int(3, 5) : type === 'RED' ? 3 : RNG.int(2, 3);
  race.sc = { type, left, from: race.lap };
  race.scHistory.push({ type, from: race.lap, to: race.lap + left });
  if (type === 'RED') {
    // bandeira vermelha: corrida suspensa, troca de pneus livre e relargada
    Engine.event(race, 'flag', byLang(`BANDEIRA VERMELHA (${why}). Corrida suspensa; equipes podem trocar pneus.`, `RED FLAG (${why}). Race suspended; teams may change tyres.`));
    if (wk) race.cars.filter(c => c.status === 'run').forEach(c => { const nc = Engine.chooseCompound(race, c, wk, race.laps - race.lap); c.stints[c.stints.length - 1].to = race.lap; c.stints.push({ c: nc, from: race.lap, to: null }); c.tyre = { c: nc, wear: 0, age: 0, temp: 70 }; c.used.push(nc); });
    return;
  }
  Engine.event(race, 'sc', type === 'SC' ? byLang(`SAFETY CAR na pista (${why}).`, `SAFETY CAR deployed (${why}).`) : byLang(`Safety Car Virtual acionado (${why}).`, `Virtual Safety Car deployed (${why}).`), null, { deploy: true });
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
  const pts = race.sprint ? (wk.db.rules.sprintPoints || [8, 7, 6, 5, 4, 3, 2, 1]) : wk.db.rules.points;
  race.points = {};
  classified.forEach((c, i) => {
    let p = c.status === 'fin' ? (pts[i] || 0) : 0;
    race.points[c.did] = p;
  });
  if (!race.sprint && wk.db.rules.fastestLapPoint && race.fastest) {
    const fc = race.cars.find(c => c.did === race.fastest.did);
    if (fc && fc.status === 'fin' && fc.pos <= (wk.db.rules.fastestLapTopN || 10)) race.points[fc.did] += wk.db.rules.fastestLapPoint;
  }
  const w = classified[0];
  if (w) Engine.event(race, 'finish', race.sprint ? `${wk.nameOf(w.did)} vence a corrida Sprint!` : `BANDEIRADA! ${wk.nameOf(w.did)} vence o ${wk.track.gp}!`, w.did);
};

/* ---------- ordens de rádio do jogador ----------
   c.orders: { kerbs, cleanAir, defend, attack, lift, hold, letBy, motivatedUntil }
   Só os carros do jogador recebem ordens; os da IA seguem os estrategistas. */
const NO_ORD = Object.freeze({});
Engine.ord = (c, L) => {
  const o = c && c.orders; if (!o) return NO_ORD;
  const r = {};   // valor true = até cancelar; número = vale até aquela volta
  for (const k in o) { const v = o[k]; if (v === true || (typeof v === 'number' && L != null && L <= v)) r[k] = true; }
  if (o.motivatedUntil && L != null && L <= o.motivatedUntil) r.motivated = true;
  return r;
};
Engine.ORDER_LAPS = { attack: 5, defend: 5, cleanAir: 5, shield: 8 };
Engine.ORDERS = ['kerbs', 'cleanAir', 'defend', 'attack', 'lift', 'hold'];
/* deixar o companheiro passar: executa quando ele está logo atrás (até 2,5 s) */
Engine.applyOrders = (race, wk, L, scType) => {
  if (scType === 'SC' || scType === 'RED') return;
  race.cars.forEach(c => {
    const o = c.orders; if (!o || !o.letBy || c.status !== 'run') return;   // vale até acontecer
    const mate = race.cars.find(x => x !== c && x.tid === c.tid && x.status === 'run');
    if (!mate) { o.letBy = false; return; }
    const run = race.cars.filter(x => x.status === 'run').sort((a, b) => a.T - b.T);
    const ic = run.indexOf(c), im = run.indexOf(mate);
    if (im === ic + 1 && mate.T - c.T < 2.5) {
      o.letBy = false;
      // o piloto pode se recusar (personalidade, campeonato, moral, posição em jogo)
      if (!RNG.chance(Engine.obeyP(wk, c, mate))) {
        Engine.orderLog(race, { type: 'letBy', did: c.did, mate: mate.did, tid: c.tid, obeyed: false, lap: L, pos: ic + 1 });
        Engine.event(race, 'radio', `${wk.nameOf(c.did)}: "${Engine.orderLine('refuse', wk.nameOf(mate.did))}"`, c.did, { imp: true });
        Engine.event(race, 'order', byLang(`${wk.nameOf(c.did)} ignora a ordem e não abre passagem para ${wk.nameOf(mate.did)}.`, `${wk.nameOf(c.did)} ignores the order and does not let ${wk.nameOf(mate.did)} through.`), c.did, { b: mate.did, imp: true });
        return;
      }
      Engine.orderLog(race, { type: 'letBy', did: c.did, mate: mate.did, tid: c.tid, obeyed: true, lap: L, pos: ic + 1 });
      Engine.event(race, 'radio', `${wk.nameOf(c.did)}: "${Engine.orderLine('obey', wk.nameOf(mate.did))}"`, c.did);
      const tc = c.T; c.T = mate.T + 0.35; mate.T = tc;
      Engine.event(race, 'order', byLang(`Ordem de equipe: ${wk.nameOf(c.did)} abre passagem para ${wk.nameOf(mate.did)}.`, `Team order: ${wk.nameOf(c.did)} lets ${wk.nameOf(mate.did)} through.`), c.did, { b: mate.did, imp: true });
    } else if (im < ic) o.letBy = false;   // o companheiro já está à frente
  });
};

/* punição dos comissários durante a corrida (fica registrada para o direito de revisão) */
Engine.PEN_TXT = { pitspeed: ['excesso de velocidade no pit lane', 'speeding in the pit lane'], unsafe: ['liberação insegura do box', 'unsafe release'], largada: ['largada queimada', 'jump start'], colisao: ['causar colisão', 'causing a collision'], limites: ['exceder os limites de pista', 'exceeding track limits'] };
/* (0.8.7) limites de pista: o ponto na superlicença é decisão dos comissários (cerca de metade dos casos),
   como na F1 real, em vez de automático. Decidido por hash (sem sorteio), para não mexer na sequência do RNG. */
Engine.tlPoint = (race, c, track) => (hashStr(`${c.did}:${race.lap}:${track && track.id}:${race.laps}`) % 2 === 0 ? 1 : 0);
Engine.penalize = (race, wk, c, s, why, pts) => {
  c.pendingPen += s; c.penalty += s;
  (race.pens = race.pens || []).push({ did: c.did, s, why, lap: race.lap, pts: pts || 0 });
  if (pts) (race.pp = race.pp || []).push({ did: c.did, pts, why });
  const w = Engine.PEN_TXT[why] || [why, why];
  Engine.event(race, 'penalty', byLang(`Comissários: ${s}s de punição para ${wk.nameOf(c.did)} por ${w[0]}.`, `Stewards: ${s}s penalty for ${wk.nameOf(c.did)} for ${w[1]}.`), c.did);
};

/* danos por peça: [nome, name, motivo do abandono PT, EN] */
Engine.PARTS = { wing: ['asa dianteira', 'front wing', 'Asa dianteira', 'Front wing'], floor: ['assoalho', 'floor', 'Assoalho', 'Floor'], susp: ['suspensão', 'suspension', 'Suspensão', 'Suspension'], brakes: ['freios', 'brakes', 'Freios', 'Brakes'], gbx: ['câmbio', 'gearbox', 'Câmbio', 'Gearbox'] };
Engine.hurt = (race, c, part, sev) => {
  c.damage[part] = Math.min(1, (c.damage[part] || 0) + sev);
  (race.dmg = race.dmg || []).push({ did: c.did, tid: c.tid, part, sev: +sev.toFixed(2), lap: race.lap });
  // (0.8.7) asa: muito danificada pode ficar pendurada (os comissários mostram a bandeira preta e laranja);
  // pedaços grandes ficam na pista e podem trazer o Safety Car virtual (Damage.lap decide, em core/race/damage.js)
  if (part === 'wing' && c.status === 'run' && race.lap > 0) {
    if (c.damage.wing >= 0.75 && !c.loosePart && RNG.chance(0.4)) c.loosePart = { lap: race.lap };
    if (sev >= 0.5 && RNG.chance(0.3)) race.debrisLap = race.lap;
  }
};

/* ordens de equipe: chance de o piloto obedecer */
Engine.obeyP = (wk, c, mate) => {
  const d = wk.driverOf ? wk.driverOf(c.did) : null; if (!d) return 0.9;
  const p = d.personality || {};
  const ahead = wk.standOf ? wk.standOf(c.did) - wk.standOf(mate.did) : 0;
  let x = 0.9 - ((p.ambition ?? 60) - 50) * 0.005 - ((p.temper ?? 50) - 50) * 0.004 + ((p.loyalty ?? 50) - 50) * 0.004;
  if (ahead > 0) x -= 0.12;                       // está à frente do companheiro no campeonato
  if ((d.morale ?? 70) < 40) x -= 0.1;            // insatisfeito
  if (c.pos && c.pos <= 3) x -= 0.06;             // pódio ou vitória em jogo
  if ((d.disobey || 0) > 0) x -= 0.05 * Math.min(3, d.disobey);   // reincidente
  return clamp(x, 0.3, 0.98);
};
Engine.orderLog = (race, x) => { (race.orderLog = race.orderLog || []).push(x); };
/* falas do rádio — muitas variações para não repetir */
Engine.ORDER_LINES = {
  obey: [['Entendido. Ele passa na reta.', 'Understood. He goes by on the straight.'], ['Ok... mas lembrem disso depois.', 'OK... but remember this later.'], ['Copiado. Abrindo na próxima curva.', 'Copy. Opening up at the next corner.'], ['Sério? Tá bom, tá bom.', 'Seriously? Fine, fine.'], ['Pela equipe. Só desta vez.', 'For the team. Just this once.'], ['Ele que me devolva se não abrir distância.', 'He gives it back if he cannot pull away.'], ['Feito. Espero que valha a pena.', 'Done. I hope it is worth it.'], ['Certo, entendi a estratégia.', 'Right, I get the strategy.'], ['Que piada... Ok.', 'What a joke... OK.'], ['Vou deixar. Mas quero conversar depois da corrida.', 'I will let him. But I want to talk after the race.']],
  refuse: [['Não. Eu sou mais rápido, ele que me passe.', 'No. I am faster, he can pass me.'], ['Negativo. Estou lutando pelo campeonato também.', 'Negative. I am fighting for the championship too.'], ['Repete? O rádio está ruim...', 'Say again? The radio is bad...'], ['Não vou entregar posição de graça.', 'I am not giving the position away.'], ['Ele teve a chance dele. Agora é minha.', 'He had his chance. Now it is mine.'], ['Deixa a gente correr!', 'Let us race!'], ['Vocês estão brincando? Não.', 'Are you kidding? No.'], ['Me deem mais duas voltas e eu abro.', 'Give me two more laps and I will pull away.'], ['Isso não estava combinado.', 'That was not the agreement.'], ['Não entendi a mensagem.', 'I did not understand the message.']],
  ignoreHold: [['Ele está lento demais, vou passar.', 'He is too slow, I am going through.'], ['Desculpa, não dá para ficar atrás.', 'Sorry, I cannot stay behind.'], ['Eu tenho ritmo para a vitória!', 'I have the pace to win!'], ['A gente conversa depois.', 'We talk later.'], ['Vou na limpa, sem risco.', 'I will do it clean, no risk.'], ['Ninguém me segura hoje.', 'Nobody holds me back today.'], ['Ele está me atrasando, vou nessa.', 'He is holding me up, I am going.'], ['Não ouvi a parte de manter posição.', 'Did not hear the hold-position part.']],
};
Engine.orderLine = (k, mate) => { const L = Engine.ORDER_LINES[k]; const x = L[Math.floor(RNG.next() * L.length)]; return byLang(x[0], x[1]).replace('{m}', mate || ''); };

/* =============================================================
   DIREÇÃO DE PROVA (0.8.6)
   - Incidente "sob investigação": a decisão sai 1 a 4 voltas depois, ou depois da bandeirada.
   - Escala de punições: advertência, 5 s, 10 s, drive-through, stop-and-go (10 s parado) e posições no grid
     da próxima corrida. Drive-through e stop-and-go são cumpridos em até 3 voltas; se a corrida acabar antes,
     viram 20 s e 30 s no tempo final (como no regulamento).
   - Diretrizes por infração; "nenhuma ação" também é uma decisão possível.
   ============================================================= */
Engine.PEN_TXT.vantagem = ['sair da pista e ganhar vantagem', 'leaving the track and gaining an advantage'];
Engine.PEN_TXT.bandeira = ['ignorar bandeiras azuis', 'ignoring blue flags'];
Engine.PEN_TXT.solta = ['não parar com peça solta (bandeira preta e laranja)', 'not pitting with a loose part (black and orange flag)'];
Engine.KIND_TXT = { warn: ['advertência', 'a warning'], dt: ['drive-through', 'a drive-through'], sg: ['stop-and-go de 10 s', 'a 10 s stop-and-go'], grid: ['posições no grid da próxima corrida', 'grid places at the next race'] };
/* diretrizes: [peso, tipo, segundos, pontos na superlicença] */
Engine.GUIDE = {
  colisao: [[25, 'nfa', 0, 0], [8, 'warn', 0, 0], [40, 'time', 5, 2], [17, 'time', 10, 3], [5, 'dt', 0, 3], [2, 'sg', 0, 3], [3, 'grid', 3, 3]],
  vantagem: [[35, 'nfa', 0, 0], [10, 'warn', 0, 0], [45, 'time', 5, 1], [10, 'time', 10, 2]],
  bandeira: [[15, 'warn', 0, 0], [70, 'time', 5, 1], [15, 'dt', 0, 2]],
};
Engine.investigate = (race, wk, c, why, x) => {
  if (!c || c.status !== 'run') return;
  if ((race.inv || []).some(i => i.did === c.did && i.why === why && !i.done)) return;
  const due = race.lap + RNG.int(1, 4);
  (race.inv = race.inv || []).push({ did: c.did, why, lap: race.lap, due, other: x && x.other, heavy: x && x.heavy });
  const w = Engine.PEN_TXT[why] || [why, why];
  Engine.event(race, 'flag', byLang(`Incidente sob investigação: ${wk.nameOf(c.did)} por ${w[0]}${x && x.other ? ` (com ${wk.nameOf(x.other)})` : ''}. Decisão depois.`, `Incident under investigation: ${wk.nameOf(c.did)} for ${w[1]}${x && x.other ? ` (with ${wk.nameOf(x.other)})` : ''}. Decision later.`), c.did, { imp: true });
};
Engine.decide = (race, wk, inv, after) => {
  inv.done = true;
  const c = race.cars.find(x => x.did === inv.did); if (!c) return;
  let G0 = (Engine.GUIDE[inv.why] || Engine.GUIDE.colisao).slice();
  if (inv.heavy) G0 = G0.map(g => (g[1] === 'nfa' ? [g[0] * 0.4, ...g.slice(1)] : g[2] === 10 || g[1] === 'dt' ? [g[0] * 1.8, ...g.slice(1)] : g));
  if (after || race.laps - race.lap < 4) G0 = G0.map(g => (g[1] === 'dt' || g[1] === 'sg' ? [0, ...g.slice(1)] : g));   // fim de corrida: só tempo ou grid
  if (c.status !== 'run' && !after) G0 = G0.map(g => (g[1] === 'grid' ? [g[0] * 6, ...g.slice(1)] : g[1] === 'time' ? [0, ...g.slice(1)] : g));
  const strict = race.R ? race.R.penaltyStrictness : 1;
  const tot = G0.reduce((a, g) => a + g[0] * (g[1] === 'nfa' ? 1 / strict : 1), 0);
  let r = RNG.next() * tot; const pick = G0.find(g => (r -= g[0] * (g[1] === 'nfa' ? 1 / strict : 1)) <= 0) || G0[G0.length - 1];
  const [, kind, sec, pts] = pick; const nm = wk.nameOf(c.did); const w = Engine.PEN_TXT[inv.why] || [inv.why, inv.why];
  const when = after ? byLang(' (decisão depois da corrida)', ' (post-race decision)') : '';
  inv.result = kind;
  if (kind === 'nfa') { Engine.event(race, 'flag', byLang(`Comissários: nenhuma ação contra ${nm} (${w[0]})${when}.`, `Stewards: no further action against ${nm} (${w[1]})${when}.`), c.did); return; }
  if (kind === 'warn') { (race.pens = race.pens || []).push({ did: c.did, s: 0, why: inv.why, lap: race.lap, pts: 0, kind: 'warn' }); Engine.event(race, 'flag', byLang(`Comissários: advertência para ${nm} por ${w[0]}${when}.`, `Stewards: warning for ${nm} for ${w[1]}${when}.`), c.did); return; }
  if (kind === 'time') { Engine.penalize(race, wk, c, sec, inv.why, pts); if (after) { c.T += c.pendingPen; c.pendingPen = 0; } return; }
  if (kind === 'grid') {
    (race.gridPens = race.gridPens || []).push({ did: c.did, n: sec, why: inv.why });
    (race.pens = race.pens || []).push({ did: c.did, s: 0, why: inv.why, lap: race.lap, pts, kind: 'grid', n: sec });
    if (pts) (race.pp = race.pp || []).push({ did: c.did, pts, why: inv.why });
    Engine.event(race, 'penalty', byLang(`Comissários: ${nm} perde ${sec} posições no grid da próxima corrida por ${w[0]}${when}.`, `Stewards: ${nm} gets a ${sec}-place grid drop at the next race for ${w[1]}${when}.`), c.did, { imp: true });
    return;
  }
  // drive-through ou stop-and-go: cumprir em até 3 voltas
  c.serve = { kind, until: race.lap + 3 };
  (race.pens = race.pens || []).push({ did: c.did, s: kind === 'dt' ? 20 : 30, why: inv.why, lap: race.lap, pts, kind });
  if (pts) (race.pp = race.pp || []).push({ did: c.did, pts, why: inv.why });
  const K = Engine.KIND_TXT[kind];
  Engine.event(race, 'penalty', byLang(`Comissários: ${K[0]} para ${nm} por ${w[0]}. Precisa cumprir em até 3 voltas.`, `Stewards: ${K[1]} for ${nm} for ${w[1]}. Must be served within 3 laps.`), c.did, { imp: true });
};
Engine.stewardsLap = (race, wk, L, scType) => {
  const track = wk.track;
  (race.inv || []).filter(i => !i.done && L >= i.due).forEach(i => Engine.decide(race, wk, i, false));
  race.cars.forEach(c => {
    // cumpre drive-through / stop-and-go (fora do Safety Car, que não deixa cumprir)
    if (c.serve && c.status === 'run' && !scType && (L >= c.serve.until - 1 || RNG.chance(0.5))) {
      const loss = (track.pitLoss || 20) + (c.serve.kind === 'sg' ? 10 : 0);
      c.T += loss;
      Engine.event(race, 'penalty', byLang(`${wk.nameOf(c.did)} cumpre o ${Engine.KIND_TXT[c.serve.kind][0]} (${loss.toFixed(0)} s perdidos).`, `${wk.nameOf(c.did)} serves the ${c.serve.kind === 'dt' ? 'drive-through' : 'stop-and-go'} (${loss.toFixed(0)} s lost).`), c.did);
      c.serve = null;
    }
  });
  // bandeira azul: retardatário que segura o líder
  if (!scType) {
    const run = race.cars.filter(c => c.status === 'run'); const lead = run.reduce((a, c) => (!a || c.T < a.T ? c : a), null);
    run.forEach(c => {
      if (c === lead || !lead || c.T - lead.T < (track.baseLap || 90) * 0.95) return;
      if (!RNG.chance(0.0012 * (race.R ? race.R.penaltyStrictness : 1))) return;
      c.blue = (c.blue || 0) + 1;
      if (c.blue === 1) Engine.event(race, 'flag', byLang(`Bandeira azul ignorada por ${wk.nameOf(c.did)}: o retardatário demora a abrir.`, `Blue flags ignored by ${wk.nameOf(c.did)}: the backmarker is slow to move over.`), c.did);
      else Engine.investigate(race, wk, c, 'bandeira', {});
    });
  }
};
/* bandeirada: decide o que ficou pendente e converte punições não cumpridas */
(() => {
  Hooks.around('Engine', Engine, 'finishRace', 'engine', (fr, race, wk, ...a) => {
    try {
      (race.inv || []).filter(i => !i.done).forEach(i => Engine.decide(race, wk, i, true));
      race.cars.forEach(c => { if (c.serve) { const add = c.serve.kind === 'sg' ? 30 : 20; c.pendingPen += add; c.penalty += add; Engine.event(race, 'penalty', byLang(`${wk.nameOf(c.did)} não cumpriu a punição a tempo: +${add} s no tempo final.`, `${wk.nameOf(c.did)} did not serve the penalty in time: +${add} s on the final time.`), c.did); c.serve = null; } });
    } catch (e) { /* segue */ }
    return fr(race, wk, ...a);
  });
})();
