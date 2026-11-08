const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const P = __dirname; const prop = process.argv[2]; const ids = JSON.parse(fs.readFileSync(P + '/ids.json'));
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1500, height: 640 } });
  for (let k = 0; k * 6 < ids.length; k++) {
    const part = ids.slice(k * 6, k * 6 + 6);
    fs.writeFileSync(P + '/shots/_sheet.html', `<body style="margin:0;background:#333;display:grid;grid-template-columns:repeat(3,500px);gap:0">${part.map(i => `<div style="position:relative"><img src="${prop}-${i}.png" style="width:500px;display:block"><span style="position:absolute;left:4px;top:4px;background:#ff0;font:bold 13px sans-serif;padding:1px 4px">${i}</span></div>`).join('')}</body>`); await pg.goto('file://' + P + '/shots/_sheet.html');
    await pg.waitForTimeout(400); await pg.screenshot({ path: `${P}/shots/sheet-${prop}-${k}.png`, fullPage: true });
  }
  await b.close();
})();
