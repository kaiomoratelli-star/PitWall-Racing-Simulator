'use strict';
/* ---------- Conversas com os pilotos (0.8.6-A) ---------- */
SCREENS.talks = {
  html() {
    if (Career.isObs(G) || typeof Talks === 'undefined') return K85.empty(byLang('Disponível só no modo carreira.', 'Available in career mode only.'));
    const ds = Career.teamDrivers(G, G.player.teamId).sort((a, b) => (a.seat === 'R' ? 9 : a.seat) - (b.seat === 'R' ? 9 : b.seat));
    if (!ds.length) return K85.empty(byLang('Sem pilotos na equipe.', 'No drivers in the team.'));
    const sel = Career.driver(G, UI.talkDid) || ds[0]; UI.talkDid = sel.id;
    const T = UI.talk && UI.talk.did === sel.id && UI.talk.y === G.season.year && UI.talk.r === G.season.round ? UI.talk : null;
    const mates = ds.filter(d => d.seat !== 'R');
    const chem = mates.length === 2 ? People.chem(G, mates[0].id, mates[1].id) : null;
    const trustBar = (d) => { const v = Math.round(People.trust(d)); return `${K85.bar(v, 100, v >= 65 ? 'var(--green)' : v >= 40 ? 'var(--yellow)' : 'var(--red)', 90)} <b class="n-num">${v}</b>`; };
    const list = ds.map(d => `<button class="tk86-d ${d.id === sel.id ? 'on' : ''}" data-act="talkSel86" data-v="${d.id}" style="--tc:${Career.team(G).color}">${K85.av(d, 44)}<span><b>${esc(d.name)}</b><small>${d.seat === 'R' ? byLang('Reserva', 'Reserve') : byLang('Carro', 'Car') + ' #' + d.seat} · ${esc(byLang(...Talks.ARCH[Talks.arch(d)]))}</small><small>${byLang('Confiança', 'Trust')} ${trustBar(d)}</small><small>${byLang('Moral', 'Morale')} <b class="n-num">${Math.round(d.morale ?? 70)}</b>${Talks.canTalk(G, d) ? '' : ` · <em class="n-mu">${byLang('já conversaram nesta etapa', 'already talked this round')}</em>`}</small></span></button>`).join('');
    const causes = People.causes(G, sel);
    const causeHtml = causes.length ? causes.map(c => `<span class="tk86-c ${c.v >= 0 ? 'up' : 'dn'}"><b class="n-num">${c.v >= 0 ? '+' : ''}${c.v}</b>${esc(c.name)}</span>`).join('') : `<small class="n-mu">${byLang('Sem mudanças recentes.', 'No recent changes.')}</small>`;
    let talk;
    if (!Talks.canTalk(G, sel) && !(T && T.res)) talk = `<p class="n-mu">${byLang(`Você já conversou com ${esc(shortName(sel))} nesta etapa. Volte depois da próxima corrida.`, `You already talked to ${esc(shortName(sel))} this round. Come back after the next race.`)}</p>`;
    else if (!T) talk = `<p class="n-mu">${byLang('Chame o piloto para uma conversa. O assunto vem do momento dele: resultados, companheiro, contrato, promessas, ordens...', 'Call the driver in for a talk. The topic comes from his situation: results, team-mate, contract, promises, orders...')}</p><button class="btn primary" data-act="talkStart86">${byLang('Chamar para conversar', 'Call in for a talk')}</button>`;
    else {
      const face = K85.av(sel, 56);
      talk = `<div class="tk86-chat"><div class="tk86-b them">${face}<p>${esc(T.open)}</p></div>
        ${T.res ? `<div class="tk86-b me"><p>${esc(T.chosen)}</p></div><div class="tk86-b them ${T.res.tone}">${face}<p>${esc(T.res.reply)}</p></div>
          <div class="tk86-fx"><span>${byLang('Moral', 'Morale')} <b class="n-num ${T.res.mood >= 0 ? 'n-gain' : 'n-loss'}">${T.res.mood >= 0 ? '+' : ''}${T.res.mood}</b></span><span>${byLang('Confiança', 'Trust')} <b class="n-num ${T.res.trust >= 0 ? 'n-gain' : 'n-loss'}">${T.res.trust >= 0 ? '+' : ''}${T.res.trust}</b></span>${T.res.promise ? `<span>${K85.tag(byLang('Promessa registrada', 'Promise recorded'), 'acc')} ${esc(People.promiseText(T.res.promise.kind))}</span>` : ''}</div>`
        : `<div class="tk86-o">${T.opts.map(o => `<button class="btn" data-act="talkAns86" data-v="${o.k}">${esc(o.label)}</button>`).join('')}</div>`}</div>`;
    }
    const prom = People.promises(G).filter(p => ds.some(d => d.id === p.did) && p.y === G.season.year).slice().reverse().slice(0, 8);
    const ST = { open: [byLang('Em aberto', 'Open'), ''], kept: [byLang('Cumprida', 'Kept'), 'pos'], broken: [byLang('Quebrada', 'Broken'), 'neg'], void: [byLang('Anulada', 'Void'), ''] };
    const promHtml = prom.length ? K85.table([[byLang('Piloto', 'Driver')], [byLang('Promessa', 'Promise')], [byLang('Prazo', 'Due'), 'c'], [byLang('Situação', 'Status')]], prom.map(p => [K85.who(p.did, { tid: G.player.teamId }), `<small>${esc(People.promiseText(p.kind))}</small>`, `<span class="n-num">${byLang('etapa', 'round')} ${p.due}</span>`, K85.tag(ST[p.state][0], ST[p.state][1])])) : K85.empty(byLang('Nenhuma promessa neste ano.', 'No promises this year.'));
    const hist = (sel.talkLog || []).slice().reverse().slice(0, 6);
    const histHtml = hist.length ? hist.map(h => `<div class="tk86-h ${h.tone}"><small>${h.y} · ${byLang('etapa', 'round')} ${h.r}</small><span>${esc(h.reply)}</span><em class="n-num">${h.mood >= 0 ? '+' : ''}${h.mood} / ${h.trust >= 0 ? '+' : ''}${h.trust}</em></div>`).join('') : `<small class="n-mu">${byLang('Nenhuma conversa ainda.', 'No talks yet.')}</small>`;
    return K85.head({ t: byLang('Conversas', 'Talks'), s: byLang('Relação com os pilotos: confiança, promessas e humor', 'Relationship with the drivers: trust, promises and mood') }) +
      K85.grid('minmax(0,0.9fr) minmax(0,1.6fr)',
        K85.col(K85.card({ t: byLang('Pilotos', 'Drivers'), body: `<div class="tk86-list">${list}</div>` }),
          chem != null ? K85.card({ t: byLang('Química entre os titulares', 'Chemistry between the race drivers'), body: `<div class="tk86-chem"><b class="n-num ${chem >= 15 ? 'n-gain' : chem <= -15 ? 'n-loss' : ''}">${chem > 0 ? '+' : ''}${chem}</b><span>${esc(People.chemLabel(chem))}</span></div><p class="n-mu n-sm">${byLang('Sobe com a convivência e ordens justas; cai com batidas entre os dois, ordens a favor de um só e briga pelo posto de nº 1. Alta: os dois trocam dados e chegam mais confiantes à classificação. Baixa: ignoram mais as ordens e vazam coisas para a imprensa.', 'Rises with time together and fair orders; drops with crashes between them, orders favouring one, and fights for number one status. High: they share data and reach qualifying more confident. Low: they ignore orders more and leak to the press.')}</p>` }) : ''),
        K85.col(K85.card({ t: `${byLang('Conversa com', 'Talk with')} ${sel.name}`, a: `<small class="n-mu">${esc(byLang(...Talks.ARCH[Talks.arch(sel)]))}</small>`, body: `<div class="tk86-cz"><small>${byLang('O que mais mexeu com o humor dele', 'What moved his mood the most')}</small>${causeHtml}</div>${talk}` }),
          K85.card({ t: byLang('Promessas', 'Promises'), flush: true, body: promHtml }),
          K85.card({ t: byLang('Conversas anteriores', 'Previous talks'), body: histHtml })));
  },
};
ACT.talkSel86 = (el) => { UI.talkDid = el.dataset.v; render(); };
ACT.talkStart86 = () => { const t = Talks.start(G, UI.talkDid); if (!t) return; UI.talk = Object.assign(t, { y: G.season.year, r: G.season.round }); render(); };
ACT.talkAns86 = (el) => {
  const T = UI.talk; if (!T || T.res) return;
  const o = T.opts.find(x => x.k === el.dataset.v); const res = Talks.answer(G, T.did, T.topic, el.dataset.v);
  if (!res) return toast(byLang('Já conversaram nesta etapa.', 'Already talked this round.'), 'bad');
  T.res = res; T.chosen = o ? o.label.replace(/^[^:]+:\s*/, '') : ''; autosave(); render();
};
