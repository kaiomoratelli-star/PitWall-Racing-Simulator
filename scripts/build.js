// Monta o jogo a partir de app/src:
//   app/dist/index.html  -> versão desktop (fontes locais, CSP, abre por file://)
//   app/dist/packs/*.js   -> Pacote de dados que vem com o jogo (0.9; sem ele, mundo fictício)
//   app/dist/packs/<id>/img -> fotos e logos do mundo real (o jogo base leva só bandeiras, fontes e a marca)
//   dist-web/pitwall.html -> versão artefato web (fontes do Google Fonts; pacote embutido)
const fs = require('fs');
const path = require('path');
const { core, ui } = require('./modules');
const root = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(root, 'app', 'src', f), 'utf8');
const pkg = require('../package.json');

// (0.9, Onda 3) os dados reais não entram mais no código do jogo (app/data fica fora do index.html).
// Eles vão num Pacote de dados à parte: app/dist/packs/pitwall-dados-reais.js no desktop (carregado antes do
// jogo, que o confere e instala com Pack.boot) e um bloco embutido na versão web, que é um arquivo só.
// --sem-dados-reais: sem pacote nenhum; o mundo vem do gerador fictício. É o que a edição gratuita usa e o que
// o teste do jogo fictício confere.
const noReal = process.argv.includes('--sem-dados-reais');
const { buildPack, wrapPack, packConsts, copyPackImages } = require('./make-data-pack');
// (0.9, regra 19) --edicao=ficticia: o mesmo banco de dados com os nomes trocados e os mesmos ids (Pacote de dados
// pitwall-ficticio, sem fotos). É a edição gratuita; sem a opção, o jogo leva o pacote real.
const fict = process.argv.includes('--edicao=ficticia');
const packs = noReal ? [] : fict ? [require('./make-fictional-pack').buildFictionalPack().pack] : [buildPack()];
// edição fictícia: os textos escritos no código ("Fórmula 1", "Conselho da FIA"...) passam pelo mesmo dicionário do
// pacote fictício (scripts/fictional-code.js); o instalador não leva o dicionário nem nenhum nome real
let codeMap = null;
if (fict) {
  const F = require('./fictional-code');
  const fictPack = require('./make-fictional-pack').buildFictionalPack();
  codeMap = F.codeMapper(fictPack, [...core, ...ui].map(m => src(m + '.js'))).codeMap;
  codeMap.rewrite = (code) => F.rewriteCode(code, codeMap).code;
}
const js = [...core, ...ui].map(m => `/* ---- ${m}.js ---- */\n${codeMap ? codeMap.rewrite(src(m + '.js')) : src(m + '.js')}`).join('\n');
const css0 = ['styles.css', 'ui85.css', 'ui85-screens.css', 'ui85-fx.css'].filter(f => fs.existsSync(path.join(root, 'app', 'src', f))).map(src).join('\n');
// edição fictícia: os comentários do CSS saem (citam nomes reais e não aparecem na tela)
const css = fict ? css0.replace(/\/\*[\s\S]*?\*\//g, '') : css0;

// Fonte oficial da F1 (Formula1 Display): não vem com o jogo (é da Formula One Management).
// Se os arquivos estiverem em app/assets/fonts (ex.: Formula1-Display-Bold.woff2), o build gera os
// @font-face e a fonte entra na frente da Titillium Web; sem eles, vale o fallback em caixa alta.
const fontDir = path.join(root, 'app', 'assets', 'fonts');
const f1Files = fs.existsSync(fontDir) ? fs.readdirSync(fontDir).filter(f => /formula1/i.test(f) && /\.(woff2?|ttf|otf)$/i.test(f)) : [];
const f1Css = f1Files.map(f => {
  const wide = /wide/i.test(f);
  const weight = /black|ultra|heavy/i.test(f) ? 900 : /bold/i.test(f) || wide ? 700 : 400;
  const fmt = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }[f.split('.').pop().toLowerCase()];
  return `@font-face{font-family:'${wide ? 'Formula1 Display Wide' : 'Formula1 Display'}';font-weight:${weight};font-style:${/italic/i.test(f) ? 'italic' : 'normal'};font-display:swap;src:url('assets/fonts/${f}') format('${fmt}');}`;
}).join('\n');
// desktop: um <script src> por pacote (arquivo ao lado); web: o mesmo conteúdo embutido
const packTags = (inline) => packs.map(p => (inline ? `<script>\n${wrapPack(p)}</script>` : `<script src="packs/${p.id}.js"></script>`)).join('\n');
const body = (withImg) => `<div id="app"></div><div id="toasts" aria-live="polite"></div>\n${packTags(!withImg)}\n<script>\nconst APP_VERSION = ${JSON.stringify(pkg.version.replace(/-(\d+)$/, '.$1'))};\nconst HAS_IMG = ${withImg};\n${js}\n</script>`;

// desktop
const dist = path.join(root, 'app', 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
// (passo 4) jogo base: bandeiras, fontes e a arte própria (assets/img/brand). As fotos e logos do mundo real
// vão só na pasta de imagens do Pacote de dados (packs/<id>/img).
const imgDir = path.join(root, 'app', 'assets', 'img');
const { BASE_IMG } = packConsts();
fs.cpSync(path.join(root, 'app', 'assets'), path.join(dist, 'assets'), {
  recursive: true,
  filter: (s) => { const rel = path.relative(imgDir, s); return rel === '' || rel.startsWith('..') || BASE_IMG.includes(rel.split(path.sep)[0]); },
});
if (packs.length) {
  fs.mkdirSync(path.join(dist, 'packs'), { recursive: true });
  packs.forEach(p => {
    fs.writeFileSync(path.join(dist, 'packs', p.id + '.js'), wrapPack(p));
    if (p.images) copyPackImages(path.join(dist, 'packs', p.id, p.images));
  });
}
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'";
fs.writeFileSync(path.join(dist, 'index.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PitWall Racing Simulator</title>
<link rel="stylesheet" href="assets/fonts/fonts.css">
${f1Css ? `<style>${f1Css}</style>` : ''}
<style>${css}</style></head><body${f1Files.length ? ' class="has-f1"' : ''}>
${body(true)}
</body></html>`);

// web (artefato do Claude): sem doctype, fontes do Google
const web = path.join(root, 'dist-web');
fs.mkdirSync(web, { recursive: true });
fs.writeFileSync(path.join(web, 'pitwall.html'), `${src('head.html')}\n<style>${css}</style>\n${body(false)}`);
console.log(`build ok: v${pkg.version.replace(/-(\d+)$/, '.$1')}${noReal ? ' · SEM DADOS REAIS' : ` · Pacote de dados: ${packs.map(p => p.id).join(', ')}`} ·${(js.length / 1024).toFixed(0)} KB de JS${f1Files.length ? ` · fonte Formula1 Display (${f1Files.length} arquivos)` : ''}`);
