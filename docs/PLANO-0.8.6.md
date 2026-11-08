# Plano da 0.8.6: pessoas, regras e pendências da 0.8.5

Data: 08/11/2026. Situação: **aguarda aprovação do dono do jogo.**

## 1. Novo roadmap até a 1.0

| Versão | Tema | Situação |
|---|---|---|
| 0.8.5 | Nova interface, clima e combustível na corrida, notícias com fotos, animações | Publicada em 08/11/2026 |
| **0.8.6** | **Expansão esportiva e administrativa + pendências da 0.8.5** (era a antiga 0.9) | **Este documento** |
| 0.9 | **Somente a Carreira de Piloto** | Depois da 0.8.6 |
| 1.0 | Categorias e equipes jogáveis (F2, F3 e outras), Sandbox, modos especiais e preparação para o lançamento | Depois da 0.9 |

A preparação para o lançamento da 1.0 inclui:
- migração final dos saves e a opção "Recalibrar pilotos e equipes" (`docs/PENDENCIAS-V1.md`);
- licença ou troca de fotos, logos e marcas;
- atualização automática e assinatura digital.

**Mudanças em relação ao roadmap anterior:**
- A antiga 0.9 virou a 0.8.6.
- As categorias jogáveis saíram dela e foram para a 1.0.
- A 0.9 passa a ter um único tema: a Carreira de Piloto.

## 2. Ponto de partida

O que já existe e será ampliado, para não refazer o que funciona:

| Sistema | Hoje | Na 0.8.6 |
|---|---|---|
| Moral do piloto | Existe, muda com resultados, contratos e eventos | Passa a ter causas visíveis e efeito medido na pista |
| Química entre companheiros | Não existe | Novo |
| Relação piloto–chefe | Não existe (só a confiança da diretoria no chefe) | Novo |
| Funcionários | 15 funções, contratos, assédio de rivais | Moral, pedidos e conflitos |
| Punições | Limites de pista, punições de tempo, 5ª unidade de potência com punição no grid | Comissários com investigação, pontos na superlicença e suspensão |
| Danos | Asa e perda de potência | Danos por peça, com reparo no box e custo |
| Ordens de equipe | "Deixar o companheiro passar" e "manter posições" pelo rádio (0.8.5) | Ordens completas, com reação do piloto |
| Componentes do motor | Contagem única de unidades de potência | Componentes separados, com desgaste e cota por temporada |
| Testes | Horas de túnel de vento e CFD por posição no campeonato | Dias de teste e limite por componente |
| Congelamento no Conselho | Proposta existe | Passa a congelar de fato o desenvolvimento |

## 3. Escopo

### 0.8.6-A: Pessoas
1. **Moral com causas.** Cada piloto mostra os três motivos principais do humor (resultado contra o companheiro, promessa cumprida ou quebrada, contrato, imprensa, ordens de equipe). O efeito é pequeno e medido: moral alta dá mais consistência e menos erro, moral baixa o contrário, sem decidir corridas sozinha.
2. **Química entre companheiros.** De −100 a +100. Sobe com convivência e ordens justas; cai com batidas entre os dois, ordens a favor de um só e disputas pelo posto de número 1.
   - Química alta: troca de dados entre os carros (acerto mais rápido no treino).
   - Química baixa: risco de briga na pista, de ignorar ordens e de vazamentos para a imprensa.
3. **Relação piloto–chefe.** Confiança de 0 a 100, alimentada por:
   - conversas: elogiar, cobrar, prometer prioridade, prometer carro melhor;
   - promessas cumpridas ou quebradas;
   - decisões de estratégia (o piloto lembra quem foi sacrificado).

   A relação pesa na renovação, no pedido de saída e na aceitação de ordens. Tela nova: conversas com o piloto, no estilo do Football Manager.
4. **Funcionários vivos.**
   - Moral e satisfação por cargo.
   - Pedidos de aumento, de mais verba para o departamento e de mudança de cargo.
   - Conflitos entre chefes de departamento, com efeito na eficiência de P&D.
   - O diretor técnico pode pedir demissão depois de uma temporada ruim.

### 0.8.6-B: Corrida e regras
1. **Comissários.**
   - Incidentes "sob investigação" durante a corrida, com decisão alguns minutos depois ou após a bandeirada.
   - Punições por gravidade: advertência, 5 s, 10 s, drive-through, stop-and-go e posições no grid da próxima corrida.
   - **Pontos na superlicença:** 12 pontos em 12 meses suspendem o piloto por uma corrida, e o reserva entra.
   - Recurso: a equipe pode recorrer de punições pós-corrida, com custo e chance de reversão.
   - Tela de decisões da direção de prova.
2. **Danos por peça.**
   - Peças: asa dianteira, assoalho, suspensão, freios e câmbio.
   - Cada dano tem perda de tempo por volta e risco de abandono.
   - Reparo no box (asa) ou só depois da corrida.
   - O custo de reparo entra no teto de gastos, e as batidas pesam no orçamento.
3. **Ordens de equipe completas.**
   - Ordens: trocar posições, manter posições, liberar a disputa, proteger o pneu do companheiro e "piloto número 1".
   - O piloto pode obedecer, obedecer reclamando ou ignorar, conforme personalidade, relação com o chefe, química e momento do campeonato.
   - As ordens geram rádio, notícias e reação nas redes.
4. **Componentes do motor.**
   - Componentes: motor a combustão, turbo, MGU-K, bateria, eletrônica e câmbio.
   - Cada um tem desgaste próprio e cota por temporada, definida no regulamento.
   - Exceder a cota dá punição no grid pelas regras da F1 e alimenta a estratégia: "trocar tudo em Monza".
   - Tela de componentes na aba Carro, com vida útil e previsão de estouro.
5. **Testes e congelamento.**
   - Dias de teste de pré-temporada e de meio de ano, com escolha do que testar: acerto, peças novas ou pneus.
   - O congelamento aprovado no Conselho passa a travar o desenvolvimento do motor ou do chassi pelo prazo votado.

### 0.8.6-C: Pendências da 0.8.5
1. **Painel de rivalidades** na página do piloto. Os dados (`G.memory.rivals`) já são calculados e mudam o comportamento na pista.
2. **Tela "Casos e investigações"** no Mundo: investigações abertas, vereditos e linha do tempo dos escândalos (`G.chaos.log`).
3. **Tela "Créditos e licenças"** em Sistema. Mostra a fonte, o autor e a licença de cada imagem, incluindo as 118 fotos novas das notícias. Importante antes de qualquer venda.
4. **Estouros do teto de gastos** num quadro nas Finanças (`G.capBreaches`).
5. **Botão para cancelar uma missão de olheiro**; remover o "contratar já" antigo da academia.
6. **Limpeza do código antigo:** cerca de 12 funções sem uso, listadas no dossiê da 0.8.4.
7. **Gerador de fabricantes candidatos**, para a lista de motores não se esgotar em carreiras de 100 anos ou mais.
8. **Tela de início padrão:** escolher uma das quatro e deixar as outras como opção ou removê-las.
9. **Traduções:** revisar as telas novas no modo inglês.

### 0.8.6-D: Medição, testes e relatório
- Simulação de 20 temporadas no modo Observador, medindo:
  - punições por temporada, por tipo;
  - suspensões por pontos;
  - abandonos por dano;
  - punições de grid por componente;
  - ordens ignoradas;
  - trocas de piloto por relação ruim.
- Calibração com a F1 real de 2022 a 2025 (punições de grid por componente e abandonos por temporada, com a fonte registrada no relatório).
- Testes: `npm test`, `ui-stress`, `ui85-check` (com telas novas), `smoke` no Electron e CI no Windows.
- Relatório `docs/RELATORIO-0.8.6.md` e CHANGELOG.
- Lançamento só com a sua autorização, como na 0.8.5.

## 4. Ordem de trabalho
1. **C (pendências da 0.8.5):** rápido, e limpa o terreno.
2. **B (corrida e regras):** base para as reações das pessoas.
3. **A (pessoas):** usa os eventos de B (ordens, punições, danos) como causas de moral, química e relação.
4. **D (medição e calibração):** conferência de tudo, relatório e espera da sua autorização para lançar.

## 5. Decisões para você
1. **Pontos na superlicença com suspensão:** ligado por padrão? *Recomendo que sim, como na F1 real.*
2. **Conversas com o piloto:** como na 0.8.5, sem texto livre, com opções prontas e respostas que dependem da personalidade? *Recomendo opções prontas.*
3. **Recurso de punições:** incluir já na 0.8.6 ou deixar para a 1.0? *Recomendo incluir, com regras simples.*
4. **Danos por peça:** o reparo de batidas entra no teto de gastos, como na F1 real? *Recomendo que sim.*
5. **Tela de início:** qual das quatro fica como padrão (Largada, Garagem, Telemetria ou Grid), e as outras continuam como opção?
6. **Limpeza do código antigo:** posso remover as funções sem uso?

## 6. Fora da 0.8.6
- **0.9: Carreira de Piloto.** Começar como piloto (kart, F4 ou outra categoria), assinar com equipes, evoluir atributos, lidar com empresário e imprensa e chegar à F1. Só esse tema.
- **1.0:**
  - categorias e equipes jogáveis (comandar uma equipe de F2, F3 e outras);
  - Sandbox e modos especiais;
  - preparação para o lançamento (saves, licenças, atualização automática, assinatura).
- **Saves:** continua valendo a regra da fase de testes. As mudanças valem para carreiras novas; saves antigos abrem, mas não recebem as recalibrações.
