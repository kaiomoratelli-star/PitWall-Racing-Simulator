// Ordem de carregamento dos módulos do jogo (usada pelo build e pelos testes)
module.exports = {
  core: ['util', 'data', 'engine', 'migrate', 'ai', 'career', 'events', 'diag'],
  ui: ['storage', 'ui-core', 'ui-screens', 'ui-weekend', 'ui-editor', 'main'],
};
