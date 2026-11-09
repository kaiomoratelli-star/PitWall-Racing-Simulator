/* ============================================================
   PIT WALL — recalibração dos regulamentos (complementa Career.endSeason)
   - Regulamento novo: cada equipe acerta ou erra o conceito do carro.
     Pesa a força técnica (funcionários e instalações) e um pouco de sorte:
     equipe ruim pode virar boa e equipe boa pode cair, mas nem sempre.
   - Todos os anos: piso de diferença entre os carros, para o grid não
     ficar todo junto com o tempo (a ordem é mantida; só a distância cresce).
   ============================================================ */
'use strict';

const RegCal = {};
RegCal.TARGET_SD = 2.0;   // desvio-padrão mínimo do desempenho médio (aero + chassi) entre equipes
RegCal.normal = (r) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r());
RegCal.tech = (t) => {
  const vals = Object.values(t.staff || {}).filter(v => typeof v === 'number');
  const staff = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 72;
  return (staff - 72) / 10 + ((t.facilities ?? 70) - 70) / 25;
};
RegCal.concept = (G, year) => {
  const out = G.db.teams.map(t => {
    const r = localRng(`concept:${G.seed}:${t.id}:${year}`);
    // acerto do conceito: pesa mais a força técnica; a sorte existe, mas raramente vira o grid de cabeça para baixo
    // a força técnica pesa, mas o acerto do conceito tem muita sorte: uma equipe de fora do topo pode acertar em cheio (Brawn 2009)
    const delta = clamp(RegCal.tech(t) * 0.6 + RegCal.normal(r) * 2.4, -5, 5);
    t.car.aero = +(t.car.aero + delta * 0.6).toFixed(2);
    t.car.chassis = +(t.car.chassis + delta * 0.4).toFixed(2);
    t.concept = { y: year, delta: +delta.toFixed(2) };
    return { t, delta };
  }).sort((a, b) => b.delta - a.delta);
  // o melhor conceito costuma abrir vantagem real sobre o segundo (Mercedes 2014, Red Bull 2022)
  if (out[0] && out[1] && out[0].delta > 0) {
    const extra = +(Math.max(0, out[0].delta - out[1].delta) * 1.0 + 2.0).toFixed(2);
    out[0].t.car.aero = +(out[0].t.car.aero + extra * 0.6).toFixed(2); out[0].t.car.chassis = +(out[0].t.car.chassis + extra * 0.4).toFixed(2);
    out[0].delta = +(out[0].delta + extra).toFixed(2); out[0].t.concept.delta = out[0].delta;
  }
  const best = out[0], worst = out[out.length - 1];
  if (best && best.delta > 1.5) Career.news(G, byLang(`${best.t.name} acerta em cheio o regulamento de ${year}`, `${best.t.name} nails the ${year} regulations`), 'tecnica', byLang('Os primeiros dados de túnel e simulador apontam o carro novo entre os melhores conceitos do grid.', 'Early wind tunnel and simulator data put the new car among the best concepts on the grid.'), { tm: [best.t.id] });
  if (worst && worst.delta < -1.5) Career.news(G, byLang(`${worst.t.name} erra o conceito do carro de ${year}`, `${worst.t.name} gets the ${year} car concept wrong`), 'tecnica', byLang('A equipe admite que o projeto não respondeu como o esperado e promete reação ao longo do ano.', 'The team admits the design did not respond as expected and promises a reaction during the year.'), { tm: [worst.t.id] });
  Career.record(G, 'regulamento', `${year}: ${out.map(x => `${x.t.short || x.t.name} ${x.delta >= 0 ? '+' : ''}${x.delta.toFixed(1)}`).join(', ')} (acerto do conceito no regulamento novo).`, { year });
  return out;
};
RegCal.spread = (G) => {
  const ts = G.db.teams;
  const v = ts.map(t => (t.car.aero + t.car.chassis) / 2);
  const m = v.reduce((a, x) => a + x, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length);
  if (!(sd > 0) || sd >= RegCal.TARGET_SD) return sd;
  const k = Math.min(1.6, RegCal.TARGET_SD / sd) - 1;
  ts.forEach((t, i) => { const add = (v[i] - m) * k; t.car.aero = +(t.car.aero + add).toFixed(2); t.car.chassis = +(t.car.chassis + add).toFixed(2); });
  return RegCal.TARGET_SD;
};
(function () {
  Hooks.around('Career', Career, 'endSeason', 'regcal', (es, G) => {
    const r = es(G);
    const sum = (G.history || [])[G.history.length - 1];
    if (sum && sum.regChange && !sum.conceptDone) { RegCal.concept(G, sum.year + 1); sum.conceptDone = true; }
    RegCal.spread(G);
    return r;
  });
})();
