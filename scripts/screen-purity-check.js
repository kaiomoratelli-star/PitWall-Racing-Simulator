// Regra 6 do dono: uma tela nunca muda a simulação ao ser desenhada. O guarda do sorteio (pureHtml) devolve o
// RNG se uma tela sortear, mas não desfaz o que ela criou no jogo (ex.: a tela de Olheiros criava o departamento,
// com nomes sorteados, antes da simulação; o resto da carreira saía diferente conforme o jogador abria a tela).
// Este teste joga a mesma carreira duas vezes, com a mesma semente: uma abre TODAS as telas e abas antes do
// primeiro GP e entre as etapas; a outra não abre nenhuma. As duas precisam terminar idênticas.
// Uso: node scripts/build.js && node scripts/screen-purity-check.js [etapas=3]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const ROUNDS = +(process.argv[2] || 3);
const VIEWS = require('./ui85-check-views.json');
const file = 'file://' + path.join(__dirname, '..', 'app', 'dist', 'index.html');

(async () => {
  const b = await chromium.launch();
  const bad = [];
  for (const [mode, team] of [['manager', 'cadillac'], ['manager', 'williams'], ['observer', null]]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(file); await p.waitForTimeout(300);
    const r = await p.evaluate(async ({ mode, team, ROUNDS, VIEWS }) => {
      const sleep = (ms) => new Promise(res => setTimeout(res, ms));
      try { closeModal(); } catch (e) { /* sem modal */ }
      const MANAGER_ONLY = new Set(['team', 'scout', 'sister', 'car', 'dev', 'facilities', 'finance', 'sponsors', 'board']);
      // fora da comparação: horários e "read" (mensagem lida). Abrir a caixa de entrada é ler as mensagens, uma ação
      // do jogador; o campo só pausa o avanço da Manager (Time.blockers) e não muda nenhum resultado.
      const hash = () => JSON.stringify(G, (k, v) => (k === 'createdAt' || k === 'savedAt' || k === 'read' ? undefined : v));
      const visitAll = async () => {
        const out = [];
        for (const v of VIEWS) {
          const [view, tab] = v.split(':');
          if (mode === 'observer' && MANAGER_ONLY.has(view)) continue;
          const params = tab ? { tab } : {};
          if (view === 'driverPage') params.id = (G.player.teamId ? Career.lineup(G, G.player.teamId)[0] : G.db.drivers.find(d => d.team)).id;
          if (view === 'teamPage') params.id = G.db.teams[0].id;
          if (view === 'circuit') params.id = G.season.calendar[0];
          try { go(view, params); } catch (e) { out.push(`${v}: ${e.message}`); }
          await sleep(5);
        }
        go('hub');
        return out;
      };
      const play = async (render) => {
        G = Career.create(BASE, { mode, teamId: team || undefined, seed: 'pureza-' + mode + '-' + team, name: 'Teste' });
        if (G.teamSetup && G.teamSetup.pending && typeof Owners !== 'undefined' && Owners.autoSetup) Owners.autoSetup(G);
        const errors = [];
        if (render) errors.push(...await visitAll());
        for (let i = 0; i < ROUNDS; i++) { simulateRound(); if (render) errors.push(...await visitAll()); }
        return { h: hash(), errors };
      };
      UI.strictRng = false;   // aqui o que se mede é o efeito que fica no jogo, não o sorteio devolvido
      const quiet = await play(false);
      const seen = await play(true);
      let firstDiff = null;
      if (quiet.h !== seen.h) {
        // os primeiros caminhos que diferem (ex.: db.drivers.12.form), para achar a tela culpada
        const paths = [];
        const walk = (x, y, at) => {
          if (paths.length >= 6) return;
          if (JSON.stringify(x) === JSON.stringify(y)) return;
          if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], at ? at + '.' + k : k); return; }
          paths.push(`${at} (${JSON.stringify(x === undefined ? 'ausente' : x).slice(0, 50)} × ${JSON.stringify(y === undefined ? 'ausente' : y).slice(0, 50)})`);
        };
        walk(JSON.parse(quiet.h), JSON.parse(seen.h), '');
        // mesmo conteúdo, ordem diferente: algo foi criado em outro momento (o save e a assinatura mudam)
        const order = (x, y, at) => {
          if (paths.length >= 6 || !x || !y || typeof x !== 'object' || typeof y !== 'object') return;
          const kx = Object.keys(x).join(','), ky = Object.keys(y).join(',');
          if (kx !== ky && !Array.isArray(x)) { const i = Object.keys(x).findIndex((k, j) => k !== Object.keys(y)[j]); paths.push(`${at || '(raiz)'}: ordem das chaves (${Object.keys(x)[i]} × ${Object.keys(y)[i]})`); return; }
          for (const k of Object.keys(x)) order(x[k], y[k], at ? at + '.' + k : k);
        };
        if (!paths.length) order(JSON.parse(quiet.h), JSON.parse(seen.h), '');
        firstDiff = paths;
      }
      return { same: quiet.h === seen.h, firstDiff, errors: seen.errors.slice(0, 5), leaks: (UI.rngLeaks || []).slice(), undone: (UI.drawLeaks || []).slice() };
    }, { mode, team, ROUNDS, VIEWS });
    const tag = `${mode}${team ? '/' + team : ''}`;
    if (!r.same) bad.push(`${tag}: abrir as telas mudou a simulação (campos diferentes: ${r.firstDiff.join(', ')})`);
    r.leaks.forEach(x => bad.push(`${tag}: a tela ${x} sorteou ao desenhar`));
    r.errors.forEach(x => bad.push(`${tag}: ${x}`));
    errs.slice(0, 5).forEach(x => bad.push(`${tag}: erro de página: ${x}`));
    console.log(`${tag}: ${VIEWS.length} telas abertas antes do 1º GP e entre ${ROUNDS} etapas · ${r.same ? 'simulação idêntica' : 'SIMULAÇÃO DIFERENTE'} · ${r.undone.length} criação(ões) desfeita(s) pela rede do pureHtml${r.undone.length ? ' (' + r.undone.slice(0, 4).join('; ') + ')' : ''}`);
    await p.close();
  }
  await b.close();
  if (bad.length) { console.log(`screen-purity-check: ${bad.length} problema(s)`); bad.forEach(x => console.log('  ✗', x)); process.exit(1); }
  console.log('screen-purity-check OK · abrir telas não muda a simulação');
})();
