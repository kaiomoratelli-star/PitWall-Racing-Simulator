/* ============================================================
   PIT WALL — departamento de olheiros (V0.8.3, no estilo FM / F1 Manager)
   - Olheiros são pessoas: nome, nacionalidade, qualidade de avaliação
     (quanto erram), região de especialidade e salário. Há um mercado de
     olheiros; contratar custa e cada um ocupa uma vaga do departamento.
   - Missões: observar um piloto (relatório em ~4 etapas), cobrir uma
     categoria (todos os pilotos dela, aos poucos; relatório dos melhores)
     ou procurar talentos numa região (juniores das nacionalidades dela).
   - O jogador nunca vê o nível real: vê o NÍVEL ESTIMADO (com margem de
     erro) e a faixa de potencial. Olheiro bom erra menos; olheiro na sua
     região conhece melhor os pilotos de lá.
   ============================================================ */
'use strict';

const Scouting = {};
Scouting.REGIONS = {
  eu: { name: 'Europa', en: 'Europe', nats: ['GBR', 'ITA', 'GER', 'FRA', 'ESP', 'NED', 'FIN', 'POR', 'SWE', 'BEL', 'DEN', 'NOR', 'POL', 'AUT', 'SUI', 'CZE', 'EST', 'IRL', 'HUN'] },
  am: { name: 'América do Norte', en: 'North America', nats: ['USA', 'CAN', 'MEX'] },
  sa: { name: 'América do Sul', en: 'South America', nats: ['BRA', 'ARG', 'COL', 'CHI', 'URU', 'VEN', 'PER'] },
  ap: { name: 'Ásia-Pacífico', en: 'Asia-Pacific', nats: ['JPN', 'CHN', 'IND', 'AUS', 'NZL', 'KOR', 'THA', 'INA', 'MAS', 'SGP'] },
  me: { name: 'Oriente Médio', en: 'Middle East', nats: ['UAE', 'KSA', 'QAT', 'BRN', 'KUW', 'OMA', 'ISR', 'TUR'] },
};
Scouting.regionOf = (nat) => Object.keys(Scouting.REGIONS).find(k => Scouting.REGIONS[k].nats.includes(nat)) || 'eu';
Scouting.STARS = { geracional: 5, acima: 4.5, bom: 4, mediano: 3.5, mediocre: 3, vencedor: 2.5, pelotao: 2, coadjuvante: 1.5 };
Scouting.stars = (n) => '★'.repeat(Math.floor(n)) + (n % 1 ? '½' : '') + '☆'.repeat(5 - Math.ceil(n));
Scouting.MAX = 6;   // vagas do departamento

Scouting.genScout = (G, judgeBase, seed) => {
  const r = localRng(`olheiro:${G.seed}:${seed}`);
  const regs = Object.keys(Scouting.REGIONS);
  const region = regs[Math.floor(r() * regs.length)];
  const nat = Scouting.REGIONS[region].nats[Math.floor(r() * Scouting.REGIONS[region].nats.length)];
  const judge = Math.round(clamp(judgeBase + (r() - 0.5) * 24, 45, 95));
  return { id: 'sc' + seed, name: (typeof Talent !== 'undefined' && Talent.uniqueName(G, nat)) || randomName(nat), nat, region, judge, salary: +(0.05 + Math.max(0, judge - 50) * 0.005).toFixed(2), task: null };
};
Scouting.state = (G) => {
  const S = Potential.state(G);
  if (!S.staff) {
    const t = !Career.isObs(G) && Career.team(G);
    const base = t ? clamp(55 + ((t.staff && t.staff.technical) || 75) * 0.25, 60, 82) : 65;
    S.staff = [Scouting.genScout(G, base, 'a' + (G.seq || 1)), Scouting.genScout(G, base - 6, 'b' + (G.seq || 1))];
    S.mkt = [];
  }
  return S;
};
/* (0.9) só leitura, para as telas (regra 6): nunca cria o departamento. Quem cria é a simulação (Potential.tick,
   depois do primeiro GP) ou uma ação do jogador. Antes, abrir a tela de Olheiros antes do primeiro GP criava os
   olheiros com nomes do sorteio do jogo, e a carreira inteira saía diferente. */
Scouting.view = (G) => {
  const S = G.scout || {};
  return { staff: S.staff || [], mkt: S.mkt || [], reports: S.reports || [], ready: !!S.staff };
};
Scouting.refreshMarket = (G) => {
  const S = Scouting.state(G);
  S.mkt = Array.from({ length: 6 }, (_, i) => Scouting.genScout(G, 62 + i * 3, `m${G.season.year}${i}`));
};
Scouting.hire = (G, sid) => {
  const S = Scouting.state(G);
  const s = (S.mkt || []).find(x => x.id === sid);
  if (!s) return byLang('Olheiro indisponível.', 'Scout unavailable.');
  if (S.staff.length >= Scouting.MAX) return byLang(`O departamento já tem ${Scouting.MAX} olheiros.`, `The department already has ${Scouting.MAX} scouts.`);
  const fee = +(s.salary * 0.5).toFixed(2);
  if (G.finances.balance < fee) return byLang('Caixa insuficiente.', 'Not enough cash.');
  Career.ledger(G, byLang(`Olheiros: contratação de ${s.name}`, `Scouting: hiring ${s.name}`), -fee, 'staff');
  S.mkt = S.mkt.filter(x => x !== s); S.staff.push(s);
  return null;
};
Scouting.fire = (G, sid) => { const S = Scouting.state(G); S.staff = S.staff.filter(x => x.id !== sid); };
/* missão: {type: 'driver'|'series'|'region', target} */
Scouting.assign = (G, sid, task) => {
  const S = Scouting.state(G); const s = S.staff.find(x => x.id === sid);
  if (!s) return byLang('Olheiro não encontrado.', 'Scout not found.');
  s.task = task ? { ...task, races: 0, since: G.season.round } : null;
  return null;
};
/* ganho de conhecimento: qualidade do olheiro, região dele e quanto o piloto aparece (corre ou não) */
Scouting.gain = (s, d, base) => base * (0.6 + s.judge / 120) * (Scouting.regionOf(d.nat) === s.region ? 1.3 : 1) * (d.team || d.cat ? 1 : 0.6);
Scouting.tick = (G) => {
  if (Career.isObs(G)) return;
  const S = Scouting.state(G);
  S.judge = S.judge || {};
  S.staff.forEach(s => {
    const T = s.task; if (!T) return;
    T.races++;
    let pool = [];
    if (T.type === 'driver') pool = [Career.driver(G, T.target)].filter(Boolean);
    else if (T.type === 'series') pool = G.db.drivers.filter(d => !d.retired && (T.target === mainSeries() ? d.team : d.cat === T.target || d.series === T.target));
    else if (T.type === 'region') pool = G.db.drivers.filter(d => !d.retired && d.age <= 21 && Scouting.REGIONS[T.target] && Scouting.REGIONS[T.target].nats.includes(d.nat) && d.team !== G.player.teamId);
    const base = T.type === 'driver' ? 0.13 : T.type === 'series' ? 0.035 : 0.025;
    pool.forEach(d => { S.k[d.id] = Math.min(0.85, (S.k[d.id] || 0) + Scouting.gain(s, d, base)); S.judge[d.id] = Math.max(S.judge[d.id] || 0, s.judge); });
    if (T.type === 'driver' && T.races >= 4) { if (pool[0]) Potential.report(G, pool[0], s); s.task = null; }
    else if (T.type !== 'driver' && T.races % 6 === 0) Scouting.digest(G, s, pool);
  });
};
/* relatório de cobertura: os mais promissores que o olheiro encontrou */
Scouting.digest = (G, s, pool) => {
  const top = pool.filter(d => d.team !== G.player.teamId).map(d => ({ d, e: Potential.estimate(G, d) })).sort((a, b) => b.e.mid - a.e.mid).slice(0, 5);
  if (!top.length) return;
  const T = s.task;
  const where = T.type === 'region' ? byLang(Scouting.REGIONS[T.target].name, Scouting.REGIONS[T.target].en) : T.target === mainSeries() ? 'F1' : ((Cats.get(G, T.target) || {}).name || (typeof DriverDB !== 'undefined' ? DriverDB.seriesName(T.target) : T.target));
  const lines = top.map(x => `${x.d.name} (${x.d.age}, ${x.d.nat}) — ${Scouting.tierLabel(G, x.d)} · ${byLang('potencial', 'potential')} ${x.e.lo}–${x.e.hi}`).join('\n');
  Career.mail(G, { from: byLang('Departamento de olheiros', 'Scouting department'), tag: 'team', title: byLang(`${s.name}: destaques em ${where}`, `${s.name}: standouts in ${where}`), body: lines });
};
/* nível estimado (nunca o real): pela faixa de potencial que o departamento enxerga */
Scouting.tierEst = (G, d) => {
  const e = Potential.estimate(G, d);
  const t = Talent.of(e.mid);
  return { t, e, stars: Scouting.STARS[t.id] || 1.5 };
};
Scouting.tierLabel = (G, d) => { const x = Scouting.tierEst(G, d); return `${byLang(x.t.name, x.t.en)} ${Scouting.stars(x.stars)}`; };
Scouting.payroll = (G) => sum(Scouting.state(G).staff.map(s => s.salary));

(function () {
  // a qualidade de quem observou reduz o erro da estimativa
  Hooks.around('Potential', Potential, 'estimate', 'scouting', (est, G, d, viewer) => {
    const e = est(G, d, viewer);
    if (viewer && viewer !== G.player.teamId) return e;
    const S = Potential.state(G); const j = S.judge && S.judge[d.id];
    if (!j) return e;
    const tight = clamp((j - 55) / 80, 0, 0.45);                 // olheiro bom estreita a faixa e puxa para o valor real
    const mid = e.mid + (d.potential - e.mid) * tight;
    const half = Math.max(1, (e.hi - e.lo) / 2 * (1 - tight));
    const ovr = driverOverall(d);
    const lo = Math.round(Math.max(ovr, mid - half)), hi = Math.round(Math.min(99, Math.max(lo, mid + half)));
    return { ...e, lo, hi, mid: Math.round(mid) };
  });
  // observar um piloto pela tela antiga = mandar um olheiro livre (ou o primeiro) para a missão
  Hooks.base('Potential', Potential, 'observe', 'scouting', (G, did) => {
    const S = Scouting.state(G);
    const free = S.staff.find(s => !s.task);
    if (!free) return byLang('Todos os olheiros estão em missão. Libere um na aba Olheiros.', 'All scouts are on assignment. Free one in the Scouts tab.');
    Scouting.assign(G, free.id, { type: 'driver', target: did });
    return null;
  }, 'observar um piloto = mandar um olheiro do departamento');
  Hooks.base('Potential', Potential, 'cancel', 'scouting', (G, did) => { const S = Scouting.state(G); S.staff.forEach(s => { if (s.task && s.task.type === 'driver' && s.task.target === did) s.task = null; }); }, 'cancelar a missão do olheiro');
  Hooks.base('Potential', Potential, 'tick', 'scouting', (G) => Scouting.tick(G), 'o andamento das observações é o do departamento de olheiros');
  Hooks.around('Potential', Potential, 'report', 'scouting', (rep, G, d, s) => { rep(G, d); const R = Potential.state(G).reports[0]; if (R && R.did === d.id) { R.tier = Scouting.tierLabel(G, d); R.by = s ? s.name : null; } });
  // mercado de olheiros a cada temporada; salários no fim do ano
  Hooks.around('Career', Career, 'endSeason', 'scouting', (es, G) => {
    if (!Career.isObs(G)) { const p = +Scouting.payroll(G).toFixed(2); if (p) Career.ledger(G, byLang('Olheiros: salários do ano', 'Scouting: yearly salaries'), -p, 'staff'); }
    const r = es(G);
    if (!Career.isObs(G)) Scouting.refreshMarket(G);
    return r;
  });
})();
