/* ============================================================
   PIT WALL — calendário por dia
   - G.today guarda a data (AAAA-MM-DD). O tempo anda dia a dia: o botão
     "Avançar" pula até o próximo dia com algo relevante (fim de semana de
     corrida, projeto ou peça concluída, mensagem importante).
   - Fim de semana começa na sexta (dois dias antes da corrida). Depois da
     corrida o dia passa a ser a segunda-feira seguinte.
   - Projetos de P&D por peça andam em dias (rnd.js: RnD.dayTick).
   - Quem simula etapas inteiras (observador, testes) passa pelos dias sem
     parar: Career.startWeekend completa os dias que faltam.
   - Bloqueios (só no modo Manager, só na interface): decisões pendentes
     (vermelho) e mensagens importantes não lidas (amarelo) impedem avançar.
   ============================================================ */
'use strict';

const Time = {};
Time.addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
Time.diff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
Time.MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
Time.MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
Time.WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
Time.WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
Time.fmt = (iso, wd) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00Z');
  const m = d.getUTCMonth(), day = d.getUTCDate(), w = d.getUTCDay();
  return byLang(`${wd ? Time.WD[w] + ', ' : ''}${day} ${Time.MONTHS[m]} ${d.getUTCFullYear()}`, `${wd ? Time.WD_EN[w] + ', ' : ''}${day} ${Time.MONTHS_EN[m]} ${d.getUTCFullYear()}`);
};

/* data da corrida da etapa i (o calendário real traz mês/dia; o ano é o da temporada) */
Time.raceDate = (G, i) => {
  const cal = G.season.calendar;
  const idx = clamp(i, 0, cal.length - 1);
  const tr = Career.track(G, cal[idx]);
  const y = G.season.year;
  if (tr && tr.date && /^\d{4}-\d{2}-\d{2}$/.test(tr.date)) {
    // a data real é de um ano anterior: mantém mês e cai no domingo mais próximo
    let iso = `${y}-${tr.date.slice(5)}`;
    if (iso.endsWith('-02-29')) iso = `${y}-02-28`;
    const w = new Date(iso + 'T12:00:00Z').getUTCDay();
    iso = Time.addDays(iso, w <= 3 ? -w : 7 - w);
    const prev = idx > 0 ? Time.raceDate(G, idx - 1) : null;
    if (prev && Time.diff(prev, iso) < 7) iso = Time.addDays(prev, 7);
    return iso;
  }
  return Time.addDays(`${y}-03-08`, idx * 14);
};
Time.weekendDay = (G, i = G.season.round) => Time.addDays(Time.raceDate(G, i), -2);

Time.init = (G) => {
  if (!G.season) return;
  if (G.today && G.todayYear === G.season.year) return;
  const r = G.season.round;
  G.today = r > 0 && r < G.season.calendar.length ? Time.addDays(Time.raceDate(G, r - 1), 1) : Time.addDays(Time.weekendDay(G, 0), -14);
  G.todayYear = G.season.year;
};

/* um dia: projetos andam; devolve o que aconteceu */
Time.day = (G) => {
  Time.init(G);
  G.today = Time.addDays(G.today, 1);
  const ev = [];
  if (typeof RnD !== 'undefined' && !Career.isObs(G)) RnD.dayTick(G, ev);
  return ev;
};

/* decisões e mensagens importantes que precisam de atenção antes de avançar */
Time.prio = (m) => m.prio || (m.choices ? 'decision' : 'normal');
Time.blockers = (G) => {
  if (!G || Career.isObs(G)) return [];
  return G.inbox.filter(m => (Time.prio(m) === 'decision' && m.choices && m.resolved == null) || (Time.prio(m) === 'important' && !m.read));
};

/* próximos acontecimentos (para a central) */
Time.upcoming = (G) => {
  Time.init(G);
  const out = [];
  if (!Career.seasonOver(G)) out.push({ date: Time.weekendDay(G), kind: 'weekend', label: Career.currentTrack(G).gp });
  if (typeof RnD !== 'undefined') RnD.milestones(G).forEach(x => out.push(x));
  return out.filter(x => x.date >= G.today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
};

/* anda até o próximo dia relevante; para antes se houver bloqueio */
Time.advance = (G) => {
  Time.init(G);
  if (Career.seasonOver(G)) return { stop: 'season' };
  if (Time.blockers(G).length) return { stop: 'blocked' };
  const target = Time.weekendDay(G);
  const evs = [];
  let n = 0;
  while (G.today < target && n++ < 400) {
    const ev = Time.day(G);
    evs.push(...ev);
    if (ev.length || Time.blockers(G).length) return { stop: 'event', events: evs };
  }
  return { stop: 'weekend', events: evs };
};

/* simulação contínua: completa os dias até o fim de semana sem parar */
Time.catchUp = (G) => {
  Time.init(G);
  const target = Time.weekendDay(G);
  let n = 0;
  while (G.today < target && n++ < 400) Time.day(G);
  if (G.today < target) G.today = target;
};

(function () {
  const sw = Career.startWeekend;
  Career.startWeekend = (G) => {
    Time.catchUp(G);
    const r = sw(G);
    // peça nova só num dos carros: diferença de desempenho entre os dois carros da equipe
    if (typeof RnD !== 'undefined' && G.weekend && !Career.isObs(G)) {
      const track = Career.track(G, G.weekend.trackId);
      Career.lineup(G, G.player.teamId).forEach(d => { const x = RnD.seatPerf(G, d.seat, track); if (x) G.weekend.dform[d.id] = +((G.weekend.dform[d.id] || 0) + x).toFixed(3); });
    }
    return r;
  };
  const fw = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => {
    const round = G.weekend ? G.weekend.round : G.season.round;
    const r = fw(G, ...a);
    G.today = Time.addDays(Time.raceDate(G, round), 1);
    G.todayYear = G.season.year;
    return r;
  };
  // mensagens: prioridade (vermelho = decisão, amarelo = importante)
  const mail = Career.mail;
  Career.mail = (G, m) => {
    const prio = m.prio || (m.choices ? 'decision' : (m.important || m.tag === 'dev') ? 'important' : 'normal');
    mail(G, { ...m, prio, date: G.today || null });
  };
})();
