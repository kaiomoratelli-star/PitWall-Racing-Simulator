/* ============================================================
   PIT WALL — potencial dinâmico, potencial oculto e olheiros
   - O potencial real (d.potential) muda a cada fim de temporada:
     volatilidade alta no kart/F4 e baixa em quem já é profissional;
     sobe ou desce conforme o rendimento contra o esperado (carro,
     categoria, companheiro). A partir de ~27 anos converge para a nota
     atual (estagnação) e pode regredir. Uma corrida ruim não muda nada:
     a avaliação é por temporada.
   - No modo Manager o jogador nunca vê o número: vê uma faixa estimada
     com confiança, que estreita com observação (olheiros), tempo de pista
     e convivência (pilotos da própria equipe e academia).
   - As equipes do jogo também decidem por estimativas (com erro).
   ============================================================ */
'use strict';

const Potential = {};
Potential.vol = (age) => (age <= 16 ? 4.5 : age <= 18 ? 3.5 : age <= 20 ? 2.6 : age <= 23 ? 1.7 : age <= 26 ? 1.0 : 0.5);

/* rendimento da temporada contra o esperado (-1 a 1) */
Potential.performance = (G, d) => {
  const st = G.season && G.season.stats[d.id];
  if (d.team && d.seat !== 'R' && st && st.starts >= 5) {
    const exp = Career.expectedRanks(G)[d.team] || 6;               // posição esperada da equipe (1–11)
    const avgPos = st.finishes ? st.sumPos / st.finishes : 18;
    const vsCar = clamp((exp * 2 - avgPos) / 10, -1, 1);           // terminar à frente do que o carro dá
    const vsMate = st.starts ? (st.beatMate / st.starts - 0.5) * 2 : 0;
    return clamp(vsCar * 0.55 + vsMate * 0.45, -1, 1);
  }
  if (d.cat && typeof Cats !== 'undefined') {
    const cat = Cats.get(G, d.cat);
    if (cat && cat.season && cat.season.res && cat.season.res.length) {
      const tab = Cats.standings(cat);
      const pos = tab.findIndex(x => x.did === d.id) + 1;
      if (pos > 0) {
        const byRating = cat.entries.map(e => Career.driver(G, e.did)).filter(Boolean).sort((a, b) => driverOverall(b) - driverOverall(a));
        const exp = byRating.indexOf(d) + 1 || tab.length / 2;
        return clamp((exp - pos) / Math.max(4, tab.length / 2), -1, 1);
      }
    }
  }
  return 0;
};

/* fim de temporada: o potencial real se move (antes do envelhecimento e da evolução) */
Potential.evolve = (G) => {
  const y = G.season.year;
  G.db.drivers.forEach(d => {
    if (d.retired || d.dead || d.age >= 34) return;
    const r = localRng(`potv:${G.seed}:${d.id}:${y}`);
    const v = Potential.vol(d.age);
    const ovr = driverOverall(d);
    const perf = Potential.performance(G, d);
    let delta = v * (r() * 2 - 1) * 0.55 + perf * v * 0.9;
    if (d.age >= 27) delta = Math.min(delta, 0) - 0.35 * (d.age - 26) * 0.4;   // estagnação e regressão
    const pot = clamp(d.potential + delta, ovr, 99);
    d.potential = Math.round(pot);
    d.potHist = (d.potHist || []).concat([[y, d.potential]]).slice(-12);
  });
};

/* ---------- conhecimento e estimativa ---------- */
Potential.state = (G) => (G.scout = G.scout || { k: {}, jobs: [], reports: [] });
Potential.knowledge = (G, d) => {
  const S = Potential.state(G);
  const mine = !Career.isObs(G) && (d.team === G.player.teamId || (typeof Market !== 'undefined' && (Market.myAcademy(G) || {}).members && Market.myAcademy(G).members.includes(d.id)));
  let k = mine ? 0.8 : d.team ? 0.45 + Math.min(0.25, (d.career ? d.career.starts : 0) / 200) : d.cat ? 0.22 : 0.15;
  k += Math.min(0.2, (d.experience || 0) / 300);
  return clamp(k + (S.k[d.id] || 0), 0.05, 0.95);
};
Potential.estimate = (G, d, viewer) => {
  const conf = viewer && viewer !== G.player.teamId ? 0.55 : Potential.knowledge(G, d);
  const ageF = 1 + Math.max(0, 22 - d.age) * 0.04;
  const width = (1 - conf) * 17 * ageF + 2;
  const bias = (localRng(`pb:${G.seed}:${d.id}:${viewer || 'me'}`)() * 2 - 1) * (1 - conf) * 11;
  const ovr = driverOverall(d);
  const mid = clamp(d.potential + bias, ovr, 99);
  // a faixa mantém a largura: se encosta no teto (99) ou na nota atual, desliza em vez de encolher
  let lo = mid - width / 2, hi = mid + width / 2;
  if (hi > 99) { lo -= hi - 99; hi = 99; }
  if (lo < ovr) { hi = Math.min(99, hi + (ovr - lo)); lo = ovr; }
  lo = Math.round(lo); hi = Math.round(Math.max(lo, hi));
  return { lo, hi, mid: Math.round(mid), conf, label: conf < 0.45 ? 'baixa' : conf < 0.75 ? 'média' : 'alta' };
};
/* o que as equipes do jogo enxergam (para o mercado): estimativa com erro, nunca o número real */
Potential.seenBy = (G, d, tid) => (G && G.season ? Potential.estimate(G, d, tid || 'ai').mid : d.potential);

/* ---------- olheiros ---------- */
Potential.SLOTS = 3;
Potential.ROUNDS = 4;
Potential.observe = (G, did) => {
  const S = Potential.state(G);
  if (S.jobs.some(j => j.did === did)) return 'Já está sendo observado.';
  if (S.jobs.length >= Potential.SLOTS) return `Todos os ${Potential.SLOTS} olheiros estão ocupados.`;
  S.jobs.push({ did, left: Potential.ROUNDS, since: G.season.round, year: G.season.year });
  Career.ledger(G, `Olheiros: observação de ${Career.driver(G, did).name}`, -0.05, 'academia');
  return null;
};
Potential.cancel = (G, did) => { const S = Potential.state(G); S.jobs = S.jobs.filter(j => j.did !== did); };
/* depois de cada GP: conhecimento cresce; ao fim, relatório na caixa de entrada */
Potential.tick = (G) => {
  if (Career.isObs(G)) return;
  const S = Potential.state(G);
  S.jobs.forEach(j => {
    const d = Career.driver(G, j.did); if (!d) { j.left = 0; return; }
    const racing = d.team || d.cat;
    S.k[d.id] = Math.min(0.75, (S.k[d.id] || 0) + (racing ? 0.12 : 0.07));
    j.left--;
    if (j.left <= 0) Potential.report(G, d);
  });
  S.jobs = S.jobs.filter(j => j.left > 0);
};
Potential.ATTR_LABEL = { pace: 'velocidade', racecraft: 'inteligência de corrida', consistency: 'consistência', tyre: 'controle de pneus', wet: 'chuva', overtaking: 'ultrapassagem', defending: 'defesa', qualifying: 'classificação', start: 'largada', energy: 'gestão de energia', adaptability: 'adaptabilidade', concentration: 'concentração', feedback: 'feedback técnico' };
Potential.report = (G, d) => {
  const S = Potential.state(G);
  const e = Potential.estimate(G, d);
  const attrs = Object.keys(Potential.ATTR_LABEL).filter(k => d[k] != null).sort((a, b) => d[b] - d[a]);
  const best = attrs.slice(0, 3).map(k => Potential.ATTR_LABEL[k]), worst = attrs.slice(-2).map(k => Potential.ATTR_LABEL[k]);
  const where = d.team ? Career.team(G, d.team).name : d.cat && Cats.get(G, d.cat) ? Cats.get(G, d.cat).name : d.series && typeof DriverDB !== 'undefined' ? DriverDB.seriesName(d.series) : 'sem equipe';
  const rec = e.mid >= 88 ? 'talento raro: vale prioridade' : e.mid >= 82 ? 'pode chegar à F1 com o desenvolvimento certo' : e.mid >= 76 ? 'bom piloto de categoria de acesso; F1 é improvável' : 'não recomendamos investimento';
  const rep = { y: G.season.year, r: G.season.round, did: d.id, lo: e.lo, hi: e.hi, conf: e.label, best, worst, rec };
  S.reports.unshift(rep); if (S.reports.length > 60) S.reports.length = 60;
  Career.mail(G, { from: 'Departamento de olheiros', tag: 'team', title: `Relatório de observação: ${d.name}`, body: `${d.name} (${d.age} anos, ${where}).\nNota atual ${driverOverall(d)}. Potencial estimado: ${e.lo}–${e.hi} (confiança ${e.label}).\nPontos fortes: ${best.join(', ')}. A melhorar: ${worst.join(', ')}.\nRecomendação: ${rec}.` });
};
