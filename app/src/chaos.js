/* ============================================================
   PIT WALL — eventos fora da pista, escândalos e consequências (V0.8.4)
   - Frequência geral: Baixa, Normal ou Alta.
   - Nível por grupo (Desligado, Raro, Normal, Novela, Caos):
     escândalos, conflitos, lesões e doenças, operação, negócios.
   - Acidentes graves e fatais: sempre ligados, com probabilidade
     realista pela categoria e pela época (segurança melhora com o tempo).
   - Pessoas e organizações reais podem ser citadas (opção ligada por
     padrão, a pedido do dono do jogo: a versão comercial será toda
     fictícia). Exceção: o escândalo de extremismo usa sempre personagens
     fictícios. Todo caso com pessoa real leva a marca "ficção do jogo".
   - Cada escândalo tem ocorrência, descoberta (ou acobertamento),
     investigação, veredito e consequências em cadeia (patrocinador,
     multa, pontos, suspensão, saída de funcionário, humor do dono).
   - Quando atinge a equipe do jogador, há decisões (cooperar, defender,
     demitir) que mudam o veredito.
   Usa RNG local com a semente da carreira.
   ============================================================ */
'use strict';

const Chaos = {};
Chaos.GROUPS = {
  escandalos: ['Escândalos', 'Scandals'], conflitos: ['Conflitos internos', 'Internal conflicts'], lesoes: ['Lesões e saúde', 'Injuries and health'],
  operacao: ['Operação e logística', 'Operations and logistics'], negocios: ['Negócios e patrocínio', 'Business and sponsorship'],
  midia: ['Imprensa e redes sociais', 'Press and social media'], leves: ['Bastidores e curiosidades', 'Behind the scenes and trivia'],
};
Chaos.LEVELS = [['Desligado', 'Off', 0], ['Raro', 'Rare', 0.4], ['Normal', 'Normal', 1], ['Novela', 'Soap opera', 1.9], ['Caos', 'Chaos', 3.2]];
Chaos.FREQ = { baixa: ['Baixa', 'Low', 0.55], normal: ['Normal', 'Normal', 1], alta: ['Alta', 'High', 1.7] };
/* chance por etapa de algo acontecer em cada grupo (frequência e nível normais) */
/* calibrado em 08/11/2026: escândalo virou raro (~0,4 por temporada); o dia a dia do paddock (bastidores, imprensa,
   operação, negócios) acontece quase toda semana, com efeitos pequenos */
Chaos.BASE = { escandalos: 0.018, conflitos: 0.045, operacao: 0.07, negocios: 0.06, midia: 0.25, leves: 0.32, lesoes: 0.05 };
Chaos.defaults = () => ({ freq: 'normal', levels: { escandalos: 2, conflitos: 2, lesoes: 2, operacao: 2, negocios: 2, midia: 2, leves: 2 }, realPeople: true });
Chaos.opts = (G) => {
  G.options = G.options || {};
  if (!G.options.chaos) {
    const er = G.options.eventRate ?? 1;
    G.options.chaos = { ...Chaos.defaults(), freq: er < 0.8 ? 'baixa' : er > 1.3 ? 'alta' : 'normal' };
  }
  const o = G.options.chaos;
  o.levels = { ...Chaos.defaults().levels, ...(o.levels || {}) };
  if (o.realPeople == null) o.realPeople = true;
  G.options.eventRate = Chaos.FREQ[o.freq] ? Chaos.FREQ[o.freq][2] : 1;   // decisões entre corridas (events.js)
  return o;
};
Chaos.mult = (G, g) => { const o = Chaos.opts(G); return (Chaos.FREQ[o.freq] || Chaos.FREQ.normal)[2] * Chaos.LEVELS[o.levels[g] ?? 2][2]; };
Chaos.state = (G) => (G.chaos = G.chaos || { cases: [], hidden: [], last: {}, log: [], seq: 0 });
Chaos.real = (G) => Chaos.opts(G).realPeople !== false;
const CH_FICT = () => byLang(' (Ficção do jogo: este caso não aconteceu na vida real.)', ' (Game fiction: this case never happened in real life.)');
Chaos.mine = (G, t) => !!t && !Career.isObs(G) && t.id === G.player.teamId;
Chaos.log = (G, k, g, extra) => { const S = Chaos.state(G); S.log.unshift({ y: G.season.year, r: G.season.round, k, g, ...(extra || {}) }); if (S.log.length > 300) S.log.length = 300; };

/* ---------- escolhas de pessoas ---------- */
Chaos.drivers = (G, tid) => G.db.drivers.filter(d => d.team && d.seat !== 'R' && !d.retired && !d.dead && (!tid || d.team === tid));
Chaos.pickDriver = (G, r, tid, opt) => {
  const ds = Chaos.drivers(G, tid).filter(d => (Chaos.real(G) && !(opt && opt.fict)) || d.regen);
  return ds.length ? ds[Math.floor(r() * ds.length)] : null;
};
Chaos.pickStaff = (G, r, t, roles, opt) => {
  const fict = !Chaos.real(G) || (opt && opt.fict);
  const ss = (t.staffList || []).filter(s => !s.isPlayer && (!roles || roles.includes(s.role)) && (!fict || !s.real));
  return ss.length ? ss[Math.floor(r() * ss.length)] : null;
};
Chaos.person = (G, t, r) => Staff.genName(t ? t.country : null);
Chaos.roleName = (s) => (Staff.ROLES[s.role] ? Staff.ROLES[s.role].name.toLowerCase() : s.role);
Chaos.teamPick = (G, r, f) => { const ts = G.db.teams.filter(f || (() => true)); return ts.length ? ts[Math.floor(r() * ts.length)] : null; };
/* tira um funcionário da equipe e põe um interino */
Chaos.removeStaff = (G, t, s, toTeam) => {
  t.staffList = (t.staffList || []).filter(x => x !== s);
  const repl = { id: Career.nextId(G, 'sf'), role: s.role, name: Staff.genName(t.country), real: false, rating: Math.round(clamp(s.rating - 7, 55, 86)), until: G.season.year + 1, since: G.season.year, interim: true };
  repl.salary = Staff.salaryFor(s.role, repl.rating); t.staffList.push(repl); Staff.derive(t);
  if (toTeam) { const old = (toTeam.staffList || []).find(x => x.role === s.role && !x.isPlayer); if (old && old.rating < s.rating) { toTeam.staffList = toTeam.staffList.filter(x => x !== old); s.gardening = G.season.year + 1; toTeam.staffList.push(s); Staff.derive(toTeam); } }
};
/* consequências em dinheiro, reputação, patrocínio e dono */
Chaos.fine = (G, t, v, desc) => { if (Chaos.mine(G, t)) Career.ledger(G, desc, -v, 'multa'); else t.cash = +((t.cash || 0) - v).toFixed(2); };
Chaos.hitTeam = (G, t, o) => {
  if (o.rep) t.reputation = clamp(t.reputation - o.rep, 30, 99);
  if (o.mood && t.ownerMood != null) t.ownerMood = clamp(t.ownerMood - o.mood, 0, 100);
  if (o.debt) t.debt = +((t.debt || 0) + o.debt).toFixed(1);
  if (o.sponsor) {
    if (Chaos.mine(G, t)) { (G.sponsors || []).forEach(s => (s.satisfaction = clamp(s.satisfaction - o.sponsor * 6, 0, 100))); const sp = (G.sponsors || []).slice().sort((a, b) => a.satisfaction - b.satisfaction)[0]; if (sp && sp.satisfaction < 35 && o.sponsor >= 2) { G.sponsors = G.sponsors.filter(x => x !== sp); Career.mail(G, { from: byLang('Comercial', 'Commercial'), tag: 'money', important: true, title: byLang(`${sp.name} rompe o contrato`, `${sp.name} terminates the deal`), body: byLang('O patrocinador usou a cláusula de imagem e encerrou a parceria por causa do caso.', 'The sponsor invoked the image clause and ended the partnership over the case.') }); } }
    else if ((t.sponsors || []).length > 1 && o.sponsor >= 2) { const gone = t.sponsors.pop(); Career.news(G, byLang(`${gone} encerra o patrocínio da ${t.name} depois do caso`, `${gone} ends its ${t.name} sponsorship after the case`), 'mercado', '', { tm: [t.id] }); }
  }
};
Chaos.removePoints = (G, t, pts) => { const s = G.season; const cut = Math.min(pts, s.standC[t.id] || 0); s.standC[t.id] = (s.standC[t.id] || 0) - cut; s.penC = s.penC || {}; s.penC[t.id] = (s.penC[t.id] || 0) + cut; };

/* ---------- catálogo ---------- */
/* cada evento: g (grupo), w (peso), sev (1 a 5), cool (anos sem repetir), hidden (escândalo descoberto depois), make(G, r) → caso ou null */
Chaos.EV = [];
const CE = (e) => Chaos.EV.push(e);

/* --- escândalos --- */
CE({ k: 'manipulacao', g: 'escandalos', w: 0.45, sev: 5, cool: 10, hidden: true, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null;
  const d = Chaos.pickDriver(G, r, t.id); const s = Chaos.pickStaff(G, r, t, ['principal', 'sporting']); if (!d) return null;
  const sName = s ? s.name : Chaos.person(G, t, r);
  return { tid: t.id, did: d.id, sid: s && s.id, real: !d.regen || !!(s && s.real),
    title: byLang(`Manipulação de resultado: FIA investiga a ${t.name}`, `Race-fixing: FIA investigates ${t.name}`),
    body: byLang(`Documentos indicam que ${sName} teria pedido a ${d.name} uma batida proposital para provocar o Safety Car e favorecer o outro carro da equipe. O piloto nega ter agido de propósito.`, `Documents suggest ${sName} asked ${d.name} to crash on purpose to trigger the Safety Car and help the team’s other car. The driver denies acting deliberately.`) };
}, verdict: (G, c, t, r, guilty) => {
  if (!guilty) return byLang('A FIA não encontrou provas suficientes e arquivou o caso.', 'The FIA found insufficient evidence and closed the case.');
  const s = (t.staffList || []).find(x => x.id === c.sid);
  if (s && !s.isPlayer) Chaos.removeStaff(G, t, s);
  Chaos.fine(G, t, 25, byLang('Multa da FIA (manipulação de resultado)', 'FIA fine (race-fixing)'));
  Chaos.hitTeam(G, t, { rep: 5, mood: 25, sponsor: 3 });
  const d = Career.driver(G, c.did); if (d) { d.popularity = clamp((d.popularity || 40) - 20, 0, 100); d.morale = clamp((d.morale ?? 70) - 20, 1, 100); }
  return byLang(`Culpada. Multa de ${fmtMoney(25)}, desclassificação suspensa por dois anos${s ? ` e banimento de ${s.name}` : ''}. Patrocinadores revêem os contratos.`, `Guilty. ${fmtMoney(25)} fine, a two-year suspended disqualification${s ? ` and a ban for ${s.name}` : ''}. Sponsors review their contracts.`);
} });
CE({ k: 'espionagem', g: 'escandalos', w: 0.55, sev: 5, cool: 8, hidden: true, make: (G, r) => {
  const t = Chaos.teamPick(G, r); const v = Chaos.teamPick(G, r, x => x !== t); if (!t || !v) return null;
  const s = Chaos.pickStaff(G, r, t, ['technical', 'aero', 'engineeringDir', 'chiefEngineer']);
  const who = s ? s.name : Chaos.person(G, t, r);
  return { tid: t.id, vid: v.id, sid: s && s.id, real: !!(s && s.real),
    title: byLang(`Espionagem: ${t.name} teria projetos da ${v.name}`, `Spygate: ${t.name} allegedly held ${v.name} designs`),
    body: byLang(`Um dossiê com centenas de páginas de projetos da ${v.name} foi encontrado com ${who}${s ? `, ${Chaos.roleName(s)} da ${t.name}` : ` (personagem fictício), engenheiro da ${t.name}`}. A FIA abriu investigação.`, `A dossier of hundreds of pages of ${v.name} designs was found with ${who}${s ? `, ${t.name}'s ${s.role}` : ` (fictional character), a ${t.name} engineer`}. The FIA has opened an investigation.`) };
}, verdict: (G, c, t, r, guilty) => {
  if (!guilty) return byLang('A FIA concluiu que a informação não chegou ao carro e aplicou só uma advertência.', 'The FIA concluded the information never reached the car and issued only a warning.');
  const big = r() < 0.25;
  const s = (t.staffList || []).find(x => x.id === c.sid); if (s && !s.isPlayer) Chaos.removeStaff(G, t, s);
  const fine = big ? 60 : 20;
  Chaos.fine(G, t, fine, byLang('Multa da FIA (espionagem)', 'FIA fine (espionage)'));
  if (big) { t.excludedC = G.season.year; G.season.standC[t.id] = 0; }
  t.car.aero = +(t.car.aero - 0.3).toFixed(2);
  Chaos.hitTeam(G, t, { rep: big ? 6 : 3, mood: big ? 30 : 15, sponsor: big ? 3 : 1 });
  return big ? byLang(`Culpada: multa de ${fmtMoney(fine)} e exclusão do Mundial de Construtores de ${G.season.year}. Os pilotos mantêm os pontos.`, `Guilty: ${fmtMoney(fine)} fine and exclusion from the ${G.season.year} Constructors' Championship. The drivers keep their points.`)
    : byLang(`Culpada: multa de ${fmtMoney(fine)} e inspeção dos projetos da equipe até o fim do ano.`, `Guilty: ${fmtMoney(fine)} fine and inspection of the team’s designs until the end of the year.`);
} });
CE({ k: 'vazamento', g: 'escandalos', w: 1, sev: 3, cool: 4, hidden: true, make: (G, r) => {
  const t = Chaos.teamPick(G, r); const v = Chaos.teamPick(G, r, x => x !== t && x.reputation >= t.reputation - 10); if (!t || !v) return null;
  const s = Chaos.pickStaff(G, r, t, ['aero', 'performance', 'chiefEngineer', 'raceEng1', 'raceEng2']);
  const who = s ? s.name : Chaos.person(G, t, r);
  return { tid: t.id, vid: v.id, sid: s && s.id, real: !!(s && s.real),
    title: byLang(`${t.name} acusa ex-engenheiro de levar dados para a ${v.name}`, `${t.name} accuses former engineer of taking data to ${v.name}`),
    body: byLang(`${who} teria copiado arquivos de aerodinâmica antes de aceitar uma proposta da ${v.name}. A ${t.name} foi à Justiça e a FIA acompanha o caso.`, `${who} allegedly copied aerodynamics files before accepting an offer from ${v.name}. ${t.name} has gone to court and the FIA is following the case.`) };
}, verdict: (G, c, t, r, guilty) => {
  const v = Career.team(G, c.vid);
  const s = (t.staffList || []).find(x => x.id === c.sid);
  if (s && !s.isPlayer) Chaos.removeStaff(G, t, s, v && !guilty ? v : null);
  t.car.aero = +(t.car.aero - 0.3).toFixed(2);
  if (guilty && v) { Chaos.fine(G, v, 5, byLang('Multa da FIA (uso de dados de outra equipe)', 'FIA fine (use of another team’s data)')); Chaos.hitTeam(G, v, { rep: 2, mood: 6 }); return byLang(`A ${v.name} admite que os arquivos circularam na fábrica e paga multa de ${fmtMoney(5)}. O engenheiro foi afastado.`, `${v.name} admits the files circulated at its factory and pays a ${fmtMoney(5)} fine. The engineer has been suspended.`); }
  return byLang(`Acordo fora dos tribunais: o engenheiro cumpre afastamento antes de começar na ${v ? v.name : 'nova equipe'}.`, `Out-of-court settlement: the engineer serves gardening leave before starting at ${v ? v.name : 'the new team'}.`);
} });
CE({ k: 'fraudeFinanceira', g: 'escandalos', w: 0.6, sev: 4, cool: 8, hidden: true, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null;
  const s = Chaos.pickStaff(G, r, t, ['commercial', 'operations']);
  const who = s ? s.name : Chaos.person(G, t, r);
  return { tid: t.id, sid: s && s.id, real: !!(s && s.real),
    title: byLang(`Fraude nas contas da ${t.name}: auditoria encontra rombo`, `Fraud in ${t.name}'s accounts: audit uncovers a hole`),
    body: byLang(`Uma auditoria interna encontrou contratos de fachada e desvio de dinheiro ligado a ${who}. A FIA investiga se o teto de gastos foi burlado.`, `An internal audit found sham contracts and diverted money linked to ${who}. The FIA is investigating whether the cost cap was circumvented.`) };
}, verdict: (G, c, t, r, guilty) => {
  const s = (t.staffList || []).find(x => x.id === c.sid); if (s && !s.isPlayer) Chaos.removeStaff(G, t, s);
  const hole = Math.round((t.budget || 200) * (0.1 + r() * 0.1));
  Chaos.hitTeam(G, t, { mood: 25, debt: hole, sponsor: 2, rep: 2 });
  if (guilty) { Chaos.fine(G, t, 10, byLang('Multa da FIA (contas irregulares)', 'FIA fine (irregular accounts)')); return byLang(`O rombo foi de ${fmtMoney(hole)}. A FIA multa a equipe em ${fmtMoney(10)} por irregularidade no teto. Os donos estão furiosos.`, `The hole was ${fmtMoney(hole)}. The FIA fines the team ${fmtMoney(10)} for cost-cap irregularities. The owners are furious.`); }
  return byLang(`O rombo foi de ${fmtMoney(hole)}, mas a FIA concluiu que o teto não foi burlado. O caso segue na Justiça comum.`, `The hole was ${fmtMoney(hole)}, but the FIA concluded the cap was not breached. The case continues in the civil courts.`);
} });
CE({ k: 'apostas', g: 'escandalos', w: 0.6, sev: 4, cool: 6, hidden: true, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null;
  const useD = r() < 0.45; const d = useD ? Chaos.pickDriver(G, r, t.id) : null; const s = !d ? Chaos.pickStaff(G, r, t) : null;
  const who = d ? d.name : s ? s.name : Chaos.person(G, t, r);
  return { tid: t.id, did: d && d.id, sid: s && s.id, real: d ? !d.regen : !!(s && s.real),
    title: byLang(`Apostas ilegais: ${who} é investigado`, `Illegal betting: ${who} under investigation`),
    body: byLang(`Registros de uma casa de apostas clandestina mostram apostas em resultados de corridas ligadas a ${who}${d ? '' : `, da ${t.name}`}.`, `Records from an illegal bookmaker show bets on race results linked to ${who}${d ? '' : ` of ${t.name}`}.`) };
}, verdict: (G, c, t, r, guilty) => {
  if (!guilty) return byLang('As apostas eram de terceiros que usaram o nome da pessoa. Caso arquivado.', 'The bets were placed by third parties using the person’s name. Case closed.');
  const d = c.did && Career.driver(G, c.did);
  if (d) { const n = 2 + Math.floor(r() * 4); d.injured = Math.max(d.injured || 0, n); d.injuryKind = 'suspensao'; d.popularity = clamp((d.popularity || 40) - 18, 0, 100); Chaos.hitTeam(G, t, { rep: 2, sponsor: 1 }); return byLang(`${d.name} é suspenso por ${n} GPs e multado. A equipe chama o reserva.`, `${d.name} is banned for ${n} GPs and fined. The team calls up its reserve.`); }
  const s = (t.staffList || []).find(x => x.id === c.sid); if (s && !s.isPlayer) Chaos.removeStaff(G, t, s);
  Chaos.hitTeam(G, t, { rep: 1 });
  return byLang('O funcionário foi banido do paddock e demitido.', 'The staff member was banned from the paddock and dismissed.');
} });
CE({ k: 'sabotagem', g: 'escandalos', w: 0.25, sev: 4, cool: 10, hidden: false, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null; const ds = Chaos.drivers(G, t.id); if (ds.length < 2) return null;
  const d = ds[Math.floor(r() * ds.length)];
  return { tid: t.id, did: d.id, real: !d.regen,
    title: byLang(`Sabotagem na ${t.name}: mecânico admite ter mexido no carro de ${d.name}`, `Sabotage at ${t.name}: mechanic admits tampering with ${d.name}'s car`),
    body: byLang(`Um mecânico (personagem fictício) confessou ter afrouxado uma peça no carro de ${d.name} depois de uma briga interna. A equipe demitiu o funcionário e chamou a polícia.`, `A mechanic (fictional character) confessed to loosening a part on ${d.name}'s car after an internal row. The team fired him and called the police.`) };
}, verdict: (G, c, t) => { t.pitCrew = clamp(t.pitCrew - 1, 30, 100); const d = Career.driver(G, c.did); if (d) d.morale = clamp((d.morale ?? 70) - 15, 1, 100); return byLang('A equipe revisou os procedimentos da garagem. O piloto diz que perdeu a confiança em parte da equipe.', 'The team reviewed its garage procedures. The driver says he has lost trust in part of the crew.'); } });
CE({ k: 'fraudeRegulamentar', g: 'escandalos', w: 0.9, sev: 4, cool: 5, hidden: true, make: (G, r) => {
  const t = Chaos.teamPick(G, r, x => x.reputation >= 55); if (!t) return null;
  const part = r() < 0.5 ? byLang('o fluxo de combustível do motor', 'the engine fuel flow') : r() < 0.5 ? byLang('a flexibilidade da asa dianteira', 'front wing flexibility') : byLang('o assoalho', 'the floor');
  return { tid: t.id, real: false, part,
    title: byLang(`Rivais denunciam a ${t.name}: suspeita sobre ${part}`, `Rivals report ${t.name}: suspicion over ${part}`),
    body: byLang(`Três equipes pediram esclarecimentos à FIA sobre ${part} do carro da ${t.name}. A FIA vai inspecionar o carro nas próximas etapas.`, `Three teams asked the FIA for clarification on ${part} of the ${t.name} car. The FIA will inspect the car at the coming races.`) };
}, verdict: (G, c, t, r, guilty) => {
  if (!guilty) return byLang('A inspeção não encontrou irregularidade. O carro está legal.', 'The inspection found nothing irregular. The car is legal.');
  t.car.aero = +(t.car.aero - 0.3).toFixed(2); t.car.chassis = +(t.car.chassis - 0.15).toFixed(2);
  if (r() < 0.45) {
    // como as desclassificações reais (Austin 2023): a equipe perde os pontos da última corrida
    const last = G.season.results[G.season.results.length - 1];
    const pts = last ? last.cls.filter(c => c.tid === t.id).reduce((a, c) => a + (c.pts || 0), 0) : 0;
    Chaos.removePoints(G, t, pts); Chaos.fine(G, t, 2, byLang('Multa da FIA (peça irregular)', 'FIA fine (illegal part)')); Chaos.hitTeam(G, t, { rep: 2, mood: 6 });
    return byLang(`Peça irregular: os carros da equipe são desclassificados da etapa de ${last ? last.gp : 'último GP'} (${pts ? pts + ' pontos a menos no Mundial de Construtores' : 'não tinham pontuado'}) e a peça precisa ser trocada.`, `Illegal part: the team's cars are disqualified from the ${last ? last.gp : 'last'} round (${pts ? pts + ' fewer Constructors\' points' : 'they had not scored'}) and the part must be changed.`);
  }
  Chaos.hitTeam(G, t, { rep: 2, mood: 6 });
  return byLang('Acordo confidencial com a FIA: a equipe muda a peça e não há punição pública. Os rivais protestam.', 'Confidential settlement with the FIA: the team changes the part and there is no public penalty. Rivals protest.');
} });
CE({ k: 'extremismo', g: 'escandalos', w: 0.12, sev: 5, cool: 15, hidden: false, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null;
  const who = Chaos.person(G, t, r);
  return { tid: t.id, real: false,
    title: byLang(`${t.name} demite funcionário por publicações extremistas`, `${t.name} sacks employee over extremist posts`),
    body: byLang(`${who} (personagem fictício), funcionário da área de logística, publicou mensagens de ódio nas redes. A equipe o demitiu no mesmo dia e a FIA condenou o caso.`, `${who} (fictional character), a logistics employee, posted hate messages online. The team fired him the same day and the FIA condemned the case.`) };
}, verdict: (G, c, t, r) => { const slow = r() < 0.3; Chaos.hitTeam(G, t, { rep: slow ? 3 : 1, sponsor: slow ? 2 : 1 }); return slow ? byLang('A demora em responder irritou os patrocinadores, que exigiram programa de conduta.', 'The slow response angered sponsors, who demanded a conduct programme.') : byLang('A resposta rápida da equipe foi elogiada; o caso foi encerrado.', 'The team’s swift response was praised; the case is closed.'); } });
CE({ k: 'tabloide', g: 'midia', w: 0.6, sev: 2, cool: 1, hidden: false, make: (G, r) => {
  const d = Chaos.pickDriver(G, r); if (!d) return null; const t = Career.team(G, d.team);
  const v = r() < 0.5;
  return { tid: t.id, did: d.id, real: !d.regen,
    title: v ? byLang(`Tabloides: ${d.name} é visto em festa na véspera do GP`, `Tabloids: ${d.name} spotted partying on the eve of the GP`) : byLang(`Vida pessoal de ${d.name} vira assunto da imprensa`, `${d.name}'s private life becomes a press story`),
    body: byLang('Fotos circulam nas redes e a equipe evita comentar. Nada foi confirmado.', 'Photos circulate on social media and the team declines to comment. Nothing has been confirmed.') };
}, verdict: (G, c) => { const d = Career.driver(G, c.did); if (d) { d.morale = clamp((d.morale ?? 70) - 5, 1, 100); d.popularity = clamp((d.popularity || 40) + 3, 0, 100); } return null; } });

/* --- conflitos --- */
CE({ k: 'companheiros', g: 'conflitos', w: 1.2, sev: 2, cool: 1, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null; const ds = Chaos.drivers(G, t.id); if (ds.length < 2) return null;
  if (!Chaos.real(G) && !ds.every(d => d.regen)) return null;
  return { tid: t.id, did: ds[0].id, did2: ds[1].id, real: !ds[0].regen || !ds[1].regen,
    title: byLang(`Clima tenso na ${t.name}: ${ds[0].name} e ${ds[1].name} trocam acusações`, `Tension at ${t.name}: ${ds[0].name} and ${ds[1].name} trade accusations`),
    body: byLang('Depois de uma disputa dura na pista, os dois pilotos se acusaram nas entrevistas. A equipe diz que vai conversar com ambos.', 'After a hard on-track battle, both drivers blamed each other in interviews. The team says it will talk to both.') };
}, verdict: (G, c, t, r) => { [c.did, c.did2].forEach(id => { const d = Career.driver(G, id); if (d) d.morale = clamp((d.morale ?? 70) - 8, 1, 100); }); if (r() < 0.25 && !Chaos.mine(G, t)) { const d = Career.driver(G, r() < 0.5 ? c.did : c.did2); if (d && d.contractYears > 0) { d.contractYears = 0; return byLang(`${d.name} pede para sair no fim do ano, e a equipe aceita.`, `${d.name} asks to leave at the end of the year, and the team agrees.`); } } return null; } });
CE({ k: 'pilotoChefe', g: 'conflitos', w: 0.8, sev: 3, cool: 2, make: (G, r) => {
  const d = Chaos.pickDriver(G, r); if (!d) return null; const t = Career.team(G, d.team);
  return { tid: t.id, did: d.id, real: !d.regen,
    title: byLang(`${d.name} critica a ${t.name} em público`, `${d.name} publicly criticises ${t.name}`),
    body: byLang(`"Não dá para lutar com esse carro e com essas estratégias", disse ${d.name}. O chefe de equipe respondeu que críticas se fazem dentro de casa.`, `"You can't fight with this car and these strategies," said ${d.name}. The team principal replied that criticism belongs behind closed doors.`) };
}, verdict: (G, c, t, r) => { const d = Career.driver(G, c.did); if (d) d.morale = clamp((d.morale ?? 70) - 10, 1, 100); if (!Chaos.mine(G, t) && d && r() < 0.3 && d.contractYears > 0) { d.contractYears = 0; return byLang(`A relação não se recupera: ${d.name} deixa a equipe no fim do ano.`, `The relationship never recovers: ${d.name} leaves at the end of the year.`); } return null; } });
CE({ k: 'engenheiroSai', g: 'conflitos', w: 0.8, sev: 3, cool: 2, make: (G, r) => {
  const t = Chaos.teamPick(G, r); const v = Chaos.teamPick(G, r, x => x !== t && x.reputation >= t.reputation); if (!t || !v) return null;
  const s = Chaos.pickStaff(G, r, t, ['technical', 'aero', 'engineeringDir', 'performance']); if (!s) return null;
  return { tid: t.id, vid: v.id, sid: s.id, real: !!s.real,
    title: byLang(`${s.name} pede demissão da ${t.name} e acerta com a ${v.name}`, `${s.name} quits ${t.name} and agrees terms with ${v.name}`),
    body: byLang(`Insatisfeito com os rumos do projeto, o ${Chaos.roleName(s)} sai depois de cumprir o período de afastamento.`, `Unhappy with the direction of the project, the ${s.role} leaves after serving gardening leave.`) };
}, verdict: (G, c, t) => { const s = (t.staffList || []).find(x => x.id === c.sid); if (s && !s.isPlayer) Chaos.removeStaff(G, t, s, Career.team(G, c.vid)); return null; } });
CE({ k: 'ordens', g: 'conflitos', w: 0.7, sev: 2, cool: 1, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null; const ds = Chaos.drivers(G, t.id); if (ds.length < 2) return null;
  if (!Chaos.real(G) && !ds.every(d => d.regen)) return null;
  return { tid: t.id, did: ds[1].id, real: !ds[1].regen,
    title: byLang(`Ordem de equipe da ${t.name} revolta torcedores`, `${t.name} team orders anger fans`),
    body: byLang(`${ds[1].name} foi mandado deixar ${ds[0].name} passar. A equipe defende a decisão pelo campeonato.`, `${ds[1].name} was told to let ${ds[0].name} by. The team defends the call for the championship.`) };
}, verdict: (G, c) => { const d = Career.driver(G, c.did); if (d) { d.morale = clamp((d.morale ?? 70) - 6, 1, 100); d.popularity = clamp((d.popularity || 40) + 4, 0, 100); } return null; } });
CE({ k: 'mecanicos', g: 'conflitos', w: 0.4, sev: 2, cool: 4, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null;
  return { tid: t.id, real: false,
    title: byLang(`Mecânicos da ${t.name} reclamam da carga de trabalho`, `${t.name} mechanics complain about workload`),
    body: byLang('Com o calendário cheio, a equipe de pit admite cansaço e pede mais pessoal. O desempenho nos pit stops caiu nas últimas etapas.', 'With a packed calendar, the pit crew admits fatigue and asks for more staff. Pit stop performance has dropped in recent races.') };
}, verdict: (G, c, t) => { t.pitCrew = clamp(t.pitCrew - 1, 30, 100); return null; } });

/* --- operação --- */
const OPS = [
  ['tunel', 0.9, (t) => { t.car.aero = +(t.car.aero - 0.15).toFixed(2); }, ['Túnel de vento da {t} fica parado por falha técnica', '{t} wind tunnel down after a technical fault'], ['A equipe perde horas de túnel enquanto o equipamento é reparado.', 'The team loses wind tunnel hours while repairs are carried out.'], 0],
  ['logistica', 1, null, ['Atraso de carga obriga a {t} a pagar frete aéreo extra', 'Cargo delay forces {t} to pay for extra air freight'], ['', ''], 0.4],
  ['incendio', 0.35, (t) => { t.car.reliability = +clamp(t.car.reliability - 0.6, 40, 99).toFixed(1); }, ['Incêndio atinge a garagem da {t}', 'Fire hits the {t} garage'], ['Ninguém se feriu, mas peças de reposição foram perdidas.', 'Nobody was hurt, but spare parts were lost.'], 1.2],
  ['ciberataque', 0.4, (t) => { t.car.aero = +(t.car.aero - 0.1).toFixed(2); }, ['{t} sofre ataque hacker e tem sistemas fora do ar', '{t} hit by cyber attack, systems down'], ['A equipe ficou dias sem acesso a parte dos dados de simulação.', 'The team spent days without access to part of its simulation data.'], 0.8],
  ['fornecedor', 0.6, (t) => { t.car.reliability = +clamp(t.car.reliability - 0.8, 40, 99).toFixed(1); }, ['Lote defeituoso de um fornecedor preocupa a {t}', 'Faulty supplier batch worries {t}'], ['Peças de suspensão precisaram ser trocadas às pressas.', 'Suspension parts had to be replaced in a hurry.'], 0.3],
];
OPS.forEach(([k, w, fx, ti, bo, cost]) => CE({ k, g: 'operacao', w, sev: 1, cool: 0, make: (G, r) => {
  const t = Chaos.teamPick(G, r); if (!t) return null;
  return { tid: t.id, real: false, title: byLang(ti[0], ti[1]).replace('{t}', t.name), body: byLang(bo[0], bo[1]), now: true };
}, verdict: (G, c, t) => { if (fx) { if (Chaos.mine(G, t) && k === 'tunel' && G.atrPool) G.atrPool.wt = Math.round(G.atrPool.wt * 0.5); else fx(t); } if (cost) Chaos.fine(G, t, cost, byLang('Prejuízo operacional', 'Operational loss')); return null; } }));

/* --- negócios --- */
CE({ k: 'patrocinadorQuebra', g: 'negocios', w: 1, sev: 3, cool: 2, make: (G, r) => {
  const t = Chaos.teamPick(G, r, x => Chaos.mine(G, x) ? (G.sponsors || []).length > 1 : (x.sponsors || []).length > 1); if (!t) return null;
  const sp = Chaos.mine(G, t) ? G.sponsors[Math.floor(r() * G.sponsors.length)].name : t.sponsors[Math.floor(r() * t.sponsors.length)];
  return { tid: t.id, sp, real: !Chaos.mine(G, t) && Chaos.real(G),
    title: byLang(`Patrocinador da ${t.name} entra em crise e suspende pagamentos`, `${t.name} sponsor hits crisis and suspends payments`),
    body: byLang(`${sp} enfrenta problemas financeiros e não deve pagar o restante do contrato.`, `${sp} faces financial trouble and is unlikely to pay the rest of the contract.`) };
}, verdict: (G, c, t) => {
  if (Chaos.mine(G, t)) { const s = (G.sponsors || []).find(x => x.name === c.sp); if (s) { G.sponsors = G.sponsors.filter(x => x !== s); Career.ledger(G, byLang(`Calote do patrocinador ${s.name}`, `${s.name} sponsor default`), -Math.min(4, (s.perRace || 1) * 2), 'receita'); } }
  else { t.sponsors = (t.sponsors || []).filter(x => x !== c.sp); t.cash = +((t.cash || 0) - 4).toFixed(2); }
  return byLang('O contrato foi encerrado e a área comercial procura uma substituta.', 'The contract has been terminated and the commercial team is looking for a replacement.');
} });
CE({ k: 'donoProblemas', g: 'negocios', w: 0.6, sev: 3, cool: 4, make: (G, r) => {
  const t = Chaos.teamPick(G, r, x => x.owner && x.owner.type !== 'grupo'); if (!t) return null;
  return { tid: t.id, real: Chaos.real(G),
    title: byLang(`Problemas nos negócios dos donos ameaçam o orçamento da ${t.name}`, `Owners' business troubles threaten ${t.name}'s budget`),
    body: byLang(`${t.owner ? t.owner.name : 'O grupo dono'} enfrenta queda nas vendas e revê os investimentos no esporte.`, `${t.owner ? t.owner.name : 'The owning group'} faces falling sales and is reviewing its sports investments.`) };
}, verdict: (G, c, t) => { t.ownerFunding = +clamp((t.ownerFunding || 30) * 0.85, 10, 300).toFixed(1); Chaos.hitTeam(G, t, { mood: 12 }); return byLang('O aporte anual dos donos foi reduzido em 15%.', 'The owners’ yearly contribution has been cut by 15%.'); } });

/* --- parceria técnica: carro parecido demais com o da equipe principal (caso de 2020) --- */
CE({ k: 'copiaParceira', g: 'escandalos', w: 0.35, sev: 4, cool: 6, hidden: false, make: (G, r) => {
  if (typeof Owners === 'undefined') return null;
  const pairs = Object.entries(Owners.partners(G)).map(([c, p]) => [Career.team(G, c), Career.team(G, p.parent)]).filter(([a, b]) => a && b && !a.gone && !b.gone && Math.abs(a.car.aero - b.car.aero) < 1.2);
  if (!pairs.length) return null;
  const [t, par] = pairs[Math.floor(r() * pairs.length)];
  return { tid: t.id, vid: par.id, real: false,
    title: byLang(`Rivais protestam: carro da ${t.name} seria cópia do da ${par.name}`, `Rivals protest: ${t.name} car allegedly a copy of ${par.name}'s`),
    body: byLang(`As equipes acusam a ${t.name} de usar o projeto de dutos de freio e assoalho da parceira técnica, o que o regulamento proíbe. A FIA abre investigação.`, `Teams accuse ${t.name} of using its technical partner's brake duct and floor design, which the rules forbid. The FIA opens an investigation.`) };
}, verdict: (G, c, t, r, guilty) => {
  if (!guilty) return byLang('A FIA concluiu que a equipe desenvolveu as peças por conta própria.', 'The FIA concluded the team developed the parts itself.');
  const last = G.season.results[G.season.results.length - 1];
  const pts = Math.min(15, (G.season.standC[t.id] || 0));
  Chaos.removePoints(G, t, pts); Chaos.fine(G, t, 5, byLang('Multa da FIA (cópia de projeto)', 'FIA fine (design copying)'));
  return byLang(`Culpada: multa de ${fmtMoney(5)} e perda de ${pts} pontos no Mundial de Construtores. As peças podem continuar no carro.`, `Guilty: ${fmtMoney(5)} fine and ${pts} Constructors' points deducted. The parts may stay on the car.`);
} });

Chaos.byK = (k) => Chaos.EV.find(e => e.k === k);

/* ---------- motor: ocorrência, descoberta, investigação, veredito ---------- */
Chaos.tick = (G) => {
  const S = Chaos.state(G); Chaos.opts(G);
  const y = G.season.year, rd = G.season.round;
  const r = localRng(`chaos:${G.seed}:${y}:${rd}`);
  // descobertas e vereditos pendentes
  S.hidden.filter(h => !h.out && !h.covered && (h.y < y || h.discover <= rd)).forEach(h => Chaos.discover(G, h));
  // caso acobertado pode vir à tona anos depois (ex-funcionário, documentos, delação)
  S.hidden.filter(h => !h.out && h.covered && y > h.y && r() < 0.006).forEach(h => { h.title = byLang(`Caso antigo vem à tona: ${h.title}`, `Old case resurfaces: ${h.title}`); Chaos.discover(G, h); });
  S.cases.filter(c => c.stage === 'investigacao' && (c.y < y || c.due <= rd)).forEach(c => Chaos.verdict(G, c));
  // ocorrências por grupo
  Object.keys(Chaos.BASE).forEach(g => {
    const p = Chaos.BASE[g] * Chaos.mult(G, g);
    if (!(r() < p)) return;
    const pool = Chaos.EV.filter(e => e.g === g && !(S.last[e.k] != null && y - S.last[e.k] < e.cool));
    if (!pool.length) return;
    let x = r() * pool.reduce((a, e) => a + e.w, 0); const e = pool.find(ev => (x -= ev.w) <= 0) || pool[0];
    Chaos.occur(G, e, r);
  });
  // limpeza: casos encerrados há mais de 3 anos e ocultos já revelados há mais de 5 anos saem da memória ativa
  if (rd === 1) { S.cases = S.cases.filter(c => c.stage !== 'fechado' || y - c.y <= 3); S.hidden = S.hidden.filter(h => !h.out || y - h.y <= 5); Object.keys(S.last).forEach(k => { if (y - S.last[k] > 20) delete S.last[k]; }); }
  // equipe excluída do Mundial de Construtores segue com zero
  G.db.teams.forEach(t => { if (t.excludedC === y) G.season.standC[t.id] = 0; });
};
Chaos.occur = (G, e, r, force) => {
  const S = Chaos.state(G);
  const c = e.make(G, r); if (!c) return null;
  Object.assign(c, { id: 'ch' + (++S.seq), k: e.k, g: e.g, sev: e.sev, y: G.season.year, at: G.season.round });
  S.last[e.k] = G.season.year;
  if (e.hidden && !force) {
    const covered = r() < 0.22;
    S.hidden.push({ ...c, covered, discover: covered ? 999 : G.season.round + 1 + Math.floor(r() * 5), out: false });
    Chaos.log(G, e.k, e.g, { tid: c.tid, hidden: true, covered });
    return c;
  }
  Chaos.discover(G, { ...c, out: false });
  return c;
};
Chaos.discover = (G, h) => {
  const S = Chaos.state(G);
  h.out = true;
  const t = Career.team(G, h.tid); if (!t) return;
  const e = Chaos.byK(h.k);
  const body = h.body + (h.real ? CH_FICT() : '');
  Career.news(G, h.title, e.g === 'escandalos' ? 'escandalo' : e.g === 'operacao' ? 'tecnica' : 'paddock', body, { tm: [t.id], dr: [h.did, h.did2].filter(Boolean), main: e.sev >= 4 });
  if (e.sev >= 3) Career.record(G, e.g === 'escandalos' ? 'escandalo' : 'equipe', `${h.title}. ${body}`, { teams: [t.id], drivers: [h.did].filter(Boolean) });
  if (typeof Social !== 'undefined' && e.sev >= 3) Social.post(G, { by: 'bbc', kind: 'scandal', text: byLang(`URGENTE: ${h.title}`, `BREAKING: ${h.title}`), hype: 1.2 + e.sev * 0.25 });
  if (typeof Stories !== 'undefined' && e.g === 'escandalos' && e.sev >= 3) Stories.react(G, 'scandal', {});
  Chaos.log(G, h.k, e.g, { tid: t.id, out: true });
  // investigação (escândalos e conflitos graves) ou consequência imediata
  const inv = e.g === 'escandalos' && e.sev >= 3;
  const c = { ...h, stage: inv ? 'investigacao' : 'fechado', due: G.season.round + (inv ? 2 + Math.floor(localRng(`due:${G.seed}:${h.id}`)() * 4) : 0) };
  if (inv) S.cases.push(c); else Chaos.verdict(G, c, true);
  if (Chaos.mine(G, t)) Chaos.playerMail(G, c, t, inv);
};
/* decisões do jogador quando o caso envolve a sua equipe */
Chaos.playerMail = (G, c, t, inv) => {
  if (!inv) { Career.mail(G, { from: byLang('Assessoria de imprensa', 'Press office'), tag: 'team', important: Chaos.byK(c.k).sev >= 3, title: c.title, body: c.body + (c.real ? CH_FICT() : '') }); return; }
  Career.mail(G, {
    from: byLang('Departamento jurídico', 'Legal department'), tag: 'board', important: true, title: c.title,
    body: c.body + (c.real ? CH_FICT() : '') + byLang('\n\nComo a equipe deve agir durante a investigação da FIA?', '\n\nHow should the team respond during the FIA investigation?'),
    choices: [
      { label: byLang('Cooperar totalmente com a FIA', 'Cooperate fully with the FIA'), outcome: byLang('A equipe entregou documentos e abriu a fábrica aos investigadores. A pena tende a ser menor.', 'The team handed over documents and opened the factory to investigators. The penalty is likely to be lighter.'), effects: { chaos: { id: c.id, stance: 'coopera' }, board: 2 } },
      { label: byLang('Defender a equipe publicamente', 'Defend the team publicly'), outcome: byLang('A equipe negou tudo. Se houver provas, a punição será maior.', 'The team denied everything. If there is evidence, the penalty will be harsher.'), effects: { chaos: { id: c.id, stance: 'nega' }, moraleAll: 3 } },
      { label: byLang('Afastar os envolvidos agora', 'Suspend those involved right away'), outcome: byLang('Os envolvidos foram afastados. Patrocinadores elogiaram a rapidez.', 'Those involved were suspended. Sponsors praised the quick action.'), effects: { chaos: { id: c.id, stance: 'afasta' }, sponsorSat: 4 } },
    ],
  });
};
Chaos.verdict = (G, c, immediate) => {
  const S = Chaos.state(G);
  c.stage = 'fechado';
  const t = Career.team(G, c.tid); if (!t || t.gone) return;
  const e = Chaos.byK(c.k);
  const r = localRng(`verd:${G.seed}:${c.id}`);
  let pGuilty = 0.6 + (e.sev - 3) * 0.1;
  if (c.stance === 'coopera') pGuilty -= 0.1; else if (c.stance === 'nega') pGuilty += 0.05; else if (c.stance === 'afasta') pGuilty -= 0.05;
  const guilty = r() < pGuilty;
  // cooperação reduz a pena; negar e perder aumenta
  const txt = e.verdict(G, c, t, r, guilty);
  if (guilty && c.stance === 'nega') Chaos.hitTeam(G, t, { rep: 2, sponsor: 1 });
  if (guilty && c.stance === 'coopera' && Chaos.mine(G, t)) Career.ledger(G, byLang('Redução de pena por cooperação', 'Penalty reduced for cooperation'), 3, 'receita');
  c.guilty = guilty; c.result = txt;
  if (!txt) return;
  if (immediate) { Career.news(G, byLang(`Desdobramento: ${c.title}`, `Fallout: ${c.title}`), 'paddock', txt, { tm: [t.id] }); return; }
  Career.news(G, byLang(`Veredito da FIA: ${c.title}`, `FIA verdict: ${c.title}`), 'escandalo', txt + (c.real ? CH_FICT() : ''), { tm: [t.id], main: e.sev >= 4 });
  Career.record(G, 'escandalo', byLang(`Veredito (${G.season.year}): ${c.title}. ${txt}`, `Verdict (${G.season.year}): ${c.title}. ${txt}`), { teams: [t.id], drivers: [c.did].filter(Boolean) });
  if (Chaos.mine(G, t)) Career.mail(G, { from: 'FIA', tag: 'board', important: true, title: byLang('Veredito da investigação', 'Investigation verdict'), body: txt });
  // cadeia: escândalo grave pode derrubar o chefe de equipe da IA e assustar os donos
  if (guilty && e.sev >= 5 && !Chaos.mine(G, t) && r() < 0.5) {
    const p = (t.staffList || []).find(s => s.role === 'principal' && !s.isPlayer);
    if (p) { Chaos.removeStaff(G, t, p); t.principal = (t.staffList.find(s => s.role === 'principal') || {}).name || t.principal; Career.news(G, byLang(`${t.name} troca o chefe de equipe depois do escândalo`, `${t.name} changes team principal after the scandal`), 'mercado', '', { tm: [t.id] }); }
  }
  if (guilty && e.sev >= 4 && r() < 0.15) {
    // denúncia gera desconfiança: outra equipe passa a ser investigada (cadeia)
    const other = Chaos.teamPick(G, r, x => x !== t);
    if (other && Chaos.mult(G, 'escandalos') > 0) S.hidden.push({ id: 'ch' + (++S.seq), k: 'fraudeRegulamentar', g: 'escandalos', sev: 4, y: G.season.year, at: G.season.round, tid: other.id, real: false, part: byLang('o assoalho', 'the floor'),
      title: byLang(`Depois do caso da ${t.name}, FIA mira a ${other.name}`, `After the ${t.name} case, the FIA turns to ${other.name}`), body: byLang(`Documentos da investigação anterior citam soluções parecidas no carro da ${other.name}.`, `Documents from the previous investigation mention similar solutions on the ${other.name} car.`), discover: G.season.round + 2, out: false, covered: false });
  }
};

/* ---------- lesões, doenças e acidentes graves (sempre ligados) ---------- */
/* segurança melhora com o tempo: o risco cai ~1,5% ao ano a partir de 2027 */
Chaos.safety = (G) => Math.pow(0.985, Math.max(0, G.season.year - 2027));
Chaos.afterRace = (G) => {
  const lr = G.lastRace; if (!lr || lr.year !== G.season.year) return;
  const r = localRng(`acc:${G.seed}:${G.season.year}:${G.season.round}`);
  const crashes = [...new Set((lr.events || []).filter(e => e.type === 'crash' && e.did).map(e => e.did))];
  const injMul = Chaos.LEVELS[Chaos.opts(G).levels.lesoes ?? 2][2] * (Chaos.FREQ[Chaos.opts(G).freq] || Chaos.FREQ.normal)[2];
  const tr = Career.track(G, lr.trackId) || {};
  crashes.forEach(did => {
    const d = Career.driver(G, did); if (!d || d.dead) return;
    const x = r();
    // fatal: ~1 a cada 80–100 anos na F1 moderna
    if (x < 0.00018 * Chaos.safety(G) * (tr.street ? 1.3 : 1)) return Chaos.fatal(G, d, 'f1', lr.gp);
    if (r() < 0.022 * injMul) Chaos.injure(G, d, r, 'crash', lr.gp);
  });
  // doença ou lesão fora da pista
  Chaos.drivers(G).forEach(d => { if (!(d.injured > 0) && r() < 0.0007 * injMul) Chaos.injure(G, d, r, 'doenca'); });
  Chaos.otherSeries(G, r, injMul);
};
Chaos.injure = (G, d, r, how, gp) => {
  const n = r() < 0.08 ? 4 + Math.floor(r() * 6) : 1 + Math.floor(r() * 3);
  d.injured = Math.max(d.injured || 0, n); d.injuryKind = how === 'doenca' ? 'doenca' : 'lesao';
  const t = d.team && Career.team(G, d.team);
  const what = how === 'doenca' ? byLang(r() < 0.5 ? 'uma apendicite' : 'uma lesão no treino físico', r() < 0.5 ? 'appendicitis' : 'a training injury') : byLang(`a batida no ${gp}`, `the crash at the ${gp}`);
  const title = byLang(`${d.name} vai desfalcar a ${t ? t.name : 'equipe'} por ${n} GP${n > 1 ? 's' : ''}`, `${d.name} to miss ${n} GP${n > 1 ? 's' : ''} for ${t ? t.name : 'the team'}`);
  Career.news(G, title, 'paddock', byLang(`${d.name} se recupera de ${what}. O reserva assume o carro.`, `${d.name} is recovering from ${what}. The reserve takes over the car.`), { dr: [d.id], tm: t ? [t.id] : [] });
  Career.record(G, 'lesao', title, { drivers: [d.id], teams: t ? [t.id] : [] });
  Chaos.log(G, how === 'doenca' ? 'doenca' : 'lesao', 'lesoes', { did: d.id });
  if (t && Chaos.mine(G, t)) Career.mail(G, { from: byLang('Departamento médico', 'Medical department'), tag: 'team', important: true, title, body: byLang(`${d.name} está fora por ${n} GP(s). O reserva vai correr; você pode contratar outro piloto no Mercado.`, `${d.name} is out for ${n} GP(s). The reserve will race; you can sign another driver in the Market.`) });
};
/* outras categorias: risco maior nas de base e nos ovais, menor nas de turismo */
Chaos.RISK = { f2: 1, f3: 1.1, freca: 1.2, indycar: 1.6, nxt: 1.3, wec: 0.9, imsa: 0.8, nascup: 0.7, stockcar: 0.8, sf: 0.9, fe: 0.5, dtm: 0.5, kart: 0.6 };
Chaos.otherSeries = (G, r, injMul) => {
  if (typeof Cats === 'undefined' || !Cats.on(G)) return;
  const cats = Cats.list(G).filter(c => c.id !== 'f1');
  cats.forEach(cat => {
    const risk = Chaos.RISK[cat.id] ?? 1;
    // ~1 corrida da categoria entre dois GPs de F1; ~20 carros por corrida
    if (r() < 0.00013 * risk * Chaos.safety(G)) {
      const ids = (cat.entries || []).map(e => e.did).filter(Boolean);
      const d = ids.length && Career.driver(G, ids[Math.floor(r() * ids.length)]);
      if (d && !d.dead && !d.retired) Chaos.fatal(G, d, cat.short || cat.name);
    } else if (r() < 0.0035 * risk * injMul) {
      const ids = (cat.entries || []).map(e => e.did).filter(Boolean);
      const d = ids.length && Career.driver(G, ids[Math.floor(r() * ids.length)]);
      if (d && !d.dead && !d.retired && !(d.injured > 0)) { d.injured = 1 + Math.floor(r() * 3); d.injuryKind = 'lesao'; Chaos.log(G, 'lesao', 'lesoes', { did: d.id, cat: cat.id }); if (r() < 0.4) Career.news(G, byLang(`${d.name} se machuca em acidente na ${cat.short || cat.name}`, `${d.name} injured in ${cat.short || cat.name} crash`), 'paddock', byLang(`O piloto deve ficar fora por algumas semanas.`, `The driver is expected to be out for a few weeks.`), { dr: [d.id] }); }
    }
  });
};
/* acidente fatal: tratado com seriedade (luto, homenagem, investigação, revisão de segurança) */
Chaos.fatal = (G, d, series, gp) => {
  const y = G.season.year;
  const t = d.team && Career.team(G, d.team);
  const tid = d.team, seat = d.seat;
  d.dead = true; d.retired = true; d.retiredYear = y; d.deathYear = y; d.deathCause = 'acidente';
  if (d.team) { d.team = null; d.seat = null; }
  (G.memorial = G.memorial || []).push({ y, name: d.name, age: d.age, role: byLang('piloto', 'driver'), team: t ? t.name : null, real: !d.regen, did: d.id, accident: true, series });
  const where = gp ? byLang(`no ${gp}`, `at the ${gp}`) : byLang(`numa etapa da ${series}`, `at a ${series} round`);
  const title = byLang(`Luto no automobilismo: ${d.name} morre após acidente ${where}`, `Motorsport mourns: ${d.name} dies after crash ${where}`);
  const body = byLang(`${d.name}, de ${d.age} anos, não resistiu aos ferimentos. A FIA abriu investigação e vai revisar a segurança do circuito e do carro. A próxima etapa terá um minuto de silêncio.`, `${d.name}, ${d.age}, did not survive his injuries. The FIA has opened an investigation and will review circuit and car safety. The next round will hold a minute's silence.`) + (!d.regen ? CH_FICT() : '');
  Career.news(G, title, 'historia', body, { dr: [d.id], tm: t ? [t.id] : [], main: true });
  Career.record(G, 'memoria', title, { drivers: [d.id], teams: t ? [t.id] : [] });
  if (typeof Stories !== 'undefined') Stories.react(G, 'tribute', { d: d.name });
  Chaos.log(G, 'fatal', 'acidentes', { did: d.id, series });
  if (series === 'f1' && tid && seat && seat !== 'R') { const f = Career.aiFillSeat(G, tid, seat); if (f && G.season.standD[f.id] == null) G.season.standD[f.id] = 0; }
  if (t && Chaos.mine(G, t)) Career.mail(G, { from: byLang('Diretoria', 'Board'), tag: 'board', important: true, title, body: body + byLang(' A equipe toda está de luto. Um piloto substituto foi chamado.', ' The whole team is in mourning. A replacement driver has been called up.') });
};

/* ---------- forçar eventos (Diagnóstico) ---------- */
Chaos.force = (G, k) => {
  const e = Chaos.byK(k); if (!e) return null;
  const r = localRng(`force:${G.seed}:${k}:${G.seq || 0}:${G.season.round}`);
  const c = Chaos.occur(G, e, r, true);
  const S = Chaos.state(G);
  S.cases.filter(x => x.stage === 'investigacao' && x.k === k).forEach(x => (x.due = G.season.round));
  return c;
};

/* ---------- ganchos ---------- */
(function () {
  // os eventos raros antigos (túnel, logística e escândalo genérico) passam a viver aqui
  if (typeof Stories !== 'undefined') Stories.TIERS.raro = 0;
  if (typeof Media !== 'undefined') { const st = Media.scandalTick; Media.scandalTick = (G, force) => (force ? Chaos.force(G, 'vazamento') : null); }
  const fw = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => { const res = fw(G, ...a); try { Chaos.afterRace(G); Chaos.tick(G); } catch (err) { if (typeof Store !== 'undefined' && Store.log) Store.log('error', 'chaos: ' + err.message); else throw err; } return res; };
  const ae = Events.applyEffects;
  Events.applyEffects = (G, fx) => {
    if (fx && fx.chaos) { const c = Chaos.state(G).cases.find(x => x.id === fx.chaos.id); if (c) c.stance = fx.chaos.stance; if (fx.chaos.stance === 'afasta' && c && c.sid) { const t = Career.team(G, c.tid); const s = t && (t.staffList || []).find(x => x.id === c.sid); if (s && !s.isPlayer) Chaos.removeStaff(G, t, s); } }
    return ae(G, fx);
  };
  const cc = Career.create;
  Career.create = (db, opts) => {
    const G = cc(db, opts);
    G.options.chaos = { ...Chaos.defaults(), ...(opts && opts.chaos || {}) };
    if (opts && opts.chaosFreq) G.options.chaos.freq = opts.chaosFreq;
    G.options.realMortality = G.options.chaos.realPeople;
    Chaos.opts(G);
    return G;
  };
})();
