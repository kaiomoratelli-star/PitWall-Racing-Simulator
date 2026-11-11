# Roadmap v0.9 — PitWall Racing Simulator

Objetivo da 0.9: sair de "o gerenciador de F1 mais detalhado" para **o jogo de automobilismo de gestão mais completo do mercado**. Três pilares:

1. **Dois jeitos de jogar a mesma carreira**: como **chefe de equipe** (já existe) e como **piloto** (novo), no mesmo universo.
2. **Mais do que a F1 jogável**: gerir equipes em outras categorias e subir com elas.
3. **Profundidade de fim de semana e de pessoas** no nível dos melhores do gênero, sem perder o que já nos diferencia: universo vivo, dados reais, Conselho, disciplinas, calendário por dia.

---

## 1. Diagnóstico da 0.8.0

### O que já temos e nos coloca à frente
| Área | Situação na 0.8 |
|---|---|
| Universo | 23 categorias simuladas ao mesmo tempo, kart na base, 1.400 pilotos reais 2022–2027, disciplinas Monoposto/GT/Endurance |
| Dados reais | Grid 2026/2027, contratos, academias, circuitos licenciados (lista da FIA), 29 traçados reais de Grau 2, história da F1 desde 1950 |
| Fim de semana | Treinos com acerto e memória do piloto, classificação ao vivo, corrida volta a volta com pneus/ERS separados, Safety Car, Sprint |
| P&D | Projeto por peça, túnel de vento e CFD com cota de ATR, pesquisa do carro novo, fabricação por carro |
| Mundo vivo | Mercado em ondas, cláusulas, olheiros e potencial oculto, Conselho da FIA, regulamentos que mexem no grid, notícias, rede social, artes automáticas |
| Tempo | Calendário por dia com notificações que travam o avanço |

### Onde ainda estamos atrás (lacunas)
| Lacuna | Impacto |
|---|---|
| **Não existe carreira de piloto** | Metade do público do gênero quer viver a carreira do piloto |
| Só a F1 é jogável como equipe | As outras 22 categorias são "assistidas", não jogadas |
| Corrida sem comandos de rádio, ordens de equipe completas, punições com análise e danos detalhados | Fim de semana menos interativo que os concorrentes |
| Sem limite de componentes da unidade de potência (punição de grid) | Falta uma decisão estratégica clássica da F1 |
| Instalações sem obra (sem tempo de construção) e sem moral de departamento | Gestão da equipe mais rasa que a do P&D |
| Sem coletivas de imprensa nem química entre pilotos | Pessoas menos vivas que o mundo |
| Começo fixo em 2027, sem modo histórico nem cenários | Menos rejogabilidade |
| Sem tutorial, sem multijogador entre amigos, sem atualização automática | Barreira de entrada e de distribuição |

---

## 2. Fases da 0.9

Esforço: **P** (até 1 semana), **M** (1–2 semanas), **G** (3+ semanas). Cada fase só fecha com os critérios de aceite cumpridos, testes automáticos (`npm test`, `test:ui`, smoke do Electron) e save compatível (migração v6 → v7).

### Fase 0 — Pendências da 0.8 (P)
- Apagar as releases antigas `v1.0.0` e `v1.0.1` (instaladores 0.4 e 0.5), que confundem quem procura a versão mais nova.
- Logos: revisar as ~113 equipes ainda com sigla (sites oficiais e redes, com aprovação manual) e as 4 competições sem logo.
- Gênero: completar as consultas da Wikidata que expiraram.
- Circuitos: tentar de novo os traçados que o OpenStreetMap não fechou (Brands Hatch, Jarama, Le Mans, Coreia, Zhuzhou, Long Beach, Assen, Vallelunga...).
- Atualização automática do jogo (avisar e baixar a nova versão) e, se possível, instalador assinado para o Windows não alertar.
- Save compacto: guardar o histórico antigo de forma resumida (hoje o save chega a 4,7 MB depois de 30 temporadas).

**Aceite:** nenhuma release confusa no GitHub; save de 30 temporadas abaixo de 3 MB; atualização detectada a partir de uma release de teste.

### Fase 1 — Carreira de piloto (G) — prioridade máxima
O jogador vive a carreira de um piloto, do kart até o topo da disciplina que escolher, no mesmo universo do modo chefe de equipe.

**Criação e início**
- Nome, nacionalidade, idade inicial de 14 a 17 anos e estilo de pilotagem.
- Começa no kart regional ou com um orçamento para comprar uma vaga na F4.
- Atributos iniciais modestos e potencial **oculto também para o próprio jogador**: ele só descobre com resultados, testes e opiniões de olheiros.

**Evolução entre as corridas (calendário por dia)**
- Agenda semanal com pontos de tempo: preparo físico, simulador, estudo de dados, mídia e descanso.
- Cada escolha evolui atributos específicos (por exemplo, simulador melhora acerto e classificação, preparo físico melhora consistência).
- Excesso de compromissos causa cansaço e queda de forma.
- Testes de jovens pilotos e convites de academias, ligados ao sistema de olheiros que já existe.

**Fim de semana como piloto**
- Treinos: feedback ao engenheiro, que alimenta o acerto (o sistema de memória do piloto vira a fala do jogador).
- Classificação: escolher o momento de sair, o ritmo da volta e o risco de erro.
- Corrida com comandos do piloto:
  - ritmo e modos de pneu e energia;
  - atacar ou defender numa disputa;
  - pedir pit stop e trocar estratégia com o engenheiro;
  - responder ao rádio, inclusive obedecer ou ignorar ordens de equipe, com consequências na confiança da equipe.
- Lesões em acidentes graves e recuperação.

**Carreira fora da pista**
- Empresário: contratar, demitir e definir a comissão. Ele traz propostas e negocia por você.
- Contratos como piloto: salário, duração, papel (primeiro ou segundo piloto), cláusulas e patrocínio pessoal que você leva para a equipe.
- Superlicença, academias, mudança de disciplina (monoposto, GT, endurance, com a adaptação que já existe) e categorias dos EUA.
- Reputação com equipes, imprensa e torcida; rivalidades com outros pilotos; companheiro de equipe como referência.
- Fim de carreira: aposentadoria e, se quiser, a mesma carreira continua como chefe de equipe.

**Aceite**
- Uma carreira de piloto vai do kart à F1 em teste automático de 15 temporadas, com o jogador decidindo pelo caminho padrão.
- Mudanças de equipe, de disciplina e aposentadoria funcionam.
- O modo chefe de equipe não muda de comportamento.
- A carreira funciona em português e em inglês.

### Fase 2 — Outras categorias jogáveis como equipe (G)
- Escolher gerir uma equipe de F2, F3, Fórmula E, IndyCar ou WEC já no início da carreira.
- Motor de corrida por categoria:
  - **IndyCar**: ovais (bandeiras amarelas frequentes, vácuo e economia de combustível) e mistos;
  - **Fórmula E**: gestão de energia e modo de ataque;
  - **WEC**: tripulação com troca de pilotos, tempo máximo ao volante e várias horas resumidas em trechos;
  - **F2/F3**: Sprint com grid invertido e pneus de uma marca.
- Progressão: propostas para subir de categoria e, na F2, ser procurado por equipes de F1.

**Aceite:** uma temporada completa jogável em cada uma das 5 categorias, com testes de estresse da interface próprios.

### Fase 3 — Fim de semana e corrida mais interativos (M)
- Ordens de equipe completas: trocar posições, segurar o rival e liberar a disputa, com reação dos pilotos.
- Comissários: investigação de incidentes, punições de tempo, grid e drive-through, com uma "análise do lance" na tela.
- Danos por peça (asa, assoalho, suspensão), conserto no pit e custo depois.
- Limite de componentes da unidade de potência por temporada, com troca planejada e punição de grid.
- Parque fechado entre classificação e corrida, volta de apresentação, largada com reação do piloto e radar de chuva com previsão por setor.
- Rádio do piloto pedindo pit, reclamando de pneu ou avisando de problema.
- Destaques da corrida (melhores momentos) e grafismos no estilo de transmissão.

**Aceite:** 100 corridas seguidas sem erro no teste de estresse; cada sistema novo aparece pelo menos uma vez em 20 corridas simuladas.

### Fase 4 — Gestão da equipe mais profunda (M)
- Instalações com obra: tempo de construção, custo, manutenção e período em que a área fica parada.
- Departamentos (aerodinâmica, engenharia, fábrica, operações) com moral e carga de trabalho. Excesso de projetos derruba a qualidade.
- Teto orçamentário com auditoria no fim do ano: estourar gera multa e corte de túnel de vento (como na vida real).
- Patrocinadores com objetivos e negociação de renovação; fãs e licenciamento como fonte de receita.
- Fornecedor de motor: negociar, trocar e virar equipe de fábrica, com efeito no Conselho.
- Diretoria com metas de vários anos (projeto de 3 temporadas) e confiança que reage a elas.

### Fase 5 — Pessoas e mídia (M)
- Coletivas e entrevistas pós-corrida com escolhas, que afetam a moral, a reputação e a relação com jornalistas.
- Química entre companheiros de equipe, mentoria de jovens e tensão quando um é favorecido.
- Personalidade do chefe de equipe (jogador): estilo de gestão que pesa em contratações e na diretoria.
- Gerador de artes ampliado:
  - anúncio de calendário;
  - grid de largada;
  - resultado de classificação;
  - aniversário de piloto;
  - recordes;
  - "contagem regressiva" para o GP.
- Linha do tempo com conversas mais longas e perfis respondendo uns aos outros (sempre marcados como simulação).

### Fase 6 — Modos e rejogabilidade (M/G)
- **Modo histórico**: começar em qualquer temporada de 1950 a 2026, com grid, carros e calendário reais da época (base f1db já está no jogo) e o universo seguindo dali.
- **Cenários e desafios**: salvar uma equipe falida, levar uma novata ao pódio, campeão com o pior carro, carreira de piloto começando aos 25 anos.
- **Conquistas** com registro na conta.
- **Entre amigos**:
  - multijogador no mesmo computador (cada um com uma equipe, turnos por fim de semana);
  - liga assíncrona por arquivo de save compartilhado, com verificação de integridade.
- **Editor e mods**: pacotes de dados importáveis (equipes, pilotos, circuitos, regulamentos) e um formato estável e documentado.

### Fase 7 — Qualidade, acesso e lançamento da 0.9 (M)
- Tutorial interativo nas primeiras horas, nos dois modos (equipe e piloto), e dicas contextuais desligáveis.
- Acessibilidade: tamanho de fonte, modo para daltônicos, navegação por teclado completa.
- Idiomas: espanhol e italiano (o sistema de tradução já permite).
- Desempenho: 50 temporadas em menos de 4 minutos no teste longo e telas pesadas abrindo em menos de 300 ms.
- Testes:
  - carreira de piloto longa;
  - 5 categorias jogáveis;
  - multijogador local;
  - migração de saves da 0.7 e da 0.8.

---

## 3. Ordem sugerida

| Etapa | Conteúdo | Por quê |
|---|---|---|
| 1 | Fase 0 | Limpa a casa e destrava a distribuição (atualização automática) |
| 2 | Fase 1 — Carreira de piloto | Maior ganho de público e o pedido principal |
| 3 | Fase 3 — Fim de semana | Reaproveitada pela carreira de piloto (rádio, ordens, comissários) |
| 4 | Fase 2 — Categorias jogáveis | Depende do motor de corrida da Fase 3 ser genérico |
| 5 | Fases 4 e 5 — Equipe, pessoas e mídia | Profundidade de gestão |
| 6 | Fase 6 — Modos | Rejogabilidade e diversão entre amigos |
| 7 | Fase 7 — Qualidade e lançamento | Fecha a 0.9 |

Releases intermediárias (0.8.1, 0.8.2...) podem sair ao fim de cada etapa, como na 0.8.

---

## 4. Riscos e decisões em aberto

- **Escopo da carreira de piloto**: a corrida do piloto continua sendo por decisões (sem pilotar em tempo real com volante e teclado). Isso mantém o jogo no gênero de gestão e reaproveita o motor atual. Confirmar.
- **Ovais e endurance** exigem um motor de corrida mais genérico; se a Fase 3 atrasar, a Fase 2 começa só com F2 e F3.
- **Dados reais**: a 0.9 continua sendo para você e seus amigos. A versão paga precisa de outra base (sem DriverDB, sem logos e fotos sem licença); o modo de mods da Fase 6 é o caminho para isso.
- **Multijogador online** fica fora da 0.9 (só local e por arquivo); pode entrar na 1.0.
- **Tamanho do instalador**: ~100 MB. Novas imagens devem entrar com compressão e o CI continua testando a instalação.

## 5. Como medir

- Uma carreira de piloto e uma carreira de equipe completam 20 temporadas sem erro e sem travamento.
- Cada uma das 5 categorias jogáveis tem uma temporada completa nos testes de interface.
- O tempo para um jogador novo disputar o primeiro GP fica abaixo de 10 minutos, com o tutorial.
- Os saves de 0.7 e 0.8 abrem na 0.9 sem perder nada.
