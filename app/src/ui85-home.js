/* ============================================================
   PIT WALL 0.8.5 — Início: Central (modelo A + faixa de notícias rotativa)
   e Calendário (mês a mês como principal; por etapa com detalhes ao clicar)
   ============================================================ */
'use strict';

const NEWS_TAGS85 = { regulamento: 'Regulamento', paddock: 'Paddock', corrida: 'Corrida', rumor: 'Rumor', mercado: 'Mercado', categorias: 'Categorias', escandalo: 'Escândalo', 'técnica': 'Técnica', tecnica: 'Técnica', campeonato: 'Campeonato' };
const OUTLET85 = { racefans: 'RaceFans', therace: 'The Race', sky: 'Sky Sports F1', speedcafe: 'Speedcafe', motorsport: 'Motorsport.com', bild: 'Bild', planetf1: 'PlanetF1', telegraaf: 'De Telegraaf', f1: 'Formula1.com', bbc: 'BBC Sport', gazzetta: 'Gazzetta', autosport: 'Autosport', fia: 'FIA', ams: 'Auto Motor und Sport', crash: 'Crash.net', marca: 'Marca', as: 'AS', ole: 'Olé' };
ACT.choose85 = (el) => { const m = Events.resolve(G, el.dataset.id, +el.dataset.i); if (m) { toast(m.outcome || byLang('Decisão registrada.', 'Decision recorded.')); autosave(); } render(); };

/* ---------------- Central ---------------- */
function hub85() {
  const team = Career.team(G); const tr = Career.currentTrack(G); const ri = G.season.round;
  Time.init(G);
  const days = Time.diff(G.today, Time.weekendDay(G));
  const hero = trackHero85(tr);
  const raceIso = Time.raceDate(G, ri);
  const sched = [[byLang('Sex', 'Fri'), byLang('Treinos livres 1 e 2', 'Practice 1 and 2')], [byLang('Sáb', 'Sat'), tr.sprint ? byLang('Sprint · Classificação', 'Sprint · Qualifying') : byLang('TL3 · Classificação', 'FP3 · Qualifying')], [byLang('Dom', 'Sun'), byLang(`Corrida · ${tr.laps} voltas`, `Race · ${tr.laps} laps`)]];
  const atWk = G.weekend || days <= 0;
  const heroHtml = `<section class="h-hero" style="${hero ? `--img:url('${hero}')` : ''}">
    <div class="h-l"><span class="n-eyebrow">${byLang('Etapa', 'Round')} ${ri + 1} ${byLang('de', 'of')} ${G.season.calendar.length} · ${atWk ? byLang('fim de semana de corrida', 'race weekend') : byLang(`em ${days} dia${days > 1 ? 's' : ''}`, `in ${days} day${days > 1 ? 's' : ''}`)}</span>
      <h2>${esc(tr.gp)}</h2>
      <p>${natTag(tr.country)} ${esc(tr.circuit)} · ${esc(Time.fmt(raceIso))}${tr.sprint ? ` · ${K85.tag('Sprint', 'y')}` : ''}${tr.street ? ` · ${K85.tag(byLang('Rua', 'Street'))}` : ''}</p>
      <div class="h-sch">${sched.map(([d, s]) => `<span><b>${d}</b>${s}</span>`).join('')}</div>
      ${(() => { const w = tr.weights || { aero: 0.33, chassis: 0.33, engine: 0.34 }; const fit = (t) => (w.aero || 0) * t.car.aero + (w.chassis || 0) * t.car.chassis + (w.engine || 0) * ((Engine.engineOf(G.db, t).power || 80) + (t.car.engineBonus || 0)); const order = G.db.teams.slice().sort((a, b) => fit(b) - fit(a)); const rk = order.findIndex(t => t.id === team.id) + 1; const ch = typeof circuitHistory === 'function' ? circuitHistory(tr.id) : null; const nm = (id) => typeof hName === 'function' ? hName(id) : id;
        return `<div class="h-ins"><span><small>${byLang('Seu carro nesta pista', 'Your car at this track')}</small><b>${ordinal(rk)} ${byLang('do grid', 'on the grid')}</b>${K85.bar(G.db.teams.length - rk + 1, G.db.teams.length, rk <= 3 ? 'var(--green)' : rk <= 6 ? 'var(--yellow)' : 'var(--red)')}</span>${ch ? `<span><small>${byLang('Último vencedor aqui', 'Last winner here')}</small><b>${esc(nm(ch.last.w))}</b><em>${ch.last.y}</em></span><span><small>${byLang('Maior vencedor', 'Most wins')}</small><b>${esc(nm(ch.top.id))}</b><em>${ch.top.wins} ${byLang('vitórias', 'wins')}</em></span>` : `<span><small>${byLang('Primeira vez', 'First time')}</small><b>${byLang('Circuito inédito', 'New circuit')}</b></span>`}</div>`; })()}
      <div class="h-act">${atWk ? K85.btn(byLang('Ir para o fim de semana', 'Go to race weekend'), { act: 'toWeekend', kind: 'primary' }) : K85.btn(byLang('Preparar estratégia', 'Plan strategy'), { act: 'circuitPage', id: tr.id, kind: 'primary' })}${K85.btn(byLang('Ficha do circuito', 'Circuit page'), { act: 'circuitPage', id: tr.id })}${K85.btn(byLang('Calendário', 'Calendar'), { act: 'go', v: 'calendar' })}</div></div>
    <div class="h-r">${K85.track(tr, { w: 320, h: 196, cls: 'h-trk' })}
      <div class="h-f">${[[byLang('Voltas', 'Laps'), tr.laps], [byLang('Extensão', 'Length'), tr.length.toFixed(3) + ' km'], [byLang('Curvas', 'Turns'), tr.turns || '—'], [byLang('Chuva', 'Rain'), Math.round((tr.rain || 0) * 100) + '%']].map(([a, b]) => `<span><small>${a}</small><b>${b}</b></span>`).join('')}</div>
      <div class="h-meters">${[[byLang('Ultrapassagem', 'Overtaking'), (tr.overtaking || 0.5) * 100], [byLang('Desgaste de pneus', 'Tyre stress'), Math.min(100, (tr.tyreStress || 1) * 60)], [byLang('Carga aerodinâmica', 'Downforce'), Math.min(100, ((tr.weights || {}).aero || 0.33) * 220)]].map(([l, v]) => `<div><span>${l}</span>${K85.bar(v, 100)}</div>`).join('')}</div></div></section>`;
  // pendências
  const bl = Time.blockers(G);
  const dec = bl.slice(0, 4).map(m => `<div class="h-dec ${Time.prio(m)}"><span class="h-dt">${K85.tag(Time.prio(m) === 'decision' ? byLang('Decidir', 'Decide') : byLang('Importante', 'Important'), Time.prio(m) === 'decision' ? 'r' : 'y')}<b>${esc(m.title)}</b><small>${esc(m.from || '')}</small></span><span class="h-da">${m.choices && m.resolved == null ? m.choices.slice(0, 2).map((c, i) => `<button class="btn sm ${i ? '' : 'primary'}" data-act="choose85" data-id="${m.id}" data-i="${i}" title="${esc(c.label)}">${esc(String(c.label).replace(/\s*\([^)]*\)\s*$/, ''))}</button>`).join('') + (m.choices.length > 2 ? `<button class="btn sm ghost" data-act="openMail" data-id="${m.id}">+${m.choices.length - 2}</button>` : '') : `<button class="btn sm" data-act="openMail" data-id="${m.id}">${byLang('Ler', 'Read')}</button>`}</span></div>`).join('');
  // pilotos
  const lu = Career.lineup(G, team.id);
  const sd = Career.standingsD(G);
  const dcard = (d) => { const i = sd.findIndex(x => x.did === d.id); const s = sd[i] || { pts: 0 }; const f = K85.face(d);
    return `<button class="h-dc" data-act="driverPage" data-id="${d.id}">${f ? `<img src="${f}" alt="">` : ''}<span class="h-dn"><span class="n-num">${d.number ?? ''}</span><b>${esc(d.firstName || '')}<em>${esc(d.lastName || shortName(d))}</em></b></span>
      <span class="h-ds"><span><small>${byLang('Campeonato', 'Championship')}</small><b>${i >= 0 ? ordinal(i + 1) : '—'}</b></span><span><small>${byLang('Pontos', 'Points')}</small><b>${s.pts}</b></span><span><small>${byLang('Nota', 'Rating')}</small>${K85.rate(driverOverall(d))}</span><span><small>${byLang('Moral', 'Morale')}</small>${K85.ring(d.morale || 60, 30)}</span></span>
      <span class="h-dform">${K85.form(K85.recent(d.id, 6)) || ''}</span></button>`; };
  // torre do campeonato
  const tower = (rows, mine, nameF) => rows.map(r => `<div class="tw ${mine(r) ? 'me' : ''}"><span class="tw-p">${r.pos}</span><i style="background:${r.c}"></i><b>${esc(r.ab)}</b><span class="tw-n">${esc(nameF(r))}</span><span class="n-num">${r.pts}</span></div>`).join('');
  const dRows = sd.map((x, i) => { const d = Career.driver(G, x.did); return { pos: i + 1, c: d && d.team ? teamColor(d.team) : '#888', ab: dCode(d), nm: d ? shortName(d) : x.did, pts: x.pts, tid: d && d.team }; });
  const dTop = dRows.slice(0, 10).concat(dRows.slice(10).filter(r => r.tid === team.id));
  const cRows = Career.standingsC(G).map((x, i) => { const t = Career.team(G, x.tid); return { pos: i + 1, c: t.color, ab: t.short || teamAbbr(t.name), nm: t.name, pts: x.pts, tid: t.id }; });
  const myC = cRows.find(r => r.tid === team.id);
  const cTop = cRows.slice(0, 6).concat(myC && myC.pos > 6 ? [myC] : []);
  // diretoria, caixa e fábrica
  const b = G.board; const cash = K85.cashSeries();
  const capRoom = typeof Career.capRoom === 'function' ? Career.capRoom(G) : null;
  const projects = (G.projects || []).filter(p => !p.buildOnly).slice(0, 4);
  const up = Time.upcoming(G).slice(0, 6);
  const news = (G.news || []).slice(0, 5);
  return ticker85() + heroHtml + `<div class="h-g">
    <div class="n-col">
      ${K85.card({ t: byLang('Pendências', 'Pending'), a: bl.length ? `${bl.length} ${byLang('bloqueiam o avanço', 'block progress')} · <a data-act="go" data-v="inbox">${byLang('caixa de entrada', 'inbox')}</a>` : '', body: dec || K85.empty(byLang('Nada pendente. Pode avançar.', 'Nothing pending. You can continue.')) })}
      <div class="h-dcs">${lu.map(dcard).join('')}</div>
      ${K85.grid('1fr 1fr', K85.card({ t: byLang('Próximos dias', 'Coming up'), a: `<a data-act="go" data-v="calendar">${byLang('calendário', 'calendar')}</a>`, body: up.length ? `<div class="h-up">${up.map(x => `<div><span class="n-num">${esc(Time.fmt(x.date))}</span>${K85.tag({ weekend: 'GP', design: byLang('Projeto', 'Design'), part: byLang('Peça', 'Part') }[x.kind] || '•', x.kind === 'weekend' ? 'r' : x.kind === 'part' ? 'g' : 'b')}<span>${esc(x.label)}</span></div>`).join('')}</div>` : K85.empty(byLang('Nada marcado.', 'Nothing scheduled.')) }),
        K85.card({ t: byLang('Últimas notícias', 'Latest news'), a: `<a data-act="go" data-v="news">${byLang('todas', 'all')}</a>`, flush: true, body: K85.list(news.map(n => ({ title: esc(n.title), sub: `${esc(OUTLET85[n.outlet] || n.outlet || 'Paddock')} · ${esc(NEWS_TAGS85[n.tag] || n.tag || '')}`, do: { act: 'go', v: 'news' } }))) }))}
    </div>
    <div class="n-col">
      ${K85.card({ t: byLang('Pilotos', 'Drivers'), a: `<a data-act="go" data-v="standings">${byLang('classificação', 'standings')}</a>`, body: `<div class="tower">${tower(dTop, r => r.tid === team.id, r => r.nm)}</div>` })}
      ${K85.card({ t: byLang('Construtores', 'Constructors'), body: `<div class="tower">${tower(cTop, r => r.tid === team.id, r => r.nm)}</div>` })}
    </div>
    <div class="n-col">
      ${K85.card({ t: byLang('Diretoria', 'Board'), a: `<a data-act="go" data-v="board">${byLang('detalhes', 'details')}</a>`, body: `<div class="h-board">${K85.ring(b.confidence, 74)}<div><b>${byLang('Meta', 'Target')}: ${ordinal(b.target)}</b><span>${byLang('hoje', 'now')} ${ordinal(myC ? myC.pos : 0)} · ${b.lastDelta >= 0 ? '+' : ''}${(b.lastDelta || 0).toFixed(1)} ${byLang('na última corrida', 'last race')}</span><span>${esc((team.owner && team.owner.name) || '')}</span></div></div>` })}
      ${K85.card({ t: byLang('Caixa', 'Cash'), a: `<a data-act="go" data-v="finance">${byLang('finanças', 'finance')}</a>`, body: `<div class="h-cash"><b class="n-num ${G.finances.balance < 0 ? 'n-loss' : ''}">${fmtMoney(G.finances.balance)}</b>${capRoom != null ? `<span>${byLang('teto: sobram', 'cap room')} ${fmtMoney(capRoom)}</span>` : ''}</div>${K85.spark(cash, { w: 268, h: 52 })}` })}
      ${K85.card({ t: byLang('Fábrica e P&D', 'Factory and R&D'), a: `<a data-act="go" data-v="dev">${byLang('abrir', 'open')}</a>`, body: projects.length ? projects.map(p => { const tot = (p.designDays || 20) + (p.buildDays || 6); const left = (p.stage === 'design' ? (p.dLeft || 0) + (p.buildDays || 0) : (p.bLeft || 0)); return `<div class="h-pj"><b>${esc(p.name || Career.AREAS[p.area].name)}</b><span class="n-mu n-sm">${p.stage === 'design' ? byLang('desenho', 'design') : byLang('fabricação', 'build')} · ${byLang('faltam', 'left')} ${left} ${byLang('dias', 'days')}</span>${K85.bar(100 - left / tot * 100, 100, 'var(--green)')}</div>`; }).join('') : K85.empty(byLang('Nenhum projeto em andamento.', 'No project running.'), K85.btn(byLang('Novo projeto', 'New project'), { act: 'go', v: 'dev', sm: true })) })}
      ${K85.card({ t: byLang('Patrocinadores', 'Sponsors'), a: `<a data-act="go" data-v="sponsors">${byLang('abrir', 'open')}</a>`, body: (G.sponsors || []).slice(0, 4).map(s => `<div class="h-sp"><span>${esc(s.name)}</span>${K85.bar(s.satisfaction || 0, 100, (s.satisfaction || 0) < 40 ? 'var(--red)' : (s.satisfaction || 0) < 65 ? 'var(--yellow)' : 'var(--green)')}<b class="n-num">${Math.round(s.satisfaction || 0)}%</b></div>`).join('') || K85.empty(byLang('Sem patrocinadores.', 'No sponsors.')) })}
    </div></div>`;
}
(function () {
  const old = SCREENS.hub;
  SCREENS.hub = {
    html() {
      if (!G || Career.isObs(G) || Career.seasonOver(G) || !G.season.calendar.length) {
        if (G && Career.seasonOver(G) && SCREENS.seasonEnd && !Career.isObs(G)) return SCREENS.seasonEnd.html();
        return (G && Career.isObs(G) ? ticker85() : '') + old.html.call(this);
      }
      return hub85();
    },
    after() {
      if (G && Career.seasonOver(G) && SCREENS.seasonEnd && !Career.isObs(G)) { if (SCREENS.seasonEnd.after) SCREENS.seasonEnd.after(); return; }
      if (G && (Career.isObs(G) || Career.seasonOver(G)) && old.after) old.after();
    },
  };
})();

/* ---------------- Calendário ---------------- */
const CAL_KIND85 = { f1: ['Fórmula 1', 'Formula 1'], tl: ['Treinos', 'Practice'], q: ['Classificação', 'Qualifying'], sprint: ['Sprint', 'Sprint'], council: ['Conselho da FIA', 'F1 Commission'], rnd: ['Fábrica e P&D', 'Factory and R&D'], market: ['Mercado', 'Market'], f2: ['F2, F3 e F1 Academy', 'F2, F3 and F1 Academy'], fe: ['Fórmula E', 'Formula E'], usa: ['IndyCar e EUA', 'IndyCar and US'], end: ['Endurance', 'Endurance'], other: ['Outras categorias', 'Other series'] };
function calEvents85() {
  const ev = [];
  const add = (date, k, t, o = {}) => { if (date) ev.push(Object.assign({ date, k, t }, o)); };
  G.season.calendar.forEach((id, i) => {
    const tr = Career.track(G, id); if (!tr) return;
    const race = Time.raceDate(G, i); const done = i < G.season.round;
    const r = G.season.results[i];
    add(race, 'f1', tr.gp, { round: i, id: tr.id, done, win: r ? r.winner : null });
    add(Time.addDays(race, -1), tr.sprint ? 'sprint' : 'q', tr.sprint ? byLang('Sprint e classificação', 'Sprint and qualifying') : byLang('Classificação', 'Qualifying'), { round: i, id: tr.id, done });
    add(Time.addDays(race, -2), 'tl', byLang('Treinos livres', 'Practice'), { round: i, id: tr.id, done });
  });
  if (typeof Council !== 'undefined' && Council.meetRounds) Council.meetRounds(G).forEach(r => { const d = Time.raceDate(G, Math.min(r, G.season.calendar.length - 1)); add(Time.addDays(d, 3), 'council', byLang('Reunião do Conselho da FIA', 'F1 Commission meeting')); });
  try { RnD.milestones(G).forEach(m => add(m.date, 'rnd', m.label)); } catch (e) { /* sem P&D */ }
  const half = Math.floor(G.season.calendar.length * 0.55);
  add(Time.addDays(Time.raceDate(G, Math.max(0, half - 1)), 2), 'market', byLang('Abre o mercado de pilotos (férias de verão)', 'Driver market opens (summer break)'));
  const KMAP = { f2: 'f2', f3: 'f2', f1a: 'f2', fe: 'fe', indycar: 'usa', nxt: 'usa', nascup: 'usa', imsa: 'end', wec: 'end', elms: 'end' };
  (G.cats && G.cats.order || []).forEach(cid => { const c = G.cats.byId[cid]; if (!c || c.enabled === false || !c.season || !c.season.cal) return; c.season.cal.forEach(x => add(x.date, KMAP[cid] || 'other', `${c.short || c.name} · ${x.place || x.circuit || ''}`, { cat: cid })); });
  return ev;
}
ACT.calF85 = (el) => { UI.calOff = UI.calOff || {}; UI.calOff[el.dataset.k] = !UI.calOff[el.dataset.k]; render(); };
function MONTHS_FULL85() { return byLang('Janeiro Fevereiro Março Abril Maio Junho Julho Agosto Setembro Outubro Novembro Dezembro', 'January February March April May June July August September October November December').split(' '); }
function calMonth85(ev, ym) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)); const days = new Date(Date.UTC(y, m, 0)).getUTCDate(); const off = (first.getUTCDay() + 6) % 7;
  const by = {}; ev.filter(e => e.date.startsWith(ym) && !(UI.calOff || {})[e.k]).forEach(e => (by[+e.date.slice(8)] = by[+e.date.slice(8)] || []).push(e));
  const order = ['f1', 'sprint', 'q', 'tl', 'council', 'rnd', 'market', 'f2', 'fe', 'usa', 'end', 'other'];
  const cells = []; for (let i = 0; i < off; i++) cells.push('<div class="cd off"></div>');
  for (let d = 1; d <= days; d++) {
    const iso = `${ym}-${String(d).padStart(2, '0')}`; const list = (by[d] || []).sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
    cells.push(`<div class="cd ${iso === G.today ? 'today' : ''} ${G.today && iso < G.today ? 'past' : ''}"><span class="cd-n">${d}</span>${list.slice(0, 4).map(e => `<span class="ev ev-${e.k}${e.done ? ' done' : ''}" ${e.id ? `data-act="go" data-v="calendar" data-p='${esc(JSON.stringify({ tab: 'etapas', sel: e.round }))}'` : ''} title="${esc(e.t)}">${e.k === 'f1' && e.win ? `<b>${esc(dCode(Career.driver(G, e.win)))}</b> ` : ''}${esc(e.t)}</span>`).join('')}${list.length > 4 ? `<span class="ev more">+${list.length - 4}</span>` : ''}</div>`);
  }
  return `<div class="calg"><div class="cwd">${(byLang('seg ter qua qui sex sáb dom', 'Mon Tue Wed Thu Fri Sat Sun')).split(' ').map(x => `<span>${x}</span>`).join('')}</div><div class="cdays">${cells.join('')}</div></div>`;
}
function calRound85(sel) {
  const cal = G.season.calendar; const months = {};
  cal.forEach((id, i) => { const iso = Time.raceDate(G, i); (months[iso.slice(0, 7)] = months[iso.slice(0, 7)] || []).push(i); });
  const card = (i) => { const tr = Career.track(G, cal[i]); const r = G.season.results[i]; const w = r && Career.driver(G, r.winner);
    return `<button class="sgp ${i < G.season.round ? 'done' : ''} ${i === G.season.round ? 'next' : ''} ${i === sel ? 'on' : ''}" data-act="go" data-v="calendar" data-p='${esc(JSON.stringify({ tab: 'etapas', sel: i }))}'><span class="sg-r">${String(i + 1).padStart(2, '0')}</span>${K85.track(tr, { w: 70, h: 46, pad: 4, start: false })}<span class="sg-t"><b>${esc(tr.gp.replace(/^GP d[aeo]s? /, ''))}</b><small>${esc(Time.fmt(Time.raceDate(G, i)))}${tr.sprint ? ' · Sprint' : ''}</small></span><span class="sg-w">${w ? `<i style="background:${teamColor(w.team)}"></i>${esc(dCode(w))}` : i === G.season.round ? K85.tag(byLang('Próxima', 'Next'), 'r') : ''}</span></button>`; };
  return `<div class="season">${Object.keys(months).map(m => `<section class="sm"><h3>${esc(MONTHS_FULL85()[+m.slice(5) - 1])}</h3>${months[m].map(card).join('')}</section>`).join('')}</div>`;
}
function calDetail85(i) {
  const id = G.season.calendar[i]; const tr = Career.track(G, id); if (!tr) return '';
  const r = G.season.results[i]; const hero = trackHero85(tr);
  const rec = typeof REAL_RECORDS !== 'undefined' && REAL_RECORDS.circuits[tr.id];
  const ch = typeof circuitHistory === 'function' ? circuitHistory(tr.id) : null;
  const mine = r ? r.cls.filter(c => c.tid === G.player.teamId) : [];
  return `<aside class="cal-d n-card">${hero ? `<div class="cal-dh" style="background-image:url('${hero}')"></div>` : ''}<div class="cal-db"><span class="n-eyebrow">${byLang('Etapa', 'Round')} ${i + 1} · ${esc(Time.fmt(Time.raceDate(G, i)))}</span><h2>${esc(tr.gp)}</h2><p class="n-mu">${natTag(tr.country)} ${esc(tr.circuit)}${tr.place ? ' · ' + esc(tr.place) : ''}</p>
    ${K85.track(tr, { w: 340, h: 190, cls: 'cal-trk' })}
    ${K85.kv([[byLang('Voltas', 'Laps'), tr.laps], [byLang('Extensão', 'Length'), tr.length.toFixed(3) + ' km'], [byLang('Curvas', 'Turns'), tr.turns || '—'], [byLang('Tipo', 'Type'), tr.street ? byLang('Rua', 'Street') : byLang('Permanente', 'Permanent')], [byLang('Perda no pit', 'Pit loss'), tr.pitLoss.toFixed(1) + ' s'], [byLang('Chance de chuva', 'Rain chance'), Math.round((tr.rain || 0) * 100) + '%'], rec && rec.lap ? [byLang('Recorde da volta', 'Lap record'), `${fmtLap(rec.lap[0] / 1000)} · ${esc(hName(rec.lap[1]))} (${rec.lap[3]})`] : null, ch ? [byLang('Maior vencedor', 'Most wins'), `${esc(hName(ch.top.id))} · ${ch.top.wins}`] : null])}
    ${r ? `<span class="n-lbl">${byLang('Resultado', 'Result')}</span>${K85.table([['', 'c'], [byLang('Piloto', 'Driver')], [byLang('Equipe', 'Team')]], r.cls.slice(0, 3).map(c => [K85.pos(c.pos), K85.who(c.did, { tid: c.tid }), `<span class="n-mu">${esc(Career.team(G, c.tid).name)}</span>`]))}${mine.length ? `<p class="n-sm" style="margin-top:8px">${byLang('Sua equipe', 'Your team')}: ${mine.map(c => `${esc(rawName(c.did))} ${c.status === 'fin' ? ordinal(c.pos) : byLang('abandono', 'DNF')}`).join(' · ')}</p>` : ''}` : ''}
    <div style="display:flex;gap:8px;margin-top:14px">${K85.btn(byLang('Página do circuito', 'Circuit page'), { act: 'circuitPage', id: tr.id, kind: 'primary', sm: true })}</div></div></aside>`;
}
SCREENS.calendar = {
  html() {
    const tab = UI.params.tab || 'mes';
    const ev = calEvents85();
    const months = [...new Set(ev.filter(e => e.k === 'f1').map(e => e.date.slice(0, 7)))].sort();
    const cur = UI.params.m || (G.today && months.includes(G.today.slice(0, 7)) ? G.today.slice(0, 7) : months[0]);
    const mi = months.indexOf(cur);
    const head = K85.head({ t: byLang('Calendário', 'Calendar'), s: `${byLang('Temporada', 'Season')} ${G.season.year} · ${G.season.calendar.length} GPs · ${G.season.round} ${byLang('disputados', 'run')}`, tabs: [['mes', byLang('Mês a mês', 'Month')], ['etapas', byLang('Por etapa', 'By round')]], tab });
    if (tab === 'etapas') {
      const sel = UI.params.sel != null ? +UI.params.sel : Math.min(G.season.round, G.season.calendar.length - 1);
      return head + `<div class="cal-r">${calRound85(sel)}${calDetail85(sel)}</div>`;
    }
    const nav = `<div class="cal-nav"><button class="x-ibtn" ${mi <= 0 ? 'disabled' : ''} data-act="go" data-v="calendar" data-p='${esc(JSON.stringify({ tab: 'mes', m: months[mi - 1] }))}' aria-label="${byLang('Mês anterior', 'Previous month')}">${svg85('M15 18l-6-6 6-6')}</button><b>${esc(MONTHS_FULL85()[+cur.slice(5) - 1])} ${cur.slice(0, 4)}</b><button class="x-ibtn" ${mi >= months.length - 1 ? 'disabled' : ''} data-act="go" data-v="calendar" data-p='${esc(JSON.stringify({ tab: 'mes', m: months[mi + 1] }))}' aria-label="${byLang('Próximo mês', 'Next month')}">${svg85('M9 6l6 6-6 6')}</button>
      <div class="cal-mt">${months.map(m => `<button class="${m === cur ? 'on' : ''}" data-act="go" data-v="calendar" data-p='${esc(JSON.stringify({ tab: 'mes', m }))}'>${esc(MONTHS_FULL85()[+m.slice(5) - 1].slice(0, 3))}</button>`).join('')}</div></div>`;
    const kinds = Object.keys(CAL_KIND85).filter(k => ev.some(e => e.k === k));
    const monthGps = ev.filter(e => e.k === 'f1' && e.date.startsWith(cur));
    return head + `<div class="cal-m"><div class="n-card flush">${nav}${calMonth85(ev, cur)}</div>
      <div class="n-col">${K85.card({ t: byLang('Mostrar', 'Show'), body: `<div class="cal-leg">${kinds.map(k => `<button class="${(UI.calOff || {})[k] ? 'off' : ''}" data-act="calF85" data-k="${k}"><i class="ev-${k}"></i>${esc(byLang(...CAL_KIND85[k]))}<span class="n-num n-mu">${ev.filter(e => e.k === k && e.date.startsWith(cur)).length}</span></button>`).join('')}</div>` })}
        ${K85.card({ t: byLang('GPs do mês', 'GPs this month'), flush: true, body: monthGps.length ? K85.list(monthGps.map(e => { const tr = Career.track(G, e.id); return { lead: K85.track(tr, { w: 54, h: 36, pad: 3, start: false }), title: esc(tr.gp), sub: `${esc(Time.fmt(e.date))}${tr.sprint ? ' · Sprint' : ''}`, tail: e.win ? K85.who(e.win, { short: true, flag: false }) : e.round === G.season.round ? K85.tag(byLang('Próxima', 'Next'), 'r') : '', do: { act: 'go', v: 'calendar', p: { tab: 'etapas', sel: e.round } } }; })) : `<div style="padding:12px 16px">${K85.empty(byLang('Sem GP neste mês.', 'No GP this month.'))}</div>` })}</div></div>`;
  },
};
