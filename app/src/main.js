/* ============================================================
   PIT WALL — inicialização
   ============================================================ */
'use strict';

/* Testes automáticos do executável (usados no CI do Windows):
   --smoke-test cria um universo, simula corridas pela interface real e salva;
   --smoke-verify reabre o save e confere a continuidade. */
const Smoke = {
  async run(mode) {
    const out = { mode, ok: false, steps: [] };
    const step = (s) => { out.steps.push(s); Store.log('info', 'smoke: ' + s); };
    try {
      if (mode === 'test') {
        NC.mode = 'manager'; NC.teamId = (BASE.teams.find(t => t.id === 'williams') || BASE.teams[BASE.teams.length - 1]).id; NC.slot = 'slot3'; NC.seed = '2027';
        ACT.ncStart(); step('carreira criada (manager)');
        ACT.toWeekend(); ACT.fpSend({ dataset: { d: Career.lineup(G, G.player.teamId)[0].id } }); Practice.advance(G, 900); ACT.endPractice(); ACT.runQuali(); ACT.toStrategy(); ACT.startRace();
        ACT.raceSkip(); await ACT.finishWeekend(); step('GP 1 disputado pela interface');
        for (let i = 0; i < 3; i++) simulateRound();
        step(`${G.season.round} etapas concluídas`);
        for (const v of ['hub', 'standings', 'calendar', 'team', 'dev', 'finance', 'market', 'analysis', 'paddock', 'log', 'diag', 'history', 'news', 'inbox', 'saves', 'editor']) go(v);
        step('todas as telas renderizadas');
        const d = Diag.run(G); if (d.errors.length) throw new Error('diagnóstico: ' + d.errors.join('; '));
        await Store.saveGame('slot3', G); step('salvo em disco');
        out.round = G.season.round; out.seed = G.seed; out.balance = G.finances.balance;
        // modo observador
        G = Career.create(BASE, { mode: 'observer', seed: '99' }); for (let i = 0; i < 2; i++) simulateRound(); go('hub');
        step('observador: 2 etapas simuladas');
        out.ok = true;
      } else if (mode === 'verify') {
        const g = await Store.loadGame('slot3'); if (!g) throw new Error('save não encontrado');
        loadCareer(g); step(`save reaberto: etapa ${G.season.round}, semente ${G.seed}`);
        out.round = G.season.round; out.seed = G.seed;
        simulateRound(); step('continuou a temporada após reabrir');
        await Store.saveGame('slot3', G);
        out.ok = G.season.round >= 5;
      }
    } catch (e) { out.error = String(e && (e.stack || e.message) || e); }
    try { await document.fonts.ready; } catch (e) { /* sem API de fontes */ }
    out.fonts = ['Titillium Web', 'IBM Plex Mono'].filter(f => document.fonts && document.fonts.check(`700 16px "${f}"`) && [...document.fonts].some(x => x.family.replace(/"/g, '') === f && x.status === 'loaded'));
    Store.native.smokeDone(out);
  },
};

async function boot(hotData) {
  BASE = defaultDb();
  render(); // primeira tela imediata, sem esperar a nuvem
  if (typeof I18N !== 'undefined') I18N.firstRun();
  await Store.init();
  const saved = await Store.loadBaseDb();
  if (saved && saved.teams && saved.drivers && saved.tracks) { try { BASE = normalizeDb(saved); } catch (e) { BASE = buildDefaultDB(); } }
  await refreshSlots();
  if (Store.native) { Store.native.ready(); const smoke = await Store.native.smokeMode(); if (smoke) return Smoke.run(smoke); }
  if (hotData && hotData.G) { G = hotData.G; SLOT = hotData.SLOT || SLOT; RNG.state = G.rngState || RNG.state; UI.view = hotData.view || 'hub'; UI.params = hotData.params || {}; }
  render();
}

// atualização ao vivo do artefato: preserva a carreira aberta
if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
  window.claude.hot.snapshot(() => { if (G) G.rngState = RNG.state; return { G, SLOT, view: UI.view === 'race' ? 'race' : UI.view, params: UI.params }; });
}
const startApp = (d) => boot(d || {});
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(startApp);
else startApp(window.claude && window.claude.hot && window.claude.hot.data);
