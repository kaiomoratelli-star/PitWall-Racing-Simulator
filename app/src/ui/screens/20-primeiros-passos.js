'use strict';
/* ---------- Primeiros passos e dicas por tela (0.8.7) ----------
   - Na Central de uma carreira nova: roteiro de 8 passos que se marcam sozinhos conforme o jogador avança.
   - Na primeira visita a cada tela: uma dica curta, com "Entendi" e "Desligar dicas".
   Fica no navegador/aplicativo (localStorage), não no save: não muda o jogo nem a simulação. */
const Tut = {
  K: 'pitwall-tut',
  get() { try { return JSON.parse(localStorage.getItem(Tut.K) || '{}') || {}; } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem(Tut.K, JSON.stringify(o)); } catch (e) { /* sem armazenamento: só não lembra */ } },
  car(st) { const k = G ? String(G.seed) : '-'; st.careers = st.careers || {}; return (st.careers[k] = st.careers[k] || { v: {} }); },
  visit(view) {
    if (!G) return; const st = Tut.get(); const c = Tut.car(st);
    if (c.v[view]) return; c.v[view] = 1;
    const keys = Object.keys(st.careers); if (keys.length > 6) delete st.careers[keys[0]];   // só as carreiras recentes
    Tut.set(st);
  },
};
/* passos: [id, texto PT, texto EN, tela, feito?] */
Tut.STEPS = [
  ['inbox', 'Leia a caixa de entrada e responda às decisões', 'Read your inbox and answer the decisions', 'inbox', (G, v) => v.inbox],
  ['team', 'Conheça seus pilotos e a equipe', 'Meet your drivers and staff', 'team', (G, v) => v.team || v.mano],
  ['car', 'Veja o carro e o plano de desenvolvimento', 'Check the car and the development plan', 'car', (G, v) => v.car || v.dev],
  ['money', 'Confira o orçamento e o teto de gastos', 'Check the budget and the cost cap', 'finance', (G, v) => v.finance],
  ['go', 'Use "Avançar" (canto superior direito) para ir ao fim de semana', 'Use "Advance" (top right) to reach the race weekend', 'calendar', (G) => !!G.weekend || G.season.results.length > 0],
  ['fp', 'No treino, ajuste o acerto até a confiança subir', 'In practice, adjust the setup until confidence rises', 'weekend', (G) => G.season.results.length > 0 || !!(G.weekend && (G.weekend.quali || G.weekend.race))],
  ['race', 'Corra: escolha pneus, paradas e use o rádio', 'Race: choose tyres, stops and use the radio', 'weekend', (G) => G.season.results.length > 0],
  ['after', 'Depois da corrida, veja a análise e a classificação', 'After the race, check the analysis and the standings', 'analysis', (G, v) => G.season.results.length > 0 && (v.analysis || v.standings || v.post)],
];
function tutCard85() {
  if (!G || Career.isObs(G)) return '';
  const st = Tut.get(); if (st.off) return '';
  const c = Tut.car(st); if (c.hidden) return '';
  const done = Tut.STEPS.map(s => !!s[4](G, c.v));
  if (done.every(Boolean) || G.season.results.length >= 4 || (G.history || []).length > 0) return '';
  const n = done.filter(Boolean).length;
  return K85.card({ t: byLang('Primeiros passos', 'First steps'), a: `${K85.tag(`${n}/${Tut.STEPS.length}`, n ? 'pos' : '')} <button class="btn sm ghost" data-act="tutHide">${byLang('Esconder', 'Hide')}</button>`, cls: 'tut85',
    body: `<ol class="tut85-l">${Tut.STEPS.map((s, i) => `<li class="${done[i] ? 'ok' : ''}"><span class="tut85-n">${done[i] ? '✓' : i + 1}</span><span>${byLang(s[1], s[2])}</span>${done[i] ? '' : `<button class="btn sm" data-act="go" data-v="${s[3]}">${byLang('Abrir', 'Open')}</button>`}</li>`).join('')}</ol>` });
}
/* dicas da primeira visita */
Tut.TIPS = {
  hub: ['A Central reúne o que importa agora: próxima corrida, pendências e o estado da equipe. "Avançar" só anda quando as pendências estão resolvidas.', 'The hub gathers what matters now: next race, pending items and team status. "Advance" only moves on once pending items are settled.'],
  inbox: ['Mensagens com "decidir" travam o avanço até você escolher. Avisos de rotina da mesma etapa ficam juntos no "Resumo da etapa".', 'Messages marked "decide" block progress until you choose. Routine notices from the same round are grouped in the "Round summary".'],
  calendar: ['O calendário mostra as etapas, treinos, reuniões do Conselho e entregas da fábrica, dia a dia.', 'The calendar shows rounds, practice, Council meetings and factory deliveries, day by day.'],
  weekend: ['O fim de semana anda por fases: treino, classificação, estratégia e corrida. No treino, a confiança do piloto sobe com o acerto certo.', 'The weekend runs in phases: practice, qualifying, strategy and race. In practice, driver confidence rises with the right setup.'],
  team: ['Moral, química e contrato de cada piloto mudam o rendimento. Converse com eles em "Conversas".', 'Each driver\'s morale, chemistry and contract affect performance. Talk to them in "Talks".'],
  car: ['Cada peça tem vida útil (de 100 a 0). Peças no fim da vida perdem rendimento e podem quebrar; trocar além da cota do motor dá punição no grid.', 'Each part has a life (100 to 0). Worn parts lose performance and may break; going over the power unit quota means grid penalties.'],
  dev: ['Projetos de desenvolvimento consomem orçamento e horas de túnel de vento. Nem todo projeto funciona na pista.', 'Development projects use budget and wind tunnel hours. Not every project works on track.'],
  finance: ['O teto de gastos vale para todos: passar dele dá multa e pode custar pontos.', 'The cost cap applies to everyone: going over it means fines and possibly points.'],
  market: ['Contratos têm janelas. Outras equipes também disputam os mesmos pilotos e podem cobrir sua oferta.', 'Contracts have windows. Other teams chase the same drivers and may outbid you.'],
  standings: ['Os pontos por etapa somam corrida e Sprint. Passe o mouse para ver a posição de cada GP.', 'Points per round add race and Sprint. Hover to see each GP finish.'],
  council: ['No Conselho, cada equipe vota as mudanças de regra. Negociar votos ajuda a aprovar o que favorece seu carro.', 'In the Council each team votes on rule changes. Trading votes helps pass what suits your car.'],
  academy: ['A academia forma pilotos nas categorias de base. O nível real é estimado; olheiros melhores erram menos.', 'The academy develops drivers in junior series. True level is estimated; better scouts err less.'],
  sister: ['Uma equipe irmã pode receber pilotos da academia e dividir peças, dentro das regras de parceria.', 'A sister team can take academy drivers and share parts, within the partnership rules.'],
};
function tutTipHtml() {
  if (!G) return '';
  const st = Tut.get(); if (st.off) return '';
  const v = UI.view; const t = Tut.TIPS[v]; if (!t || (st.seen || {})[v]) return '';
  return `<div class="tut85-tip" role="note"><b>${byLang('Dica', 'Tip')}</b><span>${byLang(t[0], t[1])}</span><button class="btn sm" data-act="tutTip" data-v="${v}">${byLang('Entendi', 'Got it')}</button><button class="btn sm ghost" data-act="tutOff">${byLang('Desligar dicas', 'Turn tips off')}</button></div>`;
}
ACT.tutTip = (el) => { const st = Tut.get(); st.seen = st.seen || {}; st.seen[el.dataset.v] = 1; Tut.set(st); render(); };
ACT.tutOff = () => { const st = Tut.get(); st.off = true; Tut.set(st); toast(byLang('Dicas desligadas. Dá para religar em Salvar e opções.', 'Tips turned off. You can turn them back on in Save & options.')); render(); };
ACT.tutHide = () => { const st = Tut.get(); Tut.car(st).hidden = true; Tut.set(st); render(); };
ACT.tutReset = () => { Tut.set({}); toast(byLang('Dicas e primeiros passos voltaram.', 'Tips and first steps are back.'), 'good'); render(); };
(function () {
  // dica no topo da tela e registro da visita (só o navegador guarda; nada vai para o save)
  const base = shellHtml;
  shellHtml = function (inner) { try { Tut.visit(UI.view); } catch (e) { /* sem registro */ } let tip = ''; try { tip = tutTipHtml(); } catch (e) { tip = ''; } return base.call(this, tip + inner); };
  // roteiro na Central
  const hub = SCREENS.hub;
  if (hub) { const h = hub.html; hub.html = function () { const out = h.call(this); let c = ''; try { c = tutCard85(); } catch (e) { c = ''; } return c + out; }; }
  // religar em Salvar e opções
  const sv = SCREENS.saves;
  if (sv) { const h = sv.html; sv.html = function () { const st = Tut.get(); return h.call(this) + K85.card({ t: byLang('Dicas e primeiros passos', 'Tips and first steps'), a: `<button class="btn sm" data-act="tutReset">${byLang('Mostrar de novo', 'Show again')}</button>`, body: `<p class="small muted">${st.off ? byLang('As dicas estão desligadas.', 'Tips are turned off.') : byLang('As dicas aparecem na primeira visita a cada tela.', 'Tips appear on the first visit to each screen.')}</p>` }); }; }
})();
