// Gera saves REAIS com o código de versões publicadas (para o teste de compatibilidade de saves).
// Para cada versão: uma carreira de Manager parada entre etapas (1,5 temporada) e outra parada no meio da corrida.
// Os saves ficam em tests/saves/<versão>-<caso>.json.gz e entram no repositório (o CI usa sem precisar do histórico).
// Uso: node scripts/make-save-fixtures.js 0.8.4=85bcfdb 0.8.5=bd0c6dc 0.8.6=f7a95f7
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), zlib = require('zlib');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'tests', 'saves'); fs.mkdirSync(outDir, { recursive: true });
for (const arg of process.argv.slice(2)) {
  const [ver, ref] = arg.split('=');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitwall-old-'));
  execSync(`git archive ${ref} app/src app/data scripts/modules.js | tar -x -C ${dir}`, { cwd: root });
  const { core, data } = require(path.join(dir, 'scripts', 'modules.js'));
  const load = () => {
    const ctx = vm.createContext({ console, Math, JSON, Date, process });
    for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(dir, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
    vm.runInContext('this.API = { Career, Events, defaultDb, RNG, Owners: typeof Owners !== "undefined" ? Owners : null }', ctx);
    return ctx.API;
  };
  const cases = [
    { id: 'entre-etapas', team: 'williams', seed: 'fx-' + ver, rounds: 34, midRace: false },
    { id: 'meio-da-corrida', team: 'ferrari', seed: 'fx2-' + ver, rounds: 7, midRace: true },
  ];
  for (const c of cases) {
    const { Career, Events, defaultDb, RNG, Owners } = load();
    const G = Career.create(defaultDb(), { mode: 'manager', teamId: c.team, name: 'Teste', seed: c.seed });
    if (G.teamSetup && G.teamSetup.pending && Owners && Owners.autoSetup) Owners.autoSetup(G);
    for (let i = 0; i < c.rounds; i++) {
      if (Career.seasonOver(G)) Career.endSeason(G);
      Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G);
      G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, i % m.choices.length); });
    }
    if (c.midRace) { if (Career.seasonOver(G)) Career.endSeason(G); Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); for (let l = 0; l < 20; l++) Career.stepRace(G); }
    G.rngState = RNG.state; G.savedAt = Date.now();
    const file = path.join(outDir, `${ver}-${c.id}.json.gz`);
    fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(G), { level: 9 }));
    console.log(`${ver} ${c.id}: ${G.season.year} etapa ${G.season.round}${G.weekend ? ' (no meio da corrida, volta ' + G.weekend.race.lap + ')' : ''} · ${Math.round(fs.statSync(file).size / 1024)} KB`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
