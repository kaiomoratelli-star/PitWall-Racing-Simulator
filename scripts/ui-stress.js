// Teste de estresse da interface ao vivo (Playwright/Chromium).
// Roda corridas inteiras pela tela de corrida real (Career.stepRace + updateRace a cada volta,
// como o laço do jogo), nos modos Observador e Manager, em português e inglês, forçando
// chuva, Safety Car, abandonos em massa e modo de ultrapassagem ativo (o caso que travava
// a 0.7.0). Falha se aparecer qualquer erro de página ou erro registrado pela interface.
// uso: node scripts/ui-stress.js [corridas por combinação=6] [arquivo html=app/dist/index.html]
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const races = +(process.argv[2] || 6);
const file = path.resolve(process.argv[3] || path.join(__dirname, '..', 'app', 'dist', 'index.html'));

(async () => {
  const b = await chromium.launch();
  let fails = 0;
  for (const lang of ['pt', 'en']) {
    for (const mode of ['observer', 'manager']) {
      const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.addInitScript((l) => { try { localStorage.setItem('pw-lang', l); } catch (e) { /* sem armazenamento */ } }, lang);
      await p.goto('file://' + file);
      await p.waitForTimeout(300);
      const out = await p.evaluate(async ({ mode, races }) => {
        const log = [];
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        G = Career.create(BASE, { mode, teamId: 'williams', seed: 'stress-' + mode, name: 'Teste' });
        render();
        for (let i = 0; i < races; i++) {
          if (Career.seasonOver(G)) { Career.endSeason(G); go('hub'); await sleep(0); }
          const t0 = performance.now();
          Career.startWeekend(G);
          Career.finishPractice(G);
          Career.runQualifying(G);
          Career.startRace(G);
          const wk = G.weekend, race = wk.race;
          // cenários: 0 normal, 1 chuva, 2 Safety Car cedo, 3 abandonos em massa, demais normais
          const sc = i % 4;
          if (sc === 1) for (let L = 0; L < race.wet.length; L++) race.wet[L] = Math.max(race.wet[L], 0.55);
          go('race');
          await sleep(0);
          let laps = 0;
          while (!race.finished && laps++ < 400) {
            if (sc === 2 && race.lap === 3 && !race.sc) Engine.deploySC(race, 'SC', 'teste');
            if (sc === 3 && race.lap === 5) race.cars.slice(0, 9).forEach(c => { if (c.status === 'run' && c.pos > 3) { c.status = 'dnf'; c.dnfReason = 'Falha elétrica'; } });
            Career.stepRace(G);
            race.cars.forEach((c, k) => { if (c.status === 'run' && k % 2 === 0) c.drs = true; });
            updateRace();
            if (laps % 10 === 0) await sleep(0);
          }
          const tRace = performance.now() - t0;
          ACT.finishWeekend && await ACT.finishWeekend();
          go('post'); await sleep(0);
          go('hub'); await sleep(0);
          log.push({ year: G.season.year, gp: wk.trackId, sprint: !!wk.sprint, sc, laps: race.lap, ms: Math.round(tRace), events: race.events.length });
        }
        const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
        return { log, uiErrors: (UI.errors || []).map(e => `${e.where}: ${e.msg} x${e.count}`), mem };
      }, { mode, races });
      const bad = [...errs, ...out.uiErrors];
      const avg = Math.round(out.log.reduce((a, x) => a + x.ms, 0) / Math.max(1, out.log.length));
      console.log(`[${lang}/${mode}] ${out.log.length} corridas em ${new Set(out.log.map(x => x.year)).size} temporada(s) (${out.log.filter(x => x.sprint).length} com Sprint) · média ${avg} ms por fim de semana · heap ${out.mem} MB · ${bad.length ? 'ERROS' : 'sem erros'}`);
      bad.slice(0, 5).forEach(e => console.log('   ERRO: ' + e));
      fails += bad.length;
      await p.close();
    }
  }
  await b.close();
  if (fails) { console.log(`FALHOU: ${fails} erro(s)`); process.exit(1); }
  console.log('OK');
})();
