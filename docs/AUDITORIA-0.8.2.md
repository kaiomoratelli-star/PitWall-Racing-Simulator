# Auditoria da V0.8 — diagnóstico e plano da V0.8.2

Data de referência: 07/11/2026. Versão auditada: 0.8.0 (branch `v0.8.1`, que só acrescenta a aceleração de hardware desligada).
Este documento é a primeira ordem do PROMPT MESTRE de ultrarrealismo: diagnóstico e plano. **Nada foi implementado ainda além da correção da 0.8.1.**

Como foi medido: um analisador fora da interface (carrega o mesmo núcleo do jogo, `scripts/modules.js`) cria carreiras com semente fixa, simula temporadas e mede database, finanças, equilíbrio e integridade. Os grids foram cruzados com o DriverDB (classificações de 2026 baixadas em 07/11/2026) e o calendário com o anúncio oficial da F1 de 16/09/2026.

---

## 1. Arquitetura (resumo)

| Camada | Arquivos | Observação |
|---|---|---|
| Dados reais | `app/data/real-db.js` (F1 2026, f1db), `real-extra.js` (contratos, staff, academias), `drivers-db.js` (1,3 MB, Wikipedia/Wikidata), `categories.js` (22 séries), `history.js`, `records.js`, `fia-circuits.js`, `real-tracks.js`, `genders.js`, `asset-registry.js` | gerados por scripts Python em `scripts/import_*.py` |
| Núcleo | 35 módulos (`util` … `diag`), ~9 mil linhas | padrão decorador: módulos novos embrulham `Career.*`, `Cats.*`, `Market.*` |
| Interface | 31 módulos `ui-*` + `main.js` | JS puro, sem framework |
| Desktop | `desktop/` (Electron 33, saves em `%APPDATA%`, backups, logs) | instalador NSIS, CI em Windows real |

Sistemas existentes que serão **aproveitados** (nenhum será reescrito do zero): simulação de corrida (`engine`, `physics`), carreira e finanças (`career`), IA das equipes (`ai`), mercado (`market`, `market-plus`, `contracts`), categorias (`cats`, `driverdb`, `kart`, `disciplines`), P&D por peça (`rnd`), regulamentos (`regs`, `regcal`, `council`), equipes irmãs (`sisters`), eventos e mídia (`events`, `media`, `stories`), calendário por dia (`time`), migrações (`migrate`, save v6), diagnóstico (`diag`).

**Dependências críticas.**
- Finanças do jogador e da IA são **dois sistemas diferentes**: o jogador usa `G.finances` (`career.js`) e a IA usa `t.cash` (`ai.js`). Por isso as regras divergem.
- `Career.endSeason` é embrulhado por 6 módulos (`kart`, `market-plus`, `regcal`, `rnd`, `stories`, além do próprio `career`). Qualquer mudança no fim de temporada precisa respeitar essa ordem.
- A database de pilotos é montada em três passos que se sobrepõem: `REAL_DB` (F1), depois `REAL_CATS` (categorias), depois `DRIVER_DB` (outras séries).

---

## 2. Database

### 2.1 Números (carreira nova, 2027)
- 1.340 pilotos no universo: 899 ligados ao Wikidata, 25 com id próprio, 229 de categorias sem identificador externo e **186 gerados (fictícios) já na criação**.
- **510 pilotos sem data de nascimento.**
- Nenhum id repetido e nenhum nome exatamente igual. O problema está nas variações de nome.

### 2.2 Duplicatas

**Confirmadas** (a mesma pessoa com dois registros):

| Registro 1 | Registro 2 | Causa |
|---|---|---|
| Kimi Antonelli (F1, Mercedes, 2006-08-25) | Andrea Kimi Antonelli (FRECA, sem data) | nome diferente em duas fontes. **É o caso relatado**: o registro da FRECA sobe pela progressão das categorias e pode ser contratado por outra equipe (ex.: Ferrari) |
| Austin Hill (WEC, 1994-04-21) | Austin J. Hill (NASCAR Xfinity) | variação de nome. Além disso, ele não corre no WEC |
| Abdullah Kamel | Abdullah Ayman Kamel (F4 EAU) | variação de nome |
| Nico Varrone (F2) | Nicolás Varrone (WEC, 2000-12-06) | apelido |
| Maximilian Popov (FRECA) | Maksimilian Popov (F1 Academy Wild Card) | transliteração |
| Cam Waters (NASCAR Trucks) | Cameron Waters (Supercars) | apelido |

O próprio `DRIVER_DB` também tem a duplicata: `pw-andrea-kimi-antonelli` e `Q112073790`.

**Exigem revisão manual** (provavelmente pessoas diferentes): Ren Sato × Rintaro Sato; os três Kobayashi (Rikuto, Ren, Riku); Ryo × Ryutaro Sakai; Mads × Magnus Holm; Mads × Magnus Dahl.

**Duplicatas criadas pelo próprio jogo** (bug):
- `Cats._ids` guarda os ids da **primeira carreira aberta na sessão** e os reaproveita nas seguintes. Ao abrir outra carreira, ou carregar um save, nascem ids `…x` e homônimos. Nos saves da 0.6 e da 0.7 migrados apareceram 3 pares (Inês Ferreira, Emiliano Treviño, Kabir Iyer).
- A F1 Academy renomeia pilotos gerados para nomes femininos sem trocar o id. Exemplos: `c-logan-parker` = "Madison Reed" e `c-oliver-bennett` = "Jessica Fenwick".

### 2.3 Grids de 2026 cruzados com o DriverDB

| Série | DriverDB 2026 | No grid certo | No jogo em outra série | Ausentes do jogo | No jogo sem constar em 2026 |
|---|---|---|---|---|---|
| F1 | 24 titulares | 22 | — | 0 (Albon só difere no nome) | — |
| F2 | 23 | 17 | 6 | 0 | 5 (promovidos da F3 pelo jogo) |
| F3 | 35 | 23 | 12 | 0 | 7 |
| Fórmula E | 20 | 14 | 5 | 0 | 6 |
| IndyCar | 33 | 24 | 8 | 0 | 9 |
| WEC | 108 | 35 | 24 | 49 | 19 (13 gerados) |
| DTM | 23 | 16 | 7 | 0 | 4 (gerados) |
| NASCAR Cup | 57 | 26 | 28 | 3 | 8 |
| Stock Car | 63 | 22 | 33 | 8 | 9 (6 gerados) |
| Super Formula | 26 | 20 | 5 | 1 | 4 |
| F1 Academy | 22 | 13 | 7 | 2 | 7 (5 fictícias) |
| FRECA | 37 | 22 | 14 | 1 | 8 |

Não entram como erro: os ausentes da F1, Fórmula E, IndyCar e F1 Academy são o mesmo piloto com outro nome (Dan/Daniel Ticktum, Pato/Patricio O'Ward, Natalia Granada/Granada Ferrero). Os substitutos de uma corrida só também não.

**Problemas encontrados:**
1. **Pilotos ativos em 2026 aposentados na criação da carreira** (pelo menos 60 nas séries conferidas). Exemplos:
   - IndyCar: Will Power, Scott Dixon, Takuma Sato, Romain Grosjean.
   - Fórmula E: Buemi, Vergne, Di Grassi, Mortara.
   - NASCAR: Hamlin, Logano, Wallace, Keselowski, Chastain.
   - WEC: Kubica, Kobayashi, Pier Guidi.
   - Stock Car: Thiago Camilo, Daniel Serra, Cacá Bueno, Barrichello.

   Causa: `Cats.progression(G, true)` roda na criação e aplica às séries profissionais a regra das categorias de base (aposenta quem tem 39 anos ou mais, e às vezes a partir de 34).
2. **Transferências inventadas para 2027.** A mesma progressão inicial move pilotos e preenche vagas como se a temporada 2026→2027 já tivesse acontecido. Exemplos:
   - Ocon, Zhou, Doohan e Sargeant na IndyCar.
   - Justin Haley e Harrison Burton (NASCAR) na Fórmula E.
   - Heuzenroeder, Escotto e Shin (F3) na NASCAR Cup.
   - Justin Allgaier no WEC.
   - Pilotos da F3 promovidos à F2.

   Nada disso foi anunciado, e o jogo apresenta como fato.
3. **F1 Academy com 5 pilotas fictícias** enquanto pilotas reais (Palmowski, Gademan, Larsen, Westcott, Shi Wei, Danielsson) ficam sem vaga.
4. **186 pilotos gerados já no início** (WEC, DTM, Stock Car e F4s), em vez de pilotos reais disponíveis.
5. Nome com erro de importação: "Meyer Shank Racingwith Curb-Agajanian".
6. F1 2027: a fonte (Wikipedia, 06/11/2026) confirma 19 dos 22 titulares. Lawson, Lindblad e Bearman aparecem como "vaga ainda não definida", o que está correto.

### 2.4 Calendário de 2027 (F1)
O jogo usa o calendário de 2026 como foi disputado. O **oficial de 2027** (F1/FIA, 16/09/2026) é diferente:
- **Faltam:** Bahrein (abertura em 14/03), Arábia Saudita, Portimão (20/06) e Istambul (03/10).
- **Sobram:** Zandvoort e Barcelona (fora em 2027) e Sepang (não está no calendário).
- O jogo tem 23 etapas; o oficial tem 24. O final é em 12/12, e não em 05/12.
- Las Vegas é no **sábado** (20/11); o jogo coloca no domingo.
- Sprints de 2027: 10 (Bahrein, Austrália, Japão, Canadá, Mônaco, Silverstone, Monza, São Paulo, Catar e Abu Dhabi). É preciso conferir o que o jogo usa.

**Bug de datas das categorias de suporte:** F2, F3 e as outras trocam só o ano da data de 2026. A F2 em Melbourne cai em **08/03/2027 (segunda-feira)**, enquanto a F1 corre em 07/03. Em cada ano a defasagem muda, e nada garante que a corrida de suporte fique no mesmo fim de semana da F1.

### 2.5 Fotos e logos

| Item | Cobertura | Falta |
|---|---|---|
| Fotos de pilotos reais ativos | 400 de 1.081 (37%) | F1: Minì, Fornaroli e Beganovic. F2: 13 de 21. F4s e kart: 0 |
| Logos de equipes da F1 | 11/11 | — |
| Logos de equipes das categorias | cerca de 101 de 263 | Super Formula (quase todas), DTM, WEC por carro, Stock Car, F2 (Invicta, Hitech, Campos, Trident) |
| Logos de categorias | 38 | FR Américas, Eurocup-4 |
| Instituições | FIA, ADAC, JAF, Motorsport Australia, SRO | ACO, IMSA, organizadores da IndyCar/NASCAR e FOM. A FIA também aparece como "veículo de imprensa" |
| Pneus | pasta vazia | Pirelli, Hankook, Bridgestone, Yokohama, Firestone, Goodyear |

O DriverDB respondeu daqui e tem foto e logo para boa parte das séries. É a fonte prevista no documento, mas as imagens são de terceiros: antes da venda precisarão de licença, como já está em `docs/DESENVOLVIMENTO.md`.

---

## 3. Economia (crítico)

**Medição** (Williams, semente 7; caixa inicial US$ 109 mi; teto de US$ 215 mi):

| Cenário | Lucro por GP | Caixa no fim de 2027 | Caixa no fim de 2028 |
|---|---|---|---|
| Sem investir | +8 a +12 mi | 389 mi | 714 mi |
| Investindo no máximo (todo o P&D que o teto permite) | +9 a +22 mi | 327 mi | 623 mi |
| Haas sem investir | +5 a +15 mi | 320 mi | 585 mi |

Isso confirma o relato: o caixa inicial volta em 3 a 5 GPs e cresce sem limite.

**Causas:**
1. As receitas são derivadas de `team.budget`: 36% em direitos de TV e cerca de 62% em patrocínios. Já as despesas recorrentes são pequenas: pilotos, staff, logística e motor somam perto de 100 mi por ano. Não existe custo de fábrica (centenas de funcionários, produção, manutenção), que é a maior despesa real.
2. O P&D é limitado pelas vagas e pelo teto, não pelo dinheiro: mesmo no máximo, ele consome só cerca de 58 mi por ano.
3. Patrocínio é calculado como uma fração do orçamento, e não a partir de exposição, mercado e negociação. Não há limite de patrocinadores por categoria de patrocínio, nem exclusividade.
4. Não existe separação entre patrimônio e orçamento esportivo: todo o lucro vira caixa utilizável.
5. **IA:** todas as 11 equipes gastam **exatamente o teto** (215 mi) em todas as temporadas, inclusive Haas, Alpine e Racing Bulls. Isso acontece porque a receita da IA é `budget × 0,82` e todos os orçamentos de partida (260 a 400 mi) ficam acima do teto. As equipes grandes acumulam caixa (Mercedes: 186 → 410 mi em 6 anos), mas sem uso esportivo.
6. O teto vale para o P&D do jogador e para o gasto da IA. Não há auditoria, infração nem punição. Despesas operacionais lançadas depois podem estourar o teto (o jogador terminou 2027 com 237,9 mi "sob o teto", acima dos 215).
7. Os orçamentos de partida estão inflados: Williams 340 e Haas 260, com o teto em 215. Precisam de revisão com fontes públicas.

## 4. Equilíbrio esportivo e carros

Medição: 6 temporadas, modo Manager, semente 1.

| Ano | Equipes que venceram | Equipes no pódio | Desvio dos carros | Carro pior–melhor | F1: nota média (mediana) / pior | Pilotos ≥ 85 |
|---|---|---|---|---|---|---|
| 2027 | 3 | 6 | 3,1 | 84,8–94,2 | 82 / 59 | 11 |
| 2029 | 4 | 8 | 2,6 | 85,6–94,5 | 84 / 74 | 13 |
| 2031 | 6 | 10 | 2,5 | 86,5–95,5 | 85 / 80 | 19 |
| 2032 | **7** | **11 (todas)** | **1,7** | 88,4–94,5 | 87 / 80 | 22 |

Isso reproduz o relato: em 5 ou 6 anos as 11 equipes sobem ao pódio.

**20 temporadas** (modo Observador, semente 11):

| Ano | Equipes que venceram | Equipes no pódio | Desvio dos carros | Carro pior–melhor | Pilotos ≥ 90 | Pilotos ≥ 85 | Pilotos ativos no universo |
|---|---|---|---|---|---|---|---|
| 2027 | 4 | 6 | 2,7 | 84,7–92,2 | 2 | 11 | 1.262 |
| 2033 | 9 | 11 | 0,8 | 95,6–98,4 | 2 | 26 | 985 |
| 2041 | 7 | 10 | 0,7 | 99,6–101,9 | 17 | 43 | 835 |
| 2046 | 6 | 8 | 1,5 | 97,2–102,1 | 19 | 46 | 693 |

Com o tempo, a nota dos carros passa de 100 (escala estourada), os pilotos de 90+ se multiplicam por 10 e o universo perde 45% dos pilotos. O caixa das grandes equipes estabiliza perto de 500 mi, sem uso esportivo.

**Causas:**
- **Puxão para a média todo ano:** `career.js`, fim de temporada, `82 + (v − 82) × 0,84`, que no ano de regulamento novo vira × 0,62.
- **Gasto da IA igual para todos** (item 3.5).
- **Retornos decrescentes medidos contra a média do grid**, que favorecem quem está atrás.
- O piso de diferença do `regcal` (desvio de 2,0) segura a queda, mas não é suficiente.

## 5. Talentos

- **Grid da F1 de 80 a 94** (14 pontos). Cada piloto tem os 9 atributos quase iguais: a diferença média entre o melhor e o pior atributo é de 5 pontos. Por exemplo, Verstappen vai de 93 a 96 e Stroll de 77 a 82. Não existe "ótimo em classificação, mediano em corrida".
- **Potencial ≥ 90: 35 pilotos (2,8% do universo)**, e 8 deles com potencial ≥ 95. O documento pede 0,1–0,5% de geracionais.
  - Há absurdos: Caleb Costner, 34 anos, NASCAR Trucks, com potencial 95; Kyle Kelley, 42 anos, com potencial 95.
- **Inflação com o tempo:** a mediana da F1 sobe de 82 para 87 e o pior piloto de 59 para 80 em 5 anos (pilotos ≥ 85: de 11 para 22). O crescimento (`driverGrowth`) só para no potencial, e o declínio começa tarde (33 anos).
- **O universo encolhe:** são 1.267 pilotos ativos em 2027 e 1.010 em 2032. Aposentadorias e desistências superam a entrada de novos talentos.
- Não existe a classificação em 7 níveis (de geracional a péssimo).

## 6. Mercado e contratos

- **Antonelli sai da Mercedes de graça.** O contrato dele no jogo termina em 2027 (`contractYears = 0`, valor estimado, porque não há fonte) e a multa é `salário × anos × 0,8`, que dá **zero no último ano**. A Mercedes não é consultada; basta o piloto aceitar.
- A aceitação é dominada pelo salário: oferecendo cerca de 2× o pedido, a Haas tem perto de 85% de chance por tentativa, e o dinheiro é ilimitado (item 3).
- Não existem consentimento da equipe atual, contraproposta de retenção, cláusula de rescisão real, direitos de imagem, nem concorrência entre equipes da IA pelo mesmo piloto no momento da oferta do jogador.

## 7. Equipes, política e eventos

- **Não existe ciclo de vida corporativo:** não há proprietário, valor de mercado, dívida, venda, falência, saída do grid nem entrada de equipe nova. Só a compra de equipe irmã (`sisters.js`), com a regra "equipe de ponta: os donos não vendem".
- **O Conselho existe** (`council.js`, votos e negociação), mas sem poder de veto diferenciado, sem concessões em troca de votos e sem pedido de entrada de equipe.
- **Equipes irmãs e parceiras** já são separadas (`sisters`, `partnerOf`), mas a "parceria técnica" não tem limites regulamentares explícitos.
- **Eventos raros:** de 0 a 2 histórias por temporada (raridade adequada), mas quase todas do mesmo tipo ("túnel de vento"); faltam variedade e encadeamento.
  - Nenhum escândalo grande em 6 temporadas.
  - A morte existe só por causas naturais, para idosos, e vem desligada por padrão. Não existe morte em acidente.
  - Não existe nível de caos de 0 a 4 (só a taxa `eventRate`).

## 8. Interface

- P&D: as vagas e o bloqueio do botão já funcionam (`ui-dev.js`). Falta o realce da peça no desenho do carro e falta o comparativo de antes e depois em todo projeto (hoje só no `devDone`).
- Calendário: existe a tela `SCREENS.calendar`, mas não a grade mensal navegável no estilo do F1 Manager.
- Pódio, cartões de piloto, painel e controles de ERS e ritmo: existem em partes desde a 0.8 e serão revisados na 0.8.4.

## 9. Saves antigos

Saves criados com o código real da **0.6.0** (v4) e da **0.7.1** (v5), salvos no meio de uma temporada:
- migraram para v6 sem erro;
- terminaram a temporada, viraram o ano e correram mais 2 GPs;
- deram zero erros no diagnóstico.

**Problema:** a migração criou 3 pilotos duplicados (bug do `Cats._ids`, item 2.2). Herdam também os erros da database: os aposentados e as transferências inventadas entram no save migrado.

---

## 10. Lista de bugs

| # | Sistema | Esperado | Encontrado | Gravidade | Causa provável |
|---|---|---|---|---|---|
| B1 | Database / categorias | pilotos ativos em 2026 seguem ativos em 2027 | 60+ veteranos aposentados na criação | **Crítico** | `Cats.progression(G, true)` aplica aposentadoria por idade às séries profissionais |
| B2 | Database / categorias | grid de 2027 = 2026 + anúncios confirmados | transferências e promoções inventadas apresentadas como fato | **Crítico** | progressão inicial e preenchimento de vagas com pilotos livres de qualquer série |
| B3 | Database | uma pessoa, um registro | 6 duplicatas reais (Antonelli e outras) | **Crítico** | nomes diferentes entre as fontes; não há chave de identidade |
| B4 | Economia | caixa equilibrado, investimento caro | +10 mi por GP; 109 → 714 mi em 2 anos | **Crítico** | receitas proporcionais ao orçamento, sem custo de fábrica |
| B5 | IA / economia | gasto proporcional à capacidade | todas as 11 equipes gastam exatamente o teto | **Alto** | receita da IA = orçamento × 0,82, acima do teto para todos |
| B6 | Equilíbrio | diferença entre carros coerente com os recursos | 11 equipes no pódio em 6 anos | **Alto** | puxão para a média + B5 |
| B7 | Mercado | tirar piloto de rival exige negociação | Antonelli sai sem multa e sem a Mercedes opinar | **Alto** | multa zera no último ano; não há consentimento da equipe |
| B8 | Talentos | geracionais em 0,1–0,5% | 2,8% com potencial ≥ 90; potencial 95 aos 42 anos | **Alto** | `rollPotential` não considera idade e série; crescimento sem estagnação |
| B9 | Calendário | calendário oficial de 2027 | 4 GPs faltando, 3 sobrando, final em 05/12 | **Alto** | `real-db` traz o calendário de 2026 |
| B10 | Calendário | suporte no mesmo fim de semana da F1 | F2 numa segunda-feira (08/03/2027) | **Médio** | só o ano é trocado |
| B11 | Teto orçamentário | não ultrapassar o teto | 237,9 de 215 mi "sob o teto" | **Médio** | operação e reparos entram depois da checagem; não há fiscalização |
| B12 | Ids | ids únicos por carreira | `Cats._ids` vaza entre carreiras e saves | **Médio** | cache global do módulo |
| B13 | F1 Academy | grid real | 5 pilotas fictícias, reais sem vaga | **Médio** | renomeação de pilotos gerados + casamento de nomes falho |
| B14 | Ids | id coerente com o nome | `c-logan-parker` = "Madison Reed" | **Baixo** | renomeação sem trocar o id |
| B15 | Universo | número estável de pilotos | 1.262 → 693 em 20 anos | **Alto** | novos talentos só pela F4; muitas desistências |
| B16 | Database | data de nascimento | 510 sem data | **Médio** | fontes sem P569 |
| B17 | Dados | nomes corretos | "Meyer Shank Racingwith…" | **Cosmético** | importação da Wikipedia |
| B18 | Logos | FIA só como instituição | FIA também como veículo de imprensa | **Cosmético** | importação de logos de mídia |
| B20 | Carros | escala até 100 | carros com nota 102 depois de 15 anos | **Médio** | evolução sem teto relativo; o puxão para 82 não compensa o gasto igual de todos |
| B19 | Eventos | variedade de histórias | quase sempre "túnel de vento" | **Baixo** | sorteio sem peso por tipo nem cooldown por tipo |

Testes automáticos atuais (`npm test`): veja a seção 13. Nenhum deles detecta B1–B20, porque só verificam a integridade técnica (assentos, ids, pontuação, saves), não o realismo.

---

## 11. Divergência no documento mestre (decisão sua)

O PROMPT MESTRE põe a **reformulação financeira** no título da seção da V0.8.2, mas a ordem de versões diz "V0.8.3 — Economia". Minha recomendação:

- **V0.8.2:** database, duplicatas, calendário, bugs críticos de dados e ids, fotos e logos. Mais uma **contenção mínima da economia**: incluir o custo de fábrica e fazer o teto valer de verdade, para o jogo deixar de ser trivial já nesta versão.
- **V0.8.3:** a reformulação econômica completa (patrimônio separado do orçamento esportivo, patrocínio novo, premiação real, auditoria do teto), o equilíbrio dos carros e os talentos.

Isso porque a economia nova depende de orçamentos de equipe revisados, que saem da auditoria da database.

---

## 12. Plano da V0.8.2 (para aprovação)

### A. Identidade e duplicatas
1. Chave persistente `pid` para cada pessoa: Wikidata QID quando existir; senão, um id estável do nome canônico mais o nascimento.
2. Unificação com regra de evidência:
   - nome contido no outro + mesma nacionalidade + data de nascimento compatível + carreiras que não se sobrepõem;
   - lista fixa de apelidos (Cam/Cameron, Nico/Nicolás, Pato/Patricio, Dan/Daniel, transliterações).
   - Homônimos sem evidência não se juntam.
3. Unificar as 6 confirmadas, preservando o registro mais completo, migrando estatísticas e contratos e limpando referências órfãs. Cada unificação é registrada no log.
4. Corrigir `Cats._ids` (cache por carreira) e a renomeação da F1 Academy (id novo).
5. **Migração do save v6 → v7:** a mesma unificação aplicada a carreiras em andamento, sem perder histórico.
6. Relatório gerado automaticamente em `docs/DUPLICATAS.md`, com confirmadas, possíveis e revisão manual.

### B. Grid inicial verdadeiro (sem inventar)
1. A carreira de 2027 começa com o **grid de 2026 + anúncios confirmados para 2027**.
   - Cada vaga recebe um status: `confirmado`, `anunciado`, `a definir` ou `projeção do jogo`.
   - A progressão entre categorias só roda a partir da primeira virada de ano simulada.
2. Séries profissionais com aposentadoria por idade própria: IndyCar, NASCAR, WEC e Stock Car permitem veteranos até cerca de 45 a 50 anos.
3. Reativar os 60+ veteranos aposentados por engano. A migração corrige saves cuja temporada ainda é 2027 e não mexe em quem já simulou anos.
4. Preencher vagas com pilotos reais do DriverDB antes de gerar fictícios. Gerados só onde a série não tem fonte, e marcados.
5. Corrigir nomes quebrados vindos da importação.

### C. Conferência 2026/2027 com o DriverDB
1. Novo `scripts/import_driverdb.py`: baixa as classificações e as páginas de piloto das séries do jogo, com cache e retomada. Deve respeitar o site (intervalo entre pedidos).
2. Gera `docs/VERIFICACAO-DATABASE.md` por série, comparando nome, nacionalidade, nascimento, equipe, número e estatísticas. As diferenças viram lista de correção; nada é sobrescrito sem regra.
3. Preencher datas de nascimento faltantes pelo DriverDB e pelo Wikidata.

### D. Calendário
1. Calendário oficial da F1 2027: 24 etapas, datas reais, Las Vegas no sábado e as 10 sprints.
2. Categorias de suporte ancoradas no fim de semana da F1 (mesmo GP, sábado e domingo). As séries independentes mantêm o dia da semana real.
3. O teste verifica que nenhuma corrida cai em data repetida ou em dia impossível.

### E. Fotos e logos (downloader resiliente)
1. Um só script com cache, verificação de formato e tamanho, retomada, registro de progresso e sem sobrescrever arquivo válido.
2. Ordem de fontes: site oficial da equipe ou categoria → DriverDB → Wikimedia. Fotos de outras pessoas nunca entram (conferência por nome e página de origem).
3. Prioridade: F1 (3 faltando), F2 e F3, IndyCar, Fórmula E, WEC, Super Formula, DTM e F1 Academy.
4. Logos: equipes das categorias, ACO, IMSA, IndyCar, NASCAR, FOM, fabricantes de pneus, FR Américas e Eurocup-4. Tirar a FIA da lista de imprensa.

### F. Contenção econômica mínima (se você aprovar a recomendação da seção 11)
1. Custo de fábrica e operação por porte da equipe para o jogador e para a IA, no mesmo cálculo.
2. O teto passa a ser checado contra **todo** o gasto elegível, inclusive operação e reparos; o que passar dele vira infração registrada.
3. A IA para de gastar o teto só porque pode: o gasto passa a depender de receita real e caixa.

### G. Testes da 0.8.2
1. Novo `scripts/audit.js` (este analisador, no repositório): database, duplicatas, aposentados ativos, calendário, finanças, equilíbrio e talentos, para 5, 10, 20, 30 e 50 temporadas.
2. Relatório comparativo por temporada em `docs/`.
3. Testes atuais: `npm test`, interface ao vivo com o Playwright e o teste do executável no Electron (`xvfb-run`).
4. Saves da 0.6, da 0.7 e da 0.8 carregados de novo depois das correções.
5. Instalador no CI do Windows aberto e testado.

**Arquivos que serão modificados:**
- código: `app/src/cats.js`, `driverdb.js`, `disciplines.js`, `career.js`, `ai.js`, `time.js`, `migrate.js` e `diag.js`;
- dados: `app/data/real-db.js` (calendário), `categories.js` e `drivers-db.js` (regerados);
- scripts: `scripts/import_categories.py`, `import_drivers.py` e `import_logos.py`;
- assets: `app/assets/img/`;
- documentação: `CHANGELOG.md`, `docs/DESENVOLVIMENTO.md` e `docs/marketing/3-SOBRE-O-JOGO.md`.

**Arquivos novos:** `scripts/audit.js`, `scripts/import_driverdb.py`, `docs/DUPLICATAS.md` e `docs/VERIFICACAO-DATABASE.md`.

**Riscos:**
- O DriverDB pode limitar pedidos ou mudar a página, que é desenhada no navegador. O parser fica isolado e com cache.
- Unificar pessoas em saves em andamento exige migração cuidadosa: os ids dos pilotos aparecem em resultados, notícias e logs, e por isso o id antigo fica como apelido.
- Algumas datas e pilotos de 2027 continuarão "a definir": não serão inventados.

**Fica para depois** (0.8.3 e 0.8.4, conforme o documento): economia completa, talentos em 7 níveis, P&D com falhas e correlação, mercado com consentimento e concorrência, ciclo corporativo das equipes, política com veto e concessões, nível de caos, escândalos novos, morte em acidente e interface (calendário mensal, pódio, cartões de piloto e ERS).

---

## 13. Resultado dos testes desta auditoria
- `npm test`: verificação de escopo, 10 temporadas e mais 4, nos modos Manager e Observador, com migrações v1/v3/v4 → v6. Resultado: **OK, 0 erros**.
- Teste do executável Electron (`xvfb-run`), na 0.8.1: **OK**, 0 erros.
- Saves reais da 0.6.0 e da 0.7.1: carregam, migram e seguem jogando, com 0 erros de diagnóstico; a ressalva da seção 9 continua valendo.
- Simulações de 6 e de 20 temporadas e medições de economia, talentos, mercado, fotos e logos: números nas seções 2 a 7.
- Fontes externas:
  - DriverDB: classificações de 2026 de 12 séries, baixadas em 07/11/2026;
  - F1: anúncio oficial do calendário de 2027 (formula1.com, 16/09/2026) e a lista etapa por etapa (PlanetF1).
