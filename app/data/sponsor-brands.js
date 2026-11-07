/* Marcas reais que patrocinam o automobilismo (V0.8.3): segmento (exclusividade dentro da equipe) e porte.
   Porte 1 = marca global de topo (só fecha com equipes de reputação alta e paga mais), 2 = global, 3 = regional ou de nicho.
   Valores em jogo saem do mercado de patrocínio de cada equipe (econ.js), não de números oficiais dos contratos. */
const SPONSOR_BRANDS = {
  'Petronas': ['energia', 1], 'Shell': ['energia', 1], 'Aramco': ['energia', 1], 'bp': ['energia', 1], 'Gulf': ['energia', 3], 'Mobil 1': ['lubrificantes', 2], 'Castrol': ['lubrificantes', 2], 'Valvoline': ['lubrificantes', 3],
  'Microsoft': ['tecnologia', 1], 'Google': ['tecnologia', 1], 'IBM': ['tecnologia', 2], 'HP': ['tecnologia', 1], 'Qualcomm': ['tecnologia', 2], 'Dell Technologies': ['tecnologia', 2], 'Lenovo': ['tecnologia', 2], 'AWS': ['tecnologia', 1],
  'Oracle': ['software', 1], 'Salesforce': ['software', 2], 'Atlassian': ['software', 2], 'TeamViewer': ['software', 3], 'Snowflake': ['software', 2], 'Workday': ['software', 2], 'Okta': ['software', 3],
  'Santander': ['banco', 2], 'UniCredit': ['banco', 2], 'Revolut': ['banco', 2], 'Hantec Markets': ['finanças', 3], 'TWG': ['finanças', 2],
  'Mastercard': ['pagamentos', 1], 'Visa': ['pagamentos', 1], 'Cash App': ['pagamentos', 2],
  'Bybit': ['cripto', 2], 'OKX': ['cripto', 2], 'Crypto.com': ['cripto', 2], 'Kraken': ['cripto', 2], 'Bitpanda': ['cripto', 3],
  'DP World': ['logística', 2], 'DHL': ['logística', 1], 'MSC Cruises': ['turismo', 2], 'Qatar Airways': ['aviação', 1], 'Emirates': ['aviação', 1],
  'Ford': ['automotivo', 1], 'Toyota Gazoo Racing': ['automotivo', 1],
  'Hugo Boss': ['moda', 2], 'Tommy Hilfiger': ['moda', 2], 'Castore': ['vestuário', 3], 'adidas': ['vestuário', 1], 'Puma': ['vestuário', 2], 'Ray-Ban': ['moda', 2],
  'Rolex': ['relógios', 1], 'TAG Heuer': ['relógios', 1], 'LVMH': ['luxo', 1],
  'Coca-Cola': ['bebidas', 1], 'Heineken': ['bebidas', 1], 'Pepsico': ['bebidas', 1], 'Estrella Galicia': ['bebidas', 3], 'Monster Energy': ['bebidas', 2],
  'Kick': ['mídia', 3], 'Paramount+': ['mídia', 2], 'Tata Communications': ['telecom', 2],
  'Cognizant': ['consultoria', 2], 'Globant': ['consultoria', 3],
  'Allwyn': ['apostas', 2], 'Stake': ['apostas', 3],
  'BWT': ['indústria', 3], 'Duracell': ['bens de consumo', 2], 'LEGO': ['brinquedos', 2],
};
