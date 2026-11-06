/* ============================================================
   PIT WALL — treinos livres com relógio (60 min por sessão)
   • Sessões: 1, 2, 3 ou "formato vida real" (3 normais, 1 em fim de semana de Sprint).
   • Programas: acerto, simulação de classificação (pouco combustível, ataque)
     e simulação de corrida (tanque cheio, stint longo).
   • Garagem: mexer no carro custa minutos de sessão (asa dianteira é rápida,
     altura do carro é demorada). O relógio não para.
   • Pneus: alocação oficial do fim de semana (13 jogos; 12 com Sprint).
   • Engenheiro: pode assumir uma sessão ou todas, com uma diretriz
     (equilibrado, foco em classificação ou em corrida). O resultado é calculado
     na hora, com o mesmo motor, sem mostrar volta a volta.
   Tudo é determinístico: eventos são processados em ordem de tempo.
   ============================================================ */
'use strict';

const Practice = {};
Practice.DUR = 3600;
Practice.PROGRAMS = {
  setup: { name: 'Acerto', fuel: 35, push: 0.6, laps: 4, desc: 'Voltas de avaliação para o piloto sentir o carro e dar feedback.' },
  quali: { name: 'Simulação de classificação', fuel: 8, push: 1, laps: 2, desc: 'Pouco combustível e pneu macio novo: volta rápida no limite.' },
  race: { name: 'Simulação de corrida', fuel: 80, push: 0.45, laps: 10, desc: 'Tanque cheio e stint longo: desgaste de pneus e consistência.' },
};
Practice.ALLOC = { normal: { S: 8, M: 3, H: 2 }, sprint: { S: 6, M: 4, H: 2 } };

Practice.sessionsFor = (G, track) => {
  const f = (G.options && G.options.practiceFormat) || 'real';
  if (f === 'real') return track.sprint ? 1 : 3;
  return clamp(Number(f) || 3, 1, 3);
};

/* ---------- criação no início do fim de semana ---------- */
Practice.init = (G, wk, track, team, lineup) => {
  const n = Practice.sessionsFor(G, track);
  wk.fp = { cur: 0, sessions: Array.from({ length: n }, (_, i) => ({ name: n === 1 ? 'TL1' : `TL${i + 1}`, t: 0, dur: Practice.DUR, done: false, rubber0: i * 0.18, best: {}, laps: {}, ai: null, log: [] })) };
  wk.windDir = +(RNG.range(-1, 1)).toFixed(2);
  const alloc = Practice.ALLOC[track.sprint ? 'sprint' : 'normal'];
  const eng = team ? (team.staff.engineering ?? 78) : 78;
  lineup.forEach(d => {
    const opt = wk.optimum[team.id];
    const r = localRng(`win:${G.seed}:${G.season.year}:${track.id}:${d.id}`);
    const tyres = [];
    Object.entries(alloc).forEach(([c, k]) => { for (let i = 0; i < k; i++) tyres.push({ id: `${c}${i + 1}`, c, laps: 0 }); });
    const base = { fwing: 50, rwing: 50, susp: 50, ride: 50, brake: 54 };
    wk.setups[d.id] = {
      ...base, pending: null, workUntil: 0, state: 'garage', run: null, runs: [], tyres,
      st: Setup.newDriverState(G, d, track), win: Setup.newWindow(opt, eng, r),
      acclim: 0, sat: null, tested: null, focus: 'balanced', auto: false, laps: 0,
      plan: { program: 'setup', laps: 4, tyre: 'M' },
      q: null, qQ: null, qR: null, conf: null,
    };
    Setup.learn(wk.setups[d.id].win, null, (est) => Setup.bestFor(est, wk, 'balanced'));
    d.carFam = d.carFam ?? Math.round(clamp(62 + (d.experience ?? 50) * 0.25, 40, 92));
  });
};
Practice.session = (wk) => wk.fp && wk.fp.sessions[wk.fp.cur];
Practice.rubber = (wk, s) => clamp(s.rubber0 + s.t / s.dur * 0.22, 0, 1);
Practice.trackT = (wk, s) => {
  const base = wk.weather.qualiTrack ?? 36;
  // TL1 e TL3 mais cedo (pista mais fria), TL2 no horário da corrida
  const n = wk.fp.sessions.length, i = wk.fp.sessions.indexOf(s);
  const off = n === 3 ? [-3, 1.5, -2][i] : 0;
  return +(base + off + Math.sin(s.t / s.dur * Math.PI) * 1.5).toFixed(1);
};

/* ---------- carros da IA: programa de cada sessão (para a tabela de tempos) ---------- */
Practice.aiPlan = (G, wk, s) => {
  const ctx = Career.ctx(G);
  const plan = [];
  Career.grid(G).forEach(({ d, t }) => {
    if (!Career.isObs(G) && t.id === G.player.teamId) return;
    const q = (wk.aiSetups && wk.aiSetups[d.id]) || Career.aiSetupQ(t, d);
    const runs = RNG.int(3, 5);
    let at = RNG.range(120, 600);
    for (let i = 0; i < runs && at < s.dur - 200; i++) {
      const prog = i === runs - 1 && wk.fp.cur === wk.fp.sessions.length - 1 ? 'quali' : RNG.weighted(['setup', 'quali', 'race'], p => p === 'race' ? (wk.fp.cur === 1 ? 3 : 1) : p === 'quali' ? 1.2 : 2);
      const P = Practice.PROGRAMS[prog];
      const comp = prog === 'quali' ? 'S' : prog === 'race' ? RNG.pick(['M', 'H']) : RNG.pick(['M', 'S', 'H']);
      const laps = prog === 'race' ? RNG.int(7, 13) : prog === 'quali' ? 2 : RNG.int(3, 5);
      const pc = Engine.paceComponents({ db: G.db, track: ctx.track, team: t, drv: ctx.effOf(d.id), setupQ: q, compound: comp, wear: 4, fuel: P.fuel, w: (wk.weather.wet[1] || 0) * 0.4, mode: P.push > 0.8 ? 'push' : 'normal', quali: prog === 'quali', carPerf: Engine.carPerf(G.db, t, ctx.track) + (wk.form[t.id] || 0) + (wk.dform[d.id] || 0) });
      let tt = at + pc.total * 1.18; // volta de saída
      for (let l = 0; l < laps; l++) {
        const rub = clamp(s.rubber0 + tt / s.dur * 0.22, 0, 1);
        const lap = +(pc.total - rub * 0.6 - l * (prog === 'race' ? 0.03 : 0) + (prog === 'quali' && l === 1 ? 0.2 : 0) + Math.abs(RNG.normal(0, 0.28)) + (RNG.chance(0.08) ? RNG.range(0.5, 2.5) : 0)).toFixed(3);
        tt += lap;
        plan.push({ t: tt, did: d.id, tid: t.id, lap, c: comp });
        if (prog === 'quali') tt += pc.total * 1.25; // volta de desaceleração entre tentativas
      }
      at = tt + pc.total * 1.2 + RNG.range(240, 700);
    }
  });
  plan.sort((a, b) => a.t - b.t);
  return plan;
};

/* ---------- jogador: mandar para a pista ---------- */
Practice.garageMinutes = (G, s, next) => {
  const team = Career.team(G);
  const mech = team.staffList ? Staff.r(team, 'chiefMechanic', team.pitCrew) : team.pitCrew;
  const times = Setup.PARAMS.filter(([k]) => Math.abs((next[k] ?? 50) - (s[k] ?? 50)) >= 1).map(p => p[4]).sort((a, b) => b - a);
  if (!times.length) return 0;
  const m = times[0] + times.slice(1).reduce((a, b) => a + b * 0.35, 0);
  return +(m * (1.25 - mech / 200)).toFixed(1);
};
Practice.applySetup = (G, did, next) => {
  const wk = G.weekend, s = wk.setups[did], ses = Practice.session(wk);
  if (!s || s.state !== 'garage') return { ok: false, msg: 'O carro precisa estar na garagem.' };
  const min = Practice.garageMinutes(G, s, next);
  if (!min) return { ok: true, min: 0 };
  s.pending = Setup.KEYS.reduce((o, k) => ((o[k] = Math.round(clamp(next[k], 0, 100))), o), {});
  s.workUntil = Math.max(s.workUntil, ses.t) + min * 60;
  return { ok: true, min };
};
Practice.pickTyre = (s, c) => {
  const pool = s.tyres.filter(x => x.c === c && !x.returned);
  if (!pool.length) return null;
  // reaproveita um jogo usado em acerto e corrida; classificação pede jogo novo
  return pool.sort((a, b) => (c === 'S' ? a.laps - b.laps : b.laps - a.laps))[0];
};
Practice.send = (G, did, plan) => {
  const wk = G.weekend, s = wk.setups[did], ses = Practice.session(wk);
  if (!ses || ses.done) return { ok: false, msg: 'A sessão terminou.' };
  if (s.state !== 'garage') return { ok: false, msg: 'O carro já está na pista.' };
  const P = Practice.PROGRAMS[plan.program];
  const tyre = Practice.pickTyre(s, plan.tyre || (plan.program === 'quali' ? 'S' : 'M'));
  if (!tyre) return { ok: false, msg: 'Não há mais jogos desse composto.' };
  if (s.pending && ses.t < s.workUntil) return { ok: false, msg: `Os mecânicos ainda trabalham no carro (${Math.ceil((s.workUntil - ses.t) / 60)} min).` };
  if (s.pending) { Object.assign(s, s.pending); s.pending = null; }
  const laps = clamp(Math.round(plan.laps || P.laps), 1, 25);
  s.plan = { program: plan.program, laps, tyre: tyre.c };
  s.state = 'track';
  s.run = { program: plan.program, setup: Setup.KEYS.reduce((o, k) => ((o[k] = s[k]), o), {}), tyre: tyre.id, c: tyre.c, wear0: tyre.laps, target: laps, lap: 0, kind: 'out', fuel: P.fuel, times: [], start: ses.t, lapEnd: ses.t + Practice.lapTime(G, did, 'out'), sectors: [] };
  return { ok: true };
};
Practice.box = (G, did) => {
  const s = G.weekend.setups[did];
  if (s.state !== 'track' || !s.run) return { ok: false };
  s.run.target = Math.min(s.run.target, s.run.times.length); // termina a volta atual e entra
  s.run.boxCall = true;
  return { ok: true };
};

/* contexto físico da volta (para o tempo e para a sensação do piloto) */
Practice.ctxOf = (G, did) => {
  const wk = G.weekend, s = wk.setups[did], ses = Practice.session(wk), run = s.run;
  const P = Practice.PROGRAMS[run ? run.program : 'setup'];
  const tyre = run ? s.tyres.find(x => x.id === run.tyre) : null;
  return { fuel: clamp((run ? run.fuel : 30) / 100, 0, 1), rubber: Practice.rubber(wk, ses), trackT: Practice.trackT(wk, ses), wind: wk.weather.wind, windDir: wk.windDir, push: P.push, wear: clamp(((tyre ? tyre.laps : 0)) / 28, 0, 1) };
};
Practice.lapTime = (G, did, kind) => {
  const wk = G.weekend, s = wk.setups[did], c = Career.ctx(G), team = Career.team(G);
  const run = s.run;
  const ctx = Practice.ctxOf(G, did);
  const q = Setup.quality(s, wk.optimum[team.id], ctx);
  const d = Career.driver(G, did);
  const conf = Setup.confidence(s.sat ?? 55, s.acclim, d.carFam ?? 70);
  const drv = Setup.applyConfidence(c.effOf(did), conf);
  const tyre = run ? s.tyres.find(x => x.id === run.tyre) : null;
  const pc = Engine.paceComponents({ db: G.db, track: c.track, team, drv, setupQ: q, compound: run ? run.c : 'M', wear: tyre ? tyre.laps * Engine.wearRate(run.c, c.track, d, team, 'normal', 0) : 3, fuel: run ? run.fuel : 30, w: (wk.weather.wet[1] || 0) * 0.4, mode: ctx.push > 0.8 ? 'push' : 'normal', quali: ctx.push > 0.8, carPerf: Engine.carPerf(G.db, team, c.track) + (wk.form[team.id] || 0) + (wk.dform[did] || 0), trackT: ctx.trackT, evo: ctx.rubber * 50 });
  let t = pc.total - ctx.rubber * 0.6 + Math.abs(RNG.normal(0, 0.12 + (100 - (drv.consistency ?? 80)) / 400));
  if (RNG.chance(0.04 + (100 - conf) / 1500)) t += RNG.range(0.6, 2.4); // erro, tráfego, bandeira amarela
  if (kind === 'out') t *= 1.17; else if (kind === 'in') t *= 1.22; else if (kind === 'cool') t *= 1.25;
  return +t.toFixed(3);
};

/* ---------- avanço do relógio ---------- */
Practice.advance = (G, secs, auto) => {
  const wk = G.weekend, ses = Practice.session(wk);
  if (!ses || ses.done) return;
  if (!ses.ai) { ses.ai = Practice.aiPlan(G, wk, ses); ses.aiIdx = 0; }
  const end = Math.min(ses.dur, ses.t + secs);
  const ids = Object.keys(wk.setups);
  let guard = 0;
  const flush = () => ids.forEach(did => { const s = wk.setups[did]; if (s.pending && s.workUntil <= ses.t) { Object.assign(s, s.pending); s.pending = null; } });
  while (guard++ < 4000) {
    flush();
    // próximo evento: fim de volta de algum carro do jogador, fim do trabalho na garagem ou volta da IA
    let next = end, who = null, kind = null;
    ids.forEach(did => {
      const s = wk.setups[did];
      if (s.state === 'track' && s.run && s.run.lapEnd < next) { next = s.run.lapEnd; who = did; kind = 'lap'; }
      if (s.state === 'garage' && s.pending && s.workUntil > ses.t && s.workUntil < next) { next = s.workUntil; who = did; kind = 'work'; }
      if (auto && s.state === 'garage' && s.auto && !s.autoWait && !(s.pending && s.workUntil > ses.t) && next > ses.t) { next = ses.t; who = did; kind = 'auto'; }
    });
    while (ses.aiIdx < ses.ai.length && ses.ai[ses.aiIdx].t <= Math.min(next, end)) Practice.aiLap(wk, ses, ses.ai[ses.aiIdx++]);
    if (!who || next > end) break;
    ses.t = Math.max(ses.t, next);
    if (kind === 'work') { Object.assign(wk.setups[who], wk.setups[who].pending); wk.setups[who].pending = null; Practice.log(ses, tr(`${Career.driver(G, who).name}: mecânicos terminaram as mudanças no carro.`, `${Career.driver(G, who).name}: mechanics have finished the changes on the car.`), who); }
    else if (kind === 'lap') Practice.lapDone(G, who);
    else if (kind === 'auto') Practice.autopilot(G, who);
  }
  ses.t = end;
  // fim da sessão: bandeira quadriculada
  if (ses.t >= ses.dur) Practice.endSession(G);
};
Practice.aiLap = (wk, ses, l) => {
  ses.laps[l.did] = (ses.laps[l.did] || 0) + 1;
  if (!ses.best[l.did] || l.lap < ses.best[l.did].t) ses.best[l.did] = { t: l.lap, c: l.c, tid: l.tid };
};
Practice.log = (ses, txt, did) => { ses.log.unshift({ t: Math.round(ses.t), txt, did }); if (ses.log.length > 120) ses.log.length = 120; };

Practice.lapDone = (G, did) => {
  const wk = G.weekend, s = wk.setups[did], ses = Practice.session(wk), run = s.run;
  const d = Career.driver(G, did);
  const tyre = s.tyres.find(x => x.id === run.tyre);
  const lapT = run.lapEnd - (run.lastStart ?? run.start);
  run.lastStart = run.lapEnd;
  tyre.laps += 1; s.laps += 1;
  run.fuel = Math.max(1, run.fuel - 1.7);
  ses.laps[did] = (ses.laps[did] || 0) + 1;
  if (run.kind === 'push') {
    run.times.push(+lapT.toFixed(3));
    s.acclim = Math.round(100 * (1 - Math.exp(-(s.acclimLaps = (s.acclimLaps || 0) + 1) / 22)));
    d.carFam = clamp((d.carFam ?? 70) + 0.6, 0, 100);
    if (!ses.best[did] || lapT < ses.best[did].t) ses.best[did] = { t: +lapT.toFixed(3), c: run.c, tid: d.team };
  }
  // próxima volta
  const pushDone = run.times.length;
  if (run.kind === 'in' || ses.t >= ses.dur) return Practice.runEnd(G, did);
  if (pushDone >= run.target || run.boxCall) run.kind = 'in';
  else if (run.program === 'quali' && run.kind === 'push') run.kind = 'cool';
  else run.kind = 'push';
  run.lapEnd = ses.t + Practice.lapTime(G, did, run.kind);
};
Practice.runEnd = (G, did) => {
  const wk = G.weekend, s = wk.setups[did], ses = Practice.session(wk), run = s.run;
  const team = Career.team(G), d = Career.driver(G, did);
  s.state = 'garage'; s.run = null; s.autoWait = false;
  const timed = run.times.length;
  const out = { session: ses.name, program: run.program, setup: run.setup, c: run.c, times: run.times, best: timed ? Math.min(...run.times) : null, avg: timed ? +(run.times.reduce((a, b) => a + b, 0) / timed).toFixed(3) : null, t: Math.round(ses.t) };
  if (timed >= 2) {
    // feedback precisa de pelo menos 2 voltas lançadas; o engenheiro de corrida acelera a leitura
    const engR = team.staffList ? Staff.r(team, d.seat === 2 ? 'raceEng2' : 'raceEng1', team.staff.engineering) : team.staff.engineering;
    const skill = Setup.skill(d, engR);
    const ctx = { ...Practice.ctxOf(G, did), fuel: clamp((Practice.PROGRAMS[run.program].fuel - timed * 0.8) / 100, 0, 1) };
    const r = localRng(`fb:${G.seed}:${G.season.round}:${did}:${s.runs.length}`);
    const fb = Setup.feedback(s.st, run.setup, wk.optimum[team.id], ctx, timed, skill, r);
    out.fb = fb; out.ctx = ctx;
    s.sat = fb.satisfaction; s.tested = { ...run.setup };
    const perceived = {}; fb.items.forEach(i => (perceived[i.cat] = i.val));
    Setup.learn(s.win, { setup: run.setup, perceived, ctx }, (est) => Setup.bestFor(est, wk, s.focus), timed, skill, team.staff.engineering);
    Practice.log(ses, tr(`${d.name} de volta à garagem: ${fb.summary[0] || 'carro equilibrado, sem queixas.'}`, `${d.name} back in the garage: ${fb.summary[0] || 'balanced car, no complaints.'}`), did);
  } else {
    Practice.log(ses, tr(`${d.name} voltou à garagem sem voltas suficientes para dar feedback.`, `${d.name} came back without enough laps to give feedback.`), did);
  }
  s.runs.push(out);
};
Practice.endSession = (G) => {
  const wk = G.weekend, ses = Practice.session(wk);
  Object.keys(wk.setups).forEach(did => { const s = wk.setups[did]; if (s.state === 'track' && s.run) Practice.runEnd(G, did); if (s.pending) { Object.assign(s, s.pending); s.pending = null; } });
  while (ses.aiIdx < ses.ai.length) Practice.aiLap(wk, ses, ses.ai[ses.aiIdx++]);
  ses.done = true; ses.t = ses.dur;
  ses.ai = []; ses.aiIdx = 0; // a tabela de tempos já está em ses.best: o plano da IA não precisa ir para o save
};
Practice.nextSession = (G) => {
  const wk = G.weekend;
  if (wk.fp.cur < wk.fp.sessions.length - 1) { wk.fp.cur++; Object.values(wk.setups).forEach(s => { s.workUntil = 0; }); return true; }
  return false;
};

/* ---------- engenheiro: piloto automático com diretriz ---------- */
Practice.autopilot = (G, did) => {
  const wk = G.weekend, s = wk.setups[did], ses = Practice.session(wk), team = Career.team(G);
  const left = ses.dur - ses.t;
  if (left < 300) { s.autoWait = true; return; }
  // 1) aplica a recomendação do engenheiro (com o erro natural de aplicação)
  const rec = Setup.recommend(s.win);
  const engErr = (100 - team.staff.engineering) / 100 * 4;
  const next = {}; Setup.KEYS.forEach(k => (next[k] = Math.round(clamp(rec[k] + RNG.normal(0, engErr), 0, 100))));
  if (Setup.KEYS.some(k => Math.abs(next[k] - s[k]) >= 3)) {
    Practice.applySetup(G, did, next);
    if (s.pending) { s.autoWait = false; return; }
  }
  if (s.pending && ses.t < s.workUntil) return;
  // 2) programa pela diretriz e pelo momento da sessão
  const frac = ses.t / ses.dur;
  const last = wk.fp.cur === wk.fp.sessions.length - 1;
  let prog = 'setup';
  if (s.win.k > 0.55) prog = s.focus === 'quali' ? 'quali' : s.focus === 'race' ? 'race' : (frac > 0.6 && last ? 'quali' : frac > 0.45 ? 'race' : 'setup');
  const laps = prog === 'race' ? (left > 1500 ? 10 : 6) : prog === 'quali' ? 2 : 4;
  const tyre = prog === 'quali' ? 'S' : prog === 'race' ? (Practice.pickTyre(s, 'H') ? 'H' : 'M') : 'M';
  const r = Practice.send(G, did, { program: prog, laps, tyre: Practice.pickTyre(s, tyre) ? tyre : 'M' });
  if (!r.ok) s.autoWait = true;
};
/* simula a sessão atual inteira na hora (ou todas as restantes) */
Practice.simulate = (G, focus, all) => {
  const wk = G.weekend;
  do {
    const ses = Practice.session(wk);
    if (!ses.done) {
      Object.values(wk.setups).forEach(s => { s.auto = true; s.focus = focus || s.focus || 'balanced'; s.autoWait = false; Setup.learn(s.win, null, (est) => Setup.bestFor(est, wk, s.focus)); });
      Practice.advance(G, ses.dur - ses.t + 1, true);
      Object.values(wk.setups).forEach(s => { s.auto = false; });
    }
    if (!all) break;
  } while (Practice.nextSession(G));
};

/* ---------- fim dos treinos: acerto final, confiança para classificação e corrida ---------- */
Practice.finish = (G) => {
  const wk = G.weekend, team = Career.team(G);
  const opt = wk.optimum[team.id];
  Object.entries(wk.setups).forEach(([did, s]) => {
    const d = Career.driver(G, did);
    // o acerto que vale é o que está no carro; se ele não foi testado, o melhor testado ou a recomendação do engenheiro
    let final = Setup.KEYS.reduce((o, k) => ((o[k] = s[k]), o), {});
    const untested = !s.tested || Setup.KEYS.some(k => Math.abs((s.tested[k] ?? -99) - final[k]) > 2);
    const rec = Setup.recommend(s.win);
    const score = (x) => Setup.quality(x, opt, Setup.CTX_QUALI(wk)) * Setup.focusMix(s.focus) + Setup.quality(x, opt, Setup.CTX_RACE(wk)) * (1 - Setup.focusMix(s.focus));
    // o piloto aceita a recomendação sempre que ela for melhor para ele (aumenta a confiança)
    if (s.win.k > 0.3 && score(rec) > score(final) + 0.01) { final = rec; s.acceptedRec = true; }
    Object.assign(s, final);
    s.qQ = +Setup.quality(final, opt, Setup.CTX_QUALI(wk)).toFixed(3);
    s.qR = +Setup.quality(final, opt, Setup.CTX_RACE(wk)).toFixed(3);
    s.q = s.qR;
    const knownSat = s.sat ?? Math.round(((s.qQ + s.qR) / 2) * 100);
    const sat = untested && !s.acceptedRec ? Math.round(knownSat * 0.8) : Math.round((knownSat + ((s.qQ + s.qR) / 2) * 100) / 2);
    s.conf = Setup.confidence(sat, s.acclim, d.carFam ?? 70);
    s.satFinal = sat;
  });
};
/* IA: confiança estimada pelo trabalho do engenheiro e pela pista */
Practice.aiConfidence = (G, wk) => {
  wk.conf = wk.conf || {};
  const n = wk.fp ? wk.fp.sessions.length : 3;
  Career.grid(G).forEach(({ d, t }) => {
    if (!Career.isObs(G) && t.id === G.player.teamId) { wk.conf[d.id] = wk.setups[d.id] ? wk.setups[d.id].conf : 70; return; }
    const q = (wk.aiSetups && wk.aiSetups[d.id]) || 0.8;
    const acc = Math.round(100 * (1 - Math.exp(-(n * 22) / 22)));
    wk.conf[d.id] = Setup.confidence(q * 100, acc, d.carFam ?? 75);
  });
};
