// Web × desktop (0.9, E10): a mesma semente precisa seguir a mesma sequência de sorteios nos dois.
// Na versão web existe o "redator do paddock" (Store.sample); ele não pode consumir o RNG da simulação.
// Joga 4 fins de semana pela interface (ACT.finishWeekend) com e sem um redator falso que não escreve nada
// e compara o estado do RNG e a assinatura dos resultados.
// Uso: node scripts/web-desktop-check.js   (precisa do build: node scripts/build.js)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const file = path.join(__dirname, '..', 'app', 'dist', 'index.html');
if (!fs.existsSync(file)) { console.log('rode antes: node scripts/build.js'); process.exit(1); }

async function run(b, withWriter) {
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file); await p.waitForTimeout(300);
  const r = await p.evaluate(async (withWriter) => {
    try { closeModal(); } catch (e) { /* sem modal */ }
    Store.sample = withWriter ? { json: async () => null } : null;   // redator falso: responde, mas não escreve nada
    G = Career.create(BASE, { mode: 'manager', teamId: 'williams', seed: 'web-desktop', name: 'Teste' });
    if (G.teamSetup && G.teamSetup.pending && typeof Owners !== 'undefined' && Owners.autoSetup) Owners.autoSetup(G);
    G.options.aiEvents = true; G.options.eventRate = 2;
    for (let i = 0; i < 4; i++) {
      Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G);
      await ACT.finishWeekend();
    }
    const res = G.season.results.map(x => x.cls.map(c => c.did).join(',')).join('|');
    return { rng: RNG.state, res };
  }, withWriter);
  await p.close();
  return { ...r, errs };
}

(async () => {
  const b = await chromium.launch();
  const a = await run(b, false), w = await run(b, true);
  await b.close();
  const bad = [];
  if (a.rng !== w.rng) bad.push(`estado do RNG diferente: sem redator ${a.rng}, com redator ${w.rng}`);
  if (a.res !== w.res) bad.push('resultados das corridas diferentes com e sem o redator');
  [...a.errs, ...w.errs].forEach(e => bad.push('erro de página: ' + e));
  if (bad.length) { console.log(`web-desktop-check: ${bad.length} problema(s)`); bad.forEach(x => console.log('  ✗', x)); process.exit(1); }
  console.log('web-desktop-check OK · a mesma semente segue igual com e sem o redator do paddock');
})();
