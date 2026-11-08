/* ============================================================
   PIT WALL — desenvolvimento dos carros sem equalização (V0.8.3)
   - Fim do puxão anual para uma média fixa e do piso de diferença:
     o carro novo mantém a distância para a média do grid. A média
     absoluta fica estável (a escala não infla), as diferenças não.
     Em regulamento estável há uma convergência física leve (retornos
     decrescentes); no regulamento novo a convergência é maior e o
     acerto do conceito (regcal.js) embaralha.
   - Capacidade de desenvolvimento por equipe (engenheiros e instalações):
     equipes melhores carregam mais do que aprenderam para o carro novo.
   - IA com as mesmas dificuldades do jogador: fila de projetos limitada
     pelas vagas, prazo de entrega, falha, problema de correlação túnel ×
     pista e peça que ganha desempenho e perde confiabilidade.
   ============================================================ */
'use strict';

const CarDev = {};
/* capacidade técnica (0 a 1): engenheiros-chave e instalações (túnel, simulador, fábrica) */
CarDev.capacity = (t) => {
  const vals = Object.values(t.staff || {}).filter(v => typeof v === 'number');
  const staff = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 75;
  return clamp(((staff - 70) / 25) * 0.6 + (((t.facilities ?? 70) - 65) / 30) * 0.4, 0, 1);
};
/* eficiência da organização (0 a 1, oculta): processos, liderança técnica e cultura de engenharia.
   Começa pela reputação e pela história, muda devagar (resultados, crises, qualidade dos engenheiros)
   e pesa no rendimento de cada dólar investido — para a IA e para o jogador. É o que faz duas equipes
   que gastam o mesmo teto terem carros diferentes. */
CarDev.org = (t) => {
  if (t.org == null) {
    const r = localRng('org:' + t.id)();
    t.org = +clamp(0.35 + ((t.reputation ?? 60) - 55) / 60 + (t.works ? 0.06 : 0) + (r - 0.5) * 0.16, 0.15, 0.95).toFixed(3);
  }
  if (t.org0 == null) t.org0 = t.org;
  return t.org;
};
CarDev.orgMul = (t) => 0.75 + 0.5 * CarDev.org(t);
CarDev.orgYear = (G, sc) => {
  const n = G.db.teams.length;
  G.db.teams.forEach(t => {
    const pos = sc ? sc.findIndex(x => x.tid === t.id) + 1 : 0;
    const r = localRng(`orgy:${G.seed}:${t.id}:${G.season.year}`)();
    // volta devagar ao patamar histórico da organização (as grandes não ficam todas iguais no máximo)
    let d = (r - 0.5) * 0.05 + (CarDev.capacity(t) - CarDev.org(t)) * 0.02 + ((t.org0 ?? t.org) - CarDev.org(t)) * 0.05;
    if (pos === 1) d += 0.015; else if (pos && pos > n - 3) d -= 0.012;
    if ((t.costCut || 1) < 1) d -= 0.025;
    t.org = +clamp(CarDev.org(t) + d, 0.1, 0.97).toFixed(3);
  });
};
/* carro novo: mantém a distância para a média (convergência leve em regras estáveis, maior no regulamento novo) */
CarDev.newCars = (G, reg) => {
  const ts = G.db.teams;
  const caps = ts.map(t => (CarDev.capacity(t) + CarDev.org(t)) / 2), capAvg = caps.reduce((a, v) => a + v, 0) / caps.length;
  G.carRef = G.carRef || {};
  ['aero', 'chassis'].forEach(k => {
    const m = ts.reduce((a, t) => a + t.car[k], 0) / ts.length;
    if (G.carRef[k] == null) G.carRef[k] = +m.toFixed(2);
    ts.forEach((t, i) => {
      const r = localRng(`carro:${G.seed}:${t.id}:${k}:${G.season.year}`);
      const gap = t.car[k] - m;
      const keep = reg ? 0.5 : 0.9;        // anos estáveis: vantagem grande resiste; regulamento novo: zera boa parte (0.8.4: +fábrica e donos embaralham, então o carro mantém um pouco mais)
      const learn = (caps[i] - capAvg) * (reg ? 2.6 : 1.7);
      // o meio do pelotão se mexe todo ano; organização de ponta é mais constante (processos), a média oscila mais
      const noise = (r() + r() + r() - 1.5) * 5.2 * (1.4 - CarDev.org(t));
      t.car[k] = +(G.carRef[k] + gap * keep + learn + noise).toFixed(2);
    });
  });
};

/* ---------- IA: fila de projetos ---------- */
CarDev.queueOf = (t) => (t.devQ = t.devQ || []);
CarDev.full = (t) => CarDev.queueOf(t).length >= Career.slots(t);
/* cria o projeto (o dinheiro sai agora; o ganho chega em 1 a 5 etapas, se der certo) */
CarDev.start = (G, t, area, gain, bankShare, P) => {
  const cap = CarDev.capacity(t);
  const r = () => RNG.next();
  let g = gain, kind = 'ok';
  const fail = clamp(0.2 - cap * 0.14 + (P ? P.risk * 0.05 : 0), 0.04, 0.24);
  const corr = clamp(0.14 - cap * 0.1, 0.03, 0.14);
  const x = r();
  if (x < fail) { g *= RNG.range(-0.25, 0.25); kind = 'falha'; }
  else if (x < fail + corr) { g *= RNG.range(0.3, 0.6); kind = 'correlacao'; }
  const relLoss = area !== 'reliability' && r() < 0.25 + (P ? P.risk * 0.15 : 0) ? Math.abs(g) * RNG.range(0.1, 0.3) : 0;
  const delay = 1 + Math.floor(r() * 3) + (r() < 0.15 * (1 - cap) ? 2 : 0);
  const now = area === 'reliability' ? g : g * (1 - bankShare);
  const bank = area === 'reliability' ? 0 : g * bankShare * 1.3;
  CarDev.queueOf(t).push({ area, now: +now.toFixed(3), bank: +bank.toFixed(3), relLoss: +relLoss.toFixed(3), eta: G.season.round + delay, kind });
  return { g, kind };
};
/* entrega dos projetos que ficaram prontos */
CarDev.deliver = (G, t, all) => {
  const q = CarDev.queueOf(t);
  const due = q.filter(p => all || p.eta <= G.season.round);
  t.devQ = q.filter(p => !due.includes(p));
  due.forEach(p => {
    t.car[p.area] = +clamp(t.car[p.area] + p.now, 30, p.area === 'reliability' ? 99 : 110).toFixed(2);
    t.nextYearBank = +((t.nextYearBank || 0) + p.bank).toFixed(3);
    if (p.relLoss) t.car.reliability = +clamp(t.car.reliability - p.relLoss, 40, 99).toFixed(2);
    t.lastDev = { area: p.area, gain: p.now, kind: p.kind, round: G.season.round };
    if (p.kind === 'falha' && RNG.chance(0.35)) Career.news(G, byLang(`Atualização da ${t.name} não funciona na pista`, `${t.name} upgrade fails to work on track`), 'técnica', byLang('A peça nova não reproduziu os números do túnel de vento e a equipe voltou à especificação anterior.', 'The new part did not match the wind tunnel numbers and the team reverted to the previous spec.'), { tm: [t.id] });
    else if (p.kind === 'ok' && p.now > 1.2 && RNG.chance(0.6)) Career.news(G, `${t.name} estreia pacote de ${Career.AREAS[p.area] ? Career.AREAS[p.area].name.toLowerCase() : p.area} e impressiona no paddock`, 'técnica');
    if (p.kind !== 'ok') Career.record(G, 'pd', byLang(`${t.name}: projeto de ${p.area} ${p.kind === 'falha' ? 'falhou' : 'rendeu abaixo do previsto (correlação túnel × pista)'} (${p.now >= 0 ? '+' : ''}${p.now.toFixed(2)}).`, `${t.name}: ${p.area} project ${p.kind === 'falha' ? 'failed' : 'underdelivered (wind tunnel vs track correlation)'} (${p.now >= 0 ? '+' : ''}${p.now.toFixed(2)}).`), { teams: [t.id] });
  });
};

(function () {
  // eficiência da organização no fim de cada temporada (antes do carro novo)
  const es = Career.endSeason;
  Career.endSeason = (G) => { const sc = Career.standingsC(G); CarDev.orgYear(G, sc); return es(G); };
  // piso de diferença entre carros (regcal) sai: a diferença vem da economia e da capacidade de cada equipe
  if (typeof RegCal !== 'undefined') RegCal.spread = () => null;
})();
