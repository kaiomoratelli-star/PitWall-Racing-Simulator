/* ============================================================
   PIT WALL — editor da base de dados (regras, equipes, pilotos,
   pistas, motores, calendário) + importar/exportar JSON
   ============================================================ */
'use strict';

const ED = { tab: 'teams', target: 'base', track: null };
function edDb() { return ED.target === 'career' && G ? G.db : BASE; }

ACT.openEditorBase = () => { ED.target = 'base'; UI.view = 'editor'; render(); };
SCREENS.editor = {
  get bare() { return !G; },
  html() {
    const db = edDb();
    const tabs = [['rules', 'Regras'], ['teams', 'Equipes'], ['drivers', 'Pilotos'], ['tracks', 'Pistas'], ['engines', 'Motores'], ['calendar', 'Calendário'], ['io', 'Importar / exportar']];
    let body = '';
    if (ED.tab === 'rules') body = edRules(db);
    if (ED.tab === 'teams') body = edTeams(db);
    if (ED.tab === 'drivers') body = edDrivers(db);
    if (ED.tab === 'tracks') body = edTracks(db);
    if (ED.tab === 'engines') body = edEngines(db);
    if (ED.tab === 'calendar') body = edCalendar(db);
    if (ED.tab === 'io') body = edIO(db);
    const inner = `
    <div class="page-head"><div><div class="eyebrow">${ED.target === 'career' ? 'Editando a carreira em andamento' : 'Base usada em novas carreiras'}</div><h1>Editor da base</h1></div>
      <div class="row">${G ? segBtns('edTarget', ED.target, [['base', 'Base para novas carreiras'], ['career', 'Carreira atual']]) : `<button class="btn" data-act="go" data-v="title">Voltar</button>`}<button class="btn primary" data-act="edSave">Salvar alterações</button></div></div>
    ${ED.target === 'career' ? '<div class="callout warn">Mudanças aqui valem imediatamente para a carreira atual: carros, pilotos, pistas e regras.</div>' : ''}
    <div class="panel"><div class="tabs">${tabs.map(([k, l]) => `<button class="${ED.tab === k ? 'on' : ''}" data-act="edTab" data-t="${k}">${l}</button>`).join('')}</div><div class="panel-b">${body}</div></div>`;
    return G ? inner : `<div class="main" style="max-width:1400px;margin:0 auto"><div class="main-inner">${inner}</div></div>`;
  },
  after() { if (ED.tab === 'tracks') drawEdTrack(); },
};
ACT.edTab = (el) => { ED.tab = el.dataset.t; render(); };
ACT.edTarget = (el) => { ED.target = el.dataset.val; render(); };
ACT.edSave = async () => {
  if (ED.target === 'career') { autosave(); toast('Carreira salva com as alterações.', 'good'); }
  else { await Store.saveBaseDb(BASE); toast('Base salva. Novas carreiras vão usá-la.', 'good'); }
};

/* célula editável genérica: data-path="teams.3.car.aero" */
function cell(path, v, type = 'number', extra = '') {
  if (type === 'number') return `<input class="inp num" type="number" step="any" value="${esc(v)}" data-chg="edCell" data-path="${path}" ${extra} style="width:70px">`;
  if (type === 'color') return `<input type="color" value="${esc(v)}" data-chg="edCell" data-path="${path}" data-type="str" aria-label="cor">`;
  if (type === 'bool') return `<input type="checkbox" ${v ? 'checked' : ''} data-chg="edCell" data-path="${path}" data-type="bool">`;
  return `<input class="inp" value="${esc(v)}" data-chg="edCell" data-path="${path}" data-type="str" ${extra}>`;
}
function selCell(path, v, options) { return `<select class="inp" data-chg="edCell" data-path="${path}" data-type="str">${options.map(([a, b]) => opt(a, b, v)).join('')}</select>`; }
CHG.edCell = (el) => {
  const db = edDb();
  const parts = el.dataset.path.split('.');
  let o = db;
  for (let i = 0; i < parts.length - 1; i++) o = o[isNaN(parts[i]) ? parts[i] : +parts[i]];
  const k = parts[parts.length - 1];
  let v;
  if (el.dataset.type === 'bool') v = el.checked;
  else if (el.dataset.type === 'str') v = el.value === '__null' ? null : el.value;
  else if (el.dataset.type === 'list') v = el.value.split(/[,;\s]+/).filter(Boolean).map(Number).filter(isFinite);
  else v = Number(el.value);
  if (k === 'seat') v = v === 'R' ? 'R' : v == null || v === '' ? null : +v;
  o[k] = v;
  if (el.dataset.rerender) render();
};

function edRules(db) {
  const r = db.rules;
  return `<div class="grid g3">
    <label class="field"><span>Nome do campeonato</span>${cell('rules.seriesName', r.seriesName, 'str')}</label>
    <label class="field"><span>Ano inicial</span>${cell('rules.startYear', r.startYear)}</label>
    <label class="field"><span>Nome da base</span>${cell('name', db.name, 'str')}</label>
    <label class="field"><span>Pontuação (1º, 2º, …)</span><input class="inp num" value="${esc(r.points.join(', '))}" data-chg="edCell" data-path="rules.points" data-type="list"></label>
    <label class="field"><span>Ponto pela volta mais rápida (0 desliga)</span>${cell('rules.fastestLapPoint', r.fastestLapPoint)}</label>
    <label class="field"><span>Volta rápida só pontua até a posição</span>${cell('rules.fastestLapTopN', r.fastestLapTopN)}</label>
    <label class="field"><span>Teto orçamentário (milhões)</span>${cell('rules.budgetCap', r.budgetCap)}</label>
    <label class="field"><span>Distância da corrida (% do total)</span>${cell('rules.raceDistancePct', r.raceDistancePct)}</label>
    <label class="field"><span>Saídas de treino por piloto</span>${cell('rules.practiceRuns', r.practiceRuns)}</label>
    <label class="field"><span>Novo regulamento a cada N temporadas</span>${cell('rules.regulationChangeEvery', r.regulationChangeEvery)}</label>
    <label class="field"><span>Premiação por posição de construtores (milhões)</span><input class="inp num" value="${esc(r.prizePerPosition.join(', '))}" data-chg="edCell" data-path="rules.prizePerPosition" data-type="list"></label>
    <label class="check" style="align-self:end">${cell('rules.mandatoryTwoCompounds', r.mandatoryTwoCompounds, 'bool')} Obrigatório usar 2 compostos em corrida seca</label>
  </div>`;
}

function edTeams(db) {
  const engs = db.engines.map(e => [e.id, e.name]);
  return `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="edAdd" data-k="teams">Adicionar equipe</button><span class="small muted">Valores de carro em torno de 80–95. Orçamento em milhões por temporada.</span></div>
  <div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>Nome</th><th>Sigla</th><th>País</th><th>Cores</th><th>Motor</th><th>Orçam.</th><th>Reput.</th><th>Aero</th><th>Chassi</th><th>Confiab.</th><th>Pneus</th><th>Pit</th><th>Instal.</th><th>D. técnico</th><th>Aerod.</th><th>Engenh.</th><th>Estrat.</th><th>Chefe</th><th></th></tr></thead><tbody>
  ${db.teams.map((t, i) => `<tr><td>${cell(`teams.${i}.name`, t.name, 'str', 'style="min-width:170px"')}</td><td>${cell(`teams.${i}.short`, t.short, 'str', 'style="width:56px"')}</td><td>${cell(`teams.${i}.country`, t.country, 'str', 'style="width:56px"')}</td><td class="row" style="gap:4px;flex-wrap:nowrap">${cell(`teams.${i}.color`, t.color, 'color')}${cell(`teams.${i}.color2`, t.color2, 'color')}</td><td>${selCell(`teams.${i}.engine`, t.engine, engs)}</td>
  <td>${cell(`teams.${i}.budget`, t.budget)}</td><td>${cell(`teams.${i}.reputation`, t.reputation)}</td><td>${cell(`teams.${i}.car.aero`, t.car.aero)}</td><td>${cell(`teams.${i}.car.chassis`, t.car.chassis)}</td><td>${cell(`teams.${i}.car.reliability`, t.car.reliability)}</td><td>${cell(`teams.${i}.car.tyreCare`, t.car.tyreCare)}</td><td>${cell(`teams.${i}.pitCrew`, t.pitCrew)}</td><td>${cell(`teams.${i}.facilities`, t.facilities)}</td>
  <td>${cell(`teams.${i}.staff.technical`, t.staff.technical)}</td><td>${cell(`teams.${i}.staff.aero`, t.staff.aero)}</td><td>${cell(`teams.${i}.staff.engineering`, t.staff.engineering)}</td><td>${cell(`teams.${i}.staff.strategy`, t.staff.strategy)}</td><td>${cell(`teams.${i}.principal`, t.principal, 'str', 'style="min-width:130px"')}</td>
  <td><button class="btn sm danger" data-act="edDel" data-k="teams" data-i="${i}" aria-label="Remover">✕</button></td></tr>`).join('')}
  </tbody></table></div>`;
}

function edDrivers(db) {
  const teams = [['__null', 'Sem equipe']].concat(db.teams.map(t => [t.id, t.name]));
  const filt = ED.dFilter || 'all';
  const list = db.drivers.map((d, i) => ({ d, i })).filter(x => !x.d.retired && (filt === 'all' || (filt === 'free' ? !x.d.team : x.d.team === filt)));
  const attrs = ['pace', 'qualifying', 'racecraft', 'consistency', 'tyre', 'wet', 'overtaking', 'defending', 'aggression', 'experience', 'potential', 'morale'];
  const lbl = { pace: 'Ritmo', qualifying: 'Classif.', racecraft: 'Corrida', consistency: 'Consist.', tyre: 'Pneus', wet: 'Chuva', overtaking: 'Ultrap.', defending: 'Defesa', aggression: 'Agress.', experience: 'Exper.', potential: 'Potenc.', morale: 'Moral' };
  return `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="edAdd" data-k="drivers">Adicionar piloto</button>
    <select class="inp" style="width:auto" data-chg="edDFilter" aria-label="Filtrar">${opt('all', 'Todos', filt)}${opt('free', 'Sem equipe', filt)}${db.teams.map(t => opt(t.id, t.name, filt)).join('')}</select>
    <span class="small muted">Assento: 1 e 2 correm, R é reserva. Os dois primeiros pilotos de cada equipe correm se o assento ficar vazio.</span></div>
  <div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>Nome</th><th>Nac.</th><th>Idade</th><th>Nº</th><th>Equipe</th><th>Assento</th><th>Estilo</th>${attrs.map(a => `<th>${lbl[a]}</th>`).join('')}<th>Salário</th><th>Contrato +anos</th><th>Nota</th><th></th></tr></thead><tbody>
  ${list.map(({ d, i }) => `<tr><td>${cell(`drivers.${i}.name`, d.name, 'str', 'style="min-width:160px"')}</td><td>${cell(`drivers.${i}.nat`, d.nat, 'str', 'style="width:56px"')}</td><td>${cell(`drivers.${i}.age`, d.age)}</td><td>${cell(`drivers.${i}.number`, d.number)}</td>
  <td>${selCell(`drivers.${i}.team`, d.team || '__null', teams)}</td><td>${selCell(`drivers.${i}.seat`, d.seat == null ? '' : d.seat, [['', '—'], ['1', '1'], ['2', '2'], ['R', 'R']])}</td><td>${selCell(`drivers.${i}.style`, d.style, Object.entries(STYLE_LABELS))}</td>
  ${attrs.map(a => `<td>${cell(`drivers.${i}.${a}`, Math.round(d[a] * 10) / 10)}</td>`).join('')}<td>${cell(`drivers.${i}.salary`, d.salary)}</td><td>${cell(`drivers.${i}.contractYears`, d.contractYears)}</td><td class="num">${driverOverall(d)}</td>
  <td><button class="btn sm danger" data-act="edDel" data-k="drivers" data-i="${i}" aria-label="Remover">✕</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
CHG.edDFilter = (el) => { ED.dFilter = el.value; render(); };

function edTracks(db) {
  const sel = ED.track && db.tracks.find(t => t.id === ED.track) ? ED.track : db.tracks[0] && db.tracks[0].id;
  ED.track = sel;
  const ti = db.tracks.findIndex(t => t.id === sel);
  return `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="edAdd" data-k="tracks">Adicionar pista</button><span class="small muted">Pesos aero/chassi/motor definem o tipo de pista. Ultrapassagem e chuva de 0 a 1.</span></div>
  ${ti >= 0 ? `<div class="grid g2" style="margin-bottom:14px"><div class="panel" style="background:var(--bg2)"><div class="trackbox" style="height:240px"><canvas id="edTrack"></canvas></div></div><div class="stack"><h3>${esc(db.tracks[ti].gp)}</h3><p class="small muted">O traçado é gerado a partir de uma semente. Gere outro até gostar.</p><div class="row"><button class="btn" data-act="edShape" data-i="${ti}">Gerar outro traçado</button><span class="num small muted">semente ${db.tracks[ti].shapeSeed}</span></div></div></div>` : ''}
  <div class="tbl-wrap"><table class="tbl edit"><thead><tr><th></th><th>GP</th><th>Circuito</th><th>País</th><th>Voltas</th><th>km</th><th>Volta base (s)</th><th>Aero</th><th>Chassi</th><th>Motor</th><th>Ultrap.</th><th>Pneus</th><th>Chuva</th><th>SC</th><th>Pit (s)</th><th>DRS</th><th>Rua</th><th></th></tr></thead><tbody>
  ${db.tracks.map((t, i) => `<tr class="${t.id === sel ? 'me' : ''}"><td><button class="btn sm ghost" data-act="edPickTrack" data-id="${t.id}">Ver</button></td><td>${cell(`tracks.${i}.gp`, t.gp, 'str', 'style="min-width:170px"')}</td><td>${cell(`tracks.${i}.circuit`, t.circuit, 'str', 'style="min-width:120px"')}</td><td>${cell(`tracks.${i}.country`, t.country, 'str', 'style="width:56px"')}</td>
  <td>${cell(`tracks.${i}.laps`, t.laps)}</td><td>${cell(`tracks.${i}.length`, t.length)}</td><td>${cell(`tracks.${i}.baseLap`, t.baseLap)}</td><td>${cell(`tracks.${i}.weights.aero`, t.weights.aero)}</td><td>${cell(`tracks.${i}.weights.chassis`, t.weights.chassis)}</td><td>${cell(`tracks.${i}.weights.engine`, t.weights.engine)}</td>
  <td>${cell(`tracks.${i}.overtaking`, t.overtaking)}</td><td>${cell(`tracks.${i}.tyreStress`, t.tyreStress)}</td><td>${cell(`tracks.${i}.rain`, t.rain)}</td><td>${cell(`tracks.${i}.scFactor`, t.scFactor)}</td><td>${cell(`tracks.${i}.pitLoss`, t.pitLoss)}</td><td>${cell(`tracks.${i}.drs`, t.drs)}</td><td>${cell(`tracks.${i}.street`, t.street, 'bool')}</td>
  <td><button class="btn sm danger" data-act="edDel" data-k="tracks" data-i="${i}" aria-label="Remover">✕</button></td></tr>`).join('')}
  </tbody></table></div>`;
}
function drawEdTrack() { const cv = $('#edTrack'); const db = edDb(); const t = db.tracks.find(x => x.id === ED.track); if (cv && t) requestAnimationFrame(() => drawTrack(cv, t, [], { pad: 22 })); }
ACT.edPickTrack = (el) => { ED.track = el.dataset.id; render(); };
ACT.edShape = (el) => { const t = edDb().tracks[+el.dataset.i]; t.shapeSeed = Math.floor(Math.random() * 100000); render(); };

function edEngines(db) {
  return `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="edAdd" data-k="engines">Adicionar fornecedor</button></div>
  <div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>Nome</th><th>Potência</th><th>Confiabilidade</th><th>Custo anual (M)</th><th>Equipes</th><th></th></tr></thead><tbody>
  ${db.engines.map((e, i) => `<tr><td>${cell(`engines.${i}.name`, e.name, 'str', 'style="min-width:200px"')}</td><td>${cell(`engines.${i}.power`, e.power)}</td><td>${cell(`engines.${i}.reliability`, e.reliability)}</td><td>${cell(`engines.${i}.cost`, e.cost)}</td><td class="small muted">${db.teams.filter(t => t.engine === e.id).map(t => esc(t.short)).join(', ')}</td><td><button class="btn sm danger" data-act="edDel" data-k="engines" data-i="${i}" aria-label="Remover">✕</button></td></tr>`).join('')}
  </tbody></table></div>`;
}

function edCalendar(db) {
  const inCal = db.calendar.map(id => db.tracks.find(t => t.id === id)).filter(Boolean);
  const out = db.tracks.filter(t => !db.calendar.includes(t.id));
  return `<div class="grid g2"><div><h4 style="margin-bottom:8px">Calendário (${inCal.length} etapas)</h4><table class="tbl">${inCal.map((t, i) => `<tr><td class="num">${i + 1}</td><td>${esc(t.gp)}</td><td class="r"><button class="btn sm ghost" data-act="edCal" data-op="up" data-i="${i}" aria-label="Subir">▲</button><button class="btn sm ghost" data-act="edCal" data-op="down" data-i="${i}" aria-label="Descer">▼</button><button class="btn sm ghost" data-act="edCal" data-op="rm" data-i="${i}" aria-label="Remover">✕</button></td></tr>`).join('')}</table>
  <div class="row" style="margin-top:10px"><button class="btn sm" data-act="edCal" data-op="shuffle">Embaralhar</button></div>
  ${ED.target === 'career' ? '<p class="small muted" style="margin-top:8px">Na carreira atual, o novo calendário vale a partir da próxima temporada.</p>' : ''}</div>
  <div><h4 style="margin-bottom:8px">Pistas fora do calendário</h4><table class="tbl">${out.map(t => `<tr><td>${esc(t.gp)}</td><td class="r"><button class="btn sm" data-act="edCal" data-op="add" data-id="${t.id}">Adicionar</button></td></tr>`).join('') || '<tr><td class="muted">Todas as pistas estão no calendário.</td></tr>'}</table></div></div>`;
}
ACT.edCal = (el) => {
  const c = edDb().calendar; const i = +el.dataset.i;
  const op = el.dataset.op;
  if (op === 'up' && i > 0) [c[i - 1], c[i]] = [c[i], c[i - 1]];
  if (op === 'down' && i < c.length - 1) [c[i + 1], c[i]] = [c[i], c[i + 1]];
  if (op === 'rm') c.splice(i, 1);
  if (op === 'add') c.push(el.dataset.id);
  if (op === 'shuffle') { const s = c.slice().sort(() => Math.random() - 0.5); c.length = 0; c.push(...s); }
  render();
};

ACT.edAdd = (el) => {
  const db = edDb(); const k = el.dataset.k;
  const id = k.slice(0, 3) + Date.now().toString(36);
  if (k === 'teams') db.teams.push({ id, name: 'Nova equipe', short: 'NOV', country: 'BRA', color: '#e0457b', color2: '#1a1a1a', engine: db.engines[0].id, budget: 100, reputation: 55, car: { aero: 80, chassis: 80, reliability: 82, tyreCare: 80 }, pitCrew: 78, facilities: 68, principal: 'Chefe', staff: { technical: 74, aero: 74, strategy: 74, engineering: 74 } });
  if (k === 'drivers') { const d = { id, name: 'Novo piloto', nat: 'BRA', age: 21, number: 99, style: 'complete', team: null, seat: null, salary: 1, contractYears: 1, pace: 78, qualifying: 78, racecraft: 76, consistency: 76, tyre: 76, wet: 76, overtaking: 76, defending: 76, aggression: 50, experience: 20, potential: 88, morale: 70, popularity: 20 }; if (G && ED.target === 'career') d.career = { starts: 0, wins: 0, podiums: 0, poles: 0, titles: 0, points: 0 }; db.drivers.unshift(d); }
  if (k === 'tracks') db.tracks.push({ id, gp: 'Novo Grande Prêmio', circuit: 'Cidade', country: 'BRA', laps: 60, length: 4.8, baseLap: 84, weights: { aero: .34, chassis: .33, engine: .33 }, overtaking: .5, tyreStress: 1, rain: .2, scFactor: 1, pitLoss: 21, drs: 2, street: false, shapeSeed: Math.floor(Math.random() * 100000) });
  if (k === 'engines') db.engines.push({ id, name: 'Novo motor', power: 86, reliability: 86, cost: 12 });
  render();
};
ACT.edDel = (el) => {
  const db = edDb(); const k = el.dataset.k; const i = +el.dataset.i;
  const item = db[k][i];
  if (k === 'teams' && db.teams.length <= 2) return toast('O grid precisa de pelo menos 2 equipes.', 'bad');
  if (k === 'engines' && db.engines.length <= 1) return toast('Precisa existir pelo menos um motor.', 'bad');
  if (k === 'tracks' && db.tracks.length <= 1) return toast('Precisa existir pelo menos uma pista.', 'bad');
  if (G && ED.target === 'career' && k === 'teams' && item.id === G.player.teamId) return toast('Você não pode apagar a sua própria equipe.', 'bad');
  db[k].splice(i, 1);
  if (k === 'teams') db.drivers.forEach(d => { if (d.team === item.id) { d.team = null; d.seat = null; } });
  if (k === 'engines') db.teams.forEach(t => { if (t.engine === item.id) t.engine = db.engines[0].id; });
  if (k === 'tracks') db.calendar = db.calendar.filter(x => x !== item.id);
  if (G && ED.target === 'career' && k === 'teams') { delete G.season.standC[item.id]; }
  render();
};

function edIO(db) {
  return `<div class="grid g2"><div class="stack">
    <h3>Exportar</h3><p class="small muted">Baixe a base como JSON para editar fora do jogo, compartilhar com amigos ou montar um grid da vida real.</p>
    <div class="row"><button class="btn primary" data-act="edExport">Baixar JSON</button><button class="btn" data-act="edCopy">Copiar JSON</button></div>
    <div class="sep"></div>
    <h3>Restaurar</h3><p class="small muted">Volta para o Grid Padrão do Pit Wall${ED.target === 'career' ? ' (somente a base de novas carreiras; a carreira atual não muda)' : ''}.</p>
    <button class="btn danger" data-act="edReset">Restaurar base padrão</button>
  </div><div class="stack">
    <h3>Importar</h3><p class="small muted">Envie um arquivo .json ou cole o conteúdo. Campos que faltarem são preenchidos com valores padrão.</p>
    <label class="btn" for="edFile" style="align-self:flex-start">Escolher arquivo</label><input type="file" id="edFile" accept=".json,application/json" hidden data-chg="edImportFile">
    <textarea class="inp mono" id="edPaste" rows="8" placeholder='{"teams":[...],"drivers":[...],"tracks":[...]}'></textarea>
    <button class="btn" data-act="edImportPaste" style="align-self:flex-start">Importar texto colado</button>
  </div></div>`;
}
ACT.edExport = async () => { const r = await Store.exportFile(`pitwall-base-${(edDb().name || 'base').replace(/\W+/g, '-').toLowerCase()}.json`, exportableDb(edDb())); if (!r.ok) toast(r.msg, 'bad'); };
ACT.edCopy = () => copyText(JSON.stringify(exportableDb(edDb()), null, 1));
ACT.edReset = async () => { BASE = defaultDb(); await Store.saveBaseDb(BASE); toast('Base padrão restaurada.', 'good'); if (ED.target === 'base') render(); };
function exportableDb(db) {
  const o = deepClone(db);
  o.drivers = o.drivers.filter(d => !d.retired).map(d => { delete d.career; delete d.injured; delete d.futureTeam; delete d.rookie; return d; });
  return o;
}
function applyImported(obj) {
  if (!obj || !obj.teams || !obj.drivers || !obj.tracks) throw new Error('O JSON precisa ter teams, drivers e tracks.');
  const db = normalizeDb(obj);
  if (ED.target === 'career' && G) {
    toast('Importação substitui a base de novas carreiras. A carreira atual não muda.', '');
  }
  BASE = db;
  Store.saveBaseDb(BASE);
  ED.target = 'base';
  toast(`Base "${db.name}" importada: ${db.teams.length} equipes, ${db.drivers.length} pilotos, ${db.tracks.length} pistas.`, 'good');
  render();
}
CHG.edImportFile = async (el) => { const f = el.files[0]; if (!f) return; try { applyImported(await Store.readFile(f)); } catch (e) { toast(e.message, 'bad'); } };
ACT.edImportPaste = () => { try { applyImported(JSON.parse($('#edPaste').value)); } catch (e) { toast(e.message.includes('JSON') ? e.message : 'Texto colado não é um JSON válido.', 'bad'); } };
