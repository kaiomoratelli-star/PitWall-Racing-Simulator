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
  data.js       base de dados padrão (regras, motores, equipes, pilotos, pistas) + dados reais
  engine.js     simulação: carro, acerto, clima, classificação, corrida volta a volta
  physics.js    compostos C1–C5, temperatura de pneu e pista, clima, setores, bateria
  regs.js       regulamento técnico/esportivo e versões por temporada
  setup.js      modelo de acerto (5 ajustes × 5 sensações), memória e feedback do piloto, janela do engenheiro
  practice.js   treinos livres com relógio (60 min), programas, garagem, alocação de pneus, simulação pelo engenheiro
  narrator.js   narração de transmissão com nomes reais de curvas e controle de repetição
  quali.js      classificação ao vivo Q1/Q2/Q3 e SQ1/SQ2/SQ3, tráfego, voltas deletadas, bandeira vermelha
  racelog.js    relatório volta a volta: rádio, ordens de equipe, undercut, resumo narrado de cada volta
  circuitgen.js gerador de circuitos e logística do calendário
  migrate.js    versão do save + migrações
  ai.js         IA dos chefes de equipe (caixa, personalidade, investimentos, staff)
  staff.js      15 funções de staff, mercado e decisões das equipes
  market.js     contratos, superlicença, academias, silly season e negociação
  career.js     carreira/universo: temporada, fim de semana, finanças, P&D,
                registro permanente (log), arquivo histórico
  events.js     eventos com decisões + notícias baseadas em fatos
  media.js      imprensa, rede social, memória de histórias, rivalidades, escândalos fictícios
  cats.js       outras categorias: simulação por data, superlicença, progressão, novos talentos
  sisters.js    equipes irmãs: compra, academia compartilhada, promoções, parceria técnica
  council.js    Conselho da FIA (Comissão de F1): propostas, impacto por equipe, votos, negociação, aplicação
  lang-en.js    textos do núcleo em inglês (narração, rádio, feedback); applyLang() troca os modelos
  diag.js       verificação de integridade e reparos seguros
  storage.js    salvamento (disco no desktop, nuvem no Claude, navegador)
  sound.js      sons sintetizados (WebAudio)
  i18n.js       idiomas: o português é a chave; em inglês, um observador traduz o que entra na tela
  i18n-en.js    catálogo em inglês (textos fixos) e modelos para textos com números e nomes
  ui-*.js       interface
  main.js       inicialização + testes automáticos do executável
app/data/       dados reais: real-db (F1 2026), real-extra (contratos, staff, academias),
                history (1950–hoje), records (recordes e linhagens), team-lore, categories
app/assets/     fontes empacotadas (licença OFL) e imagens (pilotos, carros, circuitos, categorias).
                Fonte oficial da F1: copie os arquivos Formula1-Display-*.woff2/.ttf/.otf para
                app/assets/fonts; o build detecta (Regular 400, Bold 700, Black 900, Wide) e usa nos
                títulos. Sem eles, vale a Titillium Web Black em caixa alta. A Formula1 Display é da
                Formula One Management: precisa de licença antes da venda.
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

## 7. Idiomas (desde a v0.7)

- O jogador escolhe português (Brasil) ou inglês na primeira abertura, na tela inicial e em Salvar e opções. A escolha fica no `localStorage` (`pw-lang`) e vale para todas as carreiras.
- Interface: o texto em português é a chave do catálogo (`I18N_EN` em `i18n-en.js`). Em inglês, `I18N` observa o DOM (`MutationObserver`) e traduz texto, `title`, `placeholder` e `aria-label`: primeiro pelo catálogo exato, depois pelos modelos com números e nomes (`I18N_PATS`), por fim frase a frase. Em português nada é observado.
- Textos gerados pelo jogo: o núcleo usa `tr(pt, en)` nas frases montadas no código e `applyLang()` troca os modelos de narração, rádio, feedback do piloto, pneus e abandonos. O que já foi gerado (notícias, registros) fica no idioma em que foi escrito; as manchetes mais comuns também são traduzidas na exibição.
- Para traduzir um texto novo: escreva em português como sempre e acrescente a linha em `i18n-en.js` (texto fixo) ou um modelo (texto com números). Textos gerados no núcleo usam `tr()`.
