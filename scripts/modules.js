// Ordem de carregamento dos módulos do jogo (usada pelo build e pelos testes)
module.exports = {
  data: ['../data/real-db', '../data/real-extra', '../data/history'],
  core: ['util', 'data', 'engine', 'physics', 'regs', 'circuitgen', 'migrate', 'ai', 'staff', 'market', 'career', 'events', 'media', 'diag'],
  ui: ['storage', 'sound', 'ui-core', 'ui-screens', 'ui-weekend', 'ui-editor', 'ui-regs', 'ui-people', 'ui-history', 'ui-media', 'ui-race', 'main'],
};
