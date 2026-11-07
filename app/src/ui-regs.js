/* ============================================================
   PIT WALL — editor de regulamento (com versões por temporada),
   calendário com datas e logística, gerador de circuitos,
   P&D ampliado e projeção financeira.
   ============================================================ */
'use strict';

function regInput(path, key, val) {
  const def = Regs.DEFAULTS[key];
  if (typeof def === 'boolean') return `<input type="checkbox" ${val ? 'checked' : ''} data-chg="edCell" data-path="${path}" data-type="bool">`;
  if (key === 'qualiFormat') return `<select class="inp" data-chg="edCell" data-path="${path}" data-type="str">${opt('knockout', 'Eliminatória (Q1/Q2/Q3)', val)}${opt('single', 'Sessão única', val)}</select>`;
  return `<input class="inp num" type="number" step="any" value="${esc(val)}" data-chg="edCell" data-path="${path}" style="width:110px">`;
}
function edRegs(db) {
  Regs.ensure(db.rules);
  const groups = { tec: 'Regulamento técnico', dev: 'Desenvolvimento e testes', esp: 'Regulamento esportivo' };
  const vers = Object.entries(db.rules.versions || {}).sort((a, b) => a[0] - b[0]);
  return `<div class="grid g3">${Object.entries(groups).map(([g, title]) => `<div class="stack" style="gap:10px"><h4>${title}</h4>${Object.entries(Regs.LABELS).filter(([, l]) => l[1] === g).map(([k, l]) => `<label class="row between" style="gap:10px;flex-wrap:nowrap"><span class="small">${l[0]}</span>${regInput('rules.regs.' + k, k, db.rules.regs[k])}</label>`).join('')}</div>`).join('')}</div>
  <div class="grid g3" style="margin-top:14px">
    <label class="field"><span>Teto orçamentário (US$ mi)</span><input class="inp num" type="number" value="${db.rules.budgetCap}" data-chg="edCell" data-path="rules.budgetCap"></label>
    <label class="field"><span>Pontuação da Sprint</span><input class="inp num" value="${esc((db.rules.sprintPoints || []).join(', '))}" data-chg="edCell" data-path="rules.sprintPoints" data-type="list"></label>
    <label class="field"><span>Distância da Sprint (% da corrida)</span><input class="inp num" type="number" value="${db.rules.sprintDistancePct || 33}" data-chg="edCell" data-path="rules.sprintDistancePct"></label>
  </div>
  <div class="sep" style="margin:16px 0"></div>
  <div class="row between"><h4>Regulamentos programados por temporada</h4><div class="row"><input class="inp num" id="rv-year" type="number" value="${(db.rules.startYear || 2027) + 2}" style="width:100px" aria-label="Ano"><input class="inp" id="rv-label" placeholder="Nome (ex.: Nova era aerodinâmica)" style="width:240px"><label class="check small"><input type="checkbox" id="rv-reset"> embaralha o grid</label><button class="btn sm" data-act="regVersionAdd">Programar a partir do regulamento atual</button></div></div>
  ${vers.length ? `<div class="tbl-wrap" style="margin-top:8px"><table class="tbl edit"><thead><tr><th>Ano</th><th>Nome</th><th>Grid</th>${Object.keys(Regs.LABELS).slice(0, 9).map(k => `<th>${esc(Regs.LABELS[k][0])}</th>`).join('')}<th></th></tr></thead><tbody>${vers.map(([y, v]) => `<tr><td class="num">${y}</td><td>${esc(v.label || '')}</td><td>${v.reset ? 'embaralha' : '—'}</td>${Object.keys(Regs.LABELS).slice(0, 9).map(k => `<td>${regInput(`rules.versions.${y}.${k}`, k, v[k] ?? db.rules.regs[k])}</td>`).join('')}<td><button class="btn sm danger" data-act="regVersionDel" data-y="${y}">✕</button></td></tr>`).join('')}</tbody></table></div><p class="small muted">As mudanças entram em vigor no início da temporada indicada e ficam registradas no histórico.</p>` : '<p class="small muted">Nenhuma mudança programada. A cada N temporadas (Regras) o jogo também aplica um novo regulamento automaticamente.</p>'}`;
}
ACT.regVersionAdd = () => {
  const db = edDb(); Regs.ensure(db.rules);
  const y = Number($('#rv-year').value); if (!y) return;
  db.rules.versions[y] = { ...db.rules.regs, label: $('#rv-label').value || 'Novo regulamento', reset: $('#rv-reset').checked };
  toast(`Regulamento programado para ${y}.`, 'good'); render();
};
ACT.regVersionDel = (el) => { delete edDb().rules.versions[el.dataset.y]; render(); };

/* ---------- calendário com datas, sprints e logística ---------- */
function edCalendar(db) {
  const inCal = db.calendar.map(id => db.tracks.find(t => t.id === id)).filter(Boolean);
  const out = db.tracks.filter(t => !db.calendar.includes(t.id));
  const lg = CircuitGen.logistics(db);
  const dates = inCal.map(t => t.date ? new Date('2026-' + t.date.slice(5)) : null);
  return `<div class="grid g-hub"><div>
    <div class="row between" style="margin-bottom:8px"><h4>Calendário (${inCal.length} etapas · ${lg.total.toLocaleString('pt-BR')} km de viagem)</h4><div class="row"><button class="btn sm" data-act="edCal" data-op="optimize">Otimizar logística</button><button class="btn sm" data-act="edCal" data-op="shuffle">Embaralhar</button></div></div>
    <div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>#</th><th>Grande Prêmio</th><th>Data (mês-dia)</th><th>Sprint</th><th class="r">Viagem</th><th></th></tr></thead><tbody>${inCal.map((t, i) => {
      const ti = db.tracks.indexOf(t);
      const gap = i && dates[i] && dates[i - 1] ? Math.round((dates[i] - dates[i - 1]) / 864e5) : null;
      return `<tr><td class="num">${i + 1}</td><td>${esc(t.gp)}<div class="small muted">${esc(t.circuit)}${gap != null && gap <= 7 ? ' · <span class="acc">fim de semana seguido</span>' : ''}</div></td>
      <td><input class="inp num" style="width:90px" value="${esc(t.date ? t.date.slice(5) : '')}" placeholder="MM-DD" data-chg="calDate" data-i="${ti}"></td>
      <td>${cell(`tracks.${ti}.sprint`, t.sprint, 'bool')}</td>
      <td class="r num small ${lg.legs[i] > 8000 ? 'neg' : ''}">${i ? lg.legs[i].toLocaleString('pt-BR') + ' km' : 'início'}</td>
      <td class="r" style="white-space:nowrap"><button class="btn sm ghost" data-act="edCal" data-op="up" data-i="${i}" aria-label="Subir">▲</button><button class="btn sm ghost" data-act="edCal" data-op="down" data-i="${i}" aria-label="Descer">▼</button><button class="btn sm ghost" data-act="edCal" data-op="rm" data-i="${i}" aria-label="Remover">✕</button></td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">A distância entre etapas aumenta o custo de logística de todas as equipes. ${ED.target === 'career' ? 'Na carreira atual, o novo calendário vale a partir da próxima temporada.' : ''}</p></div>
  <div><h4 style="margin-bottom:8px">Circuitos fora do calendário (${out.length})</h4><div class="tbl-wrap" style="max-height:520px;overflow:auto"><table class="tbl">${out.map(t => `<tr><td>${esc(t.gp)}<div class="small muted">${esc(t.circuit || '')}${t.generated ? ' · gerado' : ''}</div></td><td class="r"><button class="btn sm" data-act="edCal" data-op="add" data-id="${t.id}">Adicionar</button></td></tr>`).join('') || '<tr><td class="muted">Todos estão no calendário.</td></tr>'}</table></div>
  <button class="btn" data-act="genOpen" style="margin-top:10px">Gerar circuito fictício</button></div></div>`;
}
CHG.calDate = (el) => { const t = edDb().tracks[+el.dataset.i]; const v = el.value.trim(); if (/^\d{2}-\d{2}$/.test(v)) { t.date = '2026-' + v; render(); } else if (!v) { t.date = null; render(); } else toast('Use o formato MM-DD (ex.: 03-15).', 'bad'); };
const _edCal = ACT.edCal;
ACT.edCal = (el) => { if (el.dataset.op === 'optimize') { const db = edDb(); const before = CircuitGen.logistics(db).total; db.calendar = CircuitGen.optimize(db); toast(`Viagens: ${before.toLocaleString('pt-BR')} km → ${CircuitGen.logistics(db).total.toLocaleString('pt-BR')} km.`, 'good'); return render(); } _edCal(el); };

/* ---------- gerador de circuitos ---------- */
ACT.genOpen = () => {
  modal('Gerar circuito', `
    <div class="grid g2">
      <label class="field"><span>Nome do circuito</span><input class="inp" id="gn-name" value="Autódromo do Litoral"></label>
      <label class="field"><span>Cidade</span><input class="inp" id="gn-city" value="Florianópolis"></label>
      <label class="field"><span>País (código)</span><input class="inp" id="gn-country" value="BRA"></label>
      <label class="field"><span>Tipo</span><select class="inp" id="gn-type">${opt('permanent', 'Permanente', 'permanent')}${opt('street', 'De rua', '')}</select></label>
      <label class="field"><span>Extensão (km)</span><input class="inp num" id="gn-length" type="number" step="0.01" value="4.9"></label>
      <label class="field"><span>Curvas</span><input class="inp num" id="gn-turns" type="number" value="16"></label>
      <label class="field"><span>Curvas rápidas (%)</span><input class="inp num" id="gn-fast" type="number" value="35"></label>
      <label class="field"><span>Curvas lentas (%)</span><input class="inp num" id="gn-slow" type="number" value="30"></label>
      <label class="field"><span>Retas longas</span><input class="inp num" id="gn-straights" type="number" value="2"></label>
      <label class="field"><span>Maior reta (m)</span><input class="inp num" id="gn-longest" type="number" value="1100"></label>
      <label class="field"><span>Desnível (m)</span><input class="inp num" id="gn-elev" type="number" value="30"></label>
      <label class="field"><span>Abrasividade do asfalto (0–100)</span><input class="inp num" id="gn-abr" type="number" value="55"></label>
      <label class="field"><span>Chance de chuva (%)</span><input class="inp num" id="gn-rain" type="number" value="25"></label>
      <label class="field"><span>Latitude / longitude (opcional)</span><input class="inp" id="gn-ll" value="-27.6, -48.5"></label>
    </div>
    <div class="trackbox" style="height:220px;background:var(--bg2);border-radius:var(--r)"><canvas id="gn-prev"></canvas></div>
    <div id="gn-info" class="small muted"></div>`,
    `<button class="btn" data-act="genPreview">Pré-visualizar</button><button class="btn primary" data-act="genSave">Adicionar à base</button>`);
  setTimeout(() => ACT.genPreview(), 50);
};
function genParams() {
  const v = id => $('#' + id).value;
  const ll = v('gn-ll').split(',').map(x => Number(x.trim()));
  return { name: v('gn-name'), city: v('gn-city'), country: v('gn-country').toUpperCase().slice(0, 3), type: v('gn-type'), length: Number(v('gn-length')), turns: Number(v('gn-turns')), fast: Number(v('gn-fast')), slow: Number(v('gn-slow')), straights: Number(v('gn-straights')), longest: Number(v('gn-longest')), elevation: Number(v('gn-elev')), abrasion: Number(v('gn-abr')), rain: Number(v('gn-rain')), lat: isFinite(ll[0]) ? ll[0] : null, lon: isFinite(ll[1]) ? ll[1] : null };
}
ACT.genPreview = () => {
  if (!$('#gn-name')) return;
  const t = CircuitGen.create(genParams()); UI.genTrack = t;
  const cv = $('#gn-prev'); if (cv) drawTrack(cv, t, [], { pad: 20 });
  $('#gn-info').innerHTML = `Perfil: aero ${Math.round(t.weights.aero * 100)}% · chassi ${Math.round(t.weights.chassis * 100)}% · motor ${Math.round(t.weights.engine * 100)}% · ultrapassagem ${Math.round(t.overtaking * 100)}% · desgaste ${t.tyreStress}× · volta de referência ${fmtLap(t.baseLap)} · ${t.laps} voltas · pneus ${Engine.alloc(t).map(c => 'C' + c).join('/')}`;
};
ACT.genSave = () => { if (!UI.genTrack) ACT.genPreview(); const db = edDb(); db.tracks.push(UI.genTrack); toast(`${UI.genTrack.circuit} adicionado. Inclua no calendário para correr lá.`, 'good'); closeModal(); render(); };

/* ---------- P&D ampliado ---------- */
SCREENS.dev = {
  html() {
    const team = Career.team(G);
    const eng = Engine.engineOf(G.db, team);
    const slots = Career.slots(team);
    const teams = G.db.teams.slice().sort((a, b) => Engine.carRating(G.db, b) - Engine.carRating(G.db, a));
    const area = UI.params.area || 'floor';
    const quotes = Object.keys(Career.SIZES).map(s => Career.projectQuote(G, area, s));
    const capLeft = Career.capRoom(G);
    const R = Regs.r(G);
    const p = G.season.round / G.season.calendar.length;
    const nyOpen = p * 100 >= R.nextYearStartPct;
    const A = Career.AREAS[area];
    return `<div class="page-head"><div><div class="eyebrow">${esc(team.name)}${team.chassisName ? ' · ' + esc(team.chassisName) : ''}${team.puName ? ' · ' + esc(team.puName) : ''}</div><h1>Carro e P&D</h1></div><div class="row"><span class="chip">${G.projects.length}/${slots} projetos</span>${R.atr ? `<span class="chip acc">Túnel de vento: ${Math.round(Regs.atrFactor(G, team.id) * 100)}%</span>` : ''}</div></div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Seu carro</h3>${carImg(team) ? '' : ''}<span class="small muted">${team.works ? 'Equipe de fábrica' : 'Cliente'} · motor ${esc(eng.name)}</span></div>${carImg(team) ? `<div class="panel-b" style="padding-bottom:0">${carImg(team)}</div>` : ''}<div class="panel-b stack">
        ${attrRow('Aerodinâmica', team.car.aero)}${attrRow('Chassi', team.car.chassis)}${attrRow('Potência do motor', eng.power + (team.car.engineBonus || 0), 'b')}${attrRow('Confiabilidade', Engine.reliability(G.db, team), 'g')}${attrRow('Gestão de pneus', team.car.tyreCare, 'g')}${attrRow('Refrigeração', team.car.cooling ?? 80, 'b')}${attrRow('Eficiência energética', team.car.energy ?? 80, 'b')}
        <div class="sep"></div>
        <div class="label">Foco no carro de ${G.season.year + 1}: ${G.nextYearFocus}%</div>
        <input type="range" min="0" max="100" step="10" value="${G.nextYearFocus}" id="nyf" data-chg="nyFocus" aria-label="Foco no próximo ano" ${nyOpen ? '' : 'disabled'}>
        <p class="small muted">${nyOpen ? `Parte dos ganhos de aerodinâmica e chassi vai para o carro novo, com bônus de 35%.` : `O regulamento libera o foco no carro novo a partir de ${R.nextYearStartPct}% da temporada.`} Acumulado: <b class="pos">+${G.nextYearBank.toFixed(2)}</b>.${(G.db.rules.versions || {})[G.season.year + 1] && G.db.rules.versions[G.season.year + 1].reset ? ' <b class="acc">Novo regulamento em ' + (G.season.year + 1) + ': começar cedo vale mais.</b>' : ''}</p>
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Comparativo do grid</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Equipe</th><th class="r">Geral</th><th class="r">Aero</th><th class="r">Chassi</th><th class="r">Motor</th><th class="r">Confiab.</th><th class="r">ATR</th></tr></thead><tbody>
        ${teams.map(t => { const e = Engine.engineOf(G.db, t); return `<tr class="${t.id === team.id ? 'me' : ''}"><td>${tTag(t.id)}</td><td class="r num"><b>${Engine.carRating(G.db, t).toFixed(1)}</b></td><td class="r num">${t.car.aero.toFixed(1)}</td><td class="r num">${t.car.chassis.toFixed(1)}</td><td class="r num">${(e.power + (t.car.engineBonus || 0)).toFixed(1)}</td><td class="r num">${Engine.reliability(G.db, t).toFixed(0)}</td><td class="r num muted">${Math.round(Regs.atrFactor(G, t.id) * 100)}%</td></tr>`; }).join('')}
      </tbody></table></div></div>
    </div>
    <div class="panel"><div class="panel-h"><h3>Projetos em andamento</h3></div><div class="panel-b stack">
      ${G.projects.length ? G.projects.map(p => `<div class="row between"><div style="min-width:0"><b>${esc(p.name)}</b><div class="small muted">Ganho previsto +${p.min}–${p.max} · risco ${p.risk}%${p.staffName ? ' · responsável ' + esc(p.staffName) : ''}${p.rel ? ` · confiabilidade ${p.rel > 0 ? '+' : ''}${p.rel}` : ''}</div></div><div style="width:200px"><div class="label">${p.total - p.left}/${p.total} GPs</div>${bar(p.total - p.left, p.total, 'g')}</div></div>`).join('') : '<p class="muted">Nenhum projeto em andamento.</p>'}
    </div></div>
    <div class="panel"><div class="panel-h"><h3>Novo projeto</h3><div class="row"><select class="inp" style="width:auto" data-chg="devArea" aria-label="Área">${Object.entries(Career.AREAS).map(([k, a]) => opt(k, a.name + (a.works && !team.works ? ' (só fábrica)' : ''), area)).join('')}</select><span class="small muted">Teto disponível ${fmtMoney(capLeft)} · caixa ${fmtMoney(G.finances.balance)}</span></div></div>
      <div class="panel-b grid g3">
        ${quotes.map(q => `<div class="panel" style="background:var(--panel2)"><div class="panel-b stack">
          <h3>${Career.SIZES[q.size].name}</h3>
          <dl class="kv"><dt>Custo</dt><dd>${fmtMoney(q.cost)}</dd><dt>Duração</dt><dd>${q.races} GPs</dd><dt>Ganho</dt><dd class="pos">+${q.min}–${q.max}</dd><dt>Risco de falha</dt><dd>${q.risk}%</dd><dt>Confiabilidade</dt><dd class="${q.rel < 0 ? 'neg' : q.rel > 0 ? 'pos' : ''}">${q.rel ? (q.rel > 0 ? '+' : '') + (q.rel * Career.SIZES[q.size].races / 2).toFixed(1) : '—'}</dd><dt>Responsável</dt><dd style="white-space:normal">${esc(q.staffName || Career.STAFF_ROLES[A.staff] || '—')}</dd>${A.aeroReg || A.atr ? `<dt>Túnel/CFD (ATR)</dt><dd>${q.atr}%</dd>` : ''}</dl>
          <button class="btn primary" data-act="startProject" data-area="${q.area}" data-size="${q.size}" ${G.projects.length >= slots || q.blocked ? 'disabled' : ''}>${q.blocked ? 'Indisponível' : 'Iniciar'}</button>
        </div></div>`).join('')}
      </div></div>`;
  },
};
CHG.devArea = (el) => go('dev', { area: el.value });

/* ---------- finanças: projeção ---------- */
const _finHtml = SCREENS.finance.html;
SCREENS.finance.html = function () {
  const base = _finHtml.call(this);
  const L = G.finances.ledger.filter(x => x.year === G.season.year);
  const played = Math.max(1, G.season.round);
  const left = G.season.calendar.length - G.season.round;
  const net = sum(L.map(x => x.amount)) / played;
  const pos = Career.standingsC(G).findIndex(x => x.tid === G.player.teamId) + 1;
  const prize = typeof Econ !== 'undefined' ? 0 : (G.db.rules.prizePerPosition[pos - 1] || 10);
  const proj = G.finances.balance + net * left + prize;
  const capProj = typeof Econ !== 'undefined' ? G.finances.spent + Econ.committed(G, Career.team(G)) - Econ.cap(G) * 0.03 * (left / G.season.calendar.length) : G.finances.spent / played * G.season.calendar.length;
  const cats = {};
  L.forEach(x => { if (x.amount < 0) cats[x.cat] = (cats[x.cat] || 0) - x.amount; });
  const team = Career.team(G);
  return base.replace('<div class="grid g2">', `<div class="panel"><div class="panel-h"><h3>Previsão para o fim de ${G.season.year}</h3><span class="small muted">Média das ${played} etapa(s) disputada(s)</span></div><div class="panel-b grid g4">
    <div><div class="label">Caixa projetado</div><div class="stat-big ${proj < 0 ? 'neg' : 'pos'}">${fmtMoney(proj)}</div><div class="small muted">${prize ? `inclui ${fmtMoney(prize)} de prêmio (${ordinal(pos)})` : `a posição final (${ordinal(pos)} agora) define a distribuição comercial do ano que vem`}</div></div>
    <div><div class="label">Resultado por GP</div><div class="stat-big ${net < 0 ? 'neg' : 'pos'}">${fmtMoney(net)}</div></div>
    <div><div class="label">Teto no fim do ano</div><div class="stat-big ${capProj > G.db.rules.budgetCap ? 'neg' : ''}">${Math.round(capProj / G.db.rules.budgetCap * 100)}%</div><div class="small muted">${capProj > G.db.rules.budgetCap ? 'Risco de estourar o teto: punição esportiva e multa' : 'Dentro do limite'}</div></div>
    <div><div class="label">Folha fixa por ano</div><div class="stat-big">${fmtMoney(sum(Career.teamDrivers(G, team.id).map(d => d.salary)) + Staff.payroll(team))}</div><div class="small muted">pilotos ${fmtMoney(sum(Career.teamDrivers(G, team.id).map(d => d.salary)))} · funcionários ${fmtMoney(Staff.payroll(team))}</div></div>
  </div></div><div class="grid g2">`);
};

/* "gerar outro traçado" também vale para os circuitos gerados (respeitando os parâmetros) */
const _edShape = ACT.edShape;
ACT.edShape = (el) => { const t = edDb().tracks[+el.dataset.i]; if (t.generated && t.gen) { t.shapeSeed = Math.floor(Math.random() * 1e6); t.shape = (CircuitGen.build(t.gen, t.shapeSeed % 100000) || {}).shape || CircuitGen.shape(t.gen, t.shapeSeed) || t.shape; return render(); } _edShape(el); };
