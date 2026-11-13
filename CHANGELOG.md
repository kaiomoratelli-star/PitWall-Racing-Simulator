# Changelog

## 0.9 — em desenvolvimento (branch `v0.9-aprimoramento`)

### Onda 1 — Plataforma e rede de segurança
**Simulação (mudança intencional, assinaturas regravadas uma vez)**
- Corrigido: a mesma semente gerava carreiras diferentes conforme a versão do motor JavaScript (Node 20 × 26; o mesmo vale ao trocar o Electron). Três sorteios do núcleo embaralhavam listas com um comparador aleatório: quem entra no leilão por um piloto, os pontos fortes e fracos sorteados no perfil de cada piloto e a ordem dos candidatos a nova equipe. Agora usam um embaralhamento com semente (`shuffleBy`), igual em qualquer motor. As 4 assinaturas de `tests/determinism.json` foram regravadas (iguais no Node 20 e no 26). Saves antigos abrem normalmente; a partir da 0.9, uma carreira segue outro caminho de sorteio que a mesma carreira na 0.8.7.
- Guarda nova no `guard-check`: um `sort` com comparador aleatório no núcleo faz o `npm test` falhar.

**Plataforma**
- Electron 33 → **45.3.1** e electron-builder 25 → **26.18.0**; Playwright 1.65.0, acorn 8.19.0, acorn-walk 8.3.5, resedit 3.1.0 e js-yaml 5.5.0, todos em versão exata. **Node.js 26** (LTS ativo) no desenvolvimento e no CI (`.nvmrc` e `engines`). Actions na versão mais nova (checkout e setup-node v7, upload-artifact v7, action-gh-release v3).
- Avisos de segurança zerados (`npm audit`): o `minimatch` das ferramentas de build vem na versão corrigida.
- `freshness-check` no CI: falha com Node ou Electron fora de suporte ou com aviso de segurança; antes de lançar, qualquer versão nova pendente também bloqueia. Dependabot semanal na branch de trabalho.
- Mantidos: `contextIsolation`, `sandbox`, sem `nodeIntegration`, CSP `connect-src 'none'` e saves em `%APPDATA%`. Registro de mensagens da interface no formato do Electron 35+.

**Aceleração de hardware**
- Ligada por padrão, com a opção **Aceleração de hardware (placa de vídeo)** em *Salvar e opções* para desligar (vale ao reabrir o jogo; fica nas preferências do aplicativo, não no save).
- A pista do mapa da corrida é desenhada uma vez e reaproveitada; a cada quadro entram só os carros (menos CPU).
- Medições antes e depois em `docs/perf/` (`scripts/perf-check.js`, também no aplicativo Electron).

**Saves, privacidade e publicação**
- A conta padrão da tela de perfil não traz mais nome nem e-mail. `privacy-check` no `npm test` falha se o build tiver um endereço de e-mail.
- Saves de teste da 0.8.7 (Manager entre etapas, Manager no meio da corrida e Observador com 2 temporadas). O teste de compatibilidade aceita saves do Observador e valida o esquema do save.
- CI: um instalador publicado nunca é trocado. Se a release já tem o Setup, nada é publicado; se o push mudou o jogo sem subir a versão, o CI falha pedindo `x.y.z-1`. Teste novo: instala a 0.8.7 publicada, cria um save, instala a versão nova por cima, confere que o save não mudou e o abre.

**Inglês**
- Traduzidos: títulos de propostas do Conselho dentro das manchetes de bastidores, rivalidades com batidas, troca de staff, nomes das categorias de base e a fonte da base de pilotos. O teste de idioma passou a exigir zero trechos em português na versão em inglês.

**Documentos**
- `CLAUDE.md` (guia do projeto), README com a versão e os comandos atuais, ficha `docs/marketing/3-SOBRE-O-JOGO.md` conferida com o código.

### Correções (regra 6: uma tela nunca muda o jogo)
- Corrigido: abrir a tela de Olheiros antes do primeiro GP criava o departamento de olheiros com nomes tirados do sorteio do jogo. O resto da carreira saía diferente conforme o jogador abria a tela ou não. A tela agora só lê; os dois primeiros olheiros chegam depois do primeiro GP (ou quando o jogador manda observar um piloto), e a tela avisa isso.
- Corrigido: abrir a tela de Desenvolvimento antes da simulação gravava a organização da equipe com a reputação daquele instante, e o carro evoluía diferente. O mesmo valia para a cota de túnel e CFD do período e para o empresário dos pilotos (telas de Donos e fichas). As telas agora só mostram esses valores; quem grava é a simulação, no mesmo momento de sempre.
- Proteção geral: o que uma tela criar no estado do jogo enquanto é desenhada (mercado, olheiros, parcerias, Conselho, casos...) é desfeito logo depois e registrado no log.
- Teste novo `screen-purity-check` (no CI): a mesma carreira, com a mesma semente, abrindo todas as telas antes do primeiro GP e entre as etapas, e sem abrir nenhuma, termina idêntica (Manager e Observador). Antes das correções, as três carreiras do teste terminavam diferentes.
- As 4 assinaturas de determinismo continuam iguais: a simulação de quem não abria as telas não mudou.

### Dados
- F1 2027: Liam Lawson e Arvid Lindblad (Racing Bulls) e Oliver Bearman (Haas) confirmados nas mesmas equipes (informação da MGC, 13/11/2026). Os 22 titulares do grid inicial agora batem com os anunciados (`docs/VERIFICACAO-2027.md`). As confirmações que a fonte pública ainda não tem ficam em `scripts/driverdb-manual.json`, com fonte e data, e são aplicadas por `scripts/driverdb-fixes.js`, que a importação chama no fim.
- Corrigido: 31 nomes de equipe na base de pilotos apareciam com marcação da Wikipedia na ficha de carreira (ex.: "{{nowrap|Mercedes-AMG Petronas F1 Team}}"). A importação limpa a marcação, e o `pack-check` falha se sobrar alguma.
- Assinaturas de determinismo regravadas por causa do dado novo: uma temporada inteira com a base antiga e com a nova é idêntica em tudo menos nesses textos e na situação das três vagas.

### Ferramentas
- Corrigido: `npm test` travava no Windows 11 build 26200 sem rodar nada. O `cmd.exe` desse Windows (10.0.26100.9949), que o npm usa para os scripts, trava quando a linha tem 10 ou mais `&&`, e a cadeia do `npm test` tinha 12. Agora o `npm test` chama `scripts/test-all.js`, que roda as mesmas 13 verificações na mesma ordem, para na primeira falha e mostra o tempo de cada uma. O `workflow-check` falha se algum script do `package.json` voltar a ter 10 ou mais `&&`.

### Onda 2 — Dívida técnica (em parte)
- O redator do paddock sorteia com um gerador local: a versão web e a desktop seguem a mesma sequência de sorteios com a mesma semente (`web-desktop-check` no CI).
- A frase da vitória na Sprint ganhou a versão em inglês.
- Removido de `regs.js` o modelo antigo de unidade de potência, que nunca era executado (o desgaste vem de `parts.js`).
- Guarda nova no `guard-check`: os embrulhos antigos de tela e de ação (`const old = SCREENS.x; SCREENS.x = ...`) não podem aumentar. A contagem por arquivo fica em `tests/wraps.json` (71 hoje, em 41 arquivos); código novo usa o registro de ganchos (`Hooks.around`).
- Adiados de propósito, para não refazer trabalho: a conversão desses embrulhos de tela (vai junto com as telas novas) e a consolidação dos módulos sobrepostos (vai junto com a camada de dados e o motor).

### Onda 3 — Camada de dados e edições (em andamento)
**Jogo base fictício**
- O jogo roda inteiro sem nenhum dado real: núcleo e todas as telas, nos modos Manager e Observador (`build --sem-dados-reais`, `fictional-check` no CI).

**Pacote de dados**
- Formato `pitwall-pack` v1: um JSON versionado com os dados reais (equipes, pilotos, pistas, categorias, história, recordes e o registro das fotos) e uma pasta de imagens. Um pacote inválido é recusado sem mudar nada (`pack-check`: 10 casos).
- Os dados reais saíram do código do jogo. O build grava o Pacote de dados ao lado do jogo (`app/dist/packs/pitwall-dados-reais.js`; na versão web ele vem embutido). O jogo confere e instala o pacote antes de abrir qualquer tela. Sem o pacote, o mundo é o fictício. Se o pacote estiver danificado, o jogo avisa e abre com o mundo fictício.
- Para quem joga, nada muda: o instalador leva o pacote e o mundo é o mesmo de antes (as 4 assinaturas de determinismo continuam iguais, com e sem o pacote).
- As fotos e logos do mundo real (rostos, pilotos, equipes, carros, categorias, pistas e fotos das notícias) foram para a pasta de imagens do Pacote de dados (`app/dist/packs/pitwall-dados-reais/img`). O jogo base leva só as bandeiras, as fontes e a marca MGC. Sem o pacote, nenhuma foto real aparece.
- Teste novo de imagens nas telas: nenhuma imagem pode falhar ao carregar (antes, uma foto que faltava sumia em silêncio), e as fotos do mundo real só podem vir do pacote.

**Mundo fictício (regra 19 do dono, 13/11/2026)**
- O mundo fictício é o banco de dados original, inteiro e idêntico (todos os pilotos, equipes, competições, números e histórico), com todos os nomes trocados por nomes gerados automaticamente e os mesmos IDs. Decisões do dono: trocam pessoas, equipes, fabricantes, marcas, patrocinadores, veículos de imprensa e competições; circuitos, GPs, cidades e países ficam reais; os nomes são fixos na edição.
- Pacote de dados `pitwall-ficticio` (gerado por `scripts/make-fictional-pack.js`, sem fotos): um dicionário troca cada palavra própria sempre pela mesma palavra fictícia.
- Estilo dos nomes (decisão do dono, 13/11/2026: "bem parecido, estilo PES"): o primeiro nome fica; o sobrenome e as palavras de equipe, marca e competição mudam só o final, com terminações do idioma da pessoa (Lewis Hamilton → Lewis Hamilford, Max Verstappen → Max Verstappel, Ferrari → Ferrano, Red Bull → Red Bison, McLaren → McLarsen). A sigla de 3 letras fica quando ainda combina (HAM, VER, RBR). Competições na escada GP: Fórmula 1 → GP1, F2 → GP2, F3 → GP3, F4 → GP4, Fórmula E → GP Elétrico, IndyCar → IndyRace, FIA → FMA. A amostra aprovada pelo dono e os veículos de imprensa ficam em `scripts/fictional-overrides.json`; o resto é gerado, com um filtro de naturalidade (as sequências de letras do final novo existem em nomes reais do mesmo idioma). Palavras comuns ("Pole", "Notícias") só mudam dentro de nomes próprios.
- `node scripts/build.js --edicao=ficticia` monta a edição fictícia. Os textos escritos no código ("Fórmula 1", "Conselho da FIA", "F2, F3 e F1 Academy"...) passam pelo mesmo dicionário na hora do build, e os comentários saem; o instalador não leva o dicionário nem nenhum nome real.
- Listas do mundo real que estavam no código foram para os dados (`app/data/world-lists.js` e `REAL_EXTRA`): profissionais famosos do staff, sorteio de patrocinadores, identidade das equipes (Gucci Racing Alpine), montadoras candidatas, pneus, políticas de grupo, criadores de conteúdo, veículos de imprensa e perfis nas redes. No jogo real, nada muda.
- Teste novo `fictional-world-check` (no `npm test` e no CI). Decisão do dono (13/11): as corridas no real e no fictício não precisam dar o mesmo resultado; o que tem de ser igual são os ids. O teste confere:
  - o mesmo banco: estrutura, números e ids (3.182 ids);
  - os mesmos ids ao criar a carreira;
  - a carreira fictícia rodando duas temporadas, no Observador e no Manager;
  - nenhum nome real no pacote nem no jogo;
  - o estilo decidido pelo dono (primeiro nome igual, sobrenome com o mesmo começo, siglas, escada GP).
- O `fictional-check` passou a testar a edição fictícia: 50 telas nos dois modos sem nenhum nome real na tela (palavra inteira: "Strollin" não é "Stroll"). Nome de equipe, motor ou categoria nunca é perdoado por ser também palavra do código.

**Simulação (mudança aprovada pelo dono; assinaturas regravadas uma vez)**
- Sorteios que usavam o nome da pessoa passaram a usar o id: idade de staff e eventos de vida (`stories.js`), perfil e teto de potencial dos pilotos sem QID (`talent.js`), quantos posts reagem a um fato e os sorteios dos posts (`stories.js`, `media.js`), veículo de cada notícia (`media.js`), reputação e afinidade do empresário (`market-plus.js`, pela ordem do empresário na base). Pilotos gerados pelo jogo ganharam id pelo contador da carreira, e não pelo nome sorteado.
- Corrigido: a equipe de um piloto nas outras categorias e a força das equipes eram achadas por "contém a primeira palavra". "R-ace GP" (primeira palavra "r") caía em qualquer equipe com a letra r, e "Matt Stone Racing" em "AMattheis Vogel" (421 combinações afetadas). Agora vale o nome inteiro ou uma palavra distintiva em comum (`Cats.sameTeam`).
- Corrigido: notícias marcavam a equipe Red Bull quando o título citava o circuito "Red Bull Ring" (lugares não contam mais como citação).

**Saves**
- O save guarda de qual Pacote de dados o mundo veio (campo novo `pack`, no esquema do save). Saves das versões anteriores ficam marcados com o pacote real e abrem normalmente: os 9 saves de teste (0.8.4 a 0.8.7) abrem com o pacote instalado.
- Um save só abre com o pacote com que foi criado. Um save com dados reais aberto sem o pacote, com outro pacote, ou um save fictício aberto com pacote, é recusado com um aviso, e nada é alterado.

## 0.8.7 — Solidez: nada some, saves seguros, testes que falham (09/11/2026)
Base: as prioridades P1 a P3 de `docs/AVALIACAO-0.8.6.md`. Relatório completo em `docs/RELATORIO-0.8.7.md`.

**Saves**
- Saves compactados (gzip, ~6x menores: 3 MB → ~0,5 MB). No desktop o arquivo é lido de volta e comparado antes de substituir o anterior; no navegador e na nuvem também. Carreiras longas cabem no limite do navegador.
- Saves das versões anteriores (.json) continuam abrindo; o original vai para os backups, nunca é apagado.
- Esquema do save: todos os campos do jogo registrados e conferidos ao abrir e antes de gravar. Um jogo sem as peças centrais não é gravado (o save anterior fica).
- Corrigido: abrir um save que falhava fazia o salvamento automático gravar a carreira anterior por cima dele.
- Corrigido: importar um jogo com os três espaços ocupados gravava por cima do terceiro.
- Corrigido: decisões pendentes podiam ser cortadas pelo limite de 120 mensagens da caixa de entrada.

**Nada pode sumir**
- Ganchos com nome no lugar das cadeias de embrulho (130 convertidos); trocas de propósito ficam registradas; o jogo confere ao abrir e o Diagnóstico lista tudo.
- Código em pastas por assunto; arquivos grandes divididos.
- Corrigido: a aba "Evolução dos pontos" da Classificação dependia da tela antiga.
- Desenhar uma tela não pode mais mexer no sorteio do jogo (guarda no `render`).

**Jogo**
- Corrigido: quem jogava em inglês nunca pagava reparos de acidente (a mesma carreira dava resultados diferentes por idioma).
- Ponto na superlicença por limite de pista vira decisão dos comissários (~50%): suspensões de 2,3 para 1,0 a cada 8 temporadas.
- Texto gerado pelo jogo (eventos, notícias, mercado, Conselho, redes) em inglês de verdade quando o jogo está em inglês.

**Danos na corrida (pedido do dono)**
- Asa dianteira com dano parcial: um pedaço da asa custa menos tempo por volta e o carro pode seguir até a parada normal; dano grande pede a troca do bico.
- Bandeira preta e laranja: asa solta obriga a parar em até 2 voltas; quem não para leva bandeira preta. A peça pode cair antes e ficar na pista.
- Detritos de asa na pista podem trazer o Safety Car virtual.
- Rádio do engenheiro conforme o dano; faixa da Direção de prova mostra a bandeira preta e laranja.
- Saúde do carro: no treino, na classificação e na estratégia (motor e câmbio por componente, consertos da última corrida) e na corrida, ao vivo no muro dos boxes (cada peça, perda em segundos por volta, peça solta, pneu e motor).

**Interface**
- Primeiros passos na Central e dica curta na primeira visita a cada tela.
- Resumo da etapa na caixa de entrada (avisos de rotina agrupados; o jogador escolhe o que continua chegando como carta).
- Faixa "Direção de prova" na corrida: investigações abertas, punições a cumprir e decisões recentes.
- Etiquetas "por quê": química, moral, confiança no chefe, vida do motor e ATR.
- Acessibilidade: teclado em tudo o que é clicável, contraste maior no texto secundário, tamanho do texto (Normal, Grande, Muito grande).
- Carro com abas (Visão geral / Motor e peças); Mercado e Olheiros em páginas (antes só os 120 e 80 primeiros apareciam).
- Editor e Academia no visual novo.

**Testes (todos no CI do Windows)**
- Determinismo, saves reais da 0.8.4/0.8.5/0.8.6, testes por regra, idioma não muda o jogo, esquema, saves em disco e no navegador, todas as telas e abas (5 combinações), inglês sem vazamento, cliques ao acaso; no Windows, um save real da 0.8.6 aberto no jogo instalado.

## 0.8.6 — Expansão esportiva e administrativa (09/11/2026)
O plano está em `docs/historico/PLANO-0.8.6.md` e a auditoria do código em `docs/historico/AUDITORIA-0.8.6.md`.

**Superlicença e treino livre com novatos**
- Superlicença completa: 40 pontos nas três últimas temporadas (25 para a de treino livre), idade mínima e pontos por TL1.
- Pontos de punição: 12 em 12 meses suspendem o piloto por uma corrida; o reserva assume.
- Cota de TL1 com novato (2 por carro por ano), com painel no treino, escolha de reserva ou piloto da academia, e multa no fim do ano para quem não cumprir.

**Comissários**
- Novas infrações: excesso de velocidade no pit lane, liberação insegura e largada queimada, além de colisão e limites de pista.
- Direito de revisão das punições dadas na corrida: até 96 horas, só com elemento novo, taxa de US$ 0,1 mi; se aceita, a classificação e os pontos são recalculados.
- Vistoria técnica depois da corrida (prancha, peso, combustível) com desclassificação e direito de apelar ao Tribunal de Apelação da FIA.
- Equipes da IA também pedem revisão.
- Tela "Comissários e casos" (Mundo) com todas as decisões do ano.

**Carro**
- Danos por peça: asa dianteira, assoalho, suspensão, freios e câmbio. Cada uma custa tempo por volta e pode ceder. Troca de bico no box deixa a parada mais longa. A conta de reparo entra no teto de gastos.
- Motor por componente (ICE, turbo, MGU-K, bateria, eletrônica, escapamento e câmbio), com desgaste, cota por temporada e as punições reais de grid (10 posições no primeiro elemento extra, 5 nos seguintes, fim do grid acima de 15). Painel na tela do Carro com vida útil e botão de troca antes da classificação.
- Testes de pré-temporada (pelo regulamento "Dias de teste") com foco escolhido e teste de meio de ano.
- Congelamento de motor e de chassi votados no Conselho passam a travar o desenvolvimento.

**Ordens de equipe e pessoas**
- O piloto pode obedecer ou recusar a ordem, conforme personalidade, campeonato, moral, confiança e química. Rádio com falas variadas, notícias e reação nas redes.
- Política de equipe: disputa livre ou piloto nº 1.
- Moral com causas: a tela mostra os três motivos que mais pesaram.
- Química entre companheiros (−100 a +100).
- Conversas com os pilotos (Equipe → Conversas): o assunto nasce do momento, cada perfil de piloto fala e reage de um jeito, e as falas não se repetem em conversas próximas. Promessas ficam registradas e são cobradas.
- Confiança no chefe pesa na renovação, nas ordens e no pedido de saída.
- Funcionários com moral, pedidos de aumento, verba e promoção, conflitos entre chefes de área e demissão do diretor técnico depois de um ano ruim.

**Pedidos do dono (09/11)**
- Pneus e peças mostram a vida que resta (de 100% a 0%), não o desgaste: torre de tempos, cartão do piloto, abas da corrida, estratégia e motor.
- Equipe irmã: a dona indica quem corre nela (piloto da academia, o seu reserva ou um piloto livre com superlicença).
- Equipe irmã comprada pode ganhar identidade nova: nome, nome completo, sigla, cores, logo (da lista ou importado) e nome do chassi, com prévia e opção de voltar à original.

**Parcerias técnicas e o que tinha sumido (09/11)**
- Parceria técnica sem ser dona, como Haas–Ferrari e Williams–Mercedes, em Equipe → Parcerias. A cliente pede à equipe de fábrica do seu motor um pacote básico (motor e câmbio, US$ 6 mi/ano) ou completo (mais suspensão e túnel de vento, US$ 14 mi/ano). A equipe de fábrica pode oferecer parceria às clientes (até 2). Qualquer lado pode encerrar.
- Varredura entre versões (0.8.4 × hoje: telas, abas, painéis, botões e funções). Voltaram:
  - em Análise → Tempos de volta, o gráfico de tempos com a opção de esconder a 1ª volta, as paradas e o Safety Car (a aba mostrava o gráfico de posições por um conflito de nomes);
  - a aba Artes nas notícias e o botão de curtir nas redes;
  - nas Finanças, a previsão para o fim do ano: caixa projetado, teto no fim do ano, folha fixa, receita prevista, mercado de patrocínio, custos fixos e patrimônio dos donos;
  - no Calendário → Etapas, a tabela da temporada com vencedor, pole, sua melhor posição e condições;
  - na página da equipe, os chefes de equipe;
  - no P&D, a restrição aerodinâmica (ATR) de cada equipe.

**Fechamento da 0.8.6 (09/11)**
- Direção de prova completa:
  - incidentes ficam "sob investigação" e a decisão sai algumas voltas depois ou após a bandeirada;
  - escala de punições: advertência, 5 s, 10 s, drive-through, stop-and-go e posições no grid da próxima corrida;
  - drive-through e stop-and-go não cumpridos em 3 voltas viram 20 s e 30 s;
  - "nenhuma ação" também é uma decisão possível.
- Novas infrações: sair da pista e ganhar vantagem, e ignorar bandeiras azuis.
- Os comissários podem reabrir um caso por conta própria (regra de 2026).
- Ordem de rádio "Proteger o companheiro": segura quem vem atrás quando o companheiro está logo à frente.
- Motor: previsão de em que etapa cada elemento vai estourar a cota.
- Reserva que assume o carro precisa de superlicença (reserva, academia ou piloto livre, nesta ordem); corrigido o caso raro de o mesmo reserva entrar nos dois carros.
- Calendário marca as etapas com novato no TL1.
- Teste de funcionalidade novo (`scripts/playthrough-check.js`): joga temporadas inteiras pela interface e confere a integridade dos dados.

**Limpeza**
- Cerca de 680 linhas de código sem uso removidas; funções esquecidas reaproveitadas (rivalidades, créditos e licenças, censo de talentos, estouros do teto).
- Nota do chefe de equipe e aerodinâmica ativa passaram a ter efeito.

## 0.8.5 — Nova interface (08/11/2026)
Interface nova a partir das duas propostas (A "Transmissão" e B "Paddock") e da escolha tela a tela do dono do jogo. Relatório da verificação em `docs/historico/RELATORIO-0.8.5.md`.

**Sistema visual**
- Temas escuro (padrão) e claro, trocados no topo ou em Opções → Interface.
- Cor da equipe do jogador aplicada a destaques, barras e gráficos.
- Formas misturadas com regra fixa:
  - redondo para pessoas, pneus, estado ao vivo e porcentagens (anéis);
  - quadrado arredondado para dados, notas, posições, etiquetas, botões e cartões.
- Fonte Barlow Condensed (títulos e números) junto com Titillium Web e IBM Plex Mono, incluída no instalador.
- Mais gráficos em todo o jogo: anéis, barras, linhas, radar, rosca, dispersão, mini-gráficos e mapas de pista.

**Casca e navegação**
- Áreas (Início, Corrida, Equipe, Carro, Fábrica, Mercado, Finanças, Mundo, Arquivo) com abas no topo de cada área.
- Menu na lateral (padrão), no topo ou embaixo, escolhido em Opções → Interface.
- Barra superior com construtores, caixa, diretoria e data, e um botão "Avançar" que mostra as pendências.
- Busca rápida (Ctrl+K) de telas, pilotos, equipes e circuitos.

**Telas**
- Central: faixa de notícias do Paddock girando, próxima etapa com mapa da pista e dados do seu carro naquele traçado (posição esperada no grid, último vencedor, maior vencedor).
- Calendário: visão por mês (principal) e por etapa; clique na pista abre a ficha.
- Treino e acerto: indicador quadrado nas barras de acerto.
- Corrida ao vivo:
  - pista maior;
  - Pit Wall com abas por piloto;
  - rádio com ordens novas: deixar o companheiro mais rápido passar, evitar zebras, ficar fora da janela de box, evitar ar sujo, além de atacar, defender, poupar e motivar.
- Pole (depois da classificação): pôster com o pódio do grid e a posição de cada piloto.
- Pódio novo no estilo da cerimônia, aberto ao fim de cada corrida.
- Pilotos:
  - lista no modelo A;
  - "Mano a Mano" para comparar dois pilotos;
  - página do piloto com radar de atributos.
- Carro no modelo B. Fornecedores foram para a aba Fabricantes, agora muito mais detalhada (motores, pneus e movimentações).
- P&D: as duas propostas juntas (quadro de projetos + painel do carro).
- Finanças:
  - visão geral com rosca de despesas;
  - aba Análise: gasto por ponto, gasto × pontos, receitas e gastos por etapa, orçamentos do grid;
  - extrato com filtro por categoria.
- Patrocinadores, Conselho, Notícias (jornal) e Fim de temporada no modelo B.
- Página da equipe com estatísticas completas e os maiores vencedores.
- Redes sociais e todas as telas sem pedido específico no modelo A.

**Ajustes pedidos depois da primeira versão**
- Conselho: faixa com a logo da FIA e o plenário da Comissão (FIA, Fórmula 1 e as 11 equipes, agrupadas pelo motor).
- Fabricantes e Patrocinadores: logos no tamanho certo (antes apareciam ampliadas e cortadas); margens vazias recortadas em 4 arquivos de logo.
- Corrida ao vivo:
  - classificação com a liderança volta a volta embaixo;
  - pista maior no centro, fixa ao rolar;
  - ordens dos pilotos com a direção de prova e o rádio embaixo.
- Notícias:
  - banco com cerca de 110 fotos do Wikimedia Commons (licenças livres, autor e licença em `assets/img/sources.json`), em 25 temas: largada, box, pódio, batida, Safety Car, chuva, garagem, paddock, coletiva, torcida, fábrica, pneus, troféu, muro dos boxes, bandeiras, F2, F3, IndyCar, NASCAR, WEC, Fórmula E, FIA, capacetes, kart, corrida noturna e história;
  - o tema sai do título e da etiqueta da notícia, e a foto é sempre a mesma para a mesma notícia;
  - montagens feitas pelo jogo: transferência (cores e logos das duas equipes), renovação, vitória (pista ao fundo e "P1"), duelo, marca histórica (número grande) e foto com o rosto do piloto;
  - o jornal mostra imagem na manchete, nas duas notícias ao lado e em metade das colunas.
- Tela de início: quatro propostas para escolher, trocadas no canto da própria tela ou em Opções → Interface:
  - **Largada:** foto da pista com zoom lento, luzes de largada e faixa de dados;
  - **Garagem:** carrossel com os carros do grid nas cores de cada equipe;
  - **Telemetria:** traçado sendo desenhado, carros andando, gráfico de velocidade e torre com o grid;
  - **Grid:** mosaico com os 22 pilotos e faixa vermelha no estilo capa de revista.
- Animações:
  - entrada das telas: da direita ao avançar, da esquerda ao voltar;
  - cartões e linhas de tabela em cascata;
  - barras, anéis e gráficos crescendo e números contando até o valor;
  - indicador das abas deslizando;
  - janelas e avisos com entrada suave;
  - pódio e pole com entrada dramática;
  - traçado da próxima pista sendo desenhado na Central.
  - Animam só quando a tela muda e respeitam a opção "Animações: desligadas" e a preferência do sistema por menos movimento.
- Retratos de 5 pilotos (Albon, Lindblad, Colapinto, Lawson e Gasly) estavam recortados sem a cabeça; foram refeitos a partir da foto de corpo inteiro.

**Varredura de coerência da interface**
- Testes feitos:
  - 17 estados do jogo revisados um a um: treino, classificação, estratégia, antes da largada, corrida, bandeirada, pódio, pós-corrida, temporada encerrada;
  - teste automático clicou nos 1.674 botões de 46 telas, sem erro.
- **Corrida:**
  - depois da bandeirada, somem Continuar, +1 volta, velocidades e "Simular até o fim", e entra "Encerrar fim de semana" (também no botão do topo);
  - antes da largada só aparece "Largar";
  - o painel de pré-largada ("Luzes vermelhas") não fica mais na tela depois que a corrida anda.
- **Fim de semana e corrida sem sessão:** mostram o próximo GP com o botão de avançar ou, com a temporada encerrada, o caminho para o fim de temporada. Antes oferecia "Começar" mesmo com a temporada encerrada.
- **Pós-corrida:** sem botões repetidos; Pódio, Grid e Análise já estão nas abas.
- **Abas Pódio e Pós-corrida:** durante um fim de semana, mostram "· GP anterior".
- **Central:**
  - a programação do fim de semana com Sprint mostra "TL1 · Classificação Sprint" na sexta, e não dois treinos;
  - saiu o botão "Preparar estratégia", que só abria a ficha do circuito.
- **Treino:** a confiança antes das primeiras voltas aparece como traço neutro, e não vermelho.
- **Estratégia:** a posição de largada usa etiqueta neutra.
- **`scripts/ui85-check.js`:** passou de 11 para 14 verificações de coerência (estado da corrida e temporada encerrada).

**Correções do relançamento da 0.8.5 (mesmo número de versão, instalador substituído)**
- **Outras categorias:** só avançavam quando terminava um GP de F1. Por isso, no começo do jogo, as etapas já passadas da Fórmula E, da F4 dos Emirados, da FR Oriente Médio e da NASCAR apareciam como não disputadas, e os dias entre os GPs não contavam.
  - Agora elas andam dia a dia, junto com o calendário do jogo.
  - Na carreira nova, as etapas anteriores à data inicial (26/02) já chegam disputadas.
  - Script novo `scripts/cats-check.js` (também no `npm test`). Ele confere que as 23 categorias não ficam com etapa atrasada e que todas terminam o ano com campeão, nos modos chefe de equipe e observador.
- **Classificação:**
  - pontos de cada etapa (corrida + Sprint) para pilotos e construtores, com cores de vitória, 2º, 3º, pontos e abandono;
  - logos das equipes;
  - total de pontos na última coluna, sempre visível, com piloto e posição fixos ao rolar.
- **Tabelas cabem na largura da tela** (Mercado de pilotos e as demais): o texto longo quebra linha, sem barra para os lados.
- **Central:** foto de fundo também no Bahrein, em Portimão e em Istambul (Wikimedia Commons, com créditos). Pistas sem foto usam uma foto genérica de corrida.
- **Tela de início:**
  - fica só a Largada, com fundo sorteado entre fotos de pistas e de corrida;
  - as luzes de largada aparecem só ao abrir o jogo, não a cada clique.

**Últimos ajustes antes do lançamento**
- Corrida:
  - menu suspenso de clima no topo, no estilo dos jogos de gestão. Mostra a condição agora, a água na pista (com faixas seca/intermediário/chuva), ar, asfalto, umidade, vento e o pneu indicado;
  - previsão em blocos de voltas com a chance de chuva, cuja precisão depende do estrategista;
  - gráfico de água na pista e temperatura do asfalto na corrida inteira;
  - combustível no cartão do piloto: % do tanque e sobra estimada em voltas até a bandeirada;
  - dados centralizados: setores, colunas da classificação, métricas do piloto e botões de rádio;
  - o topo fica em uma linha só, com as informações à esquerda e os comandos à direita.
- Tela de início "Grid": a Haas mostra Bearman e Rafael Câmara (quem tem foto oficial entra primeiro), e os nomes da segunda fileira não ficam mais escondidos.

**Simulação**
- Efeito das ordens de rádio no motor de corrida (ritmo, desgaste, combustível, erros, falhas, ultrapassagens e ar sujo).
- Atacar, defender e evitar ar sujo valem por 5 voltas: mantidas a corrida toda, custavam posições.
- "Deixar passar" espera o companheiro estar logo atrás (até 2,5 s). O piloto que cede perde moral.

**Verificação**
- Script novo `scripts/ui85-check.js`:
  - 47 telas e abas;
  - português e inglês, tema escuro e claro, menu na lateral, no topo e embaixo;
  - larguras de 1100 a 1920 px;
  - coerência dos números com os dados do jogo (11 verificações).

## 0.8.4 — Equipes como empresas, mercado vivo, política e eventos (08/11/2026)
Terceira etapa do plano de ultrarrealismo (roteiro em `docs/historico/ROADMAP-0.8.4.md`, relatório em `docs/historico/RELATORIO-0.8.4.md`). A interface fica para a 0.8.5, depois de uma conversa de design.

**Equipes como empresas**
- Cada equipe tem dono, com riqueza, ambição e paciência:
  - tipos: montadora, empresa, fundo de investimento, independente;
  - donos reais das 11 equipes de 2026 (Mercedes-Benz, Exor, Red Bull, Dorilton, Lawrence Stroll e outros).
- Valor de mercado estimado (receita, reputação, estrutura, patrimônio e dívida) e histórico do valor.
- Dívida: caixa negativo vira dívida com juros.
- Humor dos donos: sobe e desce com o resultado contra a expectativa e com o caixa. Dono feliz aumenta o aporte; infeliz corta.
- Venda de equipes:
  - montadora que sai, independente sem dinheiro, fundo que realiza o lucro;
  - compradores do banco de candidatas trocam nome, cores e logo, e a linhagem fica guardada;
  - investidores fictícios também compram.
- Sem comprador: compra pela gestão (como a Brawn em 2009) ou saída do grid; pilotos e funcionários ficam livres.
- Regras do dono do jogo:
  - Ferrari e McLaren nunca são vendidas;
  - Mercedes e Red Bull só depois de 20 temporadas e numa crise muito forte;
  - as demais podem ser vendidas;
  - equipe nova tem o prazo do plano de negócios antes de ser vendida.
- Entrada de equipes (até 12):
  - inscrição na FIA, análise técnica e financeira;
  - voto da Comissão no meio da temporada (as equipes temem dividir a premiação);
  - taxa de entrada e estreia no ano seguinte, com carro atrás do grid;
  - montadoras com motor próprio estreiam o motor depois de 3 ou 4 anos.
- 20 candidatas (aguardando a aprovação do dono do jogo):
  - 7 equipes reais: Hitech, Prema, Penske, Ganassi, ART, Rodin, Campos;
  - 8 montadoras: Toyota, Porsche, Hyundai, BMW, Lamborghini, Jaguar, Lotus, Mahindra;
  - 3 empresas: Monster Energy, Apple, TAG Heuer/LVMH;
  - 2 criadas para o jogo, com logos feitos no Canva: a brasileira Vórtice Racing e a Meridian Grand Prix, de Abu Dhabi.
- Nova carreira:
  - comandar uma equipe do grid, uma candidata (como 12ª equipe) ou criar a sua (12ª equipe);
  - a equipe criada tem nome, sigla, país, cores, tamanho do projeto (modesto, médio, ambicioso), motor e logo (20 genéricos ou importado).
- Tela nova "Donos e equipes": dono, valor, dívida, humor, situação de venda, candidatas e histórico. A página de cada equipe ganhou o painel "Dono e valor".
- Montagem da equipe nova (candidata ou criada pelo jogador), obrigatória antes da primeira corrida:
  - dois titulares e um reserva, com negociação de cada um; a lista mostra nota, pedido, empresário e o interesse de cada piloto num projeto novo;
  - cargos-chave da fábrica e dos boxes: candidatos livres (com luvas) ou tentativa de tirar os melhores dos rivais, com período de afastamento;
  - o diretor esportivo pode completar as vagas, e cargos não contratados seguem com interinos.
- Equipe parceira × equipe irmã:
  - irmã é o mesmo dono (academia e voto em comum);
  - parceira é acordo técnico com a fornecedora: Haas e Cadillac com a Ferrari, Williams e Alpine com a Mercedes;
  - a transferência de tecnologia é limitada (chassi e confiabilidade, nunca aerodinâmica);
  - carro parecido demais leva a protesto e investigação, como a "Mercedes rosa" de 2020;
  - troca de dono ou motor próprio encerra o acordo, e equipes novas fecham parceria com a fornecedora.

**Sede e fábrica (sistema novo)**
- 12 instalações por equipe, com nível de 1 a 5 e estado de conservação: sede, fábrica, escritório de projeto, túnel de vento, CFD, simulador, banco de testes, departamento de motores, logística, pit stop, performance humana, hospitalidade e marketing.
- Obras com custo e prazo (no máximo duas ao mesmo tempo), desgaste a cada GP e manutenção.
- Investimento anual fora do teto: US$ 30 mi, ou US$ 40 mi para as três últimas. O excedente conta no teto.
- Efeitos reais:
  - vagas de projeto do P&D (a vaga "bloqueada" agora abre aqui);
  - qualidade das peças (túnel e CFD na aerodinâmica, banco de testes no chassi);
  - prazo de projeto e de fabricação;
  - custo de logística, pit stop, recuperação de lesões, patrocínio, atração de funcionários e voltas extras no simulador.
- Equipes pequenas começam menores; a parceira técnica usa o túnel da equipe principal (Haas com o da Ferrari).
- A IA investe onde está mais atrasada em relação ao grid, conforme o caixa e o dono.
- Tela nova "Sede e fábrica", com comparação com o grid.

**Fabricantes de motor e de pneus (sistema novo)**
- Fabricante não precisa ter equipe:
  - fornece a até 4 equipes, com contrato (prazo e valor);
  - tem potência, confiabilidade, eficiência, orçamento de desenvolvimento e reputação.
- Desenvolvimento anual com retorno decrescente (acabou a subida infinita da potência) e reembaralhamento no regulamento novo.
- Entradas e saídas:
  - a GM estreia em 2029 com a Cadillac como equipe de fábrica (anúncio real);
  - Toyota, Porsche, Hyundai, BMW e Cosworth podem entrar só como fornecedoras e depois comprar equipes;
  - fabricante que vai mal pode sair com aviso de 2 anos, e a equipe de fábrica pode herdar o projeto.
- Contratos:
  - a IA escolhe o fornecedor no vencimento;
  - o jogador renova, troca, rescinde (com multa) ou pede parceria de fábrica a quem não tem equipe própria.
- Pneus:
  - licitação da FIA a cada 4 anos (Pirelli, Michelin, Bridgestone, Hankook, Goodyear, Yokohama), cada uma com desgaste e aquecimento próprios;
  - fornecedores reais de 18 categorias, com os logos que estavam sem uso.
- Aba nova "Fabricantes".

**Eventos: 136 no catálogo (+20 decisões entre corridas)**
- Grupos novos: "Imprensa e redes sociais" e "Bastidores e curiosidades".
- Cerca de 22 acontecimentos por temporada, quase todos pequenos: fãs, capacetes especiais, memes, rumores, alfândega, hotel lotado, patrocínios, roupas, gripe, entre outros. Alguns pedem decisão do jogador.
- Escândalos agora são raros, cerca de 0,4 por temporada (antes 1,6).

**Revisão e blindagem (dossiê em `docs/historico/DOSSIE-0.8.4.md`)**
- Corrigidos 18 problemas, entre eles:
  - deriva com o tempo: motores, confiabilidade, patrimônio, aporte e instalações;
  - crescimento sem fim do registro, do mercado e dos casos;
  - nome histórico das equipes vendidas;
  - parceiras da academia desatualizadas;
  - opções de contrato do piloto e mútuas nunca processadas;
  - save do navegador que falhava calado;
  - feed de notícias curto.
- Botão para apagar jogo salvo na tela inicial.
- Equilíbrio de forças recalibrado depois da chegada dos fabricantes:
  - o carro guarda 90% da vantagem de um ano para o outro (50% num regulamento novo), com menos ruído no desenvolvimento;
  - a campeã de construtores muda de mão em média 10,7 vezes em 25 anos (F1 real: 8).

**Mercado vivo**
- Empresários:
  - os pilotos da F1 têm o empresário real; os demais, agências fictícias;
  - estilo agressivo, equilibrado ou leal;
  - comissão paga na assinatura, salário pedido mais alto, interesse vazado para a imprensa.
- Leilão: equipes com vaga entram na disputa por pilotos já em conversa, e o piloto escolhe pelo projeto, salário, papel e empresário.
- A proposta do jogador concorre com as da mesa: o empresário avisa quanto o rival ofereceu.
- Silly season: abre nas férias de verão, com a lista de contratos que vencem.
- Renovações antecipadas da IA para os pilotos-chave e opção de renovação da equipe decidida no meio do ano.
- Contratos com bônus por vitória, pódio e título (pagos de verdade) e direitos de imagem.

**Política**
- O veto da Ferrari foi extinto.
- Bastidores: os blocos de motor que fecham posição antes da votação viram notícia, assim como as compensações oferecidas por quem propõe.
- Concessões: quem propõe (FIA, Fórmula 1 ou equipe) oferece dinheiro ou horas de túnel aos indecisos. O jogador recebe a oferta e decide.
- A Comissão vota a entrada de equipes novas, e o jogador vota na tela do Conselho.

**Eventos, escândalos e consequências**
- Frequência geral Baixa, Normal ou Alta, e nível por tipo (Desligado, Raro, Normal, Novela, Caos):
  - escândalos;
  - conflitos internos;
  - lesões e doenças;
  - operação;
  - negócios.
- Catálogo novo:
  - escândalos: manipulação de resultado, espionagem, vazamento de projeto, fraude financeira, apostas ilegais, sabotagem, peça irregular, extremismo, tabloides;
  - conflitos: briga entre companheiros, piloto contra a equipe, engenheiro que vai para o rival, ordens de equipe, cansaço dos mecânicos;
  - operação: túnel parado, logística, incêndio, ataque hacker, lote defeituoso;
  - negócios: patrocinador que quebra, donos com problemas.
- Escândalos são descobertos semanas depois (ou acobertados e revelados anos mais tarde).
- Investigação e veredito: multa, perda de pontos, exclusão do Mundial de Construtores, suspensão de piloto, banimento de funcionário.
- Consequências em cadeia:
  - patrocinadores que rompem;
  - donos irritados, que podem pôr a equipe à venda;
  - chefe de equipe demitido;
  - outra equipe investigada.
- Quando o caso é com a sua equipe, você decide: cooperar com a FIA, defender a equipe ou afastar os envolvidos.
- Pessoas, equipes e empresas reais podem aparecer (opção ligada por padrão), sempre marcadas como ficção do jogo. O extremismo usa sempre personagens fictícios.
- Lesões e doenças: afastamento por GPs e reserva no carro, na F1 e nas outras categorias.
- Acidentes fatais: sempre ligados, raríssimos (cerca de 1 a cada 80–100 anos na F1 moderna; mais frequentes nas categorias de base e nos ovais). A segurança melhora com o tempo. São tratados com luto, homenagem e investigação.

**Pilotos**
- Nota mínima do titular da F1: 75 (antes 80, decisão do dono). Equipe da IA com titular abaixo do mínimo promove alguém acima dele na virada do ano; o jogador recebe um aviso.
- Revisão completa da IndyCar, que estava muito inflada:
  - antes: Kirkwood 86, Palou 84, mediana 80;
  - agora: faixa de 70 a 80, com notas e níveis curados para os 33 pilotos, ancorados nos ex-F1 do grid;
  - Palou 81, O'Ward 79, Kirkwood/Newgarden/McLaughlin 78; Ericsson, Rossi, Mick Schumacher e Armstrong 75; fundo do grid 69–71.

**Dados e imagens**
- Logos novos: Mobil 1, Bitpanda, MSC Cruises e Hugo Boss.
- Continuam sem logo confiável (a busca trouxe imagens erradas, descartadas): Hantec Markets, Castore, Allwyn, Formula Winter Series, F4 CEZ, FR Américas e ACO.
- Siglas oficiais dos pilotos no mapa da corrida.
- Extensão medida no traçado do OpenStreetMap na página do circuito, ao lado da oficial da FIA.
- Textos de cláusulas e contratos traduzidos para o inglês.

**Técnico**
- Módulos novos: `owners.js`, `silly.js`, `chaos.js`, `ui-owners.js`; dados em `app/data/team-candidates.js`; logos genéricos por `scripts/make-generic-logos.js`.
- O teste de consistência considera as punições de pontos (`season.penC`) e a exclusão do Mundial de Construtores.
- Saves antigos ganham donos, opções de eventos e empresários sob demanda (migração completa só depois da V1, ver `docs/PENDENCIAS-V1.md`).

## 0.8.3 — Talento, carros, academia, olheiros e patrocínio (07/11/2026)
Segunda etapa do plano de ultrarrealismo (plano em `docs/historico/PLANO-0.8.3.md`, relatório em `docs/historico/RELATORIO-0.8.3.md`).

**Nível do piloto (oculto) define o teto do potencial**
- Escala única do automobilismo:
  - níveis de F1: Geracional (até 96 no auge), Acima da média (90), Bom (88), Mediano (86), Medíocre (84);
  - abaixo da F1: Vencedor (82, ganha títulos nas categorias de acesso e profissionais), Pelotão (78, meio de grid) e Coadjuvante (74, fundo de grid, carreira curta).
- O nível não define a carreira: falta de vaga, carro ou sorte fazem um piloto bom ter carreira medíocre.
- Pilotos reais da F1 com nível definido pelo projeto:
  - geracionais: Verstappen, Antonelli, Hamilton e Alonso;
  - acima da média: Leclerc, Norris, Russell, Piastri, Câmara e Bearman;
  - bons: Sainz, Gasly, Albon, Hülkenberg, Hadjar, Bortoleto e Lindblad;
  - medianos: Bottas, Pérez e Lawson;
  - medíocres: Colapinto e Stroll.
- Os demais pilotos recebem o nível pela nota, pela idade e pelo desempenho real em 2026.
- Raridade:
  - geracionais vivos: 2 a 5;
  - na F1, de 1 a 6 pilotos com nota 90 ou mais (normalmente 2 a 4);
  - titular da F1 com nota mínima de 80.
- Corrigido o vazamento que inflava os talentos: a evolução passava do potencial, e o potencial "seguia" a nota.
- Perfil de cada piloto: pontos fortes e fracos reais (antes os 9 atributos eram quase iguais). Na F1, o duelo real com o companheiro (classificação × corrida) define o desequilíbrio.
- Idade:
  - crescimento rápido até os 23 anos;
  - auge entre 27 e 33;
  - queda a partir dos 34, com os reflexos (classificação, largada) caindo antes da experiência (pneus, consistência);
  - longevidade rara (Alonso, Hamilton).
- Universo estável em décadas: séries fora do jogo recebem pilotos novos e o kart não encolhe mais.

**Atualização de 08/11/2026 (mesma versão)**
- **Teto dinâmico até os 23 anos:**
  - os resultados contra a expectativa podem mover o teto em até ±3 (máximo absoluto de 96), passando do limite do nível;
  - subir é mais difícil que cair.
- **Equilíbrio calibrado com a F1 real 2000–2025** (`node scripts/audit.js real`), levemente abaixo da média real:
  - menos sorte por corrida;
  - mais mudança de forças entre temporadas;
  - regulamento novo pode premiar uma equipe de fora do topo que acerta o conceito;
  - o carro pesa mais que o piloto no tempo de volta.
- **Resultado:**
  - cerca de 3,7 equipes vencedoras por temporada (real 3,3) e 5,6 no pódio (real 5,8);
  - top 4 renovado em 0,73 equipe por ano (real 0,81);
  - em 50 anos, 7 equipes diferentes campeãs, incluindo Alpine, Audi e Haas.

**Carros sem equalização artificial**
- Saíram o puxão anual para uma média fixa, o piso de diferença entre carros e a compressão extra na troca de regulamento.
- O carro novo mantém a distância para a média do grid.
- Cada equipe tem capacidade técnica e uma **eficiência da organização** oculta, que muda devagar com resultados e crises. Por isso duas equipes que gastam o mesmo teto têm carros diferentes.
- A IA tem as mesmas dificuldades do jogador:
  - fila de projetos limitada pelas vagas;
  - prazo de entrega;
  - falha;
  - problema de correlação entre túnel e pista;
  - peça que ganha desempenho e perde confiabilidade.
- Menos sorte por fim de semana, e nem toda batida neutraliza a corrida.
- Ciclos de domínio de equipe, com troca de forças entre temporadas (calibração da atualização de 08/11).

**Academia (reformulada)**
- Contratar um júnior é uma negociação: salário de júnior, duração e multa, com contraproposta. As academias rivais também disputam os melhores.
- A academia paga o assento de cada piloto (F4 cerca de US$ 350 mil, regional US$ 900 mil, F3 US$ 1,2 milhão, F2 US$ 2,6 milhões).
- Acompanhamento de onde cada membro corre, posição no campeonato, nota e nível estimado.
- Plano para o ano seguinte: ficar, subir ou trocar de região (ex.: F4 Brasil → FRECA). O jogo cumpre na virada do ano, comprando a vaga se preciso.
- Contratos vencem e podem ser renovados; a IA também contrata juniores todo ano.

**Olheiros (reformulados no estilo FM / F1 Manager)**
- O departamento é formado por olheiros com nome, região de especialidade, qualidade de avaliação e salário, contratados num mercado próprio.
- Missões: observar um piloto, cobrir uma categoria ou procurar talentos numa região, com relatórios dos destaques.
- O jogador vê o **nível estimado** (com estrelas e margem de erro), nunca o real. Olheiro bom e da mesma região erra menos.

**Patrocínio**
- Cada marca tem segmento (energia, banco, tecnologia, cripto, bebidas...) e porte. Marca global de topo só fecha com equipe de reputação alta e paga mais.
- Exclusividade: uma marca por segmento em cada equipe, e uma marca que patrocina um rival não fecha com você.
- Valores dentro do mercado da equipe, perto dos reais: patrocinador principal da Mercedes cerca de US$ 80 milhões por ano, da Haas cerca de US$ 40 milhões.
- Cláusula de posição no Mundial e rompimento no meio do ano se a marca ficar muito insatisfeita.
- As equipes da IA ganham e perdem marcas conforme os resultados.
- Logos de marcas patrocinadoras (de 18 para 60, todos conferidos) e da Eurocup-4.

**Circuitos e licenças (item que tinha sumido da interface)**
- Nova tela no menu com todos os circuitos: grau da licença, validade, origem (lista oficial da FIA ou simulação do jogo) e o histórico das vistorias anuais, que promovem circuitos de Grau 2 ao Grau 1.

**Saves**
- Por decisão do projeto, as recalibrações desta fase valem para carreiras novas. Os saves antigos abrem e seguem, e a migração completa fica para depois da V1.0 (`docs/PENDENCIAS-V1.md`).

## 0.8.2 — Auditoria, integridade da database e economia (07/11/2026)
Primeira etapa do plano de ultrarrealismo (auditoria completa em `docs/historico/AUDITORIA-0.8.2.md`). Inclui a correção da 0.8.1.

**Pilotos: uma pessoa, um registro**
- Novo sistema de identidade (`persons.js`): cada piloto tem uma chave persistente (Wikidata ou nome canônico + ano de nascimento). Dois registros só viram um com nome compatível (apelidos e transliterações: Cam/Cameron, Nico/Nicolás, Maksimilian/Maximilian) **e** nada em conflito (Wikidata, nascimento, nacionalidade, idade possível, Jr./Sr.). Homônimos ficam separados.
- Corrigidas as 6 duplicatas encontradas, entre elas o Antonelli em dobro (Mercedes e um "Andrea Kimi Antonelli" na base, que podia ir para outra equipe), Varrone, Popov, Cam Waters, Austin Hill e Abdullah Kamel. As importações procuram a pessoa pelo mesmo índice antes de criar alguém. Relatório em `docs/DUPLICATAS.md`.
- Corrigido o gerador de ids, que guardava os ids da primeira carreira aberta e criava homônimos ao abrir outra carreira ou carregar um save. Pilotas geradas da F1 Academy ganham id coerente com o nome.

**Grid inicial verdadeiro (sem inventar)**
- A carreira de 2027 começa com o grid real de 2026 de cada categoria mais os anúncios para 2027. Antes, o jogo simulava uma virada de ano antes da primeira corrida: aposentava veteranos ativos (Will Power, Dixon, Hamlin, Logano, Buemi, Kubica, Cacá Bueno e outros 50) e inventava transferências (Ocon e Zhou na IndyCar, pilotos da NASCAR na Fórmula E, pilotos da F3 na NASCAR).
- Cada vaga tem origem visível na página da categoria: anunciado para 2027, grid de 2026 (a confirmar), projeção do jogo ou piloto fictício (só quando não há piloto real disponível).
- Vagas abertas são preenchidas primeiro com pilotos reais daquela série. Com isso, a F1 Academy volta a ter só pilotas reais (20 de 20: Palmowski, Gademan, Larsen...), no lugar de 5 fictícias.
- A F4 Alemã (encerrada em 2022 na vida real) deixa de usar o grid de 2022 (Antonelli, Câmara, Barnard): volta com pilotos reais de outras F4 ou gerados.
- Aposentadoria nas séries profissionais por disciplina: monoposto a partir dos 36, turismo, stock car e endurance a partir dos 42, sempre pesando o desempenho.

**Calendário**
- Calendário oficial da F1 2027 (anunciado em 16/09/2026): 24 etapas, abertura no Bahrein em 14/03, Portimão e Istambul de volta, sem Barcelona e Zandvoort, final em Abu Dhabi em 12/12, Las Vegas no sábado e as 10 sprints oficiais.
- F2, F3 e F1 Academy correm no mesmo fim de semana da F1; as outras séries mantêm o dia da semana real. Antes a F2 caía numa segunda-feira.
- Datas da Fórmula E corrigidas: o importador lia "May 2026" como "20 de maio". Também foi corrigido o nome colado "Meyer Shank Racingwith…".

**Economia (contenção da V0.8.2; a reformulação completa vem na 0.8.3)**
- Receitas reais por GP, iguais para o jogador e para a IA:
  - distribuição comercial pela posição no último Mundial, mais uma parcela fixa e o bônus histórico de Ferrari, Mercedes, Red Bull, McLaren e Williams;
  - patrocínio limitado pelo mercado da equipe (reputação e exposição): não dá para multiplicar o orçamento empilhando patrocinadores;
  - aporte anual dos donos.
- Custos que faltavam: fábrica e pessoal (dentro do teto, cresce com o porte da estrutura) e marketing. O prêmio por pontos a cada corrida (dupla contagem) foi retirado.
- O teto vale de verdade:
  - todo gasto elegível conta, e o espaço para projetos já desconta a fábrica até o fim do ano;
  - auditoria no fim da temporada para todas as equipes: estouro pequeno dá multa; estouro material dá multa e 10% a menos de túnel de vento e CFD.
- Orçamento esportivo separado do patrimônio: o caixa da equipe tem limite de reserva, e o excedente vai para os donos.
- Crise: equipe no vermelho corta estrutura, e os donos decidem se colocam dinheiro.
- Resultado medido (Williams, mesma semente):
  - antes: 109 → 714 mi em 2 anos sem investir, cerca de +10 mi por GP;
  - agora: cerca de +2 mi por GP sem investir, e perto do zero gastando o teto inteiro.
- Na IA, as grandes chegam ao teto e Haas e Williams gastam 110–130 mi. A diferença entre os carros se mantém em vez de sumir.

**Base de dados e imagens**
- Conferência com o DriverDB (`scripts/import_driverdb.py`): classificações de 2026 de 22 séries e o perfil de cada piloto. Preenche só o que falta (apelidos, nascimento, nacionalidade, foto); divergências com a Wikipedia/Wikidata ficam listadas, não trocadas. Relatório em `docs/VERIFICACAO-DATABASE.md`.
- Fotos novas de pilotos (recorte com o rosto no centro) e logos de instituições (FOM, IMSA, NASCAR) e fornecedores de pneus (Pirelli, Bridgestone, Firestone, Goodyear, Hankook, Michelin, Yokohama, Kumho).

**Finanças na interface**
- Novos painéis:
  - receita prevista por componente;
  - uso do mercado de patrocínio;
  - custos fixos;
  - patrimônio dos donos e auditorias do teto.
- "Espaço no teto" real nas telas de P&D.
- Os totais da temporada não dependem mais do extrato (que guarda só as últimas linhas).

**Ferramentas e saves**
- `scripts/audit.js`: auditoria da base (`db`) e simulações longas com relatório por temporada (`sim`, em `docs/RELATORIO-SIMULACAO.md`).
- Save v7, com migração que aplica tudo isto a carreiras em andamento:
  - unificação de duplicatas;
  - veteranos reativados se a carreira ainda está na primeira temporada;
  - calendário oficial (se o calendário não foi editado);
  - datas corrigidas;
  - economia.
- Testado com saves reais da 0.6, da 0.7.1 e da 0.8.0.

## 0.8.1 — correção
- Aceleração de hardware desligada no aplicativo: evita travamentos e problemas de vídeo em alguns computadores (o jogo é 2D e roda bem só com a CPU).

## 0.8.0 — Disciplinas, P&D por peça, calendário por dia, circuitos e mídia (07/11/2026)
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

**Ajustes finais da 0.8.0**
- Regulamento recalibrado (mais suave):
  - o regulamento novo aproxima os carros e mexe na ordem sem embaralhar tudo, e quem é forte costuma continuar perto do topo;
  - o acerto ou erro de conceito vale até ±3,5 pontos;
  - o piso de diferença entre os carros ficou menor.
- Retratos ilustrados para os 808 pilotos sem foto, no lugar das iniciais. Todos têm o mesmo estilo e cada um é diferente, com traços derivados da identidade do piloto: formato do rosto, tom de pele, cabelo, sobrancelhas, olhos, barba e óculos. Macacão e fundo vêm nas cores da equipe.
- As pilotas são identificadas pela Wikidata (60 da base) e por quem corre na F1 Academy.
- Logos de 38 das 42 competições (F1, F2, F3, F1 Academy, Fórmula E, IndyCar, WEC, IMSA, DTM, Stock Car, NASCAR, F4s e regionais) na tela de categorias e na carreira real dos pilotos. FR Américas, E4, F4 CEZ e Formula Winter Series não têm logo publicado e aparecem com a sigla.
- Logos de equipes buscados em três fontes: ficha da Wikipedia em inglês, Wikidata e Wikipedias em sete outros idiomas. São 79 equipes com logo real, revisado um a um, inclusive nas categorias (Penske, Hendrick, Joe Gibbs, Ganassi, Prema, ART, MP, Andretti, Toyota, AF Corse...). As equipes pequenas sem logo publicado mostram a sigla gerada do nome.
- Instalador: no CI, a instalação silenciosa ganha novas tentativas quando o Windows recém-criado trava a primeira execução (o mesmo pacote instala normalmente na tentativa seguinte e no Wine).
- Retratos recompactados (12 MB → 7 MB).

**Mídia, circuitos e regulamento (etapa final da 0.8)**
- Gerador automático de artes no formato vertical das redes, a partir dos acontecimentos do jogo:
  - "Breaking/Urgente" nos vazamentos, com o veículo de imprensa;
  - "Oficial" da equipe nas contratações;
  - "Resultado" com o pódio e as fotos;
  - "Campeão mundial".
  As artes aparecem na linha do tempo, na manchete das notícias e na nova aba "Artes". Cada uma traz foto do piloto, logo da equipe, logo do veículo quando disponível e a marca discreta "PitWall · simulação".
- Logos revisados um a um: 79 logos reais de equipes, patrocinadores, fabricantes, categorias, entidades e veículos de imprensa (BBC Sport, Marca, AS, Bild, Olé, auto motor und sport, FIA). Fotos que não eram logos foram descartadas. Sem logo, a arte usa o nome do veículo.
- Novo gerador de circuitos, montado trecho a trecho. As retas longas, as curvas rápidas, médias e lentas, os grampos, as chicanes e a escolha entre rua (cantos de 90°) e permanente mudam o formato. A volta fecha exatamente, e traçados que se cruzam ou encostam são descartados.
- Licenças:
  - todos os circuitos do calendário atual da F1 têm Grau 1, inclusive os que a lista oficial não traz (Albert Park, Lusail);
  - circuitos de Grau 2 passam por vistoria anual simulada e podem ser aprovados para o Grau 1;
  - 29 circuitos reais de Grau 2 entram como reserva (Brno, Laguna Seca, Road America, Sebring, Donington, Dijon, Misano, Motegi, Zolder e outros) com o traçado real do OpenStreetMap e a extensão conferida com a lista da FIA; quem não tem traçado real confiável não entra.
- Regulamento:
  - a cada regulamento novo, cada equipe acerta ou erra o conceito do carro, pela força técnica e um pouco de sorte, com notícias de quem acertou e quem errou;
  - um piso de diferença entre os carros impede que o grid fique todo junto com os anos;
  - em testes de 12 a 16 temporadas, seis equipes diferentes foram campeãs.

**Disciplinas e novas categorias**
- As categorias agora se dividem como na vida real em Monoposto, GT e Endurance.
- O perfil de cada piloto mostra a experiência e o rendimento em cada uma das três, com base na carreira real de 2022 a 2027 e no que ele corre no jogo.
- Sem experiência, o piloto rende menos até se adaptar: de Endurance para GT é fácil, de Monoposto para Endurance é médio, de Monoposto para GT é mais difícil e de GT para Monoposto é bem difícil. A adaptabilidade ajuda.
- Alguns pilotos não aceitam correr fora da própria disciplina. Max Verstappen e Fernando Alonso se adaptam na hora a qualquer uma.
- Seis categorias simuladas com grids, equipes, calendários e classificações reais, e um resumo na tela da categoria:
  - F4 Emirados (hoje F4 Oriente Médio, temporada 2025): série de início de ano;
  - F4 Alemã: o campeonato real terminou em 2022 e volta no jogo a partir da última temporada;
  - F1 Academy: só mulheres;
  - DTM;
  - Stock Car Pro Series;
  - NASCAR Cup Series, com o formato próprio: os 4 melhores antes da última etapa decidem o título nela.
- Vagas das categorias GT seguem a origem dos pilotos:
  - DTM: europeus e quem vem do endurance;
  - Stock Car: sul-americanos e quem não subiu na base do Brasil;
  - NASCAR: americanos (europeus raramente).
- A F4 Alemã e a F1 Academy alimentam a FRECA. As séries de base não simuladas continuam fornecendo pilotos.
- Tela de categorias organizada por disciplina.

**Notícias e eventos (Fase 6)**
- Linha do tempo no estilo das redes sociais: respostas de torcedores, contagem de comentários, reposts e curtidas (dá para curtir). Perfis de criadores de conteúdo (GlockDepre, Primeira Fila F1, Boteco F1, Ressaca F1, Rafael Lopes, Kevin Nicolas, EFFE, GP em Casa, Luca Morelli, Mariana Becker, Juliana Cerasolli, F1das_frase, Tiago Mendonça, Estagiário da F1) reagem a vitórias, títulos, contratações, abandonos e polêmicas da F1, sempre com o selo "simulação" e textos genéricos e respeitosos; nenhum @ é atribuído a eles.
- Anúncios em etapas: depois das conversas (rumores), sai um vazamento de jornalista e o anúncio oficial da equipe só chega de 1 a 3 etapas depois. Envolvendo a sua equipe, sai na hora.
- Notícias sem foto ganham arte gerada: transferência (de uma equipe para outra), técnica (prancheta com o carro), números do piloto ou ícone do assunto. A matéria traz um quadro "Em números" de quem é citado.
- Eventos raros por nível, sempre com personagens e organizações fictícias: raro (túnel de vento parado, atraso de logística), muito raro (escândalo) e extremo. O escândalo acontece numa etapa e é descoberto de 1 a 6 etapas depois, ou acobertado; a descoberta traz consequências em cadeia (multa, patrocinadores, reputação).
- Ciclo da vida: com frequência baixíssima, personagens fictícios idosos (funcionários e ex-pilotos gerados) podem morrer de causas naturais, com notícia, homenagens e a seção "Memória" na aba Histórias. Pessoas reais só entram se a opção for ligada em Salvar e opções (desligada por padrão).
- Diagnóstico ganhou o modo de depuração: forçar incidente raro, escândalo fictício, falecimento de personagem fictício e liberar anúncios pendentes, com o registro dos eventos e dos escândalos acobertados.
- Corrigido: pilotos que desistiam na virada do ano continuavam inscritos nas séries paralelas (E4, FR Oriente Médio).

**Circuitos (Fase 5)**
- Licenças de circuito a partir da lista oficial de circuitos licenciados pela FIA (atualizada em 04/11/2026; `scripts/import_fia_circuits.py`, `app/data/fia-circuits.js`): grau, validade, extensão e largura de referência.
- A F1 só corre com licença de Grau 1 válida na data da corrida. Depois da lista oficial, as renovações são simuladas pelo jogo (quase sempre renovam) e aparecem marcadas como simulação, nunca como decisão real da FIA. Na primeira temporada da carreira o calendário real é mantido.
- Circuitos reserva: etapa sem licença na virada da temporada dá lugar a um circuito com Grau 1 válido, de preferência da mesma região, com notícia e registro.
- Página do circuito mostra a licença, a fonte e se ela vale na data da corrida. O editor de calendário lista a licença de cada etapa e os circuitos reserva.
- Circuitos criados no gerador passam por uma checagem básica do jogo (extensão de 3,5 a 7 km, distância de corrida, curvas, reta de ultrapassagem, pit lane), sempre com o aviso de que não é homologação nem licença real.
- Conselho: regra nova vale a partir da temporada seguinte; mudança imediata só para segurança urgente (limites de pista e rigor dos comissários passaram para a temporada seguinte).

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
