// Gera build/icon.png (512) e build/icon.ico (16–256) desenhando o ícone no Chromium.
// Ferramenta de desenvolvimento: os arquivos gerados ficam versionados no repositório.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const out = path.join(__dirname, '..', 'build');
const fontCss = fs.readFileSync(path.join(__dirname, '..', 'app', 'assets', 'fonts', 'fonts.css'), 'utf8')
  .replace(/url\(([a-f0-9]+\.woff2)\)/g, (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(__dirname, '..', 'app', 'assets', 'fonts', f)).toString('base64')})`);
const html = (s) => `<html><head><style>${fontCss}
html,body{margin:0;background:transparent}
.i{width:${s}px;height:${s}px;border-radius:${s * 0.2}px;background:linear-gradient(160deg,#1c2430,#0d1015 70%);position:relative;overflow:hidden;box-shadow:inset 0 0 0 ${Math.max(1, s * 0.012)}px #334051}
.sl{position:absolute;left:${s * 0.12}px;top:${s * 0.16}px;width:${s * 0.76}px;height:${s * 0.16}px;background:repeating-linear-gradient(115deg,#ffb81c 0 ${s * 0.07}px,transparent ${s * 0.07}px ${s * 0.13}px)}
.t{position:absolute;left:0;right:0;bottom:${s * 0.1}px;text-align:center;font-family:'Saira Condensed';font-weight:800;color:#e9edf2;font-size:${s * 0.56}px;line-height:1;letter-spacing:-.01em}
.t em{font-style:normal;color:#ffb81c}
</style></head><body><div class="i"><div class="sl"></div><div class="t">P<em>W</em></div></div></body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const pngs = {};
  for (const s of [16, 24, 32, 48, 64, 128, 256, 512]) {
    await p.setViewportSize({ width: s, height: s });
    await p.setContent(s <= 24 ? html(s).replace('<div class="t">P<em>W</em></div>', '') : html(s));
    await p.evaluate(() => document.fonts.ready);
    pngs[s] = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
  fs.writeFileSync(path.join(out, 'icon.png'), pngs[512]);
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length; const dirs = [], datas = [];
  for (const s of sizes) {
    const d = Buffer.alloc(16); const png = pngs[s];
    d.writeUInt8(s >= 256 ? 0 : s, 0); d.writeUInt8(s >= 256 ? 0 : s, 1); d.writeUInt8(0, 2); d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(png.length, 8); d.writeUInt32LE(offset, 12);
    offset += png.length; dirs.push(d); datas.push(png);
  }
  fs.writeFileSync(path.join(out, 'icon.ico'), Buffer.concat([header, ...dirs, ...datas]));
  console.log('ícones gerados em build/');
})();
