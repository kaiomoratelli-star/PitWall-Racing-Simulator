/* Conteúdo base das telas, parte 1: Início, Corrida, Equipe, Carro, Fábrica.
   Cada função recebe o kit K da proposta e devolve HTML. */
(function () {
'use strict';
const W = window.PW; const { D, PT, esc, nf, money, lap, dname, dlast, dabbr, drv, team, tcol, tname, flag, cal, nextGP, myDrivers, standDRows, standCRows, ATTR, ATTR_GROUPS, CAR, ROLE, TYRE, INBOX_TAG, tone, toneCond, trackSvg, dateS, MONTHS_L, BASE } = W;

/* ===================== INÍCIO ===================== */
BASE.inbox = (K, p) => {
  const tag = p.tab || 'todas';
  const tags = ['todas', ...new Set(D.inbox.map(m => m.tag))];
  const list = D.inbox.filter(m => tag === 'todas' || m.tag === tag);
  const sel = D.inbox.find(m => m.id === p.id) || list[0];
  return K.page(K.head({ t: 'Caixa de entrada', s: `${W.unread.length} não lidas · ${W.pending.length} pedem decisão`, tabs: tags.map(t => [t, t === 'todas' ? 'Todas' : (INBOX_TAG[t] || t)]), tab: tag }),
    K.grid('420px 1fr',
      K.card({ flush: true, body: K.list(list.map(m => ({ on: sel && m.id === sel.id, go: 'inbox', p: { id: m.id, tab: tag }, unread: !m.read,
        lead: K.chip(INBOX_TAG[m.tag] || m.tag, m.choices.length ? 'y' : 'n'),
        title: m.title, sub: `${m.from} · GP ${m.round}`, tail: m.choices.length ? K.chip('Decidir', 'r') : '' }))) }),
      sel ? K.card({ t: INBOX_TAG[sel.tag] || 'Mensagem', body: `<div class="msg"><div class="msg-h"><h2>${esc(sel.title)}</h2><p class="mu">${esc(sel.from)} · ${sel.year}, etapa ${sel.round}</p></div><p class="msg-b">${esc(sel.body)}</p>
        ${sel.choices.length ? `<div class="choices">${sel.choices.map((c, i) => K.btn(c, { kind: i ? 'sec' : 'pri', go: 'decision', p: { id: sel.id } })).join('')}</div>` : `<div class="choices">${K.btn('Arquivar', { kind: 'sec' })}${K.btn('Responder depois', { kind: 'ghost' })}</div>`}</div>` }) : K.empty('Nenhuma mensagem nesta pasta.')));
};

BASE.decision = (K, p) => {
  const m = D.inbox.find(x => x.id === p.id) || W.pending[0] || D.inbox.find(x => x.choices.length);
  const who = [['Diretor técnico', PT.staffNames.technical], ['Chefe de aerodinâmica', PT.staffNames.aero], ['Diretor comercial', (D.staff.find(s => s.role === 'commercial') || {}).name]];
  return K.page(K.head({ t: 'Decisão pendente', s: `${m.from} · etapa ${m.round}`, act: K.btn('Voltar à caixa', { kind: 'ghost', go: 'inbox' }) }),
    K.card({ t: m.title, body: `<p class="lead">${esc(m.body)}</p>` }) +
    `<div class="opts">${m.choices.map((c, i) => K.card({ cls: 'opt' + (i === 0 ? ' rec' : ''), body: `<div class="opt-n">Opção ${i + 1}</div><h3>${esc(c)}</h3>
      ${K.kv([['Custo', i === 0 ? money(2.5) : i === 1 ? 'nenhum agora' : money(0.8)], ['Chance de dar certo', i === 0 ? '70%' : i === 1 ? 'garantido' : '50%'], ['Efeito', i === 0 ? '+1,2 em aerodinâmica se funcionar' : i === 1 ? 'ganho no carro do ano que vem' : 'efeito pequeno']])}
      <p class="mu small">${esc(who[i % who.length][0])} (${esc(who[i % who.length][1] || '—')}) ${i === 0 ? 'recomenda esta opção.' : 'prefere esta opção.'}</p>${K.btn('Escolher', { kind: i === 0 ? 'pri' : 'sec' })}` })).join('')}</div>` +
    K.help('Decisões abertas bloqueiam o botão Avançar até serem respondidas. O prazo aparece no canto da mensagem.'));
};

BASE.calendar = (K, p) => {
  const months = [...new Set(cal.map(c => c.date.slice(0, 7)))];
  const mk = p.m || nextGP.date.slice(0, 7);
  const [y, m] = mk.split('-').map(Number);
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(); const off = (first.getDay() + 6) % 7;
  const ev = {};
  cal.filter(c => c.date.startsWith(mk)).forEach(c => { const d = +c.date.slice(8); (ev[d] = ev[d] || []).push({ k: 'f1', t: c.gp, go: 'circuit', p: { id: c.id }, done: c.done }); if (c.sprint) (ev[d - 1] = ev[d - 1] || []).push({ k: 'sprint', t: 'Sprint' }); (ev[d - 2] = ev[d - 2] || []).push({ k: 'tl', t: 'Treinos livres' }); });
  const extra = [[3, 'f2', 'F2 · Rodada 6'], [9, 'council', 'Conselho da FIA'], [12, 'build', 'Assoalho novo: fabricação'], [17, 'fe', 'Fórmula E · Rodada 10'], [21, 'market', 'Abre a janela do mercado'], [24, 'indy', 'IndyCar · Rodada 9'], [28, 'build', 'Obra: simulador nível 4']];
  extra.forEach(([d, k, t]) => { if (d <= days) (ev[d] = ev[d] || []).push({ k, t }); });
  const cells = []; for (let i = 0; i < off; i++) cells.push('<div class="cd off"></div>');
  for (let d = 1; d <= days; d++) { const iso = `${mk}-${String(d).padStart(2, '0')}`; cells.push(`<div class="cd${iso === D.meta.today ? ' today' : ''}"><span class="cd-n">${d}</span>${(ev[d] || []).map(e => `<a class="ev ev-${e.k}${e.done ? ' done' : ''}" ${e.go ? `data-go="${e.go}" data-p='${JSON.stringify(e.p)}'` : ''}>${esc(e.t)}</a>`).join('')}</div>`); }
  return K.page(K.head({ t: 'Calendário', s: `Temporada ${D.meta.year} · ${cal.length} GPs`, tabs: months.map(x => [x, MONTHS_L[+x.slice(5) - 1]]), tab: mk, tabKey: 'm' }),
    K.grid('1fr 300px', K.card({ flush: true, body: `<div class="calg"><div class="cwd">${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(x => `<span>${x}</span>`).join('')}</div><div class="cdays">${cells.join('')}</div></div>` }),
      K.card({ t: 'Legenda e filtros', body: `<div class="legend">${[['f1', 'Fórmula 1'], ['sprint', 'Sprint'], ['tl', 'Treinos'], ['f2', 'F2 e F3'], ['fe', 'Fórmula E'], ['indy', 'IndyCar'], ['council', 'Conselho da FIA'], ['build', 'Fábrica e P&D'], ['market', 'Mercado']].map(([k, t]) => `<label class="lg"><input type="checkbox" checked><i class="ev-${k}"></i>${t}</label>`).join('')}</div>` }) +
      K.card({ t: 'Temporada', body: K.list(cal.map(c => ({ go: 'circuit', p: { id: c.id }, lead: `<b class="num">${String(c.round).padStart(2, '0')}</b>`, title: c.gp, sub: `${dateS(c.date)} · ${c.place || ''}`, tail: c.done ? (c.winner ? `<span class="mu small">${esc(dabbr(c.winner))}</span>` : '') : c.round === nextGP.round ? K.chip('Próxima', 'r') : '' })), { compact: true }) })));
};

/* ===================== CORRIDA ===================== */
const trk = () => cal.find(c => c.id === D.pre.trackId) || nextGP;
BASE.weekend = (K) => {
  const t = trk(); const wx = D.pre.weather || {}; const air = wx.air || []; const wet = wx.wet || [];
  const sess = [['Sexta', 'Treino livre 1', '12:30'], ['Sexta', 'Treino livre 2', '16:00'], ['Sábado', 'Treino livre 3', '11:30'], ['Sábado', 'Classificação', '15:00'], ['Domingo', 'Corrida', '15:00']];
  const hrs = air.filter((_, i) => i % 3 === 0).slice(0, 18);
  return K.page(K.head({ t: t.gp, s: `${t.circuit} · ${t.place} · etapa ${t.round} de ${cal.length}`, act: K.btn('Ir para o treino livre', { kind: 'pri', go: 'practice' }) }),
    K.grid('1.3fr 1fr',
      K.card({ t: 'Programação', body: K.table([['Dia'], ['Sessão'], ['Horário local', 'r'], ['Estado', 'r']], sess.map((s, i) => [s[0], `<b>${s[1]}</b>`, s[2], i < 3 ? K.chip('Pronto', 'n') : K.chip('A seguir', 'n')])) }) +
      K.card({ t: 'Previsão do tempo', a: `Chance de chuva no fim de semana: <b>${Math.round((wx.pRain || 0) * 100)}%</b>`, body: `<div class="wx">${hrs.map((v, i) => { const w = wet[i * 3] || 0; return `<div class="wx-h"><span class="mu small">${String(10 + i).padStart(2, '0')}h</span><i class="wx-ic ${w > 0.15 ? 'rain' : w > 0.03 ? 'cloud' : 'sun'}"></i><b class="num">${nf(v, 0)}°</b><span class="wx-r" style="--w:${Math.round(w * 100)}%"></span></div>`; }).join('')}</div>` }),
      K.card({ t: 'O circuito', body: `<div class="trk-big">${trackSvg(t.shape, { w: 320, h: 200, start: true })}</div>${K.kv([['Voltas', t.laps], ['Extensão', nf(t.length, 3) + ' km'], ['Curvas', t.turns], ['Zonas de DRS', t.drs], ['Perda no pit', nf(t.pitLoss, 1) + ' s'], ['Ultrapassagem', t.overtaking >= 0.7 ? 'fácil' : t.overtaking >= 0.45 ? 'média' : 'difícil'], ['Desgaste de pneus', t.tyreStress >= 1.15 ? 'alto' : t.tyreStress >= 0.95 ? 'médio' : 'baixo']])}` }) +
      K.card({ t: 'Pneus para o fim de semana', body: `<div class="tyres">${[['S', 'C4', 8], ['M', 'C3', 3], ['H', 'C2', 2], ['I', '', 4], ['W', '', 3]].map(([c, cc, n]) => `<div class="ty">${K.tyre(c)}<b>${TYRE[c][0]}</b><span class="mu small">${cc} · ${n} jogos</span></div>`).join('')}</div>` })));
};

BASE.practice = (K, p) => {
  const ids = Object.keys(D.pre.setups || {}); const did = p.d || ids[0]; const s = D.pre.setups[did] || {}; const opt = D.pre.optimum[PT.id] || {};
  const run = (s.runs || [])[0] || {}; const fb = (run.fb && run.fb.items) || [];
  const sl = [['fwing', 'Asa dianteira', 'menos carga', 'mais carga'], ['rwing', 'Asa traseira', 'menos carga', 'mais carga'], ['susp', 'Suspensão', 'macia', 'rígida'], ['ride', 'Altura do carro', 'baixa', 'alta'], ['brake', 'Balanço de freio', 'traseira', 'dianteira']];
  const best = Object.entries(((D.pre.fp || {}).sessions || [])[0] ? D.pre.fp.sessions[0].best : {}).sort((a, b) => a[1].t - b[1].t).slice(0, 12);
  return K.page(K.head({ t: 'Treino livre 1', s: `${trk().gp} · 60 min · pista ${nf((D.pre.weather.trackT || [30])[0], 0)}°`, tabs: ids.map(i => [i, dname(i)]), tab: did, tabKey: 'd', act: K.btn('Mandar para a pista', { kind: 'pri' }) }),
    K.grid('1.2fr 1fr',
      K.card({ t: 'Acerto do carro', a: 'Confiança no acerto: <b>72%</b>', body: `<div class="setup">${sl.map(([k, n, lo, hi]) => `<div class="sl"><div class="sl-h"><b>${n}</b><span class="num">${s[k]}</span></div><div class="sl-t"><i style="left:${s[k]}%"></i><em style="left:${opt[k] - 6}%;width:12%"></em></div><div class="sl-l"><span>${lo}</span><span>${hi}</span></div></div>`).join('')}</div>${K.help('A faixa clara é onde o engenheiro acha que está o acerto ideal. Ela fica mais estreita a cada saída do piloto.')}` }) +
      K.card({ t: 'Programa da próxima saída', body: `<div class="seg">${['Acerto', 'Classificação', 'Ritmo de corrida', 'Pneus', 'Largadas'].map((x, i) => `<button type="button" class="${i ? '' : 'on'}">${x}</button>`).join('')}</div>${K.kv([['Pneu', 'Médio (C3), novo'], ['Combustível', 'leve: 30 kg'], ['Voltas', '6']])}` }),
      K.card({ t: `Retorno de ${dlast(did)}`, body: `<div class="fb">${fb.slice(0, 5).map(f => `<div class="fb-i ${f.lvl ? 'warn' : 'ok'}"><span class="fb-c">${({ balance: 'Equilíbrio', braking: 'Frenagem', corners: 'Curvas', traction: 'Tração', straights: 'Retas' })[f.cat] || f.cat}</span><p>“${esc(f.text)}”</p></div>`).join('') || '<p class="mu">Sem retorno ainda.</p>'}</div>` }) +
      K.card({ t: 'Tempos da sessão', body: K.table([['', 'c'], ['Piloto'], ['Pneu', 'c'], ['Tempo', 'r']], best.map(([id, b], i) => [i + 1, K.who(id, b.tid), K.tyre(b.c), `<span class="num">${lap(b.t)}</span>`]), { hl: (r, i) => best[i][1].tid === PT.id }) })));
};

BASE.quali = (K) => {
  const Q = D.quali; const rows = Q.order.map(id => Q.res[id]);
  const cut = (i) => i === 9 ? 'cut' : i === 14 ? 'cut' : '';
  return K.page(K.head({ t: 'Classificação', s: `${trk().gp} · Q3 encerrado`, tabs: [['q1', 'Q1'], ['q2', 'Q2'], ['q3', 'Q3']], tab: 'q3' }),
    K.grid('1fr 340px',
      K.card({ flush: true, body: K.table([['', 'c'], ['Piloto'], ['Q1', 'r'], ['Q2', 'r'], ['Q3', 'r'], ['Diferença', 'r']], rows.map((r, i) => [K.pos(i + 1), K.who(r.did, r.tid), `<span class="num">${lap(r.times.Q1)}</span>`, `<span class="num">${r.times.Q2 ? lap(r.times.Q2) : ''}</span>`, `<span class="num">${r.times.Q3 ? lap(r.times.Q3) : ''}</span>`, `<span class="num mu">${i ? '+' + (r.best - rows[0].best).toFixed(3) : 'pole'}</span>`]), { hl: (r, i) => rows[i].tid === PT.id, rowCls: cut }) }),
      K.card({ t: 'Seus pilotos', body: myDrivers.map(d => { const r = Q.res[d.id] || {}; return `<div class="qd">${K.av(d, 44)}<div><b>${esc(d.name)}</b><div class="mu small">${r.pos ? r.pos + 'º no grid' : '—'}</div></div><span class="num big">${lap(r.best)}</span></div>`; }).join('') + K.help('Durante a sessão: escolha quando sair, o pneu e se faz uma ou duas voltas rápidas. O corte de cada fase aparece como uma linha vermelha.') }) +
      K.card({ t: 'Grid de largada', body: `<div class="gridv">${rows.slice(0, 10).map((r, i) => `<div class="gs ${i % 2 ? 'r' : 'l'}"><span class="num">${i + 1}</span><i style="background:${tcol(r.tid)}"></i>${esc(dabbr(r.did))}</div>`).join('')}</div>` })));
};

BASE.strategy = (K) => {
  const st = D.pre.strategy || {}; const t = trk();
  const plan = (s) => s.stops === 1 ? [[s.startTyre, 0, 0.45], ['H', 0.45, 1]] : [[s.startTyre, 0, 0.3], ['M', 0.3, 0.65], [s.startTyre === 'S' ? 'M' : 'S', 0.65, 1]];
  return K.page(K.head({ t: 'Estratégia da corrida', s: `${t.gp} · ${t.laps} voltas · perda no pit ${nf(t.pitLoss, 1)} s` }),
    myDrivers.map(d => { const s = st[d.id] || { startTyre: 'M', stops: 2, pitWear: 68 }; return K.card({ t: d.name, a: `${s.stops} parada${s.stops > 1 ? 's' : ''} · troca com ${s.pitWear}% de desgaste`, body: `<div class="stint">${plan(s).map(([c, a, b]) => `<div class="st st-${TYRE[c][1]}" style="left:${a * 100}%;width:${(b - a) * 100}%"><span>${TYRE[c][0]}</span><small>voltas ${Math.round(a * t.laps) + 1}–${Math.round(b * t.laps)}</small></div>`).join('')}</div>
      <div class="seg">${['1 parada', '2 paradas', '3 paradas'].map((x, i) => `<button type="button" class="${i + 1 === s.stops ? 'on' : ''}">${x}</button>`).join('')}</div>${K.kv([['Pneu de largada', TYRE[s.startTyre][0]], ['Paradas automáticas', s.auto ? 'sim, o estrategista decide' : 'não'], ['Tempo estimado', '1:31:12 (±18 s)']])}` }); }).join('') +
    K.card({ t: 'Comparação de estratégias', body: K.table([['Plano'], ['Tempo total', 'r'], ['Risco', 'c'], ['Melhor se']], [['Médio → Duro (1 parada)', '1:31:24', K.chip('baixo', 'g'), 'sem Safety Car'], ['Macio → Médio → Médio (2)', '1:31:12', K.chip('médio', 'y'), 'pneus caírem cedo'], ['Macio → Duro → Macio (2)', '1:31:19', K.chip('alto', 'r'), 'Safety Car na metade']]) }));
};

BASE.race = (K) => {
  const L = D.live;
  return K.page(K.head({ t: trk().gp, s: `Volta ${L.lap} de ${L.laps}` }),
    K.grid('380px 1fr', K.card({ flush: true, body: K.table([['', 'c'], ['Piloto'], ['Intervalo', 'r'], ['Pneu', 'c']], W.liveCars.map(c => [K.pos(c.pos), K.who(c.did, c.tid), `<span class="num">${c.pos === 1 ? 'Líder' : '+' + c.int.toFixed(3)}</span>`, K.tyre(c.tyre.c)]), { hl: (r, i) => W.liveCars[i].tid === PT.id }) }),
      K.card({ t: 'Mapa', body: trackSvg(trk().shape, { w: 600, h: 380 }) })));
};

BASE.podium = (K) => {
  const c = D.last.cls.slice(0, 3);
  return K.page(K.head({ t: 'Pódio', s: D.last.gp }), `<div class="pod">${[1, 0, 2].map(i => `<div class="pod-s p${i + 1}">${K.av(drv(c[i].did), 120)}<b>${esc(dname(c[i].did))}</b><span>${esc(tname(c[i].tid))}</span><em>${i + 1}</em></div>`).join('')}</div>`);
};

BASE.post = (K) => {
  const L = D.last; const mine = L.cls.filter(r => r.tid === PT.id);
  return K.page(K.head({ t: `Resultado · ${L.gp}`, s: `${L.laps} voltas`, act: K.btn('Avançar', { kind: 'pri', go: 'hub' }) }),
    K.grid('1.4fr 1fr', K.card({ flush: true, body: K.table([['', 'c'], ['Piloto'], ['Largou', 'c'], ['Tempo / situação', 'r'], ['Paradas', 'c'], ['Pontos', 'r']], L.cls.map(r => [K.pos(r.pos), K.who(r.did, r.tid), r.grid, r.status === 'fin' ? (r.pos === 1 ? `<span class="num">${lap(r.T)}</span>` : `<span class="num">+${(r.T - L.cls[0].T).toFixed(3)}</span>`) : `<span class="mu">${esc(r.reason || r.status)}</span>`, r.pits, r.pts ? `<b class="num">${r.pts}</b>` : '']), { hl: (r, i) => L.cls[i].tid === PT.id }) }),
      K.card({ t: 'Sua corrida', body: mine.map(r => `<div class="qd">${K.av(drv(r.did), 44)}<div><b>${esc(dname(r.did))}</b><div class="mu small">largou ${r.grid}º · ${r.pits} paradas</div></div><span class="num big">${r.pos}º</span></div>`).join('') })));
};

BASE.analysis = (K) => {
  const L = D.last; const ids = L.cls.slice(0, 10).map(r => r.did);
  const cars = L.cars.filter(c => ids.includes(c.did) || c.tid === PT.id);
  const w = 820, h = 300, n = L.laps;
  const lines = cars.map(c => { const pts = (c.positions || []).map((p, i) => (p == null || p > 22) ? null : `${(i / n * w).toFixed(1)},${((p - 1) / 21 * (h - 10) + 5).toFixed(1)}`).filter(Boolean).join(' '); return `<polyline points="${pts}" fill="none" stroke="${tcol(c.tid)}" stroke-width="${c.tid === PT.id ? 3 : 1.4}" opacity="${c.tid === PT.id ? 1 : 0.55}"/>`; }).join('');
  return K.page(K.head({ t: 'Análise de dados', s: `${L.gp} · posições volta a volta`, tabs: [['pos', 'Posições'], ['ritmo', 'Ritmo'], ['stints', 'Pneus'], ['pits', 'Paradas']], tab: 'pos' }),
    K.card({ t: 'Posição por volta', body: `<svg class="chart" viewBox="0 0 ${w} ${h}">${[1, 5, 10, 15, 20].map(p => `<line x1="0" x2="${w}" y1="${(p - 1) / 21 * (h - 10) + 5}" y2="${(p - 1) / 21 * (h - 10) + 5}" class="gl"/><text x="${w - 4}" y="${(p - 1) / 21 * (h - 10) + 1}" class="gt" text-anchor="end">${p}º</text>`).join('')}${lines}</svg>` }) +
    K.card({ t: 'Stints de pneus', body: `<div class="stints">${L.cls.slice(0, 12).map(r => { const c = L.cars.find(x => x.did === r.did) || {}; return `<div class="sr"><span class="sr-n">${esc(dabbr(r.did))}</span><div class="sr-b">${(c.stints || []).map(s => `<i class="st-${(TYRE[s.c] || ['', 'med'])[1]}" style="left:${s.from / L.laps * 100}%;width:${((s.to || L.laps) - s.from) / L.laps * 100}%">${s.c}</i>`).join('')}</div></div>`; }).join('')}</div>` }));
};

/* ===================== EQUIPE ===================== */
BASE.drivers = (K) => K.page(K.head({ t: 'Pilotos', s: `${PT.name} · temporada ${D.meta.year}` }),
  K.grid('1fr 1fr', ...myDrivers.map(d => K.card({ go: 'driver', p: { id: d.id }, body: `<div class="dc">${K.av(d, 96)}<div><h3>${esc(d.name)}</h3><p class="mu">${flag(d.nat)} ${d.age} anos · nº ${d.num}</p>${K.kv([['Nota', K.ring(d.ovr, { size: 48 })], ['Campeonato', d.season ? d.season.pos + 'º · ' + d.season.pts + ' pts' : '—'], ['Contrato', 'até ' + (d.contract ? d.contract.until : '—')], ['Moral', d.morale]])}</div></div>` }))) +
  K.card({ t: 'Reservas e academia', body: K.empty('Reserva: nenhum piloto contratado. A academia tem pilotos prontos para testar no simulador.', K.btn('Ver academia', { kind: 'sec', go: 'academy' })) }));

BASE.driver = (K, p) => {
  const d = drv(p.id) || myDrivers[1] || myDrivers[0];
  return K.page(K.head({ t: d.name, s: `${tname(d.team)} · nº ${d.num}` }),
    K.grid('1fr 1fr', K.card({ t: 'Atributos', body: ATTR_GROUPS.map(([g, ks]) => `<h4 class="sec">${g}</h4>` + ks.map(k => K.attr(ATTR[k], d.attrs[k])).join('')).join('') }),
      K.card({ t: 'Carreira', body: K.kv([['Largadas', d.career.starts], ['Vitórias', d.career.wins], ['Pódios', d.career.podiums], ['Poles', d.career.poles], ['Títulos', d.career.titles]]) })));
};

BASE.staff = (K) => {
  const S = D.staff; const by = (r) => S.find(s => s.role === r);
  const groups = [['Comando', ['principal', 'sporting']], ['Técnico', ['technical', 'engineeringDir', 'chiefEngineer', 'aero', 'performance']], ['Pista', ['raceEng1', 'raceEng2', 'strategy', 'chiefMechanic']], ['Negócios', ['operations', 'commercial', 'marketing']]];
  return K.page(K.head({ t: 'Funcionários', s: `${S.length} cargos · folha anual ${money(S.reduce((a, s) => a + s.salary, 0))}`, act: K.btn('Mercado de funcionários', { kind: 'sec', go: 'staffmarket' }) }),
    `<div class="org">${groups.map(([g, roles]) => `<div class="org-c"><h4 class="sec">${g}</h4>${roles.map(by).filter(Boolean).map(s => K.card({ cls: 'person', body: `<div class="pp">${K.av({ name: s.isPlayer ? D.meta.player.name : s.name }, 40)}<div><b>${esc(s.isPlayer ? D.meta.player.name + ' (você)' : s.name)}</b><div class="mu small">${esc(ROLE[s.role] || s.role)}</div></div>${K.ring(s.rating, { size: 40 })}</div><div class="pp-f"><span>${money(s.salary)}/ano</span><span>até ${s.until}</span></div>` })).join('')}</div>`).join('')}</div>`);
};

BASE.academy = (K) => {
  const A = D.academies.find(a => a.team === PT.id) || D.academies[0];
  return K.page(K.head({ t: A.name, s: `Nível ${A.level} · orçamento ${money(A.budget)}/ano · ${A.members.length} pilotos` }),
    K.card({ flush: true, body: K.table([['Piloto'], ['Categoria'], ['Idade', 'c'], ['Nota', 'c'], ['Nível estimado'], ['Próximo passo']], A.members.map((id, i) => [`<b>${esc(W.pretty(id))}</b>`, ['F2', 'F3', 'IndyCar', 'FRECA', 'F4 Britânica', 'F2', 'F1 Academy', 'F3', 'Super Formula'][i % 9], 17 + (i * 3) % 8, 66 + (i * 7) % 14, K.stars(2.5 + (i % 5) * 0.5), ['Ficar mais um ano', 'Subir para a F2', 'Testar na F1', 'Subir para a F3', 'Emprestar a uma equipe'][i % 5]])) }));
};

BASE.scout = (K) => {
  const S = D.scout; const REG = { eu: 'Europa', am: 'Américas', sa: 'América do Sul', ap: 'Ásia e Pacífico', me: 'Oriente Médio e África' };
  return K.page(K.head({ t: 'Olheiros', s: `${S.staff.length} de 6 vagas · folha ${money(S.staff.reduce((a, s) => a + s.salary, 0), 2)}/ano` }),
    K.grid('1fr 1fr', K.card({ t: 'Departamento', body: K.table([['Olheiro'], ['Região'], ['Avaliação', 'c'], ['Missão']], S.staff.map(s => [`${flag(s.nat)} <b>${esc(s.name)}</b>`, REG[s.region] || s.region, K.ring(s.judge, { size: 36 }), s.task ? (s.task.kind === 'cat' ? 'Observar a ' + s.task.cat.toUpperCase() : 'Percorrer ' + (REG[s.task.region] || s.task.region)) : K.chip('Livre', 'y')])) }),
      K.card({ t: 'Contratar', body: K.table([['Olheiro'], ['Região'], ['Avaliação', 'c'], ['Salário', 'r']], S.mkt.slice(0, 6).map(s => [`${flag(s.nat)} ${esc(s.name)}`, REG[s.region] || s.region, s.judge, money(s.salary, 2)])) })));
};

BASE.sister = (K) => {
  const parts = Object.entries(D.partners || {});
  return K.page(K.head({ t: 'Equipe irmã e parcerias', s: 'Acordos técnicos, peças compartilhadas e pilotos emprestados' }),
    K.grid('1fr 1fr', ...parts.map(([tid, pp]) => K.card({ t: tname(tid), a: 'parceira de ' + tname(pp.parent || pp.of || ''), body: `<div class="mu">Recebe: ${esc((pp.parts || []).join(', ') || 'motor e câmbio')}</div>` }))));
};

/* ===================== CARRO ===================== */
BASE.car = (K) => {
  const keys = Object.keys(CAR);
  const best = (k) => Math.max(...D.teams.map(t => t.car[k] || 0));
  const rank = (k) => [...D.teams].sort((a, b) => (b.car[k] || 0) - (a.car[k] || 0)).findIndex(t => t.id === PT.id) + 1;
  return K.page(K.head({ t: `${PT.chassis || 'Carro'} · ${PT.name}`, s: `Motor ${PT.pu || PT.engine} · equipe de pit ${nf(PT.pitCrew, 0)}` }),
    K.grid('1.2fr 1fr', K.card({ body: `<img class="carimg" src="${W.carUrl(PT)}" alt="">` }),
      K.card({ t: 'Comparado ao grid', body: K.table([['Área'], ['Seu carro', 'r'], ['Melhor', 'r'], ['Posição', 'c']], keys.map(k => [CAR[k], `<b class="num">${nf(PT.car[k], 1)}</b>`, `<span class="num mu">${nf(best(k), 1)}</span>`, rank(k) + 'º'])) })));
};

BASE.rnd = (K) => K.page(K.head({ t: 'Projetos de P&D', s: `${D.projects.length} em andamento` }),
  K.card({ body: K.table([['Projeto'], ['Etapa'], ['Custo', 'r']], D.projects.map(pr => [pr.name, pr.stage === 'design' ? 'Desenho' : 'Fabricação', money(pr.cost)])) }));

BASE.newproject = (K, p) => {
  const area = p.area || 'floor'; const spec = D.rndSpec[area]; const kind = spec.kind; const foc = D.rndFocus[kind] || [];
  const parts = Object.entries(D.rndSpec).filter(([k]) => k !== 'facilities');
  const PN = { frontWing: 'Asa dianteira', rearWing: 'Asa traseira', floor: 'Assoalho', sidepods: 'Laterais e carenagem', suspension: 'Suspensão', chassis: 'Chassi', weight: 'Redução de peso', brakes: 'Freios', cooling: 'Refrigeração', gearbox: 'Câmbio', tyreCare: 'Gestão de pneus', engine: 'Motor', energy: 'Energia (ERS)', reliability: 'Confiabilidade', pitCrew: 'Equipe de pit' };
  return K.page(K.head({ t: 'Novo projeto', s: 'Configure a peça e veja a previsão antes de aprovar', act: K.btn('Aprovar projeto', { kind: 'pri' }) }),
    K.grid('300px 1fr 320px',
      K.card({ t: 'Peça', flush: true, body: K.list(parts.map(([k, s]) => ({ on: k === area, go: 'newproject', p: { area: k }, title: PN[k] || k, sub: { aero: 'Aerodinâmica', mech: 'Mecânica', pu: 'Unidade de potência', team: 'Equipe' }[s.kind], tail: `<span class="num mu small">${money(s.cost)}</span>` })), { compact: true }) }),
      K.card({ t: PN[area] || area, body: `<h4 class="sec">Foco</h4><div class="seg">${foc.map((f, i) => `<button type="button" class="${i ? '' : 'on'}" title="${esc(f[2])}">${esc(f[1])}</button>`).join('')}</div>
        <h4 class="sec">Ambição</h4><div class="seg">${Object.entries(D.rndAmb).map(([k, a]) => `<button type="button" class="${k === 'balanced' ? 'on' : ''}">${esc(a.name)}</button>`).join('')}</div>
        <h4 class="sec">Recursos</h4>${K.slider('Túnel de vento', spec.wt, 0, 160, 'execuções')}${K.slider('CFD', spec.cfd, 0, 900, 'simulações')}
        <h4 class="sec">Para qual carro</h4><div class="seg"><button type="button" class="on">Carro atual</button><button type="button">Carro de ${D.meta.year + 1}</button></div>` }),
      K.card({ t: 'Previsão', body: K.kv([['Custo', money(spec.cost)], ['Desenho', spec.days + ' dias'], ['Fabricação', spec.build + ' dias por peça'], ['Ganho esperado', `+${nf(spec.base * 0.7, 1)} a +${nf(spec.base * 1.6, 1)}`], ['Risco de falhar', '8%'], ['Teto restante depois', money(W.capRoom - spec.cost)]]) + K.help('O ganho real só aparece na pista. Um projeto agressivo pode render mais, mas atrasa e falha com mais frequência.') })));
};

BASE.regs = (K) => {
  const appr = (D.council.history || []).flatMap(h => h.props.filter(p => p.result === 'aprovada').map(p => ({ ...p, gp: h.gp, year: h.year })));
  return K.page(K.head({ t: 'Regulamento', s: `Temporada ${D.meta.year} e mudanças aprovadas` }),
    K.grid('1fr 1fr', K.card({ t: `Regras de ${D.meta.year}`, body: K.kv([['Teto orçamentário', 'US$ 215 mi'], ['Motor', 'V6 turbo híbrido, 50% elétrico'], ['Combustível', '100% sustentável'], ['Aerodinâmica ativa', 'sim (modo X e modo Z)'], ['Túnel de vento (ATR)', 'escala por posição no campeonato'], ['Pontos', 'até o 10º lugar'], ['Sprints', '6 por temporada']]) }),
      K.card({ t: 'Mudanças aprovadas', body: appr.length ? K.list(appr.map(a => ({ title: a.title, sub: `${a.gp} · vale a partir de ${a.eff}`, tail: K.chip(a.yes + ' a ' + a.no, 'g') }))) : K.empty('Nenhuma mudança aprovada nesta temporada.') })));
};

/* ===================== FÁBRICA ===================== */
BASE.facilities = (K, p) => {
  const ids = Object.keys(D.fac.B); const sel = p.id || 'tunel'; const f = PT.fac[sel] || {}; const B = D.fac.B[sel];
  const gridAvg = (id) => D.teams.reduce((a, t) => a + ((t.fac && t.fac[id] && t.fac[id].lvl) || 0), 0) / D.teams.length;
  return K.page(K.head({ t: 'Sede e fábrica', s: `Índice de instalações ${nf(PT.facilities, 1)} · ${ids.length} prédios` }),
    K.grid('1fr 340px', K.card({ flush: true, body: K.table([['Prédio'], ['Nível', 'c'], ['Estado', 'r'], ['Média do grid', 'c']], ids.map(id => [`<a data-go="facilities" data-p='{"id":"${id}"}'><b>${esc(D.fac.B[id][0])}</b></a>`, (PT.fac[id] || {}).lvl || 0, nf((PT.fac[id] || {}).cond, 0) + '%', nf(gridAvg(id), 1)])) }),
      K.card({ t: B[0], body: K.kv([['Nível', f.lvl + ' de 5'], ['Estado', nf(f.cond, 0) + '%'], ['Efeito', esc(D.fac.eff[sel][0])]]) })));
};
})();
