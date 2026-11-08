/* PitWall 0.8.5 — núcleo compartilhado dos protótipos de interface.
   Dados: uma carreira real rodada pelo motor do jogo (McLaren, temporada 2028, após a 8ª etapa). */
(function () {
'use strict';
const D = window.D;
const IMG = 'assets/img/';

/* ---------- índices ---------- */
const TM = {}; D.teams.forEach(t => TM[t.id] = t);
const DR = {}; [...D.drivers, ...D.freeAgents].forEach(d => DR[d.id] = d);
const PT = TM[D.meta.team];
const HD = {}; (D.hist.drivers || []).forEach(d => HD[d.id] = d);

/* ---------- formatação ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (v, d = 0) => (v == null || isNaN(v)) ? '—' : (+v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (v, d = 1) => v == null ? '—' : `US$ ${nf(v, Math.abs(v) >= 100 ? 0 : d)} mi`;
const moneyS = (v) => v == null ? '—' : `${v < 0 ? '−' : '+'}${nf(Math.abs(v), 1)}`;
const lap = (t) => { if (t == null) return '—'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(3).padStart(6, '0')}`; };
const gap = (g) => g == null ? '—' : `+${g.toFixed(3)}`;
const pretty = (id) => String(id || '').replace(/^c-/, '').split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_L = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dateS = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${+d} ${MONTHS[+m - 1]}`; };

/* ---------- pessoas e equipes ---------- */
const drv = (id) => DR[id] || null;
const dname = (id) => DR[id] ? DR[id].name : HD[id] ? HD[id].name : pretty(id);
const dlast = (id) => DR[id] ? (DR[id].last || DR[id].name) : dname(id).split(' ').slice(-1)[0];
const dabbr = (id) => DR[id] && DR[id].abbr ? DR[id].abbr : dlast(id).slice(0, 3).toUpperCase();
const team = (id) => TM[id] || null;
const tcol = (id) => TM[id] ? TM[id].color : '#888';
const tname = (id) => TM[id] ? TM[id].name : pretty(id);
const flagUrl = (nat) => D.FLAG[nat] ? `assets/flags/${D.FLAG[nat]}.svg` : null;
const flag = (nat, cls = 'flag') => { const u = flagUrl(nat); return u ? `<img class="${cls}" src="${u}" alt="${esc(nat)}">` : `<span class="${cls} noflag">${esc(nat || '')}</span>`; };
const faceUrl = (d) => d && (d.face || d.img) ? IMG + (d.face || d.img) : null;
const initials = (n) => String(n || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const logoUrl = (t) => t && t.logo ? IMG + t.logo : null;
const heroUrl = (id) => (window.TIMGS || []).includes(id + '-hero') ? `${IMG}tracks/${id}-hero.webp` : null;
const carUrl = (t) => t && t.carImg ? IMG + t.carImg : null;
const sponsorLogo = (n) => D.logos['sponsors:' + n] ? IMG + D.logos['sponsors:' + n] : null;
const mediaLogo = (n) => D.logos['media:' + n] ? IMG + D.logos['media:' + n] : null;
const OUTLET = { racefans: 'RaceFans', therace: 'The Race', sky: 'Sky Sports F1', speedcafe: 'Speedcafe', motorsport: 'Motorsport.com', bild: 'Bild', planetf1: 'PlanetF1', telegraaf: 'De Telegraaf', f1: 'Formula1.com', bbc: 'BBC Sport', gazzetta: 'La Gazzetta dello Sport', autosport: 'Autosport', fia: 'FIA', ams: 'Auto Motor und Sport', crash: 'Crash.net', marca: 'Marca', as: 'AS', ole: 'Olé' };
const ROLE = { principal: 'Chefe de equipe', sporting: 'Diretor esportivo', technical: 'Diretor técnico', engineeringDir: 'Diretor de engenharia', chiefEngineer: 'Engenheiro-chefe', raceEng1: 'Engenheiro de corrida (carro 1)', raceEng2: 'Engenheiro de corrida (carro 2)', performance: 'Engenheiro de desempenho', aero: 'Chefe de aerodinâmica', strategy: 'Chefe de estratégia', chiefMechanic: 'Chefe dos mecânicos', operations: 'Diretor de operações', commercial: 'Diretor comercial', marketing: 'Diretor de marketing' };
const ATTR = { pace: 'Ritmo', qualifying: 'Classificação', racecraft: 'Corrida', consistency: 'Consistência', tyre: 'Pneus', wet: 'Chuva', overtaking: 'Ultrapassagem', defending: 'Defesa', start: 'Largada', energy: 'Energia', adaptability: 'Adaptação', concentration: 'Concentração', feedback: 'Retorno técnico' };
const ATTR_GROUPS = [['Velocidade', ['pace', 'qualifying', 'wet']], ['Corrida', ['racecraft', 'overtaking', 'defending', 'start']], ['Gestão', ['tyre', 'energy', 'consistency', 'concentration']], ['Técnica', ['adaptability', 'feedback']]];
const STYLE = { qualifier: 'Rápido em uma volta', racer: 'Piloto de corrida', manager: 'Gestor de pneus', wet: 'Especialista na chuva', allround: 'Completo', aggressive: 'Agressivo', smooth: 'Estilo suave' };
const CAR = { aero: 'Aerodinâmica', chassis: 'Chassi', reliability: 'Confiabilidade', tyreCare: 'Gestão de pneus', cooling: 'Refrigeração', energy: 'Eficiência energética' };
const TYRE = { S: ['Macio', 'soft'], M: ['Médio', 'med'], H: ['Duro', 'hard'], I: ['Intermediário', 'inter'], W: ['Chuva', 'wet'] };
const NEWS_TAG = { regulamento: 'Regulamento', paddock: 'Paddock', corrida: 'Corrida', rumor: 'Rumor', mercado: 'Mercado', categorias: 'Categorias de base', escandalo: 'Escândalo', 'técnica': 'Técnica', tecnica: 'Técnica', campeonato: 'Campeonato' };
const INBOX_TAG = { regs: 'Regulamento', dev: 'Desenvolvimento', team: 'Equipe', media: 'Imprensa', fia: 'FIA', money: 'Finanças', board: 'Diretoria' };
const LOG_T = { aposentadoria: 'Aposentadoria', regulamento: 'Regulamento', corrida: 'Corrida', pd: 'P&D', decisao: 'Decisão', contrato: 'Contrato', memoria: 'Memória', categorias: 'Categorias', titulo: 'Título', financas: 'Finanças', rescisao: 'Rescisão', staff: 'Funcionários', patrocinio: 'Patrocínio', escandalo: 'Escândalo', equipe: 'Equipe' };
const OWNER_T = { fundo: 'Fundo de investimento', familia: 'Família', montadora: 'Montadora', bilionario: 'Bilionário', empresa: 'Empresa', consorcio: 'Consórcio', fabricante: 'Fabricante' };

/* faixa de cor de um atributo de 0 a 100 */
const tone = (v) => v >= 88 ? 'elite' : v >= 82 ? 'hi' : v >= 75 ? 'mid' : v >= 68 ? 'lo' : 'bad';
const toneCond = (v) => v >= 85 ? 'hi' : v >= 72 ? 'mid' : 'lo';

/* ---------- traçado ---------- */
const trackPath = (shape, w = 100, h = 100, pad = 6) => {
  if (!shape || !shape.length) return '';
  const xs = shape.map(p => p[0]), ys = shape.map(p => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const s = Math.min((w - 2 * pad) / (maxx - minx || 1), (h - 2 * pad) / (maxy - miny || 1));
  const ox = (w - (maxx - minx) * s) / 2, oy = (h - (maxy - miny) * s) / 2;
  const pts = shape.map(p => [ox + (p[0] - minx) * s, oy + (p[1] - miny) * s]);
  return { d: 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z', pts };
};
const trackSvg = (shape, opts = {}) => {
  const w = opts.w || 200, h = opts.h || 140; const p = trackPath(shape, w, h, opts.pad || 8);
  if (!p) return '';
  return `<svg class="${opts.cls || 'trk'}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${p.d}" class="trk-o"/><path d="${p.d}" class="trk-i"/>${opts.start ? `<circle cx="${p.pts[0][0]}" cy="${p.pts[0][1]}" r="3" class="trk-s"/>` : ''}</svg>`;
};
/* ponto ao longo do traçado (0..1) */
const along = (pts, f) => {
  if (!pts || !pts.length) return [0, 0];
  const seg = []; let tot = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(l); tot += l; }
  let t = ((f % 1) + 1) % 1 * tot;
  for (let i = 0; i < pts.length; i++) { if (t <= seg[i]) { const a = pts[i], b = pts[(i + 1) % pts.length]; const k = seg[i] ? t / seg[i] : 0; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } t -= seg[i]; }
  return pts[0];
};

/* ---------- dados derivados ---------- */
const cal = D.calendar; cal.forEach(c => { if (c.date) c.date = D.meta.year + c.date.slice(4); });
const clean = (s) => String(s == null ? '' : s).replace(/\{\{[^|}]*\|([^}]*)\}\}/g, '$1');
[...D.drivers, ...D.freeAgents].forEach(d => (d.real || []).forEach(r => { r[2] = clean(r[2]); }));
const nextGP = cal.find(c => !c.done) || cal[cal.length - 1];
const lastGP = [...cal].reverse().find(c => c.done);
const myDrivers = PT.lineup.map(drv).filter(Boolean);
const standDRows = D.standD.map((s, i) => ({ ...s, pos: i + 1, d: drv(s.did), tid: drv(s.did) ? drv(s.did).team : null }));
const standCRows = D.standC.map((s, i) => ({ ...s, pos: i + 1, t: team(s.tid) }));
const myCPos = standCRows.find(r => r.tid === PT.id);
const leaderPts = standDRows[0] ? standDRows[0].pts : 0;
const formOf = (did) => (D.matrix[did] || []).slice(-5);
const cashSeries = (() => { let b = D.finances.balance; const L = D.finances.ledger.slice().reverse(); const out = [b]; for (const e of L.slice(0, 40)) { b -= e.amount; out.push(b); } return out.reverse(); })();
const unread = D.inbox.filter(m => !m.read);
const pending = D.inbox.filter(m => m.choices && m.choices.length && !m.read);
const capRoom = D.meta.capRoom;

/* tempo real da corrida (ao vivo): intervalo para o carro da frente */
const liveCars = D.live.cars.map((c, i, a) => ({ ...c, d: drv(c.did), gapLead: c.T - a[0].T, int: i ? c.T - a[i - 1].T : 0 }));

/* ---------- catálogo de telas ---------- */
const AREAS = [
  ['inicio', 'Início'], ['corrida', 'Corrida'], ['equipe', 'Equipe'], ['carro', 'Carro'], ['fabrica', 'Fábrica'],
  ['mercado', 'Mercado'], ['financas', 'Finanças'], ['mundo', 'Mundo'], ['arquivo', 'Arquivo'], ['sistema', 'Sistema'],
];
const SCREENS = [
  ['inicio', 'hub', 'Central', 'Próxima etapa, decisões pendentes, pilotos, campeonato, caixa e diretoria num só lugar.'],
  ['inicio', 'inbox', 'Caixa de entrada', 'Mensagens por área, com filtros, prioridade e resposta direto na lista.'],
  ['inicio', 'decision', 'Decisão pendente', 'Mensagem que pede escolha: opções lado a lado, custo, risco e quem recomenda o quê.'],
  ['inicio', 'calendar', 'Calendário', 'Mês a mês: GPs, categorias de base, Conselho, obras, prazos do mercado e peças novas.'],
  ['corrida', 'weekend', 'Fim de semana', 'Programação das sessões, previsão do tempo hora a hora, pneus disponíveis e objetivos.'],
  ['corrida', 'practice', 'Treino livre e acerto', 'Acerto visual do carro, retorno do piloto, programas de treino e tempos da sessão.'],
  ['corrida', 'quali', 'Classificação', 'Q1, Q2 e Q3 ao vivo, com corte, setores e decisão de quando ir para a pista.'],
  ['corrida', 'strategy', 'Estratégia', 'Plano de paradas por piloto, pneus de largada, janelas e simulação de alternativas.'],
  ['corrida', 'race', 'Corrida ao vivo', 'Torre de transmissão, mapa com os carros, comandos de pneu, energia e box, rádio e direção de prova.'],
  ['corrida', 'podium', 'Pódio', 'Cena de pódio em tela cheia com os três primeiros, cores das equipes e manchete.'],
  ['corrida', 'post', 'Pós-corrida', 'Resultado completo, resumo da sua corrida, pontos, reação da diretoria e destaques.'],
  ['corrida', 'analysis', 'Análise de dados', 'Gráfico de posições volta a volta, ritmo, stints de pneus e paradas.'],
  ['equipe', 'drivers', 'Pilotos', 'Seus titulares e reservas em cartões, com forma, contrato, moral e comparação direta.'],
  ['equipe', 'driver', 'Ficha do piloto', 'Página própria: nota, potencial estimado, atributos por grupo, carreira real e simulada, contrato.'],
  ['equipe', 'staff', 'Funcionários', 'Organograma da equipe técnica e esportiva, com nota, salário, contrato e efeito de cada cargo.'],
  ['equipe', 'academy', 'Academia', 'Pilotos da base, categoria onde correm, evolução, contrato e sugestão do próximo passo.'],
  ['equipe', 'scout', 'Olheiros', 'Departamento de olheiros: missões por região ou categoria, relatórios e nível estimado.'],
  ['equipe', 'sister', 'Equipe irmã e parcerias', 'Acordos técnicos, peças compartilhadas e pilotos emprestados entre equipes.'],
  ['carro', 'car', 'Carro', 'Atributos do carro comparados ao grid, ponto forte e fraco, motor e confiabilidade.'],
  ['carro', 'rnd', 'Projetos de P&D', 'Planta do carro com as peças, projetos em andamento como linha do tempo, túnel e CFD.'],
  ['carro', 'newproject', 'Novo projeto', 'Configuração de um projeto: peça, foco, ambição, horas de túnel e CFD, com previsão.'],
  ['carro', 'regs', 'Regulamento', 'Regras desta temporada e da próxima, mudanças aprovadas e impacto estimado na sua equipe.'],
  ['fabrica', 'facilities', 'Sede e fábrica', 'Campus com os 12 prédios: nível, estado, obras, manutenção e comparação com o grid.'],
  ['mercado', 'market', 'Mercado de pilotos', 'Busca com filtros, contratos que vencem, valor de mercado e lista de observação.'],
  ['mercado', 'negotiation', 'Negociação', 'Proposta de contrato: salário, anos, cláusulas, bônus, papel e resposta do empresário.'],
  ['mercado', 'staffmarket', 'Mercado de funcionários', 'Profissionais disponíveis por cargo, comparados com quem ocupa a vaga hoje.'],
  ['financas', 'finance', 'Finanças', 'Caixa, receitas e despesas da temporada, teto orçamentário e projeção do ano.'],
  ['financas', 'sponsors', 'Patrocinadores', 'Contratos, valor por corrida, objetivos, satisfação e novas propostas.'],
  ['financas', 'board', 'Diretoria e dono', 'Confiança, meta da temporada, perfil do dono, valor da equipe e risco de venda.'],
  ['mundo', 'standings', 'Classificação', 'Pilotos e construtores, com matriz de resultados por GP e tendência.'],
  ['mundo', 'paddock', 'Equipes do grid', 'Comparativo das 11 equipes: carro, motor, orçamento, dono e forma.'],
  ['mundo', 'teampage', 'Página da equipe', 'História, linhagem, títulos, pilotos, carro, dono e patrocinadores de qualquer equipe.'],
  ['mundo', 'owners', 'Donos e equipes', 'Valor de mercado, humor dos donos, vendas, candidatas a entrar e regras de proteção.'],
  ['mundo', 'manufacturers', 'Fabricantes', 'Motores (força, confiabilidade, clientes e contratos) e fornecedoras de pneus.'],
  ['mundo', 'council', 'Conselho da FIA', 'Votação aberta com placar, posição de cada equipe, blocos e concessões.'],
  ['mundo', 'news', 'Notícias', 'Portal com manchetes, veículos reais, filtros por tema e repercussão.'],
  ['mundo', 'social', 'Redes sociais', 'Feed com pilotos, equipes e jornalistas, curtidas e repercussão.'],
  ['mundo', 'cases', 'Escândalos e investigações', 'Casos abertos, etapa da investigação, envolvidos e consequências.'],
  ['mundo', 'cats', 'Outras categorias', 'F2, F3, IndyCar, Fórmula E e as demais: líderes, calendário e pilotos para observar.'],
  ['mundo', 'circuits', 'Circuitos e licenças', 'Mapa dos circuitos, grau FIA, validade da licença e contratos de GP.'],
  ['mundo', 'circuit', 'Página do circuito', 'Traçado, características, recordes, vencedores e clima típico.'],
  ['mundo', 'log', 'Registro do universo', 'Linha do tempo de tudo que aconteceu: contratos, obras, regras, títulos.'],
  ['arquivo', 'career', 'Minha carreira', 'Suas temporadas, metas, resultados, títulos e momentos marcantes.'],
  ['arquivo', 'seasons', 'Temporadas desde 1950', 'Campeões e classificações de todas as temporadas, reais e simuladas.'],
  ['arquivo', 'hall', 'Hall da Fama', 'Maiores pilotos e equipes da história, com números da carreira.'],
  ['arquivo', 'records', 'Recordes', 'Recordes de volta e de classificação por circuito e marcas históricas.'],
  ['sistema', 'title', 'Tela inicial', 'Abertura do jogo: continuar, nova carreira, carregar e opções.'],
  ['sistema', 'newcareer', 'Nova carreira', 'Escolha do modo, da equipe (do grid, candidata ou criada) e das regras do universo.'],
  ['sistema', 'teamsetup', 'Montagem da equipe', 'Para equipe nova: escolha de pilotos, chefe e diretores antes da primeira corrida.'],
  ['sistema', 'seasonend', 'Fim de temporada', 'Campeões, premiação, avaliação da diretoria e resumo do ano.'],
  ['sistema', 'options', 'Salvar e opções', 'Saves, idioma, eventos do universo por tipo, áudio, acessibilidade e escala.'],
  ['sistema', 'editor', 'Editor da base', 'Edição de equipes, pilotos, circuitos, calendário e categorias.'],
  ['sistema', 'account', 'Perfil e ativação', 'Perfil do jogador, ativação da cópia e dados da conta.'],
  ['sistema', 'diag', 'Diagnóstico', 'Verificações do universo, desempenho e registro de erros.'],
  ['sistema', 'search', 'Busca rápida', 'Ctrl+K: abrir qualquer tela, piloto, equipe ou circuito digitando.'],
];
const SC = {}; SCREENS.forEach((s, i) => SC[s[1]] = { area: s[0], id: s[1], title: s[2], desc: s[3], n: i + 1 });

/* ---------- aplicação ---------- */
const P = {};           // propostas registradas: P.a, P.b
const App = { cur: 'a', screen: 'hub', params: {}, P };
const code = (prop, id) => `${prop.toUpperCase()}-${String(SC[id].n).padStart(2, '0')}`;

function render() {
  const prop = P[App.cur]; if (!prop) return;
  const host = document.getElementById('game');
  host.className = 'game prop-' + App.cur + ' sc-' + App.screen;
  let html = '';
  try { html = prop.render(App.screen, App.params); }
  catch (e) { html = `<div style="padding:40px;color:#f66;font:14px monospace">Erro ao desenhar ${esc(App.screen)}: ${esc(e.message)}<br>${esc(e.stack)}</div>`; console.error(e); }
  host.innerHTML = html;
  host.scrollTop = 0;
  document.querySelectorAll('.rv-prop button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === App.cur));
  const sel = document.getElementById('rv-screen'); if (sel) sel.value = App.screen;
  const lab = document.getElementById('rv-code'); if (lab) lab.textContent = code(App.cur, App.screen);
  const dsc = document.getElementById('rv-desc'); if (dsc) dsc.textContent = SC[App.screen].desc;
  if (prop.after) try { prop.after(App.screen, host); } catch (e) { console.error(e); }
  fit();
}
function go(id, params) {
  if (!SC[id]) id = 'hub';
  App.screen = id; App.params = params || {};
  const h = `${App.cur}-${id}`; if (location.hash.slice(1) !== h) history.replaceState(null, '', '#' + h);
  render();
}
function fromHash() {
  const h = location.hash.slice(1); const m = /^([ab])-([a-z]+)$/.exec(h);
  if (m && SC[m[2]]) { App.cur = m[1]; App.screen = m[2]; }
}
/* palco: o jogo é desenhado em 1440×900 e escalado para caber */
function fit() {
  const st = document.getElementById('stage'), g = document.getElementById('frame'); if (!st || !g) return;
  const w = st.clientWidth, h = window.innerHeight - st.getBoundingClientRect().top - 12;
  const s = Math.min(w / 1440, Math.max(h, 300) / 900);
  g.style.transform = `scale(${s})`; st.style.height = (900 * s) + 'px'; g.style.left = Math.max(0, (w - 1440 * s) / 2) + 'px';
}

/* cliques: data-go="tela" e data-p='{"id":...}' */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-go]');
  if (a) { e.preventDefault(); let p = {}; try { p = a.dataset.p ? JSON.parse(a.dataset.p) : {}; } catch (x) { /* sem parâmetros */ } go(a.dataset.go, p); return; }
  const t = e.target.closest('[data-tab]');
  if (t) { e.preventDefault(); App.params = { ...App.params, [t.dataset.tk || 'tab']: t.dataset.tab }; render(); return; }
  const sg = e.target.closest('.seg button');
  if (sg) { sg.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === sg)); return; }
  const pb = e.target.closest('.rv-prop button');
  if (pb) { App.cur = pb.dataset.p; go(App.screen, App.params); return; }
  if (e.target.closest('#rv-prev') || e.target.closest('#rv-next')) {
    const i = SCREENS.findIndex(s => s[1] === App.screen); const n = e.target.closest('#rv-prev') ? i - 1 : i + 1;
    go(SCREENS[(n + SCREENS.length) % SCREENS.length][1]); return;
  }
  if (e.target.closest('#rv-map')) { openMap(); return; }
  if (e.target.closest('[data-close-map]')) { document.getElementById('map').hidden = true; return; }
  const sw = e.target.closest('[data-map]');
  if (sw) { const [p, id] = sw.dataset.map.split(':'); App.cur = p; document.getElementById('map').hidden = true; go(id); }
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); go('search'); }
  if (e.key === 'Escape') { const m = document.getElementById('map'); if (m && !m.hidden) m.hidden = true; }
});
function openMap() {
  const m = document.getElementById('map');
  const col = (p) => AREAS.map(([a, an]) => `<div class="mp-area"><h4>${an}</h4>${SCREENS.filter(s => s[0] === a).map(s => `<button type="button" data-map="${p}:${s[1]}" class="${p === App.cur && s[1] === App.screen ? 'on' : ''}"><code>${code(p, s[1])}</code><span><b>${esc(s[2])}</b><small>${esc(s[3])}</small></span></button>`).join('')}</div>`).join('');
  m.querySelector('.mp-body').innerHTML = `<div class="mp-cols">${['a', 'b'].map(p => `<section><h3>${p === 'a' ? 'Proposta A · Transmissão' : 'Proposta B · Paddock'}</h3>${col(p)}</section>`).join('')}</div>`;
  m.hidden = false;
}
function boot() {
  const sel = document.getElementById('rv-screen');
  sel.innerHTML = AREAS.map(([a, an]) => `<optgroup label="${an}">${SCREENS.filter(s => s[0] === a).map(s => `<option value="${s[1]}">${esc(s[2])}</option>`).join('')}</optgroup>`).join('');
  sel.addEventListener('change', () => go(sel.value));
  fromHash(); render();
  window.addEventListener('hashchange', () => { fromHash(); render(); });
  window.addEventListener('resize', fit);
}

/* ---------- conteúdo base das telas (cada proposta tem seu kit de componentes) ---------- */
const BASE = {};
window.PW = { D, TM, DR, PT, HD, esc, nf, money, moneyS, lap, gap, pretty, dateS, MONTHS, MONTHS_L, drv, dname, dlast, dabbr, team, tcol, tname, flag, flagUrl, faceUrl, initials, logoUrl, carUrl, heroUrl, sponsorLogo, mediaLogo, OUTLET, ROLE, ATTR, ATTR_GROUPS, STYLE, CAR, TYRE, NEWS_TAG, INBOX_TAG, LOG_T, OWNER_T, tone, toneCond, trackPath, trackSvg, along, cal, nextGP, lastGP, myDrivers, standDRows, standCRows, myCPos, leaderPts, formOf, cashSeries, unread, pending, capRoom, liveCars, AREAS, SCREENS, SC, App, P, go, render, boot, code, BASE, IMG };
})();
