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
};
