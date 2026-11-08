/* ============================================================
   PIT WALL 0.8.5 — animações e transições
   Só animam quando a tela ou a aba muda (não a cada clique que redesenha a mesma tela):
   - conteúdo entra deslizando (da direita ao avançar, da esquerda ao voltar);
   - cartões, estatísticas e linhas de tabela entram em cascata;
   - barras, anéis, linhas e colunas dos gráficos crescem até o valor;
   - números das estatísticas contam até o valor;
   - indicador das abas desliza da aba anterior para a nova.
   Opções → Interface → Animações: ligadas (padrão) ou desligadas.
   ============================================================ */
'use strict';

const FX85 = {
  on: () => UIPREF.get('motion') !== 'off' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
  apply: () => { document.documentElement.dataset.motion = UIPREF.get('motion') === 'off' ? 'off' : 'on'; },
};
FX85.apply();
ACT.motion85 = (el) => { UIPREF.set('motion', el.dataset.val); FX85.apply(); render(); };

/* número com prefixo e sufixo ("$146M", "64%", "4º", "1.234 pts") */
FX85.count = (el) => {
  if (el.children.length || el.dataset.fx) return;
  const txt = el.textContent; const m = /^(\D*?)(-?\d[\d.,]*)(.*)$/.exec(txt.trim()); if (!m) return;
  const raw = m[2]; const dec = /[.,]\d{1,2}$/.test(raw) && !/[.,]\d{3}$/.test(raw) ? raw.split(/[.,]/).pop().length : 0;
  const sep = raw.includes(',') && dec && raw.lastIndexOf(',') > raw.lastIndexOf('.') ? ',' : '.';
  const target = parseFloat(dec ? raw.replace(sep === ',' ? /\./g : /,/g, '').replace(',', '.') : raw.replace(/[.,]/g, ''));
  if (!isFinite(target) || Math.abs(target) < 2) return;
  el.dataset.fx = '1';
  const fmt = (v) => { const s = dec ? v.toFixed(dec) : String(Math.round(v)); const w = dec ? s.split('.') : [s]; const ip = w[0].replace(/\B(?=(\d{3})+(?!\d))/g, raw.includes(',') && !dec ? ',' : raw.includes('.') && !dec ? '.' : ''); return m[1] + ip + (dec ? (sep === ',' ? ',' : '.') + w[1] : '') + m[3]; };
  const t0 = performance.now(), D = 750;
  const step = (t) => { const k = Math.min(1, (t - t0) / D); const e = 1 - Math.pow(1 - k, 3); el.textContent = k < 1 ? fmt(target * e) : txt; if (k < 1 && el.isConnected) requestAnimationFrame(step); };
  el.textContent = fmt(0); requestAnimationFrame(step);
};

/* indicador das abas */
FX85.ink = () => {
  const nav = document.querySelector('.x-sub'); if (!nav) { UI._ink85 = null; return; }
  const on = nav.querySelector('button.on'); if (!on) return;
  const ink = document.createElement('i'); ink.className = 'fx-ink'; nav.appendChild(ink);
  const to = { left: on.offsetLeft + 8, width: on.offsetWidth - 16 };
  const from = UI._ink85 && UI._ink85.area === nav.textContent.length ? UI._ink85 : null;
  nav.classList.add('fx-has-ink');
  if (from && FX85.on()) { ink.style.left = from.left + 'px'; ink.style.width = from.width + 'px'; requestAnimationFrame(() => requestAnimationFrame(() => { ink.style.left = to.left + 'px'; ink.style.width = to.width + 'px'; })); }
  else { ink.style.left = to.left + 'px'; ink.style.width = to.width + 'px'; }
  UI._ink85 = Object.assign({ area: nav.textContent.length }, to);
};

(function () {
  const base = render;
  let last = null, dir = 'fwd';
  const back = ACT.back;
  ACT.back = (...a) => { dir = 'back'; return back(...a); };
  render = function () {
    const key = UI.view + '|' + JSON.stringify(UI.params || {});
    const changed = key !== last;
    base.apply(this, arguments);
    last = key;
    try {
      FX85.ink();
      if (!changed || !FX85.on()) return;
      const mi = document.querySelector('.x-app .main-inner');
      if (!mi) return;
      mi.classList.remove('enter');
      mi.classList.add('x-main-in', 'fx-grow', 'fx-rows', dir === 'back' ? 'fx-back' : 'fx-fwd');
      let i = 0;
      mi.querySelectorAll('.n-card, .n-stat, .panel, .sp85, .pu-c').forEach(c => { if (i < 18) c.style.setProperty('--fx-i', i++); });
      mi.querySelectorAll('tbody').forEach(tb => { let r = 0; for (const tr of tb.rows) { if (r > 20) break; tr.style.setProperty('--fx-r', r++); } });
      mi.querySelectorAll('.n-stat .v, .n-big, .stat-big, .x-kpi b').forEach(FX85.count);
    } catch (e) { /* animação nunca derruba a tela */ }
    finally { dir = 'fwd'; }
  };
})();

/* pole: posição de cada linha do grid para a cascata */
(function () {
  const p = SCREENS.pole; if (!p) return;
  const a = p.after;
  p.after = function () { if (a) a.call(this); document.querySelectorAll('.pg-s').forEach((el, i) => el.style.setProperty('--fx-r', i)); };
})();

/* Opções → Interface: tela de início e animações */
(function () {
  const sv = SCREENS.saves; if (!sv) return;
  const h = sv.html;
  sv.html = function () {
    let out = h.call(this);
    const opt = (act, cur, list) => `<div class="seg">${list.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-val="${v}">${esc(l)}</button>`).join('')}</div>`;
    const rows = `<div class="ui85-row"><div><b>${byLang('Tela de início', 'Title screen')}</b><span>${byLang('Quatro estilos. Também dá para trocar no canto da própria tela de início.', 'Four styles. You can also switch in the corner of the title screen.')}</span></div>${opt('title85', title85(), TITLE85.map(([k, pt, en]) => [k, byLang(pt, en)]))}</div>
      <div class="ui85-row"><div><b>${byLang('Animações', 'Animations')}</b><span>${byLang('Transições entre telas e abas, gráficos que crescem e números que contam.', 'Screen and tab transitions, growing charts and counting numbers.')}</span></div>${opt('motion85', UIPREF.get('motion') === 'off' ? 'off' : 'on', [['on', byLang('Ligadas', 'On')], ['off', byLang('Desligadas', 'Off')]])}</div>`;
    const i = out.indexOf('<div class="ui85-row">');
    return i >= 0 ? out.slice(0, i) + rows + out.slice(i) : out;
  };
})();
