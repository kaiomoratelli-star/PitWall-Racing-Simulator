# PitWall Racing Simulator — guia de desenvolvimento

Jogo de gestão de automobilismo (F1 + 22 outras categorias) para Windows, em português e inglês.
Uma produção **Moratelli Game Company (MGC)**. Dono: Kaio Moratelli.
O material de marketing fica em `docs/marketing/` e `docs/brand/`.

## Regras do dono
- Tudo em português do Brasil (interface, textos, commits, documentação). O jogo também tem inglês: todo texto novo da interface precisa de uma linha em `app/src/i18n-en.js`, e frases montadas no núcleo usam `byLang(pt, en)` (ver `docs/ARQUITETURA.md`, seção Idiomas).
- Dados reais são permitidos e desejados: pilotos, equipes, patrocinadores, imprensa, imagens. O jogo ainda não é vendido; no futuro será pago (não escrever que é gratuito). Antes de vender, imagens e marcas de terceiros precisarão de licença ou substituição.
- Versão atual: 0.8.6 (0.8.5 interface nova; 0.8.6 regras, comissários, motor por componente, pessoas e parcerias). Próxima: 0.8.7 Solidificação (ver `docs/AVALIACAO-0.8.6.md`), depois 0.9 Carreira de Piloto.
- Não usar a palavra "IA" na interface do jogo.
- Nota mínima de um titular da F1: 75 (`Talent.F1_MIN`, decisão do dono em 08/11/2026). Notas de pilotos de outras séries revisadas à mão ficam em `app/data/driver-tiers.js` (`series`).
- Escândalos e acontecimentos podem citar pessoas, equipes, circuitos e empresas reais (decisão do dono em 08/11/2026: a versão comercial será toda fictícia). Todo caso com pessoa real leva a marca "ficção do jogo". Exceção: o escândalo de extremismo usa sempre personagens fictícios. A opção "Pessoas reais" pode ser desligada em Salvar e opções.
- Morte em acidente fica sempre ligada, com probabilidade realista por categoria e época; tratar sempre com seriedade (luto, homenagem, investigação), nunca como punição ou piada.
- Identidade visual: vermelho `#E10600`, carbono `#15151E`, Titillium Web 900 itálico e IBM Plex Mono (ver `docs/marketing/2-GUIA-DA-MARCA.md`). Títulos em caixa alta no padrão F1; se os arquivos da Formula1 Display estiverem em `app/assets/fonts`, o build usa.
- Quando um recurso novo do jogo for criado, atualize `docs/marketing/3-SOBRE-O-JOGO.md` e o `CHANGELOG.md`.

## Nada pode sumir (regra desde a 0.8.6)
Entre a 0.8.4 e a 0.8.6, painéis, abas e gráficos sumiram porque uma tela nova foi escrita por cima da antiga, ou uma função com o mesmo nome apagou a outra. Por isso:
1. **`npm test` começa pelo `guard-check`.** Ele falha quando:
   - duas funções têm o mesmo nome;
   - uma tela (`SCREENS.x`) ou ação (`ACT.x`) é redefinida por inteiro sem guardar a anterior;
   - um botão chama uma ação que não existe;
   - um arquivo fica fora do build;
   - algo da lista oficial (`tests/features.json`) some.
2. **Para acrescentar algo à interface:** embrulhe a tela existente (`const h = SCREENS.x.html; SCREENS.x.html = function () { return h.call(this) + ... }`) ou crie uma tela nova. Depois rode `node scripts/features-snapshot.js --write` para proteger o que é novo.
3. **Para refazer uma tela por inteiro:**
   - antes, liste tudo o que a versão antiga mostra (painéis, abas, colunas, botões) e confira que a nova tem tudo;
   - registre a troca em `tests/replacements.json`, com o que foi conferido.
4. **Para remover algo de propósito:** rode `node scripts/features-snapshot.js` (mostra o que sairia), grave com `--write` e escreva o motivo no commit. Nunca remova código só porque parece sem uso: confira com `node scripts/guard-check.js` e com o `playthrough-check`.
5. **A interface não sorteia ao desenhar a tela.** O `RNG` é da simulação; sortear na tela muda o resultado da carreira. Sorteio só dentro de uma ação do jogador (botão).
6. **Antes de publicar:** rode `npm test`, `node scripts/ui85-check.js 6`, `npm run playthrough` e `npm run test:ui`.

## Estrutura
- `app/src/`: código do jogo em JS puro. A ordem de carregamento fica em `scripts/modules.js` e o build é `node scripts/build.js`.
  - Núcleo: `util`, `data`, `persons` (identidade dos pilotos: uma pessoa, um registro), `engine`, `physics`, `regs`, `setup`, `practice`, `narrator`, `quali`, `racelog`, `circuitgen`, `migrate`, `ai`, `staff`, `market`, `career`, `econ` (receitas, fábrica, teto auditado, patrimônio), `events`, `media`, `cats`, `sisters`, `council`, `lang-en`, `diag`.
  - Interface: `ui-*.js`, `i18n.js`, `i18n-en.js`, `sound.js`, `main.js`, `styles.css`.
- `app/data/`: dados reais gerados por scripts. Não editar à mão; usar `scripts/import_real_data.py`, `import_records.py` e `import_categories.py`.
- `desktop/`: Electron (janela, tela de abertura, saves em `%APPDATA%`, logs).
- `build/`: ícone, imagens do instalador NSIS e `installer.nsh`. Gerados por `node scripts/make-brand.js`.
- `docs/brand/`: logos e peças em alta resolução. As peças do X são geradas por `scripts/make-social.js`.
- `docs/ARQUITETURA.md`, `docs/ROADMAP.md`, `CHANGELOG.md`.

## Comandos
```
node scripts/build.js            # app/dist/index.html (desktop) e dist-web/pitwall.html (web)
npm test                         # guard-check (nada sumiu) + escopo + 10 + 4 temporadas nos dois modos + categorias
npm run guard                    # só o guard-check (rápido, sem simular)
node scripts/features-snapshot.js [--write]   # lista oficial de funcionalidades (tests/features.json)
npm run playthrough              # joga 2 temporadas pela interface e confere a integridade dos dados
node scripts/ui85-check.js 6     # 50 telas em 6 configurações (tema, idioma, menu, equipe, largura)
npm run test:ui                  # estresse da corrida ao vivo pela interface (Playwright)
node scripts/sim-test.js 20 99   # teste longo (20 temporadas)
xvfb-run -a node scripts/smoke.js   # testa o app Electron de verdade
node scripts/audit.js db         # duplicatas (docs/DUPLICATAS.md) e conferência com o DriverDB (docs/VERIFICACAO-DATABASE.md)
node scripts/audit.js sim 20 7   # simulação longa com métricas de realismo (docs/RELATORIO-SIMULACAO.md)
python3 scripts/import_driverdb.py  # baixa classificações 2026 e perfis do DriverDB (cache em /tmp/res/driverdb)
npx electron-builder --win nsis --x64 --publish never   # instalador local (funciona no Linux)
```

## Versões e publicação
- Ao mudar o formato do save, incremente `SAVE_VERSION` em `app/src/migrate.js` e adicione um passo de migração.
- Cada push na `main` dispara o CI no Windows (`.github/workflows/windows.yml`): build, instalação silenciosa, teste do executável, atualização e desinstalação. Se tudo passar, o CI publica a release `v<versão do package.json>`.
- Para lançar uma versão nova, suba `version` em `package.json` e em `package-lock.json` e escreva a entrada no `CHANGELOG.md`.
- **Correções de uma versão já publicada ganham número novo** (decisão do dono, 08/11/2026). Nunca se substitui o instalador nem se move a etiqueta de uma versão publicada.
  - No `package.json`, a correção é escrita `0.8.5-1`, `0.8.5-2`… porque o número precisa seguir o padrão semver.
  - O jogo, a release e a etiqueta mostram `0.8.5.1`, `0.8.5.2`…, pela conversão em `scripts/build.js` e no passo `v` do CI.
  - O CI cria a etiqueta e a release sozinho no push para a `main`.
- A simulação é determinística (RNG com semente). Não use `Math.random` no núcleo.
- Ultrarrealismo (plano em `docs/AUDITORIA-0.8.2.md`): não equilibrar o grid artificialmente, não inventar pilotos, contratos ou transferências (vaga sem fonte = "a confirmar" ou "projeção do jogo"), não duplicar pessoas (use `Persons.index` antes de criar um piloto), e jogador e IA seguem as mesmas regras financeiras (`econ.js`).
