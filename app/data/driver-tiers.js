/* Nível (teto de potencial) dos pilotos reais — definido pelo dono do projeto em 07/11/2026 para a V0.8.3.
   O nível é OCULTO no jogo: define até onde o piloto pode chegar no auge, não o resultado da carreira
   (um piloto "Bom" pode ter carreira medíocre por falta de vaga, carro ou sorte).
   Pilotos fora desta lista recebem o nível pela regra automática de talent.js (nota, idade e desempenho real). */
const DRIVER_TIERS = {
  source: 'Decisão do projeto (V0.8.3), a partir de: duelo com o companheiro (f1db), rating do DriverDB e carreira', date: '2026-11-07',
  f1: {
    'max-verstappen': 'geracional', 'kimi-antonelli': 'geracional', 'lewis-hamilton': 'geracional', 'fernando-alonso': 'geracional',
    'charles-leclerc': 'acima', 'lando-norris': 'acima', 'george-russell': 'acima', 'oscar-piastri': 'acima', 'rafael-camara': 'acima', 'oliver-bearman': 'acima',
    'carlos-sainz-jr': 'bom', 'pierre-gasly': 'bom', 'alexander-albon': 'bom', 'nico-hulkenberg': 'bom', 'isack-hadjar': 'bom', 'gabriel-bortoleto': 'bom', 'arvid-lindblad': 'bom',
    'valtteri-bottas': 'mediano', 'sergio-perez': 'mediano', 'liam-lawson': 'mediano',
    'franco-colapinto': 'mediocre', 'lance-stroll': 'mediocre',
  },
  /* IndyCar (revisão de 08/11/2026, pedido do dono: a série estava muito inflada).
     Escala ancorada nos ex-F1 do grid (Ericsson, Grosjean, Mick Schumacher, Rossi, Armstrong): o melhor da
     IndyCar (Palou) fica no nível de um titular de meio de grid da F1; o meio da IndyCar, perto de um F2 forte.
     [nível, nota no início da carreira] */
  series: {
    'c-alex-palou': ['vencedor', 81], 'c-pato-o-ward': ['vencedor', 79], 'c-josef-newgarden': ['vencedor', 78], 'c-scott-mclaughlin': ['vencedor', 78],
    'c-kyle-kirkwood': ['vencedor', 78], 'c-christian-lundgaard': ['vencedor', 77], 'c-scott-dixon': ['vencedor', 76], 'c-will-power': ['vencedor', 76],
    'c-david-malukas': ['pelotao', 76], 'c-felix-rosenqvist': ['pelotao', 75], 'c-rinus-veekay': ['pelotao', 75], 'c-alexander-rossi': ['pelotao', 75],
    'c-marcus-ericsson': ['pelotao', 75], 'c-marcus-armstrong': ['pelotao', 75], 'c-mick-schumacher': ['pelotao', 75], 'c-dennis-hauger': ['pelotao', 75],
    'c-romain-grosjean': ['pelotao', 74], 'c-santino-ferrucci': ['pelotao', 74], 'c-christian-rasmussen': ['pelotao', 74], 'c-louis-foster': ['pelotao', 74],
    'c-caio-collet': ['pelotao', 74], 'c-nolan-siegel': ['pelotao', 73], 'c-graham-rahal': ['coadjuvante', 73], 'c-kyffin-simpson': ['coadjuvante', 72],
    'c-conor-daly': ['coadjuvante', 71], 'c-takuma-sato': ['coadjuvante', 71], 'c-jack-harvey': ['coadjuvante', 70], 'c-sting-ray-robb': ['coadjuvante', 70],
    'c-jacob-abel': ['coadjuvante', 70], 'c-helio-castroneves': ['coadjuvante', 70], 'c-ryan-hunter-reay': ['coadjuvante', 70], 'c-katherine-legge': ['coadjuvante', 69],
    'c-ed-carpenter': ['coadjuvante', 69],
  },
};
