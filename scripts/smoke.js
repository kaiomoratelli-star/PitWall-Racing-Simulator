// Teste do aplicativo real: abre o Electron, cria um universo, disputa corridas pela
// interface, salva, fecha; depois reabre e confere a continuidade do save.
// Uso: node scripts/smoke.js [caminho-do-exe]   (sem argumento usa o Electron do projeto)
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const exe = process.argv[2] || require('electron');
const appArgs = process.argv[2] ? [] : [path.join(__dirname, '..')];
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitwall-smoke-'));
const extra = process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu'] : [];
let failed = false;
for (const mode of ['test', 'verify']) {
  const t0 = Date.now();
  const shot = process.env.SMOKE_SHOT ? [`--smoke-shot=${process.env.SMOKE_SHOT}-${mode}.png`] : [];
  const r = spawnSync(exe, [...appArgs, `--smoke-${mode}`, `--data-dir=${dataDir}`, ...shot, ...extra], { encoding: 'utf8', timeout: 240000 });
  const resFile = path.join(dataDir, `smoke-${mode}.json`);
  const res = fs.existsSync(resFile) ? JSON.parse(fs.readFileSync(resFile, 'utf8')) : { ok: false, error: 'sem resultado; saída: ' + (r.stderr || '').slice(-800) };
  console.log(`[smoke ${mode}] ${res.ok ? 'OK' : 'FALHOU'} em ${((Date.now() - t0) / 1000).toFixed(1)}s (código ${r.status})`);
  (res.steps || []).forEach(s => console.log('   •', s));
  if (res.error) console.log('   erro:', res.error);
  if (res.fonts) console.log('   fontes carregadas:', [...new Set(res.fonts)].join(', ') || 'nenhuma');
  if (!res.ok || r.status !== 0) failed = true;
}
const saves = path.join(dataDir, 'saves');
console.log('arquivos de save:', fs.existsSync(saves) ? fs.readdirSync(saves).join(', ') : 'nenhum');
console.log('backups:', fs.existsSync(path.join(saves, 'backups')) ? fs.readdirSync(path.join(saves, 'backups')).length : 0);
const logf = path.join(dataDir, 'logs', 'pitwall.log');
if (fs.existsSync(logf)) { const L = fs.readFileSync(logf, 'utf8').trim().split('\n'); console.log(`log (${L.length} linhas), erros:`, L.filter(l => l.includes('[ERROR]')).length); L.filter(l => l.includes('[ERROR]')).slice(0, 5).forEach(l => console.log('   ', l)); }
process.exit(failed ? 1 : 0);
