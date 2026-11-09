'use strict';
/* =============================================================
   CARREIRA DE PILOTO (0.9-A) — fundação
   Você é um piloto de db.drivers (player: true), começando no kart regional que já existe
   (kart.js). O universo é o mesmo do modo Manager: a F1 roda sozinha pelas datas, as 23
   categorias andam pelo calendário (Cats.advanceTo), o mercado e a mídia seguem vivos.
   - G.mode === 'driver'; G.dcareer guarda o estado da carreira.
   - O kart do jogador tem ETAPAS datadas de verdade (8 por ano, em kartódromos reais da
     região); os outros campeonatos de kart seguem com a classificação anual resumida.
   - O teto de talento é sorteado e fica oculto ATÉ PARA O JOGADOR (rascunho do dono, 0.8.0):
     você descobre o próprio limite correndo.
   - Nenhum fluxo automático decide pelo jogador: Kart.renew não o aposenta, Kart.pick não o
     promove (as decisões de carreira são dele — fase 0.9-C).
   ============================================================= */
const DCareer = {};
DCareer.on = (G) => !!(G && G.mode === 'driver' && G.dcareer);
DCareer.me = (G) => (G.dcareer ? Career.driver(G, G.dcareer.did) : null);

/* origem da família: orçamento por ano (milhões), nunca talento */
DCareer.BG = {
  humilde: { y: 0.1, pt: 'Origem humilde', en: 'Humble roots', d: ['A família vende tudo para pagar o kart. Cada temporada é uma aposta.', 'The family sells everything to pay for karting. Every season is a gamble.'] },
  media: { y: 0.35, pt: 'Classe média', en: 'Middle class', d: ['Dá para correr o ano inteiro, mas subir de categoria vai exigir patrocínio.', 'You can race all year, but moving up will need sponsorship.'] },
  rica: { y: 1.6, pt: 'Família rica', en: 'Wealthy family', d: ['Orçamento abre portas. Talento continua sendo problema seu.', 'Budget opens doors. Talent is still on you.'] },
};
/* kartódromos reais por região: [nome, país] */
DCareer.VENUES = {
  br: [['Kartódromo Granja Viana', 'BRA'], ['Kartódromo Aldeia da Serra', 'BRA'], ['Kartódromo Beto Carrero', 'BRA'], ['Kartódromo de Interlagos', 'BRA'], ['Kartódromo Paladino', 'BRA'], ['Kartódromo de Nova Odessa', 'BRA'], ['Velopark', 'BRA'], ['Kartódromo de Itu', 'BRA'], ['Kartódromo de Brasília', 'BRA'], ['Kartódromo de Londrina', 'BRA']],
  eu: [['South Garda Karting (Lonato)', 'ITA'], ['Adria Karting Raceway', 'ITA'], ['Circuito Internazionale Napoli (Sarno)', 'ITA'], ['Karting Genk', 'BEL'], ['Kristianstad', 'SWE'], ['Zuera', 'ESP'], ['Kartódromo Internacional do Algarve', 'POR'], ['PF International', 'GBR'], ['Wackersdorf', 'GER'], ['Le Mans Karting International', 'FRA'], ['Mariembourg', 'BEL'], ['Campillos', 'ESP']],
  am: [['New Castle Motorsports Park', 'USA'], ['GoPro Motorplex', 'USA'], ['Orlando Kart Center', 'USA'], ['Dallas Karting Complex', 'USA'], ['AMR Motorplex (Homestead)', 'USA'], ['Streets of Lancaster', 'USA'], ['Mosport Karting Centre', 'CAN'], ['SuperNationals (Las Vegas)', 'USA']],
  ap: [['Suzuka Kart Course', 'JPN'], ['Kartódromo de Macau (Coloane)', 'CHN'], ['Sepang International Kart Circuit', 'JPN'], ['Meco Kartopia (Bengaluru)', 'IND'], ['Todd Road (Melbourne)', 'AUS'], ['Ipswich Kart Club', 'AUS'], ['Zhuhai International Kart Circuit', 'CHN'], ['Motegi Kart Course', 'JPN']],
};
DCareer.PTS = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
DCareer.champFor = (nat) => (Kart.CHAMPS.find(ch => ch.nats.includes(nat)) || Kart.CHAMPS[0]).id;

/* teto de talento do jogador (oculto até para ele). Não é a distribuição da população (1,5% de elite):
   é a de quem chegou ao kart competitivo com chance real, e ainda assim a maioria não vira astro da F1.
   ~12% fora de série · ~28% nível de F1 · ~35% profissional (rei de outras categorias, fundo da F1) · ~25% regional */
DCareer.rollTalent = (ovr) => {
  const r = RNG.next();
  const pot = r < 0.12 ? RNG.range(89, 96) : r < 0.40 ? RNG.range(82, 88.99) : r < 0.75 ? RNG.range(74, 81.99) : RNG.range(63, 73.99);
  return Math.round(clamp(Math.max(pot, ovr + 6), 50, 97));
};
DCareer.TIER = (pot) => (pot >= 89 ? 'elite' : pot >= 82 ? 'f1' : pot >= 74 ? 'pro' : 'regional');

/* ---------- criação ---------- */
DCareer.create = (G, opts) => {
  const champ = opts.kartChamp && Kart.CHAMPS.some(c => c.id === opts.kartChamp) ? opts.kartChamp : DCareer.champFor(opts.nat || 'BRA');
  const ch = Kart.CHAMPS.find(c => c.id === champ);
  const age = clamp(Math.round(opts.startAge || 14), 14, 17);
  const ref = Cats.get(G, ch.f4.find(id => Cats.get(G, id)) || 'f4it') || { id: 'kart', tier: 6, range: [50, 63] };
  // nota inicial modesta; o teto oculto (potential) é sorteado como o de qualquer piloto — cada carreira nasce diferente
  const ovr = Math.round(clamp(ref.range[0] - 16 + (age - 12) * 3 + RNG.normal(0, 3), 30, ref.range[0] - 1));
  const name = String(opts.name || '').trim() || 'Piloto';
  const d = Cats.makeDriver(G, { name, nat: opts.nat || 'BRA' }, ref, ovr, age);
  d.cat = null; d.ctm = null; d.series = 'kart'; d.seriesTeam = ch.name.replace('Kart · ', '');
  d.kart = { c: ch.id, since: G.season.year, res: [] };
  d.player = true;
  // estilo escolhido pelo jogador; atributos e teto sorteados pela semente DA CARREIRA (não pelo nome):
  // duas carreiras com o mesmo nome nascem diferentes
  const style = STYLE_PROFILES[opts.style] ? opts.style : 'complete'; const prof = STYLE_PROFILES[style];
  d.style = style;
  ['pace', 'qualifying', 'racecraft', 'consistency', 'tyre', 'wet', 'overtaking', 'defending'].concat(NEW_ATTRS).forEach(k => { d[k] = Math.round(clamp(ovr + (prof[k] || 0) + RNG.range(-3.5, 3.5), 30, 72)); });
  d.aggression = Math.round(clamp(50 + (prof.aggression || 0) * 2.5 + RNG.range(-8, 8), 10, 95));
  d.potential = DCareer.rollTalent(driverOverall(d));
  d.number = clamp(Math.round(+opts.number) || 11, 2, 99);
  d.popularity = 3;
  G.db.drivers.push(d);
  const bg = DCareer.BG[opts.bg] ? opts.bg : 'media';
  G.dcareer = {
    did: d.id, stage: 'kart', champ, bg,
    money: +(DCareer.BG[bg].y * 1.5).toFixed(2),   // poupança inicial = 1,5 ano de apoio
    rep: 8, form: 75, hist: [], season: null, ready: null,
  };
  G.player.driverId = d.id;
  DCareer.newKartSeason(G);
  Career.mail(G, {
    from: byLang('Seu treinador', 'Your coach'), tag: 'team', important: true,
    title: byLang(`Bem-vindo ao ${ch.name}`, `Welcome to ${ch.name}`),
    body: byLang(`${name}, ${age} anos. ${DCareer.BG[bg].d[0]} A temporada tem ${G.dcareer.season.cal.length} etapas; a primeira é em ${G.dcareer.season.cal[0].venue}. Ninguém sabe até onde você vai — nem você. Descobrimos na pista.`,
      `${name}, ${age} years old. ${DCareer.BG[bg].d[1]} The season has ${G.dcareer.season.cal.length} rounds; the first is at ${G.dcareer.season.cal[0].venue}. Nobody knows how far you can go — not even you. We find out on track.`),
  });
  return d;
};

/* ---------- temporada de kart do jogador (etapas datadas) ---------- */
DCareer.newKartSeason = (G) => {
  const dc = G.dcareer; const y = G.season.year;
  const pool = DCareer.VENUES[dc.champ] || DCareer.VENUES.eu;
  const n = 8; const off = (y + hashStr(dc.champ)) % pool.length;
  const cal = [];
  for (let i = 0; i < n; i++) {
    const v = pool[(off + i) % pool.length];
    // de meados de março a meados de outubro, uma etapa a cada ~4 semanas e meia, sempre num domingo
    let iso = Time.addDays(`${y}-03-14`, Math.round(i * 31));
    const w = new Date(iso + 'T12:00:00Z').getUTCDay(); iso = Time.addDays(iso, (7 - w) % 7);
    cal.push({ r: i + 1, date: iso, venue: v[0], nat: v[1] });
  }
  // custo da temporada sai da poupança; o apoio anual da família entra
  const fee = 0.06;
  dc.money = +(dc.money + DCareer.BG[dc.bg].y - fee).toFixed(2);
  dc.season = { year: y, champ: dc.champ, r: 0, cal, pts: {}, st: {}, res: [] };
};
DCareer.nextRound = (G) => { const s = G.dcareer.season; return s && s.r < s.cal.length ? s.cal[s.r] : null; };
DCareer.standings = (G) => {
  const s = G.dcareer.season; if (!s) return [];
  return Object.entries(s.pts).map(([did, pts]) => ({ did, pts, ...(s.st[did] || {}) }))
    .sort((a, b) => b.pts - a.pts || (b.w || 0) - (a.w || 0) || (b.pod || 0) - (a.pod || 0));
};

/* corre a etapa do kart (resumo na fase A; cockpit completo na 0.9-B) */
DCareer.runRound = (G) => {
  const dc = G.dcareer; const s = dc.season; const ev = DCareer.nextRound(G);
  if (!ev) return null;
  const me = DCareer.me(G);
  const field = Kart.drivers(G, dc.champ).filter(d => !(d.injured > 0));
  const wet = RNG.chance(0.14) ? RNG.range(0.3, 0.9) : 0;
  // kart: máquinas iguais; forma do dia pesa (sd alto), um toque de sorte de material por etapa
  const roll = (d) => Cats.skill(d, wet) + RNG.normal(0, 3.2) + RNG.range(-1, 1) + (d.player ? (dc.form - 75) * 0.04 : 0);
  const qs = field.map(d => ({ d, q: roll(d) })).sort((a, b) => b.q - a.q);
  const qPos = qs.findIndex(x => x.d.player) + 1;
  const res = qs.map((x, gi) => ({ d: x.d, dnf: RNG.chance(0.06 * (1 + wet * 0.5)), f: roll(x.d) - gi * 0.3 }));
  res.sort((a, b) => (a.dnf - b.dnf) || b.f - a.f);
  const st = (did) => (s.st[did] = s.st[did] || { st: 0, w: 0, pod: 0, pole: 0, dnf: 0 });
  if (qs[0]) st(qs[0].d.id).pole++;
  res.forEach((r, i) => {
    const k = st(r.d.id); k.st++;
    if (r.dnf) { k.dnf++; return; }
    if (i === 0) k.w++;
    if (i < 3) k.pod++;
    s.pts[r.d.id] = (s.pts[r.d.id] || 0) + (DCareer.PTS[i] || 0);
  });
  const my = res.findIndex(r => r.d.player) + 1;
  const myDnf = res[my - 1] && res[my - 1].dnf;
  s.res.push({ r: ev.r, date: ev.date, venue: ev.venue, nat: ev.nat, wet: +wet.toFixed(2), pole: qs[0] ? qs[0].d.id : null, q: qPos, fin: myDnf ? null : my, dnf: !!myDnf, top: res.filter(r => !r.dnf).slice(0, 5).map(r => r.d.id) });
  s.r++;
  // crescimento: o quanto você evolui depende do teto oculto e do que fez na pista
  DCareer.grow(G, me, { pos: myDnf ? field.length : my, field: field.length, q: qPos, wet });
  me.morale = clamp((me.morale ?? 70) + (myDnf ? -4 : my === 1 ? 4 : my <= 3 ? 2 : my > field.length * 0.6 ? -2 : 0), 20, 100);
  dc.form = clamp(dc.form + RNG.range(-3, 3) + (my <= 3 ? 1.5 : 0), 40, 100);
  dc.rep = clamp(dc.rep + (my === 1 ? 1.2 : my <= 3 ? 0.6 : myDnf ? -0.3 : 0), 0, 100);
  const lead = DCareer.standings(G)[0];
  Career.mail(G, {
    from: byLang('Seu treinador', 'Your coach'), tag: 'team',
    title: myDnf ? byLang(`Etapa ${ev.r}: abandono em ${ev.venue}`, `Round ${ev.r}: retired at ${ev.venue}`)
      : byLang(`Etapa ${ev.r}: P${my} em ${ev.venue}`, `Round ${ev.r}: P${my} at ${ev.venue}`),
    body: byLang(
      `Tomada: P${qPos}. ${myDnf ? 'A corrida acabou cedo — acontece no kart; aprende e segue.' : my === 1 ? 'Vitória! Hoje ninguém chegou perto.' : my <= 3 ? 'Pódio sólido. Continue assim.' : my <= 8 ? 'No bolo. Dá para extrair mais nas disputas.' : 'Dia difícil. Vamos rever os dados juntos.'}${wet > 0.3 ? ' Pista molhada — dia de aprender de verdade.' : ''} ${lead ? `Líder do campeonato: ${(Career.driver(G, lead.did) || {}).name} com ${lead.pts} pontos.` : ''}`,
      `Qualifying: P${qPos}. ${myDnf ? 'The race ended early — karting does that; learn and move on.' : my === 1 ? 'Victory! Nobody came close today.' : my <= 3 ? 'Solid podium. Keep it up.' : my <= 8 ? 'In the pack. There is more to extract in the fights.' : 'Tough day. We will go through the data together.'}${wet > 0.3 ? ' Wet track — a real learning day.' : ''} ${lead ? `Championship leader: ${(Career.driver(G, lead.did) || {}).name} on ${lead.pts} points.` : ''}`),
  });
  if (s.r >= s.cal.length) DCareer.finishKartYear(G);
  return { q: qPos, fin: myDnf ? null : my, dnf: !!myDnf, wet };
};

/* crescimento do jovem: puxado pelo teto oculto e pelo que a pista ensinou */
DCareer.grow = (G, d, ctx) => {
  const head = Math.max(0, (d.potential || 60) - driverOverall(d));
  const beat = (ctx.field / 2 - ctx.pos) / Math.max(4, ctx.field / 2);   // acima ou abaixo do meio do pelotão
  // complemento da evolução anual que todo piloto jovem já recebe na virada do ano (Talent): pequeno de propósito
  const p = clamp(head / 60 + 0.05 + beat * 0.08, 0.03, 0.45);
  const pool = ['pace', 'racecraft', 'consistency', 'qualifying', 'overtaking', 'defending'];
  if (d.start != null) pool.push('start');
  if (ctx.wet > 0.3) pool.push('wet', 'wet');
  let grew = 0;
  for (let i = 0; i < 1; i++) if (RNG.chance(p)) { const k = RNG.pick(pool); d[k] = clamp((d[k] ?? 50) + 1, 30, Math.min(99, (d.potential || 70) + 2)); grew++; }
  return grew;
};

DCareer.finishKartYear = (G) => {
  const dc = G.dcareer; const s = dc.season; const me = DCareer.me(G);
  const tab = DCareer.standings(G);
  const my = tab.findIndex(x => x.did === dc.did) + 1;
  const myRow = tab[my - 1] || { pts: 0, w: 0, pod: 0 };
  dc.hist.push({ year: s.year, champ: dc.champ, pos: my, of: tab.length, pts: myRow.pts, w: myRow.w || 0, pod: myRow.pod || 0 });
  // o resultado real entra no piloto (kart.res), como o dos pilotos da IA — olheiros e F4 enxergam
  tab.forEach((x, i) => { const d = Career.driver(G, x.did); if (d && d.kart) { d.kart.res = (d.kart.res || []).concat([[s.year, i + 1, tab.length]]).slice(-5); d.kart.perf = clamp((tab.length / 2 - (i + 1)) / Math.max(4, tab.length / 2), -1, 1); } });
  const ch = Kart.CHAMPS.find(c => c.id === dc.champ);
  if (my === 1) {
    Career.news(G, byLang(`${me.name} (${me.age} anos) é campeão do ${ch.name} ${s.year}`, `${me.name} (${me.age}) is the ${s.year} ${ch.name} champion`), 'categorias', '', { dr: [me.id] });
    dc.rep = clamp(dc.rep + 6, 0, 100);
  }
  Career.mail(G, {
    from: byLang('Seu treinador', 'Your coach'), tag: 'team', important: true,
    title: byLang(`Fim do ano no kart: P${my} de ${tab.length}`, `Karting year over: P${my} of ${tab.length}`),
    body: byLang(`${myRow.pts} pontos, ${myRow.w || 0} vitória(s), ${myRow.pod || 0} pódio(s). ${my === 1 ? 'Campeão! Vão falar do seu nome no paddock da F4.' : my <= 3 ? 'Ano forte. Olheiros anotam esse tipo de coisa.' : my <= 8 ? 'Ano de aprendizado. O que importa é a curva, não o ponto.' : 'Ano duro. Pense no que mudar — equipamento, cabeça, treino.'}`,
      `${myRow.pts} points, ${myRow.w || 0} win(s), ${myRow.pod || 0} podium(s). ${my === 1 ? 'Champion! They will say your name in the F4 paddock.' : my <= 3 ? 'Strong year. Scouts write this kind of thing down.' : my <= 8 ? 'A learning year. The curve matters, not the point.' : 'A hard year. Think about what to change — equipment, head, training.'}`),
  });
};

/* ---------- avanço por data (o mundo anda junto) ---------- */
DCareer.runF1Round = (G) => {
  Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G);
  Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G);
};
/* anda os dias até o próximo compromisso do piloto; a F1 e as categorias correm sozinhas no caminho.
   Devolve o que parou o avanço: {type:'round'} (etapa do kart amanhã) ou {type:'newyear'} */
DCareer.advance = (G) => {
  const dc = G.dcareer;
  Time.init(G);
  for (let i = 0; i < 420; i++) {
    const next = DCareer.nextRound(G);
    if (next && G.today >= next.date) { dc.ready = next.date; return { type: 'round', ev: next }; }
    // a F1 corre sozinha quando o fim de semana dela chega
    if (!Career.seasonOver(G) && !G.weekend && G.today >= Time.weekendDay(G)) { DCareer.runF1Round(G); continue; }
    // virada do ano: depois da última corrida de F1 e do fim do kart, em meados de dezembro
    if (!next && Career.seasonOver(G) && G.today >= `${G.season.year}-12-15`) {
      Career.endSeason(G);
      if (dc.stage === 'kart') DCareer.newKartSeason(G);
      return { type: 'newyear', year: G.season.year };
    }
    Time.day(G);
  }
  return { type: 'stuck' };
};
DCareer.ageOut = (G) => { const me = DCareer.me(G); return me && me.age >= 18 && G.dcareer.stage === 'kart'; };

/* ---------- integração com o núcleo ---------- */
(function () {
  // criar carreira no modo piloto
  Hooks.around('Career', Career, 'create', 'dcareer', (create, baseDb, opts) => {
    const G = create(baseDb, opts);
    if (opts && opts.mode === 'driver') DCareer.create(G, opts);
    return G;
  });
  // a virada do ano não aposenta nem promove o jogador por conta própria (kart.js tem as guardas d.player);
  // a classificação anual do campeonato DELE usa os pontos reais das etapas (kart.js consulta DCareer)
})();
