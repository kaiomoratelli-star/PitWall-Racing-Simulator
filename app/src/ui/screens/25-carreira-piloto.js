'use strict';
/* ---------- Carreira de piloto (0.9-A): criação, central do piloto e campeonato ----------
   Tudo em primeira pessoa. Só lê o estado ao desenhar; sorteio só dentro das ações (avançar, correr). */

/* formulário de criação (tela Novo universo, modo Piloto) */
function ncDriverForm() {
  const champ = Kart.CHAMPS.find(c => c.id === DCareer.champFor(NC.nat)) || Kart.CHAMPS[0];
  const styles = ['complete', 'attack', 'technical', 'consistent', 'qualifier', 'overtaker', 'tyre', 'wet', 'daring', 'starter', 'defend'].filter(k => STYLE_PROFILES[k]);
  const bg = Object.entries(DCareer.BG).map(([k, b]) => `<button class="team-card ${NC.bg === k ? 'on' : ''}" data-act="ncDrvSet" data-k="bg" data-v="${k}" style="text-align:left"><b>${byLang(b.pt, b.en)}</b><span class="small muted" style="display:block;margin-top:4px">${byLang(b.d[0], b.d[1])}</span><span class="small" style="display:block;margin-top:6px">${byLang('Apoio por ano', 'Yearly support')}: <b class="n-num">${fmtMoney(b.y)}</b></span></button>`).join('');
  return `<div class="stack" style="gap:14px">
    <div class="panel"><div class="panel-h"><h3>${byLang('Quem é você', 'Who you are')}</h3><span class="small muted">${byLang('O campeonato de kart vem da sua nacionalidade', 'Your karting series follows your nationality')}</span></div><div class="panel-b stack">
      <div class="callout"><div class="label">${byLang('Você começa em', 'You start in')}</div><b style="font-size:18px">${esc(champ.name)}</b><div class="small muted" style="margin-top:4px">${byLang('8 etapas por ano em kartódromos reais. Daqui saem os pilotos da F4 da região.', '8 rounds a year at real kart circuits. The region\'s F4 drivers come from here.')}</div></div>
      <div class="grid g2" style="gap:12px">
        <label class="field"><span>${byLang('Idade inicial', 'Starting age')}</span><select class="inp" data-chg="ncDrvChg" data-k="startAge">${[14, 15, 16, 17].map(a => opt(a, byLang(`${a} anos`, `${a} years old`), NC.startAge)).join('')}</select></label>
        <label class="field"><span>${byLang('Número', 'Number')}</span><input class="inp num" type="number" min="2" max="99" value="${+NC.number || 27}" data-inp="ncField" data-k="number"></label>
      </div>
      <label class="field"><span>${byLang('Estilo de pilotagem', 'Driving style')}</span><select class="inp" data-chg="ncDrvChg" data-k="dStyle">${styles.map(k => opt(k, STYLE_LABELS[k] || k, NC.dStyle)).join('')}</select></label>
      <p class="small muted">${byLang('O estilo molda seus pontos fortes. O seu teto de talento é sorteado e fica oculto — você descobre na pista.', 'Style shapes your strengths. Your talent ceiling is rolled and hidden — you find out on track.')}</p>
    </div></div>
    <div class="panel"><div class="panel-h"><h3>${byLang('Origem da família', 'Family background')}</h3><span class="small muted">${byLang('Muda o orçamento, nunca o talento', 'Changes the budget, never the talent')}</span></div><div class="panel-b"><div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">${bg}</div></div></div>
  </div>`;
}
ACT.ncDrvSet = (el) => { NC[el.dataset.k] = el.dataset.v; render(); };
CHG.ncDrvChg = (el) => { const k = el.dataset.k; NC[k] = k === 'startAge' ? Number(el.value) : el.value; render(); };
/* a nacionalidade define o campeonato: redesenha para mostrar */
(function () { const f = CHG.ncField; CHG.ncField = (el) => { f(el); if (NC.mode === 'driver' && el.dataset.k === 'nat') render(); }; })();

/* ---------- dados prontos para as telas ---------- */
const D85 = {
  champ: () => Kart.CHAMPS.find(c => c.id === G.dcareer.champ) || Kart.CHAMPS[0],
  pos: () => { const t = DCareer.standings(G); const i = t.findIndex(x => x.did === G.dcareer.did); return { pos: i + 1, of: Math.max(t.length, Kart.drivers(G, G.dcareer.champ).length), row: t[i] || { pts: 0, w: 0, pod: 0 }, tab: t }; },
  ready: () => { const n = DCareer.nextRound(G); return !!(n && G.today >= n.date); },
  attrs: [['pace', 'Velocidade', 'Pace'], ['qualifying', 'Classificação', 'Qualifying'], ['racecraft', 'Inteligência de corrida', 'Racecraft'], ['consistency', 'Consistência', 'Consistency'], ['overtaking', 'Ultrapassagem', 'Overtaking'], ['defending', 'Defesa', 'Defending'], ['wet', 'Chuva', 'Wet'], ['start', 'Largada', 'Starts']],
};
/* botão principal do topo (no lugar de "Simular etapa" do observador) */
function dCta85() {
  const n = DCareer.nextRound(G);
  if (n && D85.ready()) return `<button class="x-cta live" data-act="dRun"><span>${byLang('Correr a etapa', 'Race the round')}<small>${esc(n.venue)}</small></span>→</button>`;
  if (n) return `<button class="x-cta" data-act="dAdvance"><span>${byLang('Avançar', 'Continue')}<small>${esc(Time.fmt(n.date))} · ${byLang('Etapa', 'Round')} ${n.r}</small></span>→</button>`;
  return `<button class="x-cta" data-act="dAdvance"><span>${byLang('Avançar', 'Continue')}<small>${byLang('até a próxima temporada', 'to the next season')}</small></span>→</button>`;
}
ACT.dAdvance = () => {
  const r = DCareer.advance(G); autosave();
  if (r.type === 'round') toast(byLang(`Dia de corrida: ${r.ev.venue}.`, `Race day: ${r.ev.venue}.`), 'good');
  else if (r.type === 'newyear') toast(byLang(`Temporada ${r.year}. Você tem ${DCareer.me(G).age} anos.`, `Season ${r.year}. You are ${DCareer.me(G).age}.`), 'good');
  go('hub');
};
ACT.dRun = () => {
  if (!D85.ready()) return ACT.dAdvance();
  const ev = DCareer.nextRound(G); const r = DCareer.runRound(G); autosave();
  if (!r) return go('hub');
  toast(r.dnf ? byLang(`Abandono em ${ev.venue}.`, `Retired at ${ev.venue}.`) : byLang(`P${r.fin} em ${ev.venue} (tomada: P${r.q}).`, `P${r.fin} at ${ev.venue} (qualifying: P${r.q}).`), r.fin && r.fin <= 3 ? 'good' : '');
  go('hub');
};

/* ---------- Central do piloto ---------- */
function dHub85() {
  const dc = G.dcareer; const me = DCareer.me(G); const ch = D85.champ(); const P = D85.pos(); const n = DCareer.nextRound(G); const s = dc.season;
  const days = n ? Math.max(0, Time.diff(G.today, n.date)) : null;
  const face = typeof K85.av === 'function' ? K85.av(me, 64) : '';
  const next = n
    ? `<div class="dh-next"><span class="n-eyebrow">${byLang('Próxima etapa', 'Next round')} · ${n.r}/${s.cal.length}</span><h2>${esc(n.venue)}</h2><p>${natTag(n.nat)} ${esc(Time.fmt(n.date, true))} · ${D85.ready() ? `<b class="pos">${byLang('é hoje', 'today')}</b>` : byLang(`em ${days} dia(s)`, `in ${days} day(s)`)}</p>
        <button class="btn primary lg" data-act="${D85.ready() ? 'dRun' : 'dAdvance'}">${D85.ready() ? byLang('Correr a etapa', 'Race the round') : byLang('Avançar até a etapa', 'Continue to the round')}</button></div>`
    : `<div class="dh-next"><span class="n-eyebrow">${byLang('Temporada encerrada', 'Season over')}</span><h2>${P.pos ? byLang(`P${P.pos} de ${P.of}`, `P${P.pos} of ${P.of}`) : '—'}</h2><p>${byLang('O mundo segue: a F1 e as outras categorias ainda correm até dezembro.', 'The world goes on: F1 and the other series race until December.')}</p><button class="btn primary lg" data-act="dAdvance">${byLang('Avançar para a próxima temporada', 'Continue to next season')}</button></div>`;
  const last = s.res.slice(-5).reverse();
  const head = `<div class="dh-head" style="--tc:${typeof teamColor === 'function' ? 'var(--team)' : 'var(--accent)'}">${face}<div><span class="n-eyebrow">${natTag(me.nat)} ${esc(ch.name)} · ${G.season.year}</span><h1>${esc(me.name)} <small class="n-num">#${me.number}</small></h1><p>${me.age} ${byLang('anos', 'years old')} · ${esc(T(STYLE_LABELS[me.style] || me.style))} · ${byLang(DCareer.BG[dc.bg].pt, DCareer.BG[dc.bg].en)}</p></div></div>`;
  const stats = K85.grid('repeat(5,minmax(0,1fr))',
    K85.stat(byLang('Campeonato', 'Championship'), P.pos ? `P${P.pos}` : '—', P.pos ? `${P.row.pts} ${byLang('pts', 'pts')} · ${P.row.w || 0} ${byLang('vitória(s)', 'win(s)')}` : byLang('antes da 1ª etapa', 'before round 1')),
    K85.stat(byLang('Nota atual', 'Current rating'), `${driverOverall(me)}`, byLang('o teto é desconhecido', 'ceiling unknown')),
    K85.stat(byLang('Forma', 'Form'), `${Math.round(dc.form)}`, dc.form >= 80 ? byLang('em grande fase', 'on a roll') : dc.form >= 60 ? byLang('normal', 'normal') : byLang('em baixa', 'out of form')),
    K85.stat(byLang('Reputação', 'Reputation'), `${Math.round(dc.rep)}`, byLang('quem conhece seu nome', 'who knows your name')),
    K85.stat(byLang('Poupança da família', 'Family savings'), fmtMoney(dc.money), `${byLang('apoio', 'support')} ${fmtMoney(DCareer.BG[dc.bg].y)}/${byLang('ano', 'yr')}`, dc.money < 0.1 ? 'r' : ''));
  const tab = K85.card({ t: byLang('Classificação', 'Standings'), a: `<a data-act="go" data-v="dchamp">${byLang('completa', 'full')}</a>`, flush: true,
    body: P.tab.length ? K85.table([['#', 'n-num'], [byLang('Piloto', 'Driver')], [byLang('Pts', 'Pts'), 'n-num'], ['V', 'n-num']], P.tab.slice(0, 8).map((x, i) => { const d = Career.driver(G, x.did); return [i + 1, `${natTag(d.nat)} ${x.did === dc.did ? `<b>${esc(d.name)}</b>` : esc(d.name)} <small class="n-mu">${d.age}</small>`, x.pts, x.w || 0]; }), { hl: (i) => P.tab[i].did === dc.did }) : K85.empty(byLang('A temporada ainda não começou.', 'The season has not started yet.')) });
  const res = K85.card({ t: byLang('Suas últimas etapas', 'Your last rounds'), flush: true,
    body: last.length ? K85.table([[byLang('Etapa', 'Round')], [byLang('Tomada', 'Quali'), 'n-num'], [byLang('Final', 'Final'), 'n-num']], last.map(r => [`${natTag(r.nat)} ${esc(r.venue)}${r.wet > 0.3 ? ` <small class="n-mu">${byLang('chuva', 'wet')}</small>` : ''}`, `P${r.q}`, r.dnf ? `<span class="n-loss">${byLang('AB', 'DNF')}</span>` : r.fin <= 3 ? `<b class="pos">P${r.fin}</b>` : `P${r.fin}`])) : K85.empty(byLang('Nenhuma etapa disputada neste ano.', 'No rounds raced this year.')) });
  const attrs = K85.card({ t: byLang('O que você sabe fazer', 'What you can do'), a: `<small class="n-mu">${byLang('seu teto é oculto: descubra na pista', 'your ceiling is hidden: find out on track')}</small>`,
    body: `<div class="dh-attrs">${D85.attrs.filter(([k]) => me[k] != null).map(([k, pt, en]) => `<div class="dh-a"><span>${byLang(pt, en)}</span>${K85.bar(me[k], 100)}<b class="n-num">${Math.round(me[k])}</b></div>`).join('')}</div>` });
  const hist = dc.hist.length ? K85.card({ t: byLang('Sua carreira até aqui', 'Your career so far'), flush: true, body: K85.table([[byLang('Ano', 'Year'), 'n-num'], [byLang('Campeonato', 'Series')], [byLang('Posição', 'Position'), 'n-num'], [byLang('Pts', 'Pts'), 'n-num'], ['V', 'n-num'], [byLang('Pódios', 'Podiums'), 'n-num']], dc.hist.slice().reverse().map(h => [h.year, esc((Kart.CHAMPS.find(c => c.id === h.champ) || {}).name || h.champ), h.pos === 1 ? `<b class="pos">${byLang('Campeão', 'Champion')}</b>` : `P${h.pos}/${h.of}`, h.pts, h.w, h.pod])) }) : '';
  const old = DCareer.ageOut(G) ? `<div class="callout" style="margin-bottom:14px"><div class="label">${byLang('Hora de subir', 'Time to move up')}</div>${byLang('Você já passou da idade do kart. As portas da F4 abrem na próxima fase do jogo (0.9-C).', 'You have outgrown karting. The F4 doors open in the next phase of the game (0.9-C).')}</div>` : '';
  return `${head}${old}<div class="dh-top">${next}<div class="dh-stats">${stats}</div></div>${K85.grid('minmax(0,1.2fr) minmax(0,1fr)', tab, res)}${attrs}${hist}`;
}
/* ---------- Meu campeonato ---------- */
SCREENS.dchamp = {
  html() {
    if (!DCareer.on(G)) return K85.empty(byLang('Disponível na carreira de piloto.', 'Available in the driver career.'));
    const dc = G.dcareer; const s = dc.season; const P = D85.pos(); const ch = D85.champ();
    const cal = K85.card({ t: byLang('Calendário', 'Calendar'), flush: true, body: K85.table([['#', 'n-num'], [byLang('Etapa', 'Round')], [byLang('Data', 'Date')], [byLang('Tomada', 'Quali'), 'n-num'], [byLang('Final', 'Final'), 'n-num'], [byLang('Vencedor', 'Winner')]],
      s.cal.map((ev, i) => { const r = s.res[i]; const w = r && r.top && r.top[0] && Career.driver(G, r.top[0]); return [ev.r, `${natTag(ev.nat)} ${esc(ev.venue)}`, esc(Time.fmt(ev.date)), r ? `P${r.q}` : '', r ? (r.dnf ? `<span class="n-loss">${byLang('AB', 'DNF')}</span>` : `P${r.fin}`) : (i === s.r ? `<small class="n-mu">${byLang('próxima', 'next')}</small>` : ''), w ? esc(w.name) : '']; }), { hl: (i) => i === s.r }) });
    const tab = K85.card({ t: byLang('Classificação', 'Standings'), flush: true, body: P.tab.length ? K85.table([['#', 'n-num'], [byLang('Piloto', 'Driver')], [byLang('Idade', 'Age'), 'n-num'], [byLang('Pts', 'Pts'), 'n-num'], ['V', 'n-num'], [byLang('Pódios', 'Podiums'), 'n-num'], [byLang('Poles', 'Poles'), 'n-num'], [byLang('AB', 'DNF'), 'n-num']],
      P.tab.map((x, i) => { const d = Career.driver(G, x.did); return [i + 1, `${natTag(d.nat)} ${x.did === dc.did ? `<b>${esc(d.name)}</b>` : esc(d.name)}`, d.age, x.pts, x.w || 0, x.pod || 0, x.pole || 0, x.dnf || 0]; }), { hl: (i) => P.tab[i].did === dc.did }) : K85.empty(byLang('A temporada ainda não começou.', 'The season has not started yet.')) });
    return K85.head({ t: ch.name, s: `${byLang('Temporada', 'Season')} ${s.year} · ${s.r}/${s.cal.length} ${byLang('etapas', 'rounds')}` }) + K85.grid('minmax(0,1fr) minmax(0,1.2fr)', cal, tab);
  },
};
(function () {
  // a Central vira a central do piloto na carreira de piloto
  const hub = SCREENS.hub; const h = hub.html;
  hub.html = function () { if (typeof DCareer !== 'undefined' && DCareer.on(G)) { Time.init(G); return dHub85(); } return h.call(this); };
  const af = hub.after; hub.after = function () { if (typeof DCareer !== 'undefined' && DCareer.on(G)) return; if (af) return af.call(this); };
})();
