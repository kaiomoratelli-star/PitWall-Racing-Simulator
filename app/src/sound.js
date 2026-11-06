/* ============================================================
   PIT WALL — sons sintetizados (WebAudio, sem arquivos externos)
   Motor ao vivo durante a corrida, luzes de largada, pit stop,
   Safety Car, rádio e ultrapassagens. Desligável nas opções.
   ============================================================ */
'use strict';

const Sound = {
  ctx: null, master: null, drone: null, lastEv: 0, lastRace: null, lastPlay: 0, beat: 0,
  get on() { try { return localStorage.getItem('pw-sound') !== '0'; } catch (e) { return true; } },
  set on(v) { try { localStorage.setItem('pw-sound', v ? '1' : '0'); } catch (e) { /* sem armazenamento */ } if (!v) Sound.stopDrone(); },
  get vol() { try { const v = Number(localStorage.getItem('pw-volume')); return isFinite(v) && localStorage.getItem('pw-volume') != null ? v : 0.6; } catch (e) { return 0.6; } },
  set vol(v) { try { localStorage.setItem('pw-volume', String(v)); } catch (e) { /* sem armazenamento */ } if (Sound.master) Sound.master.gain.value = v * 0.5; },
};

/* o navegador só libera áudio depois de um gesto do usuário */
Sound.prime = () => {
  if (!Sound.on) return null;
  try {
    if (!Sound.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      Sound.ctx = new AC();
      Sound.master = Sound.ctx.createGain();
      Sound.master.gain.value = Sound.vol * 0.5;
      Sound.master.connect(Sound.ctx.destination);
    }
    if (Sound.ctx.state === 'suspended') Sound.ctx.resume();
  } catch (e) { return null; }
  return Sound.ctx;
};

Sound.tone = (freq, dur, type = 'sine', gain = 0.3, when = 0, slideTo = null) => {
  const c = Sound.prime(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(Sound.master); o.start(t); o.stop(t + dur + 0.05);
};
Sound.noise = (dur, { gain = 0.25, f = 1200, q = 0.8, type = 'bandpass', when = 0, sweep = null } = {}) => {
  const c = Sound.prime(); if (!c) return;
  const t = c.currentTime + when;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl); fl.connect(g); g.connect(Sound.master); src.start(t); src.stop(t + dur + 0.05);
};

/* luzes de largada */
Sound.beep = () => Sound.tone(880, 0.16, 'square', 0.12);
Sound.go = () => { Sound.tone(70, 0.6, 'sawtooth', 0.22, 0, 160); Sound.noise(1.6, { gain: 0.18, f: 400, q: 0.5, type: 'lowpass', sweep: 2600 }); Sound.startDrone(); };
/* efeitos */
Sound.pit = () => { for (let i = 0; i < 4; i++) Sound.noise(0.07, { gain: 0.3, f: 3200, q: 1.5, type: 'highpass', when: i * 0.09 + (i > 1 ? 0.3 : 0) }); };
Sound.sc = () => { Sound.tone(660, 0.22, 'triangle', 0.16); Sound.tone(495, 0.3, 'triangle', 0.16, 0.25); };
Sound.radio = () => { Sound.noise(0.12, { gain: 0.12, f: 1800, q: 3 }); Sound.tone(1320, 0.06, 'square', 0.05, 0.13); };
Sound.whoosh = () => Sound.noise(0.55, { gain: 0.16, f: 300, q: 1.2, sweep: 2400 });
Sound.crash = () => { Sound.noise(0.5, { gain: 0.32, f: 600, q: 0.6, type: 'lowpass', sweep: 120 }); Sound.tone(60, 0.35, 'sine', 0.25); };
Sound.flag = () => { Sound.tone(523, 0.12, 'square', 0.1); Sound.tone(523, 0.12, 'square', 0.1, 0.18); };
Sound.finish = () => [523, 659, 784, 1047].forEach((f, i) => Sound.tone(f, 0.28, 'triangle', 0.14, i * 0.13));
Sound.ui = () => Sound.tone(1200, 0.04, 'sine', 0.04);

/* motor: dois osciladores dente-de-serra com marchas subindo e descendo */
Sound.startDrone = () => {
  const c = Sound.prime(); if (!c || Sound.drone) return;
  const g = c.createGain(); g.gain.value = 0.0001;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 1.4;
  const o1 = c.createOscillator(), o2 = c.createOscillator();
  o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 110; o2.frequency.value = 110 * 1.007;
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(Sound.master);
  o1.start(); o2.start();
  g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.5);
  let rpm = 0.3, gear = 2;
  const iv = setInterval(() => {
    if (!Sound.drone) return;
    rpm += 0.035 + Math.random() * 0.01;
    if (rpm > 1) { rpm = 0.45; gear = gear % 8 + 1; }
    const f = 85 + rpm * (95 + gear * 6);
    const t = c.currentTime;
    o1.frequency.setTargetAtTime(f, t, 0.03); o2.frequency.setTargetAtTime(f * 1.007, t, 0.03);
    lp.frequency.setTargetAtTime(500 + rpm * 1400, t, 0.05);
    if (Date.now() - Sound.beat > 1500) Sound.stopDrone();
  }, 60);
  Sound.drone = { o1, o2, g, iv };
  Sound.beat = Date.now();
};
Sound.stopDrone = () => {
  const d = Sound.drone; if (!d) return;
  Sound.drone = null;
  clearInterval(d.iv);
  try { const t = Sound.ctx.currentTime; d.g.gain.setTargetAtTime(0.0001, t, 0.15); d.o1.stop(t + 0.6); d.o2.stop(t + 0.6); } catch (e) { /* já parado */ }
};

/* chamado a cada atualização da tela de corrida */
Sound.raceUpdate = (race) => {
  if (!Sound.on || !race) return;
  if (Sound.lastRace !== race) { Sound.lastRace = race; Sound.lastEv = race.events.length; }
  const live = !UI.racePaused && !race.finished;
  if (live) { Sound.beat = Date.now(); if (!Sound.drone && race.lap > 0) Sound.startDrone(); if (Sound.drone) Sound.drone.g.gain.setTargetAtTime(race.sc ? 0.025 : 0.06, Sound.ctx.currentTime, 0.3); }
  else Sound.stopDrone();
  const fresh = race.events.slice(Sound.lastEv);
  Sound.lastEv = race.events.length;
  if (!fresh.length || Date.now() - Sound.lastPlay < 280) return;
  const mine = (e) => e.did && race.cars.some(c => c.did === e.did && c.isPlayer);
  const pick = fresh.find(e => e.type === 'crash') || fresh.find(e => e.type === 'sc' || (e.type === 'flag' && /vermelha/i.test(e.text))) || fresh.find(e => e.type === 'pit' && mine(e)) || fresh.find(e => e.type === 'finish') || fresh.find(e => e.type === 'overtake' && mine(e)) || fresh.find(e => e.type === 'flag');
  if (!pick) return;
  Sound.lastPlay = Date.now();
  ({ crash: Sound.crash, sc: Sound.sc, pit: Sound.pit, finish: Sound.finish, overtake: Sound.whoosh, flag: Sound.flag }[pick.type] || Sound.radio)();
};
