// Verificação da interface 0.8.5 (Playwright/Chromium), em várias carreiras:
// - todas as telas e abas, em português e inglês, nos temas escuro e claro e com o menu na
//   lateral, no topo e embaixo: sem erro de página, sem erro registrado pela interface, sem
//   "undefined", "NaN" ou "[object Object]" na tela e sem rolagem horizontal;
// - coerência dos números mostrados com os dados do jogo (campeonato, finanças, grid, pódio,
//   calendário, Mano a Mano);
// - ordens de rádio numa corrida ao vivo.
// uso: node scripts/ui85-check.js [rodadas=7] [arquivo html=app/dist/index.html]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const rounds = +(process.argv[2] || 7);
const file = path.resolve(process.argv[3] || path.join(__dirname, '..', 'app', 'dist', 'index.html'));

const VIEWS = ['hub', 'inbox', 'calendar', 'calendar:etapas', 'weekend', 'pole', 'podium', 'post', 'analysis', 'team', 'team:staff', 'mano', 'driverPage', 'academy', 'scout', 'sister', 'car', 'dev', 'facilities', 'market', 'finance', 'finance:analise', 'finance:extrato', 'sponsors', 'board', 'standings', 'paddock', 'teamPage', 'owners', 'manufacturers', 'manufacturers:pneus', 'manufacturers:mov', 'council', 'news', 'news:stories', 'social', 'cats', 'circuits', 'circuit', 'log', 'history', 'seasons', 'hall', 'saves', 'editor', 'account', 'diag'];

(async () => {
  const b = await chromium.launch();
  const fails = [];
  const runs = [['pt', 'dark', 'side', 'mclaren', 1440], ['en', 'light', 'top', 'williams', 1366], ['pt', 'light', 'bottom', 'ferrari', 1920], ['pt', 'dark', 'side', 'haas', 1100]];
  for (const [lang, theme, nav, team, width] of runs) {
    const tag = `${lang}/${theme}/${nav}/${team}/${width}`;
    const p = await b.newPage({ viewport: { width, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await p.addInitScript(([l, th, nv]) => { try { localStorage.setItem('pw-lang', l); localStorage.setItem('pitwall-ui85', JSON.stringify({ theme: th, nav: nv, motion: 'off' })); } catch (e) { /* sem armazenamento */ } }, [lang, theme, nav]);
    await p.goto('file://' + file); await p.waitForTimeout(300);
    const res = await p.evaluate(async ({ team, rounds, VIEWS }) => {
      const out = { bad: [], checks: [] };
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const BAD = /\bundefined\b|\bNaN\b|\[object Object\]|\bInfinity(?! Sports)/;
      try { closeModal(); } catch (e) { /* sem modal */ }
      G = Career.create(BASE, { mode: 'manager', teamId: team, seed: 'ui85-' + team, name: 'Teste' });
      if (G.teamSetup && G.teamSetup.pending && typeof Owners !== 'undefined' && Owners.autoSetup) Owners.autoSetup(G);
      for (let i = 0; i < rounds; i++) simulateRound();
      const visit = async (v, extra) => {
        const [view, tab] = v.split(':');
        const params = Object.assign(tab ? { tab } : {}, extra || {});
        if (view === 'driverPage') params.id = Career.lineup(G, G.player.teamId)[0].id;
        if (view === 'teamPage') params.id = G.db.teams[0].id;
        if (view === 'circuit') params.id = G.season.calendar[0];
        go(view, params); await sleep(30);
        const txt = document.getElementById('app').innerText;
        const m = BAD.exec(txt); if (m) out.bad.push(`${v}: "${txt.slice(Math.max(0, m.index - 50), m.index + 30).replace(/\s+/g, ' ')}"`);
        if (document.documentElement.scrollWidth > window.innerWidth + 2) out.bad.push(`${v}: rolagem horizontal (${document.documentElement.scrollWidth}px)`);
      };
      for (const v of VIEWS) await visit(v);
      // ---- coerência ----
      const sd = Career.standingsD(G), sc = Career.standingsC(G);
      go('hub'); await sleep(20);
      const tw = document.querySelector('.tower .tw .n-num');
      out.checks.push(['Central: pontos do líder', tw && +tw.textContent === sd[0].pts]);
      const my = sc.findIndex(x => x.tid === G.player.teamId) + 1;
      out.checks.push(['Topo: posição nos construtores', (document.querySelector('.x-kpi b') || {}).textContent === ordinal(my)]);
      const L = G.finances.ledger.filter(x => x.year === G.season.year);
      const inc = L.filter(x => x.amount > 0).reduce((a, x) => a + x.amount, 0);
      go('finance'); await sleep(20);
      out.checks.push(['Finanças: receitas do ano', [...document.querySelectorAll('.n-stat .v')].some(e => e.textContent === fmtMoney(inc))]);
      const R = G.season.results[G.season.results.length - 1];
      go('podium'); await sleep(20);
      const plates = [...document.querySelectorAll('.pd-name b')].map(e => e.textContent);
      const exp = [R.cls[1], R.cls[0], R.cls[2]].map(c => { const d = Career.driver(G, c.did); return d.lastName || shortName(d); });
      out.checks.push(['Pódio: os três primeiros', JSON.stringify(plates) === JSON.stringify(exp)]);
      go('pole'); await sleep(20);
      const q = G.lastRace.quali;
      const p1 = (document.querySelector('.pg-s .pg-n b') || {}).textContent;
      out.checks.push(['Pole: primeiro do grid', p1 === shortName(Career.driver(G, q.order[0]))]);
      go('calendar', { tab: 'etapas' }); await sleep(20);
      out.checks.push(['Calendário: todas as etapas', document.querySelectorAll('.sgp').length === G.season.calendar.length]);
      const lu = Career.lineup(G, G.player.teamId);
      go('mano'); await sleep(20);
      const nums = [...document.querySelectorAll('.mm-score b')].slice(0, 2).map(b => b.textContent.split('–').map(Number));
      out.checks.push(['Mano a Mano: duelos ≤ etapas', nums.length === 2 && nums.every(([a, c]) => a + c <= G.season.results.length)]);
      // busca rápida
      ACT.search85(); await sleep(20);
      const inp = document.getElementById('q85'); inp.value = shortName(lu[0]).slice(0, 4); inp.dispatchEvent(new Event('input'));
      out.checks.push(['Busca rápida encontra o piloto', !!document.querySelector('.x-sr') && document.getElementById('sl85').textContent.includes(lu[0].name)]);
      closeModal();
      // ---- rádio numa corrida ao vivo ----
      Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G);
      go('race'); await sleep(30);
      const race = G.weekend.race;
      const vis = (sel) => [...document.querySelectorAll(sel)].some(e => e.offsetParent !== null);
      out.checks.push(['Antes da largada: sem +1 volta e sem simular até o fim', !vis('#hud [data-act="raceStep"]') && !vis('#hud [data-act="raceSkip"]')]);
      for (let i = 0; i < 3; i++) { Career.stepRace(G); updateRace(); }
      const mine = race.cars.filter(c => c.tid === G.player.teamId);
      for (const o of ['attack', 'kerbs', 'lift', 'hold', 'cleanAir', 'defend', 'extend', 'motivate', 'letBy']) ACT.radio85({ dataset: { d: mine[0].did, o } });
      for (let i = 0; i < 8; i++) { Career.stepRace(G); updateRace(); }
      out.checks.push(['Rádio: ordens registradas', race.events.filter(e => e.type === 'radio').length >= 8]);
      out.checks.push(['Rádio: defesa expira em 5 voltas', !(typeof mine[0].orders.defend === 'number' && mine[0].orders.defend >= race.lap)]);
      Career.simRaceToEnd(G); updateRace(true); await sleep(20);
      out.checks.push(['Depois da bandeirada: nada que avance a corrida', !document.querySelector('.r85 .race-intro') && !vis('#hud [data-act="racePlay"]') && !vis('#hud [data-act="raceStep"]') && !vis('#hud [data-act="raceSkip"]') && vis('#hud [data-act="finishWeekend"]')]);
      await ACT.finishWeekend(); await sleep(30);
      out.checks.push(['Depois da corrida vai para o pódio', UI.view === 'podium']);
      while (!Career.seasonOver(G)) simulateRound();
      go('weekend'); await sleep(20);
      out.checks.push(['Temporada encerrada: o fim de semana não oferece começar', !!document.querySelector('.ns85') && !document.querySelector('#app [data-act="toWeekend"]')]);
      out.uiErrors = (UI.errors || []).map(e => `${e.where}: ${e.msg}`);
      return out;
    }, { team, rounds, VIEWS });
    const bad = [...errs, ...res.bad, ...res.uiErrors, ...res.checks.filter(c => !c[1]).map(c => 'coerência: ' + c[0])];
    console.log(`[${tag}] ${VIEWS.length} telas · ${res.checks.filter(c => c[1]).length}/${res.checks.length} verificações de coerência · ${bad.length ? bad.length + ' problema(s)' : 'sem problemas'}`);
    bad.slice(0, 25).forEach(x => console.log('   ' + x));
    if (bad.length) fails.push(tag);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FALHOU: ${fails.join(', ')}` : 'OK');
  process.exit(fails.length ? 1 : 0);
})();
