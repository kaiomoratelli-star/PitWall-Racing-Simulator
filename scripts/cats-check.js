// Verificação das outras categorias (sem interface):
// - na carreira nova, as etapas anteriores à data inicial do jogo já foram disputadas;
// - a cada dia do jogo, nenhuma categoria fica com etapa atrasada;
// - no fim do ano todas as etapas foram disputadas, há campeão e pontos de superlicença;
// - no ano seguinte, o calendário recomeça (inclusive a Fórmula E, que começa em dezembro).
// uso: node scripts/cats-check.js [temporadas=2] [semente=cats]
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const { core, data } = require('./modules');
const ctx = vm.createContext({ console, Math, JSON, Date, process });
for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
vm.runInContext('this.API = { Career, Events, Cats, Time, defaultDb }', ctx);
const { Career, Events, Cats, Time, defaultDb } = ctx.API;
const seasons = +(process.argv[2] || 2); const seed = process.argv[3] || 'cats';
let fails = 0; const fail = (m) => { fails++; console.log('   FALHA: ' + m); };

const late = (G) => { Time.init(G); return Cats.list(G).map(c => { const s = c.season || { cal: [], next: 0 }; return { id: c.id, next: s.next, due: s.cal.filter(e => e.date <= G.today).length, total: s.cal.length }; }).filter(x => x.next < x.due); };
for (const mode of ['manager', 'observer']) {
  const G = Career.create(defaultDb(), { mode, teamId: 'aston-martin', name: 'Teste', seed });
  if (!Cats.on(G)) { fail(`[${mode}] categorias desligadas`); continue; }
  Time.init(G);
  const started = Cats.list(G).filter(c => c.season && c.season.next > 0).map(c => `${c.short || c.id} ${c.season.next}`);
  console.log(`[${mode}] início ${G.today}: ${Cats.list(G).length} categorias; já com etapas disputadas: ${started.join(', ') || 'nenhuma'}`);
  const l0 = late(G); if (l0.length) fail(`[${mode}] atrasadas no início: ${l0.map(x => x.id + ' ' + x.next + '/' + x.due).join(', ')}`);
  for (let s = 0; s < seasons; s++) {
    let worst = 0;
    while (!Career.seasonOver(G)) {
      Career.startWeekend(G);
      const l = late(G); if (l.length) { worst++; if (worst <= 3) fail(`[${mode}] ${G.today}: atrasadas ${l.map(x => x.id + ' ' + x.next + '/' + x.due).join(', ')}`); }
      Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G);
      G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, 0); });
    }
    const y = G.season.year;
    // antes de fechar o ano: tudo o que estava marcado até 31/12 precisa acontecer no fechamento
    Career.endSeason(G);
    const done = Cats.list(G).map(c => { const a = (c.archive || []).filter(x => x.sim && x.y === y)[0]; return { id: c.id, ok: !!a, ev: a ? a.events : 0, champ: a && a.top[0] ? a.top[0][2] : null }; });
    const miss = done.filter(x => !x.ok);
    console.log(`[${mode}] ${y}: ${done.length - miss.length}/${done.length} categorias com campeão simulado · ${done.slice(0, 6).map(x => `${x.id}: ${x.champ} (${x.ev} etapas)`).join(' · ')}…`);
    if (miss.length) fail(`[${mode}] ${y} sem campeão: ${miss.map(x => x.id).join(', ')}`);
    const fe = Cats.get(G, 'fe');
    if (fe && fe.season) console.log(`[${mode}] FE ${G.season.year} começa em ${(fe.season.cal[0] || {}).date}`);
  }
}
console.log(fails ? `FALHOU (${fails})` : 'OK');
process.exit(fails ? 1 : 0);
