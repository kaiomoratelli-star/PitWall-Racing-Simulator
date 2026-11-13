/* ============================================================
   PIT WALL — física de corrida: compostos C1–C5 (Pirelli 2026),
   temperatura de pneus, clima por local/data/horário, setores,
   velocidade máxima e bateria (regulamento 2026).
   ============================================================ */
'use strict';

/* propriedades dos compostos (offset = segundos por volta de 90 s em relação ao C5) */
Engine.CPROPS = {
  1: { name: 'C1', offset: 1.45, wear: 1.45, lo: 105, hi: 138, warm: 0.30 },
  2: { name: 'C2', offset: 1.05, wear: 1.85, lo: 100, hi: 132, warm: 0.36 },
  3: { name: 'C3', offset: 0.70, wear: 2.35, lo: 95, hi: 127, warm: 0.42 },
  4: { name: 'C4', offset: 0.36, wear: 3.0, lo: 90, hi: 122, warm: 0.5 },
  5: { name: 'C5', offset: 0.0, wear: 3.75, lo: 85, hi: 116, warm: 0.58 },
  I: { name: 'Inter', offset: 0, wear: 2.0, lo: 55, hi: 95, warm: 0.6 },
  W: { name: 'Chuva', offset: 0, wear: 1.6, lo: 45, hi: 85, warm: 0.65 },
};
/* escolha da Pirelli por circuito em 2026 [duro, médio, macio]; real = confirmada em fontes */
// (0.9) por pista, no Pacote de dados (REAL_EXTRA.trackInfo[id].alloc: [duro, médio, macio, 1 = confirmado]); sem pacote, nenhuma
Object.defineProperty(Engine, 'ALLOC', { get: () => Object.fromEntries(Object.entries(((typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.trackInfo) || {})).filter(([, v]) => v.alloc != null).map(([id, v]) => [id, v.alloc])), configurable: true });
Engine.alloc = (track) => {
  if (track.alloc) return track.alloc;
  const a = trackInfo(track.id).alloc;
  if (a) return a.slice(0, 3);
  const s = track.tyreStress || 1;
  return s > 1.2 ? [1, 2, 3] : s < 0.85 ? [3, 4, 5] : [2, 3, 4];
};
Engine.allocReal = (track) => { const a = trackInfo(track.id).alloc; return !!(a && a[3]); };
Engine.cno = (track, code) => code === 'I' || code === 'W' ? code : Engine.alloc(track)[{ H: 0, M: 1, S: 2 }[code] ?? 1];
Engine.tprops = (track, code) => Engine.CPROPS[Engine.cno(track, code)] || Engine.CPROPS[3];
Engine.tyreLabel = (track, code) => code === 'I' || code === 'W' ? TYRES[code].name : `${TYRES[code].name} (${Engine.tprops(track, code).name})`;

/* ---------- clima: latitude, mês, horário ---------- */
// (0.9) por pista, no Pacote de dados (REAL_EXTRA.trackInfo[id].light / .heat)
Object.defineProperty(Engine, 'NIGHT', { get: () => Object.fromEntries(Object.entries(((typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.trackInfo) || {})).filter(([, v]) => v.light != null).map(([id, v]) => [id, v.light])), configurable: true });
Object.defineProperty(Engine, 'DESERT', { get: () => Object.fromEntries(Object.entries(((typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.trackInfo) || {})).filter(([, v]) => v.heat != null).map(([id, v]) => [id, v.heat])), configurable: true });
Engine.climate = (track, month) => {
  const lat = track.lat ?? 40;
  const south = lat < 0;
  const a = Math.abs(lat);
  const peak = south ? 1 : 7;
  const base = 28 - a * 0.35 + (trackInfo(track.id).heat || 0);
  const amp = 2 + a * 0.18;
  const air = base + amp * Math.cos(2 * Math.PI * ((month || 7) - peak) / 12);
  const time = trackInfo(track.id).light || 'day';
  const tropical = a < 15;
  const humidity = clamp((tropical ? 75 : 50) + (track.rain || 0.15) * 60 - (trackInfo(track.id).heat || 0) * 3, 15, 95);
  return { air: +(air - (time === 'night' ? 4 : time === 'dusk' ? 2 : 0)).toFixed(1), time, humidity: Math.round(humidity) };
};
Engine.trackTempFrom = (air, time, wet) => +(air + (time === 'night' ? 3 : time === 'dusk' ? 7 : 14) - wet * 12).toFixed(1);
/* temperaturas por volta, acompanhando a chuva */
Engine.addTemps = (weather, track, month, laps) => {
  const cl = Engine.climate(track, month);
  const air0 = cl.air + RNG.normal(0, 2.2);
  weather.air = []; weather.trackT = [];
  for (let l = 0; l <= laps + 1; l++) {
    const w = weather.wet[l] || 0;
    const drift = (cl.time === 'day' ? -1.5 : -2.5) * l / Math.max(1, laps);
    const air = +(air0 + drift - w * 4).toFixed(1);
    weather.air[l] = air;
    weather.trackT[l] = Engine.trackTempFrom(air, cl.time, w);
  }
  weather.humidity = clamp(cl.humidity + (weather.rainyWeekend ? 15 : 0) + RNG.int(-8, 8), 10, 100);
  weather.wind = Math.round(clamp(RNG.normal(12, 7), 1, 45));
  weather.time = cl.time;
  weather.qualiAir = +(air0 + RNG.normal(0, 1)).toFixed(1);
  weather.qualiTrack = Engine.trackTempFrom(weather.qualiAir, cl.time, weather.quali.wet || 0);
  return weather;
};

/* ---------- temperatura de pneu ---------- */
Engine.tyreTempPenalty = (props, temp) => {
  if (temp == null) return 0;
  if (temp < props.lo) return (props.lo - temp) * 0.018;
  if (temp > props.hi) return (temp - props.hi) * 0.012;
  return 0;
};
Engine.tyreTempStep = (car, track, props, trackT, mode, w, sc) => {
  const stress = track.tyreStress || 1;
  const dryOnWet = 'SMH'.includes(car.tyre.c) && w > 0.2 ? -28 * w : 0;
  const wetOnDry = (car.tyre.c === 'I' || car.tyre.c === 'W') && w < 0.18 ? 22 : 0;
  const eq = 62 + trackT * 1.0 + stress * 14 + (mode === 'push' ? 9 : mode === 'save' ? -7 : 0) + dryOnWet + wetOnDry + (sc ? -18 : 0) + (props.lo - 95) * 0.6;
  const k = props.warm;
  car.tyre.temp = +(car.tyre.temp + (eq - car.tyre.temp) * k).toFixed(1);
};

/* ---------- setores, velocidade, bateria ---------- */
Engine.sectorSplit = (track, t, sd) => {
  const f = track.secFrac || [0.32, 0.36, 0.32];
  const a = t * f[0] + RNG.normal(0, sd * 0.3), b = t * f[1] + RNG.normal(0, sd * 0.3);
  return [+a.toFixed(3), +b.toFixed(3), +(t - a - b).toFixed(3)];
};
Engine.topSpeed = (db, team, track, setupQ, boost, w) => {
  const eng = Engine.engineOf(db, team);
  const base = 296 + (eng.power + (team.car.engineBonus || 0) - 88) * 1.4 - (track.weights.aero - 0.33) * 60 + (track.weights.engine - 0.33) * 40;
  return Math.round(base + (boost ? 11 : 0) - w * 18 + RNG.normal(0, 1.6) + (setupQ - 0.7) * 6);
};
/* bateria: 2026 com metade da potência vinda do elétrico */
/* variação da bateria numa volta (% do total) por modo de energia */
Engine.ersDelta = (drv, carEnergy, mode, share = 50) => {
  const en = (drv.energy ?? 75) / 100 * 0.6 + carEnergy / 100 * 0.4;
  const m = mode === 'push' ? 'overtake' : mode === 'save' ? 'harvest' : mode === 'normal' ? 'balanced' : mode;
  return (m === 'overtake' ? -9 + en * 3 : m === 'harvest' ? 7 + en * 2 : -0.5 + en * 1.5) * (share / 50);
};
Engine.socStep = (car, drv, mode, boost, sc, share = 50, carEnergy = 80) => {
  let d = Engine.ersDelta(drv, carEnergy, mode, share);
  if (boost) d -= 4;
  if (sc) d = 9;
  car.soc = clamp((car.soc ?? 100) + d, 0, 100);
};
/* decisão dos estrategistas (equipes do jogo e "automático" do jogador): pneus e energia separados */
Engine.aiModes = (race, car, gapAhead, gapBehind) => {
  const soc = car.soc ?? 100;
  if (race.sc) return { tyre: 'normal', ers: 'harvest' };
  const lapsLeft = race.laps - race.lap;
  const wear = car.tyre.wear;
  const lastStint = !car.plan || car.plan.stops <= car.pits;
  let ers = 'balanced';
  if (soc < 18) ers = 'harvest';
  else if ((gapAhead < 1.0 && soc > 35) || (gapBehind < 0.7 && soc > 28)) ers = 'overtake';
  else if (soc < 40 && gapAhead > 2 && gapBehind > 2) ers = 'harvest';
  let tyre = 'normal';
  const lifeLeft = (100 - wear) / Math.max(0.5, car.wearPerLap || 1.8);
  if (lastStint && lifeLeft < lapsLeft * 1.05) tyre = 'save';                // não chega ao fim: poupar
  else if (wear > 74 && lastStint) tyre = 'save';
  else if (gapAhead < 1.3 && wear < 58 && lifeLeft > lapsLeft * 1.25) tyre = 'push';
  else if (lapsLeft <= 5 && wear < 80) tyre = 'push';
  return { tyre, ers };
};
/* estimativa de estratégia (usada na tela de pré-corrida) */
Engine.strategyForecast = (track, laps, drv, team) => {
  const life = (code) => 70 / Math.max(0.5, Engine.wearRate(code, track, drv, team, 'normal', 0));
  const opts = [];
  const pit = track.pitLoss + 2.4;
  const deg = (code, n) => { let s = 0; for (let i = 0; i < n; i++) s += Engine.tyreDeg(i * Engine.wearRate(code, track, drv, team, 'normal', 0)) + Engine.tprops(track, code).offset * track.baseLap / 90; return s; };
  [['M', 'H'], ['S', 'H'], ['H', 'M'], ['S', 'M']].forEach(([a, b]) => { const n1 = Math.round(laps * 0.42); const n2 = laps - n1; if (n1 <= life(a) * 1.15 && n2 <= life(b) * 1.15) opts.push({ plan: [a, b], stops: 1, cost: deg(a, n1) + deg(b, n2) + pit }); });
  [['S', 'M', 'M'], ['M', 'H', 'M'], ['S', 'M', 'S'], ['M', 'M', 'H']].forEach(p => { const n = Math.round(laps / 3); opts.push({ plan: p, stops: 2, cost: p.reduce((s, c) => s + deg(c, n), 0) + pit * 2 }); });
  opts.sort((x, y) => x.cost - y.cost);
  return opts.slice(0, 3).map((o, i) => ({ ...o, delta: +(o.cost - opts[0].cost).toFixed(1) }));
};
