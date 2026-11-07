/* ============================================================
   PIT WALL — gerador de circuitos e logística do calendário
   O traçado nasce dos parâmetros (curvas, retas, tipo, superfície),
   e o perfil técnico da simulação é derivado deles de forma coerente.
   ============================================================ */
'use strict';

const CircuitGen = {};

/* parâmetros → características usadas pela simulação */
CircuitGen.derive = (p) => {
  const fast = p.fast / 100, slow = p.slow / 100, med = Math.max(0, 1 - fast - slow);
  const straight = clamp(p.longest / 1400, 0.1, 1);
  const street = p.type === 'street';
  let aero = 0.18 + fast * 0.38 + med * 0.12 - straight * 0.06;
  let engine = 0.12 + straight * 0.32 + p.straights * 0.025;
  let chassis = 0.2 + slow * 0.3 + (street ? 0.06 : 0);
  const tot = aero + engine + chassis; aero /= tot; engine /= tot; chassis /= tot;
  const avgSpeed = clamp(150 + fast * 95 + straight * 35 - slow * 55 - (street ? 18 : 0) - p.elevation / 20, 140, 260);
  return {
    weights: { aero: +aero.toFixed(2), chassis: +chassis.toFixed(2), engine: +engine.toFixed(2) },
    overtaking: +clamp(0.12 + p.straights * 0.1 + straight * 0.35 - (street ? 0.18 : 0) - slow * 0.1, 0.03, 0.85).toFixed(2),
    tyreStress: +clamp(0.65 + p.abrasion / 100 * 0.55 + fast * 0.35 + p.elevation / 400, 0.6, 1.6).toFixed(2),
    baseLap: +(p.length / avgSpeed * 3600).toFixed(1),
    pitLoss: +clamp(17 + p.length * 0.6 + (street ? 2 : 0), 16, 30).toFixed(1),
    scFactor: street ? 1.6 : 1.0,
    drs: clamp(p.straights, 1, 4),
    laps: Math.ceil(305 / p.length),
    street,
  };
};

/* traçado fechado: envoltória convexa de pontos aleatórios + deslocamento dos pontos médios
   (gera curvas e grampos) + correção de ângulos e cruzamentos + suavização Catmull-Rom.
   Retas longas viram segmentos da envoltória mantidos sem deslocamento. */
CircuitGen._hull = (pts) => {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
CircuitGen._crosses = (poly) => {
  const n = poly.length;
  const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    const a = poly[i], b = poly[(i + 1) % n], c = poly[j], d = poly[(j + 1) % n];
    if (ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d)) return true;
  }
  return false;
};
CircuitGen._spline = (pts, sub) => {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
};
CircuitGen.shape = (p, seed) => {
  const street = p.type === 'street';
  const want = clamp(Math.round(p.turns * (street ? 0.8 : 0.85)), 6, 26);
  for (let attempt = 0; attempt < 40; attempt++) {
    const r = localRng(seed + attempt * 7919);
    const cloud = Array.from({ length: 14 + Math.floor(r() * 10) }, () => [r() * (street ? 1 : 1.25), r()]);
    let poly = CircuitGen._hull(cloud);
    // retas longas: as arestas mais compridas da envoltória ficam intactas
    const edges = poly.map((a, i) => ({ i, len: Math.hypot(poly[(i + 1) % poly.length][0] - a[0], poly[(i + 1) % poly.length][1] - a[1]) })).sort((x, y) => y.len - x.len);
    const keep = new Set(edges.slice(0, clamp(p.straights || 1, 1, 4)).map(e => e.i));
    // desloca pontos médios até atingir o número de curvas pedido
    let guard = 0;
    while (poly.length < want && guard++ < 200) {
      const n = poly.length;
      const cand = poly.map((a, i) => i).filter(i => !keep.has(i));
      if (!cand.length) break;
      const i = cand[Math.floor(r() * cand.length)];
      const a = poly[i], b = poly[(i + 1) % n];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.08) { keep.add(i); continue; }
      const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
      const slow = r() < (p.slow || 30) / 100;
      const amt = (slow ? 0.25 + r() * 0.3 : 0.09 + r() * 0.2) * len * (r() < 0.75 ? 1 : -1);
      const m = [(a[0] + b[0]) / 2 + nx * amt, (a[1] + b[1]) / 2 + ny * amt];
      const next = poly.slice(0, i + 1).concat([m], poly.slice(i + 1));
      if (!CircuitGen._crosses(next)) {
        // as retas preservadas mudam de índice depois da inserção
        const k2 = new Set(); keep.forEach(k => k2.add(k > i ? k + 1 : k)); keep.clear(); k2.forEach(k => keep.add(k));
        poly = next;
      } else keep.add(i);
    }
    // afasta pontos colados
    for (let it = 0; it < 4; it++) for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d < 0.05 && d > 0) { const f = (0.05 - d) / d / 2; a[0] -= (b[0] - a[0]) * f; a[1] -= (b[1] - a[1]) * f; b[0] += (b[0] - a[0]) * f; b[1] += (b[1] - a[1]) * f; }
    }
    // pistas de rua: cantos de 90° (spline com menos subdivisões e pontos auxiliares perto dos vértices)
    let base = poly;
    if (street) {
      base = [];
      poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; base.push(a, [a[0] + (b[0] - a[0]) * 0.12, a[1] + (b[1] - a[1]) * 0.12], [a[0] + (b[0] - a[0]) * 0.88, a[1] + (b[1] - a[1]) * 0.88]); });
    }
    const sm = CircuitGen._spline(base, street ? 5 : 10);
    if (CircuitGen._crosses(sm.filter((_, i) => i % 3 === 0))) continue;
    const xs = sm.map(q => q[0]), ys = sm.map(q => q[1]);
    const mx = Math.min(...xs), my = Math.min(...ys), span = Math.max(Math.max(...xs) - mx, Math.max(...ys) - my);
    const norm = sm.map(q => [+((q[0] - mx) / span).toFixed(4), +((q[1] - my) / span).toFixed(4)]);
    // linha de largada no meio da reta mais longa
    let li = 0, ll = 0;
    poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d > ll) { ll = d; li = i; } });
    const startIdx = (street ? (3 * li + 1) * 5 + 3 : li * 10 + 6) % norm.length;
    const rot = norm.slice(startIdx).concat(norm.slice(0, startIdx));
    rot.push(rot[0]);
    return rot;
  }
  return null;
};

/* ---------- gerador por trechos (0.8) ----------
   A pista é montada como um piloto a percorreria: reta, curva, reta...
   - p.straights retas longas (a maior com p.longest metros);
   - p.turns curvas, divididas entre rápidas (p.fast %), lentas (p.slow %) e médias;
     lentas viram grampos ou chicanes; rápidas são arcos longos e abertos;
   - pista de rua: cantos de 90°, retas de quarteirão, poucas curvas abertas;
   - a soma dos ângulos fecha a volta (360°), o erro de posição é distribuído
     ao longo do traçado e a pista é escalada para a extensão pedida;
   - traçados que se cruzam ou encostam são descartados (outra semente). */
CircuitGen.build = (p, seed) => {
  const street = p.type === 'street';
  const turns = clamp(Math.round(p.turns || 14), 5, 26);
  const nStraight = clamp(Math.round(p.straights || 2), 1, 5);
  const fastP = (p.fast ?? 35) / 100, slowP = (p.slow ?? 30) / 100;
  for (let attempt = 0; attempt < 80; attempt++) {
    const r = localRng(seed * 31 + attempt * 7919 + 17);
    // 1) tipos de curva
    const kinds = Array.from({ length: turns }, () => { const x = r(); return x < slowP ? (r() < 0.35 ? 'chicane' : 'slow') : x < slowP + fastP ? 'fast' : 'medium'; });
    // 2) ângulos (graus) e raios relativos; sinal: maioria para o lado do sentido da pista
    const segs = kinds.map(k => {
      let ang, rad;
      if (street) { ang = k === 'fast' ? 45 : k === 'chicane' ? 60 : 90; rad = k === 'fast' ? 60 : 18; }
      else if (k === 'fast') { ang = 25 + r() * 45; rad = 140 + r() * 160; }
      else if (k === 'medium') { ang = 55 + r() * 55; rad = 55 + r() * 60; }
      else if (k === 'chicane') { ang = 35 + r() * 25; rad = 20 + r() * 15; }
      else { ang = r() < 0.45 ? 150 + r() * 35 : 80 + r() * 50; rad = 16 + r() * 22; }
      return { k, ang, rad, sign: r() < (street ? 0.72 : 0.68) ? 1 : -1 };
    });
    // chicane = par esquerda-direita: acrescenta o contra-giro
    const all = [];
    segs.forEach(s => { all.push(s); if (s.k === 'chicane') all.push({ k: 'chicane2', ang: s.ang, rad: s.rad, sign: -s.sign }); });
    // fecha 360°: escala as curvas no sentido principal
    const pos = all.filter(s => s.sign > 0), neg = all.filter(s => s.sign < 0);
    const negSum = neg.reduce((a, s) => a + s.ang, 0), posSum = pos.reduce((a, s) => a + s.ang, 0);
    if (posSum <= 0) continue;
    const need = 360 + negSum;
    let f = need / posSum;
    if (street) { // ângulos de rua continuam múltiplos de 45°
      if (Math.abs(f - 1) > 0.01) {
        pos.forEach(s => (s.ang = Math.max(45, Math.round(s.ang * f / 45) * 45)));
        // ajusta de 45 em 45 graus até fechar a volta
        for (let g = 0; g < 60; g++) {
          const tot = pos.reduce((a, s) => a + s.ang, 0) - negSum;
          if (tot === 360) break;
          const c = pos[Math.floor(r() * pos.length)];
          if (tot > 360 && c.ang > 45) c.ang -= 45; else if (tot < 360 && c.ang < 135) c.ang += 45;
        }
        if (pos.reduce((a, s) => a + s.ang, 0) - negSum !== 360) continue;
      }
    } else { if (f < 0.55 || f > 1.9) continue; pos.forEach(s => (s.ang *= f)); }
    // 3) retas: as longas entram depois das curvas lentas (zona de frenagem no fim)
    const L = all.map(() => (street ? 80 + r() * 160 : 40 + r() * 180));
    const slowIdx = all.map((s, i) => [s, i]).filter(([s]) => s.k === 'slow' || s.k === 'medium').map(([, i]) => i);
    const order = slowIdx.length ? slowIdx : all.map((_, i) => i);
    for (let k = 0; k < nStraight; k++) {
      const i = order[Math.floor(r() * order.length)];
      L[i] = k === 0 ? clamp(p.longest || 900, 300, 2000) : (street ? 250 : 350) + r() * 450;
    }
    // 4) percorre: reta, curva (arco amostrado)
    const pts = [[0, 0]]; let x = 0, y = 0, h = 0;
    const step = 12;
    all.forEach((s, i) => {
      for (let d = step; d <= L[i]; d += step) { x += Math.cos(h) * step; y += Math.sin(h) * step; pts.push([x, y]); }
      const a = s.ang * Math.PI / 180 * s.sign, arc = Math.abs(a) * s.rad, n = Math.max(2, Math.ceil(arc / step));
      for (let k = 0; k < n; k++) { h += a / n; x += Math.cos(h) * arc / n; y += Math.sin(h) * arc / n; pts.push([x, y]); }
    });
    // 5) fecha: distribui o erro ao longo da volta
    const ex = x, ey = y, N = pts.length - 1;
    const closed = pts.map(([px, py], i) => [px - ex * i / N, py - ey * i / N]);
    // 6) cruzamentos e trechos encostados
    const sm = closed.filter((_, i) => i % 3 === 0);
    if (CircuitGen._crosses(sm)) continue;
    let tooClose = false;
    const tot = closed.length;
    for (let i = 0; i < tot && !tooClose; i += 4) for (let j = i + 24; j < tot - (i < 24 ? 24 - i : 0); j += 4) { if (Math.hypot(closed[i][0] - closed[j][0], closed[i][1] - closed[j][1]) < 26) { tooClose = true; break; } }
    if (tooClose) continue;
    // 7) normaliza e começa no meio da reta mais longa
    const xs = closed.map(q => q[0]), ys = closed.map(q => q[1]);
    const mx = Math.min(...xs), my = Math.min(...ys), span = Math.max(Math.max(...xs) - mx, Math.max(...ys) - my);
    let norm = closed.map(q => [+((q[0] - mx) / span).toFixed(4), +((q[1] - my) / span).toFixed(4)]);
    let li = 0, run = 0, best = 0, bestEnd = 0;
    for (let i = 1; i < norm.length; i++) { const a0 = Math.atan2(norm[i][1] - norm[i - 1][1], norm[i][0] - norm[i - 1][0]); const a1 = i > 1 ? Math.atan2(norm[i - 1][1] - norm[i - 2][1], norm[i - 1][0] - norm[i - 2][0]) : a0; if (Math.abs(a0 - a1) < 0.01) { run++; if (run > best) { best = run; bestEnd = i; } } else run = 0; }
    li = Math.max(0, bestEnd - Math.floor(best / 2));
    norm = norm.slice(li).concat(norm.slice(1, li + 1));
    // reduz pontos (o desenho usa ~200)
    const keepEvery = Math.max(1, Math.floor(norm.length / 220));
    const out = norm.filter((_, i) => i % keepEvery === 0); out.push(out[0]);
    return { shape: out, turns: all.length, meters: Math.round(pts.length * step) };
  }
  return null;
};

CircuitGen.create = (p) => {
  const seed = Math.floor(Math.random() * 1e9);
  const d = CircuitGen.derive(p);
  const id = 'gen-' + (p.name || 'circuito').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + seed.toString(36).slice(-4);
  return {
    id, gp: `GP ${p.gpName || p.city || p.name}`, circuit: p.name, place: p.city, country: p.country || 'BRA', length: p.length, turns: p.turns,
    ...d, rain: clamp((p.rain ?? 20) / 100, 0, 0.9), shape: (CircuitGen.build(p, seed % 100000) || {}).shape || CircuitGen.shape(p, seed) || undefined, shapeSeed: seed % 100000, generated: true,
    elevation: p.elevation, abrasion: p.abrasion, gen: { ...p }, lat: p.lat ?? null, lon: p.lon ?? null, type: p.type === 'street' ? 'STREET' : 'RACE', alloc: null,
  };
};

/* distância geográfica entre etapas (km) */
CircuitGen.km = (a, b) => {
  if (a.lat == null || b.lat == null) return 2500;
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
};
CircuitGen.logistics = (db) => {
  const tr = db.calendar.map(id => db.tracks.find(t => t.id === id)).filter(Boolean);
  let total = 0;
  const legs = tr.map((t, i) => { const k = i ? CircuitGen.km(tr[i - 1], t) : 0; total += k; return k; });
  return { legs, total };
};
/* viagem até a etapa atual (km) e custo de frete em US$ mi */
CircuitGen.legKm = (G) => {
  const cal = G.season.calendar, i = G.season.round; // chamado antes de avançar a rodada
  if (!i) return 0;
  const a = G.db.tracks.find(t => t.id === cal[i - 1]), b = G.db.tracks.find(t => t.id === cal[i]);
  return a && b ? CircuitGen.km(a, b) : 2500;
};
CircuitGen.freight = (km) => +(km / 1000 * 0.07).toFixed(3);
/* reordena mantendo a primeira e a última etapa, minimizando viagens (vizinho mais próximo) */
CircuitGen.optimize = (db) => {
  const tr = db.calendar.map(id => db.tracks.find(t => t.id === id)).filter(Boolean);
  if (tr.length < 4) return db.calendar;
  const first = tr[0], last = tr[tr.length - 1];
  const rest = tr.slice(1, -1);
  const out = [first];
  let cur = first;
  while (rest.length) {
    let bi = 0, bk = Infinity;
    rest.forEach((t, i) => { const k = CircuitGen.km(cur, t); if (k < bk) { bk = k; bi = i; } });
    cur = rest.splice(bi, 1)[0]; out.push(cur);
  }
  out.push(last);
  return out.map(t => t.id);
};
