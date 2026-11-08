// junta CSS e JS na página; imagens ficam como arquivos ao lado
const fs = require('fs'); const P = __dirname;
const css = ['a.css', 'b.css'].filter(f => f === '__TIMGS__' || fs.existsSync(P + '/' + f)).map(f => f === '__TIMGS__' ? '' : fs.readFileSync(P + '/' + f, 'utf8')).join('\n');
const timgs = fs.readdirSync(P + '/assets/img/tracks').map(f => f.replace(/\.webp$/, ''));
const js = ['__TIMGS__', 'data.js', 'core.js', 'screens1.js', 'screens2.js', 'a.js', 'b.js'].filter(f => f === '__TIMGS__' || fs.existsSync(P + '/' + f)).map(f => f === '__TIMGS__' ? '' : fs.readFileSync(P + '/' + f, 'utf8').replace(/<\/script/gi, '<\\/script')).join('\n;\n');
let h0 = 0; let h = fs.readFileSync(P + '/index.src.html', 'utf8').replace('/*CSS*/', () => css).replace('<!--JS-->', () => `<script>\nwindow.TIMGS=${JSON.stringify(timgs)};\n${js}\nwindow.PW.boot();\n</script>`);
fs.mkdirSync(P + '/dist', { recursive: true });
fs.writeFileSync(P + '/dist/index.html', h);
// cópia de pré-visualização local com esqueleto completo
fs.writeFileSync(P + '/preview.html', '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + h + '</body></html>');
console.log('ok', (h.length / 1024 | 0) + ' KB');
