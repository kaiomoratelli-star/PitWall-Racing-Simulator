/* ============================================================
   PIT WALL — Conselho da FIA (Comissão de F1)
   Três reuniões por temporada. FIA, Fórmula 1 e cada equipe votam
   mudanças técnicas, esportivas, de custos e de calendário.
   Para aprovar: FIA, Fórmula 1 e 60% das equipes (mudança que vale já
   na temporada atual: 80%). Ninguém tem veto (extinto na V0.8.4).
   Concessões: quando a proposta fica perto de passar, quem propõe (FIA,
   Fórmula 1 ou a equipe autora) oferece dinheiro ou horas de túnel às
   equipes indecisas ou contrárias em troca do voto.
   Cada equipe vota pelo próprio interesse (motor, orçamento, aerodinâmica,
   posição no campeonato, GP em casa), segue a fornecedora de motor em
   temas técnicos e a equipe principal quando é equipe irmã.
   O jogador vota, negocia com cada equipe (capital político e acordos)
   e pode levar uma proposta própria para a reunião seguinte.
   Tudo usa RNG local com a semente da carreira: não altera o resto da simulação.
   ============================================================ */
'use strict';

const Council = {};
Council.MEETS = [0.22, 0.5, 0.78];
Council.CATS = { tec: 'Técnico', dev: 'Custos e desenvolvimento', esp: 'Esportivo', cir: 'Calendário e circuitos' };
Council.CLASSICS = new Set(['monaco', 'silverstone', 'monza', 'spa-francorchamps', 'suzuka', 'interlagos', 'montreal', 'melbourne']);
Council.GP = { 'paul-ricard': 'GP da França', 'magny-cours': 'GP da França', hockenheimring: 'GP da Alemanha', nurburgring: 'GP da Alemanha', portimao: 'GP de Portugal', estoril: 'GP de Portugal', mugello: 'GP da Toscana', istanbul: 'GP da Turquia', jacarepagua: 'GP do Rio de Janeiro', indianapolis: 'GP de Indianápolis', 'buenos-aires': 'GP da Argentina', kyalami: 'GP da África do Sul', 'watkins-glen': 'GP de Watkins Glen' };
Council.gpName = (t) => (/^GP /.test(t.gp) ? t.gp : (Council.GP[t.id] || `GP de ${t.gp}`));
Council.COST = { talk: 8, deal: 4, engine: 10, body: 20, propose: 20 };

Council.ensure = (G) => {
  if (G.council) return G.council;
  const pt = G.player && G.player.teamId ? Career.team(G, G.player.teamId) : null;
  G.council = { capital: pt ? Math.round(25 + pt.reputation * 0.3) : 0, open: null, history: [], scheduled: {}, rel: {}, promises: [], queued: null, seq: 0, pu: {}, recent: [], vetoYear: null, v8Year: null };
  return G.council;
};
/* teto de referência: o do início da carreira (o teto oscila no máximo 15% em torno dele) */
Council.cap0 = (G) => { const C = Council.ensure(G); return C.cap0 || (C.cap0 = G.db.rules.budgetCap || 145); };
Council.isPlayer = (G, tid) => !!(G.player && G.player.teamId === tid && !Career.isObs(G));
/* força relativa da parte elétrica de cada motor (-1 a 1): fixa por carreira, muda numa nova era de motores */
Council.ers = (G, engId) => {
  const C = Council.ensure(G);
  if (C.pu[engId] == null) C.pu[engId] = +(localRng(`ers:${G.seed}:${engId}`)() * 2 - 1).toFixed(2);
  return C.pu[engId];
};
/* perfil político: conservadores resistem a mudanças técnicas */
Council.persona = (tid) => localRng(`persona:${tid}`)() * 2 - 1;

/* métricas normalizadas (-1 a 1) de cada equipe, base do "quem ganha" */
Council.metrics = (G) => {
  const teams = G.db.teams;
  const z = (arr) => { const m = avg(arr), sd = Math.sqrt(avg(arr.map(x => (x - m) ** 2))) || 1; return arr.map(x => clamp((x - m) / sd, -2, 2) / 2); };
  const eng = teams.map(t => Engine.engineOf(G.db, t));
  const power = z(eng.map(e => e.power));
  const aero = z(teams.map(t => t.car.aero));
  const budget = z(teams.map(t => t.budget));
  const rel = z(teams.map(t => Engine.reliability(G.db, t)));
  const aggr = z(teams.map(t => { const ds = Career.lineup(G, t.id); return ds.length ? avg(ds.map(d => d.aggression || 50)) : 50; }));
  const order = G.season && G.season.round > 0
    ? Object.entries(G.season.standC).sort((a, b) => b[1] - a[1]).map(x => x[0])
    : Object.entries(Career.expectedRanks(G)).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const n = teams.length;
  const M = {};
  teams.forEach((t, i) => {
    const k = order.indexOf(t.id);
    M[t.id] = { power: power[i], ers: Council.ers(G, eng[i].id), aero: aero[i], budget: budget[i], rel: rel[i], aggr: aggr[i], strength: k < 0 ? 0 : 1 - 2 * k / Math.max(1, n - 1), works: !!t.works, engine: eng[i].id, country: t.country };
  });
  return M;
};

/* ---------- catálogo de propostas ---------- */
const CT = [];
const R_ = (G) => Regs.r(G);
CT.push({ k: 'elecDown', cat: 'tec', basis: 'motor a combustão × parte elétrica', proposer: 'fom',
  gen: (G, R) => (R.electricShare >= 40 ? { a: R.electricShare, b: R.electricShare - 10 } : null),
  title: (p) => `Unidade de potência: parte elétrica de ${p.a}% para ${p.b}%`,
  desc: () => 'Os pilotos reclamam de tirar o pé no fim das retas para recarregar a bateria. A proposta aumenta o fluxo de combustível e diminui a parte elétrica. Ganha quem tem o motor a combustão mais forte.',
  ops: (p) => [{ op: 'regs', k: 'electricShare', v: p.b }, { op: 'pu', from: p.a, to: p.b }],
  imp: (tid, M) => -M[tid].ers * 0.8, fia: 0.25, fom: 0.5 });
CT.push({ k: 'elecUp', cat: 'tec', basis: 'eficiência do sistema elétrico', proposer: 'team',
  gen: (G, R) => (R.electricShare >= 20 && R.electricShare <= 50 ? { a: R.electricShare, b: R.electricShare + 10 } : null),
  title: (p) => `Unidade de potência: parte elétrica de ${p.a}% para ${p.b}%`,
  desc: () => 'Fabricantes querem aproximar a F1 dos carros de rua híbridos: mais energia da bateria e menos combustível. Ganha quem tem o sistema elétrico mais eficiente.',
  ops: (p) => [{ op: 'regs', k: 'electricShare', v: p.b }, { op: 'pu', from: p.a, to: p.b }],
  imp: (tid, M) => M[tid].ers * 0.8, fia: 0.15, fom: -0.15 });
CT.push({ k: 'fuel', cat: 'tec', basis: 'eficiência do motor', proposer: 'fia',
  gen: (G, R) => (R.fuelLimit >= 65 ? { a: R.fuelLimit, b: R.fuelLimit - 5 } : null),
  title: (p) => `Limite de combustível: ${p.a} kg para ${p.b} kg por corrida`,
  desc: () => 'A FIA quer reduzir o consumo e reforçar a mensagem do combustível 100% sustentável. Motores mais eficientes sofrem menos.',
  ops: (p) => [{ op: 'regs', k: 'fuelLimit', v: p.b }],
  imp: (tid, M) => M[tid].ers * 0.35 + M[tid].power * 0.25 - 0.05, fia: 0.6, fom: 0.1 });
CT.push({ k: 'weight', cat: 'tec', basis: 'orçamento para emagrecer o carro', proposer: 'fia',
  gen: (G, R) => (R.minWeight > 740 ? { a: R.minWeight, b: R.minWeight - 8 } : null),
  title: (p) => `Peso mínimo do carro: ${p.a} kg para ${p.b} kg`,
  desc: () => 'Carros mais leves e ágeis, um pedido antigo dos pilotos. Quem tem dinheiro para refazer o chassi com materiais mais caros sai na frente.',
  ops: (p) => [{ op: 'regs', k: 'minWeight', v: p.b }, { op: 'weight' }],
  imp: (tid, M) => M[tid].budget * 0.6 - 0.08, fia: 0.35, fom: 0.4 });
CT.push({ k: 'aeroUp', cat: 'tec', basis: 'departamento de aerodinâmica e orçamento', proposer: 'team',
  gen: (G, R) => (R.aeroFreedom <= 70 ? { a: R.aeroFreedom, b: R.aeroFreedom + 15 } : null),
  title: (p) => `Mais liberdade aerodinâmica (índice ${p.a} → ${p.b})`,
  desc: () => 'Libera áreas do assoalho e das asas para desenvolvimento. O que se ganha no túnel de vento rende mais; os carros ficam mais rápidos, mas mais difíceis de seguir de perto.',
  ops: (p) => [{ op: 'regs', k: 'aeroFreedom', v: p.b }],
  imp: (tid, M) => (M[tid].aero * 0.5 + M[tid].budget * 0.5) * 0.9, fia: -0.05, fom: -0.3 });
CT.push({ k: 'aeroDown', cat: 'tec', basis: 'departamento de aerodinâmica e orçamento', proposer: 'fom',
  gen: (G, R) => (R.aeroFreedom >= 40 ? { a: R.aeroFreedom, b: R.aeroFreedom - 15 } : null),
  title: (p) => `Aerodinâmica mais restrita para facilitar as disputas (índice ${p.a} → ${p.b})`,
  desc: () => 'Menos liberdade nas asas e no assoalho para reduzir o ar sujo e aproximar o grid. Quem tem a melhor aerodinâmica perde a vantagem mais rápido.',
  ops: (p) => [{ op: 'regs', k: 'aeroFreedom', v: p.b }],
  imp: (tid, M) => -(M[tid].aero * 0.5 + M[tid].budget * 0.5) * 0.9, fia: 0.3, fom: 0.55 });
CT.push({ k: 'freeze', cat: 'tec', basis: 'força do motor', proposer: 'team',
  gen: (G, R) => (!R.engineFreeze && G.season.year >= (G.db.rules.startYear || 2027) + 1 ? { y: G.season.year + 1 } : null),
  title: (p) => `Congelamento dos motores de ${p.y} a ${p.y + 2}`,
  desc: () => 'Corta o gasto dos fabricantes e o preço do motor para as clientes durante três temporadas, mas trava a ordem atual: quem tem o melhor motor fica com a vantagem.',
  ops: (p) => [{ op: 'regs', k: 'engineFreeze', v: true }, { op: 'later', year: p.y + 3, title: 'Fim do congelamento dos motores', ops: [{ op: 'regs', k: 'engineFreeze', v: false }] }],
  imp: (tid, M) => M[tid].power * 0.8 + (M[tid].works ? -0.05 : 0.2), fia: 0.3, fom: 0.15 });
CT.push({ k: 'unfreeze', cat: 'tec', basis: 'força do motor', proposer: 'team',
  gen: (G, R) => (R.engineFreeze ? { y: G.season.year + 1 } : null),
  title: (p) => `Fim do congelamento dos motores em ${p.y}`,
  desc: () => 'Os fabricantes atrás pedem para voltar a desenvolver o motor. Mais custo, mas a ordem pode mudar.',
  ops: () => [{ op: 'regs', k: 'engineFreeze', v: false }],
  imp: (tid, M) => -M[tid].power * 0.8, fia: 0.2, fom: 0.25 });
CT.push({ k: 'aduo', cat: 'tec', basis: 'força do motor', proposer: 'fia',
  gen: (G, R) => { const p = G.db.engines.map(e => e.power); return !R.engineFreeze && Math.max(...p) - Math.min(...p) > 3 ? { gap: +(Math.max(...p) - Math.min(...p)).toFixed(1) } : null; },
  title: () => 'Desenvolvimento extra para os motores atrasados (ADUO)',
  desc: (p) => `Mecanismo do regulamento de motores: fabricantes muito atrás do melhor ganham horas extras de banco de provas e verba fora do teto. Hoje a diferença entre o melhor e o pior motor é de ${p.gap} pontos.`,
  ops: () => [{ op: 'aduo' }],
  imp: (tid, M) => -M[tid].power * 0.9, fia: 0.5, fom: 0.35 });
CT.push({ k: 'puPlus', cat: 'tec', basis: 'confiabilidade', proposer: 'team',
  gen: (G, R) => (R.puLimit <= 4 ? { a: R.puLimit, b: R.puLimit + 1 } : null),
  title: (p) => `Unidades de potência por piloto: de ${p.a} para ${p.b} por temporada`,
  desc: () => 'Com as quebras do motor novo, as punições no grid viraram rotina. Mais uma unidade por temporada evita o problema, mas aumenta o custo.',
  ops: (p) => [{ op: 'regs', k: 'puLimit', v: p.b }],
  imp: (tid, M) => -M[tid].rel * 0.7, fia: 0.05, fom: 0.35 });
CT.push({ k: 'v8', cat: 'tec', basis: 'fabricante de motor', proposer: 'fia', when: 3,
  gen: (G, R) => { const C = Council.ensure(G); return R.electricShare > 25 && G.season.year >= (G.db.rules.startYear || 2027) + 1 && (!C.v8Year || G.season.year - C.v8Year >= 5) ? { y: G.season.year + 3 } : null; },
  title: (p) => `Motores V8 com combustível sustentável a partir de ${p.y}`,
  desc: () => 'Defendida pelo presidente da FIA: motor mais simples, barato, leve e com mais barulho, com uma parte elétrica pequena. Os fabricantes que investiram no híbrido atual resistem; as clientes gostam da conta menor.',
  ops: (p) => [{ op: 'regs', k: 'electricShare', v: 20 }, { op: 'newEra', year: p.y }],
  imp: (tid, M) => (M[tid].works ? -0.45 + M[tid].power * 0.15 : 0.45), fia: 0.8, fom: 0.45 });
CT.push({ k: 'capDown', cat: 'dev', basis: 'orçamento', proposer: 'team',
  gen: (G) => (G.db.rules.budgetCap - 10 >= Council.cap0(G) * 0.85 ? { a: G.db.rules.budgetCap, b: G.db.rules.budgetCap - 10 } : null),
  title: (p) => `Teto orçamentário: US$ ${p.a} mi para US$ ${p.b} mi`,
  desc: () => 'As equipes menores querem fechar a distância para as grandes. Quem gasta no limite teria de cortar pessoal e projetos.',
  ops: (p) => [{ op: 'rules', k: 'budgetCap', v: p.b }],
  imp: (tid, M) => -M[tid].budget * 0.85, fia: 0.4, fom: 0.3 });
CT.push({ k: 'capUp', cat: 'dev', basis: 'orçamento', proposer: 'team',
  gen: (G) => (G.db.rules.budgetCap + 12 <= Council.cap0(G) * 1.15 ? { a: G.db.rules.budgetCap, b: G.db.rules.budgetCap + 12 } : null),
  title: (p) => `Correção do teto orçamentário: US$ ${p.a} mi para US$ ${p.b} mi`,
  desc: () => 'Inflação e calendário maior: as equipes grandes pedem um teto mais alto. Quem não tem dinheiro para gastar o novo teto fica mais longe.',
  ops: (p) => [{ op: 'rules', k: 'budgetCap', v: p.b }],
  imp: (tid, M) => M[tid].budget * 0.85, fia: -0.05, fom: 0.15 });
CT.push({ k: 'atrWide', cat: 'dev', basis: 'posição no campeonato', proposer: 'team',
  gen: (G, R) => (R.atr && R.atrMin >= 60 && R.atrMax <= 125 ? { a: R.atrMin, b: R.atrMax } : null),
  title: (p) => `Túnel de vento: campeão com ${p.a - 5}% e último com ${p.b + 5}% do tempo`,
  desc: () => 'Aumenta a diferença de tempo de túnel de vento e CFD entre o topo e o fundo do campeonato. Ajuda quem está atrás a se aproximar.',
  ops: (p) => [{ op: 'regs', k: 'atrMin', v: p.a - 5 }, { op: 'regs', k: 'atrMax', v: p.b + 5 }],
  imp: (tid, M) => -M[tid].strength * 0.75, fia: 0.35, fom: 0.4 });
CT.push({ k: 'tests', cat: 'dev', basis: 'confiabilidade e orçamento', proposer: 'team',
  gen: (G, R) => (R.testingDays <= 5 ? { a: R.testingDays, b: R.testingDays + 2 } : null),
  title: (p) => `Testes de pré-temporada: de ${p.a} para ${p.b} dias`,
  desc: () => 'Mais tempo de pista antes da primeira corrida. Ajuda quem tem problemas de confiabilidade; quem tem orçamento curto reclama do custo.',
  ops: (p) => [{ op: 'regs', k: 'testingDays', v: p.b }],
  imp: (tid, M) => -M[tid].rel * 0.35 + M[tid].budget * 0.2, fia: 0.05, fom: 0.15 });
CT.push({ k: 'polePoint', cat: 'esp', basis: 'força do carro em classificação', proposer: 'fom',
  gen: (G, R) => (!R.polePoints ? {} : null),
  title: () => 'Um ponto para o pole position',
  desc: () => 'A Fórmula 1 quer valorizar a classificação de sábado. Na prática, o ponto fica quase sempre com as equipes do topo.',
  ops: () => [{ op: 'regs', k: 'polePoints', v: 1 }],
  imp: (tid, M) => M[tid].strength * 0.35, fia: 0.05, fom: 0.4 });
CT.push({ k: 'reverseGrid', cat: 'esp', basis: 'posição no campeonato', proposer: 'fom',
  gen: (G, R) => (!R.reverseGrid ? { n: 8 } : null),
  title: (p) => `Grid invertido na Sprint (${p.n} primeiros)`,
  desc: () => 'Ideia que a Fórmula 1 já levou às equipes e que o topo do grid sempre barrou: os líderes largam do meio do pelotão na Sprint e precisam ultrapassar.',
  ops: (p) => [{ op: 'regs', k: 'reverseGrid', v: p.n }],
  imp: (tid, M) => -M[tid].strength * 0.7, fia: -0.05, fom: 0.6 });
CT.push({ k: 'fastestLap', cat: 'esp', basis: 'força do carro', proposer: 'fia',
  gen: (G) => ({ on: !G.db.rules.fastestLapPoint }),
  title: (p) => (p.on ? 'Volta do ponto pela volta mais rápida' : 'Fim do ponto pela volta mais rápida'),
  desc: (p) => (p.on ? 'Mais um motivo para atacar no fim da corrida, entre os 10 primeiros.' : 'Evita pit stops no fim da corrida só para buscar o ponto e o uso desse ponto para tirar pontos de rivais, como a F1 decidiu em 2025.'),
  ops: (p) => [{ op: 'rules', k: 'fastestLapPoint', v: p.on ? 1 : 0 }],
  imp: (tid, M, p) => (p.on ? 1 : -1) * M[tid].strength * 0.25, fia: 0.3, fom: 0.1 });
CT.push({ k: 'points12', cat: 'esp', basis: 'posição no campeonato', proposer: 'team',
  gen: (G) => ((G.db.rules.points || []).length === 10 ? {} : null),
  title: () => 'Pontos até o 12º lugar (25-18-15-12-10-8-6-5-4-3-2-1)',
  desc: () => 'Com 11 equipes e 22 carros, as equipes do fundo pedem mais posições pontuando, ideia que a F1 já discutiu. Tira peso das vitórias e premia regularidade.',
  ops: () => [{ op: 'rules', k: 'points', v: [25, 18, 15, 12, 10, 8, 6, 5, 4, 3, 2, 1] }],
  imp: (tid, M) => -M[tid].strength * 0.65, fia: 0.1, fom: 0.3 });
CT.push({ k: 'trackLimits', cat: 'esp', basis: 'agressividade dos pilotos', proposer: 'fia',
  gen: (G, R) => (R.trackLimitWarnings > 2 ? { a: R.trackLimitWarnings, b: R.trackLimitWarnings - 1 } : null),
  title: (p, G) => `Limites de pista: punição depois de ${p.b} advertências (hoje ${p.a}) a partir de ${G.season.year + 1}`,
  desc: () => 'Depois de corridas com dezenas de voltas deletadas, a FIA quer endurecer a regra na próxima temporada. Pilotos agressivos são os mais punidos.',
  ops: (p) => [{ op: 'regs', k: 'trackLimitWarnings', v: p.b }],
  imp: (tid, M) => -M[tid].aggr * 0.4, fia: 0.55, fom: 0.05 });
CT.push({ k: 'strict', cat: 'esp', basis: 'agressividade dos pilotos', proposer: 'fia',
  gen: (G, R) => (R.penaltyStrictness < 1.4 ? { a: R.penaltyStrictness, b: +(R.penaltyStrictness + 0.3).toFixed(1) } : null),
  title: (p, G) => `Comissários mais rigorosos nas disputas roda a roda a partir de ${G.season.year + 1}`,
  desc: () => 'Novas diretrizes de corrida para manobras na freada e por fora. Mais punições para quem joga o rival para fora da pista.',
  ops: (p) => [{ op: 'regs', k: 'penaltyStrictness', v: p.b }],
  imp: (tid, M) => -M[tid].aggr * 0.4, fia: 0.45, fom: -0.1 });
CT.push({ k: 'sprintMore', cat: 'cir', basis: 'orçamento (custo de mais Sprints)', proposer: 'fom',
  gen: (G, R, M, r) => {
    const cal = G.db.calendar.map(id => Career.track(G, id)).filter(Boolean);
    if (cal.filter(t => t.sprint).length >= 10) return null;
    const pool = cal.filter(t => !t.sprint && t.id !== 'monaco');
    if (pool.length < 2) return null;
    const a = pool.splice(Math.floor(r() * pool.length), 1)[0], b = pool[Math.floor(r() * pool.length)];
    return { ids: [a.id, b.id], names: [Council.gpName(a), Council.gpName(b)], y: G.season.year + 1 };
  },
  title: (p) => `Sprint em mais duas etapas em ${p.y}: ${p.names[0]} e ${p.names[1]}`,
  desc: () => 'A Fórmula 1 quer mais Sprints pela audiência e pelas taxas dos promotores. Mais corridas significam mais desgaste e mais custo, que pesa para as equipes pequenas.',
  ops: (p) => p.ids.map(id => ({ op: 'sprint', id })),
  imp: (tid, M) => M[tid].budget * 0.35 - 0.05 + M[tid].strength * 0.1, fia: 0.05, fom: 0.8 });
CT.push({ k: 'addTrack', cat: 'cir', basis: 'GP em casa e custo de viagem', proposer: 'fom',
  gen: (G, R, M, r) => {
    const out = G.db.tracks.filter(t => t.real && !t.generated && !G.db.calendar.includes(t.id));
    if (!out.length) return null;
    const t = out[Math.floor(r() * out.length)];
    let rep = null;
    if (G.db.calendar.length >= 24) {
      const cands = G.db.calendar.map(id => Career.track(G, id)).filter(x => x && !Council.CLASSICS.has(x.id)).sort((a, b) => (a.racesHeld || 0) - (b.racesHeld || 0));
      if (!cands.length) return null;
      rep = cands[Math.floor(r() * Math.min(4, cands.length))];
    }
    return { id: t.id, name: Council.gpName(t), circuit: t.circuit, country: t.country, rep: rep ? rep.id : null, repName: rep ? Council.gpName(rep) : null, repCountry: rep ? rep.country : null, n: G.db.calendar.length + (rep ? 0 : 1), y: G.season.year + 1 };
  },
  title: (p) => (p.rep ? `${p.name} substitui o ${p.repName} em ${p.y}` : `${p.name} volta ao calendário em ${p.y}`),
  desc: (p) => `${p.circuit}. ${p.rep ? `O contrato do ${p.repName} termina e o promotor do ${p.name} cobriu a oferta.` : `O promotor oferece uma taxa alta; o calendário passaria a ter ${p.n} etapas.`} Para quem corre em casa, mais patrocínio e torcida; para as equipes pequenas, mais uma viagem.`,
  ops: (p) => [{ op: 'cal+', id: p.id, replace: p.rep }],
  imp: (tid, M, p) => (M[tid].country === p.country ? 0.55 : 0) - (p.rep && M[tid].country === p.repCountry ? 0.5 : 0) + (p.rep ? 0 : 0.03 + M[tid].budget * 0.12), fia: 0.4, fom: 0.6 });
CT.push({ k: 'dropTrack', cat: 'cir', basis: 'GP em casa e custo de viagem', proposer: 'fom',
  gen: (G, R, M, r) => {
    if (G.db.calendar.length <= 20) return null;
    const cands = G.db.calendar.map(id => Career.track(G, id)).filter(x => x && !Council.CLASSICS.has(x.id)).sort((a, b) => (a.racesHeld || 0) - (b.racesHeld || 0));
    if (!cands.length) return null;
    const t = cands[Math.floor(r() * Math.min(5, cands.length))];
    return { id: t.id, name: Council.gpName(t), country: t.country, y: G.season.year + 1, n: G.db.calendar.length - 1 };
  },
  title: (p) => `${p.name} sai do calendário em ${p.y}`,
  desc: (p) => `O promotor não aceitou renovar nos valores pedidos pela Fórmula 1. O calendário ficaria com ${p.n} etapas: menos uma viagem para as equipes, menos dinheiro para a categoria.`,
  ops: (p) => [{ op: 'cal-', id: p.id }],
  imp: (tid, M, p) => (M[tid].country === p.country ? -0.55 : 0) - 0.05 - M[tid].budget * 0.1, fia: 0.4, fom: 0.2 });
Council.T = CT;
/* temas ligados: depois de votar um, os outros do grupo também esperam */
Council.GROUPS = [['elecDown', 'elecUp', 'v8'], ['aeroUp', 'aeroDown'], ['capDown', 'capUp'], ['freeze', 'unfreeze', 'aduo'], ['trackLimits', 'strict'], ['addTrack', 'dropTrack']];
Council.byK = Object.fromEntries(CT.map(t => [t.k, t]));

/* propostas que o jogador pode levar (as mesmas do catálogo, com os valores de hoje) */
Council.available = (G) => {
  const R = R_(G), M = Council.metrics(G);
  const r = localRng(`av:${G.seed}:${G.season.year}:${G.season.round}`);
  const C = Council.ensure(G);
  const busy = new Set([...(C.open ? C.open.props.map(x => x.k) : []), ...Object.entries(C.cool || {}).filter(([, y]) => y > G.season.year).map(([k]) => k)]);
  return CT.filter(t => !busy.has(t.k)).map(t => ({ t, p: t.gen(G, R, M, r) })).filter(x => x.p).map(x => ({ k: x.t.k, cat: x.t.cat, title: x.t.title(x.p, G), p: x.p, myImp: G.player && G.player.teamId ? clamp(x.t.imp(G.player.teamId, M, x.p, G), -1, 1) : 0 }));
};

Council.make = (G, t, p, M, r, proposerTid) => {
  const C = Council.ensure(G);
  const imp = {}, noise = {};
  G.db.teams.forEach(tm => { imp[tm.id] = +clamp(t.imp(tm.id, M, p, G), -1, 1).toFixed(2); noise[tm.id] = +((r() - 0.5) * 0.16).toFixed(3); });
  let proposer = proposerTid || t.proposer;
  // a autora é a equipe que mais ganha (nunca a do jogador: ele só propõe pela própria tela)
  if (proposer === 'team') proposer = Object.entries(imp).filter(([tid]) => !Council.isPlayer(G, tid)).sort((a, b) => b[1] - a[1])[0][0];
  // regra nova vale na temporada seguinte; imediato só para segurança urgente (t.safety)
  const eff = t.when === 'now' && t.safety ? 'now' : G.season.year + (typeof t.when === 'number' ? t.when : 1);
  return { id: 'cp' + (++C.seq), k: t.k, cat: t.cat, p, title: t.title(p, G), desc: t.desc(p, G), basis: t.basis, eff, proposer, imp, noise,
    fia: +(t.fia + (r() - 0.5) * 0.5).toFixed(2), fom: +(t.fom + (r() - 0.5) * 0.5).toFixed(2), lobby: {}, acts: {}, vote: null, offers: {} };
};

/* ---------- posição de cada equipe ---------- */
Council.stance = (G, pr, tid) => {
  const C = Council.ensure(G);
  const t = Career.team(G, tid);
  if (!t) return 0;
  let s = pr.imp[tid] ?? 0;
  const sis = G.sisters || {};
  // clientes acompanham a fornecedora de motor em temas técnicos
  if (pr.cat === 'tec' && !t.works) { const w = G.db.teams.find(x => x.works && x.engine === t.engine); if (w && pr.imp[w.id] != null) s = s * 0.75 + pr.imp[w.id] * 0.25; }
  // equipe irmã vota com a principal
  if (sis[tid] && pr.imp[sis[tid]] != null) s = s * 0.45 + pr.imp[sis[tid]] * 0.55;
  s -= Council.persona(tid) * (pr.cat === 'tec' ? 0.12 : 0.06);
  // as propostas chegam à Comissão já discutidas nos grupos de trabalho: há boa vontade de partida,
  // um pouco maior quando quem propõe é a FIA ou a Fórmula 1
  s += 0.1 + (pr.proposer === 'fia' || pr.proposer === 'fom' ? 0.06 : 0);
  if (pr.proposer === tid) s += 0.6;
  const pt = G.db.teams.find(x => x.id === pr.proposer);
  if (pt && pt.id !== tid) {
    if (pt.engine === t.engine) s += 0.06;
    if (sis[tid] === pt.id || sis[pt.id] === tid) s += 0.25;
    if (Council.isPlayer(G, pt.id)) s += (C.rel[tid] || 0) * 0.15;
  }
  s += (pr.lobby[tid] || 0) + (pr.noise[tid] || 0);
  return s;
};
Council.intent = (s) => (s > 0.1 ? 'sim' : s < -0.1 ? 'nao' : 'ind');
Council.need = (G, pr) => Math.ceil(G.db.teams.length * (pr.eff === 'now' ? 0.8 : 0.6));
Council.bodyYes = (pr, who) => pr.proposer === who || (pr[who] + (pr.lobby[who] || 0)) > 0;

Council.tally = (G, pr, final) => {
  const votes = {};
  let yes = 0, no = 0, und = 0;
  G.db.teams.forEach(t => {
    let v;
    if (Council.isPlayer(G, t.id) && pr.vote) v = pr.vote;
    else {
      const s = Council.stance(G, pr, t.id);
      v = final ? (s > 0.02 ? 'sim' : s < -0.02 ? 'nao' : 'abst') : Council.intent(s);
    }
    votes[t.id] = v;
    if (v === 'sim') yes++; else if (v === 'nao') no++; else und++;
  });
  const need = Council.need(G, pr), fia = Council.bodyYes(pr, 'fia'), fom = Council.bodyYes(pr, 'fom');
  return { votes, yes, no, und, need, fia, fom, pass: fia && fom && yes >= need };
};

/* ---------- calendário: reuniões ---------- */
Council.meetRounds = (G) => { const n = G.season.calendar.length; return Council.MEETS.map(f => Math.max(1, Math.round(n * f))); };

/* depois de cada GP (round já avançado) */
Council.afterRound = (G) => {
  if (!G.season || typeof Regs === 'undefined') return;
  const C = Council.ensure(G);
  if (C.open && C.open.year === G.season.year && G.season.round > C.open.round) Council.resolve(G);
  if (!Council.meetRounds(G).includes(G.season.round) || Career.seasonOver(G)) return;
  Council.openMeeting(G);
  if (Career.isObs(G)) Council.resolve(G);
};
/* antes do próximo GP a votação fecha */
Council.beforeWeekend = (G) => { const C = G.council; if (C && C.open) Council.resolve(G); };

Council.openMeeting = (G) => {
  const C = Council.ensure(G);
  const s = G.season;
  const r = localRng(`cm:${G.seed}:${s.year}:${s.round}`);
  const R = R_(G), M = Council.metrics(G);
  const W = { tec: 1, dev: 0.8, esp: 0.9, cir: 0.8 };
  C.cool = C.cool || {};
  let cand = CT.filter(t => !C.recent.includes(t.k) && !(C.cool[t.k] > s.year)).map(t => ({ t, p: t.gen(G, R, M, r), w: W[t.cat] * (0.4 + r()) })).filter(x => x.p).sort((a, b) => b.w - a.w);
  const want = 2 + (r() < 0.5 ? 1 : 0) - (C.queued ? 1 : 0);
  const picked = [];
  for (const x of cand) { if (picked.length >= want) break; if (picked.some(y => y.t.cat === x.t.cat) && cand.some(y => !picked.includes(y) && y !== x && !picked.some(z => z.t.cat === y.t.cat))) continue; picked.push(x); }
  const props = picked.map(x => Council.make(G, x.t, x.p, M, r));
  if (C.queued && Council.byK[C.queued.k] && !Career.isObs(G)) {
    // valores atualizados (o teto ou o regulamento podem ter mudado); calendário mantém a escolha feita
    const q = C.queued, t = Council.byK[q.k], fresh = t.gen(G, R, M, r);
    const p = fresh ? (t.cat === 'cir' ? q.p : fresh) : null;
    if (p) props.unshift(Council.make(G, t, p, M, r, G.player.teamId));
  }
  C.queued = null;
  props.forEach(pr => Council.concessions(G, pr, r));
  props.forEach(pr => { if (pr.k === 'v8') C.v8Year = s.year; });
  C.recent = [...C.recent, ...props.map(p => p.k)].slice(-10);
  const next = Career.currentTrack(G);
  C.open = { year: s.year, round: s.round, gp: next ? next.gp : '', props };
  if (!Career.isObs(G)) {
    const top3 = Object.entries(s.standC).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    C.capital = Math.min(100, C.capital + 10 + (top3.includes(G.player.teamId) ? 4 : 0));
    const mine = G.player.teamId;
    const promised = C.promises.filter(pm => props.some(pr => pr.proposer === pm.tid || pr.imp[pm.tid] >= 0.3));
    Career.mail(G, { from: 'Comissão de F1', tag: 'regs', title: `Reunião do Conselho: ${props.length} propostas em votação`,
      body: `A Comissão de F1 se reúne antes do ${C.open.gp}. Em pauta:\n${props.map(pr => `• ${pr.title} (impacto para a ${Career.team(G, mine).name}: ${Council.impWord(pr.imp[mine])})`).join('\n')}\n\nVote e negocie na tela Conselho da FIA até o início do próximo fim de semana.${promised.length ? `\n\nAtenção: você tem acordo de apoio com ${promised.map(pm => Career.team(G, pm.tid).name).join(', ')}.` : ''}` });
  }
  Career.news(G, `Comissão de F1 se reúne com ${props.length} propostas na pauta`, 'regulamento', props.map(pr => '• ' + pr.title).join('\n'));
};

/* ---------- concessões em troca de voto ---------- */
/* proposta perto de passar: quem propõe compra os votos que faltam (dinheiro da Fórmula 1 ou da FIA,
   horas de túnel cedidas pela equipe autora). Equipes da IA aceitam quando o ganho cobre a perda;
   o jogador recebe a oferta na tela do Conselho e decide pelo próprio voto. */
Council.concessions = (G, pr, r) => {
  pr.offers = pr.offers || {};
  const T = Council.tally(G, pr, true);
  const gap = T.need - T.yes;
  if (T.pass || gap > 2 || gap <= 0 || !T.fia || !T.fom) return;
  const byTeam = G.db.teams.some(t => t.id === pr.proposer);
  const targets = G.db.teams.filter(t => T.votes[t.id] !== 'sim' && t.id !== pr.proposer && !Council.isPlayer(G, t.id) && !pr.offers[t.id])
    .map(t => ({ t, s: Council.stance(G, pr, t.id) })).sort((a, b) => b.s - a.s).slice(0, gap + 1);
  targets.forEach(({ t, s }) => {
    const money = byTeam ? 0 : Math.round(3 + r() * 7 + Math.max(0, -s) * 10);
    const hours = byTeam ? Math.round(4 + r() * 6) : 0;
    const accept = s > -0.45 && r() < 0.7;
    pr.offers[t.id] = { by: pr.proposer, money, hours, accepted: accept };
    if (accept) pr.lobby[t.id] = (pr.lobby[t.id] || 0) + 0.35;
  });
  // o jogador também recebe a oferta quando o voto dele pode decidir
  const mine = Career.isObs(G) ? null : G.player.teamId;
  if (mine && mine !== pr.proposer && T.votes[mine] !== 'sim' && !pr.offers[mine]) pr.offers[mine] = { by: pr.proposer, money: byTeam ? 0 : Math.round(4 + r() * 8), hours: byTeam ? Math.round(4 + r() * 6) : 0, player: true };
};
Council.payOffers = (G, pr, T) => {
  if (!T.pass) return;
  Object.entries(pr.offers || {}).forEach(([tid, o]) => {
    if (T.votes[tid] !== 'sim' || (!o.accepted && !o.player)) return;
    const t = Career.team(G, tid); if (!t) return;
    const who = Council.proposerName(G, o.by);
    if (Council.isPlayer(G, tid)) {
      if (o.money) Career.ledger(G, byLang(`Concessão da ${who} pelo voto no Conselho`, `${who} concession for the Council vote`), o.money, 'receita');
      if (o.hours && G.atrPool) G.atrPool.wt = Math.round((G.atrPool.wt || 0) + o.hours);
    } else if (o.money) t.cash = +((t.cash || 0) + o.money).toFixed(2);
    const giver = Career.team(G, o.by);
    if (giver && o.hours && !Council.isPlayer(G, giver.id)) giver.car.aero = +(giver.car.aero - o.hours * 0.01).toFixed(2);
    o.paid = true;
    Career.record(G, 'regulamento', byLang(`${t.name} votou a favor de "${pr.title}" em troca de ${o.money ? fmtMoney(o.money) : o.hours + ' horas de túnel'} (concessão da ${who}).`, `${t.name} voted for "${pr.title}" in exchange for ${o.money ? fmtMoney(o.money) : o.hours + ' wind tunnel hours'} (${who} concession).`), { teams: [t.id] });
  });
};

Council.impWord = (x) => (x >= 0.45 ? 'ganha muito' : x >= 0.15 ? 'ganha' : x <= -0.45 ? 'perde muito' : x <= -0.15 ? 'perde' : 'neutro');

Council.resolve = (G) => {
  const C = Council.ensure(G);
  const m = C.open; if (!m) return;
  const r = localRng(`cr:${G.seed}:${m.year}:${m.round}`);
  const mine = Career.isObs(G) ? null : G.player.teamId;
  const lines = [];
  m.props.forEach(pr => {
    Council.concessions(G, pr, r);
    const T = Council.tally(G, pr, true);
    Council.payOffers(G, pr, T);
    Object.assign(pr, { votes: T.votes, yes: T.yes, no: T.no, abst: T.und, need: T.need, fiaV: T.fia, fomV: T.fom });
    let res = T.pass ? 'aprovada' : 'rejeitada';
    pr.result = res;
    // o mesmo tema só volta à pauta depois de um intervalo (dois anos se foi barrado, um ano se passou)
    C.cool = C.cool || {};
    const grp = Council.GROUPS.find(g => g.includes(pr.k)) || [pr.k];
    grp.forEach(k => { C.cool[k] = Math.max(C.cool[k] || 0, m.year + (res === 'aprovada' ? (grp.length > 1 ? 3 : 1) : 2)); });
    if (res === 'aprovada') Council.schedule(G, pr);
    const prop = Council.proposerName(G, pr.proposer);
    const why = !T.fia ? ' A FIA votou contra.' : !T.fom ? ' A Fórmula 1 votou contra.' : '';
    lines.push(`• ${pr.title}: ${res.toUpperCase()} (${T.yes} a favor, ${T.no} contra${T.und ? `, ${T.und} abstenções` : ''}; precisava de ${T.need}).${why}`);
    Career.news(G, `Conselho ${res === 'aprovada' ? 'aprova' : 'rejeita'}: ${pr.title}`, 'regulamento', `Proposta de ${prop}. ${T.yes} equipes a favor e ${T.no} contra.${why}${res === 'aprovada' ? ` ${pr.eff === 'now' ? 'Vale já a partir da próxima etapa.' : `Vale a partir de ${pr.eff}.`}` : ''}`);
    Career.record(G, 'regulamento', `Conselho da FIA (${m.year}): ${pr.title} — ${res} (${T.yes}×${T.no}). Proposta de ${prop}.`, { year: m.year });
    // acordos do jogador: quem tinha a promessa de apoio cobra
    if (mine) C.promises.slice().forEach(pm => {
      if (pm.made === pr.id) return;
      if (!(pr.proposer === pm.tid || pr.imp[pm.tid] >= 0.3)) return;
      const v = T.votes[mine];
      const tn = Career.team(G, pm.tid).name;
      if (v === 'sim') { C.rel[pm.tid] = clamp((C.rel[pm.tid] || 0) + 0.2, -1, 1); }
      else {
        C.rel[pm.tid] = clamp((C.rel[pm.tid] || 0) - (v === 'nao' ? 0.5 : 0.25), -1, 1);
        C.capital = Math.max(0, C.capital - (v === 'nao' ? 15 : 6));
        Career.news(G, `${tn} acusa a ${Career.team(G, mine).name} de quebrar acordo no Conselho`, 'regulamento', `A ${tn} esperava apoio em "${pr.title}" em troca do voto dado antes.`, { teams: [pm.tid, mine] });
      }
      C.promises.splice(C.promises.indexOf(pm), 1);
    });
    if (mine && pr.proposer === mine && res === 'aprovada') C.capital = Math.min(100, C.capital + 6);
  });
  // promessas antigas expiram depois de quatro reuniões
  C.promises = C.promises.filter(pm => (C.history.length + 1) - pm.at < 4);
  if (mine) Career.mail(G, { from: 'Comissão de F1', tag: 'regs', title: 'Resultado da votação do Conselho', body: lines.join('\n') });
  C.history.unshift({ year: m.year, round: m.round, gp: m.gp, props: m.props.map(pr => ({ id: pr.id, k: pr.k, cat: pr.cat, title: pr.title, eff: pr.eff, proposer: pr.proposer, result: pr.result, yes: pr.yes, no: pr.no, abst: pr.abst, need: pr.need, fiaV: pr.fiaV, fomV: pr.fomV, votes: pr.votes, imp: pr.imp })) });
  if (C.history.length > 45) C.history.length = 45;
  C.open = null;
};
Council.proposerName = (G, p) => (p === 'fia' ? 'FIA' : p === 'fom' ? 'Fórmula 1' : (Career.team(G, p) || {}).name || p);

/* ---------- aplicação ---------- */
Council.schedule = (G, pr) => {
  const C = Council.ensure(G);
  const ops = Council.byK[pr.k].ops(pr.p, G);
  if (pr.eff === 'now') { Council.apply(G, ops); return; }
  (C.scheduled[pr.eff] = C.scheduled[pr.eff] || []).push({ id: pr.id, title: pr.title, ops });
};
/* chamado no início de cada temporada, antes de montar o calendário */
Council.applySeason = (G, year) => {
  const C = G.council;
  if (!C || !C.scheduled || !C.scheduled[year]) return;
  const list = C.scheduled[year];
  list.forEach(x => Council.apply(G, x.ops));
  Career.record(G, 'regulamento', `Entram em vigor em ${year} as decisões do Conselho da FIA: ${list.map(x => x.title).join('; ')}.`, { year });
  Career.news(G, `${list.length === 1 ? 'Mudança aprovada pelo Conselho entra' : `${list.length} mudanças aprovadas pelo Conselho entram`} em vigor em ${year}`, 'regulamento', list.map(x => '• ' + x.title).join('\n'));
  delete C.scheduled[year];
};
Council.apply = (G, ops) => {
  const R = G.db.rules; Regs.ensure(R);
  ops.forEach(o => {
    if (o.op === 'regs') R.regs[o.k] = o.v;
    else if (o.op === 'rules') R[o.k] = Array.isArray(o.v) ? o.v.slice() : o.v;
    else if (o.op === 'pu') G.db.engines.forEach(e => { e.power = +clamp(e.power + (o.to - o.from) / 10 * Council.ers(G, e.id), 75, 100).toFixed(1); });
    else if (o.op === 'aduo') { const mx = Math.max(...G.db.engines.map(e => e.power)); G.db.engines.forEach(e => { if (mx - e.power > 1.8) e.power = +(e.power + Math.min(2.5, (mx - e.power) * 0.4)).toFixed(1); }); }
    else if (o.op === 'newEra') { const r = localRng(`era:${G.seed}:${o.year}`); G.db.engines.forEach(e => { e.power = +clamp(90 + (e.power - 90) * 0.4 + (r() - 0.5) * 4, 80, 99).toFixed(1); Council.ensure(G).pu[e.id] = +(r() * 2 - 1).toFixed(2); }); }
    else if (o.op === 'weight') { const M = Council.metrics(G); G.db.teams.forEach(t => { t.car.chassis = +(t.car.chassis + M[t.id].budget * 0.6).toFixed(2); }); }
    else if (o.op === 'cal+') Council.calAdd(G, o.id, o.replace);
    else if (o.op === 'cal-') G.db.calendar = G.db.calendar.filter(id => id !== o.id);
    else if (o.op === 'sprint') { const t = Career.track(G, o.id); if (t) t.sprint = true; }
    else if (o.op === 'later') { const C = Council.ensure(G); (C.scheduled[o.year] = C.scheduled[o.year] || []).push({ id: 'auto' + o.year, title: o.title, ops: o.ops }); }
  });
};
/* entra no calendário na data da etapa substituída ou no maior intervalo entre duas etapas */
Council.calAdd = (G, id, replace) => {
  const t = Career.track(G, id);
  if (!t || G.db.calendar.includes(id)) return;
  let cal = G.db.calendar.slice();
  const day = (x) => new Date('2026-' + x.date.slice(5) + 'T12:00:00Z').getTime();
  const rep = replace ? Career.track(G, replace) : null;
  if (rep) { cal = cal.filter(x => x !== replace); if (rep.date) t.date = rep.date; }
  else {
    const ds = cal.map(x => Career.track(G, x)).filter(x => x && x.date).map(day).sort((a, b) => a - b);
    let best = null, gap = 0;
    for (let i = 1; i < ds.length; i++) if (ds[i] - ds[i - 1] > gap) { gap = ds[i] - ds[i - 1]; best = ds[i - 1] + Math.max(1, Math.round(gap / 864e5 / 14)) * 7 * 864e5; }
    if (best) t.date = '2026-' + new Date(best).toISOString().slice(5, 10);
  }
  cal.push(id);
  cal.sort((a, b) => { const A = Career.track(G, a), B = Career.track(G, b); return (A && A.date ? day(A) : 0) - (B && B.date ? day(B) : 0); });
  G.db.calendar = cal;
};

/* ---------- ações do jogador ---------- */
Council.find = (G, id) => (G.council && G.council.open ? G.council.open.props.find(p => p.id === id) : null);
Council.setVote = (G, id, v) => { const pr = Council.find(G, id); if (pr) pr.vote = v; };
/* negociação com uma equipe (ou com a FIA / Fórmula 1) para puxar o voto na direção do jogador */
Council.lobbyOptions = (G, pr, tid) => {
  const mine = G.player.teamId;
  if (tid === 'fia' || tid === 'fom') return [{ k: 'body', cost: Council.COST.body, label: tid === 'fia' ? 'Reunião com o presidente da FIA' : 'Reunião com o CEO da Fórmula 1', effect: 'puxa bastante o voto' }];
  const t = Career.team(G, tid), me = Career.team(G, mine);
  const o = [{ k: 'talk', cost: Council.COST.talk, label: `Conversa com o chefe de equipe (${t.principal ? t.principal : 'chefe'})`, effect: 'puxa um pouco o voto' },
    { k: 'deal', cost: Council.COST.deal, label: 'Troca de apoio: você promete votar com eles numa próxima proposta', effect: 'puxa bem o voto e cria um acordo' }];
  if (me.works && t.engine === me.engine && !t.works) o.push({ k: 'engine', cost: Council.COST.engine, label: 'Pressão como fornecedora do motor', effect: 'puxa muito o voto' });
  if ((G.sisters || {})[tid] === mine) o.push({ k: 'sister', cost: 0, label: 'Ordem para a equipe irmã', effect: 'segue o seu voto' });
  return o;
};
Council.lobby = (G, id, tid, kind) => {
  const C = Council.ensure(G);
  const pr = Council.find(G, id);
  if (!pr) return 'Votação encerrada.';
  if (pr.acts[tid]) return 'Você já negociou com eles nesta proposta.';
  const want = pr.vote === 'nao' ? -1 : 1;
  const opt = Council.lobbyOptions(G, pr, tid).find(o => o.k === kind);
  if (!opt) return 'Opção indisponível.';
  if (C.capital < opt.cost) return `Capital político insuficiente (precisa de ${opt.cost}).`;
  const r = localRng(`lb:${G.seed}:${pr.id}:${tid}:${kind}`);
  const rel = tid === 'fia' || tid === 'fom' ? 0 : (C.rel[tid] || 0);
  const base = { talk: 0.12 + r() * 0.16, deal: 0.32 + r() * 0.12, engine: 0.42 + r() * 0.1, body: 0.25 + r() * 0.25, sister: 2 }[kind];
  const shift = base * (1 + rel * 0.4) * want;
  C.capital -= opt.cost;
  pr.lobby[tid] = (pr.lobby[tid] || 0) + shift;
  pr.acts[tid] = kind;
  if (kind === 'deal') C.promises.push({ tid, made: pr.id, at: C.history.length, year: G.season.year });
  if (kind === 'talk') C.rel[tid] = clamp(rel + 0.03, -1, 1);
  return null;
};
Council.propose = (G, k) => {
  const C = Council.ensure(G);
  if (C.queued) return 'Você já tem uma proposta na pauta da próxima reunião.';
  if (C.capital < Council.COST.propose) return `Capital político insuficiente (precisa de ${Council.COST.propose}).`;
  const a = Council.available(G).find(x => x.k === k);
  if (!a) return 'Proposta indisponível.';
  C.capital -= Council.COST.propose;
  C.queued = { k, p: a.p, title: a.title };
  return null;
};
Council.nextMeeting = (G) => { const rs = Council.meetRounds(G).filter(x => x > G.season.round); return rs.length ? rs[0] : null; };
