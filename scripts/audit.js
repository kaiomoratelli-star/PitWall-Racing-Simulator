// Auditoria de realismo e integridade (V0.8.2). Carrega o mesmo núcleo do jogo, sem interface.
// Uso:
//   node scripts/audit.js db                       → docs/DUPLICATAS.md e docs/VERIFICACAO-DATABASE.md
//   node scripts/audit.js sim <temporadas> [semente] [modo]  → docs/RELATORIO-SIMULACAO.md (acrescenta uma seção)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { core, data } = require('./modules');
const ROOT = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, JSON, Date, process });
for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
const run = (s) => vm.runInContext(s, ctx);
const today = new Date().toISOString().slice(0, 10);
const mode = process.argv[2] || 'db';

if (mode === 'db') {
  const out = run(`(() => {
    const G = Career.create(defaultDb(), { mode: 'observer', seed: 'audit' });
    const P = G.persons || { merged: [], review: [], renamed: [] };
    const D = typeof DRIVERDB_2026 !== 'undefined' ? DRIVERDB_2026 : null;
    const idx = Persons.index(G.db.drivers);
    const bySlug = new Map(G.db.drivers.filter(d => d.ddb).map(d => [d.ddb, d]));
    const where = (d) => d.team ? 'F1 ' + (Career.team(G, d.team) || {}).short + (d.seat === 'R' ? ' (reserva)' : '') : d.cat ? (Cats.get(G, d.cat) || {}).short || d.cat : d.series ? 'série ' + d.series : d.retired ? 'aposentado' : 'livre';
    const series = {};
    if (D) Object.entries(D.series).forEach(([sid, rows]) => {
      const cat = Cats.get(G, sid);
      const ids = new Set(cat ? cat.entries.map(e => e.did) : (sid === 'f1' ? G.db.drivers.filter(d => d.team).map(d => d.id) : G.db.drivers.filter(d => d.series === sid).map(d => d.id)));
      const r = { total: rows.length, ok: [], other: [], missing: [], extra: [], st: {} };
      rows.forEach(([slug, name, no, team, pts, pos]) => {
        const p = D.people[slug] || {};
        const d = bySlug.get(slug) || idx.find(p.name || name, { nat: p.nat || null });
        if (!d) r.missing.push(name + (pts ? ' (' + pts + ' pts)' : ''));
        else if (ids.has(d.id)) r.ok.push(name);
        else r.other.push(name + ' → ' + where(d));
      });
      if (cat) {
        const names = new Set(rows.map(x => Persons.key((D.people[x[0]] || {}).name || x[1])));
        cat.entries.forEach(e => { const d = Career.driver(G, e.did); r.st[e.st || '?'] = (r.st[e.st || '?'] || 0) + 1; if (d && !names.has(Persons.key(d.name)) && !(d.aliases || []).some(a => names.has(Persons.key(a)))) r.extra.push(d.name + ' [' + (Cats.STATUS[e.st] || 'sem status') + ']'); });
      }
      series[sid] = r;
    });
    const f1 = G.db.teams.flatMap(t => Career.lineup(G, t.id).map(d => [t.name, d.name, (d.seatStatus || {}).status || '—']));
    const act = G.db.drivers.filter(d => !d.retired && !d.dead);
    return { merged: P.merged, review: P.review || [], renamed: P.renamed || [], series, f1, conflicts: G.ddbConflicts || [], verified: D && D.verified,
      n: G.db.drivers.length, nAct: act.length, noDob: act.filter(d => !d.dob).length, regen: act.filter(d => d.regen).length, kart: act.filter(d => d.series === 'kart').length };
  })()`);
  const dup = `# Duplicatas de pilotos\n\nGerado por \`scripts/audit.js db\` em ${today}, numa carreira nova (semente "audit"). Regra em \`app/src/persons.js\`: só une com nome compatível (forma canônica, apelidos e transliterações) **e** sem conflito (QID do Wikidata, nascimento, nacionalidade, idade possível, Jr./Sr.). Homônimos sem evidência ficam separados.\n\n## Confirmadas e unificadas (${out.merged.length})\n| Ficou | Saiu (apelido) | Evidência |\n|---|---|---|\n${out.merged.map(m => `| ${m.name} (\`${m.keep}\`) | ${m.alias} (\`${m.drop}\`) | ${m.why} |`).join('\n') || '| — | — | — |'}\n\nAs duplicatas também são evitadas na importação: as categorias e a base do DriverDB procuram a pessoa pelo mesmo índice antes de criar um registro.\n\n## Revisão manual: mesmo sobrenome e nacionalidade, primeiro nome parecido (${out.review.length})\nNão foram unidas: sem evidência de que sejam a mesma pessoa.\n\n| Registro 1 | Registro 2 | País |\n|---|---|---|\n${out.review.map(r => `| ${r.an} (\`${r.a}\`) | ${r.bn} (\`${r.b}\`) | ${r.nat} |`).join('\n') || '| — | — | — |'}\n\n## Pilotos gerados renomeados (${out.renamed.length})\n${out.renamed.map(r => `- ${r.from} → ${r.to}`).join('\n') || '- nenhum'}\n`;
  fs.writeFileSync(path.join(ROOT, 'docs', 'DUPLICATAS.md'), dup);
  const NAMES = { f1: 'Fórmula 1', f2: 'Fórmula 2', f3: 'Fórmula 3', fe: 'Fórmula E', indycar: 'IndyCar', wec: 'WEC', dtm: 'DTM', nascup: 'NASCAR Cup', stockcar: 'Stock Car', sf: 'Super Formula', f1a: 'F1 Academy', freca: 'FRECA', f4it: 'F4 Itália', f4es: 'F4 Espanha', f4br: 'F4 Brasil', e4: 'Eurocup-4', frj: 'Fórmula Regional Japão', sfl: 'Super Formula Lights', nastr: 'NASCAR Trucks', supercars: 'Supercars', eurocup3: 'Eurocup-3', fws: 'Formula Winter Series' };
  const rows = Object.entries(out.series).map(([sid, r]) => `| ${NAMES[sid] || sid} | ${r.total} | ${r.ok.length} | ${r.other.length} | ${r.missing.length} | ${r.extra.length} | ${Object.entries(r.st).map(([k, v]) => `${k} ${v}`).join(', ') || '—'} |`).join('\n');
  const det = Object.entries(out.series).map(([sid, r]) => `### ${NAMES[sid] || sid}\n- **Fora do jogo (${r.missing.length}):** ${r.missing.join(', ') || 'nenhum'}\n- **No jogo em outra série (${r.other.length}):** ${r.other.join('; ') || 'nenhum'}\n- **No grid do jogo sem constar da classificação 2026 do DriverDB (${r.extra.length}):** ${r.extra.join('; ') || 'nenhum'}`).join('\n\n');
  const ver = `# Verificação da database (DriverDB, 2026)\n\nGerado por \`scripts/audit.js db\` em ${today}. Fonte de conferência: DriverDB (classificações de 2026 e perfis), baixado em ${out.verified || '—'} por \`scripts/import_driverdb.py\`. A base do jogo continua vindo da Wikipedia/Wikidata e do f1db; o DriverDB só preenche o que falta (apelidos, nascimento, nacionalidade, foto) e é comparado aqui.\n\nComo ler:\n- **Fora do jogo:** quem pontuou ou largou em 2026 e não existe no universo. Normalmente são pilotos de meio período, convidados ou pilotos de classes que o jogo não simula (WEC LMGT3, por exemplo).\n- **No jogo em outra série:** quem corre mais de uma série; no jogo, cada pessoa tem uma categoria principal.\n- **Status das vagas de 2027:** anunciado (a fonte lista para 2027), grid2026 (correu em 2026, 2027 a confirmar), projeção (o jogo preencheu com piloto real livre) ou gerado (piloto fictício, só sem alternativa real).\n\nUniverso: ${out.n} pilotos (${out.nAct} ativos: ${out.regen} gerados pelo jogo, dos quais ${out.kart} no kart). **${out.noDob} ativos sem data de nascimento.**\n\n| Série | DriverDB 2026 | No grid certo | Em outra série | Fora do jogo | Grid sem DriverDB | Status das vagas de 2027 |\n|---|---|---|---|---|---|---|\n${rows}\n\n## F1 2027 (grid inicial do jogo)\n| Equipe | Piloto | Situação na fonte |\n|---|---|---|\n${out.f1.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} |`).join('\n')}\n\n## Nascimento divergente entre Wikipedia/Wikidata e DriverDB (${out.conflicts.length})\nNão corrigido automaticamente: o jogo mantém a data da Wikipedia/Wikidata e lista a diferença para revisão.\n\n| Piloto | Jogo | DriverDB |\n|---|---|---|\n${out.conflicts.map(c => `| ${c.name} | ${c.game} | ${c.ddb} |`).join('\n') || '| — | — | — |'}\n\n## Detalhe por série\n${det}\n`;
  fs.writeFileSync(path.join(ROOT, 'docs', 'VERIFICACAO-DATABASE.md'), ver);
  console.log(`duplicatas unificadas ${out.merged.length}, revisão ${out.review.length}; séries conferidas ${Object.keys(out.series).length}; conflitos de nascimento ${out.conflicts.length}; ativos sem nascimento ${out.noDob}`);
}

if (mode === 'sim') {
  const seasons = +(process.argv[3] || 10), seed = process.argv[4] || '1', gm = process.argv[5] || 'observer';
  ctx.SEASONS = seasons; ctx.SEED = seed; ctx.MODE = gm;
  const t0 = Date.now();
  const rows = run(`(() => {
    const G = Career.create(defaultDb(), { mode: MODE, teamId: 'williams', name: 'Auditoria', seed: SEED });
    const out = [];
    for (let s = 0; s < SEASONS; s++) {
      while (!Career.seasonOver(G)) { Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G); G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, 0); }); }
      const win = new Set(), pod = new Set();
      G.season.results.forEach(r => r.cls.slice(0, 3).forEach((x, i) => { pod.add(x.tid); if (i === 0) win.add(x.tid); }));
      const cars = G.db.teams.map(t => Engine.carRating(G.db, t)); const m = cars.reduce((a, b) => a + b, 0) / cars.length;
      const sd = Math.sqrt(cars.reduce((a, b) => a + (b - m) ** 2, 0) / cars.length);
      const act = G.db.drivers.filter(d => !d.retired && !d.dead);
      const f1 = G.db.drivers.filter(d => d.team && d.seat !== 'R').map(driverOverall).sort((a, b) => a - b);
      const f1n90 = f1.filter(v => v >= 90).length;
      const tiers = typeof Talent !== 'undefined' ? Talent.census(G) : {};
      const spent = G.db.teams.map(t => G.player.teamId === t.id ? G.finances.spent : (t.spent || 0));
      const y = G.season.year;
      const dups = DriverDB.duplicates(G).length;
      const sum = Career.endSeason(G);
      out.push({ y, champ: sum.championName + ' / ' + sum.constructorName, win: win.size, pod: pod.size, sd: +sd.toFixed(2), cmin: +Math.min(...cars).toFixed(1), cmax: +Math.max(...cars).toFixed(1),
        n90: act.filter(d => driverOverall(d) >= 90).length, n85: act.filter(d => driverOverall(d) >= 85).length, pot90: act.filter(d => (d.potential || 0) >= 90).length, act: act.length,
        f1med: f1[Math.floor(f1.length / 2)], f1min: f1[0], f1n90, gen: tiers.geracional || 0, acima: tiers.acima || 0, spentMin: Math.round(Math.min(...spent)), spentMax: Math.round(Math.max(...spent)),
        cashMax: Math.round(Math.max(...G.db.teams.map(t => t.cash || 0))), cashMin: Math.round(Math.min(...G.db.teams.map(t => t.cash || 0))), corp: Math.round(G.db.teams.reduce((a, t) => a + (t.corporate || 0), 0)),
        breaches: (G.capBreaches || []).filter(b => b.y === y).length, dups, diag: Diag.run(G).errors.length });
    }
    return out;
  })()`);
  const tab = `| Ano | Campeões | Equipes vencedoras | Equipes no pódio | Desvio carros | Carro pior–melhor | Ativos ≥90 | Ativos ≥85 | Potencial ≥90 | Ativos | F1 ≥90 | Geracionais / acima da média vivos | F1 mediana / pior | Gasto no teto (mín–máx) | Caixa (mín–máx) | Patrimônio somado | Estouros do teto | Duplicatas | Erros |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n` +
    rows.map(r => `| ${r.y} | ${r.champ} | ${r.win} | ${r.pod} | ${r.sd} | ${r.cmin}–${r.cmax} | ${r.n90} | ${r.n85} | ${r.pot90} | ${r.act} | ${r.f1n90} | ${r.gen} / ${r.acima} | ${r.f1med} / ${r.f1min} | ${r.spentMin}–${r.spentMax} | ${r.cashMin}–${r.cashMax} | ${r.corp} | ${r.breaches} | ${r.dups} | ${r.diag} |`).join('\n');
  const f = path.join(ROOT, 'docs', 'RELATORIO-SIMULACAO.md');
  const head = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : `# Relatório de simulações longas\n\nGerado por \`scripts/audit.js sim\`. Cada seção é uma carreira simulada do início ao fim, sem interface, com a mesma semente reproduzível. Os números servem para comparar versões: carros que convergem, talentos inflando, dinheiro sem controle, duplicatas e erros de integridade.\n`;
  fs.writeFileSync(f, head + `\n## ${seasons} temporadas · semente ${seed} · modo ${gm} · ${today} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n\n${tab}\n`);
  rows.forEach(r => console.log(JSON.stringify(r)));
}
