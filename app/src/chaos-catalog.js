/* ============================================================
   PIT WALL — catálogo ampliado de eventos (V0.8.4)
   Mais de 100 acontecimentos do dia a dia do paddock, a maioria pequenos:
   bastidores e curiosidades, imprensa e redes, operação, negócios, conflitos,
   saúde e alguns escândalos menores. Cada um é um modelo de dados:
     who   driver | pair | rival | team | staff | junior | rookie | veteran | any
     t, b  título e texto [pt, en]; marcadores {d} {d2} {x} {t} {v} {s} {gp} {cat} {n}
     fx    efeitos pequenos: pop, mor, mor2, rep, money, spons, pit, rel, aero, mood
     ch    escolhas do jogador quando acontece com a equipe dele
   ============================================================ */
'use strict';

/* motor genérico: escolhe pessoas, monta o texto e aplica os efeitos */
Chaos.TPL = (spec) => Chaos.EV.push({
  k: spec.k, g: spec.g, w: spec.w ?? 1, sev: spec.sev ?? 1, cool: spec.cool ?? 0, hidden: false, tpl: spec,
  make: (G, r) => Chaos.tplMake(G, spec, r),
  verdict: (G, c, t) => { Chaos.tplFx(G, spec.fx || {}, c, t); return null; },
});
Chaos.tplMake = (G, spec, r) => {
  const pick = (a) => (a.length ? a[Math.floor(r() * a.length)] : null);
  const real = Chaos.real(G);
  const okD = (d) => d && (real || d.regen);
  let d = null, d2 = null, x = null, t = null, s = null, v = null;
  const race = Chaos.drivers(G).filter(okD);
  if (spec.who === 'driver' || spec.who === 'rookie' || spec.who === 'veteran') {
    d = pick(race.filter(z => spec.who !== 'rookie' || z.age <= 23).filter(z => spec.who !== 'veteran' || z.age >= 33)); if (!d) return null; t = Career.team(G, d.team);
  } else if (spec.who === 'pair') {
    t = Chaos.teamPick(G, r); if (!t) return null; const ds = Chaos.drivers(G, t.id); if (ds.length < 2 || !ds.every(okD)) return null; [d, d2] = ds;
  } else if (spec.who === 'rival') {
    d = pick(race); if (!d) return null; t = Career.team(G, d.team); x = pick(race.filter(z => z.team !== d.team)); if (!x) return null;
  } else if (spec.who === 'junior') {
    d = pick(G.db.drivers.filter(z => z.cat && !z.team && !z.retired && !z.dead && (real || z.regen))); if (!d) return null; t = null;
  } else if (spec.who === 'staff') {
    t = Chaos.teamPick(G, r); if (!t) return null; s = Chaos.pickStaff(G, r, t, spec.roles); if (!s) return null;
  } else if (spec.who === 'team' || spec.who === 'any') {
    t = Chaos.teamPick(G, r); if (!t) return null; d = pick(Chaos.drivers(G, t.id).filter(okD)); d2 = d && pick(Chaos.drivers(G, t.id).filter(z => z !== d && okD(z)));
  }
  if (spec.cond && !spec.cond(G, { d, t, s })) return null;
  v = Chaos.teamPick(G, r, z => !t || z.id !== t.id);
  const tr = Career.currentTrack(G) || (G.lastRace && Career.track(G, G.lastRace.trackId)) || {};
  const cat = d && d.cat && typeof Cats !== 'undefined' && Cats.get(G, d.cat);
  const n = spec.n ? spec.n[0] + Math.floor(r() * (spec.n[1] - spec.n[0] + 1)) : (t && t.founded ? G.season.year - t.founded : 10 + Math.floor(r() * 60));
  const fill = (str) => str.replace(/\{d\}/g, d ? d.name : '').replace(/\{d2\}/g, d2 ? d2.name : '').replace(/\{x\}/g, x ? x.name : '').replace(/\{t\}/g, t ? t.name : '').replace(/\{v\}/g, v ? v.name : '')
    .replace(/\{s\}/g, s ? s.name : '').replace(/\{r\}/g, s ? Chaos.roleName(s) : '').replace(/\{gp\}/g, tr.gp || 'GP').replace(/\{cat\}/g, cat ? (cat.short || cat.name) : '').replace(/\{n\}/g, String(n));
  const realP = (d && !d.regen) || (d2 && !d2.regen) || (x && !x.regen) || (s && s.real);
  return { tid: t ? t.id : null, did: d && d.id, did2: d2 && d2.id, xid: x && x.id, sid: s && s.id, real: !!realP && (spec.sev || 1) >= 2,
    title: fill(byLang(spec.t[0], spec.t[1])), body: fill(byLang(spec.b ? spec.b[0] : '', spec.b ? spec.b[1] : '')), now: true, choice: spec.ch || null, light: true };
};
Chaos.tplFx = (G, fx, c, t) => {
  const d = c.did && Career.driver(G, c.did), d2 = c.did2 && Career.driver(G, c.did2), x = c.xid && Career.driver(G, c.xid);
  const bump = (o, k, v) => { if (o && v) o[k] = clamp((o[k] ?? 50) + v, 1, 100); };
  bump(d, 'popularity', fx.pop); bump(d, 'morale', fx.mor); bump(d2, 'morale', fx.mor2 ?? (fx.both ? fx.mor : 0)); bump(d2, 'popularity', fx.both ? fx.pop : 0); bump(x, 'popularity', fx.xpop);
  if (!t) return;
  if (fx.rep) t.reputation = clamp(t.reputation + fx.rep, 30, 99);
  if (fx.pit) t.pitCrew = clamp(t.pitCrew + fx.pit, 30, 100);
  if (fx.rel) t.car.reliability = +clamp(t.car.reliability + fx.rel, 40, 99).toFixed(2);
  if (fx.aero) t.car.aero = +(t.car.aero + fx.aero).toFixed(2);
  if (fx.mood && t.ownerMood != null) t.ownerMood = clamp(t.ownerMood + fx.mood, 0, 100);
  if (fx.money) { if (Chaos.mine(G, t)) Career.ledger(G, c.title, fx.money, fx.money > 0 ? 'receita' : 'operação'); else t.cash = +((t.cash || 0) + fx.money).toFixed(2); }
  if (fx.spons && Chaos.mine(G, t)) (G.sponsors || []).forEach(sp => (sp.satisfaction = clamp(sp.satisfaction + fx.spons, 0, 100)));
};
/* evento leve com a equipe do jogador e com escolha: vira decisão na caixa de entrada */
(function () {
  const pm = Chaos.playerMail;
  Chaos.playerMail = (G, c, t, inv) => {
    if (!c.choice) return pm(G, c, t, inv);
    const res = (fx) => { const o = { ...fx }; ['morale', 'popularity'].forEach(k => { if (o[k]) { const m = {}; Object.entries(o[k]).forEach(([w, v]) => { const id = w === 'D' ? c.did : w === 'D2' ? c.did2 : w; if (id) m[id] = v; }); o[k] = m; } }); return o; };
    Career.mail(G, { from: byLang('Assessoria de imprensa', 'Press office'), tag: 'team', important: true, title: c.title, body: c.body + (c.real ? byLang(' (Ficção do jogo.)', ' (Game fiction.)') : ''),
      choices: c.choice.map(o => ({ label: byLang(o.l[0], o.l[1]), outcome: byLang(o.o[0], o.o[1]), effects: res(o.fx || {}) })) });
  };
  // eventos leves não geram registro permanente nem post de urgência; só notícia
  const dc = Chaos.discover;
  Chaos.discover = (G, h) => {
    if (!h.light) return dc(G, h);
    const t = h.tid ? Career.team(G, h.tid) : null;
    Career.news(G, h.title, 'paddock', h.body, { tm: t ? [t.id] : [], dr: [h.did, h.did2].filter(Boolean) });
    Chaos.log(G, h.k, h.g, { tid: h.tid, did: h.did });
    const c = { ...h, stage: 'fechado' };
    const spec = Chaos.byK(h.k).tpl || {};
    Chaos.tplFx(G, spec.fx || {}, c, t);
    if (spec.after) spec.after(G, c, t);
    if (t && Chaos.mine(G, t) && (h.choice || (Chaos.byK(h.k).sev || 1) >= 2)) Chaos.playerMail(G, c, t, false);
  };
})();

/* atalhos ficam dentro deste bloco: nada de nomes de uma letra no escopo global do jogo */
(function () {
const L = (k, who, t, b, fx, o) => Chaos.TPL({ k, g: 'leves', who, t, b, fx, ...(o || {}) });
const M = (k, who, t, b, fx, o) => Chaos.TPL({ k, g: 'midia', who, t, b, fx, ...(o || {}) });
const O = (k, who, t, b, fx, o) => Chaos.TPL({ k, g: 'operacao', who, t, b, fx, ...(o || {}) });
const N = (k, who, t, b, fx, o) => Chaos.TPL({ k, g: 'negocios', who, t, b, fx, ...(o || {}) });
const C = (k, who, t, b, fx, o) => Chaos.TPL({ k, g: 'conflitos', who, t, b, fx, ...(o || {}) });
const H = (k, who, t, b, fx, o) => Chaos.TPL({ k, g: 'lesoes', who, t, b, fx, ...(o || {}) });
const E = (k, who, t, b, fx, o) => Chaos.TPL({ k, g: 'escandalos', who, t, b, fx, sev: 2, ...(o || {}) });

/* ---------- bastidores e curiosidades ---------- */
L('aniversarioEquipe', 'team', ['{t} comemora {n} anos de história com festa na fábrica', '{t} celebrates {n} years of history with a party at the factory'], ['Funcionários antigos e ex-pilotos foram convidados.', 'Former staff and drivers were invited.'], { rep: 1 }, { cool: 8 });
L('diaAberto', 'team', ['Fãs lotam o dia de portas abertas da fábrica da {t}', 'Fans pack the {t} factory open day'], ['A equipe mostrou o simulador e o túnel de vento ao público.', 'The team showed the simulator and the wind tunnel to the public.'], { rep: 1 });
L('capaceteEspecial', 'driver', ['{d} estreia capacete especial no {gp}', '{d} debuts a special helmet at the {gp}'], ['O desenho homenageia a cidade natal do piloto.', 'The design pays tribute to the driver’s home town.'], { pop: 2 });
L('recordeSimulador', 'driver', ['{d} bate o recorde de volta no simulador da {t}', '{d} sets the lap record on the {t} simulator'], ['Os engenheiros usaram os dados para ajustar o acerto.', 'Engineers used the data to refine the set-up.'], { mor: 2 });
L('animalPista', 'any', ['Animal invade a pista e atrasa o treino no {gp}', 'An animal on track delays practice at the {gp}'], ['Os comissários pararam a sessão por alguns minutos até o resgate.', 'Stewards stopped the session for a few minutes until the rescue.'], {});
L('faClube', 'driver', ['Fã-clube de {d} lota a arquibancada no {gp}', '{d}’s fan club packs the grandstand at the {gp}'], ['Faixas e bandeiras tomaram uma curva inteira.', 'Banners and flags took over a whole corner.'], { pop: 2 });
L('hospitalInfantil', 'driver', ['{d} visita hospital infantil antes do {gp}', '{d} visits a children’s hospital before the {gp}'], ['A visita não foi divulgada pela equipe; os pais postaram as fotos.', 'The team did not publicise the visit; the parents posted the photos.'], { pop: 3 });
L('golfeBeneficente', 'pair', ['{d} e {d2} disputam torneio de golfe beneficente', '{d} and {d2} play a charity golf tournament'], ['O torneio arrecadou dinheiro para projetos sociais.', 'The tournament raised money for social projects.'], { mor: 1, both: true });
L('pinturaEspecial', 'team', ['{t} revela pintura especial para o {gp}', '{t} unveils a special livery for the {gp}'], ['A pintura celebra a história da equipe e agradou aos patrocinadores.', 'The livery celebrates the team’s history and pleased sponsors.'], { rep: 1, spons: 2 });
L('estagio', 'team', ['{t} abre programa de estágio para jovens engenheiras', '{t} launches an internship programme for young female engineers'], ['A equipe quer ampliar a diversidade na fábrica.', 'The team wants to broaden diversity at the factory.'], { rep: 1 });
L('boneEsgotado', 'driver', ['Boné de {d} esgota em poucas horas', '{d}’s cap sells out within hours'], ['A loja oficial prometeu reposição até o próximo GP.', 'The official shop promised a restock before the next GP.'], { pop: 2, money: 0.2 });
L('kartAmigos', 'driver', ['{d} volta ao kart numa corrida com amigos de infância', '{d} goes back to karting in a race with childhood friends'], ['"Foi para lembrar por que comecei", disse o piloto.', '"It was to remember why I started," said the driver.'], { mor: 2 });
L('granizo', 'any', ['Chuva de granizo atinge o paddock no {gp}', 'A hailstorm hits the paddock at the {gp}'], ['As equipes cobriram os carros às pressas; ninguém se feriu.', 'Teams covered the cars in a hurry; nobody was hurt.'], {});
L('filaAutografos', 'driver', ['Fila de autógrafos de {d} dura três horas', '{d}’s autograph queue lasts three hours'], ['O piloto ficou até atender o último fã.', 'The driver stayed until the last fan was served.'], { pop: 2 });
L('mascote', 'team', ['{t} apresenta seu novo mascote', '{t} presents its new mascot'], ['O mascote vai circular pelas arquibancadas em todos os GPs.', 'The mascot will tour the grandstands at every GP.'], { rep: 0.5 });
L('clipeMusical', 'driver', ['{d} aparece em clipe de uma banda famosa', '{d} appears in a famous band’s music video'], ['O vídeo passou de 10 milhões de visualizações em um dia.', 'The video passed 10 million views in a day.'], { pop: 2 });
L('lendaVisita', 'team', ['Campeão do passado visita os boxes da {t}', 'A former champion visits the {t} garage'], ['O ex-piloto conversou longamente com os engenheiros.', 'The former driver had a long talk with the engineers.'], { rep: 0.5 });
L('fotoViral', 'driver', ['Foto de {d} abraçando um mecânico viraliza', 'Photo of {d} hugging a mechanic goes viral'], ['A imagem foi a mais compartilhada do fim de semana.', 'It was the most shared image of the weekend.'], { pop: 2 });
L('bicicleta', 'driver', ['{d} chega ao circuito de bicicleta', '{d} arrives at the circuit by bike'], ['O piloto pedalou 30 km desde o hotel.', 'The driver rode 30 km from the hotel.'], { pop: 1 });
L('chefCozinha', 'team', ['Chef da hospitalidade da {t} vira assunto no paddock', 'The {t} hospitality chef becomes the talk of the paddock'], ['Convidados de outras equipes pediram para almoçar lá.', 'Guests from other teams asked to have lunch there.'], { spons: 1 });
L('escolasEngenharia', 'team', ['{t} lança programa em escolas de engenharia', '{t} launches a programme in engineering schools'], ['Estudantes vão projetar uma peça de verdade com a equipe.', 'Students will design a real part with the team.'], { rep: 1 });
L('juniorVence', 'junior', ['{d} vence pela primeira vez na {cat}', '{d} wins for the first time in {cat}'], ['A vitória chamou a atenção de olheiros da F1.', 'The win caught the eye of F1 scouts.'], { pop: 3 });
L('concursoFas', 'team', ['Fã vence concurso e testa o simulador da {t}', 'A fan wins a contest to try the {t} simulator'], ['O tempo do torcedor ficou a só três segundos dos titulares.', 'The fan was only three seconds off the race drivers.'], { rep: 0.5 });
L('museu', 'team', ['{t} empresta carro histórico para exposição', '{t} lends a historic car to an exhibition'], ['O carro ficará exposto por seis meses.', 'The car will be on display for six months.'], { rep: 0.5 }, { cool: 3 });
L('voluntarios', 'any', ['Comissários voluntários são homenageados no {gp}', 'Volunteer marshals honoured at the {gp}'], ['Os pilotos assinaram uma bandeira em agradecimento.', 'The drivers signed a flag as a thank-you.'], {});
L('maratona', 'driver', ['{d} corre maratona na semana de folga', '{d} runs a marathon during the week off'], ['O tempo surpreendeu os preparadores físicos.', 'The time surprised the fitness coaches.'], { mor: 1 });
L('jogosTabuleiro', 'pair', ['{d} e {d2} viram parceiros num torneio de videogame', '{d} and {d2} team up in a video game tournament'], ['A transmissão teve mais audiência que alguns treinos livres.', 'The stream drew more viewers than some practice sessions.'], { pop: 1, both: true });
L('pitstopFas', 'team', ['Mecânicos da {t} vencem desafio de pit stop em evento de fãs', '{t} mechanics win a pit stop challenge at a fan event'], ['Troca de quatro pneus em 1,9 s diante do público.', 'A four-tyre change in 1.9 s in front of the crowd.'], { pit: 0.5 });
L('premioEngenharia', 'staff', ['{s}, da {t}, recebe prêmio de engenharia', '{s} of {t} receives an engineering award'], ['O prêmio reconhece o trabalho no carro deste ano.', 'The award recognises the work on this year’s car.'], { rep: 1 }, { roles: ['technical', 'aero', 'engineeringDir', 'chiefEngineer', 'performance'] });
L('casamento', 'driver', ['{d} anuncia casamento', '{d} announces his wedding'], ['A cerimônia deve acontecer nas férias de inverno.', 'The ceremony should take place in the winter break.'], { pop: 2, mor: 3 }, { cool: 4 });
L('filho', 'driver', ['{d} vai ser pai', '{d} is going to be a father'], ['O piloto contou a novidade nas redes sociais.', 'The driver shared the news on social media.'], { mor: 3 }, { cool: 4 });
L('cachorroEquipe', 'team', ['{t} adota cão que vivia perto da fábrica', '{t} adopts a dog that lived near the factory'], ['O cão virou o "mascote oficial" dos mecânicos.', 'The dog became the mechanics’ "official mascot".'], { rep: 0.5 });
L('esportsEquipe', 'team', ['{t} anuncia equipe de automobilismo virtual', '{t} announces a sim racing team'], ['Os pilotos virtuais vão usar o simulador da fábrica.', 'The sim racers will use the factory simulator.'], { money: 0.3, spons: 1 });
L('tatuagem', 'driver', ['{d} mostra tatuagem nova com o número do carro', '{d} shows off a new tattoo with his car number'], [''], { pop: 1 });
L('pratoTipico', 'driver', ['{d} aprende a cozinhar prato típico antes do {gp}', '{d} learns to cook a local dish before the {gp}'], ['O vídeo virou um dos mais vistos do canal da equipe.', 'The video became one of the most watched on the team channel.'], { pop: 1 });
L('retorno25', 'veteran', ['{d} completa uma marca redonda de GPs na carreira', '{d} reaches a round number of career GPs'], ['A equipe preparou um bolo e uma camisa comemorativa.', 'The team prepared a cake and a commemorative shirt.'], { mor: 2, pop: 1 });
L('primeiroGP', 'rookie', ['{d} recebe dicas de veteranos antes do {gp}', '{d} gets advice from veterans before the {gp}'], ['O novato disse que ainda se belisca ao entrar no paddock.', 'The rookie said he still pinches himself walking into the paddock.'], { mor: 2 });
L('fotografoVeterano', 'any', ['Fotógrafo cobre seu 500º GP no {gp}', 'Photographer covers his 500th GP at the {gp}'], ['Os pilotos posaram para a foto de homenagem.', 'The drivers posed for a tribute photo.'], {});
L('trofeuNovo', 'any', ['Troféu do {gp} é feito por artistas locais', 'The {gp} trophy is made by local artists'], ['A peça tem materiais reciclados da própria pista.', 'The piece uses recycled materials from the track itself.'], {});
L('plantio', 'team', ['{t} planta árvores para compensar o frete do ano', '{t} plants trees to offset the year’s freight'], ['A meta é compensar o carbono das viagens da equipe.', 'The goal is to offset the carbon from the team’s travel.'], { rep: 0.5 });

/* ---------- imprensa e redes ---------- */
M('carroLonge', 'driver', ['{d}: "o carro ainda está longe do ideal"', '{d}: "the car is still far from ideal"'], ['A declaração pegou mal na fábrica.', 'The comment did not go down well at the factory.'], { mor: -2 },
  { sev: 2, ch: [{ l: ['Apoiar o piloto publicamente', 'Back the driver publicly'], o: ['A equipe diz que o piloto só falou o que todos sabem.', 'The team says the driver only said what everyone knows.'], fx: { morale: { D: 4 }, board: -2 } }, { l: ['Conversar em particular', 'Talk to him privately'], o: ['O assunto morreu na reunião de segunda.', 'The matter ended at Monday’s meeting.'], fx: { morale: { D: -1 }, board: 1 } }] });
M('memeViral', 'driver', ['Meme com {d} viraliza depois do {gp}', 'A meme of {d} goes viral after the {gp}'], ['O próprio piloto compartilhou a brincadeira.', 'The driver shared the joke himself.'], { pop: 3 });
M('farpas', 'rival', ['{d} e {x} trocam farpas nas redes', '{d} and {x} trade barbs online'], ['A discussão começou com uma disputa de posição.', 'It started with a battle for position.'], { pop: 1, xpop: 1 });
M('rumorInfeliz', 'driver', ['Rumor: {d} estaria insatisfeito na {t}', 'Rumour: {d} is said to be unhappy at {t}'], ['A equipe nega e diz que a relação é ótima.', 'The team denies it and says the relationship is great.'], { mor: -2 });
M('rumorMotor', 'team', ['Rumor: {t} sonda outro fornecedor de motor', 'Rumour: {t} sounds out another engine supplier'], ['A equipe diz que está concentrada no presente.', 'The team says it is focused on the present.'], {});
M('jornalistaBarrado', 'team', ['Jornalista é barrado na área de imprensa da {t}', 'A journalist is barred from the {t} media area'], ['A associação de imprensa protestou.', 'The press association protested.'], { rep: -1 });
M('coletivaAtraso', 'driver', ['{d} chega atrasado à coletiva e leva multa', '{d} arrives late to the press conference and is fined'], ['Multa simbólica da FIA.', 'A token fine from the FIA.'], { pop: -1, money: -0.01 });
M('noticiaFalsa', 'driver', ['Notícia falsa sobre saída de {d} da {t} circula nas redes', 'Fake news about {d} leaving {t} spreads online'], ['A equipe desmentiu em menos de uma hora.', 'The team denied it within an hour.'], { mor: -1 });
M('emocao', 'driver', ['{d} se emociona ao falar da família', '{d} gets emotional talking about his family'], ['A entrevista foi uma das mais vistas da temporada.', 'The interview was one of the most watched of the season.'], { pop: 2 });
M('criticaComissarios', 'staff', ['{s}, da {t}, critica os comissários', '{s} of {t} criticises the stewards'], ['A FIA avisou que pode punir comentários desse tipo.', 'The FIA warned it may punish such comments.'], { rep: -1, money: -0.05 }, { roles: ['principal', 'sporting'] });
M('elogioRival', 'driver', ['Chefe da {v} elogia {d}', 'The {v} team boss praises {d}'], ['"É um dos melhores do grid hoje", disse.', '"He is one of the best on the grid right now," he said.'], { mor: 2, pop: 1 });
M('audiencia', 'any', ['Transmissão do {gp} bate recorde de audiência', 'The {gp} broadcast sets an audience record'], ['A categoria comemora o crescimento entre os jovens.', 'The series celebrates its growth among young fans.'], {});
M('radioPalavrao', 'driver', ['Rádio de {d} com palavrão vaza e vira piada', '{d}’s sweary radio message leaks and becomes a joke'], ['A FIA lembrou as regras de linguagem.', 'The FIA reminded teams of the language rules.'], { pop: 1, mor: -1 });
M('videoEngracado', 'pair', ['{d} e {d2} gravam vídeo engraçado para as redes', '{d} and {d2} film a funny video for social media'], ['O vídeo mostrou a boa relação entre os companheiros.', 'The video showed the good relationship between the team-mates.'], { mor: 1, pop: 1, both: true });
M('criticaFas', 'driver', ['{d} responde às críticas de torcedores', '{d} answers criticism from fans'], ['A resposta dividiu opiniões.', 'The reply divided opinion.'], { pop: -1 });
M('episodioSerie', 'team', ['Episódio de série mostra discussão nos bastidores da {t}', 'A docuseries episode shows a backstage row at {t}'], ['A equipe diz que as cenas foram editadas fora de contexto.', 'The team says the scenes were edited out of context.'], { rep: -1, mood: -2 });
M('pilotoDoMes', 'driver', ['{d} é eleito piloto do mês pela imprensa', '{d} named driver of the month by the press'], [''], { pop: 2, mor: 2 });
M('pinturaVazada', 'team', ['Pintura nova da {t} vaza antes do lançamento', 'New {t} livery leaks before the launch'], ['A equipe brincou com o vazamento nas redes.', 'The team joked about the leak online.'], {});
M('streaming', 'team', ['{t} fecha acordo de conteúdo com plataforma de streaming', '{t} signs a content deal with a streaming platform'], ['A série vai mostrar a rotina da fábrica.', 'The series will show life at the factory.'], { money: 0.5 }, { cool: 3 });
M('campanhaSocial', 'team', ['{t} lança campanha contra o preconceito no esporte', '{t} launches a campaign against prejudice in sport'], [''], { rep: 1 });
M('influenciador', 'team', ['Influenciador famoso visita a garagem da {t} e atrapalha o trabalho', 'A famous influencer visits the {t} garage and gets in the way'], ['Mecânicos reclamaram da visita em pleno treino.', 'Mechanics complained about the visit during practice.'], { pit: -0.2 });
M('entrevistaPolemica', 'staff', ['{s}, da {t}, diz que a equipe "não aceita ser coadjuvante"', '{s} of {t} says the team "will not accept a supporting role"'], ['A frase virou manchete nos jornais.', 'The quote made the headlines.'], { mood: 2 }, { roles: ['principal'] });
M('podcast', 'driver', ['{d} conta histórias da infância em podcast', '{d} tells childhood stories on a podcast'], [''], { pop: 1 });
M('enquete', 'driver', ['{d} lidera enquete de piloto favorito dos fãs', '{d} tops a fan poll for favourite driver'], [''], { pop: 2 });
M('tecnologiaCarro', 'team', ['Imprensa técnica destaca solução inovadora da {t}', 'Technical press highlights an innovative {t} solution'], ['Rivais já fotografaram a peça de todos os ângulos.', 'Rivals have already photographed the part from every angle.'], { rep: 1 });

/* ---------- operação e logística ---------- */
O('alfandega', 'team', ['Peças da {t} ficam presas na alfândega antes do {gp}', '{t} parts held at customs before the {gp}'], ['A equipe pagou taxa extra para liberar a carga.', 'The team paid an extra fee to release the cargo.'], { money: -0.2 });
O('caminhao', 'team', ['Caminhão da {t} quebra a caminho do {gp}', 'A {t} truck breaks down on the way to the {gp}'], ['Outro caminhão foi alugado às pressas.', 'Another truck was hired in a hurry.'], { money: -0.15 });
O('vooAtrasado', 'team', ['Voo fretado da {t} atrasa e a equipe chega de madrugada', '{t} charter flight delayed, crew arrives in the small hours'], ['Os mecânicos montaram a garagem sem dormir.', 'The mechanics built the garage without sleep.'], { pit: -0.3 });
O('quedaEnergia', 'team', ['Queda de energia para a produção da {t} por um dia', 'A power cut halts {t} production for a day'], ['Algumas peças atrasaram.', 'Some parts were delayed.'], { rel: -0.2 });
O('enchente', 'team', ['Enchente atinge depósito da {t}', 'Flooding hits a {t} warehouse'], ['Peças de reposição foram perdidas.', 'Spare parts were lost.'], { money: -0.8, rel: -0.3 }, { sev: 2, cool: 10, w: 0.3 });
O('telemetria', 'team', ['Falha no software de telemetria da {t} no treino', '{t} telemetry software fails in practice'], ['A equipe perdeu parte dos dados da sessão.', 'The team lost part of the session data.'], {});
O('hotel', 'team', ['Equipe da {t} fica sem hotel no {gp}', '{t} crew left without a hotel at the {gp}'], ['Parte dos mecânicos dormiu em outra cidade.', 'Some mechanics slept in another town.'], { pit: -0.2 });
O('pneusTrocados', 'team', ['Jogos de pneus da {t} são trocados por engano', '{t} tyre sets mixed up by mistake'], ['O erro foi corrigido antes da classificação.', 'The error was fixed before qualifying.'], {});
O('garagemMenor', 'team', ['{t} recebe garagem menor no {gp}', '{t} gets a smaller garage at the {gp}'], ['A equipe teve de deixar equipamentos no caminhão.', 'The team had to leave equipment in the truck.'], { pit: -0.1 });
O('combustivelOk', 'team', ['Amostra de combustível da {t} é reanalisada e aprovada', '{t} fuel sample re-tested and approved'], [''], {});
O('freteMaritimo', 'any', ['Tempestade atrasa o frete marítimo do campeonato', 'A storm delays the championship’s sea freight'], ['As equipes usaram material reserva no {gp}.', 'Teams used spare kit at the {gp}.'], {});
O('furto', 'team', ['Ferramentas são furtadas da garagem da {t}', 'Tools stolen from the {t} garage'], ['A polícia local investiga.', 'Local police are investigating.'], { money: -0.05 });
O('greveAeroporto', 'team', ['Greve em aeroporto obriga a {t} a mudar a rota', 'Airport strike forces {t} to change route'], [''], { money: -0.1 });
O('simuladorQuebra', 'team', ['Simulador da {t} fica fora do ar antes do {gp}', '{t} simulator out of action before the {gp}'], ['Os pilotos chegaram com menos preparação.', 'The drivers arrived with less preparation.'], {});
O('pecaRecorde', 'team', ['Fábrica da {t} bate recorde de produção de peças', '{t} factory sets a part production record'], ['Todas as atualizações saíram antes do prazo.', 'All upgrades left ahead of schedule.'], { rel: 0.2 });
O('novaFerramenta', 'team', ['{t} investe em nova máquina de fibra de carbono', '{t} invests in a new carbon fibre machine'], [''], { rel: 0.2, money: -0.3 });

/* ---------- negócios e patrocínio ---------- */
N('bebida', 'team', ['{t} anuncia patrocinador de bebidas', '{t} announces a drinks sponsor'], ['Acordo de curto prazo, com opção de renovação.', 'A short-term deal with an option to renew.'], { money: 0.5 });
N('renovacao', 'team', ['Patrocinador renova com a {t} por mais três anos', 'A sponsor renews with {t} for three more years'], [''], { spons: 3, money: 0.2 });
N('roupas', 'team', ['{t} lança linha de roupas com estilista', '{t} launches a clothing line with a designer'], ['As peças esgotaram no primeiro dia.', 'The items sold out on day one.'], { money: 0.3 });
N('software', 'team', ['{t} fecha parceria com empresa de software', '{t} signs a partnership with a software company'], [''], { money: 0.2, rel: 0.1 });
N('relogio', 'driver', ['{d} assina contrato pessoal com marca de relógios', '{d} signs a personal deal with a watch brand'], [''], { pop: 1, mor: 1 });
N('minoritario', 'team', ['Fundo compra participação minoritária na {t}', 'A fund buys a minority stake in {t}'], ['O dinheiro vai para infraestrutura.', 'The money goes into infrastructure.'], { money: 3, mood: 3 }, { sev: 2, cool: 8, w: 0.4 });
N('premioMarketing', 'team', ['Ação de marketing da {t} ganha prêmio internacional', '{t} marketing campaign wins an international award'], [''], { spons: 2, rep: 0.5 });
N('patrocinadorCobra', 'team', ['Patrocinador cobra mais exposição da {t}', 'A sponsor demands more exposure from {t}'], ['A marca quer mais tempo de tela nas transmissões.', 'The brand wants more screen time on broadcasts.'], { spons: -3 });
N('bilheteria', 'any', ['{gp} tem bilheteria recorde', 'The {gp} sets a ticket sales record'], [''], {});
N('cripto', 'team', ['Patrocinador de criptomoedas da {t} entra na mira de reguladores', '{t}’s crypto sponsor comes under regulators’ scrutiny'], ['A equipe diz acompanhar o caso.', 'The team says it is monitoring the case.'], { spons: -2, rep: -1 }, { sev: 2, w: 0.5 });
N('vip', 'team', ['{t} vende todos os pacotes VIP do {gp}', '{t} sells out every VIP package for the {gp}'], [''], { money: 0.4 });
N('videogame', 'team', ['Jogo de corrida paga direitos de imagem à {t}', 'A racing game pays image rights to {t}'], [''], { money: 0.2 });
N('patrocinioPiloto', 'rookie', ['{d} leva patrocinador pessoal para a {t}', '{d} brings a personal sponsor to {t}'], [''], { money: 0.6, mor: 1 });
N('naming', 'team', ['{t} negocia nome de patrocinador no nome da equipe', '{t} negotiates a title sponsor for the team name'], ['As conversas estão em fase inicial.', 'Talks are at an early stage.'], {}, { cool: 4 });

/* ---------- conflitos internos ---------- */
C('trocaEngenheiro', 'driver', ['{d} pede para trocar de engenheiro de corrida', '{d} asks to change race engineer'], ['O piloto diz que a comunicação não funciona.', 'The driver says communication is not working.'], { mor: -2 },
  { sev: 2, ch: [{ l: ['Atender o pedido', 'Grant the request'], o: ['O engenheiro foi para a fábrica; o piloto ficou mais tranquilo.', 'The engineer moved to the factory; the driver is calmer.'], fx: { morale: { D: 5 }, staff: { engineering: -1 } } }, { l: ['Manter a dupla', 'Keep the pairing'], o: ['A equipe pediu paciência aos dois.', 'The team asked both for patience.'], fx: { morale: { D: -3 } } }] });
C('estrategiaReuniao', 'driver', ['{d} discorda da estratégia em reunião', '{d} disagrees with the strategy in a meeting'], ['A discussão vazou para a imprensa.', 'The argument leaked to the press.'], { mor: -2 });
C('bonusMecanicos', 'team', ['Mecânicos da {t} pedem bônus por resultados', '{t} mechanics ask for a results bonus'], ['A diretoria prometeu estudar o pedido.', 'Management promised to look into it.'], { pit: -0.3, money: -0.1 });
C('demissaoPessoal', 'staff', ['{s} deixa a {t} por motivos pessoais', '{s} leaves {t} for personal reasons'], ['Um interino assume a função.', 'An interim takes over the role.'], {}, { roles: ['performance', 'strategy', 'operations', 'marketing'], cool: 2, after: (G, c, t) => { const s = t && (t.staffList || []).find(x => x.id === c.sid); if (s && !s.isPlayer) Chaos.removeStaff(G, t, s); } });
C('motorReuniao', 'team', ['Reunião tensa entre a {t} e a fornecedora de motor', 'Tense meeting between {t} and its engine supplier'], ['As partes discordam sobre a distribuição das atualizações.', 'The parties disagree on how upgrades are shared.'], { mood: -1 });
C('assessor', 'driver', ['{d} troca de assessor de imprensa', '{d} changes press officer'], [''], { pop: -1 });
C('pesagem', 'rival', ['{d} discute com {x} na pesagem', '{d} argues with {x} at the weigh-in'], ['Os comissários pediram calma aos dois.', 'The stewards asked both to calm down.'], { pop: 1, mor: -1, xpop: 1 });
C('cobrancaDiretoria', 'team', ['Diretoria da {t} cobra resultados', 'The {t} board demands results'], ['O recado foi dado em reunião com toda a equipe.', 'The message was delivered in an all-hands meeting.'], { mood: -3 });
C('ciumes', 'pair', ['Clima esquenta: {d} acha que {d2} recebe peças novas antes', 'Tension: {d} believes {d2} gets new parts first'], ['A equipe garante igualdade de tratamento.', 'The team insists on equal treatment.'], { mor: -3 }, { sev: 2 });

/* ---------- saúde ---------- */
H('gripe', 'driver', ['{d} está gripado, mas vai correr no {gp}', '{d} has the flu but will race at the {gp}'], [''], { mor: -1 });
H('intoxicacao', 'driver', ['{d} passa mal com intoxicação alimentar', '{d} suffers food poisoning'], ['O médico da equipe liberou o piloto.', 'The team doctor cleared the driver.'], { mor: -2 });
H('pescoco', 'driver', ['{d} sente dores no pescoço depois de batida no simulador', '{d} has neck pain after a simulator crash'], ['Nada grave, segundo a equipe.', 'Nothing serious, says the team.'], {});
H('mecanicoFerido', 'team', ['Mecânico da {t} se fere levemente num pit stop', 'A {t} mechanic is lightly injured in a pit stop'], ['O mecânico passa bem; a equipe revisa o procedimento.', 'The mechanic is fine; the team reviews the procedure.'], { pit: -0.3 });
H('calor', 'any', ['Calor extremo no {gp}: pilotos perdem até 3 kg na corrida', 'Extreme heat at the {gp}: drivers lose up to 3 kg in the race'], [''], {});
H('fisio', 'driver', ['{d} reforça a preparação com novo fisioterapeuta', '{d} steps up training with a new physio'], [''], { mor: 1 });
H('vacina', 'team', ['Surto de virose atinge a equipe da {t}', 'A stomach bug hits the {t} crew'], ['Alguns mecânicos foram substituídos no fim de semana.', 'Some mechanics were replaced for the weekend.'], { pit: -0.4 });

/* ---------- escândalos menores ---------- */
E('multaEstrada', 'driver', ['{d} é multado por excesso de velocidade na estrada', '{d} fined for speeding on a public road'], ['O piloto pediu desculpas.', 'The driver apologised.'], { pop: -1 }, { w: 0.6 });
E('cartaAnonima', 'team', ['Carta anônima acusa a {t} de favorecer um dos pilotos', 'Anonymous letter accuses {t} of favouring one driver'], ['A equipe nega e chama a carta de "ridícula".', 'The team denies it and calls the letter "ridiculous".'], { mor: -2, mor2: -2 }, { w: 0.5 });
E('ingressoFalso', 'any', ['Polícia desmonta esquema de ingressos falsos do {gp}', 'Police bust a fake ticket ring at the {gp}'], [''], {}, { w: 0.4 });
})();
