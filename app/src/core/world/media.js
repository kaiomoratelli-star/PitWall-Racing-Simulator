/* ============================================================
   PIT WALL — imprensa, redes sociais e memória de histórias
   Tudo nasce de fatos do banco de dados. A memória evita repetir
   a mesma pauta e acompanha rivalidades ao longo das temporadas.
   Escândalos (raros) envolvem só pessoas e organizações fictícias.
   ============================================================ */
'use strict';

const Media = {};

/* veículos reais; o país orienta qual veículo cobre cada piloto */
// (0.9, regra 19) lista do mundo real: fica no Pacote de dados (WORLD_LISTS.outlets, app/data/world-lists.js), não no código
Object.defineProperty(Media, 'OUTLETS', { get: () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.outlets) || {}, configurable: true });
// (0.9, ids opacos) listas do mundo real: no Pacote de dados (WORLD_LISTS.outletsByNat / outletsByTag / rumorOutlets /
// officialOutlet / officialPoster); sem pacote, a imprensa genérica
Object.defineProperty(Media, 'BY_NAT', { get: () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.outletsByNat) || {}, configurable: true });
Object.defineProperty(Media, 'BY_TAG', { get: () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.outletsByTag) || {}, configurable: true });
Media.official = () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.officialOutlet) || 'f1';   // ids-ok: o veículo oficial do mundo de reserva
Media.proOutlet = () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.proOutlet) || 'motorsport';   // ids-ok: o veículo das séries profissionais no mundo de reserva
Media.officialPoster = () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.officialPoster) || { name: 'Formula 1', handle: 'F1', ref: 'f1' };   // ids-ok: idem
Media.TAGS = { corrida: 'Corrida', campeonato: 'Campeonato', mercado: 'Mercado', regulamento: 'Regulamento', paddock: 'Paddock', equipe: 'Sua equipe', escandalo: 'Investigação', historia: 'História', rivalidade: 'Rivalidade', geral: 'Geral', financas: 'Finanças', rumor: 'Rumores', 'técnica': 'Técnica', tecnica: 'Técnica', staff: 'Bastidores', categorias: 'Outras categorias' };

/* perfis reais nas redes (fonte: Wikidata P2002 e perfis oficiais) */
// (0.9, regra 19) perfis reais nas redes: ficam no Pacote de dados (WORLD_LISTS.handles), não no código
Object.defineProperty(Media, 'HANDLES', { get: () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.handles) || {}, configurable: true });
Media.handle = (kind, obj) => {
  if (!obj) return '';
  if (Media.HANDLES[obj.id]) return Media.HANDLES[obj.id];
  const base = String(obj.name || obj.id).normalize('NFD').replace(/[^A-Za-z0-9]/g, '');
  return kind === 'team' ? base + 'F1' : base.slice(0, 15);
};

/* ---------- memória de histórias ---------- */
Media.mem = (G) => G.memory || (G.memory = { keys: {}, rivals: {}, lastWin: {}, teamLastWin: {}, races: 0 });
Media.once = (G, key) => { const m = Media.mem(G); if (m.keys[key]) return false; m.keys[key] = G.season ? G.season.year : 1; return true; };
Media.pairKey = (a, b) => [a, b].sort().join('|');

/* decora qualquer notícia: veículo, pessoas e equipe citadas, imagem */
Media.decorate = (G, n, refs = {}) => {
  // (0.9) nomes de lugar (circuito, GP, cidade) não contam como citação: 'Red Bull Ring' não é a equipe Red Bull
  const tt = Media.placeFree(G, n.title);
  const ds = refs.dr || G.db.drivers.filter(d => !d.retired && tt.includes(d.name)).slice(0, 3).map(d => d.id);
  const ts = refs.tm || G.db.teams.filter(t => tt.includes(t.name)).slice(0, 2).map(t => t.id);
  n.dr = ds.length ? ds : undefined; n.tm = ts.length ? ts : undefined;
  if (refs.tr) n.tr = refs.tr;
  const h = hashStr(n.id);   // (0.9, regra 19) pelo id da notícia, não pelo título (que tem nomes): o veículo é o mesmo nos dois mundos
  let pool = Media.BY_TAG[n.tag] || Media.BY_TAG.paddock || [null];   // sem pacote: a imprensa genérica (Media.outlet)
  const d0 = ds[0] && Career.driver(G, ds[0]);
  if (d0 && Media.BY_NAT[d0.nat] && h % 100 < 45) pool = Media.BY_NAT[d0.nat];
  n.outlet = refs.outlet || pool[h % pool.length];
  if (!n.body) n.body = Media.context(G, ds, ts);
  return n;
};

/* contexto automático para notas curtas: situação no campeonato de quem é citado */
Media.context = (G, ds, ts) => {
  if (!G.season || !G.season.standD) return '';
  const out = [];
  const sd = Career.standingsD(G), sc = Career.standingsC(G);
  ds.slice(0, 2).forEach(id => {
    const d = Career.driver(G, id); if (!d) return;
    const i = sd.findIndex(x => x.did === id);
    const t = d.team && Career.team(G, d.team);
    if (i >= 0 && G.season.round > 0) out.push(byLang(`${d.name}${t ? ` (${t.name})` : ''} é o ${ordinal(i + 1)} no campeonato de ${G.season.year}, com ${sd[i].pts} pontos.`, `${d.name}${t ? ` (${t.name})` : ''} is ${ordinal(i + 1)} in the ${G.season.year} championship, with ${sd[i].pts} points.`));
    else if (d.career) out.push(byLang(`${d.name} soma ${d.career.starts} GPs e ${d.career.wins} vitória(s) na carreira.`, `${d.name} has ${d.career.starts} GPs and ${d.career.wins} win(s) in their career.`));
  });
  ts.slice(0, 1).forEach(id => { const i = sc.findIndex(x => x.tid === id); const t = Career.team(G, id); if (t && i >= 0 && G.season.round > 0 && !ds.some(x => { const d = Career.driver(G, x); return d && d.team === id; })) out.push(byLang(`A ${t.name} ocupa o ${ordinal(i + 1)} lugar entre os construtores, com ${sc[i].pts} pontos.`, `${t.name} are ${ordinal(i + 1)} in the constructors' standings, with ${sc[i].pts} points.`)); });
  return out.join(' ');
};

/* ---------- redes sociais ---------- */
const Social = {};
Social.FANS = ['torcedor_box', 'pitlane_diaria', 'vacuo_na_reta', 'curva_do_s', 'boxbox_br', 'apex_hunter', 'tifosi_ventidue', 'oranje_vak', 'paddock_madrugada', 'undercut_fc', 'safety_car_eterno', 'dirty_air_club', 'grid_de_largada', 'volta_rapida_fan'];
Media.placeFree = (G, s) => { let t = String(s || ''); (G.db.tracks || []).forEach(tr => [tr.circuit, tr.gp, tr.place, tr.name].forEach(p => { if (p && p.length > 2 && t.includes(p)) t = t.split(p).join(' '); })); return t; };
// veículo pelo id; sem a lista (mundo sem Pacote de dados), um veículo neutro
Media.outlet = (id) => Media.OUTLETS[id] || { name: byLang('Imprensa', 'Press'), handle: 'imprensa' };
Social.post = (G, p) => {
  G.social = G.social || [];
  const d = p.driver ? Career.driver(G, p.driver) : null;
  const t = p.team ? Career.team(G, p.team) : null;
  // (0.9, regra 19) sorteios do post por tipo, ids e posição, nunca pelo texto (que tem nomes)
  const hk = hashStr(`${p.kind || 'post'}:${p.by || ''}:${p.driver || ''}:${p.team || ''}:${G.social.length}`);
  let by;
  if (p.by === 'fan') { const f = Social.FANS[hk % Social.FANS.length]; by = { kind: 'fan', name: f.replace(/_/g, ' '), handle: f }; }
  else if (p.by && Media.OUTLETS[p.by]) by = { kind: 'media', name: Media.OUTLETS[p.by].name, handle: Media.OUTLETS[p.by].handle, ref: p.by };
  else if (p.kind === 'rumor') { const ro = (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.rumorOutlets) || [null]; const o = ro[hk % ro.length]; const out = Media.outlet(o); by = { kind: 'media', name: out.name, handle: out.handle, ref: o }; }
  else if (d && p.as !== 'team') by = { kind: 'driver', name: d.name, handle: Media.handle('driver', d), ref: d.id };
  else if (t) by = { kind: 'team', name: t.name, handle: Media.handle('team', t), ref: t.id };
  else by = { kind: 'media', ...Media.officialPoster() };
  const pop = by.kind === 'driver' && d ? (d.popularity || 40) : by.kind === 'team' && t ? t.reputation : by.kind === 'fan' ? 8 : 70;
  const hype = p.hype || 1;
  const likes = Math.round((pop * pop * 18 + 300) * hype * (0.6 + (hk % 80) / 100));
  G.social.unshift({ id: (G.seq = (G.seq || 0) + 1), y: G.season ? G.season.year : 0, r: G.season ? G.season.round : 0, by, text: p.text, kind: p.kind || 'post', likes, reposts: Math.round(likes * 0.11), img: p.img || null, about: p.driver || p.team || null });
  if (G.social.length > 260) G.social.length = 260;
};

/* ---------- reportagem de corrida ---------- */
Media.raceReport = (G, summary, race) => {
  const track = Career.track(G, summary.trackId);
  const cls = summary.cls;
  const w = Career.driver(G, cls[0].did), wt = Career.team(G, cls[0].tid);
  const p2 = cls[1] && Career.driver(G, cls[1].did), p3 = cls[2] && Career.driver(G, cls[2].did);
  const st = Career.standingsD(G);
  const m = Media.mem(G);
  m.races = (m.races || 0) + 1;
  const ev = race ? race.events : summary.events || [];
  const lines = [];
  // abertura
  const fromGrid = cls[0].grid;
  let head;
  const sinceWin = m.lastWin[w.id] != null ? w.career.starts - m.lastWin[w.id] : null;
  const teamDrought = m.teamLastWin[wt.id] != null ? m.races - m.teamLastWin[wt.id] : null;
  if (w.career.wins === 1) head = byLang(`${w.name} vence pela primeira vez na F1 no ${track.gp}`, `${w.name} wins for the first time in F1 at the ${track.gp}`);
  else if (fromGrid >= 8) head = byLang(`De ${ordinal(fromGrid)} ao topo: ${w.name} faz corrida de recuperação e vence o ${track.gp}`, `From ${ordinal(fromGrid)} to the top: ${w.name} storms through to win the ${track.gp}`);
  else if (sinceWin && sinceWin >= 15) head = byLang(`${w.name} encerra jejum de ${sinceWin} corridas e vence o ${track.gp}`, `${w.name} ends a ${sinceWin}-race drought to win the ${track.gp}`);
  else if (teamDrought && teamDrought >= 20) head = byLang(`${wt.name} volta a vencer depois de ${teamDrought} GPs com ${w.name} no ${track.gp}`, `${wt.name} win again after ${teamDrought} GPs with ${w.name} at the ${track.gp}`);
  else if (summary.wet > 0.25) head = byLang(`${w.name} domina a chuva e vence o ${track.gp}`, `${w.name} masters the rain to win the ${track.gp}`);
  else if (w.nat === track.country) head = byLang(`Festa em casa: ${w.name} vence o ${track.gp}`, `Home party: ${w.name} wins the ${track.gp}`);
  else head = [byLang(`${w.name} vence o ${track.gp} com a ${wt.name}`, `${w.name} wins the ${track.gp} for ${wt.name}`), byLang(`${w.name} leva a ${wt.name} à vitória em ${track.place || track.circuit}`, `${w.name} takes ${wt.name} to victory in ${track.place || track.circuit}`), byLang(`Vitória de ${w.name} no ${track.gp}`, `Victory for ${w.name} at the ${track.gp}`)][hashStr(track.id + G.season.year) % 3];
  m.lastWin[w.id] = w.career.starts; m.teamLastWin[wt.id] = m.races;
  lines.push(byLang(`${w.name} (${wt.name}) largou em ${ordinal(fromGrid)} e venceu em ${track.circuit}${p2 ? `, à frente de ${p2.name}` : ''}${p3 ? ` e ${p3.name}` : ''}.`, `${w.name} (${wt.name}) started ${ordinal(fromGrid)} and won at ${track.circuit}${p2 ? `, ahead of ${p2.name}` : ''}${p3 ? ` and ${p3.name}` : ''}.`));
  // momentos
  const crashes = ev.filter(e => e.type === 'crash').slice(0, 2).map(e => e.text);
  const flags = ev.filter(e => e.type === 'sc' || e.type === 'flag');
  if (flags.length) { const red = ev.some(e => /vermelha|red flag/i.test(e.text)); lines.push(byLang(`A prova teve ${summary.sc || flags.length} intervenção(ões) de Safety Car${red ? ' e bandeira vermelha' : ''}.`, `The race had ${summary.sc || flags.length} Safety Car period(s)${red ? ' and a red flag' : ''}.`)); }
  crashes.forEach(c => lines.push(c));
  if (summary.fastest && Career.driver(G, summary.fastest.did)) lines.push(`${byLang('Volta mais rápida', 'Fastest lap')}: ${Career.driver(G, summary.fastest.did).name}.`);
  const dnfTop = cls.filter(c => c.status === 'dnf' && c.grid <= 4).map(c => `${Career.driver(G, c.did).name} (${c.reason || byLang('abandono', 'retired')})`);
  if (dnfTop.length) lines.push(`${byLang('Abandonaram entre os favoritos', 'Retirements among the favourites')}: ${dnfTop.join(', ')}.`);
  if (st[0]) lines.push(byLang(`No campeonato, ${Career.driver(G, st[0].did).name} lidera com ${st[0].pts} pontos${st[1] ? `, ${st[0].pts - st[1].pts} à frente de ${Career.driver(G, st[1].did).name}` : ''}.`, `In the championship, ${Career.driver(G, st[0].did).name} leads on ${st[0].pts} points${st[1] ? `, ${st[0].pts - st[1].pts} ahead of ${Career.driver(G, st[1].did).name}` : ''}.`));
  Career.news(G, head, 'corrida', lines.join(' '), { dr: [w.id, p2 && p2.id, p3 && p3.id].filter(Boolean), tm: [wt.id], tr: track.id, main: true });

  // marcos e recordes
  Media.milestones(G, w, track);
  // redes sociais
  const vic = [byLang('P1! Que corrida. Obrigado, equipe! 🏆', 'P1! What a race. Thank you, team! 🏆'), byLang('Vitória! Carro incrível hoje. Vamos!', 'Win! Incredible car today. Let\'s go!'), byLang(`Que sensação vencer em ${track.place || track.circuit}!`, `What a feeling to win in ${track.place || track.circuit}!`), byLang('Sem palavras. Obrigado a todos na fábrica.', 'No words. Thank you to everyone at the factory.')];
  Social.post(G, { driver: w.id, kind: 'win', text: w.career.wins === 1 ? byLang('Minha primeira vitória na F1. Sonho de criança realizado. Obrigado a todos que acreditaram.', 'My first F1 win. A childhood dream come true. Thank you to everyone who believed.') : vic[hashStr(w.id + m.races) % vic.length], hype: w.career.wins === 1 ? 3 : 1.4 });
  Social.post(G, { team: wt.id, as: 'team', kind: 'win', text: byLang(`VITÓRIA! ${w.name} vence o ${track.gp}! ${p2 && Career.driver(G, cls[1].did).team === wt.id ? 'Dobradinha!! ' : ''}🏁`, `WIN! ${w.name} wins the ${track.gp}! ${p2 && Career.driver(G, cls[1].did).team === wt.id ? 'One-two!! ' : ''}🏁`), hype: 1.2 });
  Social.post(G, { by: Media.official(), kind: 'result', text: `${byLang('RESULTADO', 'RESULT')} — ${track.gp}\n1. ${w.name}\n2. ${p2 ? p2.name : '—'}\n3. ${p3 ? p3.name : '—'}` });
  cls.filter(c => c.status === 'dnf').slice(0, 2).forEach(c => {
    const d = Career.driver(G, c.did);
    if (d && RNG.chance(0.5)) Social.post(G, { driver: d.id, kind: 'dnf', text: [byLang('Dia difícil. Vamos analisar e voltar mais fortes.', 'Tough day. We will analyse it and come back stronger.'), byLang('Não era o resultado que queríamos. Cabeça erguida.', 'Not the result we wanted. Heads up.'), byLang('Frustrante. Próxima.', 'Frustrating. Next one.')][hashStr(d.id + m.races) % 3] });
  });
  const fanLines = [byLang(`${w.name} pilotando demais hoje`, `${w.name} was on another level today`), byLang(`Estratégia da ${wt.name} foi perfeita`, `${wt.name} nailed the strategy`), byLang(`Que corrida em ${track.place || track.circuit}!!`, `What a race in ${track.place || track.circuit}!!`), byLang('Alguém explica essa estratégia?', 'Can someone explain that strategy?'), byLang(`${p2 ? p2.name : 'O segundo colocado'} merecia mais hoje`, `${p2 ? p2.name : 'The runner-up'} deserved more today`)];
  Social.post(G, { by: 'fan', kind: 'fan', text: fanLines[hashStr(track.id + m.races) % fanLines.length] });
  // rivalidades
  Media.rivalryTick(G, summary, race);
};

/* recordes e marcos — compara com a história real desde 1950 */
Media.LEGENDS = null;
Media.legends = () => {
  if (Media.LEGENDS) return Media.LEGENDS;
  const H = typeof REAL_HISTORY !== 'undefined' ? REAL_HISTORY.drivers : {};
  Media.LEGENDS = Object.entries(H).map(([id, r]) => ({ id, name: r[0], wins: r[4] || 0 })).filter(x => x.wins >= 20).sort((a, b) => b.wins - a.wins);
  return Media.LEGENDS;
};
Media.milestones = (G, d, track) => {
  const wins = d.career.wins;
  [10, 25, 50, 75, 100, 125, 150].forEach(n => { if (wins === n && Media.once(G, `wins${n}:${d.id}`)) Career.news(G, byLang(`${d.name} chega a ${n} vitórias na Fórmula 1`, `${d.name} reaches ${n} Formula 1 wins`), 'historia', byLang(`Marca alcançada no ${track.gp}.`, `Milestone reached at the ${track.gp}.`), { dr: [d.id] }); });
  const passed = Media.legends().filter(l => l.id !== d.id && l.wins === wins - 1 && !G.db.drivers.some(x => x.id === l.id && x.career.wins > l.wins));
  passed.slice(0, 1).forEach(l => {
    if (!Media.once(G, `pass:${d.id}:${l.id}`)) return;
    const all = Math.max(...Media.legends().map(x => x.wins), ...G.db.drivers.filter(x => x.id !== d.id).map(x => x.career.wins));
    const top = wins > all;
    Career.news(G, top ? byLang(`${d.name} se torna o maior vencedor da história da Fórmula 1`, `${d.name} becomes the most successful driver in Formula 1 history`) : byLang(`${d.name} supera ${l.name} em vitórias na F1`, `${d.name} passes ${l.name} for F1 wins`), 'historia', byLang(`Agora são ${wins} vitórias${top ? ' — novo recorde absoluto' : `, uma a mais que ${l.name} (${l.wins})`}.`, `Now on ${wins} wins${top ? ' — a new all-time record' : `, one more than ${l.name} (${l.wins})`}.`), { dr: [d.id] });
    if (top) Social.post(G, { by: Media.official(), kind: 'record', text: byLang(`HISTÓRIA. ${d.name} chega a ${wins} vitórias e se torna o maior vencedor de todos os tempos.`, `HISTORY. ${d.name} reaches ${wins} wins and becomes the most successful driver of all time.`), hype: 3 });
  });
};

/* ---------- rivalidades ---------- */
Media.rivalryTick = (G, summary, race) => {
  const m = Media.mem(G);
  const R = m.rivals;
  const bump = (a, b, v, why) => {
    if (!a || !b || a === b) return;
    const k = Media.pairKey(a, b);
    const r = R[k] || (R[k] = { a, b, score: 0, since: G.season.year, crashes: 0, log: [], stage: 0 });
    r.score = +(r.score + v).toFixed(2);
    if (why) { r.log.unshift({ y: G.season.year, r: G.season.round, t: why }); r.log.length = Math.min(r.log.length, 12); }
  };
  const track = Career.track(G, summary.trackId);
  (race && race.clashes || []).forEach(([a, b, culprit, kind]) => {
    bump(a, b, kind === 'crash' ? 3 : 1.4, `${track.gp}: ${kind === 'crash' ? 'batida' : 'toque'} entre os dois`);
    const k = R[Media.pairKey(a, b)]; if (kind === 'crash') k.crashes++;
    const vic = culprit === a ? b : a;
    const dv = Career.driver(G, vic), dc = Career.driver(G, culprit);
    if (dv && dc && kind === 'crash' && RNG.chance(0.6)) Social.post(G, { driver: vic, kind: 'clash', text: ['Sem comentários sobre o que aconteceu hoje.', 'Ele simplesmente não deixou espaço. Inaceitável.', 'Vamos conversar com os comissários.'][hashStr(vic + culprit + G.season.round) % 3], hype: 1.8 });
  });
  const c = summary.cls;
  if (c[0] && c[1] && c[0].tid !== c[1].tid) bump(c[0].did, c[1].did, 0.5, `${track.gp}: ${ordinal(1)} e ${ordinal(2)}`);
  // companheiros de equipe próximos
  G.db.teams.forEach(t => {
    const pair = c.filter(x => x.tid === t.id && x.status === 'fin');
    if (pair.length === 2 && Math.abs(pair[0].pos - pair[1].pos) === 1 && pair[0].pos <= 6) bump(pair[0].did, pair[1].did, 0.35);
  });
  // briga pelo título
  const st = Career.standingsD(G);
  const p = G.season.round / G.season.calendar.length;
  if (p > 0.5 && st[1] && st[0].pts - st[1].pts <= 30) bump(st[0].did, st[1].did, 0.8, `Briga pelo título de ${G.season.year}`);
  // estágios: nasce, esquenta, explode
  Object.values(R).forEach(r => {
    const A = Career.driver(G, r.a), B = Career.driver(G, r.b);
    if (!A || !B) return;
    const stage = r.score >= 14 ? 3 : r.score >= 8 ? 2 : r.score >= 4.5 ? 1 : 0;
    if (stage > r.stage) {
      r.stage = stage;
      const mates = A.team && A.team === B.team;
      const t = [null,
        `${mates ? 'Clima tenso na ' + Career.team(G, A.team).name + ':' : 'Nasce uma rivalidade:'} ${A.name} x ${B.name}`,
        `A rivalidade entre ${A.name} e ${B.name} esquenta`,
        `${A.name} x ${B.name}: a rivalidade que divide o paddock`][stage];
      Career.news(G, t, 'rivalidade', r.log.slice(0, 3).map(x => x.t).join(' · '), { dr: [r.a, r.b] });
      Social.post(G, { by: 'therace', kind: 'rivalry', text: `${A.name} x ${B.name}. ${['', 'Isso está só começando.', 'Ninguém cede um centímetro.', 'A maior rivalidade do grid hoje.'][stage]}`, hype: 1.5 + stage * 0.4 });
      if (mates && stage >= 2) { A.morale = clamp((A.morale ?? 70) - 6, 0, 100); B.morale = clamp((B.morale ?? 70) - 6, 0, 100); }
    }
  });
};
Media.isRival = (G, a, b) => { const r = G.memory && G.memory.rivals[Media.pairKey(a, b)]; return !!(r && r.score >= 4.5); };

/* ---------- escândalos raros (somente personagens e organizações fictícias) ---------- */
Media.FICT_ORGS = ['Meridian Sports Club', 'Grupo Valtria de Apostas', 'Halvorsen Dynamics', 'Ostrava Capital Partners', 'Northwind Consultoria'];
Media.scandalTick = (G) => {
  const rate = (G.options && G.options.eventRate) ?? 1;
  if (!RNG.chance(0.0055 * rate)) return;
  const m = Media.mem(G);
  if (m.lastScandal && G.season.year - m.lastScandal < 3) return;
  const kinds = ['apostas', 'vazamento', 'patrocinio'];
  const regens = G.db.drivers.filter(d => d.regen && d.team && !d.retired);
  if (regens.length) kinds.push('piloto');
  const kind = RNG.pick(kinds);
  const team = RNG.pick(G.db.teams);
  const org = RNG.pick(Media.FICT_ORGS);
  const person = randomName(RNG.pick(NATS));
  m.lastScandal = G.season.year;
  const isMine = !Career.isObs(G) && team.id === G.player.teamId;
  let title, body;
  if (kind === 'apostas') {
    title = `FIA investiga esquema de apostas: funcionário da ${team.name} é afastado`;
    body = `${person}, analista júnior da equipe (personagem fictício), teria repassado informações internas ao ${org}, organização de apostas clandestinas (fictícia). A ${team.name} afirma ter colaborado desde o início.`;
    team.reputation = clamp(team.reputation - 2, 30, 99);
    if (isMine) Career.ledger(G, 'Auditoria de conformidade (investigação de apostas)', -0.6, 'operação'); else team.cash = (team.cash || 0) - 0.6;
  } else if (kind === 'vazamento') {
    title = `Vazamento de projeto: ex-engenheiro da ${team.name} é acusado de levar dados`;
    body = `${person} (personagem fictício) teria levado arquivos de aerodinâmica para a ${org}, consultoria fictícia. A FIA abriu investigação; a equipe perde parte da vantagem do projeto.`;
    team.car.aero = +(team.car.aero - 0.35).toFixed(2);
  } else if (kind === 'patrocinio') {
    title = `${org} sob investigação: patrocínio de fachada abala o paddock`;
    body = `A empresa ${org} (fictícia), que negociava com várias equipes, é suspeita de fraude financeira. ${person}, seu diretor (personagem fictício), foi detido. A ${team.name} encerrou as conversas.`;
  } else {
    const d = RNG.pick(regens);
    title = `${d.name} é multado e suspenso por apostas`;
    body = `O piloto (personagem gerado pelo jogo) admitiu apostas por meio do ${org}. Multa, perda de popularidade e advertência da FIA.`;
    d.popularity = clamp((d.popularity || 30) - 15, 0, 100); d.morale = clamp((d.morale ?? 70) - 20, 0, 100);
  }
  Career.news(G, title, 'escandalo', body, { tm: [team.id] });
  Career.record(G, 'escandalo', `${title}. ${body}`, { teams: [team.id] });
  Social.post(G, { by: 'bbc', kind: 'scandal', text: `URGENTE: ${title}`, hype: 2.2 });
  if (isMine) Career.mail(G, { from: 'Departamento jurídico', tag: 'board', title: 'Investigação envolvendo a equipe', body: `${body} Sua confiança com a diretoria pode ser afetada se a situação se repetir.` });
};

/* ---------- fim de temporada ---------- */
Media.seasonEnd = (G, summary) => {
  const champ = Career.driver(G, summary.champion);
  const legends = Media.legends();
  const titles = champ.career.titles;
  const maxTitles = Math.max(7, ...G.db.drivers.filter(x => x.id !== champ.id).map(x => x.career.titles));
  Career.news(G, titles === 1 ? byLang(`${champ.name} é campeão mundial pela primeira vez`, `${champ.name} is world champion for the first time`) : byLang(`${champ.name} conquista o ${titles}º título mundial`, `${champ.name} wins a ${ordinal(titles)} world title`), 'campeonato', byLang(`${summary.constructorName} fica com o título de construtores de ${summary.year}.${titles > maxTitles ? ' Ninguém na história venceu tantos campeonatos.' : titles === maxTitles ? ' Igualou o recorde de títulos da categoria.' : ''}`, `${summary.constructorName} take the ${summary.year} constructors' title.${titles > maxTitles ? ' Nobody in history has won more championships.' : titles === maxTitles ? ' Equals the series record for titles.' : ''}`), { dr: [champ.id], tm: [summary.constructor], main: true });
  Social.post(G, { driver: champ.id, kind: 'title', text: titles === 1 ? byLang('CAMPEÃO DO MUNDO. Não consigo acreditar. Obrigado a todos.', 'WORLD CHAMPION. I cannot believe it. Thank you all.') : byLang(`Título número ${titles}. Cada um tem um sabor diferente. Obrigado, equipe!`, `Title number ${titles}. Every one tastes different. Thank you, team!`), hype: 4 });
  Social.post(G, { by: Media.official(), kind: 'title', text: byLang(`${champ.name.toUpperCase()}, CAMPEÃO MUNDIAL DE ${summary.year} 🏆`, `${champ.name.toUpperCase()}, ${summary.year} WORLD CHAMPION 🏆`), hype: 3 });
  // rivalidades esfriam entre temporadas
  const m = Media.mem(G);
  Object.entries(m.rivals).forEach(([k, r]) => { r.score = +(r.score * 0.55).toFixed(2); if (r.score < 1) delete m.rivals[k]; else r.stage = Math.min(r.stage, r.score >= 8 ? 2 : r.score >= 4.5 ? 1 : 0); });
  // memória: chaves de temporadas antigas que não são marcos permanentes
  Object.keys(m.keys).forEach(k => { if (!/^(wins|pass|first)/.test(k) && m.keys[k] < summary.year - 2) delete m.keys[k]; });
  void legends;
};
