'use strict';
/* =============================================================
   PEÇAS (0.8.6-B)
   - Danos por peça na corrida (asa dianteira, assoalho, suspensão, freios, câmbio) com conta de reparo
     dentro do teto de gastos. O motor (engine.js) registra os danos em race.dmg; aqui eles viram custo.
   ============================================================= */
const Parts = {};
/* custo de reparo em US$ milhões (peça inteira) — ordem de grandeza das equipes reais */
Parts.COST = { wing: 0.25, floor: 0.5, susp: 0.2, brakes: 0.1, gbx: 0.7 };
Parts.name = (p) => { const P = Engine.PARTS[p]; return P ? byLang(P[0], P[1]) : p; };

/* conta de reparos de uma corrida, agrupada por carro e peça */
Parts.bill = (race) => {
  const by = {};
  (race.dmg || []).forEach(x => {
    if (!Parts.COST[x.part]) return;
    const k = x.did + '|' + x.part;
    const b = by[k] || (by[k] = { did: x.did, tid: x.tid, part: x.part, sev: 0, dnf: false });
    b.sev = Math.min(1, b.sev + x.sev); if (x.dnf) b.dnf = true;
  });
  return Object.values(by).map(b => ({ ...b, cost: +(Parts.COST[b.part] * (b.dnf ? 1 : 0.4 + 0.6 * b.sev)).toFixed(3) }));
};

Parts.afterRace = (G, race, gp) => {
  const bill = Parts.bill(race); if (!bill.length) return [];
  const pt = G.player.teamId, obs = Career.isObs(G);
  bill.forEach(b => {
    if (b.tid === pt && !obs) Career.ledger(G, byLang(`Reparos: ${Parts.name(b.part)} de ${Career.driver(G, b.did).name}`, `Repairs: ${Parts.name(b.part)} of ${Career.driver(G, b.did).name}`), -b.cost, 'reparo');
    else { const t = Career.team(G, b.tid); if (t) t.spent = +((t.spent || 0) + b.cost).toFixed(3); }
  });
  const mine = bill.filter(b => b.tid === pt);
  if (mine.length && !obs) {
    const tot = mine.reduce((a, b) => a + b.cost, 0);
    const room = typeof Econ !== 'undefined' && Econ.capRoom ? Econ.capRoom(G, Career.team(G), G.finances.spent) : null;
    Career.mail(G, { from: byLang('Chefe de mecânicos', 'Chief mechanic'), tag: 'dev',
      title: byLang(`Danos no ${gp}: ${fmtMoney(tot)} em reparos`, `Damage at the ${gp}: ${fmtMoney(tot)} in repairs`),
      body: mine.map(b => `• ${Career.driver(G, b.did).name}: ${Parts.name(b.part)} (${b.dnf ? byLang('quebrou', 'failed') : Math.round(b.sev * 100) + '%'}) · ${fmtMoney(b.cost)}`).join('\n') + '\n\n' + byLang(`Os reparos entram no teto de gastos.${room != null ? ` Folga restante: ${fmtMoney(room)}.` : ''}`, `Repairs count towards the cost cap.${room != null ? ` Headroom left: ${fmtMoney(room)}.` : ''}`) });
  }
  return bill;
};

(() => {
  const fw = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => {
    const wk = G.weekend; const race = wk && wk.race; const tr = wk && Career.track(G, wk.trackId);
    let bill = [];
    if (race && !race.dmgDone) { try { bill = Parts.afterRace(G, race, tr ? tr.gp : ''); } catch (e) { /* sem conta */ } race.dmgDone = true; }
    const r = fw(G, ...a);
    if (G.lastRace && race) { G.lastRace.dmg = race.dmg || []; G.lastRace.bill = bill; }
    return r;
  };
})();

/* =============================================================
   UNIDADE DE POTÊNCIA E CÂMBIO POR COMPONENTE
   Regras da F1: cada piloto tem uma cota por temporada de cada elemento. O primeiro elemento além
   da cota custa 10 posições no grid (regulamento "Punição por componente extra"); cada um depois,
   5 posições. Acima de 15 posições no fim de semana, o piloto larga do fim do grid.
   Desgaste por corrida: mais em pistas de alta, no calor e com confiabilidade baixa.
   Peça gasta perde rendimento (motor) e quebra mais.
   ============================================================= */
Parts.PU = {
  ice: ['Motor de combustão (ICE)', 'Internal combustion engine (ICE)', 'ICE'],
  tc: ['Turbo (TC)', 'Turbocharger (TC)', 'TC'],
  mguk: ['MGU-K', 'MGU-K', 'MGU-K'],
  es: ['Bateria (ES)', 'Energy store (ES)', 'ES'],
  ce: ['Eletrônica de controle (CE)', 'Control electronics (CE)', 'CE'],
  exh: ['Escapamento (EX)', 'Exhaust (EX)', 'EX'],
  gbx: ['Câmbio', 'Gearbox', 'GB'],
};
Parts.KEYS = Object.keys(Parts.PU);
/* elemento além da cota é comprado à parte do fornecedor (fora do teto de chassi, como na F1) */
Parts.extraCost = (k) => ({ ice: 0.9, tc: 0.35, mguk: 0.45, es: 0.5, ce: 0.3, exh: 0.08, gbx: 0.4 })[k] || 0.3;
Parts.limit = (G, k) => { const R = Regs.r(G); return k === 'gbx' ? R.gearboxLimit : k === 'es' || k === 'ce' ? Math.max(2, R.puLimit - 2) : k === 'exh' ? R.puLimit * 2 : R.puLimit; };
Parts.pu = (G, d) => {
  if (!d.pu2 || d.pu2.y !== G.season.year) { d.pu2 = { y: G.season.year, c: {} }; Parts.KEYS.forEach(k => (d.pu2.c[k] = { used: 1, wear: 0, pen: 0 })); }
  return d.pu2;
};
/* motivo do abandono → componente quebrado */
Parts.fromReason = (reason) => { const r = String(reason || ''); return /motor|engine/i.test(r) ? 'ice' : /câmbio|gearbox/i.test(r) ? 'gbx' : /elétric|electric/i.test(r) ? 'ce' : /unidade de energia|energy store/i.test(r) ? 'es' : /superaquec|overheat/i.test(r) ? (RNG.chance(0.5) ? 'ice' : 'tc') : null; };
Parts.label = (k, short) => { const P = Parts.PU[k]; return short ? P[2] : byLang(P[0], P[1]); };

/* desgaste de uma corrida (0–100 por elemento) */
Parts.wearRace = (G, t, track, k, heat) => {
  const races = G.season.calendar.length; const life = races / Math.max(1, Parts.limit(G, k));
  const rel = Engine.reliability(G.db, t);
  const powerTrack = track && track.weights ? 1 + ((track.weights.engine ?? 0.33) - 0.33) * 0.9 : 1;
  return (100 / (life * 1.3)) * (1.08 - (rel - 80) / 250) * (k === 'gbx' || k === 'exh' ? 1 : powerTrack) * heat * RNG.range(0.85, 1.15);
};

/* troca um elemento; devolve as posições de punição (0 se dentro da cota) */
Parts.replace = (G, d, k, why) => {
  const P = Parts.pu(G, d).c[k]; P.used++; P.wear = 0;
  const lim = Parts.limit(G, k);
  if (P.used <= lim) return 0;
  const first = P.pen === 0; P.pen++;
  return first ? Regs.r(G).engineGridPenalty : Math.ceil(Regs.r(G).engineGridPenalty / 2);
};
/* soma as punições do fim de semana: acima de 15 posições, larga em último */
Parts.addGrid = (G, d, n, parts) => {
  if (!n) return;
  G.gridPenalties = G.gridPenalties || {};
  const tot = (G.gridPenalties[d.id] || 0) + n;
  G.gridPenalties[d.id] = tot > 15 ? 30 : tot;
  const t = Career.team(G, d.team);
  Career.news(G, byLang(`${d.name} recebe ${tot > 15 ? 'punição para largar em último' : `${tot} posições de punição no grid`} por elementos novos do motor`, `${d.name} gets ${tot > 15 ? 'a back-of-the-grid penalty' : `a ${tot}-place grid penalty`} for new power unit elements`), 'regulamento', byLang(`Novos elementos além da cota: ${parts.join(', ')}.`, `New elements beyond the allocation: ${parts.join(', ')}.`), { dr: [d.id], tm: t ? [t.id] : [] });
  Career.record(G, 'regulamento', `${d.name}: ${parts.join(', ')} além da cota — ${tot > 15 ? 'fim do grid' : tot + ' posições'}.`, { drivers: [d.id], teams: t ? [t.id] : [] });
};

/* depois da corrida: desgaste, quebras e trocas (substitui o modelo de unidade única) */
Regs.puTick = (G, race) => {
  const track = Career.track(G, race.trackId);
  const air = G.weekend && G.weekend.weather && G.weekend.weather.air ? G.weekend.weather.air[1] : 24;
  const heat = air > 28 ? 1 + (air - 28) * 0.02 : 1;
  const pt = G.player.teamId, obs = Career.isObs(G);
  race.cars.forEach(c => {
    const d = Career.driver(G, c.did); const t = Career.team(G, c.tid); if (!d || !t) return;
    const S = Parts.pu(G, d);
    const laps = c.laps || race.laps; const frac = clamp(laps / Math.max(1, race.laps), 0.1, 1);
    Parts.KEYS.forEach(k => { S.c[k].wear = Math.min(100, S.c[k].wear + Parts.wearRace(G, t, track, k, heat) * frac); });
    // dano no câmbio durante a corrida
    if (c.damage && c.damage.gbx) S.c.gbx.wear = Math.min(100, S.c.gbx.wear + c.damage.gbx * 45);
    const broke = c.status === 'dnf' ? Parts.fromReason(c.dnfReason) : null;
    const isMine = c.tid === pt && !obs;
    const swap = []; let pen = 0;
    Parts.KEYS.forEach(k => {
      const P = S.c[k];
      // a IA troca peças gastas sozinha; o jogador decide, a não ser que tenha quebrado
      if (k === broke || P.wear >= 100 || (!isMine && P.wear >= 97)) { pen += Parts.replace(G, d, k); swap.push(Parts.label(k, true)); }
    });
    if (pen) Parts.addGrid(G, d, pen, swap);
    if (pen && isMine) Career.ledger(G, byLang(`Elementos extras do motor (${d.name})`, `Extra power unit elements (${d.name})`), -swap.length * 0.4, 'motor');
    // aviso de peça no fim da vida (uma vez por elemento)
    if (isMine) { const worn = Parts.KEYS.filter(k => S.c[k].wear >= 85 && S.c[k].warned !== S.c[k].used); if (worn.length) { worn.forEach(k => (S.c[k].warned = S.c[k].used)); Career.mail(G, { from: byLang('Engenheiro de motor', 'Power unit engineer'), tag: 'dev', title: byLang(`${d.name}: ${worn.map(k => Parts.label(k, true)).join(', ')} no fim da vida útil`, `${d.name}: ${worn.map(k => Parts.label(k, true)).join(', ')} near end of life`), body: byLang(`Peça gasta quebra mais e perde rendimento. Troque na tela do Carro antes da classificação${worn.some(k => S.c[k].used >= Parts.limit(G, k)) ? '; a cota acabou, então haverá punição no grid. Escolha uma pista boa para ultrapassar' : ''}.`, `Worn parts fail more and lose performance. Swap them on the Car screen before qualifying${worn.some(k => S.c[k].used >= Parts.limit(G, k)) ? '; the allocation is used up, so a grid penalty applies. Pick a track that is good for overtaking' : ''}.`) }); } }
    if (isMine && swap.length) Career.mail(G, { from: byLang('Engenheiro de motor', 'Power unit engineer'), tag: 'dev', title: byLang(`${d.name}: ${swap.join(', ')} trocado(s)`, `${d.name}: ${swap.join(', ')} replaced`), body: byLang(`${broke ? 'Quebra na corrida. ' : 'Peça no fim da vida útil. '}${pen ? `Além da cota: ${pen} posições de punição no próximo grid.` : 'Dentro da cota, sem punição.'}`, `${broke ? 'Failure in the race. ' : 'Part at the end of its life. '}${pen ? `Beyond the allocation: ${pen}-place grid penalty at the next race.` : 'Within the allocation, no penalty.'}`) });
  });
};

/* troca estratégica pedida pelo jogador antes da classificação */
Parts.swapNow = (G, did, k) => {
  const d = Career.driver(G, did); if (!d) return null;
  const pen = Parts.replace(G, d, k);
  if (pen) Parts.addGrid(G, d, pen, [Parts.label(k, true)]);
  return pen;
};
/* risco e perda de rendimento por desgaste, aplicados no início da corrida */
Parts.raceMods = (G, did) => {
  const d = Career.driver(G, did); if (!d) return { risk: 1, pace: 0 };
  const S = Parts.pu(G, d).c;
  const worst = Math.max(...Parts.KEYS.map(k => S[k].wear));
  const risk = 1 + Math.max(0, worst - 70) / 30 * 1.2;                 // até 2,2× a chance de quebra
  const pace = Math.max(0, S.ice.wear - 55) / 45 * 0.12 + Math.max(0, S.mguk.wear - 70) / 30 * 0.05;   // motor gasto perde potência
  return { risk: +risk.toFixed(2), pace: +pace.toFixed(3) };
};
(() => {
  const sr = Career.startRace;
  Career.startRace = (G, ...a) => {
    const r = sr(G, ...a);
    try { const race = G.weekend && G.weekend.race; if (race) race.cars.forEach(c => { const m = Parts.raceMods(G, c.did); c.puRisk = m.risk; c.puPace = m.pace; }); } catch (e) { /* sem efeito */ }
    return r;
  };
})();

/* =============================================================
   TESTES DE PRÉ-TEMPORADA (regulamento "Dias de teste")
   - Carro novo: a familiaridade dos pilotos cai no início do ano e sobe com os dias de teste.
   - Menos dias de teste = mais quebras nas primeiras etapas (o risco some até a 6ª etapa).
   - O jogador escolhe o foco do programa: confiabilidade, acerto/correlação ou desempenho.
   - Tabela de tempos dos testes vira notícia (com "sandbagging": tempos de teste enganam).
   ============================================================= */
const Testing = {};
Testing.days = (G) => clamp(Number(Regs.r(G).testingDays) || 0, 0, 12);
/* fator de quebra extra no começo da temporada */
Testing.riskMul = (G, tid) => {
  const s = G.season; if (!s) return 1;
  const T = (s.tests || {})[tid] || {}; const days = Testing.days(G);
  const base = Math.max(0, 0.38 - 0.07 * days) * (T.prog === 'rel' ? 0.4 : T.prog === 'perf' ? 1.3 : 1);
  return 1 + base * Math.max(0, 1 - (s.round || 0) / 6);
};
Testing.run = (G, first) => {
  const s = G.season; const days = Testing.days(G); s.tests = {};
  // familiaridade com o carro novo
  G.db.drivers.filter(d => d.team && !d.retired).forEach(d => {
    const now = d.carFam ?? Math.round(clamp(62 + (d.experience ?? 50) * 0.25, 40, 92));
    d.carFam = Math.round(clamp((first ? now : now * 0.55 + 22) + days * 3, 30, 95));
  });
  if (!days) { Career.news(G, byLang(`Sem testes de pré-temporada em ${s.year}: as equipes chegam às cegas`, `No pre-season testing in ${s.year}: teams arrive blind`), 'regulamento'); return; }
  // tabela de tempos: ritmo real + programa + blefe
  const times = G.db.teams.map(t => ({ t, v: Engine.carRating(G.db, t) + RNG.normal(0, 1.4) + (RNG.chance(0.25) ? -2.2 : 0) })).sort((a, b) => b.v - a.v);
  const laps = G.db.teams.map(t => ({ t, n: Math.round(days * RNG.range(110, 150) * (Engine.reliability(G.db, t) / 90)) })).sort((a, b) => b.n - a.n);
  s.testTable = times.map((x, i) => ({ tid: x.t.id, pos: i + 1, gap: +((times[0].v - x.v) * 0.12).toFixed(3), laps: (laps.find(y => y.t.id === x.t.id) || {}).n || 0 }));
  Career.news(G, byLang(`Testes de ${s.year}: ${times[0].t.name} termina na frente após ${days} dias`, `${s.year} testing: ${times[0].t.name} ends on top after ${days} days`), 'corrida', byLang(`Mais voltas: ${laps[0].t.name} (${laps[0].n}). Menos: ${laps[laps.length - 1].t.name} (${laps[laps.length - 1].n}). Nos testes ninguém mostra tudo: cargas de combustível e motores variam.`, `Most laps: ${laps[0].t.name} (${laps[0].n}). Fewest: ${laps[laps.length - 1].t.name} (${laps[laps.length - 1].n}). Nobody shows everything in testing: fuel loads and engine modes vary.`), { tm: [times[0].t.id], main: true });
  if (Career.isObs(G)) return;
  const me = s.testTable.find(x => x.tid === G.player.teamId) || {};
  const n = days;
  Career.mail(G, { from: byLang('Diretor técnico', 'Technical director'), tag: 'dev', important: true,
    title: byLang(`Testes de pré-temporada: ${n} ${n === 1 ? 'dia' : 'dias'}. Qual o foco?`, `Pre-season testing: ${n} ${n === 1 ? 'day' : 'days'}. What is the focus?`),
    body: byLang(`Fechamos em ${ordinal(me.pos || 0)} na tabela de tempos com ${me.laps || 0} voltas. Ainda dá para decidir como usar os dados e as horas de pista que restam.`, `We ended ${ordinal(me.pos || 0)} on the timesheet with ${me.laps || 0} laps. We can still decide how to use the data and remaining track time.`),
    choices: [
      { label: byLang('Confiabilidade: rodar muito, achar as quebras agora', 'Reliability: run long, find the failures now'), effects: { testProg: 'rel', car: { reliability: +(0.3 * n / 3).toFixed(2) } }, outcome: byLang('Programa de quilometragem: menos sustos nas primeiras corridas.', 'Mileage programme: fewer scares in the first races.') },
      { label: byLang('Acerto e correlação: os pilotos aprendem o carro', 'Setup and correlation: drivers learn the car'), effects: { testProg: 'setup' }, outcome: byLang('Os pilotos chegam à 1ª etapa conhecendo o carro.', 'The drivers reach round 1 knowing the car.') },
      { label: byLang('Desempenho: testar peças novas e forçar o limite', 'Performance: test new parts and push the limit'), gamble: { p: 0.6, win: { testProg: 'perf', car: { aero: +(0.5 * n / 3).toFixed(2) } }, lose: { testProg: 'perf', car: { aero: 0.1 } }, winText: byLang('As peças novas funcionaram na pista.', 'The new parts worked on track.'), loseText: byLang('A correlação falhou: pouco ganho e mais risco de quebra no início.', 'Correlation failed: little gain and more early failure risk.') } },
    ] });
};
(() => {
  const ss = Career.startSeason;
  Career.startSeason = (G, first, ...a) => { const r = ss(G, first, ...a); try { Testing.run(G, !!first); } catch (e) { /* sem testes */ } return r; };
  const ae = Events.applyEffects;
  Events.applyEffects = (G, fx) => {
    const out = ae(G, fx);
    try {
      if (fx && fx.testProg && G.season) {
        const tid = G.player.teamId; (G.season.tests = G.season.tests || {})[tid] = { prog: fx.testProg };
        if (fx.testProg === 'setup') Career.teamDrivers(G, tid).forEach(d => (d.carFam = clamp((d.carFam ?? 70) + 2 * Testing.days(G), 0, 98)));
        out.push(byLang({ rel: 'Foco em confiabilidade', setup: 'Foco em acerto', perf: 'Foco em desempenho' }[fx.testProg], { rel: 'Reliability focus', setup: 'Setup focus', perf: 'Performance focus' }[fx.testProg]));
      }
    } catch (e) { /* sem efeito */ }
    return out;
  };
  // o fator de testes entra no risco de quebra junto com o desgaste do motor
  const sr = Career.startRace;
  Career.startRace = (G, ...a) => { const r = sr(G, ...a); try { const race = G.weekend && G.weekend.race; if (race) race.cars.forEach(c => { c.puRisk = +((c.puRisk || 1) * Testing.riskMul(G, c.tid)).toFixed(2); }); } catch (e) { /* nada */ } return r; };
})();

/* =============================================================
   CONGELAMENTOS VOTADOS NO CONSELHO
   - Motores congelados: nada de evolução de potência ou energia; correções de confiabilidade continuam
     liberadas (como na F1 real de 2022 a 2025).
   - Chassi congelado: o carro do ano fica homologado; só confiabilidade e projetos do carro seguinte.
   ============================================================= */
Parts.freezeBlock = (G, area, next) => {
  const R = Regs.r(G); const S = RnD.SPEC[area]; if (!S) return null;
  if (R.engineFreeze && S.kind === 'pu' && area !== 'reliability') return byLang('Motores congelados pelo Conselho: só correções de confiabilidade são permitidas.', 'Engines frozen by the Council: only reliability fixes are allowed.');
  if (R.chassisFreeze && !next && (S.kind === 'aero' || S.kind === 'mech') && area !== 'reliability') return byLang('Chassi congelado nesta temporada: só confiabilidade e projetos para o carro do ano seguinte.', 'Chassis frozen this season: only reliability and projects for next year\'s car.');
  return null;
};
(() => {
  if (typeof RnD !== 'undefined' && RnD.quote) {
    const q0 = RnD.quote;
    RnD.quote = (G, cfg) => { const q = q0(G, cfg); try { if (q && !q.blocked) q.blocked = Parts.freezeBlock(G, q.area || cfg.area, !!(q.next ?? cfg.next)); } catch (e) { /* nada */ } return q; };
  }
  if (typeof CarDev !== 'undefined' && CarDev.start) {
    const s0 = CarDev.start;
    // IA: com o chassi congelado, todo o ganho de aero/chassi vai para o carro do ano seguinte
    CarDev.start = (G, t, area, gain, bankShare, P) => s0(G, t, area, gain, Regs.r(G).chassisFreeze && area !== 'reliability' ? 1 : bankShare, P);
  }
})();

/* teste de meio de ano (1 dia, se o regulamento prevê testes): acerto, peças novas ou pneus */
Testing.midSeason = (G) => {
  const s = G.season; if (!s || s.midTest || !Testing.days(G)) return;
  if (s.round < Math.floor(s.calendar.length / 2)) return;
  s.midTest = true;
  // equipes da IA: ganho médio pequeno, para não ficarem para trás
  G.db.teams.forEach(t => { if (t.id === G.player.teamId && !Career.isObs(G)) return; const k = RNG.pick(['aero', 'chassis', 'tyreCare']); if (t.car && t.car[k] != null) t.car[k] = +clamp(t.car[k] + RNG.range(0, 0.3), 30, 110).toFixed(2); });
  if (Career.isObs(G)) return;
  Career.mail(G, { from: byLang('Diretor técnico', 'Technical director'), tag: 'dev', important: true,
    title: byLang('Teste de meio de temporada: o que vamos testar?', 'Mid-season test: what do we test?'),
    body: byLang('Temos um dia de pista depois desta etapa. Dá para focar em uma coisa só.', 'We have one track day after this round. We can focus on one thing only.'),
    choices: [
      { label: byLang('Acerto: os pilotos refinam o carro', 'Setup: drivers refine the car'), effects: { testProg: 'setup' }, outcome: byLang('Os pilotos saíram do teste mais confiantes com o carro.', 'The drivers left the test more confident in the car.') },
      { label: byLang('Peças novas: validar o pacote de atualização', 'New parts: validate the upgrade package'), gamble: { p: 0.55, win: { car: { aero: 0.4 } }, lose: { car: { aero: 0.05 } }, winText: byLang('O pacote funcionou como no túnel.', 'The package worked as in the tunnel.'), loseText: byLang('Os números da pista não bateram com o túnel.', 'Track numbers did not match the tunnel.') } },
      { label: byLang('Pneus: entender a janela de temperatura', 'Tyres: understand the temperature window'), effects: { car: { tyreCare: 0.35 } }, outcome: byLang('Aprendemos a ligar os pneus mais rápido e a cuidar deles no stint.', 'We learned to switch the tyres on faster and look after them in the stint.') },
    ] });
};
(() => {
  const fw = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => { const r = fw(G, ...a); try { Testing.midSeason(G); } catch (e) { /* sem teste */ } return r; };
})();
