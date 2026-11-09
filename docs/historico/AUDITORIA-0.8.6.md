# Auditoria de código sem uso e mecânicas sem efeito (para a limpeza da 0.8.6)

Data: 08/11/2026.

**Como foi feita:** varredura automática de todo `app/src`, conferida item a item à mão. Ela procurou:
- funções e ações que nada chama;
- definições substituídas por versões novas;
- opções e regras que o jogo grava, mas não usa.

Nada desta lista causa erro hoje: o código só ocupa espaço ou engana quem lê.

**Em resumo:**
- 19 funções que nada chama (seção 1);
- 2 ações sem botão (seção 2);
- 24 versões antigas substituídas, das quais 16 são telas e funções que a interface nova trocou (seção 3);
- 5 configurações que não mudam nada no jogo (seção 4).

## 1. Funções que nada chama

| Função | Arquivo | O que era | Proposta |
|---|---|---|---|
| `Engine.setupQuality` | engine.js | Acerto antigo (antes da Fase B) | Remover |
| `Engine.setupFeedback` | engine.js | Feedback de acerto antigo | Remover |
| `Engine.genOptimum` | engine.js | Acerto ideal antigo (hoje em `setup.js`) | Remover |
| `Engine.runQualifying` | engine.js | Classificação antiga (hoje em `quali.js`) | Remover |
| `Engine.aiMode` | physics.js | Modo de corrida da IA (trocado por `Engine.aiModes`) | Remover |
| `Market.awardSuperlicense` | market.js | Superlicença antiga (hoje em `cats.js`) | Remover; a superlicença nova da 0.8.6 fica num módulo só |
| `Market.academyCost` | market.js | Custo da academia antiga | Remover |
| `Career.refreshStaffMarket` | career.js | Mercado de funcionários antigo (hoje `Staff.refreshMarket`) | Remover |
| `AI.whyRenew`, `AI.whyRelease` | ai.js | Textos explicando decisões da IA | Mostrar no Mercado ("por que a equipe renovou ou dispensou") ou remover |
| `Media.isRival` | media.js | Teste de rivalidade; a corrida usa outra lista (`race.rivals`) | Usar no painel de rivalidades da 0.8.6 |
| `Assets.licenseSummary` | assets.js | Resumo de licenças das imagens | Usar na tela "Créditos e licenças" |
| `Talent.census` | talent.js | Censo dos níveis ocultos | Mostrar só no Diagnóstico |
| `Disc.ofCat`, `Kart.byId`, `Persons.find`, `plural` | vários | Ajudantes nunca usados | Remover |
| `K85.go`, `K85.pips` | ui85-kit.js | Componentes da 0.8.5 que não entraram em nenhuma tela | Remover |

## 2. Ações sem botão

| Ação | Arquivo | Situação | Proposta |
|---|---|---|---|
| `ACT.scoutCancel` | ui-scout.js | Cancelar missão de olheiro: funciona, mas nenhuma tela tem o botão | Pôr o botão na lista de missões |
| `ACT.acAdd` | ui-people.js | "Contratar já" da academia antiga; o fluxo novo usa negociação | Remover |

## 3. Versões antigas que nunca rodam

Uma versão nova substituiu cada uma destas, e a antiga não é mais chamada.

**Interface (trocadas pela 0.8.5):**
- `shellHtml` e `shellObsHtml` (ui-core.js): o menu e o topo antigos;
- `SCREENS.calendar`, `SCREENS.finance`, `SCREENS.team`, `SCREENS.market`, `SCREENS.news`, `SCREENS.dev` (ui-screens.js) e `SCREENS.manufacturers` (ui-fac.js): versões antigas das telas;
- `SCREENS.teamPage` (ui-records.js): página da equipe antiga;
- `pitWallHtml` (ui-race.js): cartões dos pilotos na corrida antiga;
- `podiumHtml` (ui-report.js): pódio dentro do pós-corrida, hoje tela própria;
- `mailRow` e `gpDate` (ui-screens.js): substituídas em ui-time.js;
- `headshot` (ui-core.js): substituída pelo avatar novo;
- `socialFeedHtml` (ui-media.js): substituída em ui-stories.js.

**Duplicadas com o mesmo nome (vale a última, a anterior nunca roda):**
- `updateRace`, `flagHtml`, `speedMs`, `SCREENS.race` e `lapChartHtml` em ui-weekend.js;
- `stepsHtml` em ui-weekend.js (vale a de ui-quali.js);
- `edCalendar` em ui-editor.js (vale a de ui-regs.js);
- `fmtRaceTime` em ui-report.js e util.js. Duas cópias iguais: a da interface substitui a do motor dentro do jogo, mas o motor e os testes usam a de util.js. **Manter só a de util.js.**

**Proposta:** remover as versões antigas, que somam algumas centenas de linhas. Antes, conferir com os testes que nenhuma tela as usa por outro caminho.

## 4. Mecânicas e opções que não mudam nada

| O quê | Onde | O que acontece hoje | Proposta |
|---|---|---|---|
| **Nota do chefe de equipe** (funcionário "Chefe de equipe" das equipes da IA) | staff.js | Tem nota e salário, mas a nota não entra em nenhum cálculo; só o nome aparece em eventos | Dar efeito: decisões da IA (estratégia, mercado, P&D), moral da equipe e relação com os pilotos (casa com a 0.8.6-A) |
| **Regulamento "Aerodinâmica ativa"** | regs.js | Pode ser editado, mas nada lê esse valor | Dar efeito: ganho nas retas e perda nas curvas, ligado ao modo de ultrapassagem; ou remover |
| **Regulamento "Câmbios por temporada"** | regs.js | Pode ser editado, mas nada lê esse valor | Ganha efeito com os componentes do motor e do câmbio da 0.8.6-B |
| **Regulamento "Dias de teste"** | regs.js e council.js | Pode até ser votado no Conselho, mas não existe sistema de testes | Ganha efeito com os dias de teste da 0.8.6-B |
| **Opção "Redação do paddock"** (eventos escritos por IA) | ui-screens.js | No aplicativo de desktop está sempre desligada; a opção aparece, mas não faz nada | Esconder no desktop (só faz sentido numa versão online) ou remover |

## 5. O que foi conferido e está funcionando
- **Atributos dos pilotos:** todos os 15 entram na simulação.
- **Funcionários:** as 14 funções, fora o chefe de equipe, têm efeito: P&D, engenharia, estratégia, pit stop, confiabilidade do motor, operação, comercial e marketing.
- **Regulamento:** os 19 outros itens têm efeito. Entre eles: potência elétrica, combustível, peso mínimo, ATR, formato da classificação, parque fechado, Safety Car, VSC, bandeira vermelha, limites de pista, rigor dos comissários, unidades de potência e punição de motor.
- **Rivalidades:** já mudam o comportamento na pista, via `race.rivals`; só falta a tela.

## 6. Situação depois da limpeza (0.8.6-C, 08/11/2026)

**Removido (cerca de 680 linhas):**
- as 15 funções sem uso da seção 1: acerto e classificação antigos, superlicença e custo da academia antigos, ajudantes nunca usados, `K85.go`/`K85.pips`, `AI.whyRenew`/`AI.whyRelease`;
- a ação `acAdd`;
- todas as versões antigas da seção 3. As funções que outro arquivo reatribui viraram uma linha mínima, para o carregamento não quebrar.

**Reaproveitado:**
- `Media.isRival` e os dados de rivalidade: painel "Rivalidades" na página do piloto;
- `Assets.licenseSummary` e o registro: tela "Créditos e licenças" (Sistema);
- `Talent.census`: Diagnóstico;
- `G.chaos`: tela "Casos e investigações" (Mundo);
- `G.capBreaches`: quadro de estouros do teto de gastos nas Finanças;
- o painel do dono, que a página nova da equipe tinha perdido, voltou.

**Ganharam efeito:**
- nota do chefe de equipe: 15% da estratégia e 10% da direção técnica;
- aerodinâmica ativa: a asa abre mais nas retas, ganho de 15% sobre o DRS ou o modo de ultrapassagem.

**Botão adicionado:** cancelar a observação de um olheiro.

**Já estava resolvido:** a opção "Redação do paddock" já não aparece no aplicativo de computador.

**Novo:** gerador de fabricantes candidatos. A fila de motores nunca se esgota (18 nomes possíveis, sorteio determinístico pela semente).

**Ficam para a 0.8.6-B:**
- "Câmbios por temporada" e "Dias de teste" ganham efeito com os componentes e os testes.

**Pendente: tradução dos textos gerados:** as notícias e o registro ainda são gerados em português no modo inglês. Os textos fixos da interface encontrados na varredura foram traduzidos.
