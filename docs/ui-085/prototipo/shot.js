// captura telas: node shot.js a hub,race,... (ou "all")
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const P = __dirname; const prop = process.argv[2] || 'a'; let ids = (process.argv[3] || 'hub').split(',');
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1472, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + P + '/preview.html#' + prop + '-hub'); await pg.waitForTimeout(800);
  if (ids[0] === 'all') ids = await pg.evaluate(() => window.PW.SCREENS.map(s => s[1]));
  fs.mkdirSync(P + '/shots', { recursive: true });
  for (const id of ids) {
    await pg.evaluate(([p, i]) => { window.PW.App.cur = p; window.PW.go(i); }, [prop, id]); await pg.waitForTimeout(350);
    const el = await pg.$('#game'); await el.screenshot({ path: `${P}/shots/${prop}-${id}.png` });
    const bad = await pg.evaluate(() => { const g = document.getElementById('game'); const o = []; g.querySelectorAll('*').forEach(e => { if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0 && !['svg', 'path'].includes(e.tagName.toLowerCase())) o.push(e.className); }); return document.querySelector('#game').innerText.includes('Erro ao desenhar') ? 'ERRO' : ''; });
    if (bad) errs.push(id + ': ' + bad);
  }
  console.log('erros:', errs.length ? errs.join('\n') : 'nenhum'); await b.close();
})();
