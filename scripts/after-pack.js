// Depois de empacotar: grava ícone e informações de versão no .exe.
// No Windows o electron-builder já faz isso (rcedit); em Linux/macOS sem Wine
// usamos o resedit (JavaScript puro) para o executável sair com o ícone certo.
const fs = require('fs');
const path = require('path');
exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'win32' || process.platform === 'win32') return;
  const ResEdit = require('resedit');
  const pkg = require('../package.json');
  const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`);
  const data = fs.readFileSync(exe);
  const res = ResEdit.NtExecutableResource.from(ResEdit.NtExecutable.from(data, { ignoreCert: true }));
  const exeObj = ResEdit.NtExecutable.from(data, { ignoreCert: true });
  const resources = ResEdit.NtExecutableResource.from(exeObj);
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(resources.entries);
  const groupId = groups.length ? groups[0].id : 1;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(resources.entries, groupId, 1033, ico.icons.map(i => i.data));
  const vi = ResEdit.Resource.VersionInfo.fromEntries(resources.entries)[0];
  const [a, b, c] = pkg.version.split('.').map(Number);
  vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: 'PitWall Racing Simulator', FileDescription: 'PitWall Racing Simulator', CompanyName: 'Kaio Moratelli', LegalCopyright: '© 2026 Kaio Moratelli', OriginalFilename: path.basename(exe), InternalName: 'PitWall' });
  vi.outputToResourceEntries(resources.entries);
  resources.outputResource(exeObj);
  fs.writeFileSync(exe, Buffer.from(exeObj.generate()));
  void res;
  console.log('  • ícone e versão gravados no executável (resedit)');
};
