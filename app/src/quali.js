/* ============================================================
   PIT WALL — classificação ao vivo (Q1/Q2/Q3 e SQ1/SQ2/SQ3)
   • Cronômetro real: 18/15/12 min (classificação) e 12/10/8 min (Sprint).
   • Cada carro vive um ciclo: garagem → volta de saída → volta lançada
     (3 setores) → resfriamento ou nova volta → volta de entrada → garagem.
   • Pista evolui ao longo da sessão; tráfego, erros, limites de pista e
     bandeira vermelha acontecem por probabilidade.
   • Volta que começa antes da bandeira quadriculada vale; volta de saída não.
   • Parque fechado: na classificação só a asa dianteira e o balanço de freio
     podem mudar (se o regulamento tiver parque fechado).
   • Regras de pneus da Sprint: SQ1 e SQ2 com médios novos, SQ3 com macios novos.
   Determinístico: eventos processados em ordem de tempo.
   ============================================================ */
'use strict';

const Quali = {};
Quali.DUR = { Q: [1080, 900, 720], SQ: [720, 600, 480] };
Quali.RISK = { safe: { mean: 0.12, err: 0.5, name: 'Segura' }, normal: { mean: 0, err: 1, name: 'Normal' }, push: { mean: -0.15, err: 2.1, name: 'No limite' } };
Quali.PARC_FERME_KEYS = ['fwing', 'brake'];

Quali.init = (G, kind) => {
  const wk = G.weekend;
  const entries = Career.entries(G, 'quali');
  const n = entries.length;
  const single = G.db.rules.regs && G.db.rules.regs.qualiFormat === 'single';
  const out1 = n > 12 ? Math.ceil((n - 10) / 2) : 0, out2 = n > 12 ? n - 10 - out1 : 0;
  const names = kind === 'SQ' ? ['SQ1', 'SQ2', 'SQ3'] : ['Q1', 'Q2', 'Q3'];
  const durs = Quali.DUR[kind];
  const segs = single || n <= 12 ? [{ name: kind === 'SQ' ? 'SQ' : 'Q', dur: durs[0] + durs[1], keep: 0 }] : [{ name: names[0], dur: durs[0], keep: n - out1 }, { name: names[1], dur: durs[1], keep: n - out1 - out2 }, { name: names[2], dur: durs[2], keep: 0 }];
  const ql = { kind, seg: 0, segs: segs.map(s => ({ ...s, t: 0, done: false, started: false })), alive: entries.map(e => e.did), res: {}, cars: {}, log: [], best: { s: [Infinity, Infinity, Infinity], lap: Infinity }, wet: wk.weather.quali.wet || 0, done: false, rubber: 0.55 };
  entries.forEach(e => {
    ql.res[e.did] = { did: e.did, tid: e.tid, times: {}, best: Infinity, elim: null, inc: [], laps: 0 };
    ql.cars[e.did] = { did: e.did, tid: e.tid, ai: !e.isPlayer, state: 'garage', kind: null, risk: e.risk || 'normal', pushLeft: 0, lapStart: 0, next: Infinity, secs: null, secIdx: 0, sb: [Infinity, Infinity, Infinity], tyre: null, auto: !e.isPlayer, plan: [], cur: null };
  });
  wk.ql = ql;
  Quali.startSeg(G);
  return ql;
};
Quali.seg = (ql) => ql.segs[ql.seg];
Quali.log = (ql, txt, did, kind = 'info') => { const s = Quali.seg(ql); ql.log.unshift({ seg: s.name, t: Math.round(s.t), txt, did, kind }); if (ql.log.length > 260) ql.log.length = 260; };
Quali.nameOf = (G, did) => { const d = Career.driver(G, did); return d ? shortNameOf(d) : did; };
function shortNameOf(d) { return d.name.replace(/\s+(Jr\.?|Sr\.?)$/i, '').split(' ').slice(-1)[0]; }

/* ---------- planos da IA para o segmento ---------- */
Quali.startSeg = (G) => {
  const wk = G.weekend, ql = wk.ql, s = Quali.seg(ql);
  s.started = true;
  const ctx = Career.ctx(G);
  const r = localRng(`qplan:${G.seed}:${G.season.round}:${ql.kind}:${ql.seg}`);
  ql.alive.forEach(did => {
    const c = ql.cars[did];
    c.state = 'garage'; c.plan = []; c.pushLeft = 0; c.secs = null;
    if (!c.auto) return;
    const lap = Career.track(G, wk.trackId).baseLap;
    const outL = lap * 1.25;
    const last = ql.seg === ql.segs.length - 1;
    const early = 45 + r() * s.dur * 0.3;
    const lateLeave = s.dur - outL - 25 - r() * 40;
    // dois ataques: um cedo para garantir tempo, outro no fim com a pista melhor
    c.plan.push({ at: early, push: last ? 1 : (r() < 0.35 ? 2 : 1) });
    c.plan.push({ at: Math.max(early + lap * 3.2, lateLeave), push: 1, late: true });
    void ctx;
  });
};

/* ---------- pneus ---------- */
Quali.setsFor = (G, did) => (G.weekend.setups[did] ? G.weekend.setups[did].tyres : null);
Quali.requiredCompound = (ql) => ql.kind === 'SQ' ? (ql.seg < 2 ? 'M' : 'S') : null;
Quali.takeSet = (G, did, pref) => {
  const ql = G.weekend.ql, c = ql.cars[did];
  const req = Quali.requiredCompound(ql);
  const comp = req || pref || 'S';
  const sets = Quali.setsFor(G, did);
  if (!sets) { c.tyre = { c: comp, laps: 0, virtual: true }; return c.tyre; }
  const avail = sets.filter(t => t.c === comp).sort((a, b) => a.laps - b.laps);
  let t = avail[0];
  if (req && (!t || t.laps > 0)) t = t || null; // regra da Sprint: jogo novo
  if (!t) t = sets.filter(x => x.c !== 'H').sort((a, b) => a.laps - b.laps)[0] || sets[0];
  c.tyre = t; return t;
};

/* ---------- comandos do jogador ---------- */
Quali.send = (G, did, opts = {}) => {
  const ql = G.weekend.ql, c = ql.cars[did], s = Quali.seg(ql);
  if (!ql.alive.includes(did)) return { ok: false, msg: 'Este piloto já foi eliminado.' };
  if (c.state !== 'garage') return { ok: false, msg: 'O carro já está na pista.' };
  if (s.done || s.t >= s.dur) return { ok: false, msg: 'A sessão terminou.' };
  if (c.workUntil && c.workUntil > s.t) return { ok: false, msg: `Mecânicos trabalhando (${Math.ceil((c.workUntil - s.t) / 60)} min).` };
  if (opts.newTyre !== false || !c.tyre) Quali.takeSet(G, did, opts.compound);
  c.risk = opts.risk || c.risk; c.pushLeft = clamp(opts.push || 1, 1, 3);
  Quali.beginLap(G, did, 'out');
  return { ok: true };
};
Quali.abort = (G, did) => {
  const ql = G.weekend.ql, c = ql.cars[did], seg = Quali.seg(ql);
  if (c.state !== 'track') return;
  c.pushLeft = 0; c.abort = true;
  if (c.kind === 'push') { const lap = Career.track(G, G.weekend.trackId).baseLap; c.kind = 'in'; c.cur = null; c.secStatus = []; c.next = seg.t + lap * (1 - c.secIdx / 3) * 1.15; }
  Quali.log(ql, tr(`${Quali.nameOf(G, did)} aborta a volta e volta aos boxes.`, `${Quali.nameOf(G, did)} aborts the lap and returns to the pits.`), did, 'team');
};
Quali.garageMinutes = (G, did, next) => {
  const s = G.weekend.setups[did];
  const keys = Quali.allowedKeys(G);
  const times = Setup.PARAMS.filter(([k]) => keys.includes(k) && Math.abs((next[k] ?? s[k]) - s[k]) >= 1).map(p => p[4]).sort((a, b) => b - a);
  return times.length ? +(times[0] + times.slice(1).reduce((a, b) => a + b * 0.35, 0)).toFixed(1) : 0;
};
Quali.allowedKeys = (G) => (Regs.r(G).parcFerme ? Quali.PARC_FERME_KEYS : Setup.KEYS);
Quali.applySetup = (G, did, next) => {
  const wk = G.weekend, ql = wk.ql, c = ql.cars[did], s = wk.setups[did], seg = Quali.seg(ql);
  if (c.state !== 'garage') return { ok: false, msg: 'O carro precisa estar na garagem.' };
  const keys = Quali.allowedKeys(G);
  const min = Quali.garageMinutes(G, did, next);
  if (!min) return { ok: true, min: 0 };
  keys.forEach(k => { if (next[k] != null) s[k] = Math.round(clamp(next[k], 0, 100)); });
  c.workUntil = seg.t + min * 60;
  c.setupChanged = true;
  s.qQ = +Setup.quality(s, wk.optimum[c.tid], Setup.CTX_QUALI(wk)).toFixed(3);
  Quali.log(ql, tr(`Garagem: ajuste no carro de ${Quali.nameOf(G, did)} (${min} min de trabalho).`, `Garage: changes on ${Quali.nameOf(G, did)}'s car (${min} min of work).`), did, 'team');
  return { ok: true, min };
};

/* ---------- uma volta ---------- */
Quali.lapModel = (G, did) => {
  const wk = G.weekend, ql = wk.ql, c = ql.cars[did], seg = Quali.seg(ql);
  const ctx = Career.ctx(G);
  const team = Career.team(G, c.tid);
  const d = Career.driver(G, did);
  const isP = !c.ai || (wk.setups && wk.setups[did]);
  const setupQ = wk.setups && wk.setups[did] ? Setup.quality(wk.setups[did], wk.optimum[c.tid], Setup.CTX_QUALI(wk)) : (wk.aiSetups[did] ?? 0.85);
  const drv = Setup.applyConfidence(ctx.effOf(did), (wk.conf || {})[did]);
  const w = clamp(ql.wet + (ql.wet > 0 ? RNG.range(-0.06, 0.06) : 0), 0, 1);
  const comp = w > 0.6 ? 'W' : w > 0.18 ? 'I' : (c.tyre ? c.tyre.c : 'S');
  const wear = c.tyre ? c.tyre.laps * Engine.wearRate(comp, ctx.track, d, team, 'push', w) : 2;
  const pc = Engine.paceComponents({ db: G.db, track: ctx.track, team, drv, setupQ, compound: comp, wear, fuel: 6, w, mode: 'normal', quali: true, carPerf: Engine.carPerf(G.db, team, ctx.track) + (wk.form[c.tid] || 0) + (wk.dform[did] || 0) + (G.options.difficulty === 'easy' && !c.ai ? 1.2 : 0) - (G.options.difficulty === 'hard' && !c.ai ? 0.8 : 0), trackT: wk.weather.qualiTrack });
  const evo = (ql.rubber + ql.seg * 0.12 + seg.t / seg.dur * 0.1) * 0.55;
  void isP;
  return { pc, drv, comp, w, evo, team };
};
Quali.beginLap = (G, did, kind) => {
  const wk = G.weekend, ql = wk.ql, c = ql.cars[did], seg = Quali.seg(ql);
  const m = Quali.lapModel(G, did);
  c.state = 'track'; c.kind = kind; c.lapStart = seg.t; c.secIdx = 0; c.cur = null;
  if (kind !== 'push') { const k = kind === 'out' ? 1.25 : kind === 'cool' ? 1.32 : 1.2; c.next = seg.t + m.pc.total * k; c.secs = null; return; }
  const R = Quali.RISK[c.risk] || Quali.RISK.normal;
  const sd = 0.1 + (100 - m.drv.consistency) * 0.006 + m.w * 0.22;
  let total = m.pc.total - m.evo + R.mean + RNG.normal(0, sd);
  const f = Career.track(G, wk.trackId).secFrac || [0.32, 0.36, 0.32];
  const secs = f.map(x => total * x + RNG.normal(0, sd * 0.25));
  const fix = total - secs.reduce((a, b) => a + b, 0); secs[2] += fix;
  const cur = { secs: secs.map(x => +x.toFixed(3)), traffic: null, err: null, crash: null, deleted: null, issue: null };
  // tráfego: mais carros na pista, mais chance
  const onTrack = Object.values(ql.cars).filter(x => x.state === 'track').length;
  if (RNG.chance(0.05 + onTrack * 0.012)) { const s = RNG.int(0, 2); const x = +RNG.range(0.12, 0.7).toFixed(2); cur.secs[s] += x; cur.traffic = { s, x }; }
  // erros: piloto, risco, confiança, chuva
  const errP = (0.012 + (100 - m.drv.consistency) * 0.0011 + (100 - (m.drv.concentration ?? 75)) * 0.0004) * R.err * (1 + m.w * 2);
  if (RNG.chance(errP)) {
    const s = RNG.int(0, 2);
    if (RNG.chance(0.14 + m.w * 0.15)) cur.crash = { s };
    else { const x = +RNG.range(0.35, 2.6).toFixed(2); cur.secs[s] += x; cur.err = { s, x }; }
  }
  // limites de pista (volta deletada)
  if (!cur.crash && RNG.chance(0.025 * R.err * (1.3 - (m.drv.concentration ?? 75) / 130))) cur.deleted = { s: RNG.int(0, 2) };
  // comportamento do carro ligado ao acerto (só para narrar)
  if (wk.setups && wk.setups[did]) {
    const e = Setup.errors(wk.setups[did], wk.optimum[c.tid], Setup.CTX_QUALI(wk));
    const worst = Setup.CKEYS.map(k => [k, e[k]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    if (Math.abs(worst[1]) > 5) cur.issue = { cat: worst[0], dir: worst[1] < 0 ? 'neg' : 'pos', s: RNG.int(0, 2) };
  }
  cur.total = +cur.secs.reduce((a, b) => a + b, 0).toFixed(3);
  c.cur = cur;
  c.next = seg.t + cur.secs[0];
};

/* ---------- avanço do relógio ---------- */
Quali.advance = (G, secs) => {
  const wk = G.weekend, ql = wk.ql;
  if (!ql || ql.done) return;
  const seg = Quali.seg(ql);
  if (seg.done) return;
  const end = Math.min(seg.dur + 400, seg.t + secs); // depois da bandeira, só terminam as voltas em andamento
  let guard = 0;
  while (guard++ < 6000) {
    // próxima saída planejada da IA ou do piloto automático
    let next = end, who = null, kind = null;
    ql.alive.forEach(did => {
      const c = ql.cars[did];
      if (c.state === 'track' && c.next < next) { next = c.next; who = did; kind = 'ev'; }
      if (c.state === 'garage' && c.auto && c.plan.length && seg.t < seg.dur) { const at = Math.max(c.plan[0].at, c.workUntil || 0); if (at < next) { next = at; who = did; kind = 'leave'; } }
    });
    if (!who || next > end) break;
    seg.t = Math.max(seg.t, next);
    if (kind === 'leave') Quali.autoLeave(G, who);
    else Quali.event(G, who);
  }
  const anyOnTrack = ql.alive.some(did => ql.cars[did].state === 'track');
  if (end >= seg.dur && !anyOnTrack) { seg.t = Math.max(seg.t, seg.dur); Quali.endSeg(G); }
  else seg.t = Math.max(seg.t, end);
};
Quali.autoLeave = (G, did) => {
  const ql = G.weekend.ql, c = ql.cars[did], seg = Quali.seg(ql);
  const p = c.plan.shift();
  if (p.late) {
    // segunda saída: quem está seguro na frente pode poupar pneus (só Q1/Q2)
    const pos = Quali.order(ql).indexOf(did) + 1;
    if (seg.keep && pos > 0 && pos <= seg.keep - 4 && RNG.chance(0.45)) { Quali.log(ql, tr(`${Quali.nameOf(G, did)} fica nos boxes: tempo garantido.`, `${Quali.nameOf(G, did)} stays in the pits: time is safe.`), did); return; }
  }
  Quali.takeSet(G, did, 'S');
  c.pushLeft = p.push; c.risk = p.late && seg.keep ? (RNG.chance(0.4) ? 'push' : 'normal') : c.risk;
  Quali.beginLap(G, did, 'out');
};
Quali.event = (G, did) => {
  const wk = G.weekend, ql = wk.ql, c = ql.cars[did], seg = Quali.seg(ql);
  const track = Career.track(G, wk.trackId);
  const r = localRng(`qn:${G.seed}:${G.season.round}:${did}:${Math.round(seg.t)}`);
  const nm = Quali.nameOf(G, did);
  const mine = !c.ai;
  if (c.kind !== 'push') {
    if (c.tyre) c.tyre.laps += 1;
    // fim de volta de saída / resfriamento / entrada
    if (c.kind === 'in' || c.abort || seg.t >= seg.dur) { const wasIn = c.kind === 'in'; c.state = 'garage'; c.kind = null; c.abort = false; c.next = Infinity; if (wasIn && mine) Quali.log(ql, tr(`${nm} de volta à garagem.`, `${nm} back in the garage.`), did, 'team'); if (c.auto && !c.plan.length && seg.t < seg.dur - 150) Quali.setAuto(G, did, true); return; }
    if (c.pushLeft > 0) return Quali.beginLap(G, did, 'push');
    return Quali.beginLap(G, did, 'in');
  }
  // volta lançada: eventos por setor
  const cur = c.cur;
  const s = c.secIdx;
  if (cur.crash && cur.crash.s === s) {
    const corner = Narr.corner(track, s, r);
    ql.res[did].inc.push(`${seg.name}: batida ${Narr.at(corner)}`);
    Quali.log(ql, tr(`BATIDA! ${nm} perde o carro ${Narr.at(corner)} e vai para o muro. Fim de sessão para ele.`, `CRASH! ${nm} loses the car ${Narr.at(corner)} and hits the wall. Session over for him.`), did, 'crash');
    c.state = 'out'; c.kind = null; c.next = Infinity; ql.cars[did].crashed = true;
    if (RNG.chance(0.7)) Quali.redFlag(G, did, corner);
    return;
  }
  const st = cur.secs[s];
  const sb = ql.best.s[s];
  const status = st < sb ? 'purple' : st < c.sb[s] ? 'green' : 'yellow';
  if (mine || status === 'purple' || (cur.err && cur.err.s === s)) {
    const issue = cur.issue && cur.issue.s === s && Narr.BEHAVIOR[cur.issue.cat] ? Narr.fill(Narr.pick('bh' + cur.issue.cat, Narr.BEHAVIOR[cur.issue.cat][cur.issue.dir], r), { c: Narr.corner(track, s, r) }) : null;
    if (mine || status === 'purple' || cur.err) Quali.log(ql, Narr.qSector({ name: nm, sec: s, t: st, status, delta: isFinite(sb) ? st - sb : 0, corner: Narr.corner(track, s, r), issue: mine ? issue : null, traffic: cur.traffic && cur.traffic.s === s ? cur.traffic.x : null, err: cur.err && cur.err.s === s ? cur.err.x : null }, r), did, mine ? 'mine' : status === 'purple' ? 'purple' : 'info');
  }
  if (st < sb) ql.best.s[s] = st;
  if (st < c.sb[s]) c.sb[s] = st;
  c.secStatus = c.secStatus || []; c.secStatus[s] = status;
  if (s < 2) { c.secIdx++; c.next = seg.t + cur.secs[s + 1]; return; }
  // linha de chegada
  if (c.tyre) c.tyre.laps += 1;
  const res = ql.res[did];
  res.laps++;
  c.pushLeft--;
  c.secStatus = [];
  if (cur.deleted) {
    res.inc.push(`${seg.name}: volta deletada (limites de pista)`);
    Quali.log(ql, Narr.qLap({ name: nm, deleted: true, c: Narr.corner(track, cur.deleted.s, r), t: fmtLap(cur.total) }, r), did, 'penalty');
  } else {
    const prevBest = res.times[seg.name] ?? Infinity;
    if (cur.total < prevBest) res.times[seg.name] = cur.total;
    const order = Quali.order(ql);
    const pos = order.indexOf(did) + 1;
    const lead = ql.res[order[0]].times[seg.name];
    const pole = pos === 1 && cur.total <= lead;
    if (cur.total < ql.best.lap) ql.best.lap = cur.total;
    const elim = seg.keep && pos > seg.keep;
    let setupNote = '';
    if (mine && c.setupChanged) { setupNote = cur.issue ? 'O ajuste na garagem ainda não resolveu tudo.' : 'O ajuste feito na garagem funcionou: carro mais equilibrado.'; c.setupChanged = false; }
    if (mine || pole || (seg.t > seg.dur - 30 && (elim || pos <= 3))) Quali.log(ql, Narr.qLap({ name: nm, t: fmtLap(cur.total), pos, gap: cur.total - lead, pole, elim, safe: seg.keep && pos <= seg.keep, seg: seg.name, last: !seg.keep, setupNote }, r), did, pole ? 'purple' : mine ? 'mine' : 'info');
  }
  c.cur = null;
  if (c.abort || seg.t >= seg.dur) return Quali.beginLap(G, did, 'in');
  if (c.pushLeft > 0) return Quali.beginLap(G, did, 'cool');
  return Quali.beginLap(G, did, 'in');
};
Quali.redFlag = (G, did, corner) => {
  const ql = G.weekend.ql, seg = Quali.seg(ql);
  Quali.log(ql, tr(`BANDEIRA VERMELHA no ${seg.name}: carro de ${Quali.nameOf(G, did)} parado ${Narr.at(corner)}. Todos para os boxes; o relógio para.`, `RED FLAG in ${seg.name}: ${Quali.nameOf(G, did)}'s car stopped ${Narr.at(corner)}. Everyone back to the pits; the clock stops.`), did, 'red');
  // voltas em andamento são abortadas; a sessão volta com o mesmo tempo restante
  ql.alive.forEach(x => { const c = ql.cars[x]; if (c.state === 'track') { c.state = 'garage'; c.kind = null; c.next = Infinity; c.cur = null; c.secStatus = []; } });
  const restart = 150;
  seg.dur += restart; // a bandeira vermelha não consome o tempo de sessão
  ql.alive.forEach(x => { const c = ql.cars[x]; if (c.auto && !c.crashed) { c.plan = c.plan.filter(p => p.late); c.plan.unshift({ at: seg.t + restart + RNG.range(5, 90), push: 1 }); } });
  seg.reds = (seg.reds || 0) + 1;
};
Quali.order = (ql) => {
  const s = Quali.seg(ql);
  return ql.alive.slice().sort((a, b) => (ql.res[a].times[s.name] ?? Infinity) - (ql.res[b].times[s.name] ?? Infinity));
};
Quali.endSeg = (G) => {
  const wk = G.weekend, ql = wk.ql, seg = Quali.seg(ql);
  seg.done = true;
  const order = Quali.order(ql);
  if (seg.keep) {
    const out = order.slice(seg.keep);
    out.forEach(did => (ql.res[did].elim = seg.name));
    ql.alive = order.slice(0, seg.keep);
    Quali.log(ql, tr(`Fim do ${seg.name}. Eliminados: ${out.map(d => Quali.nameOf(G, d)).join(', ')}.`, `End of ${seg.name}. Eliminated: ${out.map(d => Quali.nameOf(G, d)).join(', ')}.`), null, 'flag');
  } else {
    Quali.log(ql, tr(`Fim do ${seg.name}! ${Quali.nameOf(G, order[0])} conquista a ${ql.kind === 'SQ' ? 'pole da Sprint' : 'pole position'}.`, `End of ${seg.name}! ${Quali.nameOf(G, order[0])} takes ${ql.kind === 'SQ' ? 'Sprint pole' : 'pole position'}.`), order[0], 'flag');
    ql.done = true;
  }
};
Quali.nextSeg = (G) => {
  const ql = G.weekend.ql;
  if (ql.seg < ql.segs.length - 1) { ql.seg++; Quali.startSeg(G); return true; }
  return false;
};
/* piloto automático: o engenheiro faz o programa padrão com o carro do jogador */
Quali.setAuto = (G, did, on) => {
  const ql = G.weekend.ql, c = ql.cars[did], seg = Quali.seg(ql);
  c.auto = on;
  if (on && c.state === 'garage') {
    const lap = Career.track(G, G.weekend.trackId).baseLap;
    c.plan = [];
    if (seg.t < seg.dur * 0.55) c.plan.push({ at: seg.t + 20, push: 1 });
    c.plan.push({ at: Math.max(seg.t + 20, seg.dur - lap * 1.25 - 40), push: 1, late: true });
  }
};
/* simula o que falta (segmento atual ou tudo) */
Quali.simulate = (G, all) => {
  const ql = G.weekend.ql;
  do {
    const seg = Quali.seg(ql);
    if (!seg.done) {
      ql.alive.forEach(did => { const c = ql.cars[did]; if (!c.auto) Quali.setAuto(G, did, true); });
      let g = 0; while (!seg.done && g++ < 50) Quali.advance(G, 600);
    }
    if (!all || ql.done) break;
  } while (Quali.nextSeg(G));
};
/* resultado no formato usado pelo resto do jogo */
Quali.result = (G) => {
  const ql = G.weekend.ql;
  const names = ql.segs.map(s => s.name);
  const res = {};
  const order = [];
  const last = names[names.length - 1];
  const by = (sn, ids) => ids.sort((a, b) => (ql.res[a].times[sn] ?? Infinity) - (ql.res[b].times[sn] ?? Infinity));
  order.push(...by(last, Object.keys(ql.res).filter(d => !ql.res[d].elim)));
  for (let i = names.length - 2; i >= 0; i--) order.push(...by(names[i], Object.keys(ql.res).filter(d => ql.res[d].elim === names[i])));
  order.forEach((did, i) => {
    const x = ql.res[did];
    const ts = Object.values(x.times).filter(isFinite);
    res[did] = { did, tid: x.tid, times: { ...x.times }, best: ts.length ? Math.min(...ts) : null, pos: i + 1, eliminatedIn: x.elim, incidents: x.inc };
    names.forEach(n => { if (res[did].times[n] == null && (n === names[0] || !x.elim || names.indexOf(n) <= names.indexOf(x.elim))) res[did].times[n] = Infinity; });
  });
  return { order, res, sessions: names, wet: ql.wet, kind: ql.kind, log: ql.log.slice(0, 80) };
};
