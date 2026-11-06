// Identidade visual: logo da Moratelli Game Company (MGC), imagens do instalador (NSIS)
// e ícone do jogo, desenhados no Chromium com as fontes do jogo.
// Uso: node scripts/make-brand.js   (requer playwright e ImageMagick)
// Gera:
//   app/assets/img/brand/mgc-logo.png       logo horizontal (fundo transparente, texto claro)
//   app/assets/img/brand/mgc-logo-dark.png  logo horizontal para fundo claro
//   app/assets/img/brand/mgc-mark.png       só o símbolo
//   build/installerSidebar.bmp              164×314 (boas-vindas e conclusão do instalador)
//   build/uninstallerSidebar.bmp            164×314
//   build/installerHeader.bmp               150×57 (cabeçalho das demais páginas)
//   build/icon.png / build/icon.ico         ícone do jogo
//   docs/brand/*.png                        peças em alta resolução (README, divulgação)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const fontDir = path.join(root, 'app', 'assets', 'fonts');
const fontCss = fs.readFileSync(path.join(fontDir, 'fonts.css'), 'utf8')
  .replace(/url\(([a-f0-9]+\.woff2)\)/g, (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir, f)).toString('base64')})`);
const img64 = (p) => `data:image/webp;base64,${fs.readFileSync(path.join(root, p)).toString('base64')}`;
const pkg = require('../package.json');
const RED = '#E10600';

/* ---------- símbolo e logotipo da MGC (HTML/CSS) ---------- */
// símbolo: três faixas de velocidade + bloco vermelho inclinado com "MGC"
const mark = (h, light = true) => `
<div class="mark" style="--h:${h}px">
  <i class="sp s1"></i><i class="sp s2"></i><i class="sp s3"></i>
  <div class="blk"><span>MGC</span></div>
</div>`;
const markCss = (fg) => `
.mark{position:relative;height:var(--h);width:calc(var(--h)*2.15);flex:none}
.mark .blk{position:absolute;right:0;top:0;height:100%;width:calc(var(--h)*1.62);background:${RED};transform:skewX(-14deg);border-radius:calc(var(--h)*.06);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 calc(var(--h)*-.07) 0 rgba(0,0,0,.18)}
.mark .blk span{transform:skewX(14deg);font-family:'Titillium Web';font-weight:900;font-style:italic;color:#fff;font-size:calc(var(--h)*.6);letter-spacing:-.02em;line-height:1;margin-top:calc(var(--h)*.02)}
.mark .sp{position:absolute;left:0;height:calc(var(--h)*.13);background:${fg};transform:skewX(-14deg);border-radius:2px}
.mark .s1{top:22%;width:calc(var(--h)*.42);left:calc(var(--h)*.12)}
.mark .s2{top:44%;width:calc(var(--h)*.5);left:calc(var(--h)*.0)}
.mark .s3{top:66%;width:calc(var(--h)*.36);left:calc(var(--h)*.08)}`;
const wordmark = (h, fg, sub) => `
<div class="wm" style="--h:${h}px"><div class="w1">MORATELLI</div><div class="w2">GAME COMPANY</div></div>`;
const wmCss = (fg, sub) => `
.wm{display:flex;flex-direction:column;justify-content:center;height:var(--h)}
.wm .w1{font-family:'Titillium Web';font-weight:900;font-style:italic;font-size:calc(var(--h)*.62);line-height:.86;color:${fg};letter-spacing:-.01em}
.wm .w2{font-family:'Titillium Web';font-weight:600;font-size:calc(var(--h)*.215);letter-spacing:.42em;color:${sub};margin-top:calc(var(--h)*.08);padding-left:.12em}
.wm .w2::before{content:'';display:inline-block;width:calc(var(--h)*.28);height:calc(var(--h)*.05);background:${RED};vertical-align:middle;margin-right:.5em;transform:translateY(-.1em)}`;
const logoPage = (h, fg, sub, bg = 'transparent') => `<html><head><style>${fontCss}
html,body{margin:0;background:${bg}}
.lg{display:inline-flex;align-items:center;gap:${h * 0.28}px;padding:${h * 0.18}px ${h * 0.22}px}
${markCss(fg)}${wmCss(fg, sub)}
</style></head><body><div class="lg" id="c">${mark(h)}${wordmark(h, fg, sub)}</div></body></html>`;

/* ---------- logotipo do jogo (igual à tela inicial) ---------- */
const pitwallCss = `
.pw{font-family:'Titillium Web';font-weight:900;font-style:italic;line-height:.84;letter-spacing:-.02em;color:#fff}
.pw em{font-style:normal;color:${RED}}
.eyebrow{font-family:'Titillium Web';font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#d7d7dc;display:flex;align-items:center;gap:.6em}
.eyebrow::before{content:'';display:inline-block;width:1.7em;height:.32em;background:${RED}}`;

/* ---------- lateral do instalador (164×314, desenhada em 4×) ---------- */
const S = 4;
const sidebar = (title, line) => `<html><head><style>${fontCss}
html,body{margin:0}
.sb{position:relative;width:${164 * S}px;height:${314 * S}px;overflow:hidden;background:#0b0b10}
.ph{position:absolute;inset:0;background:url('${img64('app/assets/img/tracks/marina-bay-hero.webp')}') 58% 50%/auto 100% no-repeat;filter:saturate(1.15) contrast(1.08)}
.sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,11,16,.7) 0%,rgba(11,11,16,.2) 26%,rgba(11,11,16,.5) 52%,rgba(11,11,16,.97) 76%,#0b0b10 100%)}
.stripes{position:absolute;top:${18 * S}px;right:${-6 * S}px;width:${42 * S}px;height:${9 * S}px;background:repeating-linear-gradient(115deg,${RED} 0 ${5 * S}px,transparent ${5 * S}px ${10 * S}px)}
.top{position:absolute;left:${14 * S}px;top:${16 * S}px;font-size:${7.2 * S}px}
.logo{position:absolute;left:${13 * S}px;bottom:${86 * S}px;font-size:${44 * S}px}
.logo .pw div:last-child{margin-top:${-2 * S}px}
.tag{position:absolute;left:${14 * S}px;bottom:${70 * S}px;font-family:'Titillium Web';font-weight:700;font-size:${8.5 * S}px;letter-spacing:.3em;color:#fff}
.line{position:absolute;left:${14 * S}px;bottom:${58 * S}px;font-family:'Titillium Web';font-weight:600;font-size:${6.6 * S}px;color:#9a9aa5;letter-spacing:.04em}
.foot{position:absolute;left:${12 * S}px;right:${12 * S}px;bottom:${12 * S}px;border-top:${1 * S}px solid rgba(255,255,255,.14);padding-top:${8 * S}px;display:flex;align-items:center}
.foot .lg{display:flex;align-items:center;gap:${5 * S}px}
${pitwallCss}${markCss('#fff')}${wmCss('#fff', '#b9b9c2')}
.foot .wm .w2{letter-spacing:.3em}
.logo .pw{text-shadow:0 ${2 * S}px ${10 * S}px rgba(0,0,0,.55)}
</style></head><body><div class="sb" id="c">
  <div class="ph"></div><div class="sh"></div><div class="stripes"></div>
  <div class="top eyebrow">${title}</div>
  <div class="logo"><div class="pw"><div>PIT</div><div><em>WALL</em></div></div></div>
  <div class="tag">RACING SIMULATOR</div>
  <div class="line">${line}</div>
  <div class="foot"><div class="lg">${mark(15 * S)}${wordmark(17 * S)}</div></div>
</div></body></html>`;

/* ---------- cabeçalho do instalador (150×57, fundo branco do Windows) ---------- */
const header = () => `<html><head><style>${fontCss}
html,body{margin:0}
.hd{position:relative;width:${150 * S}px;height:${57 * S}px;background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:flex-end;padding-right:${10 * S}px;box-sizing:border-box}
.hd .stk{display:flex;flex-direction:column;align-items:flex-end;gap:${3 * S}px}
.pw{font-family:'Titillium Web';font-weight:900;font-style:italic;font-size:${23 * S}px;line-height:.84;letter-spacing:-.02em;color:#15151e;white-space:nowrap}
.pw em{font-style:normal;color:${RED}}
.by{font-family:'Titillium Web';font-weight:700;font-size:${6.4 * S}px;letter-spacing:.24em;color:#6b6b76;display:flex;align-items:center;gap:${4 * S}px}
.by::before{content:'';display:inline-block;width:${10 * S}px;height:${2.2 * S}px;background:${RED}}
.sl{position:absolute;left:${-6 * S}px;top:0;bottom:0;width:${34 * S}px;background:repeating-linear-gradient(115deg,${RED} 0 ${4 * S}px,transparent ${4 * S}px ${9 * S}px);opacity:.9;-webkit-mask:linear-gradient(90deg,#000 30%,transparent)}
</style></head><body><div class="hd" id="c"><div class="sl"></div><div class="stk"><div class="pw">PIT <em>WALL</em></div><div class="by">MORATELLI GAME COMPANY</div></div></div></body></html>`;

/* ---------- ícone do jogo ---------- */
const icon = (s) => `<html><head><style>${fontCss}
html,body{margin:0;background:transparent}
.i{width:${s}px;height:${s}px;border-radius:${s * 0.2}px;background:linear-gradient(155deg,#2a2a35 0%,#15151e 55%,#0b0b10 100%);position:relative;overflow:hidden;box-shadow:inset 0 0 0 ${Math.max(1, s * 0.014)}px rgba(255,255,255,.12)}
.sl{position:absolute;left:${s * 0.13}px;top:${s * 0.15}px;width:${s * 0.5}px;height:${s * 0.12}px;background:repeating-linear-gradient(115deg,${RED} 0 ${s * 0.06}px,transparent ${s * 0.06}px ${s * 0.115}px)}
.t{position:absolute;left:${s * 0.04}px;right:0;bottom:${s * 0.13}px;text-align:center;font-family:'Titillium Web';font-weight:900;font-style:italic;color:#fff;font-size:${s * 0.58}px;line-height:1;letter-spacing:-.04em}
.t em{font-style:normal;color:${RED}}
.bar{position:absolute;left:0;right:0;bottom:0;height:${Math.max(1, s * 0.05)}px;background:${RED}}
</style></head><body><div class="i"><div class="sl"></div><div class="t">P<em>W</em></div><div class="bar"></div></div></body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const brandDir = path.join(root, 'app', 'assets', 'img', 'brand');
  const docsDir = path.join(root, 'docs', 'brand');
  const buildDir = path.join(root, 'build');
  [brandDir, docsDir].forEach(d => fs.mkdirSync(d, { recursive: true }));
  const shot = async (html, file, opts = {}) => {
    await p.setViewportSize({ width: opts.w || 2400, height: opts.h || 1400 });
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    const el = await p.$('#c');
    await el.screenshot({ path: file, omitBackground: !opts.bg });
  };
  // logos
  await shot(logoPage(150, '#ffffff', '#b9b9c2'), path.join(brandDir, 'mgc-logo.png'));
  await shot(logoPage(150, '#15151e', '#5b5b66'), path.join(brandDir, 'mgc-logo-dark.png'));
  await shot(`<html><head><style>${fontCss}html,body{margin:0}${markCss('#fff')}</style></head><body><div id="c" style="display:inline-block;padding:20px">${mark(220)}</div></body></html>`, path.join(brandDir, 'mgc-mark.png'));
  await shot(logoPage(240, '#ffffff', '#b9b9c2', '#15151e').replace('<body>', '<body style="background:#15151e">'), path.join(docsDir, 'mgc-logo-fundo-escuro.png'), { bg: true, w: 3000 });
  // instalador: desenha em 4× e reduz com Lanczos (texto nítido no tamanho real)
  const tmp = path.join(buildDir, '_tmp.png');
  const bmp = (src, out, w, h) => execFileSync('convert', [src, '-filter', 'Lanczos', '-resize', `${w}x${h}!`, '-background', '#0b0b10', '-alpha', 'remove', '-type', 'TrueColor', `BMP3:${out}`]);
  await shot(sidebar('Temporada 2027', 'F1 real · 16 categorias'), tmp, { bg: true });
  fs.copyFileSync(tmp, path.join(docsDir, 'instalador-lateral-4x.png'));
  bmp(tmp, path.join(buildDir, 'installerSidebar.bmp'), 164, 314);
  await shot(sidebar('Até a próxima', 'Seus saves ficam guardados'), tmp, { bg: true });
  bmp(tmp, path.join(buildDir, 'uninstallerSidebar.bmp'), 164, 314);
  await shot(header(), tmp, { bg: true });
  fs.copyFileSync(tmp, path.join(docsDir, 'instalador-cabecalho-4x.png'));
  bmp(tmp, path.join(buildDir, 'installerHeader.bmp'), 150, 57);
  fs.unlinkSync(tmp);
  // ícone
  const pngs = {};
  for (const s of [16, 24, 32, 48, 64, 128, 256, 512]) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(s <= 24 ? icon(s).replace('<div class="t">P<em>W</em></div>', '<div class="t" style="font-size:' + s * 0.7 + 'px;bottom:' + s * 0.08 + 'px">P</div>') : icon(s));
    await p.evaluate(() => document.fonts.ready);
    pngs[s] = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: s, height: s } });
  }
  fs.writeFileSync(path.join(buildDir, 'icon.png'), pngs[512]);
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const hdr = Buffer.alloc(6); hdr.writeUInt16LE(0, 0); hdr.writeUInt16LE(1, 2); hdr.writeUInt16LE(sizes.length, 4);
  let off = 6 + 16 * sizes.length; const dirs = [], datas = [];
  for (const s of sizes) {
    const d = Buffer.alloc(16); const png = pngs[s];
    d.writeUInt8(s >= 256 ? 0 : s, 0); d.writeUInt8(s >= 256 ? 0 : s, 1); d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(png.length, 8); d.writeUInt32LE(off, 12);
    off += png.length; dirs.push(d); datas.push(png);
  }
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), Buffer.concat([hdr, ...dirs, ...datas]));
  await b.close();
  console.log(`marca gerada: ${brandDir}, ${docsDir} e build/ (instalador e ícone) · v${pkg.version}`);
})();
