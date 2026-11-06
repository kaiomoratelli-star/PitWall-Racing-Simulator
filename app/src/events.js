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
  if (fx.money) { const v = lim(fx.money, 25); Career.ledger(G, fx.moneyDesc || 'Evento', v, v >= 0 ? 'receita' : 'evento'); out.push(`${v >= 0 ? '+' : ''}${fmtMoney(v)}`); }
  if (fx.reputation) { const v = lim(fx.reputation, 8); team.reputation = clamp(team.reputation + v, 10, 99); out.push(`Reputação ${v >= 0 ? '+' : ''}${v}`); }
  if (fx.board) { const v = lim(fx.board, 20); G.board.confidence = clamp(G.board.confidence + v, 0, 100); out.push(`Diretoria ${v >= 0 ? '+' : ''}${v}`); }
  const perDriver = (obj, field, m, label) => {
    Object.entries(obj || {}).forEach(([did, v]) => {
      const id = did === 'd1' ? myIds[0] : did === 'd2' ? myIds[1] : did;
      const d = Career.driver(G, id);
      if (!d) return;
      const x = lim(v, m);
      d[field] = clamp((d[field] ?? 50) + x, 1, 100);
      out.push(`${label} de ${d.name.split(' ').slice(-1)[0]} ${x >= 0 ? '+' : ''}${x}`);
    });
  };
  perDriver(fx.morale, 'morale', 25, 'Moral');
  perDriver(fx.popularity, 'popularity', 15, 'Popularidade');
  if (fx.moraleAll) { const v = lim(fx.moraleAll, 20); Career.lineup(G, team.id).forEach(d => (d.morale = clamp(d.morale + v, 1, 100))); out.push(`Moral dos pilotos ${v >= 0 ? '+' : ''}${v}`); }
  if (fx.car) {
    Object.entries(fx.car).forEach(([k, v]) => {
      if (!['aero', 'chassis', 'reliability', 'tyreCare'].includes(k)) return;
      const x = lim(v, 3);
      team.car[k] = +clamp(team.car[k] + x, 30, 110).toFixed(2);
      out.push(`${({ aero: 'Aero', chassis: 'Chassi', reliability: 'Confiabilidade', tyreCare: 'Pneus' })[k]} ${x >= 0 ? '+' : ''}${x}`);
    });
  }
  if (fx.pitCrew) { const v = lim(fx.pitCrew, 5); team.pitCrew = clamp(team.pitCrew + v, 30, 100); out.push(`Pit crew ${v >= 0 ? '+' : ''}${v}`); }
  if (fx.staff) Object.entries(fx.staff).forEach(([k, v]) => { if (team.staff[k] != null) { const x = lim(v, 8); team.staff[k] = clamp(team.staff[k] + x, 30, 99); out.push(`${Career.STAFF_ROLES[k]} ${x >= 0 ? '+' : ''}${x}`); } });
  if (fx.practiceBonus) { const v = lim(fx.practiceBonus, 3); G.pendingPracticeBonus = (G.pendingPracticeBonus || 0) + v; out.push(`${v >= 0 ? '+' : ''}${v} volta(s) de treino no próximo GP`); }
  if (fx.nextYear) { const v = lim(fx.nextYear, 3); G.nextYearBank += v; out.push(`Carro do próximo ano ${v >= 0 ? '+' : ''}${v}`); }
  if (fx.gridPenalty) Object.entries(fx.gridPenalty).forEach(([did, n]) => { const id = did === 'd1' ? myIds[0] : did === 'd2' ? myIds[1] : did; G.gridPenalties = G.gridPenalties || {}; G.gridPenalties[id] = clamp(n, 0, 20); out.push(`Punição de ${n} posições no grid`); });
  if (fx.injury) Object.entries(fx.injury).forEach(([did, n]) => { const id = did === 'd1' ? myIds[0] : did === 'd2' ? myIds[1] : did; const d = Career.driver(G, id); if (d) { d.injured = clamp(n, 1, 4); out.push(`${d.name} fora por ${d.injured} GP(s)`); } });
  if (fx.engine) { const e = byId(G.db.engines, fx.engine.id); if (e) { e.power = clamp(e.power + lim(fx.engine.power, 3), 70, 100); e.reliability = clamp(e.reliability + lim(fx.engine.reliability, 6), 60, 99); out.push(`Motor ${e.name} atualizado`); } }
  if (fx.addSponsor) { G.sponsors.push({ ...fx.addSponsor, id: Career.nextId(G, 's'), satisfaction: 70 }); out.push(`Novo patrocinador: ${fx.addSponsor.name}`); }
  if (fx.removeSponsor) { G.sponsors = G.sponsors.filter(s => s.id !== fx.removeSponsor); out.push('Patrocinador saiu'); }
  if (fx.sponsorSat) { G.sponsors.forEach(s => (s.satisfaction = clamp(s.satisfaction + lim(fx.sponsorSat, 20), 0, 100))); out.push(`Satisfação dos patrocinadores ${fx.sponsorSat >= 0 ? '+' : ''}${fx.sponsorSat}`); }
  if (fx.signReserve) { const d = Career.driver(G, fx.signReserve); if (d && !d.team) { Career.placeDriver(G, d, team.id, 'R', d.salary || 0.6, 1); out.push(`${d.name} vira piloto reserva`); } }
  if (fx.engineSelf) { team.car.engineBonus = +((team.car.engineBonus || 0) + 1.6).toFixed(2); out.push('Potência do motor +1.6'); }
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
  m.outcome = (ch.gamble ? (fx === ch.gamble.win ? ch.gamble.winText : ch.gamble.loseText) : ch.outcome) || 'Decisão registrada.';
  m.outcomeFx = res;
  m.read = true;
  return m;
};

/* ---------- modelos procedurais ---------- */
const sname = d => d.name.split(' ').slice(-1)[0];
Events.TEMPLATES = [
  {
    key: 'press', w: 3, build: (G, c) => {
      const d = RNG.pick(c.lineup);
      const rival = RNG.pick(G.db.teams.filter(t => t.id !== c.team.id));
      return {
        from: 'Assessoria de imprensa', tag: 'media', title: 'Coletiva: pergunta delicada',
        body: `Um jornalista pergunta se ${d.name} está satisfeito com o carro e insinua que a ${rival.name} estaria sondando o piloto. Como você responde?`,
        choices: [
          { label: 'Defender o piloto e o projeto', outcome: 'A resposta firme agradou o piloto e a garagem.', effects: { morale: { [d.id]: 6 }, reputation: 1 } },
          { label: 'Cobrar resultados publicamente', outcome: 'A cobrança virou manchete. O piloto não gostou, mas a diretoria aprovou a postura.', effects: { morale: { [d.id]: -8 }, board: 4 } },
          { label: '"Sem comentários"', outcome: 'A imprensa especulou por dias.', effects: { popularity: { [d.id]: -2 }, reputation: -1 } },
        ],
      };
    }
  },
  {
    key: 'sponsor_offer', w: 2.2, cond: (G) => G.sponsors.length < 6, build: (G, c) => {
      const sp = Career.genSponsors(G, c.team, 1)[0];
      const big = { ...sp, perRace: +(sp.perRace * 1.5).toFixed(2), objective: RNG.pick(['top5', 'podium', 'top10both']) };
      return {
        from: 'Departamento comercial', tag: 'money', title: `Proposta de patrocínio: ${sp.name}`,
        body: `${sp.name} quer estampar a marca no carro por ${sp.seasons} temporada(s). Opção A: ${fmtMoney(sp.perRace)} por GP, bônus de ${fmtMoney(sp.bonus)} ao "${Career.SPONSOR_OBJ[sp.objective]}". Opção B, mais ambiciosa: ${fmtMoney(big.perRace)} por GP, mas exige "${Career.SPONSOR_OBJ[big.objective]}".`,
        choices: [
          { label: `Aceitar opção A (${fmtMoney(sp.perRace)}/GP)`, outcome: 'Contrato assinado.', effects: { addSponsor: sp } },
          { label: `Aceitar opção B (${fmtMoney(big.perRace)}/GP)`, outcome: 'Contrato agressivo assinado. A pressão por resultado aumentou.', effects: { addSponsor: big, board: 2 } },
          { label: 'Recusar', outcome: 'Você recusou a proposta.', effects: {} },
        ],
      };
    }
  },
  {
    key: 'wind_tunnel', w: 2, build: (G, c) => ({
      from: 'Chefe de aerodinâmica', tag: 'dev', title: 'Descoberta no túnel de vento',
      body: 'A equipe de aerodinâmica encontrou uma correlação promissora no assoalho. Podemos acelerar o desenvolvimento com turnos extras ou guardar o conceito para o carro do ano que vem.',
      choices: [
        { label: 'Turnos extras agora ($2.5M)', gamble: { p: 0.7, win: { money: -2.5, moneyDesc: 'Turnos extras no túnel', car: { aero: 1.2 } }, lose: { money: -2.5, moneyDesc: 'Turnos extras no túnel', car: { aero: 0.2 } }, winText: 'Funcionou: a nova peça trouxe ganho real de carga.', loseText: 'Os dados de pista não confirmaram o túnel. Ganho mínimo.' } },
        { label: 'Guardar para o próximo ano', outcome: 'O conceito foi arquivado para o carro novo.', effects: { nextYear: 1.2 } },
        { label: 'Ignorar e manter o plano', outcome: 'Nada muda.', effects: {} },
      ],
    })
  },
  {
    key: 'flexi_wing', w: 1.2, build: (G, c) => ({
      from: 'Federação', tag: 'fia', title: 'Investigação: asa flexível',
      body: `A Federação recebeu queixa de rivais sobre a flexão da asa traseira da ${c.team.name}. Os testes estáticos ainda são passados, mas o delegado técnico pediu esclarecimentos.`,
      choices: [
        { label: 'Enrijecer a asa voluntariamente', outcome: 'Você perdeu um pouco de velocidade de reta, mas o caso foi arquivado.', effects: { car: { aero: -0.6 }, reputation: 1 } },
        { label: 'Contestar e manter a peça', gamble: { p: 0.55, win: { reputation: -1, board: 2 }, lose: { money: -3, moneyDesc: 'Multa da Federação', car: { aero: -1 }, reputation: -3 }, winText: 'A Federação aceitou os argumentos. A peça segue no carro.', loseText: 'Derrota: multa de $3M e a peça foi banida.' } },
      ],
    })
  },
  {
    key: 'staff_poach', w: 1.3, build: (G, c) => {
      const role = RNG.pick(['aero', 'technical', 'engineering', 'strategy']);
      const rival = RNG.pick(G.db.teams.filter(t => t.id !== c.team.id && t.budget > c.team.budget * 0.9));
      if (!rival) return null;
      return {
        from: 'Recursos humanos', tag: 'team', title: `${rival.name} assedia seu ${Career.STAFF_ROLES[role].toLowerCase()}`,
        body: `A ${rival.name} ofereceu o dobro do salário ao seu ${Career.STAFF_ROLES[role].toLowerCase()}. Ele espera uma contraproposta até amanhã.`,
        choices: [
          { label: 'Cobrir a oferta ($3M)', outcome: 'Ele fica, motivado.', effects: { money: -3, moneyDesc: 'Aumento de staff', staff: { [role]: 1 } } },
          { label: 'Deixar sair', outcome: 'Ele foi embora e o substituto interno é mais fraco.', effects: { staff: { [role]: -6 }, rivalCar: { id: rival.id, aero: role === 'aero' ? 1 : 0.4 } } },
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
        from: n2.name, tag: 'team', title: 'Pedido por igualdade de tratamento',
        body: `${n2.name} sente que recebe as atualizações sempre depois do companheiro e quer garantia de tratamento igual.`,
        choices: [
          { label: 'Garantir igualdade total', outcome: 'O clima na garagem melhorou para um lado e piorou para o outro.', effects: { morale: { [n2.id]: 8, [(n2 === a ? b : a).id]: -4 } } },
          { label: 'Manter hierarquia', outcome: 'Hierarquia mantida, piloto contrariado.', effects: { morale: { [n2.id]: -9 } } },
          { label: 'Prometer pódio para rever', outcome: 'Ele aceitou o desafio.', effects: { morale: { [n2.id]: 2 } } },
        ],
      };
    }
  },
  {
    key: 'engine_update', w: 1, build: (G, c) => {
      const e = Engine.engineOf(G.db, c.team);
      return {
        from: e.name, tag: 'dev', title: 'Nova especificação de motor disponível',
        body: `A ${e.name} liberou uma especificação nova da unidade de potência. Instalá-la agora gera punição de grid de 10 posições para os dois carros na próxima corrida, mas traz potência.`,
        choices: [
          { label: 'Instalar já (punição)', outcome: 'Motor novo nos carros. Vamos largar de trás.', effects: { car: { reliability: 1 }, gridPenalty: { d1: 10, d2: 10 }, engineSelf: true, money: -1.5, moneyDesc: 'Taxa de motor' } },
          { label: 'Esperar o fim da temporada', outcome: 'Mantivemos o motor atual.', effects: {} },
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
        from: 'Departamento médico', tag: 'team', title: `${d.name} lesionado`,
        body: `${d.name} se machucou em um treino físico e vai perder ${res ? 'a próxima corrida' : 'a próxima corrida. Você não tem reserva contratado'}.`,
        choices: res ? [{ label: `Chamar ${res.name}`, outcome: `${res.name} vai correr.`, effects: { injury: { [d.id]: 1 } } }] :
          free.map(f => ({ label: `Contratar ${f.name} como reserva (${driverOverall(f)})`, outcome: `${f.name} assinou como reserva e vai correr.`, effects: { injury: { [d.id]: 1 }, signReserve: f.id, money: -0.4, moneyDesc: 'Contrato de reserva' } })),
      };
    }
  },
  {
    key: 'junior', w: 1, build: (G, c) => {
      const pool = G.db.drivers.filter(x => !x.team && !x.retired && x.potential >= 86).sort((a, b) => b.potential - a.potential);
      const j = pool[0] && RNG.pick(pool.slice(0, 3));
      if (!j) return null;
      return {
        from: 'Programa de jovens pilotos', tag: 'team', title: `${j.name} se destaca nas categorias de base`,
        body: `${j.name} (${j.age} anos, potencial ${j.potential}) venceu de novo na categoria de acesso. O empresário oferece um contrato de piloto reserva com opção de promoção.`,
        choices: [
          { label: 'Contratar como reserva ($0.6M)', outcome: `${j.name} agora é piloto reserva da equipe.`, effects: { signReserve: j.id, money: -0.6, moneyDesc: 'Contrato de reserva' } },
          { label: 'Dar um teste no simulador ($0.2M)', outcome: 'Bons números no simulador; os engenheiros aprenderam algo.', effects: { money: -0.2, moneyDesc: 'Teste de simulador', staff: { engineering: 1 } } },
          { label: 'Não agora', outcome: 'Ficamos de olho.', effects: {} },
        ],
      };
    }
  },
  {
    key: 'data_leak', w: 0.7, build: (G, c) => ({
      from: 'Segurança da informação', tag: 'fia', title: 'Suspeita de vazamento de dados',
      body: 'Um engenheiro que saiu para uma rival pode ter levado arquivos de CAD. Uma investigação custa caro e chama atenção da imprensa.',
      choices: [
        { label: 'Investigar e processar ($1.5M)', gamble: { p: 0.6, win: { money: 1.5, moneyDesc: 'Acordo judicial', reputation: 2 }, lose: { money: -1.5, moneyDesc: 'Custos jurídicos', reputation: -1 }, winText: 'Provas encontradas: acordo de indenização favorável.', loseText: 'Sem provas. Gastamos dinheiro e o assunto vazou.' } },
        { label: 'Reforçar a segurança internamente', outcome: 'Mais controle, menos risco.', effects: { money: -0.5, moneyDesc: 'Segurança de TI' } },
        { label: 'Ignorar', gamble: { p: 0.6, win: {}, lose: { car: { aero: -0.5 } }, winText: 'Nada aconteceu.', loseText: 'Peças parecidas com as nossas apareceram no carro rival.' } },
      ],
    })
  },
  {
    key: 'fan_event', w: 1.4, build: (G, c) => {
      const d = RNG.pick(c.lineup);
      return {
        from: 'Marketing', tag: 'media', title: 'Evento com fãs no meio da semana',
        body: `Os patrocinadores pedem que ${d.name} participe de um evento com fãs, o que tira um dia de simulador.`,
        choices: [
          { label: 'Mandar o piloto', outcome: 'Fãs e patrocinadores felizes.', effects: { popularity: { [d.id]: 4 }, sponsorSat: 6, practiceBonus: -1 } },
          { label: 'Priorizar o simulador', outcome: 'Os patrocinadores não gostaram.', effects: { sponsorSat: -6, practiceBonus: 1 } },
        ],
      };
    }
  },
  {
    key: 'pit_training', w: 1, build: (G, c) => ({
      from: 'Chefe de mecânicos', tag: 'team', title: 'Mecânicos pedem treinamento extra',
      body: `Nossas paradas estão ${c.team.pitCrew < 85 ? 'abaixo da média do grid' : 'boas, mas dá para melhorar'}. Um campo de treinamento custa $0.8M.`,
      choices: [
        { label: 'Aprovar ($0.8M)', outcome: 'Equipe de pit mais afiada.', effects: { money: -0.8, moneyDesc: 'Treinamento de pit', pitCrew: 2 } },
        { label: 'Recusar', outcome: 'Seguimos como estamos.', effects: {} },
      ],
    })
  },
  {
    key: 'rival_crisis', w: 0.8, build: (G, c) => {
      const t = RNG.pick(G.db.teams.filter(x => x.id !== c.team.id && x.budget < 130));
      if (!t) return null;
      return {
        from: 'Rumores do paddock', tag: 'market', title: `${t.name} em crise financeira`,
        body: `A ${t.name} atrasou salários e está vendendo equipamentos de simulador. Podemos comprar parte deles barato.`,
        choices: [
          { label: 'Comprar o simulador ($2M)', outcome: 'Equipamento novo para nossos engenheiros.', effects: { money: -2, moneyDesc: 'Compra de simulador', staff: { engineering: 2 }, practiceBonus: 1 } },
          { label: 'Contratar engenheiros deles ($1.2M)', outcome: 'Três engenheiros experientes chegaram.', effects: { money: -1.2, moneyDesc: 'Contratações', staff: { technical: 2 }, rivalCar: { id: t.id, chassis: -0.6 } } },
          { label: 'Não se envolver', outcome: 'Você observou de longe.', effects: {} },
        ],
      };
    }
  },
  {
    key: 'tyre_supplier', w: 0.9, build: (G, c) => ({
      from: 'Fornecedor de pneus', tag: 'fia', title: 'Teste de pneus do próximo ano',
      body: 'O fornecedor de pneus procura uma equipe para rodar um teste privado com os compostos do próximo ano. Ajuda a entender os pneus, mas tira tempo da fábrica.',
      choices: [
        { label: 'Aceitar o teste', outcome: 'Aprendemos sobre a janela térmica dos pneus novos.', effects: { car: { tyreCare: 1 }, nextYear: 0.4, money: 0.5, moneyDesc: 'Taxa do teste de pneus' } },
        { label: 'Recusar', outcome: 'Foco total na fábrica.', effects: {} },
      ],
    })
  },
  {
    key: 'board_pressure', w: 1, cond: (G) => G.board.confidence < 45, build: (G, c) => ({
      from: 'Diretoria', tag: 'board', title: 'A diretoria quer explicações',
      body: `Os resultados estão abaixo da meta de ${ordinal(G.board.target)} lugar. O conselho pede um plano de ação.`,
      choices: [
        { label: 'Prometer pontos na próxima corrida', outcome: 'Promessa registrada. Melhor cumprir.', effects: { board: 5, moraleAll: -2 } },
        { label: 'Pedir paciência e mostrar o plano de P&D', outcome: 'A diretoria aceitou, com ressalvas.', effects: { board: 2 } },
        { label: 'Culpar os pilotos', outcome: 'A diretoria comprou a ideia; os pilotos, não.', effects: { board: 6, moraleAll: -10 } },
      ],
    })
  },
  {
    key: 'investor', w: 0.6, cond: (G) => G.finances.balance < 10, build: (G, c) => ({
      from: 'Diretoria', tag: 'money', title: 'Investidor oferece aporte',
      body: 'Um fundo de investimentos oferece $12M em troca de influência nas decisões comerciais da equipe.',
      choices: [
        { label: 'Aceitar o aporte', outcome: 'Caixa reforçado, mas a diretoria agora tem mais um sócio exigente.', effects: { money: 12, moneyDesc: 'Aporte de investidor', board: -6 } },
        { label: 'Recusar', outcome: 'Independência mantida.', effects: { board: 2 } },
      ],
    })
  },
  {
    key: 'teammate_clash', w: 1, cond: (G, c) => c.lastMine && c.lastMine.length === 2 && Math.abs(c.lastMine[0].pos - c.lastMine[1].pos) <= 2, build: (G, c) => {
      const [a, b] = c.lineup;
      if (!b) return null;
      return {
        from: 'Engenheiro de corrida', tag: 'team', title: 'Clima tenso entre os pilotos',
        body: `${a.name} e ${b.name} brigaram roda a roda no último GP e trocaram acusações no rádio.`,
        choices: [
          { label: 'Reunião a portas fechadas', outcome: 'Os dois saíram mais calmos.', effects: { morale: { [a.id]: 2, [b.id]: 2 } } },
          { label: `Dar razão a ${sname(a)}`, outcome: `${sname(b)} ficou furioso.`, effects: { morale: { [a.id]: 6, [b.id]: -9 } } },
          { label: `Dar razão a ${sname(b)}`, outcome: `${sname(a)} ficou furioso.`, effects: { morale: { [a.id]: -9, [b.id]: 6 } } },
        ],
      };
    }
  },
  {
    key: 'logistics', w: 0.7, build: (G, c) => ({
      from: 'Logística', tag: 'team', title: 'Carga atrasada no aeroporto',
      body: 'Parte do material da equipe ficou presa na alfândega. Um frete aéreo extra resolve, mas custa caro.',
      choices: [
        { label: 'Frete extra ($0.9M)', outcome: 'Tudo chegou a tempo.', effects: { money: -0.9, moneyDesc: 'Frete aéreo extra' } },
        { label: 'Esperar', outcome: 'As peças chegaram tarde: menos tempo de treino.', effects: { practiceBonus: -2 } },
      ],
    })
  },
  {
    key: 'charity', w: 0.8, build: (G, c) => ({
      from: 'Marketing', tag: 'media', title: 'Pintura especial beneficente',
      body: 'Uma ONG propõe uma pintura especial no próximo GP para arrecadar fundos. A mídia adora esse tipo de ação.',
      choices: [
        { label: 'Fazer a pintura ($0.3M)', outcome: 'Pintura linda, repercussão enorme.', effects: { money: -0.3, moneyDesc: 'Pintura especial', reputation: 2, moraleAll: 2 } },
        { label: 'Recusar', outcome: 'Fica para outra ocasião.', effects: {} },
      ],
    })
  },
  {
    key: 'reliability_scare', w: 0.9, build: (G, c) => ({
      from: 'Diretor técnico', tag: 'dev', title: 'Fissura encontrada em peça do câmbio',
      body: 'A inspeção pós-corrida encontrou microfissuras no câmbio. Podemos trocar o lote inteiro ou reforçar e seguir.',
      choices: [
        { label: 'Trocar o lote ($1.8M)', outcome: 'Peças novas, risco eliminado.', effects: { money: -1.8, moneyDesc: 'Lote de câmbios', car: { reliability: 1.5 } } },
        { label: 'Reforçar e seguir', gamble: { p: 0.65, win: {}, lose: { car: { reliability: -2.5 } }, winText: 'O reforço aguentou.', loseText: 'O problema se espalhou: confiabilidade caiu.' } },
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
      `${d.name} diz que a ${t.name} "ainda não mostrou tudo"`,
      `Rumor: ${t.name} avalia trocar de fornecedor de motor`,
      `${t.name} confirma novo diretor técnico para o próximo ano`,
      `${d.name} é o piloto mais popular da semana nas redes`,
      `Federação esclarece regra de limites de pista após polêmica`,
      `${t.name} promete grande atualização para as próximas etapas`,
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
  return `Você é o roteirista de um jogo de gestão de equipe de automobilismo (monopostos, estilo Fórmula 1). Crie UM evento novo e original que acontece entre as corridas, fora da pista ou nos bastidores (mídia, política, técnica, patrocínio, pilotos, staff, federação, fãs, rivais). Deve ser plausível no mundo real do automobilismo, reagir ao contexto e não repetir os eventos recentes. Escreva em português do Brasil, tom jornalístico, 2 a 4 frases no corpo.

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
    if (o.money) o.moneyDesc = 'Evento: ' + String(ev.title).slice(0, 50);
    if (o.car) Object.keys(o.car).forEach(k => (o.car[k] = clamp(o.car[k], -1.5, 1.5)));
    if (o.nextYear) o.nextYear = clamp(o.nextYear, -1, 1.5);
    if (o.money) o.money = clamp(o.money, -6, 6);
    return o;
  };
  return {
    from: String(ev.from || 'Paddock').slice(0, 40), title: String(ev.title).slice(0, 90), body: String(ev.body).slice(0, 700), tag: 'ai', ai: true,
    choices: ev.choices.slice(0, 3).map(c => ({ label: String(c.label || 'Escolher').slice(0, 70), outcome: String(c.outcome || '').slice(0, 300), effects: cleanFx(c.effects) })),
  };
};

/* ---------- textos de rádio do engenheiro ---------- */
Events.radio = (race, car, wk) => {
  const w = race.wet[race.lap + 1] ?? 0;
  const msgs = [];
  if ('SMH'.includes(car.tyre.c) && w > 0.2) msgs.push('Chuva chegando. Recomendo intermediários.');
  if (car.tyre.c === 'I' && w < 0.12) msgs.push('Pista secando. Hora de pneus de pista seca.');
  if (car.tyre.wear > 70 && 'SMH'.includes(car.tyre.c)) msgs.push(`Pneus em ${Math.round(car.tyre.wear)}%. Desempenho caindo rápido.`);
  if (race.sc && car.tyre.wear > 30) msgs.push('Safety Car: parada mais barata agora.');
  if (car.damage.wing) msgs.push('Asa danificada, recomendo parar.');
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
      Career.news(G, `Terceiro abandono seguido: fase ruim de ${d.name} preocupa a ${Career.team(G, c.tid).name}`, 'paddock');
    }
  });
  // liderança trocou de mãos
  if (G.season.results.length > 1 && leader) {
    const prevLeader = G._prevLeader;
    if (prevLeader && prevLeader !== leader.did) Career.news(G, `${Career.driver(G, leader.did).name} assume a liderança do campeonato`, 'campeonato', `Agora com ${leader.pts} pontos após ${G.season.results.length} etapas.`);
    G._prevLeader = leader.did;
  }
  // primeira vitória da carreira
  const w = Career.driver(G, summary.winner);
  if (w && w.career.wins === 1) Career.news(G, `Primeira vitória da carreira para ${w.name}!`, 'corrida');
  // duelo interno
  G.db.teams.forEach(t => {
    const ds = Career.lineup(G, t.id);
    if (ds.length === 2) {
      const a = G.season.stats[ds[0].id], b = G.season.stats[ds[1].id];
      if (a && b && G.season.results.length >= 6 && Math.abs((a.beatMate || 0) - (b.beatMate || 0)) >= 6 && RNG.chance(0.15)) {
        const [top, low] = (a.beatMate > b.beatMate) ? ds : [ds[1], ds[0]];
        Career.news(G, `${low.name} sob pressão: ${top.name} domina o duelo interno na ${t.name}`, 'paddock');
      }
    }
  });
};
