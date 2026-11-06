// Ordem de carregamento dos módulos do jogo (usada pelo build e pelos testes)
module.exports = {
  data: ['../data/real-db', '../data/real-extra', '../data/history'],
  core: ['util', 'data', 'engine', 'migrate', 'ai', 'staff', 'market', 'career', 'events', 'diag'],
  ui: ['storage', 'ui-core', 'ui-screens', 'ui-weekend', 'ui-editor', 'ui-people', 'ui-history', 'main'],
};
