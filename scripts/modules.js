// Ordem de carregamento dos módulos do jogo (usada pelo build e pelos testes)
module.exports = {
  data: ['../data/real-db', '../data/real-extra', '../data/history', '../data/records', '../data/team-lore', '../data/categories', '../data/asset-registry', '../data/drivers-db', '../data/fia-circuits', '../data/real-tracks', '../data/genders'],
  core: ['util', 'data', 'engine', 'physics', 'regs', 'identity', 'setup', 'practice', 'narrator', 'quali', 'racelog', 'circuitgen', 'migrate', 'ai', 'staff', 'market', 'career', 'events', 'media', 'cats', 'driverdb', 'potential', 'market-plus', 'kart', 'disciplines', 'contracts', 'rnd', 'time', 'circuits', 'stories', 'regcal', 'sisters', 'council', 'lang-en', 'diag'],
  ui: ['storage', 'sound', 'ui-core', 'assets', 'ui-avatar', 'i18n-en', 'i18n', 'ui-screens', 'ui-weekend', 'ui-practice', 'ui-quali', 'ui-editor', 'ui-regs', 'ui-dev', 'ui-council', 'ui-sister', 'ui-scout', 'ui-people', 'ui-history', 'ui-records', 'ui-circuits', 'ui-cats', 'ui-driverdb', 'ui-media', 'ui-stories', 'ui-cards', 'ui-report', 'ui-account', 'ui-time', 'ui-race', 'main'],
};
