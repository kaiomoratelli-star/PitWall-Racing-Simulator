// Desempenho da corrida ao vivo (regra 11 do dono: mudança visual pesada exige medição antes e depois).
// Cria uma carreira de Manager, larga uma corrida ao vivo a 4× e mede, em 1366x768 (janela) e 1920x1080 (tela cheia):
//   - FPS médio e mínimo (por segundo) e tempo de quadro médio e p95, pelo requestAnimationFrame;
//   - CPU da página (TaskDuration do DevTools / tempo de parede), em % de um núcleo;
//   - memória do JavaScript (heap usado no fim e o maior valor visto).
// Dois alvos:
//   - padrão: o build (app/dist/index.html) no Chromium do Playwright (sem janela; --headed para com janela);
//   - --electron: o aplicativo desktop de verdade (Electron do projeto), com aceleração de hardware;
//     --electron --no-gpu: o mesmo aplicativo com a aceleração desligada (--disable-hw-accel).
// Não altera nada no jogo. Os números dependem da máquina: compare só medições da mesma máquina.
// Uso: node scripts/perf-check.js [segundos=12] [saída.md] [--headed | --electron [--no-gpu]]
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium, _electron } = require('playwright');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const secs = +(args[0] || 12);
const outFile = args[1] ? path.resolve(args[1]) : null;
const headed = process.argv.includes('--headed');
const electron = process.argv.includes('--electron');
const noGpu = process.argv.includes('--no-gpu');
const file = path.join(root, 'app', 'dist', 'index.html');
if (!fs.existsSync(file)) { console.log('rode antes: node scripts/build.js'); process.exit(1); }
const VIEWS = [['janela', 1366, 768], ['tela cheia', 1920, 1080]];

async function measure(p) {
  await p.evaluate(() => {
    try { closeModal(); } catch (e) { /* sem modal */ }
    G = Career.create(BASE, { mode: 'manager', teamId: 'mclaren', seed: 'perf', name: 'Teste' });
    if (G.teamSetup && G.teamSetup.pending && typeof Owners !== 'undefined' && Owners.autoSetup) Owners.autoSetup(G);
    Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G);
    go('race');
    if (ACT.lightsOut) ACT.lightsOut({ dataset: {} });
    UI.raceSpeed = 4; if (UI.racePaused) ACT.racePlay();
  });
  await p.waitForTimeout(1500);   // aquecimento
  const cdp = await p.context().newCDPSession(p); await cdp.send('Performance.enable');
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const m0 = await metric(); const t0 = Date.now();
  const frames = await p.evaluate((secs) => new Promise(res => {
    const dts = []; const perSec = []; let last = performance.now(), start = last, secStart = last, n = 0, peak = 0;
    const tick = (t) => {
      dts.push(t - last); last = t; n++;
      if (performance.memory) peak = Math.max(peak, performance.memory.usedJSHeapSize);
      if (t - secStart >= 1000) { perSec.push(n * 1000 / (t - secStart)); n = 0; secStart = t; }
      if (t - start < secs * 1000) requestAnimationFrame(tick); else res({ dts: dts.slice(1), perSec, peak, lap: G.weekend && G.weekend.race ? G.weekend.race.lap : null });
    };
    requestAnimationFrame(tick);
  }), secs);
  const m1 = await metric(); const wall = (Date.now() - t0) / 1000;
  const dts = frames.dts.slice().sort((a, c) => a - c);
  const mean = dts.reduce((a, c) => a + c, 0) / dts.length;
  return {
    fps: 1000 / mean, fpsMin: Math.min(...frames.perSec), ft: mean, ft95: dts[Math.floor(dts.length * 0.95)],
    cpu: (m1.TaskDuration - m0.TaskDuration) / wall * 100,
    heap: m1.JSHeapUsedSize / 1048576, peak: Math.max(frames.peak, m1.JSHeapUsedSize) / 1048576, lap: frames.lap,
  };
}

async function inBrowser(b, w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('pw-lang', 'pt'); } catch (e) { /* sem armazenamento */ } });
  await p.goto('file://' + file); await p.waitForTimeout(500);
  const r = await measure(p); await p.close();
  return { ...r, errs: errs.length };
}

async function inElectron(w, h) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitwall-perf-'));
  const app = await _electron.launch({ args: [root, `--data-dir=${dataDir}`, ...(noGpu ? ['--disable-hw-accel'] : [])] });
  try {
    let p = null;
    for (let i = 0; i < 100 && !p; i++) { p = app.windows().find(x => /index\.html/.test(x.url())) || null; if (!p) await new Promise(r => setTimeout(r, 200)); }
    if (!p) throw new Error('janela do jogo não abriu');
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.waitForFunction(() => typeof Career !== 'undefined' && typeof go === 'function', null, { timeout: 30000 });
    await app.evaluate(({ BrowserWindow }, [w, h]) => {
      const win = BrowserWindow.getAllWindows().find(x => /index\.html/.test(x.webContents.getURL()));
      if (win.isFullScreen()) win.setFullScreen(false);
      if (win.isMaximized()) win.unmaximize();
      win.setContentSize(w, h); win.center(); win.focus();
    }, [w, h]);
    await p.waitForTimeout(800);
    const gpu = await app.evaluate(({ app }) => app.getGPUFeatureStatus().gpu_compositing);
    const r = await measure(p);
    return { ...r, errs: errs.length, gpu };
  } finally { await app.close(); fs.rmSync(dataDir, { recursive: true, force: true }); }
}

(async () => {
  const b = electron ? null : await chromium.launch({ headless: !headed });
  const rows = [];
  for (const [name, w, h] of VIEWS) rows.push({ name, w, h, ...(electron ? await inElectron(w, h) : await inBrowser(b, w, h)) });
  if (b) await b.close();
  const f = (x, d = 1) => x.toFixed(d).replace('.', ',');
  const table = [`| Tela | FPS médio | FPS mínimo | Quadro médio (ms) | Quadro p95 (ms) | CPU (% de 1 núcleo) | Heap JS no fim (MB) | Heap JS máximo (MB) | Volta ao fim |${electron ? ' Composição pela GPU |' : ''} Erros |`,
    `|---|---|---|---|---|---|---|---|---|${electron ? '---|' : ''}---|`,
    ...rows.map(r => `| ${r.name} ${r.w}x${r.h} | ${f(r.fps)} | ${f(r.fpsMin)} | ${f(r.ft, 2)} | ${f(r.ft95, 2)} | ${f(r.cpu)} | ${f(r.heap)} | ${f(r.peak)} | ${r.lap} |${electron ? ` ${r.gpu} |` : ''} ${r.errs} |`)].join('\n');
  console.log(table);
  if (outFile) {
    const pkg = require(path.join(root, 'package.json'));
    const target = electron ? `aplicativo Electron ${require('electron/package.json').version} (${noGpu ? 'aceleração de hardware desligada' : 'aceleração de hardware ligada'})`
      : `Chromium do Playwright ${require('playwright/package.json').version}${headed ? ' (com janela)' : ' (sem janela)'}`;
    const head = `Medido em ${new Date().toLocaleDateString('sv-SE')} · jogo v${pkg.version} · ${target} · ` +
      `${os.cpus()[0].model.trim()} (${os.cpus().length} threads) · ${Math.round(os.totalmem() / 1073741824)} GB · ${os.type()} ${os.release()} · corrida ao vivo a 4×, ${secs} s por tela após 1,5 s de aquecimento.`;
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, `${head}\n\n${table}\n`);
    console.log('gravado em ' + path.relative(root, outFile));
  }
  if (rows.some(r => r.errs)) process.exit(1);
})();
