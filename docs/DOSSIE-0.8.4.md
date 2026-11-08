# Dossiê da V0.8.4 — revisão do código, blindagem e funções escanteadas

Data: 08/11/2026. Pedido do dono: revisar o código, achar erros, mecânicas mal usadas ou sem uso, problemas futuros, dados que se desequilibram com o tempo e riscos de desempenho; listar o que não tem aba ou é escanteado.

## 1. Como a revisão foi feita

1. **Análise estática de todos os 60 módulos:**
   - funções definidas e nunca chamadas;
   - ações de botão sem botão e telas sem acesso;
   - aleatoriedade sem semente no núcleo;
   - dados importados e nunca lidos.
2. **Análise dinâmica:**
   - carreiras de 50 anos (Observador) e 30 anos (Manager), medindo a cada década o tamanho de cada parte do save, o tempo por temporada e a deriva de cerca de 30 indicadores (notas, carros, motores, dinheiro, reputação, instalações, salários, teto);
   - censo dos níveis ocultos de talento em 40 anos.
3. **Teste forçado:** cada um dos 136 eventos do catálogo, várias vezes, inclusive contra a equipe do jogador (538 eventos, nenhum erro).
4. **Releitura linha a linha** dos módulos novos da 0.8.4 (`owners`, `chaos`, `silly`, `ui-owners`) e dos pontos de integração com os antigos.
5. **Testes de interface** com capturas de tela de todas as telas novas, em português e inglês, e o teste do Electron.

## 2. Erros e riscos encontrados e corrigidos

| # | Problema | Risco | Correção |
|---|---|---|---|
| 1 | Potência dos motores subia todo ano em média (+0,3) até o teto de 100 | Em 50 anos os motores ficavam iguais (98–99) e a disputa entre fabricantes sumia | Novo sistema de fabricantes: retorno decrescente perto do limite do regulamento, leve volta à média e reembaralhamento no regulamento novo |
| 2 | Confiabilidade dos carros com equilíbrio alto (87 → 95 em 10 anos) | Cada vez menos quebras, menos imprevisibilidade | Equilíbrio de cerca de 87 e queda de 3 pontos a cada regulamento novo |
| 3 | Patrimônio dos donos crescia sem limite (US$ 3,6 bi por equipe em 50 anos) | Números absurdos e resgates infinitos | Limite de 4 orçamentos; o excedente sai para os outros negócios do grupo |
| 4 | Aporte dos donos só subia (84 → 132) | Orçamentos inflados com o tempo | Volta de 6% ao ano ao patamar de cada dono |
| 5 | Instalações chegavam todas ao máximo (98,6) | Grid cada vez mais igual (desvio dos carros 4,7 → 2,3) | Novo sistema de Sede e fábrica: desgaste, custo crescente e limite anual de investimento |
| 6 | Valor das equipes inflava com o patrimônio acumulado | Vendas por valores irreais | O patrimônio pesa no máximo US$ 600 mi no valor |
| 7 | Dinheiro de obras não gasto era descontado do caixa da IA (erro introduzido e pego na revisão) | Equipes perdendo dinheiro à toa | Desconto só do que foi gasto |
| 8 | Registro do universo crescia sem limite (9.900 entradas em 50 anos) | Save de 7,5 MB e lentidão com o tempo | Rotina (decisões, contratos, P&D, finanças, corridas) sai depois de 25 anos; títulos, escândalos, mortes, recordes e a vida das equipes ficam para sempre |
| 9 | Histórico de negociações do mercado sem limpeza | Cresce para sempre | Mantém só 2 anos (é o que o mercado usa) |
| 10 | Casos e escândalos ocultos sem limpeza | Crescimento infinito | Casos encerrados há mais de 3 anos e revelados há mais de 5 saem da memória ativa |
| 11 | Escândalos escondidos descobertos depois da última etapa se perdiam | Caso sumia sem explicação | Descoberta na temporada seguinte; acobertados podem vir à tona anos depois |
| 12 | Candidatas ao grid acabam em carreiras longas (100+ anos) | Grid parado sem equipes novas | Projetos fictícios gerados quando sobram menos de 5 candidatas |
| 13 | Nome das equipes vendidas aparecia nas temporadas antigas | Histórico errado (a "Toyota" campeã de 2030 quando era a Haas) | A função de nome da época (que existia sem uso) agora vale nas temporadas simuladas |
| 14 | Lista de parceiras usada pela academia não mudava com troca de dono ou de motor | Empréstimos de pilotos para equipes sem relação | Atualizada na troca de dono e de motor |
| 15 | Opções de contrato do piloto e mútuas nunca eram processadas | Hamilton (opção do piloto para 2028) e Norris (mútua para 2031) nunca exerceriam | As três formas de opção funcionam; a do jogador é avisada por e-mail |
| 16 | Save no navegador falha calado quando passa de cerca de 5 MB (perto de 15 anos de carreira) | Perda de progresso sem aviso | Falha detectada, com aviso para baixar o arquivo do jogo. No Electron o save vai para o disco e não tem esse limite |
| 17 | Feed de notícias guardava só 150 itens | Com o catálogo novo, cobriria pouco mais de uma temporada | 400 itens |
| 18 | Escândalos por temporada: 1,6 | Excesso (seu retorno) | Cerca de 0,4 por temporada |

## 3. Deriva com o tempo, antes e depois

Carreira de 50 anos (Observador), começo × fim:

| Indicador | 0.8.4 antes da revisão | 0.8.4 final |
|---|---|---|
| Potência média dos motores | 90 → 98,8 (teto 100) | ver `RELATORIO-0.8.4.md` |
| Confiabilidade dos carros | 87 → 95 | idem |
| Instalações (geral) | 84 → 98,6 | idem |
| Desvio dos carros (diferença entre equipes) | 4,7 → 2,3 | idem |
| Patrimônio dos donos (média) | 0 → US$ 3.643 mi | idem |
| Aporte dos donos (média) | 84 → 132 | idem |
| Save | 1,8 → 7,5 MB | idem |
| Tempo por temporada | 3,3 → 4,8 s | idem |

**O que já estava estável e continua:**
- nota média dos titulares da F1: 85 a 87;
- funcionários: cerca de 84;
- reputação das equipes: cerca de 72;
- eficiência das organizações: cerca de 0,6;
- equipe de boxes: cerca de 84;
- número de patrocinadores por equipe: 3,5 a 4,2;
- teto de gastos: estabiliza perto de US$ 190 mi depois das votações do Conselho.

**Talentos de elite** (censo de 40 anos): sempre de 1 a 4 titulares da F1 com nota 90+, dentro da sua regra de 1 a 6. A geração inicial de pilotos "acima da média" (curada à mão) é maior do que a que nasce no jogo, então o número cai de 13–17 para cerca de 7 depois de 30 anos. Os geracionais continuam aparecendo (2 a 3 vivos).

## 4. Funções e mecânicas sem aba ou escanteadas

### 4.1 Ganharam tela ou uso nesta versão

| O que | Onde estava | Agora |
|---|---|---|
| Vagas de projeto do P&D que "abrem com instalações" | Mensagem sem opção de melhorar | Tela **Sede e fábrica** (12 instalações); a vaga bloqueada leva até ela |
| 8 logos de fabricantes de pneus | Baixados na 0.8.2, nunca usados | Aba **Fabricantes**: F1 e outras categorias |
| Fornecedor de pneus | Pirelli fixo na física | Licitação da FIA a cada 4 anos; o fornecedor muda o desgaste |
| Fabricantes de motor | 5 motores sem identidade nem contrato | Aba **Fabricantes**: contratos, capacidade, entrada e saída, parceria de fábrica |
| Apagar jogo salvo (`Store.deleteGame`) | Função sem botão | Botão ✕ ao lado de cada jogo na tela inicial |
| Nome da equipe por época (`Identity.nameIn`) | Função sem uso | Temporadas simuladas e transferências |
| Empresários reais (`REAL_EXTRA.managers`) | Só gravado no piloto | Mercado vivo (comissão, pedido, vazamentos) |
| Siglas oficiais e extensão do OpenStreetMap | Dados parados | Mapa da corrida e página do circuito |
| Opções de contrato do piloto e mútuas | Ignoradas | Processadas no meio do ano |

### 4.2 Existem mas não têm tela (proposta para a 0.8.5, na conversa de design)

| O que | Onde | Proposta |
|---|---|---|
| Rivalidades entre pilotos (`G.memory.rivals`, `Media.isRival`) | Calculadas a cada batida e disputa; mudam o comportamento na pista | Painel de rivalidades na página do piloto |
| Linha do tempo de eventos e escândalos (`G.chaos.log`, casos e investigações) | Só no Diagnóstico | Tela "Paddock: casos e acontecimentos" com investigações abertas e vereditos |
| Licenças e créditos das imagens (`Assets.licenseSummary`, `sources.json`) | Sem tela | Tela "Créditos e licenças" (importante antes de vender) |
| Histórico de estouros do teto (`G.capBreaches`) | Só notícias e registro | Quadro na tela de Finanças |
| Explicações das decisões da IA (`AI.whyRenew`, `AI.whyRelease`) | Textos prontos sem uso (o registro já traz motivos parecidos) | Remover ou mostrar no Mercado |
| Censo dos níveis ocultos (`Talent.census`) | Sem uso, de propósito: o nível é oculto | Manter só no Diagnóstico |
| "Redação do paddock" (`Events.aiPrompt`) | Desligada no aplicativo de desktop | Decidir se fica para uma versão online ou se sai |
| Cancelar missão de olheiro (`ACT.scoutCancel`) e "contratar já" na academia (`ACT.acAdd`) | Ações sem botão (o fluxo novo usa outros caminhos) | Botão de cancelar na lista de missões; remover a segunda |

### 4.3 Código legado para remover na limpeza

Substituídas por versões novas e sem nenhuma chamada:
- `Engine.setupQuality`, `Engine.setupFeedback`, `Engine.genOptimum`, `Engine.runQualifying` (acerto e classificação foram para `setup.js` e `quali.js`);
- `Engine.aiMode` (substituída por `Engine.aiModes`);
- `Market.awardSuperlicense` (a superlicença é dada em `cats.js`);
- `Market.academyCost`, `Career.refreshStaffMarket` (o mercado de funcionários se renova pelo `Staff.refreshMarket`);
- `Kart.byId`, `Disc.ofCat`, `Persons.find`, `plural`.

Nenhuma delas causa erro; só ocupam espaço. Removo na limpeza da 0.8.5, se você concordar.

## 5. Riscos futuros e recomendações

1. **Tamanho do save:**
   - 50 anos ficavam perto de 7,5 MB antes da limpeza do registro;
   - no Electron não há problema;
   - na versão de navegador há aviso, mas o ideal, se ela existir comercialmente, é salvar em IndexedDB.
2. **Tempo por temporada:** cresce de 3,3 s para cerca de 5 s em 50 anos, por causa do banco de pilotos aposentados guardado para o histórico. Aceitável. Se incomodar, dá para arquivar os aposentados sem F1 há mais de 30 anos.
3. **Candidatas, fabricantes e pneus esgotáveis:** cobertos pelos projetos gerados. Para fabricantes, a lista fixa de 6 candidatos pode se esgotar em 100+ anos. Recomendo o mesmo gerador na 0.8.5.
4. **Equilíbrio de forças:** a troca de campeã varia muito entre sementes (de 8 a 16 em 25 anos). Os eventos agora têm peso pequeno, então a variação vem do próprio desenvolvimento dos carros.
5. **Saves antigos:** os sistemas novos (donos, fábrica, fabricantes, pneus, eventos) são criados sob demanda ao abrir um save antigo. A migração completa continua para depois da V1 (`docs/PENDENCIAS-V1.md`).
6. **Erros em tempo de jogo:** os ganchos novos de fim de semana (eventos, parcerias) registram erro no log em vez de travar o jogo.

## 6. Sistemas novos desta rodada

- **Sede e fábrica:** 12 instalações (sede, fábrica, escritório de projeto, túnel de vento, CFD, simulador, banco de testes, departamento de motores, logística, pit stop, performance humana, hospitalidade e marketing), com nível de 1 a 5, estado de conservação, obras com prazo, manutenção e limite anual de investimento fora do teto (US$ 30 mi; US$ 40 mi para as três últimas). Efeitos reais em P&D, operação, patrocínio, pilotos e funcionários. Equipes pequenas começam com instalações menores.
- **Fabricantes:** motores com potência, confiabilidade, eficiência, preço e capacidade (até 4 equipes); contratos com prazo; entrada só como fornecedor (GM em 2029 com a Cadillac; Toyota, Porsche, Hyundai, BMW e Cosworth podem entrar); saída com aviso e herança do projeto pela equipe de fábrica; parceria de fábrica pedida pelo jogador.
- **Pneus:** F1 com licitação a cada 4 anos (Pirelli, Michelin, Bridgestone, Hankook, Goodyear, Yokohama), cada uma com desgaste e aquecimento próprios, mais os fornecedores reais de 18 outras categorias.
- **Eventos:** 136 no catálogo, mais os 20 de decisão entre corridas. Cerca de 22 acontecimentos por temporada, a maioria pequena, e escândalos raros.
