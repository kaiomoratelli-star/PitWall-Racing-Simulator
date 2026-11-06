// Ordem de carregamento dos módulos do jogo (usada pelo build e pelos testes)
module.exports = {
  data: ['../data/real-db', '../data/real-extra', '../data/history', '../data/records', '../data/team-lore', '../data/categories', '../data/asset-registry'],
  core: ['util', 'data', 'engine', 'physics', 'regs', 'identity', 'setup', 'practice', 'narrator', 'quali', 'racelog', 'circuitgen', 'migrate', 'ai', 'staff', 'market', 'career', 'events', 'media', 'cats', 'sisters', 'council', 'lang-en', 'diag'],
  ui: ['storage', 'sound', 'ui-core', 'assets', 'i18n-en', 'i18n', 'ui-screens', 'ui-weekend', 'ui-practice', 'ui-quali', 'ui-editor', 'ui-regs', 'ui-council', 'ui-sister', 'ui-people', 'ui-history', 'ui-records', 'ui-cats', 'ui-media', 'ui-report', 'ui-account', 'ui-race', 'main'],
};
