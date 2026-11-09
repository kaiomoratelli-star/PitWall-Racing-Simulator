/* ============================================================
   PIT WALL 0.8.6 — superlicença completa, pontos de punição e novatos no TL1
   Regras reais (FIA, Apêndice L do Código Esportivo Internacional e Regulamento Esportivo da F1):
   - superlicença completa: 40 pontos nas três últimas temporadas, 18 anos;
   - superlicença de treino livre: 25 pontos (corre só o TL1);
   - 1 ponto por fim de semana com pelo menos 100 km num TL, sem ponto de punição, no máximo 10;
   - novato = no máximo 2 GPs disputados; cada carro cede o TL1 a um novato 2 vezes por temporada (regra de 2025);
   - pontos de punição valem 12 meses; 12 em 12 meses = suspensão da corrida seguinte, e a contagem zera.
   ============================================================ */
'use strict';
const SL = {};
SL.FULL = 40; SL.FP = 25; SL.FP_MAX = 10; SL.ROOKIE_GP = 2; SL.FP1_PER_CAR = 2; SL.PP_LIMIT = 12; SL.FP1_FINE = 0.5;

/* ---------- pontos ---------- */
SL.seriesPts = (G, d) => { const y = G.season.year; return sum((d.sl || []).filter(x => !x.fp && x.y >= y - 3 && x.y <= y).map(x => x.pts || 0)); };
SL.fpPts = (G, d) => { const y = G.season.year; return Math.min(SL.FP_MAX, (d.sl || []).filter(x => x.fp && x.y >= y - 3).length); };
SL.points = (G, d) => SL.seriesPts(G, d) + SL.fpPts(G, d);
Hooks.base('Market', Market, 'slPoints', 'sl', (G, d) => SL.points(G, d), 'o mercado passa a contar os pontos de treino livre (janela de 3 anos)');
SL.f1Starts = (d) => (d.career && d.career.starts) || 0;
SL.isRookie = (d) => SL.f1Starts(d) <= SL.ROOKIE_GP;
SL.status = (G, d) => {
  if (!d || (d.age || 0) < 18) return 'none';
  if (d.slEligible || SL.f1Starts(d) > 0 || SL.points(G, d) >= SL.FULL) return 'full';
  if (SL.points(G, d) >= SL.FP) return 'fp';
  return 'none';
};
SL.label = (st) => (st === 'full' ? byLang('Superlicença', 'Super licence') : st === 'fp' ? byLang('Licença de treino livre', 'Free practice licence') : byLang('Sem superlicença', 'No super licence'));

/* ---------- pontos de punição ---------- */
SL.dayOf = (G) => { try { Time.init(G); return G.today; } catch (e) { return `${G.season.year}-06-30`; } };
SL.activePP = (G, d, today) => { const t = today || SL.dayOf(G); return (d.pp || []).filter(x => Time.diff(x.date, t) < 365); };
SL.ppTotal = (G, d) => sum(SL.activePP(G, d).map(x => x.pts));
SL.WHY = { colisao: ['causar colisão', 'causing a collision'], limites: ['exceder os limites de pista', 'exceeding track limits'] };
SL.afterRace = (G, race, gp) => {
  const today = SL.dayOf(G);
  (race.pp || []).forEach(x => {
    const d = Career.driver(G, x.did); if (!d) return;
    d.pp = (d.pp || []).filter(p => Time.diff(p.date, today) < 365);
    d.pp.push({ date: today, y: G.season.year, pts: x.pts, why: x.why, gp });
    const tot = SL.ppTotal(G, d);
    if (tot >= SL.PP_LIMIT && !d.banNext) {
      d.banNext = true;
      Career.news(G, byLang(`${d.name} chega a ${tot} pontos na superlicença e está suspenso da próxima corrida`, `${d.name} reaches ${tot} super licence points and is banned from the next race`), 'regulamento', byLang('Pelo regulamento da FIA, 12 pontos em 12 meses suspendem o piloto por uma corrida. O reserva assume o carro.', 'Under FIA rules, 12 points in 12 months ban a driver for one race. The reserve takes the car.'), { dr: [d.id], tm: [d.team].filter(Boolean), main: true });
      if (d.team === G.player.teamId && !Career.isObs(G)) Career.mail(G, { from: 'FIA', tag: 'board', important: true, title: byLang(`${d.name} suspenso por uma corrida`, `${d.name} banned for one race`), body: byLang(`${d.name} somou ${tot} pontos de punição em 12 meses. O reserva corre o próximo GP.`, `${d.name} has ${tot} penalty points in 12 months. The reserve races the next GP.`) });
    }
  });
};

/* ---------- novatos no TL1 ---------- */
SL.fp1 = (G) => (G.season.fp1 = G.season.fp1 || {});
SL.fp1Done = (G, tid, car) => (SL.fp1(G)[tid] || []).filter(x => x.car === car).length;
SL.fp1Candidates = (G, tid) => {
  const ac = (G.academies || []).find(a => a.team === tid);
  const pool = G.db.drivers.filter(d => !d.retired && !d.injured && !d.banned && ((d.team === tid && d.seat === 'R') || (ac && ac.members.includes(d.id))));
  const own = pool.filter(d => SL.isRookie(d) && SL.status(G, d) !== 'none').sort((a, b) => driverOverall(b) - driverOverall(a));
  if (own.length) return own;
  // sem novato próprio: como na F1 real, a equipe "empresta" um piloto das categorias de base (F2, F3, Super Formula...)
  // com licença de treino livre que não esteja ligado a outra academia
  const inAcademy = new Set((G.academies || []).flatMap(a => a.members));
  return G.db.drivers.filter(d => !d.team && !d.retired && !d.injured && !d.banned && d.cat && !inAcademy.has(d.id) && SL.isRookie(d) && SL.status(G, d) !== 'none')
    .sort((a, b) => SL.points(G, b) - SL.points(G, a) || driverOverall(b) - driverOverall(a)).slice(0, 3);
};
SL.remainingFP1 = (G) => G.season.calendar.slice(G.season.round).filter(id => { const t = Career.track(G, id); return t && !t.sprint; }).length;
/* IA: cumpre a cota escolhendo fins de semana sem Sprint, espalhados pela temporada */
SL.aiPlan = (G, wk, track) => {
  if (track.sprint) return;
  const left = Math.max(1, SL.remainingFP1(G));
  G.db.teams.forEach(t => {
    if (t.id === G.player.teamId && !Career.isObs(G)) return;
    const cands = SL.fp1Candidates(G, t.id); if (!cands.length) return;
    [1, 2].forEach((car, k) => {
      const need = SL.FP1_PER_CAR - SL.fp1Done(G, t.id, car); if (need <= 0) return;
      const r = localRng(`fp1:${G.seed}:${G.season.year}:${G.season.round}:${t.id}:${car}`)();
      if (need >= left || r < need / left * 1.4) { const d = cands[k % cands.length]; if (d && !Object.values(wk.fp1[t.id] || {}).includes(d.id)) (wk.fp1[t.id] = wk.fp1[t.id] || {})[car] = d.id; }
    });
  });
};
SL.applyFP1 = (G, wk) => {
  Object.entries(wk.fp1 || {}).forEach(([tid, cars]) => Object.entries(cars).forEach(([car, did]) => {
    const d = Career.driver(G, did); if (!d) return;
    (SL.fp1(G)[tid] = SL.fp1(G)[tid] || []).push({ r: G.season.round, car: +car, did });
    const ok = !(d.pp || []).some(p => p.y === G.season.year && p.date === SL.dayOf(G));
    if (ok) { d.sl = d.sl || []; d.sl.push({ y: G.season.year, fp: true, pts: 1, r: G.season.round }); }
    d.experience = +clamp((d.experience ?? 50) + 0.4, 0, 99).toFixed(2); d.morale = clamp((d.morale ?? 70) + 3, 0, 100);
    if (tid === G.player.teamId && !Career.isObs(G)) {
      const lu = Career.lineup(G, tid); const main = lu[+car - 1];
      const s = main && wk.setups && wk.setups[main.id];
      if (s) { s.conf = Math.max(0, (s.conf ?? 70) - 4); if (s.satFinal != null) s.satFinal = Math.round(s.satFinal * 0.96); }
      Career.news(G, byLang(`${d.name} estreia num treino livre da F1 pela ${Career.team(G, tid).name}`, `${d.name} makes an F1 practice debut for ${Career.team(G, tid).name}`), 'equipe', byLang(`O novato correu o TL1 no lugar de ${main ? main.name : 'um titular'} e ganhou 1 ponto de superlicença.`, `The rookie ran FP1 in place of ${main ? main.name : 'a race driver'} and earned 1 super licence point.`), { dr: [d.id], tm: [tid] });
    }
  }));
};
SL.seasonCheck = (G) => {
  G.db.teams.forEach(t => {
    const miss = [1, 2].reduce((a, car) => a + Math.max(0, SL.FP1_PER_CAR - SL.fp1Done(G, t.id, car)), 0);
    if (!miss) return;
    const fine = +(miss * SL.FP1_FINE).toFixed(2);
    if (t.id === G.player.teamId && !Career.isObs(G)) Career.ledger(G, byLang(`Multa da FIA: ${miss} TL1 com novato não cumprido(s)`, `FIA fine: ${miss} missed rookie FP1 session(s)`), -fine, 'multa');
    else t.cash = +((t.cash || 0) - fine).toFixed(2);
    Career.news(G, byLang(`${t.name} é multada por não cumprir os treinos com novatos`, `${t.name} fined for missing rookie practice sessions`), 'regulamento', byLang(`Faltaram ${miss} sessões de TL1 com novato. Multa de ${fmtMoney(fine)}.`, `${miss} rookie FP1 session(s) missing. Fine: ${fmtMoney(fine)}.`), { tm: [t.id] });
  });
};

/* ---------- ganchos no ciclo do fim de semana e da temporada ---------- */
(function () {
  Hooks.around('Career', Career, 'startWeekend', 'sl', (sw, G, ...a) => {
    // suspensão por pontos: o piloto fica fora deste GP (o reserva entra pela escalação)
    G.db.drivers.forEach(d => { if (d.banNext) { d.banned = true; d.banNext = false; } });
    const r = sw(G, ...a);
    const wk = G.weekend;
    if (wk) {
      wk.fp1 = wk.fp1 || {}; const tr = Career.track(G, wk.trackId); try { SL.aiPlan(G, wk, tr); } catch (e) { /* sem cota */ }
      // aviso ao jogador quando a cota de novatos fica apertada
      if (!Career.isObs(G)) { const tid = G.player.teamId; const need = Math.max(...[1, 2].map(c => SL.FP1_PER_CAR - SL.fp1Done(G, tid, c))); const left = SL.remainingFP1(G);
        const key = `${G.season.year}:${need}:${left}`;
        if (need > 0 && left <= need + 1 && G.season.fp1Warn !== key) { G.season.fp1Warn = key; Career.mail(G, { from: byLang('Diretor esportivo', 'Sporting director'), tag: 'board', important: true, title: byLang('Cota de novatos no TL1 em risco', 'Rookie FP1 quota at risk'), body: byLang(`Ainda faltam treinos com novato (até ${need} por carro) e restam só ${left} GP(s) sem Sprint. Escolha o novato no painel do TL1, senão a FIA multa a equipe no fim do ano.`, `Rookie practice runs are still due (up to ${need} per car) with only ${left} non-Sprint GP(s) left. Pick the rookie in the FP1 panel or the FIA will fine the team at season end.`) }); }
      }
    }
    return r;
  });
  Hooks.around('Career', Career, 'finishPractice', 'sl', (fp, G, ...a) => { const r = fp(G, ...a); try { if (G.weekend && !G.weekend.fp1Applied) { SL.applyFP1(G, G.weekend); G.weekend.fp1Applied = true; } } catch (e) { /* sem efeito */ } return r; });
  Hooks.around('Career', Career, 'finishWeekend', 'sl', (fw, G, ...a) => {
    const wk = G.weekend; const race = wk && wk.race; const tr = wk && Career.track(G, wk.trackId);
    if (race && !race.ppDone) { try { SL.afterRace(G, race, tr ? tr.gp : ''); } catch (e) { /* sem pontos */ } race.ppDone = true; }
    const r = fw(G, ...a);
    // quem cumpriu a suspensão volta, com a contagem zerada (regra da FIA)
    G.db.drivers.forEach(d => { if (d.banned) { d.banned = false; d.pp = []; Career.news(G, byLang(`${d.name} cumpre a suspensão e volta para o próximo GP`, `${d.name} serves the ban and returns for the next GP`), 'regulamento', '', { dr: [d.id] }); } });
    return r;
  });
  Hooks.around('Career', Career, 'endSeason', 'sl', (es, G, ...a) => { try { SL.seasonCheck(G); } catch (e) { /* sem multa */ } return es(G, ...a); });
})();

/* ---------- comissários: direito de revisão e apelação (Código Esportivo Internacional, art. 14 e 15) ----------
   - Punições de tempo dadas DURANTE a corrida não admitem apelação; só o direito de revisão, que exige
     "elemento novo, significativo e relevante" e é julgado pelos mesmos comissários.
   - Decisões tomadas DEPOIS da corrida (desclassificação técnica: prancha gasta, peso abaixo do mínimo,
     amostra de combustível) admitem apelação ao Tribunal de Apelação da FIA.                            */
SL.REVIEW_FEE = 0.1; SL.APPEAL_FEE = 0.3;
SL.REVIEW_P = { colisao: 0.3, unsafe: 0.25, limites: 0.15, largada: 0.12, pitspeed: 0.08, vantagem: 0.25, bandeira: 0.1 };
SL.DSQ_TXT = { prancha: ['desgaste excessivo da prancha do assoalho', 'excessive plank wear'], peso: ['carro abaixo do peso mínimo', 'car below the minimum weight'], combustivel: ['amostra de combustível insuficiente', 'insufficient fuel sample'] };
SL.penTxt = (why) => { const w = (typeof Engine !== 'undefined' && Engine.PEN_TXT && Engine.PEN_TXT[why]) || SL.WHY[why] || [why, why]; return byLang(w[0], w[1]); };

/* refaz a classificação de uma etapa já gravada, corrigindo pontos, vitórias e pódios */
SL.reclassify = (G, idx, mutate) => {
  const s = G.season, res = s.results[idx]; if (!res) return null;
  const P = G.db.rules.points || [];
  const before = res.cls.map(r => ({ ...r }));
  mutate(res.cls);
  const fin = res.cls.filter(r => r.status === 'fin').sort((a, b) => (a.lapsDown || 0) - (b.lapsDown || 0) || a.T - b.T);
  const rest = res.cls.filter(r => r.status !== 'fin');
  fin.forEach((r, i) => { const old = before.find(x => x.did === r.did); const bonus = Math.max(0, old.pts - (P[old.pos - 1] || 0)); r.pos = i + 1; r.pts = (P[i] || 0) + (r.pos <= 10 ? bonus : 0); });
  rest.forEach((r, i) => { r.pos = fin.length + i + 1; if (r.status === 'dsq') r.pts = 0; });
  res.cls = fin.concat(rest);
  res.winner = res.cls[0].did;
  const changes = [];
  res.cls.forEach(r => {
    const o = before.find(x => x.did === r.did); const dp = r.pts - o.pts;
    const st = s.stats[r.did] || {}; const d = Career.driver(G, r.did);
    if (dp) { s.standD[r.did] = (s.standD[r.did] || 0) + dp; s.standC[r.tid] = (s.standC[r.tid] || 0) + dp; st.points = (st.points || 0) + dp; if (d) d.career.points += dp; }
    const wasW = o.status === 'fin' && o.pos === 1, isW = r.status === 'fin' && r.pos === 1;
    const wasP = o.status === 'fin' && o.pos <= 3, isP = r.status === 'fin' && r.pos <= 3;
    if (wasW !== isW) { const k = isW ? 1 : -1; st.wins = (st.wins || 0) + k; if (d) d.career.wins += k; }
    if (wasP !== isP) { const k = isP ? 1 : -1; st.podiums = (st.podiums || 0) + k; if (d) d.career.podiums += k; }
    const wasF = o.status === 'fin', isF = r.status === 'fin';
    st.sumPos = (st.sumPos || 0) + (isF ? r.pos : 0) - (wasF ? o.pos : 0);
    if (wasF !== isF) { st.finishes = (st.finishes || 0) + (isF ? 1 : -1); st.dnfs = (st.dnfs || 0) + (isF ? -1 : 1); }
    if (o.pos !== r.pos || dp) changes.push({ did: r.did, from: o.pos, to: r.pos, dp });
  });
  return changes;
};
SL.markPen = (G, idx, did, why, st) => { const r = G.season.results[idx]; const p = r && (r.pens || []).find(x => x.did === did && x.why === why && !x.rev); if (p) p.rev = st; };
SL.markDsq = (G, idx, did, st) => { const r = G.season.results[idx]; const x = r && r.cls.find(y => y.did === did); if (x) x.appeal = st; };
SL.changesTxt = (G, ch) => ch.filter(c => c.did).slice(0, 4).map(c => `${(Career.driver(G, c.did) || {}).name || c.did} P${c.from}→P${c.to}`).join(', ');

/* revisão aceita: cai a punição de tempo e os pontos na superlicença daquela etapa */
SL.applyReview = (G, rv) => {
  const s = G.season; if (!s || rv.year !== s.year) return null;
  if (rv.kind === 'grid') {
    if (G.gridPenalties && G.gridPenalties[rv.did]) { G.gridPenalties[rv.did] = Math.max(0, G.gridPenalties[rv.did] - (rv.n || 0)); if (!G.gridPenalties[rv.did]) delete G.gridPenalties[rv.did]; }
    SL.markPen(G, rv.idx, rv.did, rv.why, 'ok');
    const d0 = Career.driver(G, rv.did);
    Career.news(G, byLang(`Comissários retiram a punição de grid de ${d0 ? d0.name : ''}`, `Stewards withdraw ${d0 ? d0.name : ''}'s grid penalty`), 'regulamento', '', { dr: [rv.did] });
    return [];
  }
  const ch = SL.reclassify(G, rv.idx, cls => { const r = cls.find(x => x.did === rv.did); if (r) { r.T -= rv.s; r.penalty = Math.max(0, (r.penalty || 0) - rv.s); } });
  SL.markPen(G, rv.idx, rv.did, rv.why, 'ok');
  const d = Career.driver(G, rv.did);
  if (d && rv.pts) { const i = (d.pp || []).findIndex(p => p.y === rv.year && p.gp === rv.gp && p.why === rv.why); if (i >= 0) d.pp.splice(i, 1); if (d.banNext && SL.ppTotal(G, d) < SL.PP_LIMIT) d.banNext = false; }
  Career.news(G, byLang(`Comissários retiram a punição de ${d ? d.name : ''} no ${rv.gp}`, `Stewards withdraw ${d ? d.name : ''}'s penalty at the ${rv.gp}`), 'regulamento', byLang(`Novas imagens mudaram a decisão. Resultado corrigido: ${SL.changesTxt(G, ch || []) || 'sem mudança de posição'}.`, `New footage changed the decision. Corrected result: ${SL.changesTxt(G, ch || []) || 'no change of position'}.`), { dr: [rv.did] });
  return ch;
};
/* apelação aceita: desfaz a desclassificação */
SL.applyAppeal = (G, ap) => {
  const s = G.season; if (!s || ap.year !== s.year) return null;
  const ch = SL.reclassify(G, ap.idx, cls => { const r = cls.find(x => x.did === ap.did); if (r) r.status = 'fin'; });
  SL.markDsq(G, ap.idx, ap.did, 'ok');
  const d = Career.driver(G, ap.did);
  Career.news(G, byLang(`Tribunal de Apelação da FIA devolve o resultado de ${d ? d.name : ''} no ${ap.gp}`, `FIA Court of Appeal reinstates ${d ? d.name : ''}'s result at the ${ap.gp}`), 'regulamento', byLang(`A equipe provou que a medição estava errada. ${SL.changesTxt(G, ch || [])}.`, `The team proved the measurement was wrong. ${SL.changesTxt(G, ch || [])}.`), { dr: [ap.did] });
  return ch;
};

/* vistoria técnica depois da corrida: desclassificação (rara, como Hamilton e Leclerc em Austin 2023) */
SL.scrutineer = (G, idx, gp) => {
  const res = G.season.results[idx]; if (!res) return [];
  const strict = ((G.db.rules.regs || {}).penaltyStrictness) || 1;
  const out = [];
  res.cls.filter(r => r.status === 'fin' && r.pos <= 12).forEach(r => {
    if (!RNG.chance(0.0035 * strict)) return;
    const why = RNG.pick(['prancha', 'prancha', 'peso', 'combustivel']);
    SL.reclassify(G, idx, cls => { const x = cls.find(y => y.did === r.did); if (x) x.status = 'dsq'; });
    const x = res.cls.find(y => y.did === r.did); if (x) x.dsq = why;
    out.push({ did: r.did, tid: r.tid, why, pos: r.pos });
    const d = Career.driver(G, r.did); const w = SL.DSQ_TXT[why];
    Career.news(G, byLang(`${d.name} é desclassificado do ${gp}`, `${d.name} disqualified from the ${gp}`), 'regulamento', byLang(`Vistoria técnica: ${w[0]}. Perde o P${r.pos} e os pontos.`, `Technical inspection: ${w[1]}. Loses P${r.pos} and the points.`), { dr: [d.id], tm: [r.tid], main: r.pos <= 3 });
  });
  return out;
};

/* cartas da FIA para a equipe do jogador, com a escolha de pedir revisão ou apelar */
SL.stewardsMail = (G, race, idx, gp, dsq) => {
  if (Career.isObs(G)) return;
  const tid = G.player.teamId, y = G.season.year;
  const mine = (race.pens || []).filter(p => { const c = race.cars.find(x => x.did === p.did); return c && c.tid === tid && (c.status === 'fin' || p.kind === 'grid') && p.kind !== 'warn'; });
  // uma carta por piloto, com a punição mais pesada
  const by = {}; mine.forEach(p => { if (!by[p.did] || (p.s || 0) + (p.n || 0) * 3 > (by[p.did].s || 0) + (by[p.did].n || 0) * 3) by[p.did] = p; });
  Object.values(by).forEach(p => {
    const d = Career.driver(G, p.did); if (!d) return;
    const rv = { did: p.did, s: p.s, why: p.why, pts: p.pts || 0, idx, year: y, gp, kind: p.kind || 'time', n: p.n || 0 };
    const what = SL.penWhat(p);
    const fee = SL.REVIEW_FEE;
    Career.mail(G, { from: byLang('Comissários da FIA', 'FIA Stewards'), tag: 'fia', important: true,
      title: byLang(`${gp}: ${what[0]} para ${d.name} (${SL.penTxt(p.why)})`, `${gp}: ${what[1]} for ${d.name} (${SL.penTxt(p.why)})`),
      body: byLang(`A punição foi aplicada durante a corrida (volta ${p.lap}) e, pelo Código Esportivo, não admite apelação. A equipe pode pedir o direito de revisão, que só é aceito com um elemento novo, significativo e relevante (imagens de outra câmera, telemetria). Prazo: 96 horas. Taxa: ${fmtMoney(fee)}.`, `The penalty was given during the race (lap ${p.lap}) and, under the Sporting Code, cannot be appealed. The team may request a right of review, accepted only with a significant and relevant new element (other camera footage, telemetry). Deadline: 96 hours. Fee: ${fmtMoney(fee)}.`),
      choices: [
        { label: byLang(`Pedir direito de revisão (${fmtMoney(fee)})`, `Request a right of review (${fmtMoney(fee)})`), gamble: { p: SL.REVIEW_P[p.why] || 0.15, win: { money: -fee, moneyDesc: byLang('Taxa de revisão (FIA)', 'Review fee (FIA)'), review: rv }, lose: { money: -fee, moneyDesc: byLang('Taxa de revisão (FIA)', 'Review fee (FIA)'), board: -1, reviewNo: { idx, did: p.did, why: p.why, year: y } }, winText: byLang('Elemento novo aceito: a punição caiu e o resultado foi corrigido.', 'New element accepted: the penalty was withdrawn and the result corrected.'), loseText: byLang('Os comissários não viram elemento novo. A punição fica.', 'The stewards saw no new element. The penalty stands.') } },
        { label: byLang('Aceitar a decisão', 'Accept the decision'), effects: { reputation: 1 }, outcome: byLang('A equipe aceitou a decisão dos comissários.', 'The team accepted the stewards\' decision.') },
      ] });
  });
  dsq.filter(x => x.tid === tid).forEach(x => {
    const d = Career.driver(G, x.did); const w = SL.DSQ_TXT[x.why]; const fee = SL.APPEAL_FEE;
    const ap = { did: x.did, idx, year: y, gp };
    Career.mail(G, { from: byLang('Comissários da FIA', 'FIA Stewards'), tag: 'fia', important: true,
      title: byLang(`${gp}: ${d.name} desclassificado`, `${gp}: ${d.name} disqualified`),
      body: byLang(`Vistoria técnica: ${w[0]}. O P${x.pos} e os pontos foram retirados. Por ser uma decisão posterior à corrida, a equipe pode apelar ao Tribunal de Apelação da FIA. Taxa: ${fmtMoney(fee)}.`, `Technical inspection: ${w[1]}. P${x.pos} and the points were removed. As a post-race decision, the team may appeal to the FIA Court of Appeal. Fee: ${fmtMoney(fee)}.`),
      choices: [
        { label: byLang(`Apelar (${fmtMoney(fee)})`, `Appeal (${fmtMoney(fee)})`), gamble: { p: x.why === 'combustivel' ? 0.3 : 0.18, win: { money: -fee, moneyDesc: byLang('Apelação (FIA)', 'Appeal (FIA)'), appeal: ap, reputation: 1 }, lose: { money: -fee, moneyDesc: byLang('Apelação (FIA)', 'Appeal (FIA)'), reputation: -1, board: -2, appealNo: { idx, did: x.did, year: y } }, winText: byLang('Apelação aceita: o resultado foi devolvido.', 'Appeal upheld: the result was reinstated.'), loseText: byLang('Apelação negada. A desclassificação fica.', 'Appeal dismissed. The disqualification stands.') } },
        { label: byLang('Aceitar e revisar o procedimento', 'Accept and review the procedure'), effects: { board: -1, pitCrew: 1 }, outcome: byLang('A equipe aceitou e reforçou a checagem do carro antes da vistoria.', 'The team accepted and tightened the pre-inspection checks.') },
      ] });
  });
};

/* equipes da IA também pedem revisão de vez em quando */
SL.aiReviews = (G, race, idx, gp) => {
  (race.pens || []).filter(p => p.kind !== 'warn').forEach(p => {
    const c = race.cars.find(x => x.did === p.did); if (!c || c.tid === G.player.teamId || c.status !== 'fin') return;
    const res = G.season.results[idx]; const r = res && res.cls.find(x => x.did === p.did);
    if (!r || r.pos > 12 || !RNG.chance(0.25)) return;
    const d = Career.driver(G, p.did); const t = Career.team(G, c.tid);
    if (RNG.chance(SL.REVIEW_P[p.why] || 0.15)) SL.applyReview(G, { did: p.did, s: p.s, why: p.why, pts: p.pts || 0, idx, year: G.season.year, gp, kind: p.kind || 'time', n: p.n || 0 });
    else { SL.markPen(G, idx, p.did, p.why, 'no'); Career.news(G, byLang(`${t.name} pede revisão da punição de ${d.name} e ouve um não`, `${t.name} requests a review of ${d.name}'s penalty and is turned down`), 'regulamento', byLang('Os comissários não viram elemento novo.', 'The stewards saw no new element.'), { dr: [d.id], tm: [t.id] }); }
  });
};

(() => {
  Hooks.around('Events', Events, 'applyEffects', 'sl', (ae, G, fx) => {
    const out = ae(G, fx);
    try {
      if (fx && fx.review) { const ch = SL.applyReview(G, fx.review); out.push(byLang('Punição retirada', 'Penalty withdrawn') + (ch && ch.length ? ` · ${SL.changesTxt(G, ch)}` : '')); }
      if (fx && fx.reviewNo && fx.reviewNo.year === G.season.year) SL.markPen(G, fx.reviewNo.idx, fx.reviewNo.did, fx.reviewNo.why, 'no');
      if (fx && fx.appealNo && fx.appealNo.year === G.season.year) SL.markDsq(G, fx.appealNo.idx, fx.appealNo.did, 'no');
      if (fx && fx.appeal) { const ch = SL.applyAppeal(G, fx.appeal); out.push(byLang('Resultado devolvido', 'Result reinstated') + (ch && ch.length ? ` · ${SL.changesTxt(G, ch)}` : '')); }
    } catch (e) { /* sem efeito */ }
    return out;
  });
  Hooks.around('Career', Career, 'finishWeekend', 'sl#2', (fw, G, ...a) => {
    const wk = G.weekend; const race = wk && wk.race; const tr = wk && Career.track(G, wk.trackId);
    const r = fw(G, ...a);
    try {
      const idx = G.season.results.length - 1; const gp = tr ? tr.gp : '';
      if (race && idx >= 0 && G.season.results[idx].trackId === (tr && tr.id)) {
        G.season.results[idx].pens = (race.pens || []).map(p => ({ did: p.did, tid: (race.cars.find(c => c.did === p.did) || {}).tid, s: p.s, why: p.why, lap: p.lap, kind: p.kind || 'time', n: p.n }));
        // posições no grid da próxima corrida
        (race.gridPens || []).forEach(g => { G.gridPenalties = G.gridPenalties || {}; G.gridPenalties[g.did] = Math.min(30, (G.gridPenalties[g.did] || 0) + g.n); });
        SL.reopen(G, race, idx, gp);
        const dsq = SL.scrutineer(G, idx, gp);
        SL.aiReviews(G, race, idx, gp);
        SL.stewardsMail(G, race, idx, gp, dsq);
      }
    } catch (e) { /* sem comissários */ }
    return r;
  });
})();

/* texto da punição por tipo */
SL.penWhat = (p) => {
  const k = p.kind || 'time';
  if (k === 'grid') return [`${p.n} posições no grid`, `${p.n}-place grid drop`];
  if (k === 'dt') return ['drive-through', 'drive-through'];
  if (k === 'sg') return ['stop-and-go', 'stop-and-go'];
  if (k === 'warn') return ['advertência', 'warning'];
  return [`${p.s}s`, `${p.s}s`];
};
/* a partir de 2026 os comissários podem reabrir uma decisão por conta própria (imagem nova, telemetria) */
SL.reopen = (G, race, idx, gp) => {
  const nfa = (race.inv || []).filter(i => i.result === 'nfa');
  if (!nfa.length || !RNG.chance(0.06 * nfa.length)) return;
  const i = RNG.pick(nfa); const res = G.season.results[idx]; const row = res && res.cls.find(x => x.did === i.did);
  if (!row || row.status !== 'fin') return;
  const d = Career.driver(G, i.did); if (!d) return;
  SL.reclassify(G, idx, cls => { const r = cls.find(x => x.did === i.did); if (r) { r.T += 5; r.penalty = (r.penalty || 0) + 5; } });
  (res.pens = res.pens || []).push({ did: i.did, tid: row.tid, s: 5, why: i.why, lap: i.lap, kind: 'time', reopened: true });
  d.pp = d.pp || []; d.pp.push({ date: SL.dayOf(G), y: G.season.year, pts: 1, why: i.why, gp });
  Career.news(G, byLang(`Comissários reabrem o caso e punem ${d.name} no ${gp}`, `Stewards reopen the case and penalise ${d.name} at the ${gp}`), 'regulamento', byLang(`Imagens novas mostraram o incidente da volta ${i.lap} (${SL.penTxt(i.why)}). Pela regra de 2026, os próprios comissários podem rever a decisão: 5 s no tempo final.`, `New footage showed the lap ${i.lap} incident (${SL.penTxt(i.why)}). Under the 2026 rule the stewards themselves may revisit the decision: 5 s added to the final time.`), { dr: [d.id], main: true });
};

/* ---------- reserva que assume o carro (suspensão, lesão, doença) ----------
   Mesmo critério da FIA: só entra quem tem superlicença completa. Ordem: reserva da equipe,
   piloto da academia da equipe, piloto livre. Nunca o mesmo piloto nos dois carros. */
(() => {
  const ok = (G, d) => d && !d.retired && !d.injured && !d.banned && (d.age || 18) >= 18 && (!SL.status || SL.status(G, d) === 'full');
  Hooks.base('Career', Career, 'lineup', 'sl', (G, tid) => {
    const ds = Career.teamDrivers(G, tid);
    const seats = [1, 2].map(s => ds.find(d => d.seat === s));
    const used = new Set(seats.filter(d => d && !d.injured && !d.banned).map(d => d.id));
    const take = (d) => { used.add(d.id); return d; };
    return seats.map(d => {
      if (d && !d.injured && !d.banned) return d;
      const res = ds.filter(x => x.seat === 'R' && !used.has(x.id) && ok(G, x)).sort((a, b) => driverOverall(b) - driverOverall(a))[0];
      if (res) return take(res);
      const ac = (G.academies || []).find(a => a.team === tid);
      const acd = ac ? ac.members.map(id => Career.driver(G, id)).filter(x => x && !x.team && !used.has(x.id) && ok(G, x)).sort((a, b) => driverOverall(b) - driverOverall(a))[0] : null;
      if (acd) return take(acd);
      const free = G.db.drivers.filter(x => !x.team && !used.has(x.id) && ok(G, x)).sort((a, b) => driverOverall(b) - driverOverall(a))[0];
      if (free) return take(free);
      const any = G.db.drivers.filter(x => !x.team && !x.retired && !x.injured && !x.banned && !used.has(x.id)).sort((a, b) => driverOverall(b) - driverOverall(a))[0];
      return any ? take(any) : d;
    }).filter(Boolean);
  }, 'reserva que assume o carro precisa de superlicença; nunca o mesmo piloto nos dois carros');

})();
