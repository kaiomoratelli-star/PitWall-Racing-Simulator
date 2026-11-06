/* ============================================================
   PIT WALL — telas de gestão
   ============================================================ */
'use strict';

/* ================= TÍTULO ================= */
SCREENS.title = {
  bare: true,
  html() {
    const db = BASE;
    const slots = UI.slotMetas || {};
    const slotHtml = Store.SLOTS.map((s, i) => {
      const m = slots[s];
      if (!m) return '';
      return `<button class="slot-card" data-act="loadSlot" data-slot="${s}"><span class="livery" style="background:${esc(m.color || '#888')}"></span><span style="min-width:0"><b>${esc(m.team)}</b><br><span class="small muted">${esc(m.player)} · ${m.year} · etapa ${Math.min(m.round + 1, m.total)}/${m.total}</span></span><span class="spacer"></span><span class="label">Jogo ${i + 1}</span></button>`;
    }).join('');
    if (!UI.titleTrack) { const pool = db.tracks.filter(t => imgUrl(t.heroImg)); UI.titleTrack = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; }
    if (!UI.titleTeam) UI.titleTeam = db.teams[Math.floor(Math.random() * db.teams.length)];
    const hero = UI.titleTrack && imgUrl(UI.titleTrack.heroImg);
    return `
    <div class="title-screen ${hero ? 'photo' : ''}" ${hero ? `style="background-image:url('${hero}')"` : ''}>
      <div class="title-left">
        <div class="stack" style="gap:14px">
          <div class="eyebrow">${esc(db.rules.seriesName)}</div>
          <div class="logo-big">PIT <em style="color:var(--accent)">WALL</em></div>
          <p class="muted" style="max-width:48ch;color:var(--fg2)">Comande uma equipe da Fórmula 1 ou acompanhe o campeonato como observador. Pilotos, equipes, circuitos e toda a história desde 1950 com dados reais.</p>
        </div>
        <div class="title-menu">
          ${slotHtml ? `<div class="label">Continuar</div>${slotHtml}` : ''}
          <button class="btn primary lg" data-act="go" data-v="newcareer">Nova carreira</button>
          <div class="row">
            <button class="btn" data-act="openEditorBase">Editor da base</button>
            <button class="btn" data-act="openAccount">Perfil e ativação</button>
            <label class="btn" for="importSave">Importar jogo salvo</label>
            <input type="file" id="importSave" accept=".json,application/json" hidden data-chg="importSave">
          </div>
          ${I18N.pickerHtml()}
        </div>
        <div class="timing-strip">
          <span>BASE <b>${esc(db.name)}</b></span>${db.ref ? `<span>DADOS ATÉ <b>${esc(db.ref)}</b></span>` : ''}
          <span>EQUIPES <b>${db.teams.length}</b></span>
          <span>PILOTOS <b>${db.drivers.length}</b></span>
          <span>PISTAS <b>${db.calendar.length}</b></span>
          <span>SALVAMENTO <b>${Store.native ? 'no computador' : Store.cloud() ? 'na sua conta' : 'neste navegador'}</b></span>
        </div>
        <div class="studio">${mgcLogo(30)}<span>Uma produção ${COMPANY} · v${APP_VERSION} · © 2026</span></div>
        ${disclaimerHtml()}
      </div>
      <div class="title-right">${hero ? `<div class="title-car">${carImg(UI.titleTeam)}<div class="small" style="margin-top:8px;color:var(--fg2)">${esc(UI.titleTrack.circuit)} · ${esc(UI.titleTrack.place || '')}</div></div>` : '<canvas id="titleCanvas"></canvas>'}</div>
    </div>`;
  },
  after() { if ($('#titleCanvas')) startTitleAnim(); },
};

function startTitleAnim() {
  cancelAnimationFrame(UI.anim);
  const cv = $('#titleCanvas'); if (!cv) return;
  const tr = BASE.tracks[Math.floor(Math.random() * BASE.tracks.length)];
  const cars = BASE.teams.slice(0, 10).map((t, i) => ({ color: t.color, base: i * 0.031, speed: 0.0011 + Math.random() * 0.0002 }));
  let t0 = performance.now();
  const loop = (now) => {
    if (!$('#titleCanvas')) return;
    const dt = now - t0;
    drawTrack(cv, tr, cars.map(c => ({ color: c.color, frac: 1 - (c.base + dt * c.speed / 16) % 1 })), { pad: 40, thick: 16 });
    UI.anim = requestAnimationFrame(loop);
  };
  UI.anim = requestAnimationFrame(loop);
}

ACT.loadSlot = async (el) => {
  const g = await Store.loadGame(el.dataset.slot);
  if (!g) return toast('Não foi possível carregar esse jogo.', 'bad');
  SLOT = el.dataset.slot;
  loadCareer(g);
};
function loadCareer(g) {
  try {
    const steps = Migrate.run(g);
    if (steps.length) { Store.log('info', 'save migrado: ' + steps.join(', ')); toast(`Save atualizado para a versão atual (${steps.join(', ')}).`, 'good'); }
  } catch (e) { Store.log('error', 'migração: ' + e.message); return toast(e.message, 'bad'); }
  G = g;
  RNG.state = G.rngState || G.seed;
  cancelAnimationFrame(UI.anim);
  go(G.weekend ? (G.weekend.phase === 'race' ? 'race' : 'weekend') : 'hub');
}
CHG.importSave = async (el) => {
  const f = el.files[0]; if (!f) return;
  try {
    const obj = await Store.readFile(f);
    if (obj && obj.season && obj.db && obj.player) { SLOT = (await firstFreeSlot()) || 'slot3'; loadCareer(obj); autosave(); toast('Jogo importado.', 'good'); }
    else if (obj && obj.teams && obj.drivers && obj.tracks) { BASE = normalizeDb(obj); await Store.saveBaseDb(BASE); toast('Base de dados importada. Ela será usada em novas carreiras.', 'good'); render(); }
    else toast('Arquivo não reconhecido.', 'bad');
  } catch (e) { toast(e.message, 'bad'); }
};
async function firstFreeSlot() {
  for (const s of Store.SLOTS) if (!(UI.slotMetas || {})[s]) return s;
  return null;
}

/* ================= NOVA CARREIRA ================= */
const NC = { mode: 'manager', teamId: null, name: '', nat: 'BRA', seed: '', difficulty: 'normal', aiEvents: true, rainMult: 1, eventRate: 1, variance: 1, slot: null, practiceFormat: 'real' };
SCREENS.newcareer = {
  bare: true,
  html() {
    const db = BASE;
    if (!NC.teamId) NC.teamId = (db.teams.find(t => t.id === 'bravura') || db.teams[db.teams.length - 1]).id;
    const fakeG = { db, season: { year: db.rules.startYear } };
    const strength = (t) => {
      const ds = db.drivers.filter(d => d.team === t.id).slice(0, 2);
      return Engine.carRating(db, t) * 0.75 + avg(ds.map(driverOverall)) * 0.25;
    };
    const ranked = db.teams.slice().sort((a, b) => strength(b) - strength(a));
    const cards = ranked.map((t, i) => {
      const ds = db.drivers.filter(d => d.team === t.id).slice(0, 2);
      const eng = Engine.engineOf(db, t);
      const car = Engine.carRating(db, t);
      return `<button class="team-card ${NC.teamId === t.id ? 'on' : ''}" data-act="ncTeam" data-id="${t.id}">
        <div class="stripe" style="background:linear-gradient(90deg, ${t.color} 70%, ${t.color2} 70%)"></div>
        <div class="body">
          <div class="row between"><span class="row" style="gap:8px;flex-wrap:nowrap">${teamLogo(t, 'sm')}<b style="font-family:var(--f-display);font-size:19px">${esc(t.name)}</b></span><span class="chip">${ordinal(i + 1)} favorita</span></div>
          ${carImg(t)}
          <div class="small muted">${natTag(t.country)} ${esc(eng.name)} · orçamento ${fmtMoney(t.budget)}</div>
          ${attrRow('Carro', car)}
          ${attrRow('Reputação', t.reputation, 'b')}
          <div class="small">${ds.map(d => `${esc(d.name)} <span class="muted num">${driverOverall(d)}</span>`).join('<br>')}</div>
        </div></button>`;
    }).join('');
    const free = Store.SLOTS.map((s, i) => [s, `Jogo ${i + 1}${(UI.slotMetas || {})[s] ? ' (substituir)' : ''}`]);
    if (!NC.slot) NC.slot = (Store.SLOTS.find(s => !(UI.slotMetas || {})[s])) || 'slot1';
    return `
    <div class="main" style="max-width:1280px;margin:0 auto">
      <div class="main-inner">
        <div class="page-head"><div><div class="eyebrow">Novo universo</div><h1>${NC.mode === 'observer' ? 'Acompanhe o campeonato' : 'Escolha sua equipe'}</h1></div>
          <div class="row"><button class="btn" data-act="go" data-v="title">Voltar</button><button class="btn primary lg" data-act="ncStart">${NC.mode === 'observer' ? 'Começar a temporada' : 'Assumir a equipe'}</button></div></div>
        <div class="panel"><div class="panel-b row between">
          <div class="stack" style="gap:4px;max-width:70ch"><b>${NC.mode === 'observer' ? 'Modo Observador' : 'Modo Manager'}</b><span class="small muted">${NC.mode === 'observer' ? 'Os chefes de equipe tomam todas as decisões. Você assiste às corridas e acompanha o mercado, as finanças e as histórias do campeonato, sem interferir.' : 'Você comanda uma equipe: acerto, estratégia, contratos, desenvolvimento e finanças.'}</span></div>
          ${segBtns('ncMode', NC.mode, [['manager', 'Manager'], ['observer', 'Observador']])}
        </div></div>
        <div class="grid g-hub">
          <div class="team-pick" style="${NC.mode === 'observer' ? 'opacity:.55;pointer-events:none' : ''}">${cards}</div>
          <div class="panel"><div class="panel-h"><h3>Configuração</h3></div><div class="panel-b stack">
            <label class="field"><span>Seu nome</span><input class="inp" id="nc-name" value="${esc(NC.name)}" placeholder="Chefe de Equipe" data-inp="ncField" data-k="name"></label>
            <label class="field"><span>Nacionalidade</span><select class="inp" id="nc-nat" data-chg="ncField" data-k="nat">${Object.entries(NAT_NAMES).map(([k, v]) => opt(k, v, NC.nat)).join('')}</select></label>
            <label class="field"><span>Dificuldade</span><select class="inp" id="nc-dif" data-chg="ncField" data-k="difficulty">${opt('easy', 'Fácil (seu carro rende um pouco mais)', NC.difficulty)}${opt('normal', 'Normal', NC.difficulty)}${opt('hard', 'Difícil', NC.difficulty)}</select></label>
            <label class="field"><span>Imprevisibilidade do grid inicial</span><select class="inp" id="nc-var" data-chg="ncField" data-k="variance">${opt(0, 'Nenhuma (base exata)', NC.variance)}${opt(1, 'Normal', NC.variance)}${opt(2, 'Alta', NC.variance)}</select></label>
            <label class="field"><span>Treinos livres por fim de semana</span><select class="inp" data-chg="ncField" data-k="practiceFormat">${opt('real', 'Formato vida real (3; 1 com Sprint)', NC.practiceFormat)}${opt('3', '3 sessões', NC.practiceFormat)}${opt('2', '2 sessões', NC.practiceFormat)}${opt('1', '1 sessão', NC.practiceFormat)}</select></label>
            <label class="field"><span>Frequência de chuva</span><select class="inp" id="nc-rain" data-chg="ncField" data-k="rainMult">${opt(0, 'Sem chuva', NC.rainMult)}${opt(0.6, 'Menos', NC.rainMult)}${opt(1, 'Realista', NC.rainMult)}${opt(1.8, 'Muita chuva', NC.rainMult)}</select></label>
            <label class="field"><span>Eventos fora da pista</span><select class="inp" id="nc-ev" data-chg="ncField" data-k="eventRate">${opt(0.5, 'Poucos', NC.eventRate)}${opt(1, 'Normal', NC.eventRate)}${opt(1.6, 'Muitos', NC.eventRate)}</select></label>
            ${Store.sample ? `<label class="check"><input type="checkbox" id="nc-ai" ${NC.aiEvents ? 'checked' : ''} data-chg="ncCheck" data-k="aiEvents"> Redação do paddock escreve matérias e acontecimentos extras</label>` : ''}
            <label class="field"><span>Semente da carreira (opcional)</span><input class="inp num" id="nc-seed" value="${esc(NC.seed)}" placeholder="aleatória" data-inp="ncField" data-k="seed"></label>
            <p class="small muted">A mesma semente com a mesma base reproduz o início da carreira. Deixe vazio para um mundo novo.</p>
            <label class="field"><span>Salvar em</span><select class="inp" id="nc-slot" data-chg="ncField" data-k="slot">${free.map(([v, l]) => opt(v, l, NC.slot)).join('')}</select></label>
          </div></div>
        </div>
      </div>
    </div>`;
  },
};
ACT.ncMode = (el) => { NC.mode = el.dataset.val; render(); };
ACT.ncTeam = (el) => { NC.teamId = el.dataset.id; render(); };
CHG.ncField = (el) => { const k = el.dataset.k; NC[k] = ['rainMult', 'eventRate', 'variance'].includes(k) ? Number(el.value) : el.value; };
CHG.ncCheck = (el) => { NC[el.dataset.k] = el.checked; };
ACT.ncStart = () => {
  G = Career.create(BASE, { ...NC, name: NC.name.trim() || 'Chefe de Equipe' });
  SLOT = NC.slot || 'slot1';
  cancelAnimationFrame(UI.anim);
  autosave();
  go('hub');
  Store.log('info', `nova carreira: modo ${G.mode}, equipe ${G.player.teamId}, semente ${G.seed}`);
  toast(`Universo criado. Semente ${G.seed}.`, 'good');
};

/* ================= CENTRAL ================= */
SCREENS.hub = {
  html() {
    if (Career.seasonOver(G)) return seasonEndHtml();
    if (Career.isObs(G)) return hubObsHtml();
    const team = Career.team(G);
    const tr = Career.currentTrack(G);
    const sd = Career.standingsD(G).slice(0, 6), sc = Career.standingsC(G);
    const myPos = sc.findIndex(x => x.tid === team.id) + 1;
    const pending = G.inbox.filter(m => m.choices && m.resolved == null);
    const unread = G.inbox.filter(m => !m.read).slice(0, 5);
    const fc = G.weekend ? G.weekend.forecast : null;
    const lineup = Career.lineup(G, team.id);
    const avgCar = avg(G.db.teams.map(t => Engine.carRating(G.db, t)));
    const fired = G.player.fired;
    const traits = [
      ['Carga aerodinâmica', tr.weights.aero / 0.5 * 100],
      ['Potência', tr.weights.engine / 0.55 * 100],
      ['Ultrapassagem', tr.overtaking * 100],
      ['Desgaste de pneus', (tr.tyreStress - 0.6) / 0.9 * 100],
      ['Chance de chuva', tr.rain * 200],
      ['Risco de Safety Car', (tr.scFactor - 0.7) / 1.4 * 100],
    ];
    return `
    <div class="page-head"><div><div class="eyebrow">${esc(G.db.rules.seriesName)} · ${G.season.year}</div><h1>Central da equipe</h1></div>
      <div class="row"><span class="chip ${myPos <= G.board.target ? 'good' : 'bad'}">${ordinal(myPos)} nos construtores · meta ${ordinal(G.board.target)}</span></div></div>
    ${fired ? firedHtml() : ''}
    ${pending.length ? `<div class="callout warn row between"><span><b>${pending.length} decisão(ões) aguardando você</b> na caixa de entrada.</span><button class="btn sm" data-act="go" data-v="inbox">Abrir caixa</button></div>` : ''}
    <div class="grid g-hub">
      <div class="stack">
        <div class="panel next-gp">
          ${gpVisual(tr)}
          <div class="info">
            <div class="row between"><span class="eyebrow">Etapa ${G.season.round + 1} de ${G.season.calendar.length}${tr.date ? ' · ' + esc(gpDate(tr)) : ''}</span><span class="row" style="gap:6px">${tr.sprint ? '<span class="chip acc">Sprint</span>' : ''}${tr.street ? '<span class="chip">Circuito de rua</span>' : ''}</span></div>
            <div><div class="gp-title">${esc(tr.gp)}</div><div class="muted">${esc(tr.circuit)} · ${natTag(tr.country)}</div></div>
            <dl class="kv"><dt>Voltas</dt><dd>${Math.round(tr.laps * (G.db.rules.raceDistancePct || 100) / 100)}</dd><dt>Extensão</dt><dd>${tr.length.toFixed(3)} km</dd>${tr.turns ? `<dt>Curvas</dt><dd>${tr.turns}</dd>` : ''}<dt>Volta de referência</dt><dd>${fmtLap(tr.baseLap)}${tr.baseLapRef ? ` <span class="muted">(${tr.baseLapRef})</span>` : ''}</dd><dt>Perda no pit</dt><dd>${tr.pitLoss.toFixed(1)} s</dd><dt>Zonas de DRS</dt><dd>${tr.drs}</dd></dl>
            <div class="stack" style="gap:6px">${traits.map(([l, v]) => `<div class="trait"><span class="muted">${l}</span>${bar(clamp(v, 3, 100))}</div>`).join('')}</div>
            ${fc ? `<div class="forecast"><div class="fc"><span class="label">Classif.</span><b>${fc.quali}%</b></div>${fc.race.map((p, i) => `<div class="fc"><span class="label">Corrida ${['início', 'meio', 'fim'][i]}</span><b>${p}%</b></div>`).join('')}</div>` : ''}
            <button class="btn primary lg" data-act="toWeekend" ${fired ? 'disabled' : ''}>${G.weekend ? 'Continuar fim de semana' : 'Ir para o fim de semana'}</button>
          </div>
        </div>
        <div class="grid g2">
          <div class="panel"><div class="panel-h"><h3>Seus pilotos</h3><button class="btn sm ghost" data-act="go" data-v="team">Ver equipe</button></div><div class="panel-b stack">
            ${lineup.map(d => { const st = G.season.stats[d.id] || {}; return `<div class="row between"><div class="row" style="gap:10px;flex-wrap:nowrap">${headshot(d)}<div>${dTag(d.id)}<div class="small muted">${G.season.standD[d.id] || 0} pts · ${st.podiums || 0} pódios · melhor ${st.best ? ordinal(st.best) : '—'}</div></div></div><div style="width:90px"><div class="label">Moral ${Math.round(d.morale)}</div>${pctBar(d.morale)}</div></div>`; }).join('')}
          </div></div>
          <div class="panel"><div class="panel-h"><h3>Diretoria</h3><span class="chip">${G.board.lastDelta != null ? (G.board.lastDelta >= 0 ? '▲ ' : '▼ ') + Math.abs(G.board.lastDelta).toFixed(1) : 'início'}</span></div><div class="panel-b stack">
            <div class="row between"><span class="stat-big">${Math.round(G.board.confidence)}%</span><span class="small muted" style="text-align:right">Meta: ${ordinal(G.board.target)} nos<br>construtores</span></div>
            <div class="meter"><i style="left:${G.board.confidence}%"></i></div>
            <dl class="kv"><dt>Caixa</dt><dd class="${G.finances.balance < 0 ? 'neg' : ''}">${fmtMoney(G.finances.balance)}</dd><dt>Teto gasto</dt><dd>${fmtMoney(G.finances.spent)} / ${fmtMoney(G.db.rules.budgetCap)}</dd><dt>Carro vs média</dt><dd class="${Engine.carRating(G.db, team) >= avgCar ? 'pos' : 'neg'}">${fmtGap(Engine.carRating(G.db, team) - avgCar).replace(/(\.\d)\d\d/, '$1')}</dd><dt>Projetos de P&D</dt><dd>${G.projects.length}/${Career.slots(team)}</dd></dl>
          </div></div>
        </div>
      </div>
      <div class="stack">
        <div class="panel"><div class="panel-h"><h3>Campeonato de pilotos</h3><button class="btn sm ghost" data-act="go" data-v="standings">Tabela completa</button></div><div class="panel-b tight"><table class="tbl">${sd.map((x, i) => `<tr class="${Career.driver(G, x.did).team === team.id ? 'me' : ''}"><td class="num">${i + 1}</td><td>${dTag(x.did)}</td><td class="r num">${x.pts}</td></tr>`).join('') || '<tr><td class="empty">Nenhuma corrida disputada ainda.</td></tr>'}</table></div></div>
        <div class="panel"><div class="panel-h"><h3>Campeonato de construtores</h3></div><div class="panel-b tight"><table class="tbl">${sc.map((x, i) => `<tr class="${x.tid === team.id ? 'me' : ''}"><td class="num">${i + 1}</td><td>${tTag(x.tid)}</td><td class="r num">${x.pts}</td></tr>`).join('')}</table></div></div>
        <div class="panel"><div class="panel-h"><h3>Caixa de entrada</h3><button class="btn sm ghost" data-act="go" data-v="inbox">Abrir</button></div><div class="mail-list">${unread.length ? unread.map(m => mailRow(m)).join('') : '<div class="empty">Nada novo.</div>'}</div></div>
      </div>
    </div>`;
  },
  after() {
    const cv = $('#hubMap'); if (cv && !Career.seasonOver(G)) { const tr = Career.currentTrack(G); requestAnimationFrame(() => drawTrack(cv, tr, [], imgUrl(tr.heroImg) ? { pad: 30, outline: '#ffffff', thick: 6 } : { pad: 26 })); }
  },
};
ACT.toWeekend = () => {
  if (!G.weekend) Career.startWeekend(G);
  if (Career.isObs(G)) {
    // observador: treinos e classificação são decididos pela IA
    if (G.weekend.phase === 'practice') Career.finishPractice(G);
    if (['sq', 'quali'].includes(G.weekend.phase) || !G.weekend.quali) Career.runQualifying(G);
    if (G.weekend.phase !== 'race') Career.startRace(G);
    UI.racePaused = true;
    return go('race');
  }
  go(G.weekend.phase === 'race' ? 'race' : 'weekend');
};
/* simula etapas inteiras sem assistir (observador) */
function simulateRound() {
  if (Career.seasonOver(G)) return;
  if (!G.weekend) Career.startWeekend(G);
  const wk = G.weekend;
  if (wk.phase === 'practice') Career.finishPractice(G);
  if (!wk.quali) Career.runQualifying(G);
  if (!wk.race) Career.startRace(G);
  Career.simRaceToEnd(G);
  Career.finishWeekend(G);
}
ACT.simRound = () => { simulateRound(); autosave(); go('hub'); };
ACT.simSeason = () => {
  let n = 0;
  while (!Career.seasonOver(G) && n++ < 60) simulateRound();
  autosave(); go('hub');
  toast('Temporada simulada até o fim.', 'good');
};

function hubObsHtml() {
  const tr = Career.currentTrack(G);
  const sd = Career.standingsD(G).slice(0, 10), sc = Career.standingsC(G);
  const last = G.season.results[G.season.results.length - 1];
  const recent = (G.log || []).slice(-8).reverse();
  return `
  <div class="page-head"><div><div class="eyebrow">${esc(G.db.rules.seriesName)} · ${G.season.year} · Modo Observador</div><h1>Central do campeonato</h1></div>
    <div class="row"><button class="btn" data-act="simRound">Simular etapa</button><button class="btn" data-act="simSeason">Simular até o fim da temporada</button></div></div>
  <div class="grid g-hub">
    <div class="stack">
      <div class="panel next-gp">
        ${gpVisual(tr)}
        <div class="info">
          <span class="eyebrow">Etapa ${G.season.round + 1} de ${G.season.calendar.length}${tr.date ? ' · ' + esc(gpDate(tr)) : ''}${tr.sprint ? ' · Sprint' : ''}</span>
          <div><div class="gp-title">${esc(tr.gp)}</div><div class="muted">${esc(tr.circuit)} · ${natTag(tr.country)}</div></div>
          <dl class="kv"><dt>Voltas</dt><dd>${Math.round(tr.laps * (G.db.rules.raceDistancePct || 100) / 100)}</dd><dt>Extensão</dt><dd>${tr.length.toFixed(3)} km</dd><dt>Ultrapassagem</dt><dd>${Math.round(tr.overtaking * 100)}%</dd><dt>Chance de chuva</dt><dd>${Math.round(tr.rain * 100)}%</dd></dl>
          <button class="btn primary lg" data-act="toWeekend">Assistir à corrida</button>
        </div>
      </div>
      ${last ? `<div class="panel"><div class="panel-h"><h3>Última corrida: ${esc(last.gp)}</h3><button class="btn sm ghost" data-act="go" data-v="analysis">Telemetria</button></div><div class="panel-b tight"><table class="tbl">${last.cls.slice(0, 5).map(c => `<tr><td class="num">${c.status === 'dnf' ? 'AB' : c.pos}</td><td>${dTag(c.did)}</td><td class="small muted">${esc(Career.team(G, c.tid).name)}</td><td class="r num">${c.pts}</td></tr>`).join('')}</table></div></div>` : ''}
      <div class="panel"><div class="panel-h"><h3>Registro recente do universo</h3><button class="btn sm ghost" data-act="go" data-v="log">Ver tudo</button></div><div class="panel-b stack" style="gap:8px">${recent.map(e => `<div class="small"><span class="chip">${esc(Career.LOG_TYPES[e.t] || e.t)}</span> ${esc(e.txt)}</div>`).join('') || '<p class="muted">Nada registrado ainda.</p>'}</div></div>
    </div>
    <div class="stack">
      <div class="panel"><div class="panel-h"><h3>Campeonato de pilotos</h3><button class="btn sm ghost" data-act="go" data-v="standings">Tabela completa</button></div><div class="panel-b tight"><table class="tbl">${sd.map((x, i) => `<tr><td class="num">${i + 1}</td><td>${dTag(x.did)}</td><td class="r num">${x.pts}</td></tr>`).join('')}</table></div></div>
      <div class="panel"><div class="panel-h"><h3>Campeonato de construtores</h3></div><div class="panel-b tight"><table class="tbl">${sc.map((x, i) => `<tr><td class="num">${i + 1}</td><td>${tTag(x.tid)}</td><td class="r num">${x.pts}</td></tr>`).join('')}</table></div></div>
      <div class="panel"><div class="panel-h"><h3>Manchetes</h3><button class="btn sm ghost" data-act="go" data-v="news">Todas</button></div><div class="panel-b stack" style="gap:8px">${G.news.slice(0, 6).map(n => `<p class="small"><b>${esc(n.title)}</b></p>`).join('')}</div></div>
    </div>
  </div>`;
}

function firedHtml() {
  const offers = Career.jobOffers(G);
  return `<div class="panel" style="border-color:var(--red)"><div class="panel-h"><h3 class="neg">Você foi demitido</h3></div><div class="panel-b stack"><p>Equipes interessadas no seu trabalho:</p><div class="row">${offers.map(t => `<button class="btn" data-act="takeJob" data-id="${t}">${tTag(t)}</button>`).join('')}</div></div></div>`;
}
ACT.takeJob = (el) => { Career.takeJob(G, el.dataset.id); autosave(); go('hub'); };

function seasonEndHtml() {
  const sd = Career.standingsD(G), sc = Career.standingsC(G);
  const team = Career.isObs(G) ? null : Career.team(G);
  const myPos = team ? sc.findIndex(x => x.tid === team.id) + 1 : 0;
  return `
  <div class="page-head"><div><div class="eyebrow">Fim da temporada ${G.season.year}</div><h1>${dName(sd[0].did, true)} é campeão</h1></div></div>
  <div class="grid g3">
    <div class="panel"><div class="panel-b stack"><span class="label">Campeão de pilotos</span><span class="stat-big">${dName(sd[0].did, true)}</span><span class="muted">${sd[0].pts} pontos · ${sd[0].st.wins} vitórias</span></div></div>
    <div class="panel"><div class="panel-b stack"><span class="label">Campeã de construtores</span><span class="stat-big">${esc(Career.team(G, sc[0].tid).name)}</span><span class="muted">${sc[0].pts} pontos</span></div></div>
    ${team ? `<div class="panel"><div class="panel-b stack"><span class="label">Sua equipe</span><span class="stat-big ${myPos <= G.board.target ? 'pos' : 'neg'}">${ordinal(myPos)}</span><span class="muted">Meta era ${ordinal(G.board.target)}</span></div></div>` : `<div class="panel"><div class="panel-b stack"><span class="label">Vitórias</span><span class="stat-big">${sd[0].st.wins}</span><span class="muted">do campeão em ${G.season.results.length} corridas</span></div></div>`}
  </div>
  <div class="grid g2">
    <div class="panel"><div class="panel-h"><h3>Pilotos</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl">${sd.slice(0, 12).map((x, i) => `<tr><td class="num">${i + 1}</td><td>${dTag(x.did)}</td><td class="r num">${x.pts}</td></tr>`).join('')}</table></div></div>
    <div class="panel"><div class="panel-h"><h3>O que acontece agora</h3></div><div class="panel-b stack">
      <p>Ao avançar: pilotos envelhecem e evoluem, contratos vencem, equipes rivais contratam, novatos surgem, patrocinadores renovam ou saem e o carro novo é montado${(G.history.length + 1) % (G.db.rules.regulationChangeEvery || 4) === 0 ? ' sob <b>um novo regulamento técnico</b> que embaralha o grid' : ''}.</p>
      ${G.nextYearBank > 0 ? `<p class="pos">Desenvolvimento guardado para o próximo carro: +${G.nextYearBank.toFixed(2)}</p>` : ''}
      <button class="btn primary lg" data-act="nextSeason">Iniciar temporada ${G.season.year + 1}</button>
    </div></div>
  </div>`;
}
ACT.nextSeason = () => {
  const s = Career.endSeason(G);
  autosave();
  modal(`Temporada ${s.year} encerrada`, `<p>Campeão: <b>${esc(s.championName)}</b>. Construtores: <b>${esc(s.constructorName)}</b>.</p>${s.playerPos ? `<p>Sua equipe terminou em <b>${ordinal(s.playerPos)}</b> (meta ${ordinal(s.target)}).</p>` : ''}${s.regChange ? '<p class="acc">Novo regulamento técnico: as forças do grid foram embaralhadas.</p>' : ''}${s.bankUsed ? `<p class="pos">O trabalho no carro novo rendeu +${s.bankUsed} de desempenho.</p>` : ''}<p class="muted">Confira o Mercado e a Caixa de entrada antes da primeira corrida.</p>`, `<button class="btn primary" data-act="closeModal">Continuar</button>`);
  go('hub');
};

/* ================= CAIXA DE ENTRADA ================= */
const TAG_LABEL = { board: 'Diretoria', media: 'Mídia', money: 'Comercial', dev: 'Técnico', team: 'Equipe', fia: 'Federação', market: 'Paddock', ai: 'Paddock' };
function mailRow(m, sel) {
  return `<button class="mail ${m.read ? '' : 'unread'} ${sel ? 'on' : ''}" data-act="openMail" data-id="${m.id}"><span class="dot"></span><span style="min-width:0"><span class="t">${esc(m.title)}</span><br><span class="small muted">${esc(m.from)}</span></span><span class="row" style="gap:4px;flex-wrap:nowrap">${m.choices && m.resolved == null ? '<span class="chip acc">decidir</span>' : ''}</span></button>`;
}
SCREENS.inbox = {
  html() {
    const sel = UI.params.id ? G.inbox.find(m => m.id === UI.params.id) : (G.inbox.find(m => m.choices && m.resolved == null) || G.inbox[0]);
    if (sel && !sel.read && !sel.choices) sel.read = true;
    return `
    <div class="page-head"><div><div class="eyebrow">Mensagens e decisões</div><h1>Caixa de entrada</h1></div>
      <div class="row">${G.options.aiEvents && Store.sample ? '<button class="btn" data-act="aiEventNow">Buscar novidades do paddock</button>' : ''}<button class="btn" data-act="markAllRead">Marcar tudo como lido</button></div></div>
    <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr)">
      <div class="panel"><div class="mail-list" style="max-height:70vh;overflow:auto">${G.inbox.map(m => mailRow(m, sel && m.id === sel.id)).join('') || '<div class="empty">Vazia.</div>'}</div></div>
      <div class="panel">${sel ? mailDetail(sel) : '<div class="empty">Selecione uma mensagem.</div>'}</div>
    </div>`;
  },
};
function mailDetail(m) {
  const choices = m.choices ? (m.resolved == null
    ? `<div class="stack" style="gap:8px">${m.choices.map((c, i) => `<button class="btn choice" data-act="choose" data-id="${m.id}" data-i="${i}"><b>${esc(c.label)}</b>${c.hint ? `<span class="small muted">${esc(c.hint)}</span>` : ''}${c.gamble ? `<span class="small muted">Resultado incerto</span>` : ''}</button>`).join('')}</div>`
    : `<div class="callout"><div class="label">Sua decisão: ${esc(m.choices[m.resolved].label)}</div><p style="margin-top:6px">${esc(m.outcome || '')}</p>${m.outcomeFx && m.outcomeFx.length ? `<div class="row" style="margin-top:8px;gap:6px">${m.outcomeFx.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}</div>`) : '';
  return `<div class="panel-h"><div><div class="label">${esc(TAG_LABEL[m.tag] || 'Mensagem')} · ${esc(m.from)} · ${m.year} etapa ${m.round + 1}</div><h2 style="margin-top:6px">${esc(m.title)}</h2></div></div>
  <div class="panel-b stack"><p style="white-space:pre-wrap;max-width:68ch">${esc(m.body)}</p>${choices}</div>`;
}
ACT.openMail = (el) => { const m = G.inbox.find(x => x.id === el.dataset.id); if (m && !m.choices) m.read = true; go('inbox', { id: el.dataset.id }); };
ACT.choose = (el) => {
  const m = Events.resolve(G, el.dataset.id, +el.dataset.i);
  if (m) { toast(m.outcome || 'Decisão registrada.'); autosave(); }
  go('inbox', { id: el.dataset.id });
};
ACT.markAllRead = () => { G.inbox.forEach(m => { if (!m.choices) m.read = true; }); render(); };
ACT.aiEventNow = (el) => generateAIEvent(null, el);

async function generateAIEvent(summary, btn) {
  if (!Store.sample || !G.options.aiEvents) return false;
  if (btn) { btn.disabled = true; btn.textContent = 'Escrevendo…'; }
  try {
    const raw = await Store.sample.json(Events.aiPrompt(G, summary || G.season.results[G.season.results.length - 1]), { modelTier: 'quick', cache: false });
    const ev = Events.validateAI(raw);
    if (!ev) throw new Error('formato');
    Career.mail(G, ev);
    autosave();
    if (btn) { toast('Novo evento na caixa de entrada.', 'good'); go('inbox', { id: G.inbox[0].id }); }
    return true;
  } catch (e) {
    if (e && e.code === 'not_granted') { G.options.aiEvents = false; toast('Redação desativada: permissão negada. Reative em Salvar e opções.', 'bad'); }
    else if (btn) toast('Não chegaram novidades agora. Tente de novo.', 'bad');
    if (btn) { btn.disabled = false; btn.textContent = 'Buscar novidades do paddock'; }
    return false;
  }
}

/* ================= CLASSIFICAÇÃO ================= */
SCREENS.standings = {
  html() {
    const tab = UI.params.tab || 'drivers';
    const sd = Career.standingsD(G), sc = Career.standingsC(G);
    const res = G.season.results;
    const myT = G.player.teamId;
    let body;
    if (tab === 'drivers') {
      body = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Piloto</th><th>Equipe</th><th class="r">Pts</th><th class="r">V</th><th class="r">Pód.</th><th class="r">Poles</th><th class="r">VMR</th><th class="r">Aband.</th>${res.map(r => `<th class="c" title="${esc(r.gp)}">${esc(Career.track(G, r.trackId).country)}</th>`).join('')}</tr></thead><tbody>
      ${sd.map((x, i) => { const d = Career.driver(G, x.did); return `<tr class="${d.team === myT ? 'me' : ''}"><td class="num">${i + 1}</td><td>${dTag(x.did)}</td><td class="small muted">${d.team ? esc(Career.team(G, d.team).short) : '—'}</td><td class="r num"><b>${x.pts}</b></td><td class="r num">${x.st.wins || 0}</td><td class="r num">${x.st.podiums || 0}</td><td class="r num">${x.st.poles || 0}</td><td class="r num">${x.st.fl || 0}</td><td class="r num">${x.st.dnfs || 0}</td>${res.map(r => { const c = r.cls.find(y => y.did === x.did); if (!c) return '<td class="c muted">·</td>'; const p = c.status === 'dnf' ? 'Ab' : c.pos; return `<td class="c num ${c.pos === 1 && c.status !== 'dnf' ? 'acc' : c.pos <= 3 && c.status !== 'dnf' ? 'pos' : c.pts > 0 ? '' : 'muted'}">${p}</td>`; }).join('')}</tr>`; }).join('')}
      </tbody></table></div>`;
    } else if (tab === 'teams') {
      body = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Equipe</th><th>Motor</th><th class="r">Pts</th><th class="r">Vitórias</th><th class="r">Pódios</th></tr></thead><tbody>
      ${sc.map((x, i) => { const t = Career.team(G, x.tid); const w = sum(res.map(r => r.cls.filter(c => c.tid === t.id && c.pos === 1 && c.status === 'fin').length)); const p = sum(res.map(r => r.cls.filter(c => c.tid === t.id && c.pos <= 3 && c.status === 'fin').length)); return `<tr class="${t.id === myT ? 'me' : ''}"><td class="num">${i + 1}</td><td>${tTag(t.id)}</td><td class="small muted">${esc(Engine.engineOf(G.db, t).name)}</td><td class="r num"><b>${x.pts}</b></td><td class="r num">${w}</td><td class="r num">${p}</td></tr>`; }).join('')}
      </tbody></table></div>`;
    } else {
      body = `<div class="panel-b">${pointsChart()}</div>`;
    }
    return `
    <div class="page-head"><div><div class="eyebrow">Temporada ${G.season.year}</div><h1>Classificação</h1></div></div>
    <div class="panel"><div class="tabs">${[['drivers', 'Pilotos'], ['teams', 'Construtores'], ['chart', 'Evolução dos pontos']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="standings" data-p='{"tab":"${k}"}'>${l}</button>`).join('')}</div>${body}</div>`;
  },
  after() { bindCharts(); },
};
function pointsChart() {
  const res = G.season.results;
  if (!res.length) return '<div class="empty">A evolução aparece depois da primeira corrida.</div>';
  const sd = Career.standingsD(G);
  const mine = Career.teamDrivers(G, G.player.teamId).map(d => d.id);
  const top = sd.slice(0, 8).map(x => x.did);
  mine.forEach(id => { if (!top.includes(id) && G.season.standD[id] != null) top.push(id); });
  const used = {};
  const series = top.map(did => {
    let acc = 0;
    const d = Career.driver(G, did);
    const col = d.team ? teamColor(d.team) : '#888';
    const dash = used[col] ? '5 4' : null; used[col] = true;
    return { name: d.name.split(' ').slice(-1)[0], color: col, dash, width: mine.includes(did) ? 3 : 2, pts: [[0, 0]].concat(res.map((r, i) => { const c = r.cls.find(x => x.did === did); acc += c ? c.pts : 0; return [i + 1, acc]; })) };
  });
  return lineChart('pts', { series, h: 320, xLabel: 'Etapa', yFmt: v => Math.round(v) });
}

/* ================= CALENDÁRIO ================= */
SCREENS.calendar = {
  html() {
    const cal = G.season.calendar;
    return `
    <div class="page-head"><div><div class="eyebrow">Temporada ${G.season.year}</div><h1>Calendário</h1></div></div>
    <div class="panel"><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Etapa</th><th>Grande Prêmio</th><th>Circuito</th><th>Vencedor</th><th>Pole</th><th>Sua melhor posição</th><th>Condições</th></tr></thead><tbody>
    ${cal.map((tid, i) => {
      const tr = Career.track(G, tid); const r = G.season.results[i];
      const mine = r ? r.cls.filter(c => c.tid === G.player.teamId) : [];
      const best = mine.length ? Math.min(...mine.map(c => c.status === 'fin' ? c.pos : 99)) : null;
      return `<tr class="${i === G.season.round ? 'me' : ''}"><td class="num">${i + 1}</td><td><b>${esc(tr.gp)}</b>${tr.sprint ? ' <span class="chip acc">Sprint</span>' : ''}<div class="small muted">${esc(gpDate(tr))}</div></td><td><button class="linkbtn muted" data-act="circuitPage" data-id="${tr.id}">${esc(tr.circuit)}</button></td><td>${r ? dTag(r.winner) : i === G.season.round ? '<span class="chip acc">próxima</span>' : ''}</td><td>${r ? dTag(r.pole, false) : ''}</td><td class="num">${best ? (best === 99 ? 'Abandono' : ordinal(best)) : ''}</td><td class="small">${r ? (r.wet > 0.25 ? '<span class="chip" style="color:var(--blue)">Chuva</span> ' : '') + (r.sc ? `<span class="chip" style="color:var(--yellow)">SC ×${r.sc}</span>` : '') : ''}</td></tr>`;
    }).join('')}
    </tbody></table></div></div>`;
  },
};

/* ================= EQUIPE ================= */
SCREENS.team = {
  html() {
    const team = Career.team(G);
    const ds = Career.teamDrivers(G, team.id).sort((a, b) => (a.seat === 'R' ? 9 : a.seat) - (b.seat === 'R' ? 9 : b.seat));
    const year = G.season.year;
    return `
    <div class="page-head"><div><div class="eyebrow">${esc(team.name)}</div><h1>Pilotos e staff</h1></div><button class="btn" data-act="go" data-v="market">Ir ao mercado</button></div>
    <div class="grid g2">
      ${ds.map(d => driverCard(d, year)).join('')}
    </div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Staff técnico</h3><span class="small muted">Chefe: ${esc(G.player.name)}</span></div><div class="panel-b stack">
        ${Object.entries(Career.STAFF_ROLES).map(([k, l]) => `<div>${attrRow(`${l}${team.staffNames && team.staffNames[k] ? ` · ${esc(team.staffNames[k])}` : ''}`, team.staff[k], 'b')}</div>`).join('')}
        ${attrRow('Pit crew', team.pitCrew, 'g')}
        ${attrRow('Instalações', team.facilities)}
        <p class="small muted">Diretor técnico melhora confiabilidade e projetos; aerodinâmica e engenharia aceleram o P&D e o acerto automático; estratégia melhora a previsão do tempo e as decisões automáticas de pit.</p>
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Mercado de staff</h3><span class="small muted">Renova a cada temporada</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Cargo</th><th>Nome</th><th class="r">Nível</th><th class="r">Atual</th><th class="r">Custo</th><th></th></tr></thead><tbody>
        ${G.staffMarket.map(s => `<tr><td class="small">${Career.STAFF_ROLES[s.role]}</td><td>${esc(s.name)}</td><td class="r num ${ratingClass(s.rating)}">${s.rating}</td><td class="r num muted">${team.staff[s.role]}</td><td class="r num">${fmtMoney(s.fee)}</td><td><button class="btn sm" data-act="hireStaff" data-id="${s.id}" ${s.rating <= team.staff[s.role] ? 'disabled' : ''}>Contratar</button></td></tr>`).join('') || '<tr><td class="empty" colspan="6">Ninguém disponível.</td></tr>'}
      </tbody></table></div></div>
    </div>
    <div class="panel"><div class="panel-h"><h3>Patrocinadores</h3><span class="small muted">${fmtMoney(sum(G.sponsors.map(s => s.perRace)))} por GP</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Marca</th><th class="r">Por GP</th><th>Objetivo</th><th class="r">Bônus</th><th class="r">Temporadas</th><th>Satisfação</th></tr></thead><tbody>
      ${G.sponsors.map(s => `<tr><td>${sponsorTag(s.name)}</td><td class="r num">${fmtMoney(s.perRace)}</td><td class="small">${Career.SPONSOR_OBJ[s.objective]}</td><td class="r num">${fmtMoney(s.bonus)}</td><td class="r num">${s.seasons}</td><td style="min-width:120px">${pctBar(s.satisfaction)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  },
};
function driverCard(d, year) {
  const st = G.season.stats[d.id] || {};
  const seatLabel = d.seat === 'R' ? 'Reserva' : `Carro #${d.seat}`;
  const ovr = driverOverall(d);
  return `<div class="panel"><div class="panel-h"><div class="row" style="gap:12px">${headshot(d)}<span class="stat-big" style="font-size:30px;color:${teamColor(d.team)}">${d.number}</span><div><h3>${esc(d.name)}</h3><div class="small muted">${natTag(d.nat)} ${d.age} anos · ${esc(STYLE_LABELS[d.style] || '')}${d.injured ? ' · <span class="neg">lesionado</span>' : ''}</div></div></div>
    <div class="row"><span class="chip">${seatLabel}</span><span class="chip acc">Nota ${ovr}</span></div></div>
    <div class="panel-b grid g2">
      <div class="stack" style="gap:8px">${DRIVER_ATTRS.slice(0, 8).map(([k, l]) => attrRow(l, d[k])).join('')}</div>
      <div class="stack" style="gap:8px">
        ${attrRow('Agressividade', d.aggression, 'r')}${attrRow('Experiência', d.experience, 'b')}${potRow(d)}${attrRow('Moral', d.morale, d.morale < 40 ? 'r' : 'g')}${attrRow('Popularidade', d.popularity, 'b')}
        <dl class="kv" style="margin-top:6px"><dt>Contrato até</dt><dd>${year + Math.max(0, d.contractYears)}</dd><dt>Salário</dt><dd>${fmtMoney(d.salary)}/ano</dd><dt>Valor de mercado</dt><dd>${fmtMoney(Career.marketValue(d))}</dd><dt>Temporada</dt><dd>${G.season.standD[d.id] || 0} pts · ${st.wins || 0}V · ${st.podiums || 0}P</dd><dt>Carreira</dt><dd>${d.career.starts} GPs · ${d.career.wins}V · ${d.career.titles} títulos</dd></dl>
        <div class="row" style="margin-top:4px">
          <select class="inp" style="width:auto" data-chg="setSeat" data-id="${d.id}" aria-label="Assento">${opt(1, 'Carro #1', d.seat)}${opt(2, 'Carro #2', d.seat)}${opt('R', 'Reserva', d.seat)}</select>
          <button class="btn sm" data-act="renewDlg" data-id="${d.id}">Renovar</button>
          <button class="btn sm danger" data-act="releaseDlg" data-id="${d.id}">Dispensar</button>
        </div>
      </div>
    </div></div>`;
}
CHG.setSeat = (el) => { Career.setSeat(G, el.dataset.id, el.value === 'R' ? 'R' : +el.value); autosave(); render(); };
ACT.hireStaff = (el) => { const err = Career.hireStaff(G, el.dataset.id); if (err) toast(err, 'bad'); else { toast('Contratado.', 'good'); autosave(); } render(); };
ACT.renewDlg = (el) => {
  const d = Career.driver(G, el.dataset.id);
  const val = Career.marketValue(d);
  modal(`Renovar com ${d.name}`, `
    <p class="muted">Valor de mercado ${fmtMoney(val)}/ano. Salário atual ${fmtMoney(d.salary)}. Moral ${Math.round(d.morale)}.</p>
    <label class="field"><span>Salário anual (milhões)</span><input class="inp num" id="rn-sal" type="number" step="0.1" min="0.3" value="${Math.max(d.salary, val).toFixed(1)}"></label>
    <label class="field"><span>Contrato até</span><select class="inp" id="rn-y">${[1, 2, 3, 4].map(n => opt(n, String(G.season.year + n), 2)).join('')}</select></label>`,
    `<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="renewGo" data-id="${d.id}">Propor</button>`);
};
ACT.renewGo = (el) => {
  const r = Career.renew(G, el.dataset.id, Number($('#rn-sal').value), Number($('#rn-y').value));
  closeModal(); toast(r.msg, r.ok ? 'good' : 'bad'); autosave(); render();
};
ACT.releaseDlg = (el) => {
  const d = Career.driver(G, el.dataset.id);
  const cost = +(d.salary * Math.max(0, d.contractYears) * 0.5).toFixed(1);
  modal(`Dispensar ${d.name}?`, `<p>A rescisão custa <b>${fmtMoney(cost)}</b>. ${d.seat !== 'R' ? 'O reserva ou o melhor piloto livre assume o carro.' : ''}</p>`, `<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="releaseGo" data-id="${d.id}">Dispensar</button>`);
};
ACT.releaseGo = (el) => { const err = Career.releaseDriver(G, el.dataset.id); closeModal(); if (err) toast(err, 'bad'); else { toast('Piloto dispensado.'); autosave(); } render(); };

/* ================= CARRO E P&D ================= */
SCREENS.dev = {
  html() {
    const team = Career.team(G);
    const eng = Engine.engineOf(G.db, team);
    const slots = Career.slots(team);
    const teams = G.db.teams.slice().sort((a, b) => Engine.carRating(G.db, b) - Engine.carRating(G.db, a));
    const area = UI.params.area || 'aero';
    const quotes = Object.keys(Career.SIZES).map(s => Career.projectQuote(G, area, s));
    const capLeft = G.db.rules.budgetCap - G.finances.spent;
    return `
    <div class="page-head"><div><div class="eyebrow">${esc(team.name)}</div><h1>Carro e P&D</h1></div><span class="chip">${G.projects.length}/${slots} projetos ativos</span></div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Seu carro</h3><span class="small muted">Motor ${esc(eng.name)}</span></div><div class="panel-b stack">
        ${attrRow('Aerodinâmica', team.car.aero)}${attrRow('Chassi e suspensão', team.car.chassis)}${attrRow('Potência do motor', eng.power + (team.car.engineBonus || 0), 'b')}${attrRow('Confiabilidade', Engine.reliability(G.db, team), 'g')}${attrRow('Cuidado com pneus', team.car.tyreCare, 'g')}
        <div class="sep"></div>
        <div class="label">Foco no carro do próximo ano: ${G.nextYearFocus}%</div>
        <input type="range" min="0" max="100" step="10" value="${G.nextYearFocus}" id="nyf" data-chg="nyFocus" aria-label="Foco no próximo ano">
        <p class="small muted">Parte dos ganhos de aerodinâmica e chassi vai para o carro novo, com bônus de 35%. Acumulado: <b class="pos">+${G.nextYearBank.toFixed(2)}</b>.</p>
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Comparativo do grid</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Equipe</th><th class="r">Geral</th><th class="r">Aero</th><th class="r">Chassi</th><th class="r">Motor</th><th class="r">Confiab.</th></tr></thead><tbody>
        ${teams.map(t => { const e = Engine.engineOf(G.db, t); return `<tr class="${t.id === team.id ? 'me' : ''}"><td>${tTag(t.id)}</td><td class="r num"><b>${Engine.carRating(G.db, t).toFixed(1)}</b></td><td class="r num">${t.car.aero.toFixed(1)}</td><td class="r num">${t.car.chassis.toFixed(1)}</td><td class="r num">${(e.power + (t.car.engineBonus || 0)).toFixed(1)}</td><td class="r num">${Engine.reliability(G.db, t).toFixed(0)}</td></tr>`; }).join('')}
      </tbody></table></div></div>
    </div>
    <div class="panel"><div class="panel-h"><h3>Projetos em andamento</h3></div><div class="panel-b stack">
      ${G.projects.length ? G.projects.map(p => `<div class="row between"><div style="min-width:0"><b>${esc(p.name)}</b><div class="small muted">Ganho previsto +${p.min}–${p.max} · risco ${p.risk}%</div></div><div style="width:200px"><div class="label">${p.total - p.left}/${p.total} GPs</div>${bar(p.total - p.left, p.total, 'g')}</div></div>`).join('') : '<p class="muted">Nenhum projeto em andamento.</p>'}
    </div></div>
    <div class="panel"><div class="panel-h"><h3>Novo projeto</h3><span class="small muted">Teto disponível ${fmtMoney(capLeft)} · caixa ${fmtMoney(G.finances.balance)}</span></div>
      <div class="tabs">${Object.entries(Career.AREAS).map(([k, a]) => `<button class="${area === k ? 'on' : ''}" data-act="go" data-v="dev" data-p='{"area":"${k}"}'>${a.name}</button>`).join('')}</div>
      <div class="panel-b grid g3">
        ${quotes.map(q => `<div class="panel" style="background:var(--panel2)"><div class="panel-b stack">
          <h3>${Career.SIZES[q.size].name}</h3>
          <dl class="kv"><dt>Custo</dt><dd>${fmtMoney(q.cost)}</dd><dt>Duração</dt><dd>${q.races} GPs</dd><dt>Ganho</dt><dd class="pos">+${q.min}–${q.max}</dd><dt>Risco de falha</dt><dd>${q.risk}%</dd></dl>
          <button class="btn primary" data-act="startProject" data-area="${q.area}" data-size="${q.size}" ${G.projects.length >= slots ? 'disabled' : ''}>Iniciar</button>
        </div></div>`).join('')}
      </div></div>`;
  },
};
CHG.nyFocus = (el) => { G.nextYearFocus = Number(el.value); render(); };
ACT.startProject = (el) => { const err = Career.startProject(G, el.dataset.area, el.dataset.size); if (err) toast(err, 'bad'); else { toast('Projeto iniciado.', 'good'); autosave(); } render(); };

/* ================= FINANÇAS ================= */
SCREENS.finance = {
  html() {
    const L = G.finances.ledger.filter(x => x.year === G.season.year);
    const cats = {};
    L.forEach(x => { cats[x.cat] = (cats[x.cat] || 0) + x.amount; });
    const inc = sum(L.filter(x => x.amount > 0).map(x => x.amount)), exp = sum(L.filter(x => x.amount < 0).map(x => x.amount));
    const cap = G.db.rules.budgetCap;
    // série de saldo por etapa
    let bal = G.finances.balance; const pts = [];
    const byRound = {};
    G.finances.ledger.filter(x => x.year === G.season.year).forEach(x => { byRound[x.round] = (byRound[x.round] || 0) + x.amount; });
    const rounds = Object.keys(byRound).map(Number).sort((a, b) => b - a);
    pts.push([G.season.round + 1, bal]);
    rounds.forEach(r => { bal -= byRound[r]; pts.push([r + 1 - 1, bal]); });
    pts.sort((a, b) => a[0] - b[0]);
    const uniq = []; pts.forEach(p => { const u = uniq.find(q => q[0] === p[0]); if (u) u[1] = p[1]; else uniq.push(p); });
    return `
    <div class="page-head"><div><div class="eyebrow">Temporada ${G.season.year}</div><h1>Finanças</h1></div></div>
    <div class="grid g4">
      <div class="panel"><div class="panel-b stack"><span class="label">Caixa</span><span class="stat-big num ${G.finances.balance < 0 ? 'neg' : ''}">${fmtMoney(G.finances.balance)}</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Receitas na temporada</span><span class="stat-big num pos">${fmtMoney(inc)}</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Despesas na temporada</span><span class="stat-big num neg">${fmtMoney(exp)}</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Teto orçamentário</span><span class="stat-big num">${Math.round(G.finances.spent / cap * 100)}%</span>${bar(G.finances.spent, cap, G.finances.spent > cap * 0.9 ? 'r' : '')}<span class="small muted">${fmtMoney(G.finances.spent)} de ${fmtMoney(cap)} (salários e motor ficam fora)</span></div></div>
    </div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Saldo ao longo da temporada</h3></div><div class="panel-b">${uniq.length > 1 ? lineChart('bal', { series: [{ name: 'Caixa', color: 'var(--accent)', pts: uniq, width: 2.5 }], h: 220, xLabel: 'Etapa', yFmt: v => fmtMoney(v), legend: false }) : '<div class="empty">O gráfico aparece após a primeira corrida.</div>'}</div></div>
      <div class="panel"><div class="panel-h"><h3>Por categoria</h3></div><div class="panel-b tight"><table class="tbl">${Object.entries(cats).sort((a, b) => a[1] - b[1]).map(([k, v]) => `<tr><td style="text-transform:capitalize">${esc(k)}</td><td class="r num ${v < 0 ? 'neg' : 'pos'}">${fmtMoney(v)}</td></tr>`).join('') || '<tr><td class="empty">Sem lançamentos.</td></tr>'}</table></div></div>
    </div>
    <div class="panel"><div class="panel-h"><h3>Extrato</h3></div><div class="panel-b tight tbl-wrap" style="max-height:480px;overflow:auto"><table class="tbl"><thead><tr><th>Etapa</th><th>Descrição</th><th>Categoria</th><th class="r">Valor</th></tr></thead><tbody>
      ${G.finances.ledger.slice(0, 120).map(x => `<tr><td class="num muted">${x.year}·${x.round + 1}</td><td>${esc(x.desc)}</td><td class="small muted">${esc(x.cat)}</td><td class="r num ${x.amount < 0 ? 'neg' : 'pos'}">${fmtMoney(x.amount)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  },
  after() { bindCharts(); },
};

/* ================= MERCADO ================= */
SCREENS.market = {
  html() {
    const f = UI.params.f || 'all';
    const sort = UI.params.s || 'ovr';
    let ds = G.db.drivers.filter(d => !d.retired && d.team !== G.player.teamId);
    if (f === 'free') ds = ds.filter(d => !d.team);
    if (f === 'young') ds = ds.filter(d => d.age <= 23);
    if (f === 'expiring') ds = ds.filter(d => d.team && d.contractYears <= 0);
    const key = { ovr: d => -driverOverall(d), pot: d => -potMid(d), age: d => d.age, val: d => -Career.marketValue(d) }[sort];
    ds.sort((a, b) => key(a) - key(b));
    const P = (o) => JSON.stringify({ f, s: sort, ...o }).replace(/'/g, '');
    return `
    <div class="page-head"><div><div class="eyebrow">Transferências</div><h1>Mercado de pilotos</h1></div></div>
    <div class="row"><div class="seg">${[['all', 'Todos'], ['free', 'Sem equipe'], ['young', 'Jovens (≤23)'], ['expiring', 'Contrato acabando']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="go" data-v="market" data-p='${P({ f: k })}'>${l}</button>`).join('')}</div>
      <span class="spacer"></span><span class="small muted">Ordenar</span><div class="seg">${[['ovr', 'Nota'], ['pot', 'Potencial'], ['age', 'Idade'], ['val', 'Valor']].map(([k, l]) => `<button class="${sort === k ? 'on' : ''}" data-act="go" data-v="market" data-p='${P({ s: k })}'>${l}</button>`).join('')}</div></div>
    <div class="panel"><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Piloto</th><th>Nac.</th><th class="r">Idade</th><th>Equipe</th><th>Estilo</th><th class="r">Nota</th><th class="r">Potencial</th><th class="r">Contrato</th><th class="r">Valor/ano</th><th class="r">Moral</th><th></th></tr></thead><tbody>
      ${ds.map(d => `<tr><td>${dTag(d.id)}${d.rookie ? ' <span class="chip">novato</span>' : ''}${d.futureTeam ? ` <span class="chip acc">→ ${esc(Career.team(G, d.futureTeam.team).short)}</span>` : ''}</td><td>${natTag(d.nat)}</td><td class="r num">${d.age}</td><td class="small">${d.team ? esc(Career.team(G, d.team).name) + (d.seat === 'R' ? ' (res.)' : '') : '<span class="muted">Livre</span>'}</td><td class="small muted">${esc(STYLE_LABELS[d.style] || '')}</td><td class="r num ${ratingClass(driverOverall(d))}"><b>${driverOverall(d)}</b></td><td class="r num">${potText(d)}</td><td class="r num">${d.team ? G.season.year + Math.max(0, d.contractYears) : '—'}</td><td class="r num">${fmtMoney(Career.marketValue(d))}</td><td class="r num">${Math.round(d.morale)}</td><td><button class="btn sm" data-act="offerDlg" data-id="${d.id}">Proposta</button></td></tr>`).join('')}
    </tbody></table></div></div>`;
  },
};
ACT.offerDlg = (el) => {
  const d = Career.driver(G, el.dataset.id);
  const val = Career.marketValue(d);
  const ev = Career.offerEval(G, d, val, 2, 1);
  modal(`Proposta para ${d.name}`, `
    <div class="row">${natTag(d.nat)} <span>${d.age} anos · nota <b>${driverOverall(d)}</b> · potencial ${potText(d)}</span></div>
    <p class="muted small">${d.team ? `Contratado pela ${esc(Career.team(G, d.team).name)} até ${G.season.year + Math.max(0, d.contractYears)}. Multa para tirá-lo agora: ${fmtMoney(ev.buyout)}.` : 'Sem equipe: pode assinar e correr já.'}</p>
    <label class="field"><span>Salário anual (milhões) — valor de mercado ${fmtMoney(val)}</span><input class="inp num" id="of-sal" type="number" step="0.1" min="0.3" value="${val.toFixed(1)}" data-inp="offerCalc" data-id="${d.id}"></label>
    <label class="field"><span>Contrato até</span><select class="inp" id="of-y" data-chg="offerCalc" data-id="${d.id}">${[1, 2, 3, 4].map(n => opt(n, String(G.season.year + n), 2)).join('')}</select></label>
    <label class="field"><span>Função</span><select class="inp" id="of-role" data-chg="offerCalc" data-id="${d.id}">${opt(1, 'Carro #1', 1)}${opt(2, 'Carro #2', 1)}${opt('R', 'Reserva', 1)}</select></label>
    ${d.team ? `<label class="check"><input type="checkbox" id="of-now" data-chg="offerCalc" data-id="${d.id}"> Pagar a multa e trazer agora (senão, pré-contrato para ${G.season.year + 1})</label>` : ''}
    <div class="callout" id="of-chance">Chance estimada de aceitar: <b>${Math.round(ev.p * 100)}%</b></div>`,
    `<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="offerGo" data-id="${d.id}">Enviar proposta</button>`);
};
CHG.offerCalc = (el) => {
  const d = Career.driver(G, el.dataset.id);
  const role = $('#of-role').value; const ev = Career.offerEval(G, d, Number($('#of-sal').value), Number($('#of-y').value), role === 'R' ? 'R' : +role);
  $('#of-chance').innerHTML = `Chance estimada de aceitar: <b>${Math.round(ev.p * 100)}%</b>`;
};
ACT.offerGo = (el) => {
  const d = Career.driver(G, el.dataset.id);
  const role = $('#of-role').value;
  const now = !d.team || ($('#of-now') && $('#of-now').checked);
  const years = Number($('#of-y').value);
  const r = Career.makeOffer(G, d.id, Number($('#of-sal').value), now ? years : years, role === 'R' ? 'R' : +role, now);
  closeModal(); toast(r.msg, r.ok ? 'good' : 'bad'); autosave(); render();
};

/* ================= NOTÍCIAS ================= */
SCREENS.news = {
  html() {
    return `<div class="page-head"><div><div class="eyebrow">Paddock</div><h1>Notícias</h1></div></div>
    <div class="panel"><div class="mail-list">${G.news.map(n => `<div class="mail" style="cursor:default"><span></span><span style="min-width:0"><span class="t"><b>${esc(n.title)}</b></span>${n.body ? `<br><span class="small muted">${esc(n.body)}</span>` : ''}</span><span class="small muted num">${n.year}·${n.round + 1}</span></div>`).join('') || '<div class="empty">Sem notícias.</div>'}</div></div>`;
  },
};

/* ================= HISTÓRICO ================= */
SCREENS.history = {
  html() {
    const legends = G.db.drivers.filter(d => d.career.starts > 0).sort((a, b) => b.career.titles - a.career.titles || b.career.wins - a.career.wins).slice(0, 15);
    return `<div class="page-head"><div><div class="eyebrow">Carreira de ${esc(G.player.name)}</div><h1>Histórico</h1></div><div class="row"><span class="chip acc">${G.player.titles} título(s)</span><span class="chip">${G.player.careerWins} vitória(s)</span><span class="chip">Semente ${G.seed}</span></div></div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Temporadas</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Campeão</th><th>Construtores</th><th>Sua equipe</th><th class="r">Posição</th></tr></thead><tbody>
        ${G.history.map(h => `<tr><td class="num">${h.year}</td><td>${esc(h.championName)}</td><td>${esc(h.constructorName)}</td><td>${tTag(h.playerTeam)}</td><td class="r num ${h.playerPos <= h.target ? 'pos' : 'neg'}">${ordinal(h.playerPos)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">A primeira temporada ainda está em andamento.</td></tr>'}
      </tbody></table></div></div>
      <div class="panel"><div class="panel-h"><h3>Lendas do grid</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Piloto</th><th class="r">Títulos</th><th class="r">Vitórias</th><th class="r">Pódios</th><th class="r">Poles</th><th class="r">GPs</th></tr></thead><tbody>
        ${legends.map(d => `<tr><td>${dTag(d.id)}${d.retired ? ' <span class="chip">aposentado</span>' : ''}</td><td class="r num">${d.career.titles}</td><td class="r num">${d.career.wins}</td><td class="r num">${d.career.podiums}</td><td class="r num">${d.career.poles}</td><td class="r num">${d.career.starts}</td></tr>`).join('')}
      </tbody></table></div></div>
    </div>`;
  },
};

/* ================= SALVAR E OPÇÕES ================= */
SCREENS.saves = {
  html() {
    const o = G.options;
    return `<div class="page-head"><div><div class="eyebrow">Sistema</div><h1>Salvar e opções</h1></div></div>
    <div class="panel" style="margin-bottom:14px"><div class="panel-b row between" style="gap:14px"><div class="stack" style="gap:2px"><b>Idioma / Language</b><span class="small muted">Interface, narração, rádio e treinos. Notícias e registros já gerados ficam no idioma em que foram escritos.</span></div>${I18N.pickerHtml()}</div></div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Jogo salvo</h3><span class="chip">${Store.where()}</span></div><div class="panel-b stack">
        ${Store.native && UI.appInfo ? `<dl class="kv"><dt>Versão do jogo</dt><dd>${esc(UI.appInfo.version)}</dd><dt>Pasta dos saves</dt><dd style="word-break:break-all">${esc(UI.appInfo.dataDir)}</dd></dl>
        <div class="row"><button class="btn" data-act="openDir" data-w="saves">Abrir pasta dos saves</button><button class="btn" data-act="openDir" data-w="logs">Abrir pasta de logs</button><button class="btn" data-act="fullscreen">Tela cheia (F11)</button></div>
        <p class="small muted">Os saves ficam fora da pasta de instalação. Atualizar ou reinstalar o jogo não apaga suas temporadas. Cada salvamento guarda também as 5 versões anteriores como cópia de segurança.</p>` : ''}
        <p class="small muted">O jogo salva sozinho após cada corrida e decisão. ${UI.lastSave ? `Último salvamento: ${new Date(UI.lastSave.at).toLocaleTimeString('pt-BR')} (${UI.lastSave.where === 'cloud' ? 'nuvem' : 'navegador'}).` : ''}</p>
        <div class="row"><button class="btn primary" data-act="saveNow">Salvar agora</button><button class="btn" data-act="exportSave">Baixar arquivo do jogo</button><button class="btn" data-act="copySave">Copiar JSON</button></div>
        <div class="row"><button class="btn" data-act="toTitle">Voltar à tela inicial</button></div>
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Opções da carreira</h3></div><div class="panel-b stack">
        ${Store.native ? '' : `<label class="check"><input type="checkbox" id="op-ai" ${o.aiEvents ? 'checked' : ''} data-chg="opt" data-k="aiEvents"> Redação do paddock (matérias e acontecimentos extras) ${Store.sample ? '' : '<span class="small muted">(indisponível nesta versão)</span>'}</label>`}
        <label class="field"><span>Frequência de eventos</span><select class="inp" id="op-ev" data-chg="opt" data-k="eventRate">${opt(0.5, 'Poucos', o.eventRate)}${opt(1, 'Normal', o.eventRate)}${opt(1.6, 'Muitos', o.eventRate)}</select></label>
        <label class="field"><span>Treinos livres por fim de semana</span><select class="inp" data-chg="optPractice">${opt('real', 'Formato vida real (3; 1 com Sprint)', o.practiceFormat || 'real')}${opt('3', '3 sessões', o.practiceFormat)}${opt('2', '2 sessões', o.practiceFormat)}${opt('1', '1 sessão', o.practiceFormat)}</select></label>
        <label class="field"><span>Frequência de chuva</span><select class="inp" id="op-rain" data-chg="opt" data-k="rainMult">${opt(0, 'Sem chuva', o.rainMult)}${opt(0.6, 'Menos', o.rainMult)}${opt(1, 'Realista', o.rainMult)}${opt(1.8, 'Muita chuva', o.rainMult)}</select></label>
        <label class="field"><span>Dificuldade</span><select class="inp" id="op-dif" data-chg="opt" data-k="difficulty">${opt('easy', 'Fácil', o.difficulty)}${opt('normal', 'Normal', o.difficulty)}${opt('hard', 'Difícil', o.difficulty)}</select></label>
      </div></div>
    </div>`;
  },
};
CHG.optPractice = (el) => { G.options.practiceFormat = el.value; autosave(); toast('Vale a partir do próximo fim de semana.'); };
CHG.opt = (el) => { const k = el.dataset.k; G.options[k] = el.type === 'checkbox' ? el.checked : (k === 'difficulty' ? el.value : Number(el.value)); autosave(); toast('Opção salva.'); };
ACT.saveNow = async () => { const w = await Store.saveGame(SLOT, G); UI.lastSave = { at: Date.now(), where: w }; toast(w === 'cloud' ? 'Salvo na sua conta.' : 'Salvo neste navegador.', 'good'); render(); };
ACT.exportSave = async () => { const r = await Store.exportFile(`pitwall-${Career.isObs(G) ? 'observador' : Career.team(G).short}-${G.season.year}.json`, G); if (!r.ok) toast(r.msg, 'bad'); };
ACT.copySave = () => copyText(JSON.stringify(G));
ACT.toTitle = async () => { autosave(); G = null; await refreshSlots(); go('title'); };

function copyText(txt) {
  try {
    navigator.clipboard.writeText(txt).then(() => toast('Copiado para a área de transferência.', 'good'), () => showCopyBox(txt));
  } catch (e) { showCopyBox(txt); }
}
function showCopyBox(txt) {
  modal('Copiar JSON', `<p class="small muted">Selecione tudo e copie.</p><textarea class="inp mono" id="copybox" rows="12">${esc(txt.slice(0, 2000000))}</textarea>`);
  const ta = $('#copybox'); ta.focus(); ta.select();
}
async function refreshSlots() {
  UI.slotMetas = {};
  for (const s of Store.SLOTS) UI.slotMetas[s] = await Store.slotMeta(s);
}

ACT.openDir = (el) => Store.native && Store.native.openPath(el.dataset.w);
ACT.fullscreen = () => Store.native && Store.native.toggleFullscreen();

/* ================= EQUIPES DO GRID ================= */
SCREENS.paddock = {
  html() {
    const teams = G.db.teams.slice().sort((a, b) => (G.season.standC[b.id] || 0) - (G.season.standC[a.id] || 0));
    return `<div class="page-head"><div><div class="eyebrow">Quem é quem</div><h1>Equipes do grid</h1></div></div>
    <div class="grid g2">${teams.map(t => {
      const ds = Career.lineup(G, t.id);
      const P = AI.persona(t);
      const best = (t.history || []).slice().sort((a, b) => a.pos - b.pos)[0];
      const mine = t.id === G.player.teamId;
      return `<div class="panel"><div class="panel-h"><div class="row" style="gap:10px">${teamLogo(t)}<div><h3>${esc(t.name)}</h3><div class="small muted">${natTag(t.country)} ${esc(Engine.engineOf(G.db, t).name)} · chefe ${esc(t.principal)}</div></div></div>
        <div class="row"><span class="chip ${mine ? 'acc' : ''}">${mine ? 'Sua equipe' : 'Gestão ' + P.label.toLowerCase()}</span><button class="btn sm" data-act="teamPage" data-id="${t.id}">História</button></div></div>
        ${carImg(t) ? `<div class="panel-b" style="padding-bottom:0">${carImg(t)}</div>` : ''}
        <div class="panel-b grid g2">
          <div class="stack" style="gap:8px">${attrRow('Carro (geral)', Engine.carRating(G.db, t))}${attrRow('Confiabilidade', Engine.reliability(G.db, t), 'g')}${attrRow('Média do staff', avg(Object.values(t.staff)), 'b')}${attrRow('Reputação', t.reputation, 'b')}</div>
          ${(t.sponsors || []).length ? `<div class="spons-row" style="margin-bottom:8px">${t.sponsors.map(sponsorTag).join('')}</div>` : ''}<dl class="kv"><dt>Pontos ${G.season.year}</dt><dd>${G.season.standC[t.id] || 0}</dd><dt>Orçamento anual</dt><dd>${fmtMoney(t.budget)}</dd><dt>Caixa${mine ? '' : ' (estimado)'}</dt><dd class="${(mine ? G.finances.balance : t.cash) < 0 ? 'neg' : ''}">${fmtMoney(mine ? G.finances.balance : t.cash)}</dd><dt>Gasto no teto</dt><dd>${fmtMoney(mine ? G.finances.spent : t.spent)}</dd>${t.lastDev && !mine ? `<dt>Último investimento</dt><dd>${esc(Career.AREAS[t.lastDev.area].name)} ${fmtMoney(t.lastDev.spend)}</dd>` : ''}<dt>Melhor temporada</dt><dd>${best ? `${ordinal(best.pos)} em ${best.y}` : '—'}</dd>${t.realStats ? `<dt>História na F1</dt><dd>${t.realStats.titles} títulos · ${t.realStats.wins} vitórias</dd>` : ''}${(t.sponsors || []).length ? `<dt>Parceiros</dt><dd style="white-space:normal">${t.sponsors.map(esc).join(', ')}</dd>` : ''}<dt>Pilotos</dt><dd>${ds.map(d => esc(d.name.split(' ').slice(-1)[0])).join(' · ')}</dd></dl>
        </div></div>`;
    }).join('')}</div>`;
  },
};

/* ================= REGISTRO DO UNIVERSO ================= */
SCREENS.log = {
  html() {
    const f = UI.params.t || 'all', tm = UI.params.tm || 'all';
    let L = (G.log || []).slice().reverse();
    if (f !== 'all') L = L.filter(e => e.t === f);
    if (tm !== 'all') L = L.filter(e => (e.tm || []).includes(tm));
    const total = L.length;
    L = L.slice(0, 400);
    const P = (o) => JSON.stringify({ t: f, tm, ...o });
    return `<div class="page-head"><div><div class="eyebrow">Memória permanente</div><h1>Registro do universo</h1></div><span class="chip">${total} registro(s)</span></div>
    <div class="row">
      <select class="inp" style="width:auto" data-chg="logFilter" data-k="t" aria-label="Tipo">${opt('all', 'Todos os tipos', f)}${Object.entries(Career.LOG_TYPES).map(([k, v]) => opt(k, v, f)).join('')}</select>
      <select class="inp" style="width:auto" data-chg="logFilter" data-k="tm" aria-label="Equipe">${opt('all', 'Todas as equipes', tm)}${G.db.teams.map(t => opt(t.id, t.name, tm)).join('')}</select>
    </div>
    <div class="panel"><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Etapa</th><th>Tipo</th><th>Registro</th></tr></thead><tbody>
      ${L.map(e => `<tr><td class="num">${e.y}</td><td class="num muted">${e.r + 1}</td><td><span class="chip">${esc(Career.LOG_TYPES[e.t] || e.t)}</span></td><td style="white-space:normal">${esc(e.txt)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Nada encontrado.</td></tr>'}
    </tbody></table></div></div>`;
  },
};
CHG.logFilter = (el) => { const p = { ...UI.params }; p[el.dataset.k] = el.value; go('log', p); };

/* ================= DIAGNÓSTICO ================= */
SCREENS.diag = {
  html() {
    const r = Diag.run(G);
    const errs = (UI.errors || []).map(x => `<tr><td class="small">${esc(x.where)}</td><td class="small">${esc(x.msg)}</td><td class="r num">${x.count}</td><td class="small muted">${new Date(x.last).toLocaleTimeString()}</td></tr>`).join('');
    UI._diagErrs = errs ? `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Erros desta sessão</h3><span class="small muted">também gravados no log</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Onde</th><th>Mensagem</th><th class="r">Vezes</th><th>Última</th></tr></thead><tbody>${errs}</tbody></table></div></div>` : '';
    return `<div class="page-head"><div><div class="eyebrow">Sistema</div><h1>Diagnóstico</h1></div><div class="row"><button class="btn" data-act="diagRepair" ${r.errors.length || r.warns.length ? '' : 'disabled'}>Corrigir automaticamente</button>${Store.native ? '<button class="btn" data-act="openDir" data-w="logs">Abrir logs</button>' : ''}</div></div>
    <div class="grid g4">
      <div class="panel"><div class="panel-b stack"><span class="label">Erros</span><span class="stat-big ${r.errors.length ? 'neg' : 'pos'}">${r.errors.length}</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Avisos</span><span class="stat-big">${r.warns.length}</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Tamanho do save</span><span class="stat-big">${(r.stats.size / 1024).toFixed(0)} KB</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Registros no universo</span><span class="stat-big">${r.stats.log}</span><span class="small muted">${r.stats.active} pilotos ativos · ${r.stats.seasons} temporadas encerradas</span></div></div>
    </div>
    <div class="panel"><div class="panel-h"><h3>Verificações</h3><span class="small muted">Assentos, contratos, pontuação, finanças, calendário, ids e notícias</span></div><div class="panel-b stack">
      ${r.errors.map(e => `<div class="neg">✕ ${esc(e)}</div>`).join('')}${r.warns.map(e => `<div class="acc">! ${esc(e)}</div>`).join('')}
      ${!r.errors.length && !r.warns.length ? '<p class="pos">Tudo consistente.</p>' : ''}
      <p class="small muted">Versão do save: v${G.version}. Semente: ${G.seed}. Modo: ${G.mode === 'observer' ? 'Observador' : 'Manager'}.</p>
    </div></div>${UI._diagErrs || ''}`;
  },
};
ACT.diagRepair = () => { const f = Diag.repair(G); Store.log('info', 'reparo: ' + f.join('; ')); autosave(); toast(f.length ? f.join('. ') : 'Nada para corrigir.', 'good'); render(); };

/* ================= PÁGINA DO PILOTO ================= */
ACT.driverPage = (el) => {
  const d = Career.driver(G, el.dataset.id);
  if (!d) return;
  const c = d.career || {};
  const st = G.season.stats[d.id] || {};
  const hist = (d.history || []).slice().reverse();
  const tr = (d.transfers || []).slice().reverse();
  modal(d.name, `
    <div class="row">${natTag(d.nat)}<span>${d.age} anos · ${esc(STYLE_LABELS[d.style] || '')} · nota <b>${driverOverall(d)}</b> · potencial ${potText(d)}</span>${d.retired ? '<span class="chip">aposentado</span>' : ''}</div>
    <div class="small muted">${d.team ? `${esc(Career.team(G, d.team).name)} (${d.seat === 'R' ? 'reserva' : 'carro #' + d.seat}) até ${G.season.year + Math.max(0, d.contractYears)} · ${fmtMoney(d.salary)}/ano` : 'Sem equipe'}</div>
    <div class="grid g4">${[['GPs', c.starts], ['Vitórias', c.wins], ['Pódios', c.podiums], ['Poles', c.poles], ['Títulos', c.titles], ['Pontos', Math.round(c.points || 0)], [`Pts ${G.season.year}`, G.season.standD[d.id] || 0], [`Vit. ${G.season.year}`, st.wins || 0]].map(([l, v]) => `<div><div class="label">${l}</div><div class="stat-big" style="font-size:24px">${v || 0}</div></div>`).join('')}</div>
    <h4>Temporadas</h4>
    ${hist.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Equipe</th><th class="r">Pos</th><th class="r">Pts</th><th class="r">V</th><th class="r">Pód</th><th class="r">Poles</th></tr></thead><tbody>${hist.map(h => `<tr><td class="num">${h.y}</td><td class="small">${h.teams.map(t => esc((Career.team(G, t) || { name: t }).name)).join(', ')}</td><td class="r num">${h.pos}</td><td class="r num">${h.pts}</td><td class="r num">${h.w}</td><td class="r num">${h.pod}</td><td class="r num">${h.pole}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Nenhuma temporada encerrada ainda.</p>'}
    <h4>Contratos</h4>
    ${tr.length ? tr.map(x => `<div class="small">${x.y}: ${x.from ? esc((Career.team(G, x.from) || {}).name || x.from) + ' → ' : ''}<b>${esc((Career.team(G, x.to) || {}).name || x.to)}</b> até ${x.until} · ${fmtMoney(x.salary)}/ano</div>`).join('') : '<p class="muted small">Contrato original da base de dados.</p>'}`);
};

/* foto do GP com o traçado real por cima (ou o canvas quando não há foto) */
function gpVisual(tr) {
  const hero = imgUrl(tr.heroImg);
  return hero ? `<div class="map hero" style="background-image:url('${hero}')"><canvas id="hubMap"></canvas></div>` : `<div class="map"><canvas id="hubMap"></canvas></div>`;
}
/* data do GP no ano da temporada (calendário real usado como referência) */
function gpDate(tr) {
  if (!tr.date || !G) return '';
  const [, m, d] = tr.date.split('-').map(Number);
  return new Date(G.season.year, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
