// Software sempre atualizado (regra 18 do dono, E58). Roda no CI, não no npm test do dia a dia (precisa de internet).
//   a) FALHA se o Node (.nvmrc / engines) ou a linha do Electron estiverem fora de suporte (endoflife.date);
//   b) FALHA se alguma dependência tiver aviso de segurança de nível moderado ou maior (npm audit);
//   c) AVISA se existir versão mais nova de alguma dependência (npm) ou major nova de alguma action do GitHub.
//      Com --release, os avisos do item c também falham ("atualize antes de lançar").
// Sem internet, a verificação não tem como confirmar nada: falha com --release e só avisa sem ele.
// Uso: node scripts/freshness-check.js [--release]
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = path.join(__dirname, '..');
const release = process.argv.includes('--release');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const errors = [], warns = [];
const UA = { 'User-Agent': 'pitwall-freshness-check', Accept: 'application/json' };
const get = async (url, headers = {}) => { const r = await fetch(url, { headers: { ...UA, ...headers } }); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); };
const today = new Date().toISOString().slice(0, 10);
const sh = (cmd) => { try { return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return e.stdout || ''; } };
const offline = (what, e) => (release ? errors : warns).push(`não foi possível conferir ${what} (${e.message})`);

(async () => {
  // a) suporte do Node e do Electron
  const nodeMajor = String(fs.readFileSync(path.join(root, '.nvmrc'), 'utf8')).trim().replace(/^v/, '').split('.')[0];
  const engMajor = String((pkg.engines || {}).node || '').match(/\d+/);
  if (!engMajor || engMajor[0] !== nodeMajor) errors.push(`engines.node (${(pkg.engines || {}).node}) não bate com o .nvmrc (${nodeMajor})`);
  const wf = fs.readFileSync(path.join(root, '.github', 'workflows', 'windows.yml'), 'utf8');
  if (/node-version:\s*\d/.test(wf)) errors.push('windows.yml fixa node-version; use node-version-file: .nvmrc');
  const elMajor = String(pkg.devDependencies.electron).split('.')[0];
  const eol = (c) => c.eol === true || (typeof c.eol === 'string' && c.eol <= today);
  try {
    const nodes = await get('https://endoflife.date/api/nodejs.json');
    const c = nodes.find(x => String(x.cycle) === nodeMajor);
    if (!c) errors.push(`Node ${nodeMajor} não aparece na lista de versões do Node`);
    else if (eol(c)) errors.push(`Node ${nodeMajor} está fora de suporte desde ${c.eol}`);
    else if (!c.lts) errors.push(`Node ${nodeMajor} não é LTS`);
    const newestLts = nodes.filter(x => x.lts && !eol(x) && (x.lts === true || x.lts <= today)).map(x => +x.cycle).sort((a, b) => b - a)[0];
    if (newestLts && newestLts > +nodeMajor) warns.push(`existe Node LTS mais novo: ${newestLts} (usado: ${nodeMajor})`);
  } catch (e) { offline('o suporte do Node', e); }
  try {
    const els = await get('https://endoflife.date/api/electron.json');
    const c = els.find(x => String(x.cycle) === elMajor);
    if (!c) errors.push(`Electron ${elMajor} não aparece na lista de versões do Electron`);
    else if (eol(c)) errors.push(`Electron ${elMajor} está fora de suporte desde ${c.eol}`);
  } catch (e) { offline('o suporte do Electron', e); }

  // b) avisos de segurança
  const audit = sh('npm audit --json');
  try {
    const v = (JSON.parse(audit).metadata || {}).vulnerabilities || {};
    const n = (v.moderate || 0) + (v.high || 0) + (v.critical || 0);
    if (n) errors.push(`npm audit: ${n} aviso(s) de segurança moderado ou maior (rode npm audit)`);
  } catch (e) { offline('os avisos de segurança', e); }

  // c) versões novas: dependências do npm
  try {
    const out = JSON.parse(sh('npm outdated --json') || '{}');
    Object.entries(out).forEach(([name, o]) => { if (o.latest && o.current !== o.latest) warns.push(`${name} ${o.current || o.wanted} → ${o.latest}`); });
  } catch (e) { offline('as versões do npm', e); }
  Object.entries(pkg.devDependencies).forEach(([n, v]) => { if (!/^\d+\.\d+\.\d+$/.test(v)) errors.push(`${n} "${v}" sem versão exata (sem ^ ou ~)`); });
  // c) versões novas: actions do GitHub (major usada × major da última release)
  const uses = [...new Set([...wf.matchAll(/uses:\s*([\w.-]+\/[\w.-]+)@v(\d+)/g)].map(m => `${m[1]}@${m[2]}`))];
  for (const u of uses) {
    const [repo, major] = u.split('@');
    try {
      const auth = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
      const rel = await get(`https://api.github.com/repos/${repo}/releases/latest`, auth);
      const latest = String(rel.tag_name || '').match(/^v?(\d+)/);
      if (latest && +latest[1] > +major) warns.push(`${repo}@v${major} → v${latest[1]}`);
    } catch (e) { offline(`a versão de ${repo}`, e); }
  }

  warns.forEach(w => console.log('  ! ' + w));
  errors.forEach(e => console.log('  ✗ ' + e));
  if (release && warns.length) { console.log(`freshness-check: ${warns.length} atualização(ões) pendente(s) — atualize antes de lançar`); process.exit(1); }
  if (errors.length) { console.log(`freshness-check: ${errors.length} problema(s)`); process.exit(1); }
  console.log(`freshness-check OK · Node ${nodeMajor} · Electron ${elMajor} · ${Object.keys(pkg.devDependencies).length} dependências · ${uses.length} actions${warns.length ? ` · ${warns.length} aviso(s)` : ''}`);
})();
