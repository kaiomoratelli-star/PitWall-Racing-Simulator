// Jogo base fictício (0.9, Onda 3): o jogo inteiro precisa funcionar SEM nenhum dado real (edição gratuita).
// 1) núcleo: carrega só app/src/core (sem app/data) e joga N temporadas no Manager e no Observador;
// 2) interface: build --edicao=ficticia (regra 19: o banco de dados original com os nomes trocados), visita todas as
//    telas (lista do ui85-check) nos dois modos, sem nenhum nome real de pessoa, equipe ou marca na tela,
//    sem erro de página, sem erro registrado pela interface e sem "undefined", "NaN" ou "[object Object]".
// Depois refaz o build normal. Uso: node scripts/fictional-check.js [temporadas=3]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const seasons = +(process.argv[2] || 3);
const { core } = require('./modules');
const where = (e) => String(e.stack).split('\n')[1].trim();
const bad = [];

// 1) núcleo
for (const mode of ['manager', 'observer']) {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  try {
    for (const m of core) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
    vm.runInContext('this.API = { Career, defaultDb, Owners: typeof Owners !== "undefined" ? Owners : null }', ctx);
    const { Career, defaultDb, Owners } = ctx.API;
    const db = defaultDb();
    if (db.real) bad.push(`núcleo/${mode}: o mundo sem dados reais veio marcado como real`);
    const G = Career.create(db, { mode, teamId: db.teams[0].id, name: 'Teste', seed: 'ficticio-' + mode });
    if (G.teamSetup && G.teamSetup.pending && Owners && Owners.autoSetup) Owners.autoSetup(G);
    let n = 0;
    for (let s = 0; s < seasons; s++) {
      while (!Career.seasonOver(G) && n < 400) { Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G); n++; }
      Career.endSeason(G);
    }
    console.log(`núcleo/${mode}: ${db.teams.length} equipes, ${db.drivers.length} pilotos, ${n} etapas em ${seasons} temporadas · campeões ${G.history.map(h => h.champion).join(', ')}`);
  } catch (e) { bad.push(`núcleo/${mode}: ${e.message} @ ${where(e)}`); }
}

// 2) interface
const build = (args) => execFileSync(process.execPath, [path.join(__dirname, 'build.js'), ...args], { cwd: root, encoding: 'utf8' });
// (passo 5, regra 19) nomes reais que nenhuma tela da edição fictícia pode mostrar: pessoas, equipes, marcas, motores,
// competições e as listas do mundo real (veículos, criadores, montadoras, pneus)
const REALP = require('./make-data-pack').buildPack().content;
const GEN = require('./make-fictional-pack').buildFictionalPack().GENERIC;
// palavras comuns: as que o código do jogo escreve em minúsculas ('marca'): um nome de uma palavra que também é palavra comum não conta
const CODE_WORDS = new Set();
for (const m of [...core, ...require('./modules').ui]) (fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8').match(/\p{Ll}+/gu) || []).forEach(w => CODE_WORDS.add(w));
const isName = (n) => typeof n === 'string' && n.length >= 5 && (n.match(/\p{L}+/gu) || []).some(w => !GEN.has(w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));
const REAL_NAMES = [...new Set([
  ...REALP.REAL_DB.drivers.map(d => d.name), ...REALP.REAL_DB.teams.flatMap(t => [t.name, t.fullName, t.principal]),
  ...REALP.REAL_DB.engines.map(e => e.name), ...REALP.REAL_CATS.cats.flatMap(c => [c.name, ...c.teams.map(t => t.name), ...c.drivers.map(d => d.name)]),
  ...Object.values(REALP.WORLD_LISTS.outlets).map(o => o.name), ...REALP.WORLD_LISTS.creators.map(c => c.name),
  ...REALP.WORLD_LISTS.mfrCands.map(m => m.name), ...Object.values(REALP.WORLD_LISTS.tyres).map(t => t.name),
].filter(isName))].filter(n => { const ws = n.match(/\p{L}+/gu) || []; return ws.length > 1 || !CODE_WORDS.has(ws[0].toLowerCase()); });
(async () => {
  build(['--edicao=ficticia']);
  try {
    const { chromium } = require('playwright');
    const VIEWS = require('./ui85-check-views.json');
    const b = await chromium.launch();
    for (const mode of ['manager', 'observer']) {
      const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
      const errs = []; p.on('pageerror', e => errs.push(e.message));
      // (passo 4) sem pacote: nenhuma imagem falha e nenhuma vem de packs/ ou é foto do mundo real
      const IMG_RE = /\.(webp|png|jpe?g|svg|gif|avif)(\?|$)/i, imgBad = [];
      p.on('requestfailed', q => { if (IMG_RE.test(q.url())) imgBad.push('imagem não encontrada: ' + q.url().replace(/^.*\/app\/dist\//, '')); });
      p.on('requestfinished', q => { const u = q.url().replace(/^.*\/app\/dist\//, ''); if (IMG_RE.test(u) && (u.startsWith('packs/') || (u.startsWith('assets/img/') && !u.startsWith('assets/img/brand/')))) imgBad.push('imagem do mundo real no jogo fictício: ' + u); });
      await p.goto('file://' + path.join(root, 'app', 'dist', 'index.html')); await p.waitForTimeout(300);
      const r = await p.evaluate(async ({ mode, VIEWS, REAL_NAMES }) => {
        const out = []; const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const BAD = /\bundefined\b|\bNaN\b|\[object Object\]/;
        const seenReal = new Set();
        try { closeModal(); } catch (e) { /* sem modal */ }
        if (!Pack.installed || Pack.installed.id !== 'pitwall-ficticio') out.push(`a edição fictícia devia instalar o pacote pitwall-ficticio (instalado: ${Pack.installed ? Pack.installed.id : 'nenhum'})`);
        G = Career.create(BASE, { mode, teamId: BASE.teams[0].id, seed: 'ficticio-ui', name: 'Teste' });
        if (G.teamSetup && G.teamSetup.pending && typeof Owners !== 'undefined' && Owners.autoSetup) Owners.autoSetup(G);
        for (let i = 0; i < 3; i++) simulateRound();
        const logged = () => (typeof UI !== 'undefined' && UI.errors ? UI.errors.length : 0);
        const before = logged();
        // telas da equipe do jogador: não existem no Observador (o menu não as mostra)
        const MANAGER_ONLY = new Set(['team', 'scout', 'sister', 'car', 'dev', 'facilities', 'finance', 'sponsors', 'board']);
        for (const v of VIEWS) {
          const [view, tab] = v.split(':');
          if (mode === 'observer' && MANAGER_ONLY.has(view)) continue;
          const params = tab ? { tab } : {};
          if (view === 'driverPage') params.id = (G.player.teamId ? Career.lineup(G, G.player.teamId)[0] : G.db.drivers.find(d => d.team)).id;
          if (view === 'teamPage') params.id = G.db.teams[0].id;
          if (view === 'circuit') params.id = G.season.calendar[0];
          try { go(view, params); } catch (e) { out.push(`${v}: ${e.message}`); continue; }
          await sleep(20);
          const txt = document.getElementById('app').innerText;
          const m = BAD.exec(txt); if (m) out.push(`${v}: "${txt.slice(Math.max(0, m.index - 50), m.index + 30).replace(/\s+/g, ' ')}"`);
          // lugares ficam reais (decisão do dono): circuito, GP e cidade saem do texto antes de procurar nomes
          let plain = txt; (G.db.tracks || []).forEach(tr => [tr.circuit, tr.gp, tr.place, tr.name].forEach(x => { if (x && x.length > 2) plain = plain.split(x).join(' '); }));
          for (const n of REAL_NAMES) if (!seenReal.has(n) && plain.includes(n)) { seenReal.add(n); out.push(`${v}: nome real "${n}" na tela`); }
        }
        if (logged() > before) out.push(`${logged() - before} erro(s) registrados pela interface: ${UI.errors.slice(before, before + 3).map(e => e.where + ': ' + e.msg).join(' | ')}`);
        return out;
      }, { mode, VIEWS, REAL_NAMES });
      r.forEach(x => bad.push(`interface/${mode}: ${x}`));
      errs.slice(0, 5).forEach(x => bad.push(`interface/${mode}: erro de página: ${x}`));
      [...new Set(imgBad)].slice(0, 5).forEach(x => bad.push(`interface/${mode}: ${x}`));
      console.log(`interface/${mode}: ${VIEWS.length} telas visitadas · ${r.length + errs.length} problema(s)`);
      await p.close();
    }
    // (passo 3) um save criado com os dados reais (0.8.7) não abre no jogo fictício: misturaria o mundo do save
    // com a falta do pacote. A tela recusa, avisa e o jogo aberto continua o mesmo; um save fictício abre normalmente.
    {
      const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
      const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto('file://' + path.join(root, 'app', 'dist', 'index.html')); await p.waitForTimeout(300);
      const old = require('zlib').gunzipSync(fs.readFileSync(path.join(root, 'tests', 'saves', '0.8.7-entre-etapas.json.gz'))).toString('utf8');
      const r = await p.evaluate(async (old) => {
        const out = [];
        try { closeModal(); } catch (e) { /* sem modal */ }
        G = Career.create(BASE, { mode: 'observer', seed: 'ficticio-save' });
        const mine = G, mineJson = JSON.stringify(G);
        if (!G.pack || G.pack.id !== 'pitwall-ficticio') out.push(`carreira fictícia com G.pack = ${JSON.stringify(G.pack)} (esperado pitwall-ficticio)`);
        const opened = loadCareer(JSON.parse(old));
        if (opened) out.push('o save da 0.8.7 (dados reais) abriu no jogo fictício');
        if (G !== mine) out.push('o jogo aberto foi trocado mesmo com o save recusado');
        const t = document.getElementById('toasts').innerText;
        if (!/Pacote de dados/.test(t)) out.push(`sem o aviso do Pacote de dados (avisos: "${t.slice(0, 160)}")`);
        if (!loadCareer(JSON.parse(mineJson))) out.push('um save fictício não abriu no jogo fictício');
        return out;
      }, old);
      r.forEach(x => bad.push(`save/pacote: ${x}`));
      errs.slice(0, 5).forEach(x => bad.push(`save/pacote: erro de página: ${x}`));
      console.log(`save/pacote: save da 0.8.7 recusado no jogo fictício · ${r.length + errs.length} problema(s)`);
      await p.close();
    }
    await b.close();
  } finally { build([]); }
  if (bad.length) { console.log(`fictional-check: ${bad.length} problema(s)`); bad.slice(0, 40).forEach(x => console.log('  ✗', x)); process.exit(1); }
  console.log('fictional-check OK · o jogo roda inteiro sem dados reais');
})();
