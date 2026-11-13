# PitWall Racing Simulator — guia para o Claude Code

Simulador de gestão de automobilismo para Windows (Electron), em português e inglês, da
Moratelli Game Company (MGC). Dois modos: **Manager** (comanda uma equipe) e **Observador**
(acompanha o universo). O núcleo da simulação fica em `app/src/core/` (JavaScript puro, sem DOM);
a interface em `app/src/ui/`; os dados em `app/data/`; o aplicativo desktop em `desktop/`.
Arquitetura: `docs/ARQUITETURA.md` · regras de desenvolvimento: `docs/DESENVOLVIMENTO.md` ·
plano da versão: `docs/PLANO-0.9.md`.

## Comandos
| Comando | O que faz |
|---|---|
| `npm test` | guardas, Schema, regras, paridade PT/EN, simulação prolongada e categorias (~4 min) |
| `npm run build` | gera `app/dist/index.html` e o Pacote de dados `app/dist/packs/pitwall-dados-reais.js` (`--edicao=ficticia`: a edição fictícia, regra 19; `--sem-dados-reais`: sem pacote nenhum) |
| `node scripts/fictional-world-check.js 2` | regra 19: a mesma carreira no mundo real e no fictício (só os nomes mudam) e nenhum nome real sobrando |
| `node scripts/determinism-check.js` | 4 carreiras com semente fixa; compara as assinaturas com `tests/determinism.json` |
| `node scripts/determinism-check.js --write` | regrava as assinaturas (só após mudança de jogo aprovada e registrada no CHANGELOG) |
| `node scripts/ui85-check.js 2` | interface em Playwright/Chromium (precisa do build) |
| `node scripts/save-compat-check.js` | abre os saves antigos de `tests/saves/` na versão atual (`--pack`: com o Pacote de dados, como o jogo carrega) |
| `node scripts/screen-purity-check.js 3` | regra 6: a mesma carreira abrindo todas as telas e sem abrir nenhuma termina idêntica (Playwright) |
| `node scripts/fictional-check.js 2` | o jogo inteiro sem dados reais (núcleo e 50 telas) e o save real recusado no fictício (Playwright) |
| `npm run test:smoke` | abre o aplicativo Electron de verdade |
| `npm run dist` | gera o instalador NSIS (Windows) |

## Regras do dono (valem para código, texto e marketing)
1. A interface nunca usa "IA". Use "simulação", "equipes que tomam as próprias decisões" ou "mundo que reage".
2. Todo texto novo em português do Brasil **e** inglês completo (`byLang`).
3. Uma melhoria nunca quebra um modo existente (Manager ou Observador). Mudança na simulação só se for
   intencional, documentada e com as assinaturas de determinismo regravadas de propósito.
   Mudança só visual nunca altera o resultado.
4. Toda mecânica nova ou corrigida tem um teste por regra, que falharia antes da correção.
5. Todo campo novo do save entra no `Schema`.
6. Uma tela nunca sorteia números ao desenhar (vale para a corrida 2D): o visual não usa o RNG da simulação.
7. Versões e Git: **push em `main` = lançamento**, só com autorização explícita; correção de versão
   publicada = `x.y.z-1`; nunca se troca instalador publicado nem se move tag.
8. Não é oficial nem licenciado pela F1. Fotos e logos licenciados ou substituídos antes de vender;
   carros 2D e pinturas são arte própria. Haverá edição gratuita (mundo fictício) e paga; os dados reais
   ficam numa base de dados à parte.
9. Separe fato de não fato: código / decisão do dono / regra oficial (com temporada e fonte) / inferência /
   proposta. Nunca invente recurso.
10. Regras esportivas dizem categoria e ano. Uma regra de 2026 não vale automaticamente para outra temporada.
11. Desempenho: mudança visual pesada exige medição antes e depois (FPS, CPU, memória).
12. Superlicença e regulamentos pelas regras reais do ano; o Conselho da FIA do jogo pode mudá-las no futuro.
13. Todo piloto que passou pela F1 fica ligado ao histórico real do jogo.
14. Overall inicial pelo prestígio de cada categoria.
15. Ultrapassagens: o alvo é a contagem maior.
16. Piloto não morre em acidente (fim de carreira); morte natural de idosos no save como homenagem; nunca menores.
17. Sempre o dado real mais recente; avisar antes de usar dado antigo.
18. Software sempre na versão mais nova com suporte (Node LTS ativo, Electron, dependências, actions).
19. **Mundo fictício = o banco de dados original, inteiro e idêntico** (todos os pilotos, equipes, competições,
    números e histórico), com **todos os nomes trocados por nomes gerados automaticamente** e **os mesmos IDs**.
    Nunca um mundo à parte. (Decisão do dono, 13/11/2026.)

## Regras de engenharia
- Ganchos com nome (registro de ganchos), nunca embrulhar funções antigas.
- O núcleo usa só o RNG com semente do jogo; nada de `Math.random` ou `Date.now()` na simulação.
- Commits na branch de trabalho, nunca direto em `main`; nada de force push.
- Todo asset novo entra no registro (`scripts/make-asset-registry.js`).
- Nenhum dado pessoal (e-mail, endereço) no código ou nos documentos.
