// Saves em disco (desktop/storage.js) numa pasta temporária: gravação compactada e conferida,
// leitura de saves antigos sem compactação, recuperação pelos backups, rotação, apagar sem perder,
// e um save real de versão publicada (tests/saves) gravado e lido de volta sem mudar um byte.
// Uso: node scripts/storage-check.js
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const root = path.join(__dirname, '..');
const storage = require(path.join(root, 'desktop', 'storage.js'));
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pitwall-storage-'));
try {
  storage.init(tmp);
  const dir = storage.dir, bdir = path.join(dir, 'backups');
  const save = (n) => JSON.stringify({ version: 7, n, txt: 'ação é çãõ ü — ' + 'x'.repeat(5000) });

  // 1. save antigo (0.8.6: .json sem compactação) continua abrindo
  fs.writeFileSync(path.join(dir, 'slot1.json'), save(1));
  let r = storage.loadSlot('slot1');
  ok(r && JSON.parse(r.data).n === 1 && !r.recovered, 'save antigo .json não abriu');
  ok(storage.slotMeta('slot1'), 'slot com save antigo e sem meta deveria aparecer como ocupado');

  // 2. primeiro save novo: grava .json.gz, move o .json antigo para os backups (não apaga)
  storage.saveSlot('slot1', save(2), { team: 'T' });
  ok(fs.existsSync(path.join(dir, 'slot1.json.gz')), 'save compactado não foi gravado');
  ok(!fs.existsSync(path.join(dir, 'slot1.json')), 'save antigo ficou na pasta principal (seria lido no lugar do novo por versões antigas)');
  ok(fs.readdirSync(bdir).some(f => f.includes('-antigo.json')), 'save antigo não foi para os backups');
  const raw = fs.readFileSync(path.join(dir, 'slot1.json.gz'));
  ok(raw[0] === 0x1f && raw[1] === 0x8b, 'arquivo não está compactado');
  r = storage.loadSlot('slot1');
  ok(r && JSON.parse(r.data).n === 2, 'save compactado não abriu');
  ok(r.data === save(2), 'save compactado voltou diferente do gravado');

  // 3. conteúdo inválido nunca é gravado
  let threw = false; try { storage.saveSlot('slot1', '{quebrado', {}); } catch (e) { threw = true; }
  ok(threw, 'save inválido foi aceito');
  ok(JSON.parse(storage.loadSlot('slot1').data).n === 2, 'save inválido estragou o save bom');

  // 4. rotação: guarda só os 5 backups mais novos
  for (let i = 3; i <= 10; i++) { storage.saveSlot('slot1', save(i), {}); }
  const bk = fs.readdirSync(bdir).filter(f => f.startsWith('slot1.') && !f.includes('apagado'));
  ok(bk.length === 5, `rotação deixou ${bk.length} backups (esperado 5)`);
  ok(JSON.parse(storage.loadSlot('slot1').data).n === 10, 'último save não é o carregado');

  // 5. save principal danificado: recupera do backup mais novo
  fs.writeFileSync(path.join(dir, 'slot1.json.gz'), Buffer.from([0x1f, 0x8b, 1, 2, 3]));
  r = storage.loadSlot('slot1');
  ok(r && r.recovered && JSON.parse(r.data).n === 9, `recuperação pegou ${r && JSON.parse(r.data).n} (esperado 9, o backup mais novo)`);

  // 6. apagar não perde (vai para backups) e o slot fica vazio
  storage.saveSlot('slot2', save(20), { team: 'X' });
  storage.deleteSlot('slot2');
  ok(!storage.slotMeta('slot2'), 'slot apagado ainda aparece');
  ok(fs.readdirSync(bdir).some(f => f.startsWith('slot2.apagado-')), 'save apagado não foi guardado nos backups');
  ok(storage.loadSlot('slot2') === null, 'slot apagado voltou sozinho pelo backup');

  // 7. saves reais de versões publicadas: gravar e ler de volta sem mudar nada
  const sdir = path.join(root, 'tests', 'saves');
  for (const f of fs.readdirSync(sdir).filter(x => x.endsWith('.json.gz'))) {
    const str = zlib.gunzipSync(fs.readFileSync(path.join(sdir, f))).toString('utf8');
    storage.saveSlot('slot3', str, {});
    const back = storage.loadSlot('slot3').data;
    ok(back === str, `${f}: voltou diferente depois de gravar`);
    const kb = (n) => Math.round(n / 1024);
    console.log(`  ${f}: ${kb(str.length)} KB → ${kb(fs.statSync(path.join(dir, 'slot3.json.gz')).size)} KB no disco`);
  }
  // 8. base do editor: arquivo antigo continua sendo lido
  storage.saveBase(JSON.stringify({ name: 'base' }));
  ok(JSON.parse(storage.loadBase()).name === 'base', 'base do editor não abriu');
} catch (e) { fails.push('erro: ' + e.stack); }
fs.rmSync(tmp, { recursive: true, force: true });
if (fails.length) { fails.forEach(f => console.log('✗', f)); console.log('storage: FALHOU'); process.exit(1); }
console.log('storage: OK (compactação conferida, saves antigos, backups, recuperação, apagar)');
