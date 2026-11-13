// Pacote de dados (0.9, Onda 3): o pacote real gerado de app/data passa no Pack.check, e pacotes
// inválidos são recusados SEM mudar nada (nenhuma variável publicada, Pack.installed continua vazio).
// A equivalência (mesmas assinaturas com o pacote) é conferida por: node scripts/determinism-check.js --pack
// (passo 3) Também confere: Pack.boot (o pacote que vem com o jogo), Pack.canOpen (o save só abre com o pacote
// com que foi criado; saves antigos ficam marcados com o pacote real) e o build (nenhum dado real no código do
// jogo; o pacote ao lado no desktop e embutido na web, carregado antes do jogo, dá o mesmo mundo de app/data).
// Gera o build (normal e --sem-dados-reais) e deixa o normal no lugar.
// Uso: node scripts/pack-check.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const { buildPack } = require('./make-data-pack');
const real = buildPack();
const fresh = () => {
  const ctx = vm.createContext({ console, Math, JSON, Date });
  for (const m of ['core/base/util', 'core/base/pack']) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  return ctx;
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const bad = [];

// 1) o pacote real é válido e instala
{
  const ctx = fresh(); ctx.__p = JSON.stringify(real);
  const r = vm.runInContext('Pack.install(JSON.parse(__p))', ctx);
  if (!r.ok) bad.push('pacote real recusado: ' + r.errors.join('; '));
  else if (vm.runInContext('typeof REAL_DB === "undefined" || REAL_DB.teams.length === 0', ctx)) bad.push('pacote real instalado, mas REAL_DB não ficou disponível');
}

// 2) pacotes inválidos: recusados e nada muda
const cases = [
  ['não é um objeto', () => 'texto'],
  ['formato errado', p => { p.format = 'outro'; return p; }],
  ['versão mais nova que o jogo', p => { p.version = 99; return p; }],
  ['sem identificador', p => { delete p.id; return p; }],
  ['conteúdo desconhecido', p => { p.content.CODIGO = 'alert(1)'; return p; }],
  ['tipo errado', p => { p.content.REAL_CATS = []; return p; }],
  ['sem REAL_DB', p => { delete p.content.REAL_DB; return p; }],
  ['equipes vazias', p => { p.content.REAL_DB.teams = []; return p; }],
  ['piloto repetido', p => { p.content.REAL_DB.drivers.push(clone(p.content.REAL_DB.drivers[0])); return p; }],
  ['piloto em equipe inexistente', p => { p.content.REAL_DB.drivers[0].team = 'equipe-que-nao-existe'; return p; }],
];
for (const [name, mut] of cases) {
  const ctx = fresh();
  ctx.__p = JSON.stringify(mut(clone(real)));
  const r = vm.runInContext('Pack.install(JSON.parse(__p))', ctx);
  const leaked = vm.runInContext('Object.keys(Pack.GLOBALS).filter(k => typeof globalThis[k] !== "undefined")', ctx);
  const inst = vm.runInContext('Pack.installed', ctx);
  if (r.ok) bad.push(`${name}: foi aceito`);
  if (leaked.length || inst) bad.push(`${name}: recusado, mas mudou o estado (${leaked.join(', ') || 'Pack.installed'})`);
}

// 3) (passo 3) Pack.boot: instala o primeiro pacote válido da lista; inválidos não mudam nada; lista vazia = fictício
{
  const boot = (list) => { const ctx = fresh(); ctx.__l = JSON.stringify(list); const r = vm.runInContext('Pack.boot(JSON.parse(__l))', ctx); return { r, ctx, inst: vm.runInContext('Pack.installed', ctx), real: vm.runInContext('typeof REAL_DB !== "undefined"', ctx) }; };
  const broken = clone(real); broken.content.REAL_DB.teams = [];
  let b = boot([]);
  if (b.inst || b.real || b.r.errors.length) bad.push('boot sem pacote: devia ficar fictício, sem erro');
  b = boot([broken]);
  if (b.inst || b.real) bad.push('boot com pacote danificado: instalou algo'); if (b.r.errors.length !== 1) bad.push('boot com pacote danificado: o erro não ficou no relatório');
  b = boot([broken, real]);
  if (!b.inst || b.inst.id !== real.id || !b.real) bad.push('boot com [danificado, real]: devia instalar o real'); if (b.r.errors.length !== 1) bad.push('boot com [danificado, real]: o erro do danificado sumiu do relatório');
}

// 4) (passo 3) um save só abre com o pacote com que foi criado (Pack.canOpen); a migração marca os saves antigos
{
  const other = clone(real); other.id = 'outro-pacote';
  const can = (installed, pack) => { const ctx = fresh(); if (installed) { ctx.__p = JSON.stringify(installed); vm.runInContext('Pack.install(JSON.parse(__p))', ctx); } ctx.__g = JSON.stringify({ pack }); return vm.runInContext('Pack.canOpen(JSON.parse(__g))', ctx); };
  const fromReal = { id: real.id, name: real.name, nameEn: real.nameEn, version: 1, ref: null };
  [
    ['save do pacote real com o pacote real', real, fromReal, true, undefined],
    ['save do pacote real sem pacote', null, fromReal, false, 'missing'],
    ['save do pacote real com outro pacote', other, fromReal, false, 'other'],
    ['save fictício com o pacote real', real, null, false, 'fictional'],
    ['save fictício sem pacote', null, null, true, undefined],
  ].forEach(([name, inst, pack, ok, why]) => { const r = can(inst, pack); if (r.ok !== ok || r.why !== why) bad.push(`${name}: esperado ${ok ? 'abre' : 'recusa (' + why + ')'}, deu ${JSON.stringify(r)}`); });
  // a migração precisa do núcleo inteiro: um save antigo (sem G.pack) fica marcado com o pacote real
  const ctx = vm.createContext({ console, Math, JSON, Date });
  for (const m of require('./modules').core) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  const zlib = require('zlib');
  ctx.__s = zlib.gunzipSync(fs.readFileSync(path.join(root, 'tests', 'saves', '0.8.7-entre-etapas.json.gz'))).toString('utf8');
  const mig = vm.runInContext('(() => { const g = JSON.parse(__s); const had = "pack" in g; Migrate.run(g); return { had, pack: g.pack }; })()', ctx);
  if (mig.had) bad.push('o save de teste da 0.8.7 já tinha G.pack (o teste da migração não vale)');
  if (!mig.pack || mig.pack.id !== real.id || !mig.pack.legacy) bad.push(`save da 0.8.7 migrado sem a marca do pacote real (${JSON.stringify(mig.pack)})`);
  // carreira nova sem pacote: G.pack = null; com o pacote: o id dele
  const made = vm.runInContext('Career.create(defaultDb(), { mode: "observer", seed: 7 }).pack', ctx);
  if (made !== null) bad.push(`carreira nova sem pacote devia ter G.pack = null (deu ${JSON.stringify(made)})`);
  ctx.__p = JSON.stringify(real); vm.runInContext('Pack.install(JSON.parse(__p))', ctx);
  const made2 = vm.runInContext('Career.create(defaultDb(), { mode: "observer", seed: 7 }).pack', ctx);
  if (!made2 || made2.id !== real.id) bad.push(`carreira nova com o pacote real devia guardar o id dele (deu ${JSON.stringify(made2)})`);
}

// 5) (passo 3) o build: nenhum dado real no código do jogo; o pacote vai ao lado (desktop) ou embutido (web),
//    é carregado antes do jogo e reproduz exatamente o mundo de app/data; --sem-dados-reais não leva pacote
{
  const { execFileSync } = require('child_process');
  const build = (...a) => execFileSync(process.execPath, [path.join(__dirname, 'build.js'), ...a], { cwd: root, stdio: 'ignore' });
  const decl = (txt) => Object.keys(real.content).filter(k => new RegExp(`\\b(const|let|var)\\s+${k}\\b`).test(txt));
  const html = path.join(root, 'app', 'dist', 'index.html'), web = path.join(root, 'dist-web', 'pitwall.html');
  const packFile = path.join(root, 'app', 'dist', 'packs', real.id + '.js');
  const PACK_MARK = '(globalThis.PITWALL_PACKS = globalThis.PITWALL_PACKS || []).push(';   // o que wrapPack escreve
  const mods = require('./modules');
  if (mods.ui[0] !== 'ui/base/packs') bad.push('ui/base/packs precisa ser o primeiro módulo da interface (instala o pacote antes de qualquer tela ler os dados)');
  try {
    build();
    const h = fs.readFileSync(html, 'utf8'), w = fs.readFileSync(web, 'utf8');
    if (decl(h).length) bad.push(`index.html ainda declara dados reais no código do jogo: ${decl(h).join(', ')}`);
    if (decl(w).length) bad.push(`pitwall.html (web) ainda declara dados reais no código do jogo: ${decl(w).join(', ')}`);
    const tag = h.indexOf(`<script src="packs/${real.id}.js"></script>`), main = h.indexOf('const APP_VERSION');
    if (tag < 0 || main < 0 || tag > main) bad.push('index.html: o pacote precisa ser carregado (script src) antes do script do jogo');
    if (!fs.existsSync(packFile)) bad.push(`o build não gerou app/dist/packs/${real.id}.js`);
    else {
      // o arquivo que vai no instalador, carregado como o jogo carrega, dá o mesmo mundo que app/data
      const worldFrom = (withData, withPackFile) => {
        const c = vm.createContext({ console, Math, JSON, Date });
        if (withPackFile) vm.runInContext(fs.readFileSync(packFile, 'utf8'), c, { filename: 'pack-file.js' });
        for (const m of [...(withData ? mods.data : []), ...mods.core]) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), c, { filename: m + '.js' });
        if (withPackFile) { const r = vm.runInContext('Pack.boot(globalThis.PITWALL_PACKS)', c); if (!r.installed) bad.push('o pacote do build foi recusado no boot: ' + r.errors.join('; ')); }
        return vm.runInContext('JSON.stringify(defaultDb())', c);
      };
      if (worldFrom(false, true) !== worldFrom(true, false)) bad.push('o mundo criado com o pacote do build é diferente do mundo de app/data');
    }
    const wTag = w.indexOf(PACK_MARK), wMain = w.indexOf('const APP_VERSION');
    if (wTag < 0 || wTag > wMain) bad.push('pitwall.html (web): o pacote embutido precisa vir antes do script do jogo');
    build('--sem-dados-reais');
    if (fs.existsSync(path.join(root, 'app', 'dist', 'packs'))) bad.push('build --sem-dados-reais gerou a pasta de pacotes');
    const hf = fs.readFileSync(html, 'utf8');
    if (hf.includes('<script src="packs/') || hf.includes(PACK_MARK)) bad.push('build --sem-dados-reais: o index.html ainda carrega um pacote');
    if (decl(fs.readFileSync(html, 'utf8')).length) bad.push('build --sem-dados-reais: o index.html tem dados reais');
  } finally { build(); }   // deixa o build normal no lugar
}

if (bad.length) { console.log(`pack-check: ${bad.length} problema(s)`); bad.forEach(b => console.log('  ✗', b)); process.exit(1); }
console.log(`pack-check OK · pacote real válido (${Object.keys(real.content).length} conjuntos) · ${cases.length} pacotes inválidos recusados sem mudar nada · boot e abertura de saves conferidos · build sem dados no código, com o pacote ao lado (mesmo mundo de app/data)`);
