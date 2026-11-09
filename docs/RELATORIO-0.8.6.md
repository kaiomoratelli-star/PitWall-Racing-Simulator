# Relatório da 0.8.6 — Expansão esportiva e administrativa

Data: 09/11/2026. **Publicada** com a autorização do dono do jogo (09/11/2026).

## 1. O que entrou

| Parte | Conteúdo | Onde está no código |
|---|---|---|
| Superlicença | 40 pontos em 3 anos (25 para a de treino livre), pontos por TL1, pontos de punição (12 em 12 meses = suspensão), cota de 2 TL1 com novato por carro, multa no fim do ano | `sl.js`, painel no treino e cartão na página do piloto (`ui86.js`) |
| Comissários | Infrações novas (pit lane, liberação insegura, largada queimada), direito de revisão em 96 h, vistoria técnica com desclassificação e apelação, recálculo da classificação, tela "Comissários e casos" | `engine.js` (`Engine.penalize`), `sl.js` (`SL.reclassify`, `SL.applyReview`, `SL.applyAppeal`) |
| Danos por peça | Asa, assoalho, suspensão, freios e câmbio, com perda por volta, quebra, troca de bico no box e conta de reparo no teto | `engine.js` (`Engine.hurt`), `parts.js` (`Parts.bill`) |
| Motor por componente | ICE, TC, MGU-K, ES, CE, EX e câmbio, com desgaste, cota e punição de grid (10 / 5 / fim do grid) | `parts.js` (substitui `Regs.puTick`), painel na tela do Carro |
| Testes e congelamentos | Pré-temporada com foco escolhido, teste de meio de ano, congelamento de motor e de chassi pelo Conselho | `parts.js` (`Testing`, `Parts.freezeBlock`), `council.js`, `regs.js` |
| Ordens de equipe | Obedecer ou recusar (personalidade, campeonato, moral, confiança, química), rádio variado, carta com escolhas, redes sociais, política "piloto nº 1" | `engine.js` (`Engine.obeyP`), `orders.js` |
| Pessoas | Moral com causas, química entre companheiros, confiança no chefe, promessas, funcionários com moral, pedidos e conflitos, demissão do diretor técnico | `people.js` |
| Conversas | Tela Equipe → Conversas: 12 assuntos, 5 perfis de piloto, falas sorteadas sem repetir, promessas | `talks.js`, `ui86.js` |
| Limpeza | ~680 linhas sem uso removidas, funções esquecidas reaproveitadas | ver `docs/historico/AUDITORIA-0.8.6.md` |
| Inglês | Catálogo antigo de eventos (111 textos), cargos dos funcionários e tela de funcionários traduzidos | `i18n-en.js` |

## 1b. Fechamento (itens do plano que faltavam)
- **Direção de prova:**
  - incidente "sob investigação" com decisão depois;
  - escala completa: advertência, 5 s, 10 s, drive-through, stop-and-go e grid da próxima corrida;
  - infrações novas: vantagem fora da pista e bandeira azul;
  - caso reaberto pelos próprios comissários (regra de 2026).
- **Ordem "Proteger o companheiro"** no rádio.
- **Previsão de estouro da cota** de cada elemento do motor.
- **Reserva com superlicença** ao assumir o carro, nunca o mesmo piloto nos dois carros.
- **Calendário** com as etapas de novato no TL1.
- **Pedidos do dono na reta final:**
  - vida do pneu e das peças;
  - indicação de pilotos e identidade nova para a equipe irmã;
  - parceria técnica do jogador;
  - volta do que tinha sumido entre versões (lista no CHANGELOG).

## 2. Medições

**20 temporadas seguidas no modo Observador (2027–2046):**
- nenhum erro;
- 88 s no total;
- campeões variados: 12 pilotos diferentes;
- pontos distribuídos estáveis (2.720 a 2.943 por ano);
- save final com 5 MB.

| Item (por temporada) | Jogo | Referência F1 2022–2025 |
|---|---|---|
| Abandonos | 31 a 57 | cerca de 40 a 60 |
| Punições de tempo na corrida | 30 a 36 (depois do ajuste de limites de pista) | cerca de 40 |
| Desclassificações técnicas | 0 a 5 (média 1,3) | 1 a 3 (ex.: Austin 2023, Hamilton e Leclerc) |
| Pilotos com punição de motor | 4 a 7 | cerca de 5 a 10 |
| Pontos de punição somados | 20 a 90 | cerca de 50 a 80 |
| Suspensões por pontos | 2 em 8 anos | 1 recente (Magnussen, 2024) |
| Abandonos por peça danificada | 0 a 7 | — |
| Ordens de equipe recusadas | cerca de 1 em 3 | casos raros e famosos |

**Ordens e pessoas (3 temporadas por equipe, decisões sorteadas):**
- 2 a 6 pedidos de funcionários por ano;
- 1 a 2 conflitos entre chefes de área numa equipe de meio de grid;
- uma demissão de diretor técnico em 3 anos;
- química do grid entre −49 e +70.

## 3. Ajustes feitos durante a medição

- **Motor:** a primeira calibração punia todos os 22 pilotos (cerca de 70 punições por ano). A vida das peças subiu 30% e a IA só troca peça com 97% de desgaste. Resultado: 4 a 7 pilotos punidos por ano.
- **Assoalho:** os danos nas zebras aconteciam cerca de 1,5 vez por corrida; agora são cerca de 0,6.
- **Limites de pista:** a punição quase nunca saía (0 ou 1 por ano). A taxa passou a depender da pista; as de muita área asfaltada (Áustria, Catar, Bahrein, Abu Dhabi, Austin) geram cerca de três vezes mais exclusões.
- **Funcionários:** a moral grudava em 100 numa equipe vencedora. Agora volta mais forte para o centro e começa variada.
- **Conversas:**
  - o assunto "promessa em aberto" aparecia demais;
  - o assunto da última conversa agora tem peso menor;
  - a fala da promessa não repete a da concordância.
- **Interface:** a faixa de forma usava a mesma classe CSS do pódio, o que esticava o "3". A classe foi renomeada.

## 4. Testes

**Teste de funcionalidade novo** (`node scripts/playthrough-check.js 2 <equipe>`): joga 2 temporadas inteiras pela interface. Os números abaixo são de uma execução:

| O que faz | Quantidade |
|---|---|
| Etapas | 47 |
| Telas abertas | 656 |
| Conversas | 94 |
| Cartas decididas | 52 |
| Ordens de rádio | 94 |
| Trocas de peça do motor | 12 |
| Ciclo salvar/carregar | 1 |

A cada etapa, o teste confere:
- dois titulares por equipe, sem carro repetido;
- pontos por etapa iguais ao total;
- dinheiro e carro sem valores inválidos;
- posições sem buraco;
- nenhum erro na interface.

O save de uma carreira de 2 temporadas tem cerca de 3 MB: passa do limite do navegador (5 MB em UTF-16), mas no aplicativo vai para o disco.


| Teste | Resultado |
|---|---|
| `node scripts/ui85-check.js 6` | 6 configurações (tema, idioma, menu, equipe, largura), 50 telas, 14/14 checagens, sem problemas |
| `npm test` (inclui `cats-check`) | OK |
| `node scripts/ui-stress.js` | OK, sem erros, cerca de 0,5 s por fim de semana |
| Clique em todos os botões (`fuzz.js`) | cerca de 1.840 cliques; só os 11 avisos conhecidos do SVG do P&D, que são artefato do teste |
| Telas novas em inglês | sem texto em português |
| Notícias geradas em inglês | os últimos modelos em português (vitória de recuperação, Fórmula E, "promete atualização", nota da Gucci, textos com " · ") ganharam tradução |

## 5. Pendente

- **Saves:** a migração de saves antigos fica para depois da V1, como combinado. As carreiras da 0.8.5 abrem, mas os sistemas novos começam do zero (moral sem histórico, componentes novos).
- **Publicação:** o número da versão (`package.json` = `0.8.6`) e o lançamento no instalador só serão feitos com autorização.
