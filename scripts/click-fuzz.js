// Cliques ao acaso em tudo o que é clicável (0.8.7): abre telas e abas, aperta botões, escolhe cartas,
// avança o calendário e joga corridas pela própria interface, sorteando o próximo clique com uma semente
// fixa (o teste se repete igual). Falha com erro de página, erro registrado pela interface, sorteio ao
// desenhar uma tela ou dado incoerente no jogo (titulares, pontos, dinheiro, NaN).
// Uso: node scripts/build.js && node scripts/click-fuzz.js [cliques=1500] [semente=7] [equipe=williams]
const path = require('path');
const { chromium } = require('playwright');
const file = 'file://' + path.join(__dirname, '..', 'app', 'dist', 'index.html');
const N = +(process.argv[2] || 1500), SEED = +(process.argv[3] || 7), TEAM = process.argv[4] || 'williams';
let s = SEED >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// ações que fecham o jogo, apagam saves, trocam de carreira ou abrem arquivo/janela do sistema ficam de fora
const SKIP = /^(toTitle|quit|exitGame|newGame|ncStart|deleteSlot|delSlot|loadSlot|importSave|exportSave|downloadSave|edReset|edSave|openLogs|openSaves|fullscreen|a11ySize|tutOff|tutReset|resetAll|copyJson|aiEventNow|lightsOut)$/;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept().catch(() => {}));
  await p.addInitScript(() => { try { localStorage.setItem('pitwall-ui85', JSON.stringify({ theme: 'dark', nav: 'side', motion: 'off' })); localStorage.setItem('pitwall-tut', JSON.stringify({ off: true })); } catch (e) { /* sem armazenamento */ } });
  await p.goto(file); await p.waitForTimeout(400);
  await p.evaluate((team) => { UI.strictRng = true; try { closeModal(); } catch (e) { /* sem modal */ } NC.mode = 'manager'; NC.teamId = team; NC.slot = 'slot1'; NC.seed = 'fuzz87'; NC.name = 'K'; ACT.ncStart(); if (G.teamSetup && G.teamSetup.pending) Owners.autoSetup(G); }, TEAM);
  const count = {}; let clicks = 0, advanced = 0;
  for (let i = 0; i < N; i++) {
    // de vez em quando: resolve as pendências e avança (como o jogador faria) para o jogo andar
    if (i % 60 === 59) { const r = await p.evaluate(() => { try { closeModal(); } catch (e) { /* */ } G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, 0); m.read = true; }); if (!G.weekend) { try { simulateRound(); return 1; } catch (e) { return 'erro: ' + e.message; } } try { Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G); go('hub'); return 1; } catch (e) { return 'erro: ' + e.message; } }); if (r !== 1) errs.push('avançar: ' + r); else advanced++; }
    const list = await p.evaluate((skip) => {
      const re = new RegExp(skip);
      return [...document.querySelectorAll('[data-act]')].filter(el => { const r = el.getBoundingClientRect(); return !el.disabled && r.width > 0 && r.height > 0 && !re.test(el.dataset.act); }).map((el, k) => { el.dataset.fz = String(k); return el.dataset.act; });
    }, SKIP.source);
    if (!list.length) { await p.evaluate(() => { try { closeModal(); } catch (e) { /* */ } go('hub'); }); continue; }
    const k = Math.floor(rnd() * list.length); count[list[k]] = (count[list[k]] || 0) + 1;
    try { await p.click(`[data-fz="${k}"]`, { timeout: 1500, force: true }); clicks++; } catch (e) { /* elemento sumiu entre a lista e o clique */ }
    await p.waitForTimeout(15);
    if (G_RACE_GUARD) await p.evaluate(() => { if (UI.view === 'race' && G.weekend && G.weekend.race && !G.weekend.race.finished && UI.racePaused === false) UI.racePaused = true; });
  }
  const end = await p.evaluate(() => {
    const bad = [];
    G.db.teams.forEach(t => { const n = G.db.drivers.filter(d => d.team === t.id && d.seat !== 'R' && !d.retired).length; if (n !== 2) bad.push(`${t.name}: ${n} titulares`); const lu = Career.lineup(G, t.id); if (new Set(lu.map(d => d.id)).size !== lu.length) bad.push(`${t.name}: piloto repetido`); });
    const tot = {}; G.season.results.forEach(r => { r.cls.forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); (r.sprint || []).forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); (r.bonus || []).forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); });
    Object.entries(G.season.standD).forEach(([d, v]) => { if (Math.abs((tot[d] || 0) - v) > 0.01) bad.push(`pontos de ${d}: ${v} ≠ ${tot[d] || 0}`); });
    if (!isFinite(G.finances.balance)) bad.push('caixa NaN');
    const sc = typeof Schema !== 'undefined' ? Schema.check(G) : { fatal: [], errors: [] };
    return { bad: bad.concat(sc.fatal, sc.errors), uiErr: (UI.errors || []).map(e => `${e.where}: ${e.msg}`), leaks: UI.rngLeaks || [], round: G.season.round, year: G.season.year, hooks: Hooks.verify() };
  });
  await b.close();
  const acts = Object.keys(count).length;
  console.log(`${clicks} cliques em ${acts} ações diferentes · ${advanced} avanços · terminou em ${end.year} etapa ${end.round}`);
  const fails = [...errs.map(e => 'página: ' + e), ...end.uiErr.map(e => 'interface: ' + e), ...end.leaks.map(e => 'sorteio ao desenhar: ' + e), ...end.bad.map(e => 'dados: ' + e), ...end.hooks.map(e => 'gancho reescrito: ' + e)];
  if (fails.length) { [...new Set(fails)].slice(0, 20).forEach(f => console.log('  ✗', f)); console.log('cliques: FALHOU'); process.exit(1); }
  console.log('cliques: OK');
})();
const G_RACE_GUARD = true;
