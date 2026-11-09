# Plano da 0.9 — Modo Carreira de Piloto

Data: 09/11/2026. Pedido do dono: "modo carreira de piloto, totalmente imersivo e o mais completo,
utilizando vários recursos do modo manager mas totalmente novo, saindo do kart; o piloto pode não
chegar na F1 e virar rei em outras categorias, ou ser rei da F1, ou um piloto mediano; cada carreira
diferente da outra e com uma imersão extremamente aguçada."

O dono já tinha um rascunho desta visão na época da 0.8.0 (`docs/historico/ROADMAP-0.9-rascunho-0.8.0.md`);
este plano o absorve e o atualiza para o que o jogo virou até a 0.8.7 (boa parte das lacunas de lá — ordens,
comissários, danos, componentes do motor, química, tutorial — já foi entregue).

## 1. Visão

Você é uma pessoa, não uma equipe. Começa no kart (14 a 17 anos), num dos quatro campeonatos regionais
que já existem no jogo (Europa, Américas, Brasil, Ásia-Pacífico). Tudo acontece em primeira pessoa:
as mensagens são para você, o rádio é o seu, a imprensa pergunta a você, o contrato é o seu.
O universo é o mesmo do modo Manager — as 23 categorias, a F1, o mercado, as academias, a
superlicença, os comissários — mas visto de dentro do capacete.

**Fins possíveis (nenhum é roteiro):** rei da F1 · campeão que a F1 ignorou (rei da IndyCar, da FE,
do WEC, da Stock Car, da NASCAR, do DTM, da Super Formula) · eterno mediano da F1 · talento queimado
que caiu cedo · retorno tardio por outra disciplina. A carreira termina onde os resultados, as
escolhas e as circunstâncias levarem.

**Cada carreira diferente:** teto de talento oculto sorteado por carreira (como os pilotos da IA já
têm); perfil de pontos fortes sorteado; origem da família (orçamento) escolhida; mercados e academias
reagem aos SEUS resultados; eventos de carreira raros (lesão, perder o patrocinador, prova da vida,
convite inesperado); e o universo inteiro já é vivo (equipes mudam, pilotos aposentam, regras mudam).

## 2. O que o jogo já tem e será reaproveitado

| Recurso | Onde | Uso no modo piloto |
|---|---|---|
| Kart com 4 campeonatos e gerações | `core/season/kart.js` | Onde a carreira começa |
| 23 categorias simuladas por data, com equipes, inscritos e calendário | `core/season/cats.js` | A escada e as carreiras alternativas |
| Motor de corrida completo (treino, classificação, corrida volta a volta, rádio, danos, comissários) | `core/race/` | Fim de semana jogável na SUA categoria |
| 68 pistas com física + gerador de circuitos | `db.tracks`, `circuitgen.js` | 83% das etapas das categorias têm pista real; o resto é gerado |
| Superlicença, pontos, TL1 | `core/race/sl.js` | Seus pontos, seu caminho à F1 |
| Academias, olheiros, potencial oculto | `core/people/` | Quem observa VOCÊ |
| Mercado, contratos, empresários | `core/people/market*.js` | Suas vagas e seus contratos |
| Moral, química, confiança, conversas | `core/people/people.js`, `talks.js` | Suas relações (invertidas: você é o piloto) |
| Imprensa, redes, rivalidades | `core/world/media.js` | Falando de você |

## 3. Fases

### 0.9-A — Fundação (modo 'driver' no núcleo)
- Criação do piloto: nome, nacionalidade, idade inicial (14 a 17), número, estilo de pilotagem,
  origem da família (humilde / classe média / rica — muda o orçamento, nunca o talento). Começa
  no campeonato de kart da sua região; com 15+ anos e orçamento, pode começar comprando uma vaga
  de F4 (fase C liga isso ao mercado de verdade; na A, kart).
- Talento: teto oculto sorteado por carreira (`Cats.rollPotential`), **invisível até para o
  jogador** — você descobre o próprio limite correndo, em testes e nas opiniões dos olheiros.
- `G.mode = 'driver'`; `G.dcareer` guarda o estado da carreira (etapa, campeonato, temporada do
  kart com etapas datadas, histórico, reputação, dinheiro da família, forma).
- O kart do jogador ganha etapas de verdade (8 rodadas por ano, em kartódromos reais da região),
  não só a classificação anual resumida dos pilotos da IA.
- Avanço por data: "Avançar" anda os dias até a sua próxima etapa; o mundo anda junto
  (F1 roda sozinha, categorias pela data, mercado, notícias).
- Central do piloto (tela própria), classificação do seu campeonato, cartas em primeira pessoa.
- Esquema do save, testes (`driver-check`), guard e CI.

### 0.9-B — Fim de semana jogável (ponte Cats→Engine, cockpit)
- As etapas da SUA categoria rodam no motor real: treino curto, classificação e corrida ao vivo.
- Física por categoria: escala de tempo de volta por tier, pneus reduzidos, sem DRS/ERS nas
  categorias de base, carros iguais com a força da equipe (spec), corridas mais curtas.
- Pistas: as reais do banco; as que faltam (ex.: Stock Car) geradas por semente do nome.
- Cockpit: você controla SÓ o seu carro — modos de pneu/energia, risco (ataque/defesa/zebras),
  pedido de parada, responder ao engenheiro e às ordens de equipe (obedecer ou não — com consequência).
- Acerto pelo lado do piloto: o engenheiro propõe, você devolve o que sente no carro.
- O resultado volta para o campeonato do Cats: a mesma tabela que o modo Manager vê.
- Kart jogável em formato próprio (tomada, bateria e final).

### 0.9-C — A escada
- Convites e avaliações: academias de F1 observando você, testes coletivos, dias de filmagem.
- Vagas: ofertas reais por temporada; nas categorias de base, muitas vagas exigem ORÇAMENTO
  (pay-driver, como na vida) — a origem da família e o patrocinador pessoal pesam.
- Empresário: contratar ou não, comissão, acesso a vagas melhores.
- Superlicença de verdade: seus pontos por campeonato, TL1 quando uma equipe de F1 te chamar.
- Decisões de carreira com dilema real: subir cedo com vaga ruim × ficar e ganhar o título;
  academia (salário e caminho, mas dona do seu passe) × independência.
- Carreiras alternativas completas: IndyCar, FE, WEC, NASCAR, Stock Car, DTM, SF com temporadas
  jogáveis, títulos e status de rei. Campeonatos de inverno em paralelo (FRME, F4 UAE).

### 0.9-D — Imersão (a vida entre as etapas)
- Agenda semanal: treino físico, simulador, mídia, patrocinador pessoal, descanso — forma e fadiga.
- Relações em primeira pessoa: chefe, engenheiro, companheiro (conversas invertidas do Talks).
- Rivalidades pessoais que nascem na pista e viram história (sistema de rivalidades já existe).
- Imprensa e redes SOBRE você; entrevistas com escolhas que mexem com moral, chefe e torcida.
- Lesões, dinheiro pessoal (salário, prêmios, custos), popularidade por país.

### 0.9-E — Variedade e legado
- Eventos de carreira raros e marcantes (sorteados por carreira): o ano da lesão, o convite da
  madrugada, o patrocinador que quebrou, a chuva da consagração.
- Estatísticas e recordes pessoais por categoria; comparação com lendas reais (DriverDB).
- Aposentadoria no seu tempo; resumo de legado ("Rei da Fórmula E", "o maior da Stock Car",
  "174 GPs, 0 vitórias, eterno herói de um pódio em Mônaco").
- Pós-carreira: aposentar e seguir a MESMA carreira como chefe de equipe (ponte com o modo Manager),
  como no rascunho original do dono.

### 0.9-T — Bateria final
- Carreiras completas simuladas (kart→aposentadoria) em vários universos; medir a VARIEDADE de
  destinos por semente (quantos chegam à F1, quantos viram reis fora, distribuição de carreiras).
- Testes de interface com o modo novo, saves, determinismo com configuração 'driver', relatório.

## 4. Regras de engenharia (as mesmas da 0.8.7)
- Tudo por ganchos com nome; campo novo de `G` registrado no `Schema`; byLang em todo texto novo;
  tela nova não sorteia ao desenhar; teste por regra para cada mecânica nova; o modo Manager não
  pode mudar em nada (determinismo das configs atuais intocado).
- O piloto do jogador é um piloto normal de `db.drivers` (com `player: true`): todo o universo o
  enxerga de graça (olheiros, mercado, mídia). Os fluxos automáticos (Kart.renew, Cats.progression,
  mercado) nunca decidem POR ele.
