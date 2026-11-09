/* ============================================================
   PIT WALL — eventos dentro e fora das pistas
   Modelos procedurais + eventos escritos pela IA (Claude),
   todos resolvidos pelo mesmo aplicador de efeitos.
   ============================================================ */
'use strict';

const Events = {};

/* ---------- aplicador de efeitos (whitelist + limites) ---------- */
Events.applyEffects = (G, fx) => {
  if (!fx) return [];
  const team = Career.team(G);
  const out = [];
  const myIds = Career.teamDrivers(G, team.id).map(d => d.id);
  const lim = (v, m) => clamp(Number(v) || 0, -m, m);
  if (fx.money) { const v = lim(fx.money, 25); Career.ledger(G, fx.moneyDesc || byLang('Evento', 'Event'), v, v >= 0 ? 'receita' : 'evento'); out.push(`${v >= 0 ? '+' : ''}${fmtMoney(v)}`); }
  if (fx.reputation) { const v = lim(fx.reputation, 8); team.reputation = clamp(team.reputation + v, 10, 99); out.push(`${byLang('Reputação', 'Reputation')} ${v >= 0 ? '+' : ''}${v}`); }
  if (fx.board) { const v = lim(fx.board, 20); G.board.confidence = clamp(G.board.confidence + v, 0, 100); out.push(`${byLang('Diretoria', 'Board')} ${v >= 0 ? '+' : ''}${v}`); }
  const perDriver = (obj, field, m, label) => {
    Object.entries(obj || {}).forEach(([did, v]) => {
      const id = did === 'd1' ? myIds[0] : did === 'd2' ? myIds[1] : did;
      const d = Career.driver(G, id);
      if (!d) return;
      const x = lim(v, m);
      d[field] = clamp((d[field] ?? 50) + x, 1, 100);
      out.push(byLang(`${label} de ${d.name.split(' ').slice(-1)[0]} ${x >= 0 ? '+' : ''}${x}`, `${d.name.split(' ').slice(-1)[0]} ${label.toLowerCase()} ${x >= 0 ? '+' : ''}${x}`));
    });
  };
  perDriver(fx.morale, 'morale', 25, byLang('Moral', 'Morale'));
  perDriver(fx.popularity, 'popularity', 15, byLang('Popularidade', 'Popularity'));
  if (fx.moraleAll) { const v = lim(fx.moraleAll, 20); Career.lineup(G, team.id).forEach(d => (d.morale = clamp(d.morale + v, 1, 100))); out.push(`${byLang('Moral dos pilotos', 'Driver morale')} ${v >= 0 ? '+' : ''}${v}`); }
  if (fx.car) {
    Object.entries(fx.car).forEach(([k, v]) => {
      if (!['aero', 'chassis', 'reliability', 'tyreCare'].includes(k)) return;
      const x = lim(v, 3);
      team.car[k] = +clamp(team.car[k] + x, 30, 110).toFixed(2);
      out.push(`${({ aero: 'Aero', chassis: byLang('Chassi', 'Chassis'), reliability: byLang('Confiabilidade', 'Reliability'), tyreCare: byLang('Pneus', 'Tyres') })[k]} ${x >= 0 ? '+' : ''}${x}`);
    });
  }
  if (fx.pitCrew) { const v = lim(fx.pitCrew, 5); team.pitCrew = clamp(team.pitCrew + v, 30, 100); out.push(`Pit crew ${v >= 0 ? '+' : ''}${v}`); }
  if (fx.staff) Object.entries(fx.staff).forEach(([k, v]) => { if (team.staff[k] != null) { const x = lim(v, 8); team.staff[k] = clamp(team.staff[k] + x, 30, 99); out.push(`${Events.role(k)} ${x >= 0 ? '+' : ''}${x}`); } });
  if (fx.practiceBonus) { const v = lim(fx.practiceBonus, 3); G.pendingPracticeBonus = (G.pendingPracticeBonus || 0) + v; out.push(byLang(`${v >= 0 ? '+' : ''}${v} volta(s) de treino no próximo GP`, `${v >= 0 ? '+' : ''}${v} practice lap(s) at the next GP`)); }
  if (fx.nextYear) { const v = lim(fx.nextYear, 3); G.nextYearBank += v; out.push(`${byLang('Carro do próximo ano', 'Next year\'s car')} ${v >= 0 ? '+' : ''}${v}`); }
  if (fx.gridPenalty) Object.entries(fx.gridPenalty).forEach(([did, n]) => { const id = did === 'd1' ? myIds[0] : did === 'd2' ? myIds[1] : did; G.gridPenalties = G.gridPenalties || {}; G.gridPenalties[id] = clamp(n, 0, 20); out.push(byLang(`Punição de ${n} posições no grid`, `${n}-place grid penalty`)); });
  if (fx.injury) Object.entries(fx.injury).forEach(([did, n]) => { const id = did === 'd1' ? myIds[0] : did === 'd2' ? myIds[1] : did; const d = Career.driver(G, id); if (d) { d.injured = clamp(n, 1, 4); out.push(byLang(`${d.name} fora por ${d.injured} GP(s)`, `${d.name} out for ${d.injured} GP(s)`)); } });
  if (fx.engine) { const e = byId(G.db.engines, fx.engine.id); if (e) { e.power = clamp(e.power + lim(fx.engine.power, 3), 70, 100); e.reliability = clamp(e.reliability + lim(fx.engine.reliability, 6), 60, 99); out.push(byLang(`Motor ${e.name} atualizado`, `${e.name} engine updated`)); } }
  if (fx.addSponsor) { G.sponsors.push({ ...fx.addSponsor, id: Career.nextId(G, 's'), satisfaction: 70 }); out.push(`${byLang('Novo patrocinador', 'New sponsor')}: ${fx.addSponsor.name}`); }
  if (fx.removeSponsor) { G.sponsors = G.sponsors.filter(s => s.id !== fx.removeSponsor); out.push(byLang('Patrocinador saiu', 'Sponsor left')); }
  if (fx.sponsorSat) { G.sponsors.forEach(s => (s.satisfaction = clamp(s.satisfaction + lim(fx.sponsorSat, 20), 0, 100))); out.push(`${byLang('Satisfação dos patrocinadores', 'Sponsor satisfaction')} ${fx.sponsorSat >= 0 ? '+' : ''}${fx.sponsorSat}`); }
  if (fx.signReserve) { const d = Career.driver(G, fx.signReserve); if (d && !d.team) { Career.placeDriver(G, d, team.id, 'R', d.salary || 0.6, 1); out.push(byLang(`${d.name} vira piloto reserva`, `${d.name} becomes reserve driver`)); } }
  if (fx.engineSelf) { team.car.engineBonus = +((team.car.engineBonus || 0) + 1.6).toFixed(2); out.push(byLang('Potência do motor +1.6', 'Engine power +1.6')); }
  if (fx.marketTalk && typeof Market !== 'undefined') { Market.playerAnswer(G, fx.marketTalk.id, fx.marketTalk.allow); out.push(fx.marketTalk.allow ? byLang('Negociação liberada', 'Talks allowed') : byLang('Abordagem recusada', 'Approach rejected')); }
  if (fx.rivalCar) { const t = Career.team(G, fx.rivalCar.id); if (t) { Object.entries(fx.rivalCar).forEach(([k, v]) => { if (t.car[k] != null) t.car[k] = clamp(t.car[k] + lim(v, 3), 30, 110); }); } }
  return out;
};

Events.resolve = (G, mid, idx) => {
  const m = G.inbox.find(x => x.id === mid);
  if (!m || !m.choices || m.resolved != null) return null;
  const ch = m.choices[idx];
  if (!ch) return null;
  let fx = ch.effects;
  // escolhas com resultado incerto
  if (ch.gamble) fx = RNG.chance(ch.gamble.p) ? ch.gamble.win : ch.gamble.lose;
  const res = Events.applyEffects(G, fx);
  m.resolved = idx;
  m.outcome = (ch.gamble ? (fx === ch.gamble.win ? ch.gamble.winText : ch.gamble.loseText) : ch.outcome) || byLang('Decisão registrada.', 'Decision recorded.');
  m.outcomeFx = res;
  m.read = true;
  return m;
};

/* nomes em inglês para cargos e objetivos de patrocínio (o núcleo não passa pelo dicionário da interface) */
Events.ROLE_EN = { technical: 'Technical director', aero: 'Head of aerodynamics', engineering: 'Chief race engineer', strategy: 'Head of strategy' };
Events.OBJ_EN = { finish: 'Finish with both cars', points: 'Score points', top10both: 'Both cars in the top 10', top5: 'One car in the top 5', podium: 'Podium' };
Events.role = (k) => byLang(Career.STAFF_ROLES[k], Events.ROLE_EN[k] || Career.STAFF_ROLES[k]);
Events.obj = (k) => byLang(Career.SPONSOR_OBJ[k], Events.OBJ_EN[k] || Career.SPONSOR_OBJ[k]);

/* ---------- modelos procedurais ---------- */
const sname = d => d.name.split(' ').slice(-1)[0];
Events.TEMPLATES = [
  {
    key: 'press', w: 3, build: (G, c) => {
      const d = RNG.pick(c.lineup);
      const rival = RNG.pick(G.db.teams.filter(t => t.id !== c.team.id));
      return {
        from: byLang('Assessoria de imprensa', 'Press office'), tag: 'media', title: byLang('Coletiva: pergunta delicada', 'Press conference: a tricky question'),
        body: byLang(`Um jornalista pergunta se ${d.name} está satisfeito com o carro e insinua que a ${rival.name} estaria sondando o piloto. Como você responde?`, `A journalist asks whether ${d.name} is happy with the car and hints that ${rival.name} are sounding the driver out. How do you answer?`),
        choices: [
          { label: byLang('Defender o piloto e o projeto', 'Back the driver and the project'), outcome: byLang('A resposta firme agradou o piloto e a garagem.', 'The firm answer pleased the driver and the garage.'), effects: { morale: { [d.id]: 6 }, reputation: 1 } },
          { label: byLang('Cobrar resultados publicamente', 'Demand results publicly'), outcome: byLang('A cobrança virou manchete. O piloto não gostou, mas a diretoria aprovou a postura.', 'It made headlines. The driver did not like it, but the board approved.'), effects: { morale: { [d.id]: -8 }, board: 4 } },
          { label: byLang('"Sem comentários"', '"No comment"'), outcome: byLang('A imprensa especulou por dias.', 'The press speculated for days.'), effects: { popularity: { [d.id]: -2 }, reputation: -1 } },
        ],
      };
    }
  },
  {
    key: 'sponsor_offer', w: 2.2, cond: (G) => G.sponsors.length < 6 && (typeof Econ === 'undefined' || sum(G.sponsors.map(s => s.perRace)) * G.season.calendar.length < Econ.sponsorPool(Career.team(G)) * 0.95), build: (G, c) => {
      const sp = Career.genSponsors(G, c.team, 1)[0];
      const big = { ...sp, perRace: +(sp.perRace * 1.5).toFixed(2), objective: RNG.pick(['top5', 'podium', 'top10both']) };
      return {
        from: byLang('Departamento comercial', 'Commercial department'), tag: 'money', title: `${byLang('Proposta de patrocínio', 'Sponsorship offer')}: ${sp.name}`,
        body: byLang(`${sp.name} quer estampar a marca no carro por ${sp.seasons} temporada(s). Opção A: ${fmtMoney(sp.perRace)} por GP, bônus de ${fmtMoney(sp.bonus)} ao "${Career.SPONSOR_OBJ[sp.objective]}". Opção B, mais ambiciosa: ${fmtMoney(big.perRace)} por GP, mas exige "${Career.SPONSOR_OBJ[big.objective]}".`, `${sp.name} want their brand on the car for ${sp.seasons} season(s). Option A: ${fmtMoney(sp.perRace)} per GP, with a ${fmtMoney(sp.bonus)} bonus for "${Events.obj(sp.objective)}". Option B, more ambitious: ${fmtMoney(big.perRace)} per GP, but it requires "${Events.obj(big.objective)}".`),
        choices: [
          { label: byLang(`Aceitar opção A (${fmtMoney(sp.perRace)}/GP)`, `Accept option A (${fmtMoney(sp.perRace)}/GP)`), outcome: byLang('Contrato assinado.', 'Contract signed.'), effects: { addSponsor: sp } },
          { label: byLang(`Aceitar opção B (${fmtMoney(big.perRace)}/GP)`, `Accept option B (${fmtMoney(big.perRace)}/GP)`), outcome: byLang('Contrato agressivo assinado. A pressão por resultado aumentou.', 'Aggressive deal signed. The pressure for results just went up.'), effects: { addSponsor: big, board: 2 } },
          { label: byLang('Recusar', 'Decline'), outcome: byLang('Você recusou a proposta.', 'You turned the offer down.'), effects: {} },
        ],
      };
    }
  },
  {
    key: 'wind_tunnel', w: 2, build: (G, c) => ({
      from: byLang('Chefe de aerodinâmica', 'Head of aerodynamics'), tag: 'dev', title: byLang('Descoberta no túnel de vento', 'Wind tunnel breakthrough'),
      body: byLang('A equipe de aerodinâmica encontrou uma correlação promissora no assoalho. Podemos acelerar o desenvolvimento com turnos extras ou guardar o conceito para o carro do ano que vem.', 'The aero team found a promising correlation on the floor. We can speed up development with extra shifts or keep the concept for next year\'s car.'),
      choices: [
        { label: byLang('Turnos extras agora ($2.5M)', 'Extra shifts now ($2.5M)'), gamble: { p: 0.7, win: { money: -2.5, moneyDesc: byLang('Turnos extras no túnel', 'Extra wind tunnel shifts'), car: { aero: 1.2 } }, lose: { money: -2.5, moneyDesc: byLang('Turnos extras no túnel', 'Extra wind tunnel shifts'), car: { aero: 0.2 } }, winText: byLang('Funcionou: a nova peça trouxe ganho real de carga.', 'It worked: the new part brought a real downforce gain.'), loseText: byLang('Os dados de pista não confirmaram o túnel. Ganho mínimo.', 'Track data did not confirm the tunnel. Minimal gain.') } },
        { label: byLang('Guardar para o próximo ano', 'Keep it for next year'), outcome: byLang('O conceito foi arquivado para o carro novo.', 'The concept was shelved for the new car.'), effects: { nextYear: 1.2 } },
        { label: byLang('Ignorar e manter o plano', 'Ignore it and stick to the plan'), outcome: byLang('Nada muda.', 'Nothing changes.'), effects: {} },
      ],
    })
  },
  {
    key: 'flexi_wing', w: 1.2, build: (G, c) => ({
      from: byLang('Federação', 'Federation'), tag: 'fia', title: byLang('Investigação: asa flexível', 'Investigation: flexible wing'),
      body: byLang(`A Federação recebeu queixa de rivais sobre a flexão da asa traseira da ${c.team.name}. Os testes estáticos ainda são passados, mas o delegado técnico pediu esclarecimentos.`, `The Federation received complaints from rivals about ${c.team.name}'s rear wing flexing. The static tests are still passed, but the technical delegate has asked for clarification.`),
      choices: [
        { label: byLang('Enrijecer a asa voluntariamente', 'Stiffen the wing voluntarily'), outcome: byLang('Você perdeu um pouco de velocidade de reta, mas o caso foi arquivado.', 'You lost a little straight-line speed, but the case was closed.'), effects: { car: { aero: -0.6 }, reputation: 1 } },
        { label: byLang('Contestar e manter a peça', 'Contest it and keep the part'), gamble: { p: 0.55, win: { reputation: -1, board: 2 }, lose: { money: -3, moneyDesc: byLang('Multa da Federação', 'Federation fine'), car: { aero: -1 }, reputation: -3 }, winText: byLang('A Federação aceitou os argumentos. A peça segue no carro.', 'The Federation accepted the arguments. The part stays on the car.'), loseText: byLang('Derrota: multa de $3M e a peça foi banida.', 'Defeat: a $3M fine and the part was banned.') } },
      ],
    })
  },
  {
    key: 'staff_poach', w: 1.3, build: (G, c) => {
      const role = RNG.pick(['aero', 'technical', 'engineering', 'strategy']);
      const rival = RNG.pick(G.db.teams.filter(t => t.id !== c.team.id && t.budget > c.team.budget * 0.9));
      if (!rival) return null;
      return {
        from: byLang('Recursos humanos', 'Human resources'), tag: 'team', title: byLang(`${rival.name} assedia seu ${Career.STAFF_ROLES[role].toLowerCase()}`, `${rival.name} chase your ${Events.role(role).toLowerCase()}`),
        body: byLang(`A ${rival.name} ofereceu o dobro do salário ao seu ${Career.STAFF_ROLES[role].toLowerCase()}. Ele espera uma contraproposta até amanhã.`, `${rival.name} offered your ${Events.role(role).toLowerCase()} double the salary. They expect a counter-offer by tomorrow.`),
        choices: [
          { label: byLang('Cobrir a oferta ($3M)', 'Match the offer ($3M)'), outcome: byLang('Ele fica, motivado.', 'They stay, motivated.'), effects: { money: -3, moneyDesc: byLang('Aumento de staff', 'Staff pay rise'), staff: { [role]: 1 } } },
          { label: byLang('Deixar sair', 'Let them go'), outcome: byLang('Ele foi embora e o substituto interno é mais fraco.', 'They left, and the internal replacement is weaker.'), effects: { staff: { [role]: -6 }, rivalCar: { id: rival.id, aero: role === 'aero' ? 1 : 0.4 } } },
        ],
      };
    }
  },
  {
    key: 'driver_demand', w: 1.5, build: (G, c) => {
      const [a, b] = c.lineup;
      if (!b) return null;
      const n2 = a.seat === 2 ? a : b;
      return {
        from: n2.name, tag: 'team', title: byLang('Pedido por igualdade de tratamento', 'Request for equal treatment'),
        body: byLang(`${n2.name} sente que recebe as atualizações sempre depois do companheiro e quer garantia de tratamento igual.`, `${n2.name} feels upgrades always arrive after their teammate's and wants a guarantee of equal treatment.`),
        choices: [
          { label: byLang('Garantir igualdade total', 'Guarantee full equality'), outcome: byLang('O clima na garagem melhorou para um lado e piorou para o outro.', 'The mood in the garage improved on one side and soured on the other.'), effects: { morale: { [n2.id]: 8, [(n2 === a ? b : a).id]: -4 } } },
          { label: byLang('Manter hierarquia', 'Keep the hierarchy'), outcome: byLang('Hierarquia mantida, piloto contrariado.', 'Hierarchy kept, driver unhappy.'), effects: { morale: { [n2.id]: -9 } } },
          { label: byLang('Prometer pódio para rever', 'Review it after a podium'), outcome: byLang('Ele aceitou o desafio.', 'They accepted the challenge.'), effects: { morale: { [n2.id]: 2 } } },
        ],
      };
    }
  },
  {
    key: 'engine_update', w: 1, build: (G, c) => {
      const e = Engine.engineOf(G.db, c.team);
      return {
        from: e.name, tag: 'dev', title: byLang('Nova especificação de motor disponível', 'New engine specification available'),
        body: byLang(`A ${e.name} liberou uma especificação nova da unidade de potência. Instalá-la agora gera punição de grid de 10 posições para os dois carros na próxima corrida, mas traz potência.`, `${e.name} released a new power unit specification. Fitting it now means a 10-place grid penalty for both cars at the next race, but it brings power.`),
        choices: [
          { label: byLang('Instalar já (punição)', 'Fit it now (penalty)'), outcome: byLang('Motor novo nos carros. Vamos largar de trás.', 'New engines in the cars. We start from the back.'), effects: { car: { reliability: 1 }, gridPenalty: { d1: 10, d2: 10 }, engineSelf: true, money: -1.5, moneyDesc: byLang('Taxa de motor', 'Engine fee') } },
          { label: byLang('Esperar o fim da temporada', 'Wait for the end of the season'), outcome: byLang('Mantivemos o motor atual.', 'We kept the current engine.'), effects: {} },
        ],
      };
    }
  },
  {
    key: 'injury', w: 0.5, build: (G, c) => {
      const d = RNG.pick(c.lineup);
      const res = Career.teamDrivers(G, c.team.id).find(x => x.seat === 'R');
      const free = G.db.drivers.filter(x => !x.team && !x.retired).sort((a, b) => driverOverall(b) - driverOverall(a)).slice(0, 3);
      return {
        from: byLang('Departamento médico', 'Medical department'), tag: 'team', title: byLang(`${d.name} lesionado`, `${d.name} injured`),
        body: byLang(`${d.name} se machucou em um treino físico e vai perder ${res ? 'a próxima corrida' : 'a próxima corrida. Você não tem reserva contratado'}.`, `${d.name} got hurt in a fitness session and will miss ${res ? 'the next race' : 'the next race. You have no reserve driver signed'}.`),
        choices: res ? [{ label: byLang(`Chamar ${res.name}`, `Call up ${res.name}`), outcome: byLang(`${res.name} vai correr.`, `${res.name} will race.`), effects: { injury: { [d.id]: 1 } } }] :
          free.map(f => ({ label: byLang(`Contratar ${f.name} como reserva (${driverOverall(f)})`, `Sign ${f.name} as reserve (${driverOverall(f)})`), outcome: byLang(`${f.name} assinou como reserva e vai correr.`, `${f.name} signed as reserve and will race.`), effects: { injury: { [d.id]: 1 }, signReserve: f.id, money: -0.4, moneyDesc: byLang('Contrato de reserva', 'Reserve contract') } })),
      };
    }
  },
  {
    key: 'junior', w: 1, build: (G, c) => {
      const pool = G.db.drivers.filter(x => !x.team && !x.retired && x.potential >= 86).sort((a, b) => b.potential - a.potential);
      const j = pool[0] && RNG.pick(pool.slice(0, 3));
      if (!j) return null;
      return {
        from: byLang('Programa de jovens pilotos', 'Young driver programme'), tag: 'team', title: byLang(`${j.name} se destaca nas categorias de base`, `${j.name} stands out in the junior categories`),
        body: ((est) => byLang(`${j.name} (${j.age} anos, potencial estimado ${est}) venceu de novo na categoria de acesso. O empresário oferece um contrato de piloto reserva com opção de promoção.`, `${j.name} (${j.age}, estimated potential ${est}) won again in the junior category. Their manager offers a reserve driver contract with an option for promotion.`))((() => { const e = typeof Potential !== 'undefined' ? Potential.estimate(G, j) : null; return e ? `${e.lo}–${e.hi}` : j.potential; })()),
        choices: [
          { label: byLang('Contratar como reserva ($0.6M)', 'Sign as reserve ($0.6M)'), outcome: byLang(`${j.name} agora é piloto reserva da equipe.`, `${j.name} is now the team's reserve driver.`), effects: { signReserve: j.id, money: -0.6, moneyDesc: byLang('Contrato de reserva', 'Reserve contract') } },
          { label: byLang('Dar um teste no simulador ($0.2M)', 'Give them a simulator test ($0.2M)'), outcome: byLang('Bons números no simulador; os engenheiros aprenderam algo.', 'Good simulator numbers; the engineers learned something.'), effects: { money: -0.2, moneyDesc: byLang('Teste de simulador', 'Simulator test'), staff: { engineering: 1 } } },
          { label: byLang('Não agora', 'Not now'), outcome: byLang('Ficamos de olho.', 'We will keep an eye on them.'), effects: {} },
        ],
      };
    }
  },
  {
    key: 'data_leak', w: 0.7, build: (G, c) => ({
      from: byLang('Segurança da informação', 'Information security'), tag: 'fia', title: byLang('Suspeita de vazamento de dados', 'Suspected data leak'),
      body: byLang('Um engenheiro que saiu para uma rival pode ter levado arquivos de CAD. Uma investigação custa caro e chama atenção da imprensa.', 'An engineer who left for a rival may have taken CAD files. An investigation is expensive and draws press attention.'),
      choices: [
        { label: byLang('Investigar e processar ($1.5M)', 'Investigate and sue ($1.5M)'), gamble: { p: 0.6, win: { money: 1.5, moneyDesc: byLang('Acordo judicial', 'Legal settlement'), reputation: 2 }, lose: { money: -1.5, moneyDesc: byLang('Custos jurídicos', 'Legal costs'), reputation: -1 }, winText: byLang('Provas encontradas: acordo de indenização favorável.', 'Evidence found: a favourable settlement.'), loseText: byLang('Sem provas. Gastamos dinheiro e o assunto vazou.', 'No evidence. We spent money and the story leaked.') } },
        { label: byLang('Reforçar a segurança internamente', 'Tighten security internally'), outcome: byLang('Mais controle, menos risco.', 'More control, less risk.'), effects: { money: -0.5, moneyDesc: byLang('Segurança de TI', 'IT security') } },
        { label: byLang('Ignorar', 'Ignore it'), gamble: { p: 0.6, win: {}, lose: { car: { aero: -0.5 } }, winText: byLang('Nada aconteceu.', 'Nothing happened.'), loseText: byLang('Peças parecidas com as nossas apareceram no carro rival.', 'Parts similar to ours appeared on the rival car.') } },
      ],
    })
  },
  {
    key: 'fan_event', w: 1.4, build: (G, c) => {
      const d = RNG.pick(c.lineup);
      return {
        from: 'Marketing', tag: 'media', title: byLang('Evento com fãs no meio da semana', 'Midweek fan event'),
        body: byLang(`Os patrocinadores pedem que ${d.name} participe de um evento com fãs, o que tira um dia de simulador.`, `The sponsors want ${d.name} at a fan event, which costs a simulator day.`),
        choices: [
          { label: byLang('Mandar o piloto', 'Send the driver'), outcome: byLang('Fãs e patrocinadores felizes.', 'Fans and sponsors are happy.'), effects: { popularity: { [d.id]: 4 }, sponsorSat: 6, practiceBonus: -1 } },
          { label: byLang('Priorizar o simulador', 'Prioritise the simulator'), outcome: byLang('Os patrocinadores não gostaram.', 'The sponsors were not pleased.'), effects: { sponsorSat: -6, practiceBonus: 1 } },
        ],
      };
    }
  },
  {
    key: 'pit_training', w: 1, build: (G, c) => ({
      from: byLang('Chefe de mecânicos', 'Chief mechanic'), tag: 'team', title: byLang('Mecânicos pedem treinamento extra', 'Mechanics ask for extra training'),
      body: byLang(`Nossas paradas estão ${c.team.pitCrew < 85 ? 'abaixo da média do grid' : 'boas, mas dá para melhorar'}. Um campo de treinamento custa $0.8M.`, `Our pit stops are ${c.team.pitCrew < 85 ? 'below the grid average' : 'good, but could be better'}. A training camp costs $0.8M.`),
      choices: [
        { label: byLang('Aprovar ($0.8M)', 'Approve ($0.8M)'), outcome: byLang('Equipe de pit mais afiada.', 'A sharper pit crew.'), effects: { money: -0.8, moneyDesc: byLang('Treinamento de pit', 'Pit training'), pitCrew: 2 } },
        { label: byLang('Recusar', 'Decline'), outcome: byLang('Seguimos como estamos.', 'We carry on as we are.'), effects: {} },
      ],
    })
  },
  {
    key: 'rival_crisis', w: 0.8, build: (G, c) => {
      const poor = G.db.teams.filter(x => x.id !== c.team.id).sort((a, b) => (a.cash ?? a.budget) - (b.cash ?? b.budget)).slice(0, 2);
      const t = RNG.pick(poor.filter(x => (x.cash ?? 0) < x.budget * 0.25));
      if (!t) return null;
      return {
        from: byLang('Rumores do paddock', 'Paddock rumours'), tag: 'market', title: byLang(`${t.name} em crise financeira`, `${t.name} in financial crisis`),
        body: byLang(`A ${t.name} atrasou salários e está vendendo equipamentos de simulador. Podemos comprar parte deles barato.`, `${t.name} are behind on wages and selling simulator equipment. We could buy some of it cheaply.`),
        choices: [
          { label: byLang('Comprar o simulador ($2M)', 'Buy the simulator ($2M)'), outcome: byLang('Equipamento novo para nossos engenheiros.', 'New equipment for our engineers.'), effects: { money: -2, moneyDesc: byLang('Compra de simulador', 'Simulator purchase'), staff: { engineering: 2 }, practiceBonus: 1 } },
          { label: byLang('Contratar engenheiros deles ($1.2M)', 'Hire their engineers ($1.2M)'), outcome: byLang('Três engenheiros experientes chegaram.', 'Three experienced engineers arrived.'), effects: { money: -1.2, moneyDesc: byLang('Contratações', 'Hires'), staff: { technical: 2 }, rivalCar: { id: t.id, chassis: -0.6 } } },
          { label: byLang('Não se envolver', 'Stay out of it'), outcome: byLang('Você observou de longe.', 'You watched from a distance.'), effects: {} },
        ],
      };
    }
  },
  {
    key: 'tyre_supplier', w: 0.9, build: (G, c) => ({
      from: byLang('Fornecedor de pneus', 'Tyre supplier'), tag: 'fia', title: byLang('Teste de pneus do próximo ano', 'Next year\'s tyre test'),
      body: byLang('O fornecedor de pneus procura uma equipe para rodar um teste privado com os compostos do próximo ano. Ajuda a entender os pneus, mas tira tempo da fábrica.', 'The tyre supplier is looking for a team to run a private test with next year\'s compounds. It helps to understand the tyres, but takes time away from the factory.'),
      choices: [
        { label: byLang('Aceitar o teste', 'Accept the test'), outcome: byLang('Aprendemos sobre a janela térmica dos pneus novos.', 'We learned about the new tyres\' temperature window.'), effects: { car: { tyreCare: 1 }, nextYear: 0.4, money: 0.5, moneyDesc: byLang('Taxa do teste de pneus', 'Tyre test fee') } },
        { label: byLang('Recusar', 'Decline'), outcome: byLang('Foco total na fábrica.', 'Full focus on the factory.'), effects: {} },
      ],
    })
  },
  {
    key: 'board_pressure', w: 1, cond: (G) => G.board.confidence < 45, build: (G, c) => ({
      from: byLang('Diretoria', 'Board'), tag: 'board', title: byLang('A diretoria quer explicações', 'The board wants answers'),
      body: byLang(`Os resultados estão abaixo da meta de ${ordinal(G.board.target)} lugar. O conselho pede um plano de ação.`, `Results are below the ${ordinal(G.board.target)}-place target. The board wants an action plan.`),
      choices: [
        { label: byLang('Prometer pontos na próxima corrida', 'Promise points at the next race'), outcome: byLang('Promessa registrada. Melhor cumprir.', 'Promise noted. Better deliver.'), effects: { board: 5, moraleAll: -2 } },
        { label: byLang('Pedir paciência e mostrar o plano de P&D', 'Ask for patience and show the R&D plan'), outcome: byLang('A diretoria aceitou, com ressalvas.', 'The board accepted, with reservations.'), effects: { board: 2 } },
        { label: byLang('Culpar os pilotos', 'Blame the drivers'), outcome: byLang('A diretoria comprou a ideia; os pilotos, não.', 'The board bought it; the drivers did not.'), effects: { board: 6, moraleAll: -10 } },
      ],
    })
  },
  {
    key: 'investor', w: 0.6, cond: (G) => G.finances.balance < 10, build: (G, c) => ({
      from: byLang('Diretoria', 'Board'), tag: 'money', title: byLang('Investidor oferece aporte', 'Investor offers funding'),
      body: byLang('Um fundo de investimentos oferece $12M em troca de influência nas decisões comerciais da equipe.', 'An investment fund offers $12M in exchange for a say in the team\'s commercial decisions.'),
      choices: [
        { label: byLang('Aceitar o aporte', 'Accept the funding'), outcome: byLang('Caixa reforçado, mas a diretoria agora tem mais um sócio exigente.', 'Cash boosted, but the board now has one more demanding partner.'), effects: { money: 12, moneyDesc: byLang('Aporte de investidor', 'Investor funding'), board: -6 } },
        { label: byLang('Recusar', 'Decline'), outcome: byLang('Independência mantida.', 'Independence kept.'), effects: { board: 2 } },
      ],
    })
  },
  {
    key: 'teammate_clash', w: 1, cond: (G, c) => c.lastMine && c.lastMine.length === 2 && Math.abs(c.lastMine[0].pos - c.lastMine[1].pos) <= 2, build: (G, c) => {
      const [a, b] = c.lineup;
      if (!b) return null;
      return {
        from: byLang('Engenheiro de corrida', 'Race engineer'), tag: 'team', title: byLang('Clima tenso entre os pilotos', 'Tension between the drivers'),
        body: byLang(`${a.name} e ${b.name} brigaram roda a roda no último GP e trocaram acusações no rádio.`, `${a.name} and ${b.name} fought wheel to wheel at the last GP and traded accusations on the radio.`),
        choices: [
          { label: byLang('Reunião a portas fechadas', 'Closed-door meeting'), outcome: byLang('Os dois saíram mais calmos.', 'Both came out calmer.'), effects: { morale: { [a.id]: 2, [b.id]: 2 } } },
          { label: byLang(`Dar razão a ${sname(a)}`, `Side with ${sname(a)}`), outcome: byLang(`${sname(b)} ficou furioso.`, `${sname(b)} was furious.`), effects: { morale: { [a.id]: 6, [b.id]: -9 } } },
          { label: byLang(`Dar razão a ${sname(b)}`, `Side with ${sname(b)}`), outcome: byLang(`${sname(a)} ficou furioso.`, `${sname(a)} was furious.`), effects: { morale: { [a.id]: -9, [b.id]: 6 } } },
        ],
      };
    }
  },
  {
    key: 'logistics', w: 0.7, build: (G, c) => ({
      from: byLang('Logística', 'Logistics'), tag: 'team', title: byLang('Carga atrasada no aeroporto', 'Freight stuck at the airport'),
      body: byLang('Parte do material da equipe ficou presa na alfândega. Um frete aéreo extra resolve, mas custa caro.', 'Part of the team\'s freight is stuck in customs. Extra air freight solves it, but it is expensive.'),
      choices: [
        { label: byLang('Frete extra ($0.9M)', 'Extra freight ($0.9M)'), outcome: byLang('Tudo chegou a tempo.', 'Everything arrived on time.'), effects: { money: -0.9, moneyDesc: byLang('Frete aéreo extra', 'Extra air freight') } },
        { label: byLang('Esperar', 'Wait'), outcome: byLang('As peças chegaram tarde: menos tempo de treino.', 'The parts arrived late: less practice time.'), effects: { practiceBonus: -2 } },
      ],
    })
  },
  {
    key: 'charity', w: 0.8, build: (G, c) => ({
      from: 'Marketing', tag: 'media', title: byLang('Pintura especial beneficente', 'Charity livery'),
      body: byLang('Uma ONG propõe uma pintura especial no próximo GP para arrecadar fundos. A mídia adora esse tipo de ação.', 'A charity proposes a special livery at the next GP to raise funds. The media love this kind of thing.'),
      choices: [
        { label: byLang('Fazer a pintura ($0.3M)', 'Run the livery ($0.3M)'), outcome: byLang('Pintura linda, repercussão enorme.', 'A beautiful livery and a huge response.'), effects: { money: -0.3, moneyDesc: byLang('Pintura especial', 'Special livery'), reputation: 2, moraleAll: 2 } },
        { label: byLang('Recusar', 'Decline'), outcome: byLang('Fica para outra ocasião.', 'Maybe another time.'), effects: {} },
      ],
    })
  },
  {
    key: 'reliability_scare', w: 0.9, build: (G, c) => ({
      from: byLang('Diretor técnico', 'Technical director'), tag: 'dev', title: byLang('Fissura encontrada em peça do câmbio', 'Crack found in a gearbox part'),
      body: byLang('A inspeção pós-corrida encontrou microfissuras no câmbio. Podemos trocar o lote inteiro ou reforçar e seguir.', 'The post-race inspection found micro-cracks in the gearbox. We can replace the whole batch or reinforce and carry on.'),
      choices: [
        { label: byLang('Trocar o lote ($1.8M)', 'Replace the batch ($1.8M)'), outcome: byLang('Peças novas, risco eliminado.', 'New parts, risk removed.'), effects: { money: -1.8, moneyDesc: byLang('Lote de câmbios', 'Gearbox batch'), car: { reliability: 1.5 } } },
        { label: byLang('Reforçar e seguir', 'Reinforce and carry on'), gamble: { p: 0.65, win: {}, lose: { car: { reliability: -2.5 } }, winText: byLang('O reforço aguentou.', 'The reinforcement held.'), loseText: byLang('O problema se espalhou: confiabilidade caiu.', 'The problem spread: reliability dropped.') } },
      ],
    })
  },
];

Events.context = (G, summary) => {
  const team = Career.team(G);
  const lineup = Career.lineup(G, team.id);
  const lastMine = summary ? summary.cls.filter(r => r.tid === team.id) : null;
  return { team, lineup, lastMine };
};

Events.betweenRaces = (G, summary) => {
  if (Career.isObs(G)) { Events.worldNews(G, summary); return; }
  const c = Events.context(G, summary);
  const rate = G.options.eventRate ?? 1;
  const n = RNG.chance(0.55 * rate) ? (RNG.chance(0.25 * rate) ? 2 : 1) : 0;
  const used = new Set(G.inbox.slice(0, 8).map(m => m.eventKey));
  for (let i = 0; i < n; i++) {
    const pool = Events.TEMPLATES.filter(t => !used.has(t.key) && (!t.cond || t.cond(G, c)));
    if (!pool.length) break;
    const t = RNG.weighted(pool, x => x.w);
    used.add(t.key);
    const ev = t.build(G, c);
    if (ev) Career.mail(G, { ...ev, eventKey: t.key });
  }
  // notícias de outras equipes
  if (RNG.chance(0.5)) {
    const t = RNG.pick(G.db.teams.filter(x => x.id !== c.team.id));
    const d = RNG.pick(Career.lineup(G, t.id));
    const lines = [
      byLang(`${d.name} diz que a ${t.name} "ainda não mostrou tudo"`, `${d.name} says ${t.name} "have not shown everything yet"`),
      byLang(`Rumor: ${t.name} avalia trocar de fornecedor de motor`, `Rumour: ${t.name} weigh up a change of engine supplier`),
      byLang(`${t.name} confirma novo diretor técnico para o próximo ano`, `${t.name} confirm a new technical director for next year`),
      byLang(`${d.name} é o piloto mais popular da semana nas redes`, `${d.name} is the most popular driver on social media this week`),
      byLang('Federação esclarece regra de limites de pista após polêmica', 'Federation clarifies the track limits rule after controversy'),
      byLang(`${t.name} promete grande atualização para as próximas etapas`, `${t.name} promise a big upgrade for the coming rounds`),
    ];
    Career.news(G, RNG.pick(lines), 'paddock');
  }
  Events.worldNews(G, summary);
};

/* ---------- eventos escritos pela IA ---------- */
Events.aiPrompt = (G, summary) => {
  const team = Career.team(G);
  const lineup = Career.lineup(G, team.id);
  const sc = Career.standingsC(G);
  const pos = sc.findIndex(x => x.tid === team.id) + 1;
  const next = Career.seasonOver(G) ? null : Career.currentTrack(G);
  const rivals = sc.slice(Math.max(0, pos - 3), pos + 2).filter(x => x.tid !== team.id).map(x => Career.team(G, x.tid).name);
  const recent = G.inbox.slice(0, 6).map(m => m.title);
  const ctx = {
    serie: G.db.rules.seriesName, temporada: G.season.year, etapa: `${G.season.round}/${G.season.calendar.length}`,
    equipe: team.name, chefe: G.player.name, posicaoConstrutores: pos, metaDiretoria: G.board.target, confiancaDiretoria: Math.round(G.board.confidence),
    caixaMilhoes: Math.round(G.finances.balance), reputacao: team.reputation,
    pilotos: lineup.map((d, i) => ({ ref: 'd' + (i + 1), nome: d.name, idade: d.age, moral: Math.round(d.morale), overall: driverOverall(d) })),
    ultimaCorrida: summary ? { gp: summary.gp, resultados: summary.cls.filter(r => r.tid === team.id).map(r => ({ piloto: Career.driver(G, r.did).name, pos: r.pos, status: r.status === 'dnf' ? `abandono (${r.reason})` : 'terminou' })), vencedor: Career.driver(G, summary.winner).name, chuva: summary.wet > 0.25, safetyCars: summary.sc } : null,
    proximaCorrida: next ? next.gp : null, rivaisProximos: rivals, eventosRecentes: recent,
  };
  return `Você é o roteirista de um jogo de gestão de equipe de automobilismo (monopostos, estilo Fórmula 1). Crie UM evento novo e original que acontece entre as corridas, fora da pista ou nos bastidores (mídia, política, técnica, patrocínio, pilotos, staff, federação, fãs, rivais). Deve ser plausível no mundo real do automobilismo, reagir ao contexto e não repetir os eventos recentes. Escreva em ${byLang('português do Brasil', 'inglês (English)')}, tom jornalístico, 2 a 4 frases no corpo.

Contexto do jogo (JSON):
${JSON.stringify(ctx)}

Responda SOMENTE com JSON neste formato:
{"from":"remetente curto","title":"título até 70 caracteres","body":"texto do evento","choices":[{"label":"opção curta","outcome":"o que aconteceu, 1 frase","effects":{...}}]}

Use de 2 a 3 escolhas, com consequências diferentes e equilibradas (ganhar algo custa algo). Chaves permitidas em "effects" (todas opcionais, números):
- "money": milhões de dólares, de -6 a 6
- "reputation": -4 a 4
- "board": confiança da diretoria, -10 a 10
- "morale": {"d1": -12 a 12, "d2": ...} (d1/d2 = pilotos do contexto)
- "popularity": {"d1": -8 a 8}
- "car": {"aero": -1.5 a 1.5, "chassis": ..., "reliability": ..., "tyreCare": ...}
- "pitCrew": -3 a 3
- "staff": {"technical"|"aero"|"engineering"|"strategy": -5 a 5}
- "practiceBonus": voltas de treino no próximo GP, -2 a 2
- "sponsorSat": satisfação dos patrocinadores, -10 a 10
- "nextYear": desenvolvimento do carro do ano que vem, -1 a 1.5
Exemplo de escolha: {"label":"Aceitar o convite","outcome":"A visita rendeu boas manchetes.","effects":{"reputation":2,"practiceBonus":-1}}`;
};

Events.validateAI = (ev) => {
  if (!ev || typeof ev !== 'object' || !ev.title || !ev.body || !Array.isArray(ev.choices) || ev.choices.length < 2) return null;
  const allowed = ['money', 'reputation', 'board', 'morale', 'popularity', 'car', 'pitCrew', 'staff', 'practiceBonus', 'sponsorSat', 'nextYear'];
  const cleanFx = (fx) => {
    const o = {};
    if (!fx || typeof fx !== 'object') return o;
    allowed.forEach(k => {
      if (fx[k] == null) return;
      if (typeof fx[k] === 'number') o[k] = fx[k];
      else if (typeof fx[k] === 'object') {
        const sub = {};
        Object.entries(fx[k]).forEach(([a, b]) => { if (typeof b === 'number' && /^[a-zA-Z0-9_]{1,20}$/.test(a)) sub[a] = b; });
        o[k] = sub;
      }
    });
    if (o.money) o.moneyDesc = byLang('Evento: ', 'Event: ') + String(ev.title).slice(0, 50);
    if (o.car) Object.keys(o.car).forEach(k => (o.car[k] = clamp(o.car[k], -1.5, 1.5)));
    if (o.nextYear) o.nextYear = clamp(o.nextYear, -1, 1.5);
    if (o.money) o.money = clamp(o.money, -6, 6);
    return o;
  };
  return {
    from: String(ev.from || 'Paddock').slice(0, 40), title: String(ev.title).slice(0, 90), body: String(ev.body).slice(0, 700), tag: 'ai', ai: true,
    choices: ev.choices.slice(0, 3).map(c => ({ label: String(c.label || byLang('Escolher', 'Choose')).slice(0, 70), outcome: String(c.outcome || '').slice(0, 300), effects: cleanFx(c.effects) })),
  };
};

/* ---------- textos de rádio do engenheiro ---------- */
Events.radio = (race, car, wk) => {
  const w = race.wet[race.lap + 1] ?? 0;
  const msgs = [];
  if ('SMH'.includes(car.tyre.c) && w > 0.2) msgs.push(byLang('Chuva chegando. Recomendo intermediários.', 'Rain coming. I recommend intermediates.'));
  if (car.tyre.c === 'I' && w < 0.12) msgs.push(byLang('Pista secando. Hora de pneus de pista seca.', 'Track drying. Time for slicks.'));
  if (car.tyre.wear > 70 && 'SMH'.includes(car.tyre.c)) msgs.push(byLang(`Pneus em ${Math.round(car.tyre.wear)}%. Desempenho caindo rápido.`, `Tyres at ${Math.round(car.tyre.wear)}%. Performance dropping fast.`));
  if (race.sc && car.tyre.wear > 30) msgs.push(byLang('Safety Car: parada mais barata agora.', 'Safety Car: a cheaper stop now.'));
  // (0.8.7) conforme o tamanho do dano e a bandeira preta e laranja
  if (car.meatball) msgs.unshift(byLang(`BOX, BOX! Bandeira preta e laranja: asa solta. Pare até a volta ${car.meatball.until} ou é bandeira preta.`, `BOX, BOX! Black and orange flag: loose wing. Pit by lap ${car.meatball.until} or it is a black flag.`));
  else if (car.damage.wing >= 0.6) msgs.push(byLang(`Asa muito danificada: ${(car.damage.wing * 0.9).toFixed(1)} s por volta. Recomendo parar.`, `Heavy wing damage: ${(car.damage.wing * 0.9).toFixed(1)} s per lap. I recommend pitting.`));
  else if (car.damage.wing > 0) msgs.push(byLang(`Perdemos um pedaço da asa: ${(car.damage.wing * 0.9).toFixed(1)} s por volta. Dá para seguir até a parada.`, `We lost part of the wing: ${(car.damage.wing * 0.9).toFixed(1)} s per lap. We can stay out until the stop.`));
  return msgs;
};

/* Notícias do mundo (usadas em todos os modos): nascem de fatos do banco de dados */
Events.worldNews = (G, summary) => {
  if (!summary) return;
  const st = Career.standingsD(G);
  const leader = st[0];
  // sequência de abandonos
  summary.cls.filter(c => c.status === 'dnf').forEach(c => {
    const recent = G.season.results.slice(-3).map(r => r.cls.find(x => x.did === c.did)).filter(Boolean);
    if (recent.length === 3 && recent.every(x => x.status === 'dnf')) {
      const d = Career.driver(G, c.did);
      Career.news(G, byLang(`Terceiro abandono seguido: fase ruim de ${d.name} preocupa a ${Career.team(G, c.tid).name}`, `Third retirement in a row: ${d.name}'s bad run worries ${Career.team(G, c.tid).name}`), 'paddock');
    }
  });
  // liderança trocou de mãos
  if (G.season.results.length > 1 && leader) {
    const prevLeader = G._prevLeader;
    if (prevLeader && prevLeader !== leader.did) Career.news(G, byLang(`${Career.driver(G, leader.did).name} assume a liderança do campeonato`, `${Career.driver(G, leader.did).name} takes the championship lead`), 'campeonato', byLang(`Agora com ${leader.pts} pontos após ${G.season.results.length} etapas.`, `Now on ${leader.pts} points after ${G.season.results.length} rounds.`));
    G._prevLeader = leader.did;
  }
  // primeira vitória da carreira
  const w = Career.driver(G, summary.winner);
  if (w && w.career.wins === 1) Career.news(G, byLang(`Primeira vitória da carreira para ${w.name}!`, `First career win for ${w.name}!`), 'corrida');
  // duelo interno
  G.db.teams.forEach(t => {
    const ds = Career.lineup(G, t.id);
    if (ds.length === 2) {
      const a = G.season.stats[ds[0].id], b = G.season.stats[ds[1].id];
      if (a && b && G.season.results.length >= 6 && Math.abs((a.beatMate || 0) - (b.beatMate || 0)) >= 6 && RNG.chance(0.15)) {
        const [top, low] = (a.beatMate > b.beatMate) ? ds : [ds[1], ds[0]];
        Career.news(G, byLang(`${low.name} sob pressão: ${top.name} domina o duelo interno na ${t.name}`, `${low.name} under pressure: ${top.name} dominates the in-team battle at ${t.name}`), 'paddock');
      }
    }
  });
};
