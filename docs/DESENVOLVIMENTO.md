# PitWall Racing Simulator — guia de desenvolvimento

Jogo de gestão de automobilismo (F1 + 22 outras categorias) para Windows, em português e inglês.
Uma produção **Moratelli Game Company (MGC)**. Dono: Kaio Moratelli.
O material de marketing fica em `docs/marketing/` e `docs/brand/`.

## Regras do dono
- Tudo em português do Brasil (interface, textos, commits, documentação). O jogo também tem inglês: todo texto novo da interface precisa de uma linha em `app/src/i18n-en.js`, e frases montadas no núcleo usam `byLang(pt, en)` (ver `docs/ARQUITETURA.md`, seção Idiomas).
- Dados reais são permitidos e desejados: pilotos, equipes, patrocinadores, imprensa, imagens. O jogo ainda não é vendido; no futuro será pago (não escrever que é gratuito). Antes de vender, imagens e marcas de terceiros precisarão de licença ou substituição.
- Versão atual: 0.8.0 (a 0.9 está em construção; plano em `docs/ROADMAP-0.9.md`).
- Não usar a palavra "IA" na interface do jogo.
- Escândalos sempre com pessoas e organizações fictícias.
- Identidade visual: vermelho `#E10600`, carbono `#15151E`, Titillium Web 900 itálico e IBM Plex Mono (ver `docs/marketing/2-GUIA-DA-MARCA.md`). Títulos em caixa alta no padrão F1; se os arquivos da Formula1 Display estiverem em `app/assets/fonts`, o build usa.
- Quando um recurso novo do jogo for criado, atualize `docs/marketing/3-SOBRE-O-JOGO.md` e o `CHANGELOG.md`.

## Estrutura
- `app/src/`: código do jogo em JS puro. A ordem de carregamento fica em `scripts/modules.js` e o build é `node scripts/build.js`.
  - Núcleo: `util`, `data`, `engine`, `physics`, `regs`, `setup`, `practice`, `narrator`, `quali`, `racelog`, `circuitgen`, `migrate`, `ai`, `staff`, `market`, `career`, `events`, `media`, `cats`, `sisters`, `council`, `lang-en`, `diag`.
  - Interface: `ui-*.js`, `i18n.js`, `i18n-en.js`, `sound.js`, `main.js`, `styles.css`.
- `app/data/`: dados reais gerados por scripts. Não editar à mão; usar `scripts/import_real_data.py`, `import_records.py` e `import_categories.py`.
- `desktop/`: Electron (janela, tela de abertura, saves em `%APPDATA%`, logs).
- `build/`: ícone, imagens do instalador NSIS e `installer.nsh`. Gerados por `node scripts/make-brand.js`.
- `docs/brand/`: logos e peças em alta resolução. As peças do X são geradas por `scripts/make-social.js`.
- `docs/ARQUITETURA.md`, `docs/ROADMAP.md`, `CHANGELOG.md`.

## Comandos
```
node scripts/build.js            # app/dist/index.html (desktop) e dist-web/pitwall.html (web)
npm test                         # verificação de escopo + 10 + 4 temporadas nos dois modos, diagnóstico e migrações
npm run test:ui                  # estresse da corrida ao vivo pela interface (Playwright)
node scripts/sim-test.js 20 99   # teste longo (20 temporadas)
xvfb-run -a node scripts/smoke.js   # testa o app Electron de verdade
npx electron-builder --win nsis --x64 --publish never   # instalador local (funciona no Linux)
```

## Versões e publicação
- Ao mudar o formato do save, incremente `SAVE_VERSION` em `app/src/migrate.js` e adicione um passo de migração.
- Cada push na `main` dispara o CI no Windows (`.github/workflows/windows.yml`): build, instalação silenciosa, teste do executável, atualização e desinstalação. Se tudo passar, o CI publica a release `v<versão do package.json>`.
- Para lançar uma versão nova, suba `version` em `package.json` e em `package-lock.json` e escreva a entrada no `CHANGELOG.md`.
- A simulação é determinística (RNG com semente). Não use `Math.random` no núcleo.
