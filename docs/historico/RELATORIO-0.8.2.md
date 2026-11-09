# Relatório da V0.8.2 — auditoria, integridade da database e economia

Data: 07/11/2026. Base: auditoria em `docs/historico/AUDITORIA-0.8.2.md` (plano aprovado). Inclui a correção da 0.8.1 (aceleração de hardware desligada).

## 1. Resumo executivo

**Implementado**
- **Identidade dos pilotos (`persons.js`):** uma pessoa, um registro, com regra de evidência e unificação que troca todas as referências do save.
- **Grid inicial verdadeiro:** grid real de 2026 mais os anúncios; nada de virada de ano simulada antes da primeira corrida. Cada vaga mostra a origem.
- **Calendário oficial da F1 2027**, com as categorias de suporte no mesmo fim de semana.
- **Conferência com o DriverDB:** 22 séries e 719 perfis. O DriverDB só preenche o que falta; as divergências são listadas.
- **Contenção econômica (`econ.js`):**
  - receitas reais;
  - custo de fábrica;
  - teto aplicado de verdade, com auditoria para todas as equipes;
  - patrimônio separado do orçamento esportivo;
  - resposta mínima a crises.
- **Mercado:** saída no meio do contrato tem multa mínima e precisa do consentimento da equipe atual (o caso Antonelli).
- **Ferramenta de auditoria (`scripts/audit.js`)** e migração de save v6 → v7.

**Corrigido:** 14 dos 20 bugs da auditoria e mais 3 achados durante a execução (seção 6).

**Aprimorado:** tela de Finanças (receita por componente, mercado de patrocínio, custos fixos, patrimônio, auditorias), espaço real no teto em P&D, logos de instituições e pneus, 71 fotos e 22 logos de equipe novos.

## 2. Database

| Item | Antes | Depois |
|---|---|---|
| Duplicatas confirmadas numa carreira nova | 6 | 0 (unificadas; as importações passam a reconhecer a mesma pessoa) |
| Duplicatas criadas pelo próprio jogo | sim (ids vazando entre carreiras) | 0 em 5, 10, 20, 30 e 50 temporadas e nos saves migrados |
| Pilotos ativos em 2026 aposentados ao criar a carreira | 60+ | 0 (54 reativados ao migrar um save da 0.8.0) |
| Transferências inventadas no grid inicial | dezenas (Ocon e Zhou na IndyCar, NASCAR na FE, F3 na NASCAR) | 0; vaga sem fonte = "a confirmar" ou "projeção do jogo" |
| Pilotos fictícios na criação | 186 | 108 (80 deles são o kart, que é fictício por definição) |
| F1 Academy | 13 pilotas reais e 5 fictícias | 20 de 20 vagas com pilotas reais |
| Ativos sem data de nascimento | 510 | 323 |
| Fotos de pilotos | 400 reais | 471 (+71 do DriverDB, rosto centralizado) |
| Logos | equipes das categorias cerca de 101; instituições 5; pneus 0 | +22 equipes, +4 instituições (FOM, IMSA, NASCAR, Motorsport UK), +8 pneus |

**Cruzamento com o DriverDB 2026: pilotos no grid certo do jogo, antes → depois**

| Série | Antes | Depois |
|---|---|---|
| F2 | 17 | 21 de 23 |
| F3 | 23 | 30 de 35 |
| Fórmula E | 14 | 19 de 20 |
| IndyCar | 24 | 32 de 33 |
| DTM | 16 | 19 de 23 |
| NASCAR Cup | 26 | 34 de 57 |
| Super Formula | 20 | 21 de 26 |
| F1 Academy | 13 | 18 de 22 |

O que sobra é pilotos de meio período, variações de nome e pessoas que correm duas séries (no jogo, cada pessoa tem uma categoria principal). Detalhe em `docs/VERIFICACAO-DATABASE.md`.

**Pendências de dados**
- 45 datas de nascimento divergentes entre Wikipedia/Wikidata e DriverDB, listadas para revisão. Exemplo: o DriverDB diz que Will Power nasceu em 1979; o correto é 1981.
- 323 pilotos ativos sem data de nascimento, quase todos de F4 e kart.
- 4 casos de revisão manual (mesmo sobrenome, primeiro nome parecido), em `docs/DUPLICATAS.md`.
- Sem logo: ACO, JAF (como instituição), FR Américas, Eurocup-4 e Formula Winter Series.
- Mercedes-AMG Landgraf/Mann-Filter e Red Bull Team Abt continuam com sigla: o único logo disponível era o da equipe de F1, o que seria enganoso.

## 3. Sistemas

**Modificados:**
- `cats.js`: grid inicial, aposentadoria por disciplina, datas, ids.
- `driverdb.js`: DriverDB e aposentadoria nas séries.
- `career.js`: cadeia de criação, receitas, teto, patrocínio, saída de piloto.
- `ai.js`: receitas, fábrica, teto, patrimônio.
- `market.js`: multa e consentimento.
- `time.js`: dia da corrida.
- `circuits.js`: calendário oficial.
- `disciplines.js`: ids da F1 Academy.
- `events.js`: crise relativa, patrocínio limitado.
- `migrate.js`: v7.
- `assets.js`: fotos do DriverDB.
- Interface: `ui-screens.js`, `ui-regs.js`, `ui-dev.js`, `ui-cats.js`, `ui-people.js` e `i18n-en.js`.

**Novos:** `persons.js` e `econ.js`.

**Integrados, não substituídos:** a economia nova usa o extrato, o teto e a IA que já existiam; a identidade usa o diagnóstico de duplicatas que já existia; o grid inicial usa a progressão das categorias a partir do segundo ano.

**Pendentes:**
- **0.8.3:** talentos em 7 níveis e raridade; desenvolvimento com falhas; equilíbrio esportivo; patrocínio e premiação completos.
- **0.8.4:** mercado completo e concorrência; ciclo de vida das equipes (venda, falência, saída e entrada no grid); política com veto; eventos e nível de caos; interface (calendário mensal, pódio, cartões).

## 4. Finanças: antes e depois

Jogador, mesma semente, sem investir em P&D:

| | Antes (0.8.0) | Depois (0.8.2) |
|---|---|---|
| Williams: caixa inicial | 109 mi | 76 mi |
| Williams: resultado por GP | +8 a +12 mi | cerca de +2 mi |
| Williams: caixa após 2 anos | 714 mi | 75 a 85 mi (reserva; o excedente vai para o patrimônio) |
| Williams gastando o teto inteiro | ainda +9 a +22 mi por GP | perto de zero; estouro pequeno vira multa |
| Haas gastando o teto inteiro | +5 a +15 mi por GP | entra no vermelho no 2º ano |
| Mercedes | lucro ilimitado no caixa | lucro de 8 a 12 mi por GP vai para o patrimônio; o caixa esportivo fica na reserva |

**Receita anual modelada em 2027**

| Equipe | Receita (US$ mi) |
|---|---|
| Ferrari | 456 |
| Mercedes | 400 |
| Red Bull | 399 |
| McLaren | 327 |
| Audi | 324 |
| Racing Bulls | 290 |
| Alpine | 279 |
| Cadillac | 268 |
| Williams | 238 |
| Aston Martin | 233 |
| Haas | 212 |

Composição: comercial (25 fixos + premiação pela posição + bônus histórico), patrocínio limitado pela exposição e aporte dos donos. Os aportes e bônus são estimativas do jogo, não números publicados pelas equipes.

**IA**
- Antes, as 11 equipes gastavam exatamente o teto.
- Agora, as grandes gastam 209 mi e as pequenas 100 a 170, conforme o caixa.
- O patrimônio cresce nas equipes lucrativas e o caixa esportivo fica limitado.
- Na simulação de 50 anos, nenhuma equipe da IA estourou o teto; a auditoria multa quem passar dele, inclusive o jogador.

## 5. Equilíbrio esportivo (simulações longas, `docs/RELATORIO-SIMULACAO.md`)

| Métrica (20 temporadas, semente 11, Observador) | Antes | Depois |
|---|---|---|
| Desvio entre carros no ano 7 / 15 / 20 | 0,77 / 0,67 / 1,52 | 2,19 / 2,18 / 2,45 |
| Nota máxima de carro | 102,1 (escala estourada) | 92,5 |
| Equipes no pódio por ano (média nos últimos 10 anos) | cerca de 10 | cerca de 8,5 |
| Pilotos ativos no fim | 693 | 818 (50 anos: estabiliza em cerca de 660) |
| Pilotos com nota ≥ 90 no fim | 19 | 18 (**pendente 0.8.3**) |
| Potencial ≥ 90 | 35 (2,8%) | 35 a 40 (**pendente 0.8.3**) |
| Duplicatas / erros de integridade | — | 0 / 0 em todas as rodadas (5, 10, 20, 30 e 50 anos) |

Leitura:
- A economia já impede a convergência dos carros, porque as equipes ricas desenvolvem mais.
- Ainda há equipes demais no pódio, porque o grid de pilotos infla: são os talentos e a raridade, previstos para a 0.8.3.

## 6. Bugs

| # | Bug | Gravidade | Situação | Teste |
|---|---|---|---|---|
| B1 | Veteranos aposentados na criação | Crítico | **Corrigido** (grid inicial sem virada de ano; aposentadoria por disciplina; migração reativa) | cruzamento com o DriverDB; save da 0.8.0 com 54 reativados |
| B2 | Transferências inventadas | Crítico | **Corrigido** (status por vaga) | cruzamento com o DriverDB |
| B3 | Duplicatas (Antonelli) | Crítico | **Corrigido** | `audit.js db`; 0 duplicatas em 50 anos |
| B4 | Dinheiro fácil | Crítico | **Contido** (reformulação completa na 0.8.3) | `fin` antes e depois |
| B5 | IA gastando o teto igual | Alto | **Corrigido** | gasto de 100 a 209 por equipe |
| B6 | Carros convergindo | Alto | **Melhorado** (desvio estável); pódio ainda alto: 0.8.3 | 20 e 50 anos |
| B7 | Antonelli de graça | Alto | **Contido** (multa mínima e consentimento); mercado completo na 0.8.4 | Mercedes recusa; multa de 11 mi |
| B8 | Talentos demais | Alto | **Pendente (0.8.3)** | medido |
| B9 | Calendário de 2027 | Alto | **Corrigido** | datas conferidas com o anúncio oficial |
| B10 | F2 na segunda-feira | Médio | **Corrigido** | nenhuma corrida de suporte fora do fim de semana da F1 |
| B11 | Teto que não vale | Médio | **Corrigido** (compromisso da fábrica e auditoria) | multa aplicada no teste do jogador |
| B12 | Ids vazando entre carreiras | Médio | **Corrigido** | saves da 0.6, 0.7.1 e 0.8.0 sem duplicatas |
| B13 | F1 Academy fictícia | Médio | **Corrigido** | 20 de 20 reais |
| B14 | Id diferente do nome | Baixo | **Corrigido** (e migrado) | — |
| B15 | Universo encolhendo | Alto | **Melhorado** (estabiliza em cerca de 660); entrada de talentos na 0.8.3 | 50 anos |
| B16 | Sem nascimento | Médio | **Melhorado** (510 → 323) | `audit.js db` |
| B17 | "Racingwith" | Cosmético | **Corrigido** | regeração das categorias |
| B18 | FIA como imprensa | — | **Não é bug**: a FIA publica os comunicados de regulamento | — |
| B19 | Eventos repetidos | Baixo | **Pendente (0.8.4)** | — |
| B20 | Carro com nota acima de 100 | Médio | **Corrigido** (máximo de cerca de 94 em 50 anos) | 50 anos |
| N1 | Datas da Fórmula E ("May 2026" → 20 de maio) | Médio | **Corrigido** no importador | regeração |
| N2 | F4 Alemã com o grid de 2022 (Antonelli, Câmara) | Alto | **Corrigido** (categoria revivida sem pilotos antigos) | grid inicial |
| N3 | Nascimento só com ano gravado como 1º de janeiro | Baixo | **Corrigido** (usa a data completa do DriverDB do mesmo ano) | `audit.js db` |

**Testes realizados**
- `npm test`: verificação de escopo, 10 e 4 temporadas nos dois modos, migrações v1/v3/v4 → v7.
- Estresse da interface ao vivo: português e inglês, Observador e Manager, sem erros.
- Teste do aplicativo Electron: carreira, corrida pela interface, salvar, fechar e reabrir, sem erros.
- Saves reais da 0.6.0, 0.7.1 e 0.8.0 (etapa 0 e etapa 5): migram para v7, terminam a temporada e seguem, com 0 erros.
- Telas novas em português e inglês, sem erros de console.
- Simulações de 5, 10 (Manager e Observador), 20, 30 e 50 temporadas.

## 7. Arquivos

**Criados**
- Código e dados: `app/src/persons.js`, `app/src/econ.js`, `app/data/calendar-2027.js`, `app/data/driverdb-2026.js`.
- Scripts: `scripts/audit.js`, `scripts/import_driverdb.py`, `scripts/driverdb-photos.js`.
- Documentação: `docs/historico/AUDITORIA-0.8.2.md`, `docs/historico/RELATORIO-0.8.2.md`, `docs/DUPLICATAS.md`, `docs/VERIFICACAO-DATABASE.md`, `docs/RELATORIO-SIMULACAO.md`.
- Imagens: `app/assets/img/faces/ddb/` (71 fotos), logos novos em `logos/institutions`, `logos/tyres` e `logos/teams`.

**Modificados**
- Núcleo: `ai.js`, `assets.js`, `career.js`, `cats.js`, `circuits.js`, `disciplines.js`, `driverdb.js`, `events.js`, `market.js`, `migrate.js`, `time.js`.
- Interface: `ui-cats.js`, `ui-dev.js`, `ui-people.js`, `ui-regs.js`, `ui-screens.js`, `i18n-en.js`.
- Dados: `app/data/categories.js` (regerado, só datas e nomes corrigidos), `app/data/asset-registry.js`, `app/assets/img/sources.json`.
- Scripts: `scripts/modules.js`, `scripts/import_categories.py`, `scripts/wikitable.py`, `scripts/import_logos.py`.
- Projeto e documentação: `package.json`, `package-lock.json`, `CHANGELOG.md`, `docs/DESENVOLVIMENTO.md`, `docs/marketing/3-SOBRE-O-JOGO.md`, `.gitignore`.

**Removidos:** nenhum arquivo do projeto. Só 3 logos baixados nesta versão e descartados por serem enganosos.

## 8. Próxima etapa: V0.8.3 (aguarda autorização)

**O que será feito**
- Talentos em 7 níveis, de geracional a péssimo, aplicados aos pilotos reais pela carreira, pelo duelo com o companheiro e pelo contexto.
- Raridade de geracionais por categoria.
- Atributos com perfil: o piloto pode ser forte em classificação e mediano em corrida.
- Estagnação e declínio; potencial que nem sempre se realiza; entrada de novos talentos que mantenha o universo estável.
- Desenvolvimento dos carros com capacidade por equipe, falhas, correlação túnel × pista, peças que melhoram um atributo e pioram outro, e congelamentos.
- Reformulação econômica completa: patrocinadores com segmento, exclusividade, cláusulas e risco; premiação por regra da categoria; dívidas e empréstimos.
- Meta medida: menos equipes no pódio por ano e grid de pilotos sem inflação, em 20 e 50 anos.

**Dependências:** database consolidada (feito nesta versão) e o relatório de simulação como linha de base.

**Riscos:** recalibrar os pilotos reais muda resultados conhecidos. Por isso cada ajuste será medido contra a linha de base e mostrado antes de seguir.

**Precisa de aprovação:**
1. A escala dos 7 níveis para os pilotos reais (quem é geracional hoje).
2. Se pilotos com nota 90 ou mais devem ser raros também na F1 (hoje são 1 ou 2 no grid inicial).
