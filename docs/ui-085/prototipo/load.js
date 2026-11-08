const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = '/workspace/pitwall-racing-simulator';
const { core, data } = require(ROOT + '/scripts/modules');
module.exports = function load() {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  ctx.run = (s) => vm.runInContext(s, ctx);
  return ctx;
};
if (require.main === module) { const c = module.exports(); console.log(c.run(process.argv[2])); }
