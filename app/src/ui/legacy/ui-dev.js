/* ============================================================
   PIT WALL — P&D visual por peça (complementa a tela "Carro e P&D")
   - Vagas de projeto: ocupadas (peça, alvo, progresso), livres e
     bloqueadas pelas instalações (cada 32 pontos abre uma vaga).
   - Configurador: peça (lista ou clique no carro), alvo (carro atual ou
     carro do ano seguinte), foco, ambição e quanto túnel de vento e CFD
     o projeto usa. Previsão de custo, prazo, ganho por atributo e risco.
   - Cota de túnel/CFD do período (regra de ATR do regulamento).
   - Atualizações concluídas: antes → depois, animado na primeira vez.
   - Carro visto de cima com proporções do regulamento de 2026
     (entre-eixos menor, carro mais estreito, asa dianteira mais simples).
   ============================================================ */
'use strict';

const DEV_ZONES = {
  aero: ['fw', 'rw', 'floor', 'pods'], wings: ['fw', 'rw'], frontWing: ['fw'], rearWing: ['rw'], floor: ['floor'], sidepods: ['pods'], chassis: ['mono'], suspension: ['susp'], weight: ['mono', 'floor'],
  brakes: ['brakes'], cooling: ['pods'], engine: ['pu'], gearbox: ['gb'], energy: ['batt'], reliability: ['pu', 'gb'], tyreCare: ['tyres', 'susp'],
};
const ZONE_AREA = { fw: 'frontWing', rw: 'rearWing', floor: 'floor', mono: 'chassis', susp: 'suspension', brakes: 'brakes', pods: 'sidepods', pu: 'engine', gb: 'gearbox', batt: 'energy', tyres: 'tyreCare' };
const ZONE_NAME = { fw: 'Asa dianteira', rw: 'Asa traseira', floor: 'Assoalho', mono: 'Chassi (monocoque)', susp: 'Suspensão', brakes: 'Freios', pods: 'Sidepods e refrigeração', pu: 'Unidade de potência', gb: 'Câmbio', batt: 'Bateria (ERS)', tyres: 'Pneus' };
Career.MAX_SLOTS = 1 + Math.floor(100 / 32);

/* carro de 2026 visto de cima (escala aproximada: 1 unidade = 10 mm; 1.900 mm de largura, 3.400 mm entre eixos) */
function devCarSvg(sel, running) {
  const on = new Set(DEV_ZONES[sel] || []), run = new Set(running.flatMap(a => DEV_ZONES[a] || []));
  const z = (id, shape) => `<g class="cz${on.has(id) ? ' sel' : ''}${run.has(id) ? ' run' : ''}" data-act="devZone" data-z="${id}" role="button" aria-label="${esc(ZONE_NAME[id])}"><title>${esc(ZONE_NAME[id])}</title>${shape}</g>`;
  const FT = [[13, 80, 26, 66], [161, 80, 26, 66]], RT = [[9, 410, 31, 70], [160, 410, 31, 70]];
  const tyre = ([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>`;
  const disc = ([x, y, w, h]) => `<rect x="${x + w / 2 - 3}" y="${y + h / 2 - 11}" width="6" height="22" rx="2"/>`;
  return `<svg class="devcar" viewBox="0 0 200 520" aria-label="Diagrama do carro">
    ${z('floor', '<path d="M64 168 Q100 158 136 168 L150 236 L156 392 Q150 404 138 406 L62 406 Q50 404 44 392 L50 236 Z"/>')}
    ${z('pods', '<path d="M56 210 Q60 196 80 196 L80 330 Q66 322 60 300 Q52 262 56 210 Z"/><path d="M144 210 Q140 196 120 196 L120 330 Q134 322 140 300 Q148 262 144 210 Z"/>')}
    ${z('susp', '<path d="M39 106 L84 98 M39 118 L84 128 M161 106 L116 98 M161 118 L116 128 M40 436 L88 416 M40 452 L88 444 M160 436 L112 416 M160 452 L112 444" fill="none" stroke-width="3.5"/>')}
    ${z('tyres', FT.concat(RT).map(tyre).join(''))}
    ${z('brakes', FT.concat(RT).map(disc).join(''))}
    ${z('mono', '<path d="M95 30 Q100 26 105 30 L110 90 L116 150 L121 196 L121 262 L79 262 L79 196 L84 150 L90 90 Z"/>')}
    ${z('batt', '<rect x="86" y="246" width="28" height="30" rx="3"/>')}
    ${z('pu', '<path d="M80 280 L120 280 L116 362 Q100 372 84 362 Z"/>')}
    ${z('gb', '<path d="M89 366 L111 366 L108 452 L92 452 Z"/>')}
    ${z('fw', '<path d="M22 22 Q100 8 178 22 L178 40 Q140 36 110 46 L90 46 Q60 36 22 40 Z"/><rect x="18" y="16" width="5" height="30" rx="2"/><rect x="177" y="16" width="5" height="30" rx="2"/>')}
    ${z('rw', '<rect x="48" y="474" width="104" height="14" rx="3"/><rect x="52" y="490" width="96" height="9" rx="3"/><rect x="45" y="468" width="5" height="34" rx="2"/><rect x="150" y="468" width="5" height="34" rx="2"/>')}
    <g class="deco"><ellipse cx="100" cy="214" rx="13" ry="24" class="cockpit"/><path d="M100 176 Q86 184 87 208 M100 176 Q114 184 113 208 M100 176 L100 186" class="halo"/><rect x="70" y="186" width="9" height="5" rx="2" class="mir"/><rect x="121" y="186" width="9" height="5" rx="2" class="mir"/></g>
  </svg>`;
}

function devCfg(G) {
  const team = Career.team(G);
  const c = UI.devCfg = UI.devCfg || {};
  const want = UI.params.area && !RnD.HIDDEN[UI.params.area] ? UI.params.area : c.area || 'frontWing';
  if (c.area !== want) {
    const S = RnD.SPEC[want] || RnD.SPEC.frontWing;
    const P = RnD.pool(G);
    Object.assign(c, { area: RnD.SPEC[want] ? want : 'frontWing', focus: RnD.FOCUS[S.kind][0][0], wt: Math.min(S.wt, P.wt), cfd: Math.min(S.cfd, P.cfd) });
  }
  c.amb = c.amb || 'balanced'; c.copies = c.copies || 2; c.first = c.first || 1;
  if (c.next && !RnD.nextOpen(G)) c.next = false;
  if (Career.AREAS[c.area].works && !team.works) c.area = 'frontWing';
  return c;
}

(function () {
  const h = SCREENS.dev.html;
  SCREENS.dev.html = function () {
    let html = h.call(this);
    const team = Career.team(G);
    const slots = Career.slots(team);
    const c = devCfg(G);
    const area = c.area, A = Career.AREAS[area], S = RnD.SPEC[area];
    const P = RnD.pool(G);
    const q = RnD.quote(G, c);
    const running = G.projects.map(p => p.area);
    const ny = G.season.year + 1;
    // vagas
    const projs = G.projects.filter(p => !p.buildOnly);
    const lu = Career.lineup(G, team.id);
    const carName = (seat) => { const d = lu.find(x => x.seat === seat); if (!d) return ''; const w = d.name.split(' ').filter(x => !/^(Jr\.?|Sr\.?|II|III)$/i.test(x)); return w[w.length - 1] || d.name; };
    const dayStatus = (p) => p.stage === 'design'
      ? byLang(`Projeto: faltam ${p.dLeft} dia(s)`, `Design: ${p.dLeft} day(s) left`)
      : byLang(`Fabricação: peça ${p.fitted.length + 1} de ${p.copies} (carro #${p.fitted.length ? (p.fitted[0] === 1 ? 2 : 1) : p.first}) em ${p.bLeft} dia(s)`, `Manufacturing: part ${p.fitted.length + 1} of ${p.copies} (car #${p.fitted.length ? (p.fitted[0] === 1 ? 2 : 1) : p.first}) in ${p.bLeft} day(s)`);
    const dayPct = (p) => p.stage === 'design' ? Math.round((1 - p.dLeft / Math.max(1, p.designDays)) * 100) : Math.round((p.fitted.length * p.buildDays + (p.buildDays - p.bLeft)) / Math.max(1, p.buildDays * p.copies) * 100);
    const box = (i) => {
      const p = projs[i];
      if (p && p.dayMode) {
        const sub = `${esc(T(RnD.AMB[p.amb] ? RnD.AMB[p.amb].name : ''))} · ${byLang('túnel', 'tunnel')} ${p.wt} · CFD ${p.cfd}${p.copies ? ` · ${p.copies} ${byLang('peça(s)', 'part(s)')}` : ''}`;
        return `<div class="devslot busy${p.next ? ' next' : ''}"><div class="row between"><span class="small muted">${byLang('Vaga', 'Slot')} ${i + 1}</span>${p.next ? `<span class="chip">${byLang('Carro de', '')} ${ny}${byLang('', ' car')}</span>` : `<span class="chip">${p.stage === 'design' ? byLang('projeto', 'design') : byLang('fabricação', 'manufacturing')}</span>`}</div><b>${esc(T(Career.AREAS[p.area].name))}</b><div class="small">${sub}</div>${bar(dayPct(p), 100, p.stage === 'design' ? 'b' : 'g')}<div class="small muted">${dayStatus(p)} · ${byLang('risco', 'risk')} ${p.risk}%</div></div>`;
      }
      if (p) {
        const pct = Math.round((p.total - p.left) / p.total * 100);
        const sub = p.v2 ? `${esc(T(RnD.AMB[p.amb] ? RnD.AMB[p.amb].name : ''))} · ${byLang('túnel', 'tunnel')} ${p.wt} · CFD ${p.cfd}` : esc(T(Career.SIZES[p.size].name));
        return `<div class="devslot busy${p.next ? ' next' : ''}"><div class="row between"><span class="small muted">Vaga ${i + 1}</span>${p.next ? `<span class="chip">Carro de ${ny}</span>` : ''}</div><b>${esc(Career.AREAS[p.area].name)}</b><div class="small">${sub}</div>${bar(pct, 100, 'g')}<div class="small muted">${p.total - p.left}/${p.total} GPs · ${p.left === 1 ? byLang('pronto depois do próximo GP', 'ready after the next GP') : byLang(`faltam ${p.left} GPs`, `${p.left} GPs to go`)} · ${byLang('risco', 'risk')} ${p.risk}%</div></div>`;
      }
      if (i < slots) return `<div class="devslot free"><div class="small muted">Vaga ${i + 1}</div><b>Livre</b><div class="small muted">Configure um projeto abaixo.</div></div>`;
      return `<div class="devslot locked"><div class="small muted">Vaga ${i + 1}</div><b>Bloqueada</b><div class="small muted">${typeof Fac !== 'undefined' && team.fac ? byLang(`Abre com escritório de projeto e fábrica maiores (hoje: projeto ${team.fac.design.lvl}, fábrica ${team.fac.fabrica.lvl}).`, `Opens with a bigger design office and factory (now: design ${team.fac.design.lvl}, factory ${team.fac.fabrica.lvl}).`) : `Abre com instalações ${32 * i} (hoje ${Math.round(team.facilities)}).`}</div>${typeof Fac !== 'undefined' ? `<button class="btn sm" data-act="go" data-v="facilities">${byLang('Sede e fábrica', 'HQ & factory')}</button>` : ''}</div>`;
    };
    // configurador
    const seg = (k, cur, opts, dis) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-act="devSet" data-k="${k}" data-v="${v}" ${dis && dis(v) ? 'disabled' : ''}>${l}</button>`).join('')}</div>`;
    const focusOpts = RnD.FOCUS[S.kind];
    const fdesc = (focusOpts.find(f => f[0] === c.focus) || focusOpts[0])[2];
    const areas = Object.entries(Career.AREAS).filter(([k]) => !RnD.HIDDEN[k] && RnD.SPEC[k]);
    const nextOk = RnD.nextOpen(G);
    const wtMax = Math.max(P.wt, 0), cfdMax = Math.max(P.cfd, 0);
    const range = (k, v, max, step, need, unit) => need ? `<label class="field"><span>${k === 'wt' ? byLang('Túnel de vento', 'Wind tunnel') : 'CFD'}: <b>${v}</b> ${unit} <span class="muted">${byLang(`(ideal ${need}; restam ${max} no período)`, `(ideal ${need}; ${max} left this period)`)}</span></span><input type="range" min="0" max="${Math.max(max, v)}" step="${step}" value="${v}" data-chg="devRange" data-k="${k}" aria-label="${k === 'wt' ? 'Túnel de vento' : 'CFD'}"></label>` : `<div class="small muted">${k === 'wt' ? 'Não usa túnel de vento.' : 'Não usa CFD.'}</div>`;
    const gains = Object.entries(q.split).map(([f, w]) => `<dt>${esc(T(RnD.FIELD_LABEL[f] || f))}</dt><dd class="pos">+${(q.min * w).toFixed(2)}–${(q.max * w).toFixed(2)}</dd>`).join('');
    const busy = G.projects.some(p => !p.buildOnly && p.area === area && !!p.next === !!c.next);
    const err = q.blocked || (RnD.used(G) >= slots ? 'Sem vaga livre.' : busy ? 'Já há um projeto desta peça com este alvo.' : q.wt > P.wt ? 'Túnel insuficiente.' : q.cfd > P.cfd ? 'CFD insuficiente.' : null);
    const config = `<div class="panel"><div class="panel-h"><h3>Novo projeto</h3><span class="small muted">Espaço no teto ${fmtMoney(Math.max(0, Career.capRoom(G)))} · caixa ${fmtMoney(G.finances.balance)}</span></div>
      <div class="panel-b devcfg">
        <div class="devcarcol">${devCarSvg(area, running)}<div class="small muted" style="text-align:center"><span class="lgd sel"></span>escolhida <span class="lgd run"></span>em projeto</div></div>
        <div class="stack" style="gap:12px">
          <label class="field"><span>Peça</span><select class="inp" data-chg="devArea">${areas.map(([k, a]) => opt(k, a.name + (a.works && !team.works ? ' (só fábrica)' : ''), area)).join('')}</select></label>
          <div><div class="label">Alvo</div>${seg('next', c.next ? 1 : 0, [[0, `Carro atual (${G.season.year})`], [1, `Carro de ${ny} (pesquisa)`]], v => v === 1 && (!nextOk || S.kind === 'team'))}
            <div class="small muted" style="margin-top:4px">${c.next ? `Só projeto, sem fabricação: rende 35% a mais e entra no carro de ${ny}. Ocupa uma vaga como qualquer projeto.` : nextOk ? 'Projeto e fabricação: a peça entra no carro assim que fica pronta.' : `Projeto e fabricação. A pesquisa do carro de ${ny} abre a partir de ${Regs.r(G).nextYearStartPct}% da temporada.`}</div></div>
          ${focusOpts.length > 1 ? `<div><div class="label">Foco</div>${seg('focus', c.focus, focusOpts.map(f => [f[0], f[1]]))}<div class="small muted" style="margin-top:4px">${esc(fdesc)}</div></div>` : ''}
          <div><div class="label">Ambição</div>${seg('amb', c.amb, Object.entries(RnD.AMB).map(([k, a]) => [k, a.name]))}<div class="small muted" style="margin-top:4px">${c.amb === 'aggressive' ? 'Conceito novo: ganho alto, mais caro, mais longo e mais arriscado.' : c.amb === 'conservative' ? 'Evolução pequena da peça atual: barato, rápido e seguro.' : 'Evolução normal da peça.'}</div></div>
          ${q.build && !c.next ? `<div><div class="label">${byLang('Fabricação', 'Manufacturing')}</div><div class="row" style="gap:10px;flex-wrap:wrap">${seg('copies', c.copies || 2, [[1, byLang('1 carro', '1 car')], [2, byLang('2 carros', '2 cars')]])}${seg('first', c.first || 1, [[1, `${byLang('Primeiro: carro', 'First: car')} #1 ${esc(carName(1))}`], [2, `#2 ${esc(carName(2))}`]])}</div>
            <div class="small muted" style="margin-top:4px">${byLang(`Cada peça leva ${q.buildDays} dia(s) para fabricar. A primeira vai para o carro escolhido; até a segunda ficar pronta, só ele tem a evolução.`, `Each part takes ${q.buildDays} day(s) to build. The first goes on the chosen car; until the second is ready, only that car has the upgrade.`)}</div></div>` : ''}
          ${range('wt', c.wt, wtMax, 5, S.wt, byLang('execuções', 'runs'))}
          ${range('cfd', c.cfd, cfdMax, 20, S.cfd, byLang('simulações', 'runs'))}
        </div>
        <div class="panel devprev"><div class="panel-b stack" style="gap:8px">
          <span class="label">Previsão</span><b>${esc(T(A.name))}${c.next ? ` (${byLang('carro de', '')} ${ny}${byLang('', ' car')})` : ''} — ${esc(T(RnD.AMB[q.amb].name).toLowerCase())}</b>
          <dl class="kv"><dt>Custo</dt><dd>${fmtMoney(q.cost)}</dd><dt>${byLang('Projeto', 'Design')}</dt><dd>${q.designDays} ${byLang('dias', 'days')}</dd>${q.buildDays ? `<dt>${byLang('Fabricação', 'Manufacturing')}</dt><dd>${q.copies} × ${q.buildDays} ${byLang('dias', 'days')}</dd><dt>${byLang('Pronto nos dois carros', 'On both cars')}</dt><dd>${q.copies >= 2 ? esc(Time.fmt(Time.addDays(G.today || Time.weekendDay(G), q.designDays + q.buildDays * 2))) : '—'}</dd>` : `<dt>${byLang('Pronto em', 'Ready on')}</dt><dd>${esc(Time.fmt(Time.addDays(G.today || Time.weekendDay(G), q.designDays)))}</dd>`}${gains}<dt>Risco de falhar</dt><dd class="${q.risk >= 25 ? 'neg' : ''}">${q.risk}%</dd>${S.wt + S.cfd ? `<dt>Recursos</dt><dd>${Math.round(q.q / 1.0 * 100)}% de aproveitamento</dd>` : ''}${q.rel ? `<dt>Confiabilidade</dt><dd class="${q.rel < 0 ? 'neg' : 'pos'}">${q.rel > 0 ? '+' : ''}${(q.rel * Career.SIZES[q.size].races / 2).toFixed(1)}</dd>` : ''}<dt>Responsável</dt><dd style="white-space:normal">${esc(q.staffName || Career.STAFF_ROLES[A.staff] || '—')}</dd></dl>
          ${err ? `<div class="small neg">${esc(err)}</div>` : ''}
          <button class="btn primary" data-act="devStart" ${err ? 'disabled' : ''}>Iniciar projeto</button>
        </div></div>
      </div></div>`;
    // cota de túnel/CFD
    const pool = `<div class="panel"><div class="panel-h"><h3>Túnel de vento e CFD</h3><span class="small muted">período de ${RnD.PERIOD} GPs · renova em ${P.renewIn} GP(s)</span></div><div class="panel-b stack">
      <div class="small">${byLang(`Cota da equipe: <b>${Math.round(P.f * 100)}%</b> da referência (regra de restrição de testes aerodinâmicos: quem terminou atrás no campeonato tem mais).`, `Team allocation: <b>${Math.round(P.f * 100)}%</b> of the reference (aerodynamic testing restrictions: teams further back in the championship get more).`)}</div>
      <div><div class="row between small"><span>Túnel de vento</span><span class="num">${P.wt} de ${P.wtMax} execuções</span></div>${bar(P.wt, Math.max(1, P.wtMax), 'b')}</div>
      <div><div class="row between small"><span>CFD</span><span class="num">${P.cfd} de ${P.cfdMax} simulações</span></div>${bar(P.cfd, Math.max(1, P.cfdMax), 'b')}</div>
      <p class="small muted">Peças aerodinâmicas dependem mais do túnel; as mecânicas, do CFD. Menos recurso que o ideal deixa o projeto mais fraco e mais arriscado; mais que o ideal ajuda pouco.</p></div></div>`;
    const done = (G.devDone || []).slice(-4).reverse();
    const doneHtml = done.length ? done.map(u => {
      const d = u.after - u.before;
      const lo = Math.min(u.before, u.after) - 2.5, hi = Math.max(u.before, u.after) + 0.8;
      const pc = (v) => clamp((v - lo) / (hi - lo) * 100, 0, 100).toFixed(1);
      const card = `<div class="devdone${u.seen ? '' : ' fresh'}${u.failed ? ' bad' : ''}"><div class="row between"><b>${esc(Career.AREAS[u.area] ? Career.AREAS[u.area].name : u.name)}</b>${u.next ? `<span class="chip">Carro de ${u.y + 1}</span>` : ''}${u.seen ? '' : '<span class="chip acc">Nova</span>'}</div>
        <div class="small muted">${u.y} · etapa ${u.r}${u.failed ? ' · abaixo do esperado' : ''}</div>
        <div class="devba"><span class="num">${u.before.toFixed(1)}</span><div class="bar ${u.failed ? '' : 'g'}"><i style="--b:${pc(u.before)}%;--a:${pc(u.after)}%;width:${pc(u.after)}%"></i><s style="left:${pc(u.before)}%" title="antes"></s></div><span class="num"><b>${u.after.toFixed(1)}</b></span></div>
        <div class="small ${d >= 0 ? 'pos' : 'neg'}">${u.lines ? u.lines.map(l => { const m = l.match(/^(\S+) (.+)$/); return m ? `${m[1]} ${esc(T(m[2]))}` : esc(l); }).join(' · ') : `${d >= 0 ? '+' : ''}${d.toFixed(2)}`}</div></div>`;
      u.seen = true;
      return card;
    }).join('') : '<p class="muted small">Nenhuma atualização concluída ainda.</p>';
    const queue = G.projects.filter(p => p.buildOnly);
    const single = (G.parts || []).filter(x => x.seats.length === 1);
    const partsPanel = single.length || queue.length ? `<div class="panel"><div class="panel-h"><h3>${byLang('Peças em um carro só', 'Parts on one car only')}</h3><span class="small muted">${byLang('fabricar a segunda peça não ocupa vaga de projeto', 'building the second part does not use a project slot')}</span></div><div class="panel-b stack">
      ${single.map(x => { const q2 = queue.find(p => p.id === x.id); const other = x.seats[0] === 1 ? 2 : 1; return `<div class="row between"><div><b>${esc(T(Career.AREAS[x.area].name))}</b> <span class="small muted">${byLang('no carro', 'on car')} #${x.seats[0]} ${esc(carName(x.seats[0]))}</span></div>${q2 ? `<span class="small">${byLang(`carro #${other}: pronta em ${q2.bLeft} dia(s)`, `car #${other}: ready in ${q2.bLeft} day(s)`)}</span>` : `<button class="btn sm" data-act="devCopy" data-id="${x.id}">${byLang(`Fabricar para o carro #${other}`, `Build for car #${other}`)} (${(RnD.SPEC[x.area] || {}).build || 0} ${byLang('dias', 'days')})</button>`}</div>`; }).join('')}
    </div></div>` : '';
    const panel = `<div class="panel"><div class="panel-h"><h3>Vagas de projeto</h3><span class="small muted">${projs.length} de ${slots} em uso · até ${Career.MAX_SLOTS} com instalações no topo · pesquisa do carro de ${ny} também ocupa vaga</span></div>
      <div class="panel-b devslots">${Array.from({ length: Career.MAX_SLOTS }, (_, i) => box(i)).join('')}</div></div>
      ${partsPanel}
      ${config}
      <div class="grid g2">${pool}<div class="panel"><div class="panel-h"><h3>Atualizações concluídas</h3><span class="small muted">antes → depois</span></div><div class="panel-b stack">${doneHtml}</div></div></div>`;
    const i0 = html.indexOf('<div class="panel"><div class="panel-h"><h3>Projetos em andamento</h3>');
    if (i0 >= 0) html = html.slice(0, i0) + panel;
    // o foco geral no carro novo virou pesquisa por peça
    const N = G.nextYearParts || {};
    const nyTxt = Object.keys(N).length ? Object.entries(N).map(([f, g]) => `+${g.toFixed(2)} ${esc(T(RnD.FIELD_LABEL[f] || f))}`).join(' · ') : 'nenhuma pesquisa concluída ainda';
    html = html.replace(/<div class="sep"><\/div>\s*<div class="label">Foco no carro[\s\S]*?<\/p>/, `<div class="sep"></div><div class="label">Pesquisa para o carro de ${ny}</div><p class="small">${nyTxt}${G.nextYearBank > 0 ? ` · +${G.nextYearBank.toFixed(2)} ${byLang('de projetos antigos', 'from earlier projects')}` : ''}</p><p class="small muted">Escolha "Carro de ${ny}" no alvo do projeto: cada peça pesquisada ocupa uma vaga.</p>`);
    return html;
  };
})();
ACT.devZone = (el) => { const a = ZONE_AREA[el.dataset.z]; if (a) go('dev', { area: a }); };
CHG.devArea = (el) => go('dev', { area: el.value });
ACT.devSet = (el) => { const c = UI.devCfg; const k = el.dataset.k; c[k] = k === 'next' ? el.dataset.v === '1' : ['copies', 'first'].includes(k) ? Number(el.dataset.v) : el.dataset.v; render(); };
ACT.devCopy = (el) => { const err = RnD.buildCopy(G, el.dataset.id); if (err) return toast(err, 'bad'); toast(byLang('Fabricação iniciada.', 'Manufacturing started.'), 'good'); autosave(); render(); };
CHG.devRange = (el) => { UI.devCfg[el.dataset.k] = Number(el.value); render(); };
ACT.devStart = () => { const err = Career.startProject(G, null, null, { ...UI.devCfg }); if (err) return toast(err, 'bad'); toast('Projeto iniciado.', 'good'); autosave(); render(); };
