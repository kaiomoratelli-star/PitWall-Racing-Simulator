// Gera o Pacote de dados real (0.9, Onda 3) a partir de app/data: um JSON com o conteúdo das variáveis
// que o jogo usa (REAL_DB, REAL_EXTRA, REAL_CATS...), no formato conferido por Pack.check (core/base/pack.js).
// Uso: node scripts/make-data-pack.js [saída=dist-pack/pitwall-dados-reais.json]
// Também é usado como módulo: require('./make-data-pack').buildPack()
// (passo 4) O pacote tem uma pasta de imagens ("images": "img"): as fotos e logos do mundo real de app/assets/img,
// menos a arte própria do jogo (Pack.BASE_IMG). O build copia essa pasta para app/dist/packs/<id>/img (copyPackImages).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const { data } = require('./modules');
const IMG = path.join(root, 'app', 'assets', 'img');

// constantes do jogo (core/base/pack.js), lidas do próprio arquivo para não haver duas listas
function packConsts() {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', 'core', 'base', 'pack.js'), 'utf8'), ctx, { filename: 'pack.js' });
  return JSON.parse(vm.runInContext('JSON.stringify({ REAL: Pack.REAL, BASE_IMG: Pack.BASE_IMG })', ctx));
}
// o que vai na pasta de imagens do pacote: tudo de app/assets/img que não é arte própria do jogo
function packImageEntries() {
  const { BASE_IMG } = packConsts();
  return fs.existsSync(IMG) ? fs.readdirSync(IMG).filter(e => !BASE_IMG.includes(e)) : [];
}
function copyPackImages(dest) {
  fs.mkdirSync(dest, { recursive: true });
  packImageEntries().forEach(e => fs.cpSync(path.join(IMG, e), path.join(dest, e), { recursive: true }));
}

function buildPack() {
  const ctx = vm.createContext({ console, Math, JSON, Date });
  for (const m of data) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', 'core', 'base', 'pack.js'), 'utf8'), ctx, { filename: 'pack.js' });
  const names = vm.runInContext('Object.keys(Pack.GLOBALS)', ctx);
  const content = {};
  for (const k of names) {
    const v = vm.runInContext(`typeof ${k} !== 'undefined' ? JSON.stringify(${k}) : null`, ctx);
    if (v != null) content[k] = JSON.parse(v);
  }
  const db = content.REAL_DB || {};
  const pkg = require(path.join(root, 'package.json'));
  const real = JSON.parse(vm.runInContext('JSON.stringify(Pack.REAL)', ctx));   // id e nome vêm do jogo (core/base/pack.js)
  return {
    format: 'pitwall-pack', version: 1, id: real.id,
    name: real.name, nameEn: real.nameEn, images: 'img',
    ref: db.ref || null, game: pkg.version,
    license: 'Dados de fontes abertas: f1db (CC BY 4.0), Wikipedia (CC BY-SA), Wikidata (CC0), OpenStreetMap (ODbL). Fotos e logos: ver ASSET_REGISTRY.',
    content,
  };
}

// (passo 3) o pacote como o jogo o carrega: um script que só acrescenta o JSON à lista PITWALL_PACKS
// (o jogo confere e instala com Pack.boot). Todo "<" vira a sequência de escape do JSON (barra, u003c), para o bloco
// poder ir embutido no HTML da versão web sem fechar a tag <script> antes da hora.
function wrapPack(p) {
  const json = JSON.stringify(p).split('<').join(String.fromCharCode(92) + 'u003c');   // U+2028/2029 já são válidos em string desde o ES2019
  return `/* PitWall — Pacote de dados "${p.id}" (formato ${p.format} v${p.version}). Gerado por scripts/make-data-pack.js; não editar. */\n(globalThis.PITWALL_PACKS = globalThis.PITWALL_PACKS || []).push(${json});\n`;
}

if (require.main === module) {
  const out = path.resolve(process.argv[2] || path.join(root, 'dist-pack', 'pitwall-dados-reais.json'));
  const p = buildPack();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const txt = JSON.stringify(p);
  fs.writeFileSync(out, txt);
  console.log(`pacote gerado: ${path.relative(root, out)} · ${Object.keys(p.content).length} conjuntos · ${(txt.length / 1048576).toFixed(1)} MB`);
}
module.exports = { buildPack, wrapPack, packConsts, packImageEntries, copyPackImages };
