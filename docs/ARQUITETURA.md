# Arquitetura e auditoria técnica — PitWall Racing Simulator

Referência: versão 0.2.0 (novembro de 2026).

## 1. Tecnologia

| Camada | Escolha | Motivo |
|---|---|---|
| Jogo | JavaScript puro (sem framework), HTML e CSS | Já era assim na v0.1. Roda igual no navegador, no artefato do Claude e no desktop |
| Desktop | **Electron 33** | O jogo é web. O Electron empacota o Chromium junto, então a aparência e o comportamento são idênticos em qualquer Windows 10/11. O Tauri depende do WebView2 do sistema, o que gera variações e exigiria reescrever os saves em Rust |
| Instalador | electron-builder + NSIS | Gera `Setup.exe` em português, com atalhos e desinstalador |
| Saves | Arquivos JSON em `%APPDATA%\PitWall Racing Simulator` | Separados da instalação. Gravação atômica e cópias de segurança |

## 2. Estrutura de pastas

```
app/src/        código do jogo (módulos carregados nesta ordem)
  util.js       RNG com semente, formatação, nomes
  data.js       base de dados padrão (regras, motores, equipes, pilotos, pistas)
  engine.js     simulação: carro, acerto, clima, classificação, corrida volta a volta
  migrate.js    versão do save + migrações
  ai.js         IA dos chefes de equipe (caixa, personalidade, investimentos, staff)
  career.js     carreira/universo: temporada, fim de semana, finanças, P&D, mercado,
                registro permanente (log), arquivo histórico
  events.js     eventos com decisões + notícias baseadas em fatos
  diag.js       verificação de integridade e reparos seguros
  storage.js    salvamento (disco no desktop, nuvem no Claude, navegador)
  ui-*.js       interface
  main.js       inicialização + testes automáticos do executável
app/assets/     fontes empacotadas (licença OFL)
desktop/        processo principal do Electron
  main.js       janela, tela de abertura, tela cheia, IPC, erros, testes
  preload.js    ponte segura com o jogo (contextIsolation + sandbox)
  storage.js    saves em disco, gravação atômica, backups, recuperação
  logger.js     log com rotação
build/          ícones do aplicativo
scripts/        build, testes (simulação longa e teste do executável), ícones
.github/workflows/windows.yml   build + instalação + testes em Windows real
```

## 3. Onde ficam os dados do jogador

```
%APPDATA%\PitWall Racing Simulator\
  saves\slot1.json, slot2.json, slot3.json   jogos salvos
  saves\slotN.meta.json                      resumo exibido na tela inicial
  saves\backups\                             5 versões anteriores de cada save
  saves\base-database.json                   base editada no Editor
  logs\pitwall.log                           log de diagnóstico (rotação a cada 2 MB)
  window-state.json                          tamanho, posição e tela cheia
```

O programa fica em `%LOCALAPPDATA%\Programs\PitWall Racing Simulator\`. Instalar uma versão nova
ou desinstalar **não** apaga a pasta de dados (`deleteAppDataOnUninstall: false`).

Proteções:
- Gravação atômica: escreve em `.tmp`, força a gravação em disco e só então renomeia. Se o
  computador desligar no meio, o save anterior continua inteiro.
- Antes de sobrescrever, a versão anterior vai para `backups\` (as 5 últimas ficam guardadas).
- Ao abrir, se o save principal estiver danificado, o jogo carrega automaticamente o backup mais
  recente e avisa o jogador.
- "Apagar" um save só o move para `backups\`.

## 4. Compatibilidade entre versões (migrações)

`SAVE_VERSION` em `app/src/migrate.js`. Ao carregar um save antigo, `Migrate.run` aplica os
passos em ordem (v1→v2→…). Para mudar o formato do save:
1. incremente `SAVE_VERSION`;
2. adicione `Migrate.steps[versãoAnterior] = (G) => { … }` que só *adiciona* ou converte campos;
3. rode `npm test`, que também testa a migração.

Um save de versão mais nova que o jogo é recusado com mensagem clara, em vez de ser corrompido.

## 5. Desenvolvimento e produção

| Comando | O que faz |
|---|---|
| `npm run dev` | Abre o jogo com DevTools (F12), recarga (Ctrl+R) e pasta de dados separada `PitWall Racing Simulator (dev)` |
| `npm start` | Abre como em produção |
| `npm test` | Simulação prolongada: 10 temporadas + 4 temporadas, modos Manager e Observador, diagnóstico a cada temporada, round-trip de save e migração |
| `npm run test:smoke` | Abre o aplicativo real, cria carreira, disputa corridas pela interface, salva, fecha, reabre e continua |
| `npm run dist` | Gera `release\PitWall-Racing-Simulator-Setup-<versão>.exe` (no Windows) |
| `npm run dist:linux-host` | O mesmo, compilando a partir de Linux (exige Wine 32 e 64 bits) |

Para publicar uma versão: altere `version` no `package.json`, faça commit e crie a tag `vX.Y.Z`.
O GitHub Actions gera o instalador, instala em Windows, testa e anexa o `Setup.exe` à release.

## 6. Auditoria da v0.1 (antes desta atualização)

**Funcionava:** simulação volta a volta (pneus, clima, SC/VSC, quebras, ultrapassagens, punições),
treinos com acerto, classificação Q1–Q3, estratégia, corrida ao vivo, finanças do jogador, P&D,
mercado de pilotos e staff, eventos com escolhas, análise de dados, editor da base, temporadas
encadeadas.

**Problemas encontrados e corrigidos nesta versão:**
- As equipes da IA evoluíam o carro **sem gastar dinheiro**. Agora cada uma tem caixa,
  personalidade, teto orçamentário e decide onde investir (`ai.js`).
- A IA renovava contratos **sem olhar o orçamento**. Agora recusa salários que não cabem e
  registra o motivo.
- Resultados de temporadas antigas eram **descartados** ao virar o ano. Agora há o arquivo
  histórico (`G.archive`), o histórico por piloto e por equipe e o registro permanente de decisões
  (`G.log`).
- **Não havia versão de save** nem migração. Agora há, e foi testada.
- **Não havia verificação de integridade.** Agora a tela Diagnóstico confere assentos, contratos,
  pontuação, finanças, calendário, ids e notícias, e corrige o que é seguro corrigir.
- Saves dependiam do navegador. No desktop, agora são arquivos com backup.

**Ainda limitado (próximas fases):** uma categoria só (F1 genérica), pneus em 3 compostos
secos (não C1–C5), clima sem temperatura e umidade, staff com 4 cargos, sem academias, sem
superlicença, sem imagens ou sons, sem histórico real desde 1950.
