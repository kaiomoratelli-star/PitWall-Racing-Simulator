/* ============================================================
   PIT WALL — notícias e eventos (Fase 6), complementa media.js
   1) Perfis de criadores de conteúdo (pessoas reais, a pedido, sempre
      marcados como simulação): reagem a vitórias, títulos, contratações,
      abandonos e polêmicas com textos genéricos e respeitosos.
   2) Anúncio em etapas: conversa (rumor) → vazamento → anúncio oficial
      uma a três etapas depois. Quando envolve a equipe do jogador, sai na hora.
   3) Eventos raros por nível (raro, muito raro, extremo), sempre com
      pessoas e organizações fictícias. Ocorrência e descoberta são etapas
      separadas: o escândalo pode ser descoberto semanas depois ou acobertado.
      A descoberta traz consequências em cadeia (patrocinador, multa, saída).
   4) Ciclo da vida: falecimento por causas naturais, com frequência
      baixíssima, de personagens fictícios idosos (funcionários e ex-pilotos
      gerados). Pessoas reais só com a opção ligada (desligada por padrão).
   5) Modo de depuração: forçar cada evento (tela Diagnóstico).
   ============================================================ */
'use strict';

const Stories = {};

/* ---------- 1) criadores de conteúdo ---------- */
Social.CREATORS = [
  { name: 'GlockDepre', style: 'meme' }, { name: 'Primeira Fila F1', style: 'analise' }, { name: 'Boteco F1', style: 'resenha' },
  { name: 'Ressaca F1', style: 'resenha' }, { name: 'Rafael Lopes', style: 'analise' }, { name: 'Kevin Nicolas', style: 'resenha' },
  { name: 'EFFE', style: 'analise' }, { name: 'GP em Casa', style: 'noticia' }, { name: 'Luca Morelli', style: 'noticia' },
  { name: 'Mariana Becker', style: 'reportagem' }, { name: 'Juliana Cerasolli', style: 'analise' }, { name: 'F1das_frase', style: 'meme' },
  { name: 'Tiago Mendonça', style: 'analise' }, { name: 'Estagiário da F1', style: 'meme' },
];
Social.REACT = {
  win: {
    meme: [['{d} venceu e eu já tô chorando no sofá', '{d} won and I am already crying on the sofa'], ['print pra eternidade: {d} no topo do pódio', 'screenshot for eternity: {d} on top of the podium']],
    analise: [['Vitória construída na estratégia. {d} administrou o pneu como poucos hoje.', 'A win built on strategy. {d} managed the tyres like few could today.'], ['O carro da {t} deu um passo, mas a diferença hoje foi {d}.', 'The {t} car has stepped up, but today the difference was {d}.']],
    resenha: [['Resenha de hoje: {d} sobrando e o resto brigando pelo resto.', "Today's chat: {d} cruising and everyone else fighting for scraps."], ['{d} ganhou. Abre o boteco que hoje tem assunto!', '{d} won. Open the bar, we have plenty to talk about!']],
    noticia: [['{d} vence com a {t}. Resumo completo no ar.', '{d} wins for {t}. Full recap is live.']],
    reportagem: [['Falei com {d} logo depois da bandeirada: muito emocionado com o trabalho da {t}.', 'Spoke to {d} right after the flag: very emotional about the work of {t}.']],
  },
  title: {
    meme: [['{d} CAMPEÃO. Não tenho mais palavras, só gritos.', '{d} CHAMPION. No words left, only screams.']],
    analise: [['Título justo: {d} foi o mais regular da temporada.', 'A fair title: {d} was the most consistent of the season.']],
    resenha: [['Campeonato decidido! {d} merecido demais.', 'Championship settled! {d} thoroughly deserved it.']],
    noticia: [['{d} é campeão mundial. Os números da temporada no site.', '{d} is world champion. The season in numbers on the site.']],
    reportagem: [['Que temporada de {d}. Uma honra contar essa história de perto.', 'What a season from {d}. An honour to tell this story up close.']],
  },
  signing: {
    meme: [['{d} na {t}? meu fantasy acabou de mudar', '{d} at {t}? my fantasy team just changed']],
    analise: [['Movimento lógico: {t} ganha experiência e {d} ganha um projeto.', 'A logical move: {t} gains experience and {d} gets a project.']],
    resenha: [['{d} na {t}. Vai dar certo? Comenta aí.', '{d} to {t}. Will it work? Let us know.']],
    noticia: [['OFICIAL: {d} é piloto da {t}.', 'OFFICIAL: {d} joins {t}.']],
    reportagem: [['Bastidores: a negociação de {d} com a {t} levou semanas.', 'Behind the scenes: the {d}–{t} deal took weeks.']],
  },
  dnf: {
    meme: [['{d} abandonou e eu abandonei a transmissão junto', '{d} retired and so did I from the broadcast'], ['dia difícil pro {d}. amanhã tem mais', 'tough day for {d}. there is always next time']],
    analise: [['Abandono caro para {d}: pontos importantes ficando pelo caminho.', 'A costly retirement for {d}: important points lost.']],
    resenha: [['Que azar de {d} hoje. Corrida perdida.', 'What bad luck for {d} today. Race over.']],
  },
  scandal: {
    analise: [['Caso sério. Vamos esperar a investigação antes de qualquer conclusão.', 'Serious case. Let us wait for the investigation before any conclusion.']],
    noticia: [['Repercussão do caso: tudo o que se sabe até agora.', 'Fallout of the case: everything we know so far.']],
    reportagem: [['Paddock tenso hoje. Ninguém quer falar oficialmente sobre o caso.', 'Tense paddock today. Nobody wants to talk on the record.']],
  },
  record: {
    analise: [['Marca histórica de {d}. Números que entram para a história.', 'A historic mark for {d}. Numbers for the history books.']],
    meme: [['{d} quebrando recorde e eu quebrando o sofá', '{d} breaking records and me breaking the sofa']],
  },
  tribute: {
    analise: [['{d}: uma vida dedicada ao automobilismo. Nossos sentimentos à família e aos amigos.', '{d}: a life devoted to motorsport. Our condolences to family and friends.']],
    reportagem: [['O paddock perde {d}, uma pessoa querida. Descanse em paz.', 'The paddock loses {d}, a much-loved person. Rest in peace.']],
    noticia: [['Homenagem: relembre a trajetória de {d} no automobilismo.', 'Tribute: a look back at the motorsport career of {d}.']],
  },
};
Social.REPLIES_SOBER = [['descanse em paz', 'rest in peace'], ['meus sentimentos', 'my condolences'], ['muito triste', 'very sad'], ['respeito', 'respect']];
Social.REPLIES_SERIOUS = [['vamos aguardar a investigação', 'let us wait for the investigation'], ['caso sério', 'serious case'], ['esperando mais informações', 'waiting for more information']];
Social.REPLIES = [['verdade', 'true'], ['concordo demais', 'totally agree'], ['quero ver na próxima', 'let us see next time'], ['que fase', 'what a time'], ['hahaha exatamente', 'hahaha exactly'], ['respeito', 'respect'], ['não acho, mas vamos ver', 'not sure, but let us see']];

Stories.creatorPost = (G, c, text, about, hype = 1, kind) => {
  G.social = G.social || [];
  const r = localRng(`cr:${G.seed}:${c.name}:${G.social.length}`);
  const likes = Math.round((2500 + r() * 9000) * hype);
  const replies = [0, 1, 2].slice(0, 1 + Math.floor(r() * 2)).map(i => { const f = Social.FANS[Math.floor(r() * Social.FANS.length)]; const RP = kind === 'tribute' ? Social.REPLIES_SOBER : kind === 'scandal' ? Social.REPLIES_SERIOUS : Social.REPLIES; const t = RP[Math.floor(r() * RP.length)]; return { by: f, text: byLang(t[0], t[1]) }; });
  G.social.unshift({ id: (G.seq = (G.seq || 0) + 1), y: G.season ? G.season.year : 0, r: G.season ? G.season.round : 0, by: { kind: 'creator', name: c.name, handle: null, sim: true }, text, kind: 'creator', likes, reposts: Math.round(likes * 0.08), replies, nreplies: Math.round(likes * 0.03) + replies.length, about: about || null });
  if (G.social.length > 260) G.social.length = 260;
};
Stories.react = (G, kind, vars) => {
  const T = Social.REACT[kind]; if (!T) return;
  const r = localRng(`react:${G.seed}:${kind}:${G.seq || 0}:${vars.d || ''}`);
  const pool = Social.CREATORS.filter(c => T[c.style]);
  const n = kind === 'title' || kind === 'tribute' ? 3 : r() < 0.55 ? 1 : 2;
  const used = new Set();
  for (let i = 0; i < n && pool.length; i++) {
    const c = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const opts = T[c.style].filter(o => !used.has(o[0]));
    if (!opts.length) continue;
    const t = opts[Math.floor(r() * opts.length)]; used.add(t[0]);
    const fill = (s) => s.replace(/\{d\}/g, vars.d || '').replace(/\{t\}/g, vars.t || '');
    Stories.creatorPost(G, c, fill(byLang(t[0], t[1])), vars.about, kind === 'title' ? 3 : 1.2, kind);
  }
};
(function () {
  const post = Social.post;
  Social.post = (G, p) => {
    post(G, p);
    const map = { win: 'win', title: 'title', signing: 'signing', dnf: 'dnf', scandal: 'scandal', record: 'record' };
    const k = map[p.kind];
    if (!k || p._noReact) return;
    if (k === 'title' && p.by) return;        // só uma vez por título (o post do campeão)
    const d = p.driver ? Career.driver(G, p.driver) : null, t = p.team ? Career.team(G, p.team) : d && d.team ? Career.team(G, d.team) : null;
    if (['win', 'title', 'dnf', 'record'].includes(k) && !(d && d.team)) return;   // só a F1
    if (k === 'dnf' && localRng(`dnfr:${G.seed}:${G.seq}`)() > 0.35) return;
    Stories.react(G, k, { d: d ? d.name : '', t: t ? t.name : '', about: p.driver || p.team || null });
  };
})();

/* ---------- 2) anúncio em etapas (conversa → vazamento → oficial) ---------- */
Stories.state = (G) => (G.stories = G.stories || { queue: [], hidden: [], log: [] });
(function () {
  const sf = Market.signFuture;
  Market.signFuture = (G, d, t, offer, buyout) => {
    const mine = !Career.isObs(G) && (t.id === G.player.teamId || d.team === G.player.teamId);
    if (mine) return sf(G, d, t, offer, buyout);
    const q = [];
    const N = Career.news, P = Social.post;
    Career.news = (G2, ...a) => { q.push(['n', a]); };
    Social.post = (G2, p) => { q.push(['p', p]); };
    try { sf(G, d, t, offer, buyout); } finally { Career.news = N; Social.post = P; }
    const S = Stories.state(G);
    const r = localRng(`ann:${G.seed}:${d.id}:${G.season.year}`);
    S.queue.push({ due: G.season.round + 1 + Math.floor(r() * 3), y: G.season.year, q, did: d.id, tid: t.id });
    const o = ['therace', 'motorsport', 'autosport', 'planetf1'][Math.floor(r() * 4)];
    Career.news(G, byLang(`Vazamento: ${d.name} tem acordo com a ${t.name} para ${G.season.year + 1}`, `Leak: ${d.name} has a deal with ${t.name} for ${G.season.year + 1}`), 'rumor', byLang('Fontes do paddock dão o acordo como fechado. O anúncio oficial deve sair nas próximas semanas.', 'Paddock sources say the deal is done. The official announcement is expected in the coming weeks.'), { dr: [d.id], tm: [t.id], outlet: o });
    P(G, { by: o, kind: 'rumor', driver: d.id, text: byLang(`EXCLUSIVO: ${d.name} e ${t.name} têm acordo para ${G.season.year + 1}. Anúncio oficial em breve.`, `EXCLUSIVE: ${d.name} and ${t.name} have agreed terms for ${G.season.year + 1}. Official announcement soon.`), hype: 1.6 });
    if (G.social && G.social[0]) G.social[0].aboutTeam = t.id;
  };
})();
Stories.release = (G, all) => {
  const S = Stories.state(G);
  const keep = [];
  S.queue.forEach(x => {
    if (!all && x.y === G.season.year && x.due > G.season.round) { keep.push(x); return; }
    x.q.forEach(([k, a]) => { if (k === 'n') Career.news(G, ...a); else Social.post(G, a); });
  });
  S.queue = keep;
};

/* ---------- 3) eventos raros por nível, com ocorrência e descoberta ---------- */
Stories.TIERS = { raro: 0.02, muitoRaro: 0.0055, extremo: 0.001 };   // chance por etapa (antes do multiplicador de eventos)
Stories.tick = (G) => {
  const rate = (G.options && G.options.eventRate) ?? 1;
  const r = localRng(`ev:${G.seed}:${G.season.year}:${G.season.round}`);
  const S = Stories.state(G);
  // descobertas pendentes
  S.hidden.filter(h => !h.out && !h.covered && h.y === G.season.year && h.discover <= G.season.round).forEach(h => Stories.discover(G, h));
  if (r() < Stories.TIERS.raro * rate) Stories.rare(G, r);
};
/* raro: incidentes de operação (fictícios, sem pessoas reais) */
Stories.rare = (G, r) => {
  const t = G.db.teams[Math.floor(r() * G.db.teams.length)];
  const kind = r() < 0.5 ? 'tunel' : 'logistica';
  const mine = !Career.isObs(G) && t.id === G.player.teamId;
  if (kind === 'tunel') {
    if (mine && G.atrPool) { G.atrPool.wt = Math.round(G.atrPool.wt * 0.5); }
    else t.car.aero = +(t.car.aero - 0.15).toFixed(2);
    Career.news(G, byLang(`Túnel de vento da ${t.name} fica parado por falha técnica`, `${t.name} wind tunnel down after a technical fault`), 'tecnica', byLang('A equipe perde parte das horas de túnel do período enquanto o equipamento é reparado.', 'The team loses part of its wind tunnel hours for the period while repairs are carried out.'), { tm: [t.id] });
  } else {
    if (mine) Career.ledger(G, byLang('Frete aéreo extra (atraso na logística)', 'Extra air freight (logistics delay)'), -0.4, 'operação'); else t.cash = (t.cash || 0) - 0.4;
    Career.news(G, byLang(`Atraso de carga obriga a ${t.name} a pagar frete aéreo extra`, `Cargo delay forces ${t.name} to pay for extra air freight`), 'paddock', '', { tm: [t.id] });
  }
  if (mine) Career.mail(G, { from: byLang('Diretor de operações', 'Operations director'), tag: 'team', important: true, title: kind === 'tunel' ? byLang('Túnel de vento parado', 'Wind tunnel down') : byLang('Atraso na logística', 'Logistics delay'), body: kind === 'tunel' ? byLang('Metade das horas de túnel deste período foi perdida.', 'Half of this period’s wind tunnel hours were lost.') : byLang('Pagamos frete aéreo extra para os carros chegarem a tempo.', 'We paid for extra air freight so the cars arrive on time.') });
  S_log(G, 'raro', kind, t.id);
};
function S_log(G, tier, kind, tid) { const S = Stories.state(G); S.log.unshift({ y: G.season.year, r: G.season.round, tier, kind, tid }); if (S.log.length > 60) S.log.length = 60; }

/* muito raro: escândalo (personagens fictícios) — ocorre agora, é descoberto depois ou acobertado */
(function () {
  const st = Media.scandalTick;
  Media.scandalTick = (G, force) => {
    const q = [];
    const N = Career.news, P = Social.post, M = Career.mail, R = Career.record;
    Career.news = (G2, ...a) => q.push(['n', a]); Social.post = (G2, p) => q.push(['p', p]); Career.mail = (G2, m) => q.push(['m', m]); Career.record = (G2, ...a) => q.push(['r', a]);
    let before;
    try { before = (G.memory || {}).lastScandal; if (force) { const m = Media.mem(G); m.lastScandal = -99; const rr = RNG.chance; RNG.chance = () => true; try { st(G); } finally { RNG.chance = rr; } } else st(G); }
    finally { Career.news = N; Social.post = P; Career.mail = M; Career.record = R; }
    if (!q.length) return;
    const S = Stories.state(G);
    const r = localRng(`sc:${G.seed}:${G.season.year}:${G.season.round}`);
    const covered = !force && r() < 0.3;
    const nq = q.find(x => x[0] === 'n' && x[1][3] && x[1][3].tm);
    const tid = nq ? nq[1][3].tm[0] : null;
    S.hidden.push({ y: G.season.year, at: G.season.round, discover: G.season.round + (force ? 0 : 1 + Math.floor(r() * 6)), covered, q, tid });
    S_log(G, 'muitoRaro', covered ? 'escandalo acobertado' : 'escandalo', tid);
    if (force) Stories.discover(G, S.hidden[S.hidden.length - 1]);
  };
})();
Stories.discover = (G, h) => {
  h.out = true;
  h.q.forEach(([k, a]) => { if (k === 'n') Career.news(G, ...a); else if (k === 'p') Social.post(G, a); else if (k === 'm') Career.mail(G, { ...a, important: true }); else Career.record(G, ...a); });
  // consequências em cadeia (fictícias): patrocinador revê contrato, multa da FIA
  const t = h.tid && Career.team(G, h.tid);
  if (!t) return;
  const mine = !Career.isObs(G) && t.id === G.player.teamId;
  if (mine) { (G.sponsors || []).forEach(s => (s.satisfaction = clamp(s.satisfaction - 10, 0, 100))); Career.ledger(G, byLang('Multa da FIA (investigação)', 'FIA fine (investigation)'), -0.5, 'operação'); }
  else { t.cash = (t.cash || 0) - 0.5; t.reputation = clamp(t.reputation - 1, 30, 99); }
  Career.news(G, byLang(`Desdobramento: FIA multa a ${t.name} e patrocinadores pedem explicações`, `Fallout: FIA fines ${t.name} and sponsors ask for explanations`), 'escandalo', byLang('A investigação segue; a equipe diz que reforçou os controles internos.', 'The investigation continues; the team says it has tightened internal controls.'), { tm: [t.id] });
};

/* ---------- 4) ciclo da vida: causas naturais, frequência baixíssima ---------- */
Stories.qx = (age) => Math.min(0.2, 0.0005 * Math.exp(0.085 * (age - 30))) * 0.25;
Stories.staffAge = (G, s) => { if (s.born == null) s.born = (s.since || 2026) - (36 + (hashStr(s.id + s.name) % 26)); return G.season.year - s.born; };
Stories.yearly = (G, forceWho) => {
  const real = !!(G.options && G.options.realMortality);
  const y = G.season.year;
  const cands = [];
  G.db.teams.forEach(t => (t.staffList || []).forEach(s => { if (!s.isPlayer && (!s.real || real)) cands.push({ kind: 'staff', t, s, name: s.name, age: Stories.staffAge(G, s), real: !!s.real }); }));
  G.db.drivers.forEach(d => { if (d.retired && !d.dead && d.age >= 55 && (d.regen || real)) cands.push({ kind: 'driver', d, name: d.name, age: d.age, real: !d.regen }); });
  let list;
  if (forceWho) list = [cands.filter(c => !c.real).sort((a, b) => b.age - a.age)[0]].filter(Boolean);
  else list = cands.filter(c => localRng(`life:${G.seed}:${c.name}:${y}`)() < Stories.qx(c.age));
  list.slice(0, 1).forEach(c => Stories.passAway(G, c));
};
Stories.passAway = (G, c) => {
  const y = G.season.year;
  if (c.kind === 'staff') {
    const t = c.t; t.staffList = t.staffList.filter(x => x !== c.s);
    const repl = { id: Career.nextId(G, 'sf'), role: c.s.role, name: Staff.genName(t.country), real: false, rating: Math.round(clamp(c.s.rating - 6, 58, 85)), until: y + 1, since: y, interim: true };
    repl.salary = Staff.salaryFor(c.s.role, repl.rating); t.staffList.push(repl); Staff.derive(t);
    (G.memorial = G.memorial || []).push({ y, name: c.name, age: c.age, role: Staff.ROLES[c.s.role] ? Staff.ROLES[c.s.role].name : c.s.role, team: t.name, real: c.real });
    Career.news(G, byLang(`Luto na ${t.name}: morre ${c.name}, aos ${c.age} anos`, `${t.name} in mourning: ${c.name} dies aged ${c.age}`), 'paddock', byLang(`${c.name}, ${(Staff.ROLES[c.s.role] || { name: '' }).name.toLowerCase()} da equipe, morreu de causas naturais. A equipe vai homenageá-lo na próxima corrida.${c.real ? '' : ' (Personagem fictício.)'}`, `${c.name}, the team’s ${c.s.role}, died of natural causes. The team will pay tribute at the next race.${c.real ? '' : ' (Fictional character.)'}`), { tm: [t.id] });
    if (!Career.isObs(G) && t.id === G.player.teamId) Career.mail(G, { from: byLang('Diretoria', 'Board'), tag: 'team', important: true, title: byLang(`Morre ${c.name}`, `${c.name} has died`), body: byLang(`Com pesar, informamos a morte de ${c.name}, aos ${c.age} anos, de causas naturais. Um substituto interino assume a função.`, `We are sad to report that ${c.name} has died aged ${c.age} of natural causes. An interim replacement takes over the role.`) });
  } else {
    const d = c.d; d.dead = true; d.deathYear = y;
    (G.memorial = G.memorial || []).push({ y, name: d.name, age: d.age, role: byLang('ex-piloto', 'former driver'), team: null, real: c.real, did: d.id });
    Career.news(G, byLang(`Morre ${d.name}, ex-piloto, aos ${d.age} anos`, `Former driver ${d.name} dies aged ${d.age}`), 'historia', byLang(`${d.name} morreu de causas naturais.${d.career && d.career.starts ? ` Disputou ${d.career.starts} GPs, com ${d.career.wins} vitória(s).` : ''}${c.real ? '' : ' (Personagem gerado pelo jogo.)'}`, `${d.name} died of natural causes.${d.career && d.career.starts ? ` Started ${d.career.starts} GPs, with ${d.career.wins} win(s).` : ''}${c.real ? '' : ' (Game-generated character.)'}`), { dr: [d.id] });
  }
  Career.record(G, 'memoria', byLang(`${c.name} morreu aos ${c.age} anos (causas naturais).`, `${c.name} died aged ${c.age} (natural causes).`), {});
  Stories.react(G, 'tribute', { d: c.name });
  S_log(G, 'extremo', 'falecimento', c.t ? c.t.id : null);
};

/* ---------- ganchos ---------- */
(function () {
  const fw = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => { const r = fw(G, ...a); Stories.release(G); Stories.tick(G); return r; };
  const es = Career.endSeason;
  Career.endSeason = (G) => { Stories.release(G, true); Stories.yearly(G); return es(G); };
})();

/* ---------- 5) depuração: forçar eventos ---------- */
Stories.force = (G, kind) => {
  if (kind === 'escandalo') return Media.scandalTick(G, true);
  if (kind === 'raro') return Stories.rare(G, localRng(`force:${G.seed}:${G.seq || 0}:${G.season.round}`));
  if (kind === 'falecimento') return Stories.yearly(G, true);
  if (kind === 'anuncios') return Stories.release(G, true);
  return null;
};
