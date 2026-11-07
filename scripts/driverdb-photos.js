// Lista de fotos a baixar do DriverDB: pilotos do universo ligados a um perfil (d.ddb) que ainda não têm
// foto em nenhuma fonte (oficial, Commons). Saída: scripts/.driverdb-photo-todo.json, usada por
// "python3 scripts/import_driverdb.py --photos". Fotos padrão/silhueta do site são ignoradas.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { core, data } = require('./modules');
const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'app', 'assets', 'img');
const ctx = vm.createContext({ console, Math, JSON, Date, process });
for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
ctx.hasFile = (rel) => fs.existsSync(path.join(IMG, rel));
const todo = vm.runInContext(`(() => {
  const G = Career.create(defaultDb(), { mode: 'observer', seed: 'fotos' });
  const P = DRIVERDB_2026.people;
  const count = {}; Object.values(P).forEach(p => { if (p.img) count[p.img] = (count[p.img] || 0) + 1; });
  const has = (d) => (d.img && hasFile('faces/' + String(d.img).replace(/^drivers\\//, '').replace(/\\.webp$/, '') + '.webp')) || (d.uid && hasFile('faces/' + d.uid + '.webp')) || (d.ddb && hasFile('faces/ddb/' + d.ddb + '.webp'));
  return G.db.drivers.filter(d => d.ddb && !d.retired && !has(d)).map(d => ({ slug: d.ddb, url: (P[d.ddb] || {}).img, name: d.name }))
    .filter(t => t.url && count[t.url] === 1 && !/default|placeholder|avatar|silhouette/i.test(t.url));
})()`, ctx);
// logos das equipes das categorias que ainda não têm logo: o logo da equipe atual nos perfis do DriverDB
const logos = vm.runInContext(`(() => {
  const n = (s) => String(s || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = (s) => n(String(s).split(' (')[0]).replace(/ /g, '-');
  const by = {};
  Object.values(DRIVERDB_2026.people).forEach(p => { if (p.team && p.teamLogo) { const k = n(p.team); (by[k] = by[k] || {})[p.teamLogo] = ((by[k] || {})[p.teamLogo] || 0) + 1; } });
  const out = [], seen = new Set();
  REAL_CATS.cats.forEach(c => c.teams.forEach(t => {
    const s = slug(t.name); if (seen.has(s) || hasFile('logos/teams/' + s + '.png')) return; seen.add(s);
    const base = n(t.name.replace(/\\s*#\\d+$/, '').replace(/\\s+(with|by)\\s+.*$/i, ''));
    const k = Object.keys(by).find(x => x === base) || Object.keys(by).find(x => x.startsWith(base + ' ') || base.startsWith(x + ' '));
    if (!k) return;
    const url = Object.entries(by[k]).sort((a, b) => b[1] - a[1])[0][0];
    out.push({ slug: s, url, team: t.name, ddbTeam: k });
  }));
  return out;
})()`, ctx);
fs.writeFileSync(path.join(__dirname, '.driverdb-photo-todo.json'), JSON.stringify(todo, null, 0));
fs.writeFileSync(path.join(__dirname, '.driverdb-logo-todo.json'), JSON.stringify(logos, null, 0));
console.log(`${todo.length} fotos e ${logos.length} logos de equipe a baixar`);
