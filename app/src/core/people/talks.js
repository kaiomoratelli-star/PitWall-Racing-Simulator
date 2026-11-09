'use strict';
/* =============================================================
   CONVERSAS COM O PILOTO (0.8.6-A)
   Para não repetir como nos jogos de futebol:
   - o assunto nasce do momento (resultado, companheiro, contrato, promessa, ordens, moral, rival, mercado, lesão);
   - cada assunto tem várias aberturas, e cada perfil de piloto (campeão exigente, veterano tranquilo,
     novato ansioso, esquentado, profissional) tem as suas falas e reage de um jeito às mesmas opções;
   - as respostas combinam reação + comentário do assunto, sorteadas sem repetir o que foi dito há pouco;
   - promessas ficam registradas (people.js) e são cobradas depois.
   Uma conversa por piloto a cada etapa.
   ============================================================= */
const Talks = {};

/* perfil do piloto */
Talks.ARCH = {
  champ: ['Campeão exigente', 'Demanding champion'], veteran: ['Veterano tranquilo', 'Calm veteran'], rookie: ['Jovem ansioso', 'Anxious youngster'],
  hothead: ['Esquentado', 'Hothead'], pro: ['Profissional', 'Professional'],
};
Talks.arch = (d) => {
  const p = d.personality || {}; const c = d.career || {};
  if ((c.titles || 0) > 0 || (driverOverall(d) >= 91 && (p.ambition ?? 50) >= 60)) return 'champ';
  if ((p.temper ?? 50) >= 72) return 'hothead';
  if ((d.age || 25) <= 22 || (c.starts || 0) < 25) return 'rookie';
  if ((d.age || 25) >= 32) return 'veteran';
  return 'pro';
};

/* ---------- contexto: quais assuntos estão vivos agora ---------- */
Talks.context = (G, d) => {
  const s = G.season; const res = s.results || []; const last = res[res.length - 1];
  const me = last && last.cls.find(x => x.did === d.id);
  const mate = Career.teamDrivers(G, d.team).find(x => x.id !== d.id && x.seat !== 'R');
  const exp = (Career.expectedRanks(G)[d.team] || 5) * 2 - 0.5;
  const ctx = { d, mate, last, me, exp, topics: [] };
  const add = (k, w, v) => ctx.topics.push({ k, w, v: v || {} });
  if (me && last) {
    if (me.status !== 'fin') add('result_bad', 3, { gp: last.gp, pos: byLang('abandono', 'DNF') });
    else if (me.pos <= 3 || me.pos <= exp - 3) add('result_good', 3, { gp: last.gp, pos: 'P' + me.pos });
    else if (me.pos >= exp + 4) add('result_bad', 2.5, { gp: last.gp, pos: 'P' + me.pos });
  }
  if (mate && res.length >= 3) {
    let a = 0, b = 0; res.slice(-6).forEach(r => { const x = r.cls.find(y => y.did === d.id), y = r.cls.find(z => z.did === mate.id); if (x && y) { if (x.pos < y.pos) a++; else b++; } });
    if (b - a >= 2) add('mate_ahead', 2.5, { mate: mate.name, sc: `${a}–${b}` });
    else if (a - b >= 3) add('mate_behind', 1.5, { mate: mate.name, sc: `${a}–${b}` });
  }
  if ((d.contractYears ?? 2) <= 1 && d.seat !== 'R') add('contract', 2.2, { y: s.year + Math.max(0, (d.contractYears ?? 1) - 1), ny: s.year + Math.max(1, d.contractYears ?? 1) });
  const open = typeof People !== 'undefined' ? People.promises(G, d.id).filter(p => p.state === 'open') : [];
  if (open.length) add('promise_open', 0.9, { p: People.promiseText(open[0].kind) });
  const broken = typeof People !== 'undefined' ? People.promises(G, d.id).find(p => p.state === 'broken' && p.at && p.at.y === s.year && s.round - p.at.r <= 3) : null;
  if (broken) add('promise_broken', 3.5, { p: People.promiseText(broken.kind) });
  const n1 = typeof Orders !== 'undefined' ? Orders.no1(G) : null;
  if ((n1 && mate && n1 === mate.id) || (d.moodLog || []).some(x => x.k === 'orders' && x.v < 0 && s.round - x.r <= 2)) add('orders', 2.8, { mate: mate ? mate.name : '' });
  if ((d.morale ?? 70) < 50) add('morale_low', 2.4, {});
  const riv = (G.memory && G.memory.rivals) ? Object.entries(G.memory.rivals).filter(([k, r]) => k.split('|').includes(d.id) && r.score >= 4.5).sort((a, b) => b[1].score - a[1].score)[0] : null;
  if (riv) { const oid = riv[0].split('|').find(x => x !== d.id); const o = Career.driver(G, oid); if (o) add('rival', 1.4, { rival: o.name }); }
  if ((G.news || []).slice(0, 25).some(n => n.tag === 'mercado' && (n.dr || n.refs || []).includes && JSON.stringify(n).includes(d.id))) add('market', 1.6, {});
  if (d.injured) add('injury', 3, {});
  add('general', 1, {});
  // não repetir o assunto da última conversa
  const lastT = (d.talkLog || []).slice(-1)[0];
  if (lastT) ctx.topics.forEach(t => { if (t.k === lastT.topic && t.k !== 'promise_broken') t.w *= 0.3; });
  return ctx;
};

/* ---------- textos ---------- */
const T2 = (pt, en) => [pt, en];
Talks.OPEN = {
  result_good: {
    all: [T2('Que corrida em {gp}, hein? Esse {pos} lavou a alma.', 'What a race in {gp}, eh? That {pos} felt good.'), T2('Ainda estou com a adrenalina de {gp}. O carro estava vivo.', 'Still buzzing from {gp}. The car felt alive.'), T2('O {pos} em {gp} mostra o que a gente pode fazer quando tudo encaixa.', '{pos} in {gp} shows what we can do when it all clicks.')],
    champ: [T2('{pos} é bom. Mas eu quero mais. Você sabe disso.', '{pos} is fine. But I want more. You know that.'), T2('Fizemos o básico em {gp}. Agora quero ver a equipe acompanhar o meu ritmo.', 'We did the basics in {gp}. Now I want the team to keep up with my pace.')],
    rookie: [T2('Chefe, você viu? {pos}! Eu nem dormi direito!', 'Boss, did you see? {pos}! I barely slept!'), T2('Ainda não acredito no {pos} em {gp}. Fiz tudo certo?', 'I still can not believe {pos} in {gp}. Did I do everything right?')],
    veteran: [T2('Corrida limpa em {gp}. É assim que se soma pontos.', 'Clean race in {gp}. That is how you score points.'), T2('Já vivi muita coisa, mas um {pos} assim ainda tem gosto especial.', 'I have seen a lot, but a {pos} like that still tastes special.')],
    hothead: [T2('Eu disse que dava! Ninguém acreditava, mas eu disse!', 'I told you it was possible! Nobody believed it, but I told you!'), T2('{pos} e ainda tinha mais. Se o box não tivesse demorado...', '{pos} and there was still more. If the pit stop had not been slow...')],
    pro: [T2('Bom fim de semana em {gp}. Os dados confirmam o que eu senti no carro.', 'Good weekend in {gp}. The data confirms what I felt in the car.'), T2('O {pos} veio do trabalho de todo mundo. Quero manter o processo.', 'The {pos} came from everyone\'s work. I want to keep the process.')],
  },
  result_bad: {
    all: [T2('{gp} foi para esquecer. {pos} não é o meu lugar.', '{gp} is one to forget. {pos} is not where I belong.'), T2('Não sei bem o que aconteceu em {gp}. O carro não respondia.', 'I do not really know what happened in {gp}. The car was not responding.'), T2('Preciso entender {gp} antes da próxima. {pos} dói.', 'I need to understand {gp} before the next one. {pos} hurts.')],
    champ: [T2('{pos}? Com esse carro? Alguém precisa me explicar.', '{pos}? With this car? Someone needs to explain it to me.'), T2('Eu não vim para esta equipe para terminar em {pos}.', 'I did not join this team to finish {pos}.')],
    rookie: [T2('Desculpa por {gp}... eu sei que errei. Vai me tirar do carro?', 'Sorry about {gp}... I know I messed up. Are you taking me out of the car?'), T2('Não paro de pensar em {gp}. Acho que forcei demais.', 'I can not stop thinking about {gp}. I think I pushed too hard.')],
    veteran: [T2('Dia ruim em {gp}. Acontece. O importante é o que fazemos agora.', 'Bad day in {gp}. It happens. What matters is what we do now.'), T2('Já tive dias piores que {gp}. Mas não quero me acostumar.', 'I have had worse days than {gp}. But I do not want to get used to it.')],
    hothead: [T2('Essa estratégia em {gp} foi um desastre e todo mundo sabe!', 'That strategy in {gp} was a disaster and everyone knows it!'), T2('Não aceito {pos}. Não aceito!', 'I do not accept {pos}. I do not!')],
    pro: [T2('Fiz a minha análise de {gp}. Tem coisa minha e tem coisa do carro.', 'I did my analysis of {gp}. Some of it is me and some is the car.'), T2('Precisamos rever o acerto de {gp}. Não estava na janela.', 'We need to review the {gp} setup. It was not in the window.')],
  },
  mate_ahead: {
    all: [T2('{mate} está me batendo ({sc}). Quero entender o que ele tem de diferente.', '{mate} is beating me ({sc}). I want to understand what he has that I do not.'), T2('Os números contra {mate} ({sc}) me incomodam.', 'The numbers against {mate} ({sc}) bother me.')],
    champ: [T2('{sc} para {mate}? Os carros são mesmo iguais? Quero ver os dados dos dois.', '{sc} to {mate}? Are the cars really the same? I want to see both data sets.')],
    rookie: [T2('{mate} é muito rápido... será que eu estou à altura?', '{mate} is so fast... am I good enough?')],
    veteran: [T2('{mate} está bem neste ano ({sc}). Vou dar a resposta na pista.', '{mate} is strong this year ({sc}). I will answer on track.')],
    hothead: [T2('{mate} tem tudo primeiro: peças, estratégia... {sc} não é coincidência!', '{mate} gets everything first: parts, strategy... {sc} is no coincidence!')],
    pro: [T2('Estou perdendo para {mate} ({sc}) principalmente na classificação. Já sei onde atacar.', 'I am losing to {mate} ({sc}) mostly in qualifying. I know where to attack.')],
  },
  mate_behind: {
    all: [T2('Estou à frente de {mate} ({sc}). Acho que mereço ser tratado como referência.', 'I am ahead of {mate} ({sc}). I think I deserve to be treated as the reference.'), T2('{sc} contra {mate}. Os números falam.', '{sc} against {mate}. The numbers speak.')],
    champ: [T2('{sc} contra {mate}. Está na hora de a equipe trabalhar para mim.', '{sc} against {mate}. It is time for the team to work for me.')],
    rookie: [T2('Estou à frente de {mate}! Nem eu esperava isso.', 'I am ahead of {mate}! Not even I expected that.')],
    hothead: [T2('Viu o placar contra {mate}? {sc}. Fim de discussão.', 'Seen the score against {mate}? {sc}. End of discussion.')],
  },
  contract: {
    all: [T2('Meu contrato termina em {y}. Vamos conversar sobre o futuro?', 'My contract ends in {y}. Shall we talk about the future?'), T2('Meu empresário está recebendo ligações. Quero saber onde fico.', 'My manager is getting calls. I want to know where I stand.'), T2('Preciso de uma definição sobre {ny} em diante.', 'I need a decision about {ny} onwards.')],
    champ: [T2('Tenho propostas. Quero saber se esta equipe ainda é o meu lugar.', 'I have offers. I want to know if this team is still the place for me.')],
    rookie: [T2('Eu queria muito continuar aqui... vocês pensam em renovar?', 'I would really like to stay here... are you thinking of renewing?')],
    veteran: [T2('Na minha idade, cada contrato pode ser o último. Quero decidir com calma.', 'At my age every contract could be the last. I want to decide calmly.')],
  },
  promise_open: {
    all: [T2('Sobre o que você prometeu ({p}): ainda está de pé?', 'About what you promised ({p}): is it still on?'), T2('Estou contando com aquilo que combinamos: {p}.', 'I am counting on what we agreed: {p}.')],
    hothead: [T2('Você prometeu: {p}. Não esqueci.', 'You promised: {p}. I have not forgotten.')],
  },
  promise_broken: {
    all: [T2('Você prometeu {p} e não cumpriu. Como eu confio em você agora?', 'You promised {p} and did not deliver. How do I trust you now?'), T2('Ainda estou chateado com a promessa: {p}.', 'I am still upset about the promise: {p}.')],
    champ: [T2('Promessa quebrada. Na minha carreira, isso tem consequência.', 'A broken promise. In my career, that has consequences.')],
    rookie: [T2('Eu acreditei em você... {p}. O que aconteceu?', 'I believed you... {p}. What happened?')],
  },
  orders: {
    all: [T2('Aquela ordem de equipe ainda está entalada aqui.', 'That team order is still stuck in my throat.'), T2('Por que eu sempre sou o que abre passagem?', 'Why am I always the one who lets him by?')],
    champ: [T2('Ordens contra mim? Eu sou piloto de ponta, não escudeiro.', 'Orders against me? I am a front-runner, not a wingman.')],
    rookie: [T2('Eu obedeci... mas queria entender o motivo.', 'I obeyed... but I would like to understand why.')],
    hothead: [T2('Da próxima vez que pedirem para eu deixar {mate} passar, eu não deixo.', 'Next time you ask me to let {mate} by, I will not.')],
    veteran: [T2('Entendo o jogo de equipe. Só peço que seja justo nas duas direções.', 'I understand team play. I only ask that it be fair both ways.')],
  },
  morale_low: {
    all: [T2('Não estou bem, chefe. Sinto que nada dá certo.', 'I am not great, boss. It feels like nothing works.'), T2('Ando sem cabeça. Preciso de algo para me motivar.', 'My head is not in it. I need something to motivate me.')],
    rookie: [T2('Às vezes acho que não sou bom o bastante para a F1.', 'Sometimes I think I am not good enough for F1.')],
    veteran: [T2('Fase ruim. Já passei por outras, mas esta está pesada.', 'Rough patch. I have been through others, but this one is heavy.')],
    hothead: [T2('Estou de saco cheio de tudo isso.', 'I am fed up with all of this.')],
  },
  rival: {
    all: [T2('{rival} de novo no meu caminho. Quero ganhar essa briga.', '{rival} in my way again. I want to win this fight.'), T2('Viu o que {rival} falou depois da corrida?', 'Did you see what {rival} said after the race?')],
    hothead: [T2('{rival} vai ver só na próxima.', '{rival} will see next time.')],
  },
  market: {
    all: [T2('Você viu os boatos sobre mim? Não fui eu que comecei.', 'Have you seen the rumours about me? I did not start them.'), T2('Tem gente perguntando por mim no paddock. Achei melhor te contar.', 'People are asking about me in the paddock. I thought I should tell you.')],
  },
  injury: { all: [T2('A recuperação está lenta. Quero voltar logo.', 'Recovery is slow. I want to come back soon.'), T2('Odeio ver a corrida de fora.', 'I hate watching the race from outside.')] },
  general: {
    all: [T2('Tudo certo? Queria só trocar uma ideia antes da próxima.', 'All good? I just wanted a quick chat before the next one.'), T2('O que a equipe espera de mim nas próximas corridas?', 'What does the team expect from me in the next races?'), T2('Estou me sentindo bem com o carro. E você, como vê o momento?', 'I am feeling good with the car. How do you see things?'), T2('Treinei muito no simulador nesta semana. Quero mostrar na pista.', 'I did a lot of simulator work this week. I want to show it on track.')],
    rookie: [T2('Posso fazer uma pergunta? O que eu preciso melhorar primeiro?', 'Can I ask something? What should I improve first?')],
    veteran: [T2('Conversa rápida: como está o planejamento para o ano que vem?', 'Quick chat: how is planning for next year going?')],
  },
};
/* opções por assunto */
Talks.OPTS = {
  result_good: ['praise', 'demand', 'honest', 'promise_car'],
  result_bad: ['reassure', 'demand', 'honest', 'promise_car'],
  mate_ahead: ['reassure', 'demand', 'promise_priority', 'honest'],
  mate_behind: ['praise', 'promise_priority', 'honest', 'deflect'],
  contract: ['promise_renew', 'honest', 'deflect', 'demand'],
  promise_open: ['reassure', 'honest', 'deflect'],
  promise_broken: ['apologize', 'honest', 'deflect', 'promise_car'],
  orders: ['apologize', 'honest', 'promise_freedom', 'demand'],
  morale_low: ['reassure', 'praise', 'promise_car', 'demand'],
  rival: ['praise', 'reassure', 'demand'],
  market: ['honest', 'promise_renew', 'demand', 'deflect'],
  injury: ['reassure', 'praise', 'deflect'],
  general: ['praise', 'demand', 'honest', 'deflect'],
};
Talks.OPT_TXT = {
  praise: [T2('Elogiar: "Você está fazendo um ótimo trabalho."', 'Praise: "You are doing a great job."'), T2('Elogiar: "A equipe inteira confia em você."', 'Praise: "The whole team believes in you."'), T2('Elogiar: "É exatamente isso que eu espero de você."', 'Praise: "That is exactly what I expect from you."')],
  demand: [T2('Cobrar: "Espero mais. Você pode mais."', 'Demand: "I expect more. You can do more."'), T2('Cobrar: "Os resultados precisam aparecer."', 'Demand: "The results need to show."'), T2('Cobrar: "Menos desculpas, mais trabalho."', 'Demand: "Fewer excuses, more work."')],
  reassure: [T2('Tranquilizar: "Fica calmo, a fase vai passar."', 'Reassure: "Stay calm, this phase will pass."'), T2('Tranquilizar: "Ninguém aqui duvida de você."', 'Reassure: "Nobody here doubts you."'), T2('Tranquilizar: "Um passo de cada vez."', 'Reassure: "One step at a time."')],
  honest: [T2('Ser franco: "Vou te dizer exatamente o que vejo."', 'Be honest: "I will tell you exactly what I see."'), T2('Ser franco: "Sem rodeios: vamos olhar os dados juntos."', 'Be honest: "No beating around the bush: let us look at the data together."')],
  deflect: [T2('Mudar de assunto: "Vamos focar na próxima corrida."', 'Change the subject: "Let us focus on the next race."'), T2('Adiar: "Falamos disso com calma depois."', 'Postpone: "We will talk about this calmly later."')],
  apologize: [T2('Assumir o erro: "Você tem razão. Falhamos com você."', 'Own it: "You are right. We let you down."'), T2('Pedir desculpas: "Não foi justo, e eu sei disso."', 'Apologise: "It was not fair, and I know it."')],
  promise_priority: [T2('Prometer prioridade na equipe até o fim do ano', 'Promise team priority until the end of the year')],
  promise_car: [T2('Prometer carro melhor nas próximas 4 etapas', 'Promise a better car within the next 4 rounds')],
  promise_renew: [T2('Prometer uma proposta de renovação até o fim do ano', 'Promise a renewal offer by the end of the year')],
  promise_freedom: [T2('Prometer: nada de ordens contra ele', 'Promise: no team orders against him')],
};
/* quanto cada perfil gosta de cada abordagem (−1 a +1) */
Talks.FIT = {
  champ: { praise: 0, demand: -0.9, reassure: -0.2, honest: 0.5, deflect: -0.7, apologize: 0.4, promise_priority: 1, promise_car: 0.9, promise_renew: 0.6, promise_freedom: 0.8 },
  veteran: { praise: 0.3, demand: -0.1, reassure: 0.1, honest: 0.9, deflect: -0.2, apologize: 0.6, promise_priority: 0.4, promise_car: 0.5, promise_renew: 0.8, promise_freedom: 0.4 },
  rookie: { praise: 0.9, demand: -0.4, reassure: 0.9, honest: 0.3, deflect: -0.3, apologize: 0.5, promise_priority: 0.5, promise_car: 0.4, promise_renew: 1, promise_freedom: 0.3 },
  hothead: { praise: 0.6, demand: -1, reassure: 0.4, honest: -0.1, deflect: -0.8, apologize: 0.8, promise_priority: 0.9, promise_car: 0.6, promise_renew: 0.5, promise_freedom: 1 },
  pro: { praise: 0.3, demand: 0.3, reassure: 0.2, honest: 0.8, deflect: -0.3, apologize: 0.5, promise_priority: 0.3, promise_car: 0.6, promise_renew: 0.6, promise_freedom: 0.3 },
};
/* o assunto também pesa: cobrar depois de um resultado ruim do companheiro na frente é justo; elogiar depois de um abandono soa falso */
Talks.TOPIC_FIT = {
  result_good: { praise: 0.4, demand: -0.4 }, result_bad: { praise: -0.5, reassure: 0.3, demand: 0.1 }, mate_ahead: { demand: 0.2, reassure: 0.2 },
  mate_behind: { praise: 0.4, deflect: -0.4 }, contract: { deflect: -0.6, demand: -0.5 }, promise_broken: { deflect: -0.9, apologize: 0.5 },
  orders: { demand: -0.6, apologize: 0.4 }, morale_low: { demand: -0.6, reassure: 0.5 }, market: { deflect: -0.3 }, injury: { demand: -0.8 },
};
Talks.REPLY = {
  pos: {
    all: [T2('Obrigado. Era isso que eu precisava ouvir.', 'Thanks. That is what I needed to hear.'), T2('Fechado. Pode contar comigo.', 'Deal. You can count on me.'), T2('Gostei da conversa. Vamos com tudo.', 'I liked this talk. Let us go all in.'), T2('Isso me dá energia para a próxima.', 'That gives me energy for the next one.')],
    champ: [T2('Assim que se fala. Agora vamos ganhar.', 'That is the way. Now let us win.'), T2('Ótimo. Eu entrego, desde que a equipe entregue também.', 'Great. I deliver, as long as the team delivers too.')],
    veteran: [T2('Conversa de gente grande. Gosto disso.', 'A grown-up conversation. I like that.'), T2('É por isso que gosto de trabalhar com você.', 'That is why I like working with you.')],
    rookie: [T2('Sério? Valeu, chefe! Não vou te decepcionar!', 'Really? Thanks, boss! I will not let you down!'), T2('Uau... ok. Vou dar tudo de mim.', 'Wow... OK. I will give it everything.')],
    hothead: [T2('Agora sim! Era só falar assim.', 'Now we are talking! You just had to say it like that.'), T2('Beleza. Vou mostrar na pista.', 'Good. I will show it on track.')],
    pro: [T2('Faz sentido. Vou passar isso para os engenheiros.', 'Makes sense. I will pass that on to the engineers.'), T2('Combinado. Foco total.', 'Agreed. Full focus.')],
  },
  neu: {
    all: [T2('Ok. Vamos ver.', 'OK. We will see.'), T2('Entendi. Vou pensar.', 'Understood. I will think about it.'), T2('Hum. Pode ser.', 'Hm. Maybe.'), T2('Certo. A pista vai dizer.', 'Right. The track will tell.')],
    champ: [T2('Palavras são fáceis. Quero ver na prática.', 'Words are easy. I want to see it in practice.')],
    veteran: [T2('Já ouvi isso antes. Mas vamos lá.', 'I have heard that before. But let us go.')],
    rookie: [T2('Tá... acho que entendi.', 'OK... I think I get it.')],
    hothead: [T2('Tá bom, tá bom.', 'Fine, fine.')],
    pro: [T2('Anotado.', 'Noted.')],
  },
  neg: {
    all: [T2('Não era isso que eu queria ouvir.', 'That is not what I wanted to hear.'), T2('Sinceramente? Saio daqui pior do que entrei.', 'Honestly? I leave worse than I came in.'), T2('Ok. Já entendi como as coisas funcionam aqui.', 'OK. I get how things work here.')],
    champ: [T2('Você está falando com quem, exatamente?', 'Who exactly do you think you are talking to?'), T2('Vou lembrar desta conversa na hora de renovar.', 'I will remember this conversation when it is time to renew.')],
    veteran: [T2('Esperava mais de você.', 'I expected more from you.')],
    rookie: [T2('Desculpa... vou me esforçar mais.', 'Sorry... I will try harder.'), T2('Ah. Tá.', 'Oh. OK.')],
    hothead: [T2('Isso é piada? Tô fora dessa conversa.', 'Is this a joke? I am out of this conversation.'), T2('Ótimo. Vou falar com o meu empresário.', 'Great. I will talk to my manager.')],
    pro: [T2('Discordo, mas respeito.', 'I disagree, but I respect it.')],
  },
};
Talks.PROMISE_REPLY = [T2('Vou cobrar, hein.', 'I will hold you to that.'), T2('Combinado. Promessa é dívida.', 'Deal. A promise is a debt.'), T2('Está registrado. Confio em você.', 'It is on record. I trust you.'), T2('Espero que seja verdade desta vez.', 'I hope it is true this time.')];

/* sorteio sem repetir o que este piloto ouviu/disse há pouco */
Talks.pickLine = (d, pool, tag) => {
  d.talkMem = d.talkMem || [];
  const fresh = pool.map((x, i) => ({ x, id: `${tag}:${hashStr(x[0])}` })).filter(o => !d.talkMem.includes(o.id));
  const list = fresh.length ? fresh : pool.map(x => ({ x, id: `${tag}:${hashStr(x[0])}` }));
  const o = list[Math.floor(RNG.next() * list.length)];
  d.talkMem.push(o.id); if (d.talkMem.length > 40) d.talkMem.splice(0, d.talkMem.length - 40);
  return byLang(o.x[0], o.x[1]);
};
Talks.fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
Talks.canTalk = (G, d) => !(d.lastTalk && d.lastTalk.y === G.season.year && d.lastTalk.r === G.season.round);

/* abre a conversa: escolhe o assunto mais forte (com um pouco de sorte) */
Talks.start = (G, did, topicKey) => {
  const d = Career.driver(G, did); if (!d) return null;
  const ctx = Talks.context(G, d); const arch = Talks.arch(d);
  let t = topicKey ? ctx.topics.find(x => x.k === topicKey) : null;
  if (!t) { const tot = ctx.topics.reduce((a, x) => a + x.w, 0); let r = RNG.next() * tot; t = ctx.topics.find(x => (r -= x.w) <= 0) || ctx.topics[0]; }
  const O = Talks.OPEN[t.k] || Talks.OPEN.general;
  const pool = (O[arch] || []).concat(O.all || []);
  const open = Talks.fill(Talks.pickLine(d, pool, 'o'), t.v);
  const opts = (Talks.OPTS[t.k] || Talks.OPTS.general).filter(k => !(k.startsWith('promise_') && People.openPromise(G, d.id, k.slice(8))) && !(k === 'promise_renew' && d.seat === 'R'));
  return { did, topic: t.k, topics: ctx.topics.map(x => x.k), arch, open, opts: opts.map(k => ({ k, label: Talks.pickLine(d, Talks.OPT_TXT[k], 'q') })) };
};
/* responde: efeito na moral e na confiança, fala do piloto e promessa registrada */
Talks.answer = (G, did, topic, opt) => {
  const d = Career.driver(G, did); if (!d || !Talks.canTalk(G, d)) return null;
  const arch = Talks.arch(d);
  const fit = (Talks.FIT[arch][opt] ?? 0) + ((Talks.TOPIC_FIT[topic] || {})[opt] ?? 0);
  const trust = People.trust(d);
  const score = clamp(fit + RNG.normal(0, 0.35) + (trust - 50) / 120, -1.6, 1.6);
  const tone = score > 0.25 ? 'pos' : score < -0.2 ? 'neg' : 'neu';
  let mood = Math.round(score * 4 * 10) / 10, tr = Math.round(score * 3 * 10) / 10;
  let promise = null;
  if (opt.startsWith('promise_')) { promise = People.promise(G, d, opt.slice(8)); mood += 2; tr += 1; }
  // cobrar demais seguido desgasta; elogiar sem motivo perde valor
  const recent = (d.talkLog || []).filter(x => x.y === G.season.year && G.season.round - x.r <= 3);
  if (opt === 'demand' && recent.filter(x => x.opt === 'demand').length >= 1) { mood -= 2; tr -= 1; }
  if (opt === 'praise' && recent.filter(x => x.opt === 'praise').length >= 2) { mood = Math.min(mood, 0.5); }
  People.mood(G, d, mood, 'talk'); People.addTrust(G, d, tr, 'conversa');
  // a fala: reação do perfil + (se prometeu) comentário sobre a promessa
  const R = Talks.REPLY[tone];
  let reply = promise && tone !== 'neg' ? Talks.pickLine(d, Talks.PROMISE_REPLY, 'p') : Talks.pickLine(d, (R[arch] || []).concat(R.all), 'r' + tone);
  if (promise && tone === 'neg') reply += ' ' + Talks.pickLine(d, Talks.PROMISE_REPLY.slice(-1), 'p');
  d.lastTalk = { y: G.season.year, r: G.season.round };
  d.talkLog = (d.talkLog || []).slice(-11); d.talkLog.push({ y: G.season.year, r: G.season.round, topic, opt, tone, mood: +mood.toFixed(1), trust: +tr.toFixed(1), reply });
  // o companheiro pode não gostar de uma promessa de prioridade
  if (promise && promise.kind === 'priority') { const mate = Career.teamDrivers(G, d.team).find(x => x.id !== d.id && x.seat !== 'R'); if (mate) { People.mood(G, mate, -3, 'policy'); People.addChem(G, d.id, mate.id, -6); } }
  return { tone, mood: +mood.toFixed(1), trust: +tr.toFixed(1), reply, promise };
};
