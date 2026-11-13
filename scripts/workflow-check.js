// Guarda da publicação (0.9, E25; regra 7: instalador publicado nunca é trocado). Roda no npm test.
// Confere o windows.yml (overwrite_files false, conferência da release antes de publicar, ordem dos passos)
// e executa o passo "Conferir a release desta versão" com um gh falso em 3 cenários.
// Uso: node scripts/workflow-check.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const repo = path.join(__dirname, '..');
const y = require(path.join(repo, 'node_modules', 'js-yaml'));
const wf = y.load(fs.readFileSync(path.join(repo, '.github', 'workflows', 'windows.yml'), 'utf8'));
const steps = wf.jobs.windows.steps;

const rel = steps.find(s => s.id === 'rel');
const pub = steps.find(s => s.name === 'Publicar release');
if (pub.with.overwrite_files !== false) throw new Error('overwrite_files não é false');
if (steps.indexOf(rel) > steps.indexOf(pub) || steps.indexOf(steps.find(s => s.id === 'v')) > steps.indexOf(rel)) throw new Error('ordem dos passos errada');

const scenarios = [
  { name: 'release sem Setup', assets: '', changed: ['app/src/x.js'], expect: { code: 0, publish: 'true' } },
  { name: 'Setup publicado + jogo mudou', assets: 'PitWall-Racing-Simulator-Setup-0.9.0.exe', changed: ['app/src/x.js'], expect: { code: 1, publish: 'false' } },
  { name: 'Setup publicado + só docs', assets: 'PitWall-Racing-Simulator-Setup-0.9.0.exe', changed: ['docs/x.md'], expect: { code: 0, publish: 'false' } },
];
// No Windows, "bash" no PATH do cmd costuma ser o do WSL (que pode ficar esperando e travar o npm test):
// usa o Git Bash, o mesmo do runner do GitHub (shell: bash).
function findBash() {
  if (process.platform !== 'win32') return 'bash';
  const cands = [];
  const w = spawnSync('where', ['git'], { encoding: 'utf8', timeout: 10000 });
  (w.stdout || '').split(/\r?\n/).filter(Boolean).forEach(g => { const root = path.resolve(path.dirname(g), '..'); cands.push(path.join(root, 'bin', 'bash.exe'), path.join(root, 'usr', 'bin', 'bash.exe')); });
  [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')].filter(Boolean).forEach(p => cands.push(path.join(p, 'Git', 'bin', 'bash.exe')));
  return cands.find(c => fs.existsSync(c)) || null;
}
const BASH = findBash();
if (!BASH) { console.log('workflow-check: Git Bash não encontrado (instale o Git para Windows)'); process.exit(1); }
let bad = 0;
for (const sc of scenarios) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-ci-'));
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8', timeout: 30000 });
  git('init', '-q'); git('config', 'user.email', 'ci@example.invalid'); git('config', 'user.name', 'ci');
  fs.writeFileSync(path.join(dir, 'base.txt'), '1'); git('add', '.'); git('commit', '-qm', 'base');
  sc.changed.forEach(f => { fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), 'x'); });
  git('add', '.'); git('commit', '-qm', 'mudança');
  const bin = path.join(dir, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/bash\n${sc.assets ? `echo "${sc.assets}"` : 'exit 1'}\n`, { mode: 0o755 });
  const out = path.join(dir, 'out.txt'), sum = path.join(dir, 'sum.md');
  const script = rel.run.replace(/\$\{\{ github\.repository \}\}/g, 'dono/repo');
  const r = spawnSync(BASH, ['-c', script], { cwd: dir, encoding: 'utf8', timeout: 60000, env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, TAG: 'v0.9.0', GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: sum } });
  const publish = (fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').match(/publish=(\w+)/);
  const ok = r.status === sc.expect.code && publish && publish[1] === sc.expect.publish;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'ERRO'} ${sc.name}: código ${r.status}, publish=${publish && publish[1]} ${(String(r.stdout || '') + String(r.stderr || '') + (r.error ? r.error.message : '')).trim().split('\n').pop()}`);
  fs.rmSync(dir, { recursive: true, force: true });
}
if (!bad) console.log(`workflow-check OK · ${steps.length} passos · publicação protegida nos 3 cenários`);
process.exit(bad ? 1 : 0);
