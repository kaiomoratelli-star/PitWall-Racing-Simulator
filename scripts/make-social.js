// Peças para redes sociais (X): foto de perfil, banner e imagem do post de anúncio.
// Uso: node scripts/build.js && node scripts/make-social.js [captura-da-corrida.png]
// Gera docs/brand/x/*.png. Usa as fontes e o desenho de traçados do próprio jogo.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'docs', 'brand', 'x');
fs.mkdirSync(out, { recursive: true });
const shotFile = process.argv[2];
const shot64 = shotFile && fs.existsSync(shotFile) ? `data:image/png;base64,${fs.readFileSync(shotFile).toString('base64')}` : null;

const CSS = `
html,body{margin:0;padding:0;background:#0b0b10;overflow:hidden}
#c{position:relative;overflow:hidden;background:#0b0b10;color:#fff;font-family:'Titillium Web',sans-serif}
.carbon{position:absolute;inset:0;background:
  radial-gradient(120% 90% at 75% 20%,#23232e 0%,#121219 55%,#0b0b10 100%);}
.carbon::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0 2px,transparent 2px 6px)}
.stripes{position:absolute;background:repeating-linear-gradient(115deg,#E10600 0 var(--sw),transparent var(--sw) calc(var(--sw)*2))}
.pw{font-weight:900;font-style:italic;line-height:.84;letter-spacing:-.02em;white-space:nowrap}
.pw em{font-style:normal;color:#E10600}
.eyebrow{font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d7d7dc;display:flex;align-items:center;gap:.7em}
.eyebrow::before{content:'';width:1.8em;height:.32em;background:#E10600;display:inline-block}
.track{position:absolute}
.track path{fill:none;stroke-linejoin:round;stroke-linecap:round}
.chip{display:inline-block;background:#E10600;color:#fff;font-weight:900;font-style:italic;letter-spacing:.06em;transform:skewX(-12deg)}
.chip span{display:inline-block;transform:skewX(12deg)}
.feat{display:flex;flex-direction:column;gap:.55em}
.feat div{display:flex;align-items:center;gap:.7em;color:#e8e8ee;font-weight:600}
.feat div::before{content:'';width:.55em;height:.55em;background:#E10600;transform:skewX(-14deg);flex:none}
.shot{position:absolute;border-radius:14px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.08)}
.shot img{display:block;width:100%}
`;

const trackSvg = (id, w, h, stroke, width, glow) => `
<script>(function(){const t=Career.track({db:BASE},'${id}')||BASE.tracks.find(x=>x.id==='${id}');const P=trackPath(t);
const pad=12;const sx=(${w}-pad*2)/P.w,sy=(${h}-pad*2)/P.h,s=Math.min(sx,sy);const ox=(${w}-P.w*s)/2,oy=(${h}-P.h*s)/2;
const d='M'+P.pts.map(p=>(ox+p[0]*s).toFixed(1)+' '+(oy+p[1]*s).toFixed(1)).join(' L')+' Z';
document.currentScript.insertAdjacentHTML('afterend','<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${glow ? `<path d="'+d+'" stroke="${glow}" stroke-width="${width * 4}" opacity=".25"/>` : ''}<path d="'+d+'" stroke="${stroke}" stroke-width="${width}"/></svg>');})();</script>`;

const pages = {
  // 400×400 — o X recorta em círculo: símbolo centralizado com folga
  'perfil-400x400.png': [400, 400, `<div id="c" style="width:400px;height:400px">
    <div class="carbon"></div>
    <div class="stripes" style="--sw:14px;left:-20px;right:-20px;bottom:44px;height:26px;opacity:.9"></div>
    <div style="position:absolute;left:50%;top:47%;transform:translate(-56%,-50%)">${'${mgcLogo(116).replace(/<span class="mgc-wm">.*<\\/span><\\/span>$/, "</span>")}'}</div>
  </div>`],
  // 1500×500 — a foto de perfil cobre o canto inferior esquerdo
  'banner-1500x500.png': [1500, 500, `<div id="c" style="width:1500px;height:500px">
    <div class="carbon"></div>
    <div class="track" style="right:30px;top:20px;opacity:.95">${trackSvg('interlagos', 560, 460, 'rgba(255,255,255,.85)', 5, '#E10600')}</div>
    <div class="stripes" style="--sw:16px;left:0;top:0;width:360px;height:30px"></div>
    <div style="position:absolute;left:430px;top:105px">
      <div class="eyebrow" style="font-size:20px">Moratelli Game Company apresenta</div>
      <div class="pw" style="font-size:150px;margin-top:18px">PIT <em>WALL</em></div>
      <div style="display:flex;align-items:center;gap:22px;margin-top:22px">
        <div style="font-weight:700;font-size:24px;letter-spacing:.34em;color:#d7d7dc">RACING SIMULATOR</div>
        <div class="chip" style="font-size:24px;padding:6px 18px"><span>EM BREVE</span></div>
      </div>
    </div>
    <div style="position:absolute;right:40px;bottom:30px;font-size:16px;color:#9a9aa5;letter-spacing:.1em">INTERLAGOS · SÃO PAULO</div>
  </div>`],
  // 1600×900 (16:9) — post de anúncio
  'post-anuncio-1600x900.png': [1600, 900, `<div id="c" style="width:1600px;height:900px">
    <div class="carbon"></div>
    <div class="stripes" style="--sw:18px;right:-30px;top:0;width:420px;height:34px"></div>
    ${shot64 ? `<div class="shot" style="width:980px;right:-110px;top:150px;transform:perspective(1800px) rotateY(-14deg) rotateX(4deg)"><img src="${shot64}"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,#0b0b10 0%,#0b0b10 34%,rgba(11,11,16,.55) 52%,rgba(11,11,16,0) 70%)"></div>` : ''}
    <div style="position:absolute;left:90px;top:120px">${'${mgcLogo(52)}'}</div>
    <div style="position:absolute;left:90px;top:250px">
      <div class="eyebrow" style="font-size:22px">Apresenta</div>
      <div class="pw" style="font-size:170px;margin-top:18px">PIT <em>WALL</em></div>
      <div style="font-weight:700;font-size:27px;letter-spacing:.34em;color:#d7d7dc;margin-top:18px">RACING SIMULATOR</div>
      <div class="feat" style="font-size:25px;margin-top:40px">
        <div>Fórmula 1 com dados reais de 2026</div>
        <div>16 categorias, da F4 à Fórmula E</div>
        <div>Toda a história desde 1950</div>
        <div>Para Windows · 100% em português</div>
      </div>
    </div>
    <div class="chip" style="position:absolute;left:96px;bottom:80px;font-size:38px;padding:10px 30px"><span>EM BREVE</span></div>
  </div>`],
};

(async () => {
  const b = await chromium.launch();
  for (const [name, [w, h, html]] of Object.entries(pages)) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(root, 'app', 'dist', 'index.html'));
    await p.waitForTimeout(300);
    await p.evaluate(([css, html]) => {
      document.querySelectorAll('style').forEach(s => { if (!s.textContent.includes('.mgc')) s.remove(); });
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      // eslint-disable-next-line no-new-func
      document.body.innerHTML = new Function('return `' + html.replace(/<script>[\s\S]*?<\/script>/g, m => '__S' + btoa(unescape(encodeURIComponent(m))) + 'S__') + '`')();
      document.body.innerHTML = document.body.innerHTML.replace(/__S([A-Za-z0-9+/=]+)S__/g, (m, x) => decodeURIComponent(escape(atob(x))));
      document.querySelectorAll('#c script').forEach(s => { const n = document.createElement('script'); n.textContent = s.textContent; s.replaceWith(n); });
    }, [CSS, html]);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    await (await p.$('#c')).screenshot({ path: path.join(out, name) });
    await p.close();
  }
  await b.close();
  console.log('peças geradas em docs/brand/x');
})();
