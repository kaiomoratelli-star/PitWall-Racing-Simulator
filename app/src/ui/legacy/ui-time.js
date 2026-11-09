/* ============================================================
   PIT WALL — data do jogo, botão Avançar, notificações com prioridade
   e botão Voltar.
   - Central (modo Manager): data de hoje, próximos acontecimentos e
     "Avançar" (pula para o próximo dia com algo relevante).
   - Vermelho = decisão pendente; amarelo = mensagem importante não lida
     (peça pronta, projeto concluído...). As duas travam o avanço.
   - Voltar: histórico de telas (também Alt + seta para a esquerda).
   ============================================================ */
'use strict';

/* ---------- Voltar ---------- */
UI.hist = [];
(function () {
  const _go = go;
  const NO_HIST = new Set(['race', 'title', 'new']);
  go = function (view, params = {}) {
    if (!UI._back && UI.view && !NO_HIST.has(UI.view) && (UI.view !== view || JSON.stringify(UI.params || {}) !== JSON.stringify(params || {}))) {
      UI.hist.push([UI.view, UI.params || {}]);
      if (UI.hist.length > 40) UI.hist.shift();
    }
    UI._back = false;
    _go(view, params);
  };
})();
ACT.back = () => {
  let h = UI.hist.pop();
  while (h && h[0] === UI.view && JSON.stringify(h[1]) === JSON.stringify(UI.params || {})) h = UI.hist.pop();
  if (!h) return;
  if (typeof closeModal === 'function' && document.querySelector('.modal-back, .modal')) closeModal();
  UI._back = true;
  go(h[0], h[1]);
};
document.addEventListener('keydown', (e) => { if (e.altKey && e.key === 'ArrowLeft' && G) { e.preventDefault(); ACT.back(); } });

/* ---------- caixa de entrada: cores por prioridade ---------- */
const PRIO_CHIP = { decision: ['bad', 'decidir'], important: ['warn', 'importante'] };
mailRow = function (m, sel) {
  const pr = Time.prio(m);
  const open = (pr === 'decision' && m.choices && m.resolved == null) || (pr === 'important' && !m.read);
  const chip = open && PRIO_CHIP[pr] ? `<span class="chip ${PRIO_CHIP[pr][0]}">${PRIO_CHIP[pr][1]}</span>` : '';
  return `<button class="mail ${m.read ? '' : 'unread'} ${sel ? 'on' : ''} ${open ? 'p-' + pr : ''}" data-act="openMail" data-id="${m.id}"><span class="dot"></span><span style="min-width:0"><span class="t">${esc(m.title)}</span><br><span class="small muted">${esc(m.from)}${m.date ? ' · ' + esc(Time.fmt(m.date)) : ''}</span></span><span class="row" style="gap:4px;flex-wrap:nowrap">${chip}</span></button>`;
};

/* ---------- central: data, próximos acontecimentos, Avançar ---------- */
function timeBox() {
  Time.init(G);
  const bl = Time.blockers(G);
  const dec = bl.filter(m => Time.prio(m) === 'decision').length, imp = bl.length - dec;
  const wd = Time.weekendDay(G);
  const days = Time.diff(G.today, wd);
  const up = Time.upcoming(G).slice(0, 5);
  const atWeekend = G.weekend || days <= 0;
  const next = up.find(x => x.date > G.today) || up[0];
  const ICON = { weekend: '🏁', design: '📐', part: '🔧' };
  return `<div class="timebox">
    <div class="row between"><div><span class="label">Hoje</span><div class="today">${esc(Time.fmt(G.today, true))}</div></div>
      <div class="small muted" style="text-align:right">${atWeekend ? byLang('Fim de semana de corrida', 'Race weekend') : byLang(`Fim de semana em ${days} dia(s)`, `Race weekend in ${days} day(s)`)}<br>${esc(Time.fmt(wd))}</div></div>
    ${bl.length ? `<div class="block-msg">${dec ? `<span class="chip bad">${dec} ${byLang('decisão(ões)', 'decision(s)')}</span>` : ''}${imp ? `<span class="chip warn">${imp} ${byLang('importante(s) não lida(s)', 'unread important')}</span>` : ''}<span class="small">${byLang('Resolva antes de avançar.', 'Deal with them before moving on.')}</span><button class="btn sm" data-act="openBlocker">${byLang('Abrir', 'Open')}</button></div>` : ''}
    ${up.length ? `<div class="upcoming">${up.map(x => `<div class="up ${x.kind}"><span class="d">${esc(Time.fmt(x.date))}</span><span>${ICON[x.kind] || '•'} ${esc(x.label)}</span></div>`).join('')}</div>` : ''}
    ${atWeekend ? '' : `<button class="btn primary lg" data-act="advanceTime" ${bl.length ? 'disabled' : ''}>${byLang('Avançar', 'Continue')}${next && next.kind !== 'weekend' ? ` <span class="small">→ ${esc(Time.fmt(next.date))}</span>` : ' <span class="small">→ ' + byLang('fim de semana', 'race weekend') + '</span>'}</button>`}
  </div>`;
}
(function () {
  const h = SCREENS.hub.html;
  SCREENS.hub.html = function () {
    let html = h.call(this);
    if (Career.isObs(G) || Career.seasonOver(G)) return html;
    // o aviso antigo de decisões vira o painel de bloqueios
    html = html.replace(/<div class="callout warn row between"><span><b>\d+ decisão\(ões\) aguardando você<\/b>[\s\S]*?<\/div>/, '');
    Time.init(G);
    const atWeekend = G.weekend || Time.diff(G.today, Time.weekendDay(G)) <= 0;
    return html.replace(/<button class="btn primary lg" data-act="toWeekend"([^>]*)>/, (m, rest) => `${timeBox()}<button class="btn primary lg" data-act="toWeekend"${rest}${atWeekend ? '' : ' hidden'}>`);
  };
})();
ACT.openBlocker = () => { const b = Time.blockers(G)[0]; go('inbox', b ? { id: b.id } : {}); };
ACT.advanceTime = () => {
  const bl = Time.blockers(G);
  if (bl.length) { toast(byLang('Há decisões ou mensagens importantes esperando por você.', 'There are decisions or important messages waiting.'), 'bad'); return go('inbox', { id: bl[0].id }); }
  const r = Time.advance(G);
  autosave();
  if (r.stop === 'weekend') toast(byLang('Chegou o fim de semana de corrida.', 'The race weekend is here.'), 'good');
  else if (r.events && r.events.length) toast(r.events.map(e => e.kind === 'part' ? byLang(`Peça nova no carro #${e.seat}: ${Career.AREAS[e.p.area].name}`, `New part on car #${e.seat}: ${T(Career.AREAS[e.p.area].name)}`) : byLang(`Projeto pronto: ${Career.AREAS[e.p.area].name}`, `Project complete: ${T(Career.AREAS[e.p.area].name)}`)).join(' · '), 'good');
  render();
};
(function () {
  const tw = ACT.toWeekend;
  ACT.toWeekend = (el) => {
    if (G && !Career.isObs(G) && !G.weekend) {
      if (Time.blockers(G).length) return ACT.advanceTime();
      Time.init(G);
      if (G.today < Time.weekendDay(G)) return ACT.advanceTime();
    }
    return tw(el);
  };
})();

/* data da etapa: a mesma do calendário por dia (domingo da corrida no ano da temporada) */
gpDate = function (tr) {
  if (!tr || !G || !G.season) return '';
  const i = G.season.calendar.findIndex(id => id === tr.id);
  if (i < 0) return '';
  const d = new Date(Time.raceDate(G, i) + 'T12:00:00Z');
  return byLang(`${String(d.getUTCDate()).padStart(2, '0')} ${Time.MONTHS[d.getUTCMonth()]}`, `${d.getUTCDate()} ${Time.MONTHS_EN[d.getUTCMonth()]}`);
};
