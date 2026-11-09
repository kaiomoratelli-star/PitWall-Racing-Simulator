// Inglês sem vazamento (0.8.7): abre todas as telas e abas em inglês e procura texto que ficou em português.
// Conta frases com marcas fortes do português (não, você, ção/ções, palavras curtas típicas) e lista por tela.
// Uso: node scripts/build.js && node scripts/i18n-check.js [limite=0]   (falha se passar do limite)
const path = require('path');
const { chromium } = require('playwright');
const file = 'file://' + path.join(__dirname, '..', 'app', 'dist', 'index.html');
const LIMIT = +(process.argv[2] || 0);
const VIEWS = require('./ui85-check-views.json');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('pw-lang', 'en'); localStorage.setItem('pitwall-ui85', JSON.stringify({ theme: 'dark', nav: 'side', motion: 'off' })); localStorage.setItem('pitwall-tut', JSON.stringify({ off: true })); } catch (e) { /* sem armazenamento */ } });
  await p.goto(file); await p.waitForTimeout(400);
  const res = await p.evaluate(async (VIEWS) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    try { closeModal(); } catch (e) { /* sem modal */ }
    UI.strictRng = true;
    G = Career.create(BASE, { mode: 'manager', teamId: 'mclaren', seed: 'i18n87', name: 'Test' });
    if (G.teamSetup && G.teamSetup.pending) Owners.autoSetup(G);
    for (let i = 0; i < 5; i++) simulateRound();
    // nomes próprios do universo não contam (pilotos, equipes, circuitos, pessoas)
    const names = new Set(); const addN = (s) => String(s || '').split(/[\s\-']+/).forEach(w => w.length > 1 && names.add(w.toLowerCase()));
    G.db.drivers.forEach(d => addN(d.name)); G.db.teams.forEach(t => { addN(t.name); addN(t.short); }); G.db.tracks.forEach(t => { addN(t.circuit); addN(t.gp); addN(t.name); });
    const STRONG = /\b(não|você|vocês|também|após|até|então|já|está|são|será|pelo|pela|pelos|pelas|uma|umas|nas|nos|aos|seu|sua|seus|suas|equipe|equipes|corrida|corridas|temporada|piloto|pilotos|etapa|etapas|vitória|vitórias|pontos|próxima|próximo|dias|mais|menos|ainda|sem|com|para|por|dos|das)\b/i;
    const SUFFIX = /\b\w+(ção|ções|ões|ância|ência)\b/i;
    const out = {}; const seen = new Set();
    const scan = (v) => {
      const bag = [];
      const walker = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT);
      let n; while ((n = walker.nextNode())) {
        const t = n.nodeValue.replace(/\s+/g, ' ').replace(/\S+@\S+|https?:\/\/\S+|\b[\w.-]+\.(com|org|net)\b(\/\S*)?/gi, '').trim(); if (t.length < 4) continue;
        const el = n.parentElement; if (el && el.closest('script,style')) continue;
        const words = t.toLowerCase().split(/[^a-zà-ú]+/).filter(Boolean);
        if (words.every(w => names.has(w))) continue;
        const clean = words.filter(w => !names.has(w)).join(' ');
        if (STRONG.test(clean) || SUFFIX.test(clean)) bag.push(t.slice(0, 90));
      }
      if (bag.length) out[v] = [...new Set(bag)];
    };
    const tabsOf = (view) => [...document.querySelectorAll(`[data-act="go"][data-v="${view}"][data-p]`)].map(el => { try { return JSON.parse(el.dataset.p).tab; } catch (e) { return null; } }).filter(Boolean);
    const visit = async (v) => {
      const [view, tab] = v.split(':'); const params = tab ? { tab } : {};
      if (view === 'driverPage') params.id = Career.lineup(G, G.player.teamId)[0].id;
      if (view === 'teamPage') params.id = G.db.teams[0].id;
      if (view === 'circuit') params.id = G.season.calendar[0];
      go(view, params); await sleep(40); if (view !== 'diag') scan(v);   // Diagnóstico: notas internas para o desenvolvedor
    };
    for (const v of VIEWS) { if (seen.has(v)) continue; seen.add(v); await visit(v); const view = v.split(':')[0]; for (const t of tabsOf(view)) { const k = `${view}:${t}`; if (!seen.has(k)) { seen.add(k); await visit(k); } } }
    return { out, visited: seen.size };
  }, VIEWS);
  await b.close();
  const total = Object.values(res.out).reduce((a, x) => a + x.length, 0);
  Object.entries(res.out).sort((a, b) => b[1].length - a[1].length).forEach(([v, L]) => { console.log(`${v} (${L.length})`); L.slice(0, process.env.ALL ? 999 : 6).forEach(x => console.log('   · ' + x)); });
  if (errs.length) console.log('erros na página:', errs.slice(0, 3).join(' | '));
  console.log(`inglês: ${res.visited} telas e abas · ${total} trecho(s) em português${LIMIT ? ` (limite ${LIMIT})` : ''}`);
  process.exit(errs.length || (LIMIT && total > LIMIT) ? 1 : 0);
})();
