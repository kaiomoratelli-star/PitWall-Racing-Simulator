/* ============================================================
   PIT WALL — acerto do carro, percepção do piloto e confiança
   Modelo:
   • 5 ajustes (asas, suspensão, altura, freio). As relações de marcha são
     homologadas por temporada no regulamento atual e não mudam no fim de semana.
   • O piloto não "vê" os ajustes: ele sente 5 áreas de equilíbrio do carro
     (equilíbrio, frenagem, curvas, tração e retas). Cada ajuste mexe em várias
     áreas ao mesmo tempo (matriz de acoplamento).
   • O ideal muda com o contexto: tanque cheio, pista emborrachando, calor,
     vento e o quanto o piloto força. Por isso o ideal de classificação e o de
     corrida não são o mesmo, e o piloto pode mudar de opinião COM motivo.
   • Percepção estável: cada piloto tem um viés fixo no fim de semana (menor
     quanto melhor o feedback técnico) e memória do que já disse. Opiniões só
     mudam quando o carro ou as condições mudaram de verdade.
   • Janela do engenheiro: a faixa onde deve estar o ajuste ideal fica mais
     estreita a cada saída com feedback (como no paddock de verdade).
   • Confiança = 50% satisfação com o acerto + 25% conhecimento da pista
     + 25% familiaridade com o carro (cai quando entram peças novas).
   ============================================================ */
'use strict';

const Setup = {};
Setup.PARAMS = [
  // chave, nome, extremo baixo, extremo alto, minutos de garagem para mexer
  ['fwing', 'Asa dianteira', 'Menos ângulo', 'Mais ângulo', 1.5],
  ['rwing', 'Asa traseira', 'Menos ângulo', 'Mais ângulo', 4],
  ['susp', 'Suspensão e barras', 'Macia', 'Rígida', 6],
  ['ride', 'Altura do carro', 'Baixa', 'Alta', 8],
  ['brake', 'Balanço de freio', 'Traseiro', 'Dianteiro', 0.5],
];
Setup.KEYS = Setup.PARAMS.map(p => p[0]);
Setup.CATS = [
  // chave, nome, o que significa erro negativo, o que significa erro positivo
  ['balance', 'Equilíbrio', 'Subesterço', 'Sobresterço'],
  ['braking', 'Frenagem', 'Dianteira travando', 'Traseira instável'],
  ['cornering', 'Curvas', 'Macio demais', 'Rígido demais'],
  ['traction', 'Tração', 'Pouca rotação na saída', 'Patinando na saída'],
  ['straights', 'Retas', 'Carga de menos', 'Arrasto demais'],
];
Setup.CKEYS = Setup.CATS.map(c => c[0]);
// erro de cada área = Σ coeficiente × (ajuste − ideal)
Setup.M = {
  balance: { fwing: 0.9, rwing: -0.9, susp: 0.25, ride: 0, brake: 0 },
  braking: { fwing: 0.15, rwing: -0.2, susp: 0.1, ride: 0.2, brake: -1.0 },
  cornering: { fwing: 0.15, rwing: 0.15, susp: 0.8, ride: 0.6, brake: 0 },
  traction: { fwing: -0.15, rwing: -0.6, susp: 0.45, ride: 0.2, brake: 0 },
  straights: { fwing: 0.35, rwing: 0.8, susp: 0, ride: 0.3, brake: 0 },
};
Setup.W = { balance: 1.25, braking: 0.8, cornering: 1, traction: 0.95, straights: 0.9 };

/* ideal de base do carro nesta pista (único por equipe, pista e temporada) */
Setup.genOptimum = (track, team, rng) => {
  const w = track.weights;
  const aero = clamp((w.aero - 0.18) / 0.32, 0, 1);   // 0 = Monza, 1 = Mônaco
  const eng = clamp((w.engine - 0.12) / 0.43, 0, 1);
  const j = (s) => (rng() - 0.5) * s;
  const wingBase = 14 + aero * 70 - eng * 8;
  return {
    fwing: Math.round(clamp(wingBase + j(22), 4, 96)),
    rwing: Math.round(clamp(wingBase + 4 + j(22), 4, 96)),
    susp: Math.round(clamp(track.street ? 30 + j(30) : 60 + j(40), 4, 96)),
    ride: Math.round(clamp(track.street ? 58 + j(28) : 38 + j(34), 4, 96)),
    brake: Math.round(clamp(52 + j(40), 4, 96)),
  };
};

/* deslocamento das áreas pelo contexto (positivo = na direção do 2º rótulo) */
Setup.CTX_NAMES = {
  fuel: 'o tanque mais pesado', fuelLight: 'o carro mais leve, com pouco combustível', rubber: 'a pista mais emborrachada',
  heat: 'o asfalto mais quente', cool: 'a pista mais fria', wind: 'o vento', push: 'o ritmo mais forte', wear: 'os pneus mais gastos',
};
Setup.ctxShift = (ctx) => {
  // ctx: { fuel 0–1, rubber 0–1, trackT °C, wind km/h, windDir -1..1, push 0–1, wear 0–1 }
  const f = ctx.fuel ?? 0.3, r = ctx.rubber ?? 0.3, t = ((ctx.trackT ?? 38) - 38) / 12, wnd = (ctx.wind ?? 8) / 30 * (ctx.windDir ?? 0.3), p = ctx.push ?? 0.5, wr = ctx.wear ?? 0.2;
  return {
    balance: -f * 3.4 + r * 1.8 + t * 1.6 + wnd * 1.5 + p * 1.2 + wr * 2.2,
    braking: f * 2.2 + wnd * 3 + p * 1.0,
    cornering: f * 1.6 - r * 1.2 + t * 0.8,
    traction: -f * 1.2 + t * 2.6 + wr * 3.2 + p * 1.0,
    straights: -r * 0.6 + wnd * 1.2,
  };
};
Setup.errors = (setup, opt, ctx) => {
  const sh = Setup.ctxShift(ctx || {});
  const out = {};
  Setup.CKEYS.forEach(c => { let e = sh[c]; Setup.KEYS.forEach(k => { e += Setup.M[c][k] * ((setup[k] ?? 50) - opt[k]); }); out[c] = e; });
  return out;
};
Setup.quality = (setup, opt, ctx) => {
  const e = Setup.errors(setup, opt, ctx);
  let d = 0; Setup.CKEYS.forEach(c => (d += Math.abs(e[c]) * Setup.W[c]));
  return clamp(1 - d / 120, 0, 1);
};
/* contextos de referência: classificação (pouco combustível, pista emborrachada, ataque) e corrida */
Setup.CTX_QUALI = (wk) => ({ fuel: 0.08, rubber: 0.85, trackT: wk.weather.qualiTrack ?? 36, wind: wk.weather.wind, windDir: wk.windDir ?? 0.3, push: 1, wear: 0.05 });
Setup.CTX_RACE = (wk) => ({ fuel: 0.55, rubber: 0.75, trackT: (wk.weather.trackT && wk.weather.trackT[1]) ?? 40, wind: wk.weather.wind, windDir: wk.windDir ?? 0.3, push: 0.45, wear: 0.45 });
Setup.FOCUS = { balanced: 'Equilibrado (classificação e corrida)', quali: 'Foco total na classificação', race: 'Foco total no ritmo de corrida' };
Setup.focusMix = (focus) => focus === 'quali' ? 0.85 : focus === 'race' ? 0.15 : 0.5;
/* ideal efetivo para um foco: ajuste que zera a média ponderada dos dois contextos (resolvido por descida de gradiente) */
Setup.bestFor = (opt, wk, focus) => {
  const a = Setup.focusMix(focus);
  const cQ = Setup.CTX_QUALI(wk), cR = Setup.CTX_RACE(wk);
  const s = { ...opt };
  for (let it = 0; it < 160; it++) {
    const eQ = Setup.errors(s, opt, cQ), eR = Setup.errors(s, opt, cR);
    Setup.KEYS.forEach(k => {
      let g = 0;
      Setup.CKEYS.forEach(c => { const e = a * eQ[c] + (1 - a) * eR[c]; g += Setup.W[c] * Math.sign(e) * Setup.M[c][k] * Math.min(1, Math.abs(e) / 2); });
      s[k] = clamp(s[k] - g * 0.6, 0, 100);
    });
  }
  Setup.KEYS.forEach(k => (s[k] = Math.round(s[k])));
  return s;
};

/* ---------- piloto: percepção, memória e falas ---------- */
Setup.skill = (d, eng) => clamp(((d.feedback ?? d.experience ?? 70) * 0.55 + (d.experience ?? 60) * 0.25 + (eng ?? 75) * 0.2), 30, 99);
Setup.newDriverState = (G, d, track) => {
  const r = localRng(`pv:${G.seed}:${G.season.year}:${track.id}:${d.id}`);
  const sk = Setup.skill(d);
  const bias = {};
  Setup.CKEYS.forEach(c => { bias[c] = +((r() - 0.5) * 2 * (100 - sk) / 100 * 7).toFixed(2); });
  return { bias, said: {}, opinions: {}, usedPhrases: [], usedReasons: [], lastCtx: null, flips: 0 };
};
Setup.level = (e) => { const m = Math.abs(e); return m < 3.5 ? 0 : m < 9 ? 1 : m < 17 ? 2 : 3; };
Setup.LEVEL_NAMES = ['Ideal', 'Leve', 'Moderado', 'Grave'];

// frases por área e direção (variedade + controle de repetição)
Setup.PHRASES = {
  balance: {
    neg: ['A frente não quer virar nas curvas lentas, muito subesterço.', 'Estou esperando o carro apontar na entrada; falta frente.', 'Subesterço no meio da curva, preciso abrir o volante cedo.'],
    pos: ['A traseira está muito viva, sobresterço na saída das lentas.', 'O carro gira demais na entrada, a traseira não acompanha.', 'Estou corrigindo a traseira o tempo todo, sobresterço.'],
    ok: ['O equilíbrio está bom, consigo colocar o carro onde quero.', 'Frente e traseira estão conversando bem.', 'Equilíbrio no ponto.'],
  },
  braking: {
    neg: ['Travando a dianteira nas frenagens fortes.', 'A frente trava fácil no fim da reta, freio muito à frente.', 'Pneu dianteiro esquerdo travando na freada da curva 1.'],
    pos: ['A traseira fica leve na frenagem, quase rodei.', 'Instável demais freando, a traseira quer passar.', 'Freando em linha reta e a traseira mexe.'],
    ok: ['Frenagem estável, posso atacar a freada.', 'Confio no freio, está ótimo.', 'Freio no lugar certo.'],
  },
  cornering: {
    neg: ['Muito macio, o carro rola e demora a trocar de direção.', 'Nas chicanes o carro fica preguiçoso, falta firmeza.', 'Batendo no fundo nas compressões, está baixo ou macio demais.'],
    pos: ['Rígido demais, pulando nas zebras.', 'O carro quica nas ondulações e perde aderência.', 'Não consigo usar as zebras, está duro demais.'],
    ok: ['Bom nas curvas, aderência mecânica ótima.', 'O carro absorve bem as zebras.', 'Plataforma estável nas curvas.'],
  },
  traction: {
    neg: ['Na saída das lentas o carro não gira, empurra de frente.', 'Pouca rotação na saída, perco tempo esperando para acelerar.', 'Na tração a frente abre, falta rotação.'],
    pos: ['Patinando muito na saída das curvas lentas.', 'A traseira destraciona quando acelero.', 'Perdendo tração na saída, roda patinando.'],
    ok: ['Boa tração, posso acelerar cedo.', 'Saída de curva limpa.', 'Tração no ponto.'],
  },
  straights: {
    neg: ['Velocidade de reta sobrando, dá para colocar mais carga.', 'Muito rápido nas retas e pouca carga nas curvas.', 'Ganho nas retas, mas perco tudo nas curvas de alta.'],
    pos: ['Lento demais nas retas, arrasto em excesso.', 'Estão me passando fácil na reta, muita asa.', 'O carro não anda na reta, carga demais.'],
    ok: ['Velocidade de reta boa para esta pista.', 'Arrasto e carga bem equilibrados.', 'Reta e curva no compromisso certo.'],
  },
};
Setup.REASONS = {
  fuel: 'com o tanque mais pesado', fuelLight: 'com o carro leve', rubber: 'com a pista emborrachando', heat: 'com o asfalto mais quente',
  cool: 'com a pista esfriando', wind: 'com o vento mudando', push: 'forçando mais no limite', wear: 'com os pneus mais gastos',
};
Setup.ART = { balance: 'o equilíbrio', braking: 'a frenagem', cornering: 'o carro nas curvas', traction: 'a tração', straights: 'a velocidade de reta' };
Setup.ctxReason = (prev, cur, cat) => {
  if (!prev) return null;
  const cands = [];
  if ((cur.fuel ?? 0) - (prev.fuel ?? 0) > 0.25) cands.push(['fuel', ['balance', 'braking', 'cornering']]);
  if ((prev.fuel ?? 0) - (cur.fuel ?? 0) > 0.25) cands.push(['fuelLight', ['balance', 'braking', 'cornering']]);
  if ((cur.rubber ?? 0) - (prev.rubber ?? 0) > 0.18) cands.push(['rubber', ['balance', 'cornering']]);
  if ((cur.trackT ?? 0) - (prev.trackT ?? 0) > 3) cands.push(['heat', ['traction', 'balance']]);
  if ((prev.trackT ?? 0) - (cur.trackT ?? 0) > 3) cands.push(['cool', ['traction', 'balance']]);
  if (Math.abs((cur.wind ?? 0) - (prev.wind ?? 0)) > 7) cands.push(['wind', ['braking', 'balance', 'straights']]);
  if ((cur.push ?? 0) - (prev.push ?? 0) > 0.3) cands.push(['push', ['balance', 'braking', 'traction']]);
  if ((cur.wear ?? 0) - (prev.wear ?? 0) > 0.25) cands.push(['wear', ['traction', 'balance']]);
  const m = cands.find(([, cats]) => cats.includes(cat));
  return m ? m[0] : null;
};
Setup.ADVICE = {
  balance: { neg: 'tirar um pouco de asa traseira ou colocar mais asa dianteira', pos: 'colocar mais asa traseira ou tirar asa dianteira' },
  braking: { neg: 'mandar o balanço de freio um pouco para trás', pos: 'levar o balanço de freio para a frente' },
  cornering: { neg: 'endurecer a suspensão ou subir um pouco o carro', pos: 'amaciar a suspensão ou baixar o carro' },
  traction: { neg: 'endurecer um pouco a traseira', pos: 'colocar mais asa traseira ou amaciar a suspensão' },
  straights: { neg: 'colocar mais carga nas asas', pos: 'tirar asa, principalmente a traseira' },
};
/* escolhe uma frase sem repetir as últimas usadas por este piloto */
Setup.pick = (st, cat, kind, r) => {
  const list = Setup.PHRASES[cat][kind];
  const key = (i) => `${cat}:${kind}:${i}`;
  const free = list.map((t, i) => i).filter(i => !st.usedPhrases.includes(key(i)));
  const i = free.length ? free[Math.floor(r() * free.length)] : Math.floor(r() * list.length);
  st.usedPhrases.push(key(i)); if (st.usedPhrases.length > 9) st.usedPhrases.shift();
  return list[i];
};

/* feedback de uma saída: coerente com o que já foi dito; muda de opinião só com motivo */
Setup.feedback = (st, setup, opt, ctx, laps, skill, r) => {
  const truth = Setup.errors(setup, opt, ctx);
  const prevCtx = st.lastCtx;
  const precision = clamp(laps / 5, 0.35, 1.2);
  const items = [];
  let flipsThisRun = 0;
  const lines = [];
  Setup.CKEYS.forEach(c => {
    const noise = RNG.normal(0, (100 - skill) / 100 * 2.2 / precision);
    const perceived = truth[c] + st.bias[c] + noise;
    let lvl = Setup.level(perceived), dir = perceived < 0 ? 'neg' : 'pos';
    const prev = st.opinions[c];
    const setupChanged = prev && Setup.KEYS.some(k => Math.abs((prev.setup[k] ?? 50) - (setup[k] ?? 50)) >= 2 && Math.abs(Setup.M[c][k]) >= 0.1);
    let reason = null, changed = false;
    if (prev && !setupChanged) {
      const sameKind = (prev.lvl === 0 && lvl === 0) || (prev.lvl > 0 && lvl > 0 && prev.dir === dir);
      if (!sameKind) {
        reason = Setup.ctxReason(prev.ctx, ctx, c);
        const big = Math.abs(perceived - prev.val) > 7;
        // sem mudança no carro nem nas condições, a opinião se mantém (memória)
        if ((!reason && !big) || (reason && flipsThisRun >= 2) || (st.usedReasons.slice(-2).includes(reason) && !big)) { lvl = prev.lvl; dir = prev.dir; reason = null; }
        else { changed = true; flipsThisRun++; }
      } else if (Math.abs(lvl - prev.lvl) === 1 && Math.abs(perceived - prev.val) < 3) { lvl = prev.lvl; }
    }
    const item = { cat: c, lvl, dir, val: +perceived.toFixed(1) };
    if (lvl === 0) item.text = Setup.pick(st, c, 'ok', r);
    else item.text = Setup.pick(st, c, dir, r) + (lvl >= 2 ? '' : ' Nada grave.');
    if (changed && prev) {
      const name = Setup.CATS.find(x => x[0] === c)[1].toLowerCase();
      if (reason) {
        st.usedReasons.push(reason); if (st.usedReasons.length > 4) st.usedReasons.shift();
        const art = Setup.ART[c];
        const was = Setup.CATS.find(x => x[0] === c)[prev.dir === 'neg' ? 2 : 3].toLowerCase();
        const now = Setup.CATS.find(x => x[0] === c)[dir === 'neg' ? 2 : 3].toLowerCase();
        item.text = (prev.lvl === 0 ? `Na saída anterior ${art} estava bom, mas agora, ${Setup.REASONS[reason]}, ` : `Antes eu reclamava de ${was}, mas agora, ${Setup.REASONS[reason]}, `)
          + (lvl === 0 ? 'ficou no ponto.' : `${now === was ? 'piorou' : 'apareceu ' + now}. É melhor ${Setup.ADVICE[c][dir]}.`);
        item.reason = reason;
      } else item.text = (lvl === 0 ? 'Agora sim, ' : 'Mudou bastante desde a última saída: ') + item.text.charAt(0).toLowerCase() + item.text.slice(1);
      item.changed = true;
    } else if (prev && setupChanged && prev.lvl > 0 && lvl < prev.lvl) {
      item.text = (lvl === 0 ? 'A mudança funcionou: ' : 'Melhorou, mas ainda: ') + item.text.charAt(0).toLowerCase() + item.text.slice(1);
    } else if (prev && setupChanged && lvl > prev.lvl) {
      item.text = 'Piorou com a mudança: ' + item.text.charAt(0).toLowerCase() + item.text.slice(1);
    }
    st.opinions[c] = { lvl, dir, val: perceived, setup: { ...setup }, ctx: { ...ctx } };
    items.push(item);
    if (lvl > 0 || item.changed) lines.push(item.text);
  });
  st.lastCtx = { ...ctx };
  st.flips += flipsThisRun;
  // satisfação: o que o piloto sente (0–100)
  let d = 0; items.forEach(i => (d += Math.abs(i.val) * Setup.W[i.cat]));
  const satisfaction = Math.round(clamp(100 - d * 0.85, 0, 100));
  return { items, satisfaction, summary: lines.slice(0, 3) };
};

/* ---------- engenheiro: janela estimada do ideal ----------
   O engenheiro não sabe o ideal: ele o deduz do que o piloto relata.
   A partir do acerto testado e das sensações (com o viés do piloto), resolve
   o sistema "ajuste → equilíbrio" e estima onde está o ideal. Cada saída é
   uma estimativa; a janela é a média ponderada delas e estreita com a confiança
   acumulada. Pilotos com bom feedback técnico levam a estimativas melhores. */
Setup.solve = (A, b) => {
  // eliminação de Gauss com pivotamento (5×5)
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c || !M[c][c]) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1));
};
Setup.estimateOpt = (setup, perceived, ctx) => {
  const sh = Setup.ctxShift(ctx || {});
  const A = Setup.CKEYS.map(c => Setup.KEYS.map(k => Setup.M[c][k]));
  const b = Setup.CKEYS.map(c => (perceived[c] ?? 0) - sh[c]);
  const delta = Setup.solve(A, b); // = ajuste − ideal
  const o = {}; Setup.KEYS.forEach((k, i) => (o[k] = clamp((setup[k] ?? 50) - delta[i], 0, 100)));
  return o;
};
Setup.newWindow = (prior, engSkill, r) => {
  // ponto de partida: experiência dos engenheiros com o carro e com esta pista
  const est = {};
  Setup.KEYS.forEach(k => { est[k] = clamp(prior[k] + (r() - 0.5) * 2 * (100 - engSkill) / 100 * 20, 0, 100); });
  const w = {}; Setup.KEYS.forEach(k => { w[k] = { lo: Math.round(clamp(est[k] - 30, 0, 100)), hi: Math.round(clamp(est[k] + 30, 0, 100)) }; });
  return { w, k: 0, est, wsum: 0.6, ests: [] };
};
/* nova saída com feedback: estima o ideal (já convertido para o objetivo escolhido) e estreita a janela */
Setup.learn = (win, info, focusFn, laps, skill, engSkill) => {
  if (info) {
    const base = Setup.estimateOpt(info.setup, info.perceived, info.ctx);
    win.ests.push(base); if (win.ests.length > 12) win.ests.shift();
    const wgt = laps / 4 * (0.4 + skill / 160) * (0.7 + engSkill / 300);
    Setup.KEYS.forEach(k => { win.est[k] = (win.est[k] * win.wsum + base[k] * wgt) / (win.wsum + wgt); });
    win.wsum += wgt;
    win.k = clamp(1 - 1 / (1 + win.wsum * 0.55), 0, 0.97);
  }
  const tgt = focusFn ? focusFn(win.est) : win.est;
  win.tgt = tgt;
  const half = Math.max(2.5, 30 * Math.pow(1 - win.k, 1.2));
  Setup.KEYS.forEach(k => { win.w[k] = { lo: Math.round(clamp(tgt[k] - half, 0, 100)), hi: Math.round(clamp(tgt[k] + half, 0, 100)) }; });
  return win;
};
Setup.recommend = (win) => { const s = {}; Setup.KEYS.forEach(k => (s[k] = Math.round(win.tgt ? win.tgt[k] : (win.w[k].lo + win.w[k].hi) / 2))); return s; };

/* ---------- confiança ---------- */
Setup.confidence = (sat, acclim, fam) => Math.round(clamp(sat * 0.5 + acclim * 0.25 + fam * 0.25, 0, 100));
/* efeito da confiança no piloto: ritmo, consistência e erros */
Setup.applyConfidence = (eff, conf) => {
  if (conf == null) return eff;
  const x = (conf - 70) / 30; // −2.3 .. +1
  return { ...eff, pace: eff.pace + clamp(x, -1.5, 1) * 0.45, qualifying: eff.qualifying + clamp(x, -1.5, 1) * 0.5, consistency: clamp(eff.consistency + clamp(x, -1.5, 1) * 3.5, 30, 100), concentration: clamp((eff.concentration ?? 75) + clamp(x, -1.5, 1) * 3, 30, 100) };
};
