# Relatório da V0.8.4 — equipes como empresas, mercado vivo, política e eventos

Data: 08/11/2026. Roteiro e avaliação: `docs/ROADMAP-0.8.4.md`. Decisões do dono: respostas de 08/11/2026 (ver seção 1).

## 1. Decisões do dono e como ficaram

| # | Decisão | Situação |
|---|---|---|
| 1 | Dividir em 0.8.4 (mundo) e 0.8.5 (interface) | Feito. A 0.8.5 começa com uma conversa de design |
| 2 | 20 candidatas ao grid: equipes reais, montadoras, empresas e 2 criadas do zero com logos reais (Canva). Aprovar antes de entrar no jogo | Catálogo enviado (`Candidatas-ao-grid.html`): 7 equipes, 8 montadoras, 3 empresas, Vórtice Racing (Brasil) e Meridian Grand Prix (Abu Dhabi). **Aguardando a sua aprovação**; o lançamento só vai para o GitHub depois dela |
| 3 | Venda de equipes: Ferrari e McLaren nunca; Mercedes e Red Bull só depois de 20 anos e numa crise muito forte | Feito (`TEAM_OWNERS` em `app/data/team-candidates.js`, `Owners.sellable`) |
| 4 | Extinguir o veto | Feito. No lugar dele entraram as concessões em troca de voto |
| 5 | Eventos por frequência (Baixa, Normal, Alta), nível por tipo, tudo real liberado, morte sempre ligada | Feito. O extremismo usa sempre personagens fictícios (a única exceção, explicada abaixo) |
| 6 | Jogador pode criar equipe (logo importado ou um dos 20 genéricos) ou começar com uma candidata como 12ª | Feito, com a montagem completa da equipe pedida depois (pilotos e cargos) |
| 7 | Conversa de design antes da 0.8.5 | Combinado |
| — | Peso do arquivo não é problema | Registrado. Save de 20 anos: cerca de 4,5 MB; a engine atual aguenta |
| — | Mínimo do titular da F1 passa para 75 | Feito (`Talent.F1_MIN`) |
| — | Revisão da IndyCar (muito inflada) | Feito (seção 6) |
| — | Terminar tudo da fase | Feito: parceiras, bastidores, traduções, logos possíveis e dados parados |

**Única exceção às pessoas reais:** o escândalo de extremismo usa sempre um personagem fictício. Os instaladores de teste são públicos no GitHub e associar uma pessoa real a discurso de ódio é o caso mais grave de dano à imagem. Todos os outros tipos (manipulação, espionagem, apostas, fraude etc.) podem envolver pessoas, equipes e empresas reais, sempre com a marca "Ficção do jogo: este caso não aconteceu na vida real". A opção pode ser desligada em Salvar e opções.

## 2. Equipes como empresas

- **Donos:** riqueza, ambição e paciência. Os donos reais de 2026 foram cadastrados para as 11 equipes.
- **Humor dos donos:** sobe e desce com o resultado contra a expectativa (ambição e tamanho histórico) e com o caixa.
- **Dívida** com juros e **valor de mercado** (receita × múltiplo da marca + estrutura + parte do patrimônio − dívida).
- **Venda:**
  - motivos: montadora que sai, dono sem dinheiro, fundo que realiza lucro, dívida;
  - o comprador do banco troca nome, cores e logo, e a história da equipe continua (linhagem);
  - investidores fictícios também compram.
- **Sem comprador:** compra pela gestão (como a Brawn) ou saída do grid. Montadora ou empresa sem comprador pode fechar a equipe (como a Toyota em 2009).
- **Entrada:** inscrição → FIA → voto da Comissão no meio da temporada → estreia no ano seguinte, com taxa de entrada e carro atrás do grid. Motor próprio chega depois de 3 ou 4 anos.

**Medido em 5 carreiras de 50 anos (Observador):**

| Carreira | Vendas | Compras pela gestão | Saídas | Entradas | Inscrições recusadas |
|---|---|---|---|---|---|
| 1 | 5 | 0 | 0 | 1 | 0 |
| 2 | 2 | 2 | 0 | 1 | 1 |
| 3 | 5 | 0 | 1 | 2 | 2 |
| 4 | 5 | 1 | 0 | 1 | 1 |
| 5 | 9 | 0 | 0 | 1 | 0 |

- Média por carreira: 5,2 vendas, 0,6 compras pela gestão, 0,2 saídas e 1,2 entradas. As saídas ficaram abaixo da meta de 1 a 3, porque as equipes de hoje raramente afundam (como no teto de gastos real). As entradas dependem de vaga.
- Exemplos:
  - Williams vendida para a Jaguar (Tata);
  - Audi vendida para a Porsche;
  - Aston Martin salva pela compra da gestão;
  - Hyundai retirando a equipe sem comprador;
  - Meridian estreando em 2031 e sendo vendida depois.
- As regras de proteção funcionaram em todas as carreiras: Ferrari e McLaren nunca foram à venda; Mercedes e Red Bull nunca chegaram à crise exigida.

**Criação de equipe e candidata como 12ª:** carro de 5,5 a 8 pontos atrás da média do grid (como a Cadillac em 2026), motor do fornecedor com vaga ou o escolhido, meta da diretoria de 11º ou 12º, e prazo do plano de negócios antes de o dono poder vender.

**Montagem da equipe nova** (pedido de 08/11):
- é obrigatória antes da primeira corrida: o avanço do tempo fica bloqueado até haver dois titulares;
- pilotos com superlicença, com nota, pedido, empresário e interesse num projeto novo (pilotos de ponta recusam com frequência), negociados um a um;
- 13 cargos-chave com candidatos livres (com luvas) ou tentativa de tirar os melhores dos rivais, com afastamento;
- cargos não contratados seguem com interinos, e o diretor esportivo pode completar as vagas.

**Equipe parceira × irmã:**
- Haas e Cadillac são parceiras da Ferrari; Williams e Alpine, da Mercedes.
- A transferência é limitada: chassi até +0,4 e confiabilidade até +0,8 por ano, nunca aerodinâmica.
- Na política, a parceira acompanha a equipe principal em 20% do peso nos temas técnicos.
- Carro parecido demais leva a protesto e investigação (caso de 2020).

## 3. Mercado vivo

- Empresários reais para os pilotos da F1 (dados que já existiam e não eram usados) e agências fictícias para os demais.
- Leilão, silly season nas férias de verão, renovações antecipadas e opções de renovação.
- Bônus por vitória, pódio e título pagos de verdade; direitos de imagem; comissão do empresário.
- A proposta do jogador concorre com as que já estão na mesa.

| Por temporada (20 anos) | Jogo | F1 real 2000–2025 |
|---|---|---|
| Pilotos que trocaram de equipe | 4,6 | 4,4 |
| Estreantes no grid | 4,6 | 5,4 |
| Saídas do grid | 4,5 | 5,5 |

- O mercado ficou em torno do real, um pouco abaixo, como você prefere.
- Numa temporada típica: 14 lances de leilão e várias propostas perdidas (Antonelli e Kirkwood disputados por várias equipes).

## 4. Política

- Veto extinto.
- Concessões:
  - quando a proposta fica até 2 votos de passar, quem propõe oferece dinheiro (FIA ou Fórmula 1) ou horas de túnel (equipe autora) aos indecisos;
  - o jogador vê a oferta na tela do Conselho.
- Voto de entrada de equipes, com o voto do jogador na tela do Conselho.
- Bastidores: blocos de motor que fecham posição e compensações viram notícia.

## 5. Eventos e consequências

- Frequência geral e nível por grupo (escândalos, conflitos, lesões, operação, negócios), na nova carreira e em Salvar e opções.
- 23 eventos no catálogo, com ocorrência, descoberta (ou acobertamento e revelação anos depois), investigação, veredito e cadeia.
- Decisões do jogador: cooperar, defender ou afastar os envolvidos.

**Calibração.** O desequilíbrio entre as equipes mudava demais: a campeã de construtores mudava de mão 15 ou 16 vezes em 25 anos. Ajustes:
- peça irregular passou a tirar só os pontos da última corrida (como as desclassificações reais);
- exclusão do Mundial ficou em 25% das espionagens comprovadas;
- golpes no carro menores.

| Medida (26 anos) | 0.8.4 final (3 sementes) | 0.8.3 | F1 real |
|---|---|---|---|
| Equipes vencedoras por ano | 3,96–4,15 | 3,4–3,7 | 3,3 |
| Equipes no pódio por ano | 5,65–6,08 | — | 5,8 |
| Ordem de um ano para o outro (correlação) | 0,84–0,90 | — | 0,76 |
| Campeã de construtores mudou de mão (em 25 transições) | 8, 16 e 8 (média 10,7) | 9 e 13 | 8 |
| Pilotos com nota 90+ na F1 | média 2,4 a 3,1; mínimo 1 | — | — |

Na revisão final, o motor passou a vir dos fabricantes, com retorno decrescente. Isso aumentou a troca de campeã para uma média de 14. Ajuste final no desenvolvimento dos carros (`cardev.js`):
- o carro guarda 90% da vantagem de um ano para o outro, ou 50% num regulamento novo;
- o ruído de desenvolvimento ficou menor.

Assim a média voltou a 10,7. Uma das três sementes ainda dá 16 trocas; a variação entre sementes continua grande.

**Medido em 30 anos (primeira rodada; recalibrado depois, ver `DOSSIE-0.8.4.md`):**
- **Escândalos:** cerca de 1,6 por temporada na primeira rodada; após a revisão, cerca de 0,4 por temporada, dentro de cerca de 22 eventos por ano (136 tipos). 29 investigações, com 21 culpados; 6 casos acobertados; 1 exclusão do Mundial de Construtores.
- **Lesões e doenças:** cerca de 3 por ano, somando todas as categorias.
- **Acidentes fatais:** raros. Em 30 anos, 1 caso (FRECA). Na F1 moderna, a probabilidade é de cerca de 1 a cada 80–100 anos, e a segurança melhora com o tempo.
- **Teste forçado:** os 23 eventos, cada um várias vezes, inclusive contra a equipe do jogador, sem erros (84 eventos, 42 casos, 18 com decisão do jogador).

## 6. Pilotos: mínimo da F1 e revisão da IndyCar

- **Titular da F1 com nota 75 ou mais:**
  - na virada do ano, a equipe da IA troca quem está abaixo por alguém acima (o anterior vira reserva);
  - o jogador recebe um aviso.
- **IndyCar:** a faixa de criação era 75–85, a mesma da Fórmula E e acima da F2. Isso deixava o Kirkwood com 86 e a mediana da série em 80, perto do meio do pelotão da F1. Agora:
  - faixa de 70 a 80;
  - notas e níveis curados para os 33 pilotos, ancorados nos ex-F1 do grid (Ericsson, Grosjean, Mick Schumacher, Rossi, Armstrong).

| Piloto | Antes | Agora | Nível (oculto) |
|---|---|---|---|
| Álex Palou | 84 | 81 | Vencedor |
| Pato O'Ward | 81 | 79 | Vencedor |
| Kyle Kirkwood | 86 | 78 | Vencedor |
| Josef Newgarden | 83 | 78 | Vencedor |
| Christian Lundgaard | 86 | 77 | Vencedor |
| Scott Dixon (47 anos) | 83 | 76 | Vencedor |
| Marcus Ericsson | 82 | 75 | Pelotão |
| Mick Schumacher | 78 | 75 | Pelotão |
| Romain Grosjean | 77 | 74 | Pelotão |
| Hélio Castroneves (52 anos) | 77 | 70 | Coadjuvante |

A tabela completa está em `app/data/driver-tiers.js` (`series`), editável se quiser outro valor para algum piloto.

## 7. Dados e imagens

- **Logos novos:** Mobil 1, Bitpanda, MSC Cruises e Hugo Boss.
- **Ainda sem logo:** Hantec Markets, Castore, Allwyn, Formula Winter Series, F4 CEZ, FR Américas e ACO. A busca na Wikipedia, na Wikidata e no Commons trouxe imagens erradas (um short, uma captura do Facebook, o logo da empresa dona), e eu descartei todas. O jogo mostra a sigla no lugar.
- **Dados que estavam parados e agora são usados:** empresários reais, siglas oficiais dos pilotos (mapa da corrida) e extensão medida no OpenStreetMap (página do circuito).
- **Inglês:** cláusulas e textos de contrato traduzidos; todo texto novo da 0.8.4 já nasce em português e inglês.

## 8. Testes

- `npm test`: OK (10 temporadas e 4 temporadas, verificação de consistência com punições de pontos).
- Teste de estresse da interface: OK (português e inglês, Observador e Manager).
- Teste do Electron: OK.
- Telas novas conferidas com capturas, sem erros de página:
  - nova carreira com candidata e com equipe criada;
  - montagem da equipe;
  - donos e equipes;
  - Conselho;
  - opções de eventos;
  - caixa de entrada com decisão de escândalo;
  - Diagnóstico.

## 9. Arquivos

- **Novos:**
  - `app/src/owners.js`, `app/src/chaos.js`, `app/src/silly.js`, `app/src/ui-owners.js`;
  - `app/data/team-candidates.js`;
  - `scripts/make-generic-logos.js`;
  - `app/assets/img/logos/generic/1–20.svg` e os logos da Vórtice e da Meridian (versões emblema, completa e colorida).
- **Alterados:**
  - núcleo: `council.js`, `market.js`, `contracts.js`, `talent.js`, `cats.js`, `driverdb.js`, `circuits.js`, `diag.js`;
  - interface: `ui-council.js`, `ui-core.js`, `ui-people.js`, `ui-stories.js`, `ui-records.js`, `ui-weekend.js`, `i18n-en.js`;
  - dados e scripts: `driver-tiers.js`, `scripts/modules.js`;
  - documentação.

## 10. O que falta para fechar

- **Sua aprovação das 20 candidatas.** Depois dela, publico a 0.8.4 no GitHub (o CI gera o instalador).
- **Conversa de design antes da 0.8.5.**
