// Monta o jogo a partir de app/src:
//   app/dist/index.html  -> versão desktop (fontes locais, CSP, abre por file://)
//   dist-web/pitwall.html -> versão artefato web (fontes do Google Fonts)
const fs = require('fs');
const path = require('path');
const { core, ui, data } = require('./modules');
const root = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(root, 'app', 'src', f), 'utf8');
const pkg = require('../package.json');

const dataJs = data.map(m => src(m + '.js')).join('\n');
const js = [...core, ...ui].map(m => `/* ---- ${m}.js ---- */\n${src(m + '.js')}`).join('\n');
const css = src('styles.css');

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
const body = (withImg) => `<div id="app"></div><div id="toasts" aria-live="polite"></div>\n<script>\nconst APP_VERSION = ${JSON.stringify(pkg.version)};\nconst HAS_IMG = ${withImg};\n${dataJs}\n${js}\n</script>`;

// desktop
const dist = path.join(root, 'app', 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
fs.cpSync(path.join(root, 'app', 'assets'), path.join(dist, 'assets'), { recursive: true });
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
console.log(`build ok: v${pkg.version} · ${(js.length / 1024).toFixed(0)} KB de JS${f1Files.length ? ` · fonte Formula1 Display (${f1Files.length} arquivos)` : ''}`);
