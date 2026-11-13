/* ============================================================
   PIT WALL — narrador de transmissão (classificação e corrida)
   Textos no estilo de narração ao vivo, setor a setor, com nomes reais
   das curvas dos circuitos mais conhecidos e controle de repetição.
   ============================================================ */
'use strict';

const Narr = {};
/* curvas por setor (aproximado) */
// (0.9) por pista, no Pacote de dados (REAL_EXTRA.trackInfo[id].corners); sem pacote, nenhuma
Object.defineProperty(Narr, 'CORNERS', { get: () => Object.fromEntries(Object.entries(((typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.trackInfo) || {})).filter(([, v]) => v.corners != null).map(([id, v]) => [id, v.corners])), configurable: true });
/* preposição certa para cada nome de curva: "na Rascasse", "no túnel", "nos Esses", "nas curvas 6 e 7" */
Narr.MASC = /^(trecho|setor|túnel|hairpin|S do|Pinheirinho|Bico|Mergulho|Casino|Portier|Tabac|Grand|Muro|130R|Spoon|Degner|Raidillon|Pouhon|Foro|Village|Loop|Club|Bus)/;
Narr.prep = (c, de) => { const pl = /^(curvas|Esses|primeira|segunda)/.test(c) ? (/^Esses/.test(c) ? 'os' : /^curvas/.test(c) ? 'as' : 'a') : Narr.MASC.test(c) ? 'o' : 'a'; return (de ? 'd' : 'n') + pl; };
Narr.at = (c) => `${Narr.prep(c)} ${c}`;
Narr.of = (c) => `${Narr.prep(c, true)} ${c}`;
Narr.corner = (track, sec, r) => {
  const c = trackInfo(track.id).corners;
  const list = c ? c[sec] : [['curva 1', 'curva 3', 'curva 4'], ['curva 7', 'curva 9', 'curva 10'], ['curva 13', 'curva 14', 'última curva']][sec];
  return list[Math.floor(r() * list.length)];
};
/* controle de repetição: cada modelo de frase volta só depois de alguns usos */
Narr.used = [];
Narr.pick = (key, list, r) => {
  const free = list.map((_, i) => i).filter(i => !Narr.used.includes(key + i));
  const i = free.length ? free[Math.floor(r() * free.length)] : Math.floor(r() * list.length);
  Narr.used.push(key + i); if (Narr.used.length > 40) Narr.used.shift();
  return list[i];
};
Narr.fill = (s, v) => { if (v.c && v.na == null) { v = { ...v, na: Narr.at(v.c), da: Narr.of(v.c) }; } return s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)).replace(/([^.])\.\.(?!\.)/g, '$1.'); };
Narr.t3 = (x) => x.toFixed(3);
Narr.gap = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(3);

/* comportamento do carro a partir das áreas de equilíbrio com erro (acerto) */
Narr.BEHAVIOR = {
  balance: { neg: ['a frente não quis virar {na}', 'subesterço claro {na}', 'precisou esperar o carro apontar {na}'], pos: ['a traseira escapou na saída {da}', 'sobresterço {na}, correção rápida no volante', 'o carro girou demais na entrada {da}'] },
  braking: { neg: ['travou a dianteira na freada {da}', 'fumaça no pneu dianteiro {na}'], pos: ['a traseira ficou leve na frenagem {da}', 'freada instável {na}'] },
  cornering: { neg: ['o carro rolou demais {na}', 'raspou o assoalho {na}'], pos: ['o carro pulou na zebra {da}', 'quicou nas ondulações {da}'] },
  traction: { neg: ['saída lenta {da}, o carro empurrou de frente', 'demorou a girar na saída {da}'], pos: ['patinou na saída {da}', 'perdeu tração acelerando {na}'] },
  straights: { neg: ['ganha na reta mas sofre nas curvas de alta', 'velocidade de ponta alta, carro solto nas curvas'], pos: ['está lento na reta, carga demais', 'perde muito na reta para os rivais'] },
};

/* ---------- classificação ---------- */
Narr.qSector = (v, r) => {
  // v: { name, sec(0..2), t, status ('purple'|'green'|'yellow'), delta (vs sessão), pdelta (vs próprio), corner, issue, traffic, err, setupNote }
  const S = ['primeiro', 'segundo', 'terceiro'][v.sec];
  if (v.traffic) return Narr.fill(Narr.pick('qT', ['{name} encontra tráfego {na} e perde {x}s no {S} setor.', 'Que azar para {name}: carro lento {na}, o {S} setor fica {x}s pior.', '{name} é atrapalhado {na}; o {S} setor sai {x}s mais lento.'], r), { name: v.name, c: v.corner, x: v.traffic.toFixed(2), S });
  if (v.err) return Narr.fill(Narr.pick('qE', ['{name} erra {na}! Escapou largo, perde {x}s no {S} setor.', 'Travada {na} para {name} — {x}s jogados fora no {S} setor.', '{name} passa reto {na}; volta comprometida, {x}s perdidos.'], r), { name: v.name, c: v.corner, x: v.err.toFixed(2), S });
  if (v.status === 'purple') return Narr.fill(Narr.pick('qP', ['{name} acende o {S} setor em roxo: {t}, o melhor da sessão!', 'Roxo no {S} setor para {name}! {t}, {d} na melhor marca anterior.', '{name} voa no {S} setor: {t}, ninguém foi tão rápido ali.'], r), { name: v.name, t: Narr.t3(v.t), S, d: Narr.gap(v.delta) });
  if (v.issue) return Narr.fill(Narr.pick('qI', ['{S} setor de {name} em {t} ({d}): {issue}.', '{name} fecha o {S} setor em {t}, {d} para o melhor; {issue}.', 'No {S} setor, {issue}. {name} marca {t} ({d}).'], r), { name: v.name, t: Narr.t3(v.t), d: Narr.gap(v.delta), issue: v.issue, S });
  if (v.status === 'green') return Narr.fill(Narr.pick('qG', ['{name} melhora no {S} setor: {t}, verde, recorde pessoal.', 'Verde para {name} no {S} setor ({t}), {d} para o melhor da sessão.', '{name} evolui no {S} setor: {t}.'], r), { name: v.name, t: Narr.t3(v.t), d: Narr.gap(v.delta), S });
  return Narr.fill(Narr.pick('qY', ['{name} cruza o {S} setor em {t}, {d} para o melhor.', '{S} setor de {name}: {t} ({d}).', '{name} um pouco mais lento no {S} setor: {t}, {d}.'], r), { name: v.name, t: Narr.t3(v.t), d: Narr.gap(v.delta), S });
};
Narr.qLap = (v, r) => {
  // v: { name, t, pos, gap, pole, elim, safe, deleted, setupNote, seg, last }
  if (v.deleted) return Narr.fill(Narr.pick('qD', ['Volta de {name} DELETADA: excedeu os limites da pista {na}. O tempo de {t} não vale.', 'Os comissários apagam a volta de {name} por limite de pista {na}. Que golpe!'], r), v);
  const posTxt = v.pos === 1 ? (v.last ? 'na pole provisória' : `no topo do ${v.seg}`) : `${v.pos}º, +${v.gap.toFixed(3)}`;
  const tail = v.pole ? Narr.pick(v.last ? 'qPo' : 'qTop', v.last ? [' NOVA POLE PROVISÓRIA!', ' É o mais rápido de todos!', ' Que volta, assume a pole!'] : [' Lidera a sessão.', ' Ninguém foi tão rápido até agora.', ' Melhor tempo da sessão.'], r)
    : v.elim ? Narr.pick('qEl', [' Na zona de eliminação!', ' Por enquanto, estaria fora.', ' Ainda corre risco de cair.'], r)
      : v.safe ? Narr.pick('qSa', [' Escapa da zona de eliminação.', ' Tempo suficiente, por enquanto.', ''], r) : '';
  const base = v.pole ? Narr.pick('qLp', ['{name} completa a volta em {t}.', '{name} cruza a linha com {t}!', 'Volta fechada para {name}: {t}.'], r) : Narr.pick('qL', ['{name} completa a volta em {t}: {posTxt}.', '{name} cruza a linha com {t}, {posTxt}.', 'Volta fechada para {name}: {t}, {posTxt}.'], r);
  return Narr.fill(base, { ...v, posTxt }) + tail + (v.setupNote ? ' ' + v.setupNote : '');
};

/* ---------- corrida ---------- */
Narr.R = {
  overtake: ['{a} passa {b} {na} e assume o {p}º lugar!', 'Manobra de {a} sobre {b} {na}: agora é {p}º.', '{a} coloca de lado {na} e completa a ultrapassagem sobre {b}. {p}º lugar.', 'Ultrapassagem! {a} vence a briga com {b} {na}, sobe para {p}º.', '{a} aproveita o vácuo e deixa {b} para trás antes {da}.'],
  defend: ['{b} segura {a} {na} com uma defesa firme.', '{a} tenta por dentro {na}, mas {b} fecha a porta.', '{b} resiste à pressão de {a} por mais uma volta.'],
  pit: ['{a} vai para os boxes: {t}s parado, pneus {tyre}. Volta em {p}º.', 'Box para {a}! {t}s de parada e calça {tyre}. Retorna em {p}º.', '{a} faz o pit stop ({t}s) e coloca {tyre}; sai em {p}º.'],
  slowPit: ['Problema no pit stop de {a}: {t}s parado! Perde posições, volta em {p}º.', 'Parada lenta para {a}, {t}s. A porca da roda traseira demorou.'],
  fastLap: ['{a} marca a volta mais rápida: {t}.', 'Volta mais rápida da corrida para {a}, {t}.'],
  undercut: ['O undercut funcionou: {a} sai dos boxes à frente de {b}.', '{a} ganha a posição de {b} na estratégia, pelo undercut.'],
};
