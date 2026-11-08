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
Market.slPoints = (G, d) => SL.points(G, d);          // o mercado passa a contar os pontos de treino livre
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
  const sw = Career.startWeekend;
  Career.startWeekend = (G, ...a) => {
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
  };
  const fp = Career.finishPractice;
  Career.finishPractice = (G, ...a) => { const r = fp(G, ...a); try { if (G.weekend && !G.weekend.fp1Applied) { SL.applyFP1(G, G.weekend); G.weekend.fp1Applied = true; } } catch (e) { /* sem efeito */ } return r; };
  const fw = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => {
    const wk = G.weekend; const race = wk && wk.race; const tr = wk && Career.track(G, wk.trackId);
    if (race && !race.ppDone) { try { SL.afterRace(G, race, tr ? tr.gp : ''); } catch (e) { /* sem pontos */ } race.ppDone = true; }
    const r = fw(G, ...a);
    // quem cumpriu a suspensão volta, com a contagem zerada (regra da FIA)
    G.db.drivers.forEach(d => { if (d.banned) { d.banned = false; d.pp = []; Career.news(G, byLang(`${d.name} cumpre a suspensão e volta para o próximo GP`, `${d.name} serves the ban and returns for the next GP`), 'regulamento', '', { dr: [d.id] }); } });
    return r;
  };
  const es = Career.endSeason;
  Career.endSeason = (G, ...a) => { try { SL.seasonCheck(G); } catch (e) { /* sem multa */ } return es(G, ...a); };
})();
