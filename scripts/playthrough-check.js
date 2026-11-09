// Teste de funcionalidade "como jogador": joga temporadas inteiras pela interface do jogo construído
// (app/dist/index.html) e confere a integridade dos dados a cada etapa.
// - Abre cada tela do fim de semana (treino, classificação, corrida ao vivo, pole, pódio, pós-corrida, análise).
// - Usa as ações do jogador: ordens de rádio, troca de peça do motor, conversa com os pilotos, cartas com escolha,
//   política de equipe, parceria técnica, salvar e carregar.
// - Confere: dois titulares por equipe, sem piloto repetido, pontos por etapa = total, dinheiro e carro sem NaN,
//   posições 1..n sem buraco, nenhum erro na interface.
// Uso: node scripts/playthrough-check.js [temporadas=1] [equipe=mclaren]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const seasons = +(process.argv[2] || 1), team = process.argv[3] || 'mclaren';
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pg.addInitScript(() => { try { localStorage.setItem('pitwall-ui85', JSON.stringify({ theme: 'dark', nav: 'side', motion: 'off' })); } catch (e) {} });
  const pageErrors = []; pg.on('pageerror', e => pageErrors.push(e.message));
  await pg.goto('file://' + path.join(__dirname, '..', 'app', 'dist', 'index.html')); await pg.waitForTimeout(600);
  const res = await pg.evaluate(async ({ seasons, team }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const fails = []; const steps = []; const cnt = { rounds: 0, screens: 0, talks: 0, mails: 0, radio: 0, swaps: 0, saves: 0 };
    const fail = (m) => { if (fails.length < 40) fails.push(m); };
    const view = async (v, p) => { try { go(v, p || {}); cnt.screens++; await sleep(5); } catch (e) { fail(`tela ${v}: ${e.message}`); } };
    const finite = (x) => typeof x === 'number' && isFinite(x);
    const check = (where) => {
      const s = G.season;
      G.db.teams.forEach(t => {
        const race = G.db.drivers.filter(d => d.team === t.id && d.seat !== 'R' && !d.retired);
        if (race.length !== 2) fail(`${where}: ${t.name} com ${race.length} titulares`);
        if (new Set(race.map(d => String(d.seat))).size !== race.length) fail(`${where}: ${t.name} com carro repetido`);
        Object.entries(t.car || {}).forEach(([k, v]) => { if (typeof v === 'number' && !finite(v)) fail(`${where}: carro da ${t.name}.${k} = ${v}`); });
      });
      ['balance', 'spent'].forEach(k => { if (!finite(G.finances[k])) fail(`${where}: finanças.${k} = ${G.finances[k]}`); });
      // pontos por etapa (corrida + sprint + bônus) = total
      const tot = {};
      s.results.forEach(r => { r.cls.forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); (r.sprint || []).forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); (r.bonus || []).forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); });
      Object.entries(s.standD).forEach(([did, p]) => { if (Math.abs((tot[did] || 0) - p) > 0.01) fail(`${where}: pontos de ${did} ${p} ≠ soma das etapas ${tot[did] || 0}`); });
      s.results.forEach(r => { const pos = r.cls.map(x => x.pos).sort((a, b) => a - b); if (pos.some((p, i) => p !== i + 1)) fail(`${where}: posições com buraco no ${r.gp}`); });
      if ((UI.errors || []).length) { fail(`${where}: erro na interface: ${UI.errors.map(e => e.msg).join('; ')}`); UI.errors = []; }
    };
    try { closeModal(); } catch (e) {}
    NC.mode = 'manager'; NC.teamId = team; NC.slot = 'slot1'; NC.seed = 'playthrough'; NC.name = 'Teste'; ACT.ncStart();
    if (G.teamSetup && G.teamSetup.pending) Owners.autoSetup(G);
    steps.push(`carreira criada: ${Career.team(G).name}, ${G.season.year}`);
    for (let y = 0; y < seasons; y++) {
      while (!Career.seasonOver(G)) {
        const r = G.season.round;
        await view('hub'); await view('inbox'); await view('calendar', { tab: 'etapas' });
        // fim de semana
        Career.startWeekend(G); await view('weekend');
        if (r % 4 === 1) { const d = Career.lineup(G, G.player.teamId)[0]; const k = ['ice', 'gbx', 'es'][r % 3]; try { ACT.puSwap86({ dataset: { d: d.id, k } }); cnt.swaps++; } catch (e) { fail(`troca de peça: ${e.message}`); } }
        Career.finishPractice(G); Career.runQualifying(G); await view('pole');
        Career.startRace(G); UI.racePaused = true; await view('race');
        const race = G.weekend.race;
        let lap = 0;
        while (!race.finished && lap++ < 400) {
          Career.stepRace(G);
          if (lap === 6 || lap === 20) { const mine = race.cars.filter(c => c.tid === G.player.teamId && c.status === 'run'); if (mine[0]) { try { ACT.radio85({ dataset: { d: mine[0].did, o: lap === 6 ? 'attack' : 'letBy' } }); cnt.radio++; } catch (e) { fail(`rádio: ${e.message}`); } } }
          if (lap % 15 === 0) { try { updateRace(); } catch (e) { fail(`atualizar corrida: ${e.message}`); } }
        }
        Career.finishWeekend(G);
        await view('podium'); await view('post'); await view('analysis', { tab: 'laps' }); await view('standings'); await view('finance'); await view('car'); await view('cases');
        // decisões do jogador
        Career.teamDrivers(G, G.player.teamId).filter(d => d.seat !== 'R').forEach(d => { const t = Talks.start(G, d.id); if (t) { const o = t.opts[(r + d.id.length) % t.opts.length]; if (Talks.answer(G, d.id, t.topic, o.k)) cnt.talks++; } });
        G.inbox.forEach(m => { if (m.choices && m.resolved == null) { try { Events.resolve(G, m.id, (r + m.choices.length) % m.choices.length); cnt.mails++; } catch (e) { fail(`carta "${m.title}": ${e.message}`); } } });
        if (r === 3) Orders.setNo1(G, Career.lineup(G, G.player.teamId)[0].id);
        if (r === 8) Orders.setNo1(G, null);
        if (G.weekend) { try { Career.nextRound && Career.nextRound(G); } catch (e) { /* o fluxo novo não precisa */ } }
        check(`${G.season.year} etapa ${r + 1}`); cnt.rounds++;
        // salvar e carregar no meio da temporada
        if (r === 5) {
          const before = JSON.stringify({ r: G.season.round, b: G.finances.balance, s: G.season.standD });
          try { const how = await Store.saveGame('slot9', G); if (how === 'full') { steps.push(`aviso: no navegador o save de ${Math.round(JSON.stringify(G).length / 1024)} KB passa do limite de ~5 MB (no aplicativo vai para o disco)`); } else { const L = await Store.loadGame('slot9'); if (!L) fail(`salvar/carregar: nada voltou (gravação: ${how}, tamanho ${Math.round(JSON.stringify(G).length / 1024)} KB)`); else { const after = JSON.stringify({ r: L.season.round, b: L.finances.balance, s: L.season.standD }); if (before !== after) fail(`salvar/carregar mudou o jogo (gravação: ${how}): ${before.slice(0, 120)} ≠ ${after.slice(0, 120)}`); else cnt.saves++; } } } catch (e) { fail(`salvar/carregar: ${e.message}`); }
        }
      }
      const champ = Career.standingsD(G)[0];
      steps.push(`${G.season.year}: campeão ${Career.driver(G, champ.did).name} (${champ.pts}) · ${cnt.rounds} etapas até aqui`);
      await view('seasons'); await view('history');
      Career.endSeason(G); check(`virada para ${G.season.year}`);
    }
    // telas de todas as áreas no fim
    for (const a of AREAS85) for (const t of a[3]) { if (t[3] && !t[3]()) continue; await view(t[0], t[2] || {}); }
    check('fim');
    return { fails, steps, cnt };
  }, { seasons, team });
  res.steps.forEach(s => console.log('  •', s));
  console.log(`  ${res.cnt.rounds} etapas · ${res.cnt.screens} telas abertas · ${res.cnt.talks} conversas · ${res.cnt.mails} cartas decididas · ${res.cnt.radio} ordens de rádio · ${res.cnt.swaps} trocas de peça · ${res.cnt.saves} salvar/carregar`);
  const all = res.fails.concat(pageErrors.map(e => 'erro de página: ' + e));
  if (all.length) { console.log(`FALHOU (${all.length}):`); all.forEach(f => console.log('  ✗', f)); }
  else console.log('OK');
  await b.close(); process.exit(all.length ? 1 : 0);
})();
