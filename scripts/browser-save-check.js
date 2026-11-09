// Saves no navegador (app/dist/index.html no Chromium): compactação conferida, recarregar a página e abrir
// de novo sem mudar nada, saves antigos sem compactação, save que falha ao abrir não troca o espaço,
// importar sem espaço livre não grava por cima, e um save grande que antes estourava o limite (~5 MB) agora cabe.
// Uso: node scripts/build.js && node scripts/browser-save-check.js
const path = require('path');
const { chromium } = require('playwright');
const file = 'file://' + path.join(__dirname, '..', 'app', 'dist', 'index.html');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  await p.goto(file); await p.waitForTimeout(400);
  // 1. carreira de 1 temporada e meia, salva compactada
  const a = await p.evaluate(async () => {
    try { closeModal(); } catch (e) { /* sem modal */ }
    localStorage.clear();
    NC.mode = 'manager'; NC.teamId = 'williams'; NC.slot = 'slot1'; NC.seed = 'bs87'; NC.name = 'K'; ACT.ncStart();
    if (G.teamSetup && G.teamSetup.pending) Owners.autoSetup(G);
    for (let i = 0; i < 30; i++) { if (Career.seasonOver(G)) Career.endSeason(G); simulateRound(); }
    const w = await Store.saveGame('slot1', G);
    const raw = localStorage.getItem('pitwall:save:slot1');
    return { w, gz: raw.startsWith('gz1:'), rawKB: Math.round(raw.length / 1024), jsonKB: Math.round(JSON.stringify(G).length / 1024), json: JSON.stringify(G), round: G.season.round, year: G.season.year };
  });
  ok(a.w === 'local', `save devolveu ${a.w}`); ok(a.gz, 'save não foi compactado');
  console.log(`  save: ${a.jsonKB} KB de JSON → ${a.rawKB} KB guardados`);
  // 2. recarrega a página e abre: tem de voltar idêntico
  await p.reload(); await p.waitForTimeout(400);
  const b2 = await p.evaluate(async () => { try { closeModal(); } catch (e) { /* sem modal */ } const g = await Store.loadGame('slot1'); return g ? JSON.stringify(g) : null; });
  ok(b2 === a.json, 'save compactado voltou diferente depois de recarregar a página');
  const opened = await p.evaluate(async () => { await ACT.loadSlot({ dataset: { slot: 'slot1' } }); return { slot: SLOT, year: G.season.year, round: G.season.round }; });
  ok(opened.slot === 'slot1' && opened.round === a.round && opened.year === a.year, `abriu ${JSON.stringify(opened)}`);
  // 3. save antigo (JSON puro, como até a 0.8.6) abre
  const c = await p.evaluate(async (json) => { localStorage.setItem('pitwall:save:slot2', json); localStorage.setItem('pitwall:meta:slot2', JSON.stringify({ team: 'X' })); const g = await Store.loadGame('slot2'); return g ? JSON.stringify(g) === json : false; }, a.json);
  ok(c, 'save antigo sem compactação não abriu igual');
  // 4. save que falha ao abrir (sem temporada) não troca o espaço nem o jogo aberto
  const d = await p.evaluate(async () => {
    const bad = JSON.parse(JSON.stringify(G)); delete bad.season; localStorage.setItem('pitwall:save:slot3', await Store.pack(JSON.stringify(bad))); localStorage.setItem('pitwall:meta:slot3', JSON.stringify({ team: 'Y' }));
    const before = { slot: SLOT, seed: G.seed, round: G.season.round };
    await ACT.loadSlot({ dataset: { slot: 'slot3' } });
    return { before, after: { slot: SLOT, seed: G.seed, round: G.season.round } };
  });
  ok(JSON.stringify(d.before) === JSON.stringify(d.after), `save ruim trocou o jogo aberto: ${JSON.stringify(d)}`);
  // 5. salvar um jogo sem peças centrais não grava por cima do save bom
  const e = await p.evaluate(async () => { const keep = localStorage.getItem('pitwall:save:slot1'); const g = JSON.parse(JSON.stringify(G)); delete g.db; const w = await Store.saveGame('slot1', g); return { w, same: localStorage.getItem('pitwall:save:slot1') === keep }; });
  ok(e.w === 'invalid' && e.same, `save inválido foi gravado: ${JSON.stringify(e)}`);
  // 6. importar com os três espaços ocupados não grava por cima de nenhum
  const f = await p.evaluate(async () => {
    const keep = ['slot1', 'slot2', 'slot3'].map(s => localStorage.getItem('pitwall:save:' + s));
    const blob = new File([JSON.stringify(G)], 'jogo.json', { type: 'application/json' });
    await CHG.importSave({ files: [blob] }); await new Promise(r => setTimeout(r, 300));
    return ['slot1', 'slot2', 'slot3'].every((s, i) => localStorage.getItem('pitwall:save:' + s) === keep[i]);
  });
  ok(f, 'importar sem espaço livre gravou por cima de um save');
  // 7. vários saves seguidos terminam na ordem certa (o último vence)
  const g7 = await p.evaluate(async () => { const ps = []; for (let i = 0; i < 4; i++) { G.options.__t = i; ps.push(Store.saveGame('slot1', G)); } await Promise.all(ps); delete G.options.__t; const g = await Store.loadGame('slot1'); return g.options.__t; });
  ok(g7 === 3, `saves seguidos terminaram fora de ordem (ficou o ${g7})`);
  // 8. save grande (carreira longa simulada: ~6 MB de JSON) cabe no navegador compactado
  const h = await p.evaluate(async () => {
    const g = JSON.parse(JSON.stringify(G)); const pad = []; for (let i = 0; i < 40; i++) pad.push(...g.news.slice(0, 200).map(n => ({ ...n, y: 2000 + i })));
    g.archive = g.archive.concat(pad); const kb = Math.round(JSON.stringify(g).length / 1024);
    const w = await Store.saveGame('slot2', g); return { w, kb, stored: Math.round(localStorage.getItem('pitwall:save:slot2').length / 1024) };
  });
  ok(h.w === 'local', `save grande (${h.kb} KB) não coube: ${h.w}`);
  console.log(`  save grande: ${h.kb} KB de JSON → ${h.stored} KB guardados (${h.w})`);
  ok(!errs.length, 'erros na página: ' + errs.slice(0, 3).join(' | '));
  await b.close();
  if (fails.length) { fails.forEach(x => console.log('✗', x)); console.log('saves no navegador: FALHOU'); process.exit(1); }
  console.log('saves no navegador: OK');
})();
