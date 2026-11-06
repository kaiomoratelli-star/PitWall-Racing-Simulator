# Changelog

## 0.8.0 — em desenvolvimento
**Base de pilotos reais (Fase 1)**
- Nova base com 1.393 pilotos reais e 5.583 temporadas de 41 campeonatos (2022–2027): F1, F2, F3, F1 Academy, Fórmula E, IndyCar, Indy NXT, USF Pro 2000, USF2000, Super Formula, SF Lights, WEC, IMSA, ELMS, Asian Le Mans, NASCAR Cup/O'Reilly/Truck, DTM, Stock Car Pro Series, Supercars, regionais, Eurocup-3, Euroformula, GB3 e F4s.
- Cada piloto tem um id único (Wikidata), as variações de nome reunidas, nascimento, nacionalidade esportiva e a carreira temporada a temporada com equipe, número, posição, pontos e status: disputou (2022–2025), inscrito (2026) ou anunciado (2027, lista provisória), com fonte e data de verificação. Rumores não entram como fato.
- Os pilotos que já estavam no jogo ganham a carreira real na página do piloto; 666 pilotos de outras séries (IndyCar, WEC, IMSA, NASCAR, DTM, Stock Car, Supercars, F1 Academy...) entram no universo empregados na série deles, com pontos de superlicença pelas classificações reais, e podem ser contratados para a temporada seguinte (nunca como substitutos no meio do ano).
- Assento de cada titular da F1 em 2027 marcado como confirmado (lista anunciada) ou vaga ainda não definida (`scripts/check-2027.js`, `docs/VERIFICACAO-2027.md`: 19 de 22 confirmados).
- Diagnóstico acusa a mesma pessoa em dois registros.
- Fontes: páginas de temporada da Wikipedia (CC BY-SA) e Wikidata (CC0), em `scripts/import_drivers.py`. O DriverDB não foi usado: os termos dele proíbem extração em massa e montar base semelhante.
- Avisos discretos na tela inicial, nas notícias e na conta: projeto de fã, sem relação com pessoas, equipes e empresas reais, acontecimentos fictícios.

**Categorias e carreiras (Fase 3)**
- IndyCar e WEC (classe Hypercar) passam a ser simuladas no universo, como a Fórmula E: grids, equipes, calendários e classificações reais de 2026 (IndyCar: 33 pilotos, 18 etapas; WEC: 17 carros, 54 pilotos, 8 etapas). No WEC o carro corre com a tripulação, que divide os pontos, e Le Mans vale em dobro. A F1 Academy fica só na base de dados.
- Tela de categorias organizada por ecossistema (principais, rumo à F1, regionais, F4, ecossistema Indy, ecossistema Super Formula) e um painel com as séries que estão na base mas ainda não são simuladas.
- Potencial dinâmico: muda a cada fim de temporada conforme a idade (muito no kart/F4, pouco no profissional) e o rendimento contra o esperado (carro, companheiro, posição na categoria). Estagna a partir dos 27 anos.
- Potencial oculto: no modo Manager o número real não aparece em lugar nenhum; aparece uma faixa estimada com confiança (baixa, média, alta), mais estreita para quem é da equipe, da academia ou foi observado. As equipes do jogo também decidem por estimativas com erro.
- Nova tela Olheiros: 3 olheiros, observação de 4 etapas, relatório na caixa de entrada (faixa, pontos fortes, recomendação), filtros por série, nacionalidade e idade, comparação de dois pilotos e convite para a academia.
- Mercado: atratividade da equipe inclui a saúde financeira; estrelas recusam equipes sem perspectiva; empresários com reputação e relação com cada equipe; patrocínio pessoal só para pilotos fictícios, pesando mais para equipes com caixa apertado e pago de fato no fim do ano; política de academia por grupo (Red Bull prioriza a própria academia, configurável em `rules.groupPolicies`); multa de rescisão quando uma equipe troca de piloto no meio do ano.
- Kart: quatro campeonatos regionais (Europa, Américas, Brasil, Ásia-Pacífico) com pilotos fictícios de 12 a 15 anos gerados pelo jogo. Resolvidos no fim do ano; os melhores sobem para a F4 da região antes de o jogo inventar um piloto para a vaga, e quem passa dos 16 sem vaga larga o kart. Em 10 temporadas de teste, cerca de 200 pilotos saíram do kart e 5 chegaram à F1. Aparecem na tela de categorias e nos olheiros.
- Cláusulas de contrato: desempenho (a equipe encerra o contrato no fim do ano, sem multa, se o piloto ficar muito abaixo do esperado; avaliada na metade da temporada, com escolha na caixa de entrada) e saída (o piloto sai sem multa para uma equipe à frente no campeonato). Escolhidas na negociação e usadas também pelas equipes do jogo; o piloto aceita menos a primeira e mais a segunda.
- Editor: formato de cada categoria (carro com tripulação) e política de academia por grupo (criar grupos, escolher equipes, peso da academia e penalidade para contratação externa).
- Pilotos fictícios gerados nunca repetem o nome de outro piloto do universo.
- Patrocinadores com logo nas tabelas de patrocínio, finanças e página da equipe.

**Calendário por dia, notificações e navegação**
- O tempo passa dia a dia. A central mostra a data de hoje, os próximos acontecimentos (fim de semana de corrida, projetos e peças) e o botão "Avançar", que pula para o próximo dia com algo relevante. O fim de semana começa na sexta e, depois da corrida, o dia passa a ser a segunda-feira seguinte. A data aparece no topo da tela.
- Caixa de entrada com prioridade: vermelho para decisões pendentes e amarelo para mensagens importantes não lidas (projeto pronto, peça nova instalada). As duas travam o avanço do tempo até serem resolvidas ou lidas; um aviso na central leva direto para elas.
- Botão Voltar no topo (e Alt + seta para a esquerda) para retornar à tela anterior.
- Simular etapas (modo Observador) continua igual: os dias passam sem parar.

**P&D por peça (Fase 4)**
- Projetos andam em dias: projeto (dias definidos pela peça, ambição e recursos) e depois fabricação, uma peça por carro. Escolha fabricar para 1 ou 2 carros e qual carro recebe a primeira. Até a segunda peça ficar pronta, só um carro tem a evolução (diferença real de ritmo entre os dois carros); dá para fabricar a peça do outro carro depois, sem ocupar vaga de projeto.
- O projeto "pequeno, médio, grande" virou projeto por peça: asa dianteira, asa traseira, assoalho, sidepods e carenagem, suspensão, chassi, redução de peso, freios, refrigeração, câmbio, gestão térmica de pneus, unidade de potência (só fábrica), eficiência energética, confiabilidade, pit stop e instalações.
- Cada projeto é configurado: alvo (carro atual, com projeto e fabricação, ou carro do ano seguinte), foco (peças aerodinâmicas: carga, eficiência ou equilíbrio e pneus; mecânicas: desempenho, confiabilidade ou pneus), ambição (conservador, equilibrado ou agressivo) e quanto túnel de vento e CFD usar. A previsão mostra custo, prazo (GPs de projeto + fabricação), ganho por atributo, risco e aproveitamento dos recursos.
- Túnel de vento e CFD vêm de uma cota por período de 4 GPs, que segue a regra de restrição de testes aerodinâmicos do regulamento (quem terminou atrás tem mais). Peças aerodinâmicas dependem mais do túnel, as mecânicas do CFD; menos recurso que o ideal deixa o projeto mais fraco e mais arriscado.
- A pesquisa do carro do ano seguinte é feita peça por peça e ocupa uma vaga como qualquer projeto (rende 35% a mais, só projeto, sem fabricação). Substitui o antigo controle de foco geral; o carro novo estreia com cada pesquisa no atributo certo.
- Vagas de projeto visíveis (ocupadas, livres e bloqueadas, com a nota de instalações que abre cada uma, até 4) e um projeto por peça e alvo de cada vez.
- Carro visto de cima com proporções do regulamento de 2026 (mais curto e mais estreito): a peça escolhida acende, as peças em projeto pulsam e clicar numa peça escolhe o projeto.
- Atualizações concluídas mostram antes e depois de cada atributo, com a barra animada na primeira vez.
- Projetos antigos de saves anteriores terminam normalmente.
- Editor de categorias: grid invertido editável em cada corrida do fim de semana (Sprint da F2/F3 e corridas das regionais e F4).
- Inglês: frases com "·" passam a usar primeiro os modelos específicos (antes alguns textos ficavam em português).

**Corrida**
- Pneus e energia viraram controles separados nos cards do Pit Wall. Pneus: Conservar (cerca de 30% menos desgaste, 0,4 a 0,7 s mais lento), Equilibrado e Atacar (0,5 a 0,8 s mais rápido, até ~45% mais desgaste). Energia (ERS): Recarregar, Neutro e Ultrapassagem. O efeito depende do piloto, do desgaste, da temperatura do pneu, da pista e da parte elétrica do regulamento.
- A bateria mostra a carga, a energia recuperada e gasta na corrida, o saldo das últimas 15 voltas e quantas voltas dá para manter em ultrapassagem. Botão "Modos: engenheiro" entrega as decisões ao engenheiro a cada volta.
- As outras equipes usam exatamente os mesmos controles: os estrategistas decidem pneu e energia separadamente (poupam quando o pneu não chega ao fim, atacam colados no carro da frente, recarregam com a bateria baixa).
- Torre de tempos com número do piloto, bandeira, logo da equipe e, na última coluna, os pontos da posição atual.
- Safety Car, VSC e bandeira vermelha acendem as bordas da tela (amarelo ou vermelho) enquanto estão ativos, com aviso de ritmo reduzido e pit stop mais barato.
- Pós-corrida abre na cerimônia de pódio: degraus, fotos, bandeiras, logos, troféu e confete, com destaque quando a sua equipe sobe ao pódio. Abas para classificação, volta a volta, gráfico, pit stops, voltas rápidas e análise completa.

**Identidade e imagens**
- Alpine vira Gucci Racing Alpine Formula One Team a partir de 2027 (anúncio oficial de 27/05/2026): a Gucci assume o title partnership no lugar da BWT, a equipe segue inscrita como Alpine e o histórico anterior fica guardado. As cores de 2027 ficam provisórias até a apresentação do carro.
- Identidade das equipes por temporada (nome, title partner, patrocinadores e cores, com fonte e data de verificação).
- Bandeiras em SVG em todas as telas (flag-icons, licença MIT), iguais no Windows, que não desenha emojis de bandeira.
- Registro central de imagens com origem, licença, data e fallback de cada arquivo (`scripts/make-asset-registry.js`).

**Compatibilidade**
- Save v6: carreiras em andamento recebem a identidade da temporada, a base de pilotos, IndyCar e WEC, o estado dos olheiros, o kart e o patrocínio pessoal dos pilotos fictícios; corrida em andamento converte o modo antigo nos modos novos de pneu e energia.

## 0.7.1 — Correção do congelamento da corrida
- Corrigido o travamento da corrida ao vivo ("tr is not a function"), que aparecia sobretudo no modo Observador. A torre de tempos usava uma variável local `tr` (o circuito) e, na 0.7.0, passou a chamar a função de idioma com o mesmo nome sempre que um carro estava com o modo de ultrapassagem ativo. O desenho falhava a cada volta, o laço da corrida parava de avançar e o erro se repetia no log.
- A função de idioma passou a se chamar `byLang`, e o `npm test` ganhou uma verificação estática de escopo (`scripts/check-scope.js`) que impede chamar uma função global quando uma variável local tem o mesmo nome, e chamar funções que não existem.
- Laços ao vivo (corrida, mapa, treino e classificação) separam o passo da simulação do desenho da tela: erro de desenho é registrado e a corrida segue; erro na simulação pausa a corrida com aviso na tela. Erros repetidos geram um aviso só; a tela Diagnóstico lista os erros da sessão.
- Novo teste de estresse da interface (`npm run test:ui`): temporadas completas pela tela de corrida nos modos Observador e Manager, em português e inglês, com chuva, Safety Car, abandonos em massa e Sprint. O teste do executável no Windows agora também roda uma corrida inteira em inglês pelo laço real.

## 0.7.0 — Fim de semana completo, Conselho da FIA e inglês
**Acerto e treinos livres**
- Novo modelo de acerto: asas dianteira e traseira, suspensão, altura do carro e balanço de freio (relações de marcha homologadas para a temporada). O piloto sente 5 áreas do carro: equilíbrio, frenagem, curvas, tração e retas; cada ajuste mexe em várias delas.
- O ideal muda com o contexto (tanque, borracha na pista, temperatura, vento, ritmo): o acerto de classificação e o de corrida não são o mesmo.
- Piloto com memória: mantém o que disse entre as saídas e só muda de opinião com motivo técnico ("Na saída anterior o equilíbrio estava bom, mas agora, com o tanque mais pesado, ..."), sem repetir frases.
- Janela do engenheiro: estimada a partir do feedback do piloto, estreita a cada saída; o acerto recomendado é aceito sempre que aumenta a confiança.
- Confiança = acerto (50%) + conhecimento da pista (25%) + familiaridade com o carro (25%), com efeito no ritmo, na consistência e nos erros.
- Treinos de 60 minutos com relógio (tempo real a 60×), 1, 2, 3 sessões ou formato vida real, programas de acerto, simulação de classificação e de corrida, tempo de garagem por ajuste, alocação oficial de pneus, tabela de tempos de todos os carros e rádio.
- Simular pelo engenheiro (uma sessão ou todas) com diretriz: equilibrado, só classificação ou só corrida.

**Classificação ao vivo**
- Q1/Q2/Q3 (18, 15 e 12 min) e, nos fins de semana de Sprint, SQ1/SQ2/SQ3 (12, 10 e 8 min) no formato atual: TL1 → Classificação Sprint → Sprint → Classificação → Corrida.
- Cronômetro com tempo real, 3×, 10× e saltos de +1, +3 e +5 minutos; volta de saída, lançada, resfriamento e entrada; volta iniciada antes da bandeira vale.
- Você decide quando sair, quantas voltas lançadas, o pneu (jogos da alocação) e o risco; pode abortar a volta e mexer no carro na garagem com o relógio correndo (parque fechado: só asa dianteira e freio).
- Pista evolui, tráfego, erros, voltas deletadas por limite de pista, batidas e bandeira vermelha. Os rivais fazem dois ataques e poupam pneus quando já estão seguros.
- Torre de cronometragem com setores roxo/verde/amarelo e zona de eliminação; narração ao vivo setor a setor com nomes reais das curvas e o efeito do acerto.

**Corrida narrada e relatório oficial**
- Toda ultrapassagem fica registrada com o local real (curva, chicane, vácuo da reta); defesas, toques e duelos também.
- Resumo narrado de cada volta: largada (quem ganhou e quem perdeu posições), troca de liderança, líder sob pressão, maior subida da volta e as brigas do top 10 com a diferença.
- Rádio das equipes: chamada de box, pneus no fim, piloto preso atrás de um carro mais lento, ordens de equipe (o companheiro abre passagem quando as estratégias são diferentes), reclamação depois de toque, Safety Car sem parada, chuva começando ou pista secando, diferenças para o carro da frente e volta mais rápida.
- Pit stops com tempo parado, tempo no pit lane, posição de entrada e de volta; undercut detectado e narrado.
- Relatório pós-corrida no padrão da F1: classificação oficial (Pos, Nº, Piloto, Equipe, Voltas, Tempo/Abandono, Pts, NC), volta a volta com filtros (destaques, minha equipe, ultrapassagens, pit stops, rádio) e as mudanças de posição de cada volta, gráfico de posições com faixas de Safety Car, tabela de pit stops e voltas mais rápidas com velocidade média.

**Conselho da FIA**
- Nova tela Conselho da FIA: a Comissão de F1 (FIA, Fórmula 1 e as 11 equipes) se reúne três vezes por temporada para votar mudanças técnicas, esportivas, de custos e de calendário.
- 24 tipos de proposta inspirados em debates reais: equilíbrio entre motor a combustão e parte elétrica, limite de combustível, peso mínimo, liberdade aerodinâmica, congelamento de motores por três anos, desenvolvimento extra para motores atrasados (ADUO), motores V8 sustentáveis, teto orçamentário, túnel de vento (ATR), testes, ponto pela pole e pela volta mais rápida, pontos até o 12º, grid invertido na Sprint, limites de pista, rigor dos comissários, mais Sprints, entrada, troca e saída de GPs.
- Para cada proposta, quem ganha e quem perde (motor, parte elétrica, orçamento, aerodinâmica, confiabilidade, posição no campeonato, GP em casa) e a intenção de voto de cada equipe.
- Regras de aprovação da vida real: FIA, Fórmula 1 e 60% das equipes (80% para mudanças que valem na mesma temporada). A Ferrari pode usar o veto histórico em temas técnicos uma vez por temporada.
- Clientes acompanham a fornecedora do motor em temas técnicos; equipes irmãs votam com a principal.
- Você vota, negocia com cada equipe, com a FIA e com a Fórmula 1 usando capital político (conversa, troca de apoio com acordo que precisa ser cumprido, pressão como fornecedor de motor) e pode levar a sua própria proposta.
- As decisões aprovadas entram em vigor na temporada indicada e mudam a simulação de verdade (motores, pontos, teto, calendário, Sprints).

**Equipes irmãs**
- Nova tela Equipe irmã. Red Bull e Racing Bulls começam como família, como na vida real.
- A partir da segunda temporada você pode comprar uma equipe satélite (no máximo uma) por 40% a 70% do orçamento anual dela, conforme prestígio e último campeonato. Montadoras, equipes de ponta e equipes de outra família não estão à venda.
- Academia compartilhada: os membros das duas academias passam a ser de uma só, e a irmã dá preferência aos pilotos da academia (política "formar jovens" ou "buscar resultados").
- Promoções no estilo Red Bull: você troca pilotos entre as duas equipes a qualquer momento entre os GPs, inclusive no meio da temporada. As famílias controladas pelo jogo também promovem e rebaixam pelo rendimento; se a sua equipe for a irmã, a principal pode levar o seu piloto da academia dela.
- Parceria técnica: a irmã usa peças da principal e se aproxima dela a cada temporada; no Conselho da FIA, vota com a principal.
- Dá para vender a irmã por 85% do valor de mercado.

**Idiomas e tipografia**
- Jogo em português (Brasil) ou inglês: escolha na primeira abertura, na tela inicial ou em Salvar e opções.
- Em inglês: interface, narração da classificação e da corrida, rádio, resumo das voltas, retorno do piloto no treino, pneus, abandonos, Conselho da FIA e as manchetes mais comuns. Notícias e registros antigos ficam no idioma em que foram escritos.
- Títulos em caixa alta no padrão das transmissões da F1 (Titillium Web Black). Se os arquivos da fonte Formula1 Display forem colocados em `app/assets/fonts`, o jogo passa a usá-la.

**Compatibilidade**
- Saves da 0.6 abrem normalmente (save v5): fim de semana em andamento no formato antigo recomeça no formato novo, e o Conselho da FIA e as equipes irmãs são criados.

## 0.6.0 — Moratelli Game Company
- Numeração das versões revista: o jogo segue em desenvolvimento (as versões publicadas como 1.0.0 e 1.0.1 passam a ser a 0.5 e a 0.6).
- Nova tela **Perfil e ativação** (menu Sistema e tela inicial): perfil do jogador e campo para a chave do produto. Ainda sem efeito no jogo.
- PitWall passa a ser oficialmente um jogo da **Moratelli Game Company (MGC)**, com logo próprio.
- Instalador com a identidade da tela inicial: lateral com foto noturna e o logotipo PIT WALL, cabeçalho com a marca, textos de boas-vindas e conclusão em português e assinatura da MGC em todas as páginas.
- Nova tela de abertura ("Moratelli Game Company apresenta"), novo ícone e créditos da empresa na tela inicial e em Salvar e opções.
- Executável e lista de programas do Windows mostram "Moratelli Game Company" como editora.

## 0.5.0 — O universo completo
**Pilotos, contratos e mercado**
- Contratos reais de todos os pilotos da F1 (duração, opções, cláusulas, salários estimados), empresários, academias reais (Ferrari, Red Bull, Mercedes, McLaren, Alpine, Williams, Aston Martin, Audi) e superlicença com a tabela de pontos da FIA.
- 16 atributos e 16 estilos de pilotagem com efeito real na corrida, personalidade (ambição, lealdade, temperamento, mídia).
- Mercado em ondas (silly season): rumores, aposentadorias anunciadas, renovações, pré-contratos, demissões no meio do ano, negociação com contrapropostas.
- 15 funções de staff com nomes reais (diretor técnico, chefe de aerodinâmica, engenheiros de corrida, chefe de estratégia...), contratação com "gardening leave".

**Corrida**
- Compostos C1–C5 escolhidos por GP (Pirelli 2026), temperatura de pneu e de pista, clima por latitude, mês e horário (corridas noturnas), umidade e vento.
- Setores, velocidade máxima, bateria e modo de ultrapassagem por energia (regulamento 2026), limites de pista, bandeira vermelha.
- Nova tela de corrida: luzes de largada, torre com setores, Pit Wall dos dois carros, gráfico de líderes, previsão de estratégia.

**Regulamento, calendário e carro**
- Regulamento técnico, de desenvolvimento e esportivo editável, com mudanças programadas por temporada (ATR por posição, limite de unidades de potência e punições no grid, formato da classificação, pontos pela pole, grid invertido, rigor dos comissários).
- Calendário com datas, Sprints, distância entre etapas, rodadas consecutivas, otimização de logística e frete por distância.
- Gerador de circuitos com traçado procedural e perfil técnico coerente.
- P&D com 15 áreas, responsável, risco e impacto na confiabilidade; foco no carro do ano seguinte; projeção financeira do fim da temporada.

**Mundo vivo**
- Portal de notícias com veículos reais e imagens, rede social com perfis reais de pilotos, equipes e imprensa, memória de histórias e marcos (comparados à história real desde 1950).
- Rivalidades que nascem de batidas e disputas, esfriam com o tempo e deixam os rivais mais agressivos na pista.
- Escândalos raros, sempre com pessoas e organizações fictícias.
- Sons sintetizados (motor, luzes, pit stop, Safety Car) e animações discretas.
- Páginas de equipe (linhagem real, títulos, chefes de equipe) e de circuito (recordes de volta e vencedores), recordes de temporada no Hall da Fama.

**Outras categorias**
- F2, F3, Fórmula Regional Europeia, Fórmula Regional do Oriente Médio, Fórmula Regional das Américas, Fórmula Regional do Japão, F4 Italiana, Espanhola, Britânica, E4, F4 Brasil, F4 Estados Unidos, F4 Japonesa, Super Formula e Fórmula E, com grids, calendários e classificações reais de 2026.
- Fotos oficiais de pilotos e carros da F2/F3, equipes da Fórmula E e fotos do Wikimedia Commons.
- Simulação sincronizada pelas datas da F1, pontuação de cada série, superlicença, progressão F4 → regionais → F3 → F2 → F1 e novos talentos gerados a cada ano.

**Qualidade**
- Balanceamento carro × piloto, talentos em faixas de potencial, teste de 20 temporadas sem erros, varredura de todas as telas, migração automática de saves antigos (v1–v3 → v4).

## 0.3.0 — Dados reais e identidade F1
- Base padrão com a **F1 2026 real**: 11 equipes (com Audi e Cadillac), 22 titulares, reservas e pilotos fora do grid, motores, chefes de equipe, patrocinadores e o calendário de 23 etapas com as 6 Sprints.
- Notas dos pilotos e dos carros estimadas a partir dos resultados reais (últimas 3 temporadas, comparação com o companheiro, forma em 2026).
- Totais reais de carreira de cada piloto (GPs, vitórias, pódios, poles, títulos, pontos).
- **História real desde 1950**: navegador de temporadas e **Hall da Fama** com filtros por período, fonte (real/simulada) e nacionalidade. Dados reais e simulados sempre identificados.
- Fotos oficiais dos pilotos, carros 2026, logos das equipes, mapas oficiais e fotos dos circuitos.
- **Traçados reais** no mapa da corrida ao vivo.
- **Corridas Sprint** com pontuação própria (8 a 1).
- Novo visual inspirado na F1: vermelho oficial, preto-carbono e Titillium Web.
- Economia da IA proporcional ao teto orçamentário real; eficiência depende de staff e instalações.
- Removidos todos os textos com "IA" da interface.

## 0.2.0 — Aplicativo Windows e memória do universo
- Aplicativo desktop (Electron) com instalador `Setup.exe`, atalhos na área de trabalho e no menu Iniciar, ícone próprio, tela de abertura, janela redimensionável e tela cheia (F11).
- Saves em `%APPDATA%\PitWall Racing Simulator` com gravação atômica, 5 backups por save e recuperação automática. Logs com rotação.
- Fontes empacotadas: o jogo funciona offline.
- Migração de saves (v1 → v2).
- Modo Observador.
- IA dos chefes de equipe com caixa, personalidade, teto orçamentário, investimentos e contratação de staff.
- Registro permanente do universo, arquivo de temporadas, histórico por piloto e equipe, página do piloto.
- Tela Diagnóstico com verificação de integridade e reparo.
- Notícias baseadas em fatos (sequência de abandonos, troca de liderança, primeira vitória, duelo interno).
- Testes: simulação prolongada (`npm test`) e teste do executável (`npm run test:smoke`); CI no Windows.

## 0.1.0 — Primeira versão web
