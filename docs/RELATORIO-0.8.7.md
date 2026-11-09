# Relatório da 0.8.7 — Solidez

Data: 09/11/2026. Situação: **publicada em 09/11/2026, com a autorização do dono do jogo.**
Base: as prioridades P1 a P3 da [avaliação da 0.8.6](AVALIACAO-0.8.6.md).

## 1. O que cada item da avaliação virou

| # | Item (prioridade) | Feito |
|---|---|---|
| 1 | Cadeias de embrulho (P1) | `Hooks.around/base/replace` com nome; 130 embrulhos convertidos sem mudar o jogo (assinatura de determinismo idêntica); `Hooks.verify` ao abrir; guard-check proíbe o estilo antigo e redefinições por cima. |
| 2, 16 | Três camadas de interface, telas antigas (P1) | Equipe irmã refeita no visual novo; aba de gráfico da Classificação passou a morar na tela nova; abas do editor, seletores da Academia e do editor corrigidos. As demais telas antigas já usam o visual novo (o CSS novo cobre as classes antigas). Guard-check pega embrulho de tela que não existe mais. |
| 7 | Testes de interface fora do CI (P1) | O CI do Windows roda telas e abas, temporada pela interface, saves no navegador, inglês, saves publicados e determinismo, e abre um save real da 0.8.6 no jogo instalado. |
| 3 | Arquivos grandes (P2) | Código em `core/{base,race,season,people,world}` e `ui/{base,legacy,v85,screens}`; `career.js` e `owners.js` divididos; `ui86.js` virou 18 arquivos numerados. |
| 4, 15 | Estado sem esquema; save grande (P2) | `core/base/schema.js` registra todos os campos de `G`, confere ao abrir e antes de gravar. Saves compactados com gzip (3 MB → ~0,5 MB; 5 MB → 1,2 MB no navegador), conferidos antes de substituir o anterior. Escolha: compactar em vez de cortar o histórico, para não perder nada da carreira. |
| 5, 17 | Tradução depois de pronto; inglês incompleto (P2) | Texto gerado pelo jogo nasce no idioma com `byLang` (20 eventos antigos, notícias de corrida, categorias, mercado, Conselho, redes). `i18n-check`: de 89 para 6 trechos em português nas telas em inglês (só nomes próprios e um título citado). |
| 6 | Sorteio compartilhado (P2) | O `render` confere o sorteio: se uma tela sortear, é devolvido, registrado e, nos testes, vira erro. Nenhuma tela sorteia hoje. |
| 8 | Teste por regra (P2) | `rules-check` (83 verificações): escala dos comissários, fim de corrida sem DT/SG, conversão em 20/30 s, rigor, cotas do motor (10/5/fim do grid), superlicença, suspensão e volta do piloto, revisão/apelação e recálculo, ganchos. Testado estragando regras de propósito: o teste falha. |
| 10 | Tutorial (P2) | Primeiros passos (8 passos que se marcam sozinhos) e dica curta na primeira visita a cada tela; desligável e religável. Fica no navegador, não no save. |
| 11 | Muitas cartas (P2) | Resumo da etapa na caixa de entrada; o jogador escolhe que tipos continuam como carta (Diretoria por padrão). |
| 12 | Punições só no rádio (P2) | Faixa "Direção de prova" na corrida. |
| 9 | Documentação espalhada (P3) | `docs/README.md` (índice), planos e relatórios antigos em `docs/historico/`, guias atualizados. |
| 13 | "Por quê" (P3) | Etiquetas no fim de semana, no carro e na corrida: química, moral, confiança no chefe, vida do motor, ATR. |
| 14 | Suspensões por pontos (P3) | Ponto por limite de pista vira decisão dos comissários (~50%, sem sorteio): de 2,3 para 1,0 suspensão a cada 8 temporadas (3 universos × 8 temporadas). |
| 18 | Acessibilidade (P3) | Teclado (Tab, Enter, Espaço) em tudo o que é clicável, foco nas janelas, contraste do texto secundário acima de 4,5:1 nos dois temas, tamanho do texto. |
| 19 | Telas longas (P3) | Carro com abas; Mercado (7,8 → 2,2 alturas de tela) e Olheiros em páginas — antes, pilotos além dos 120/80 primeiros nem apareciam. |

## 1b. Pedido do dono antes do lançamento: danos e saúde do carro

| O quê | Como ficou | Medido em 120 corridas (5 universos) |
|---|---|---|
| Asa dianteira parcial | Toque ou rodada tiram de 25% a 100% da asa; perda de 0,9 s por volta × dano. Dano a partir de 60% (ou quando a perda passa do custo da parada) faz a estratégia parar; menos que isso segue até a parada normal, e o bico é trocado nela. | 71 asas danificadas: 27 parciais e 44 grandes; 66 trocas de bico |
| Bandeira preta e laranja | Asa com 75% ou mais de dano pode ficar solta (40%); os comissários dão 2 voltas para parar; sem parar, bandeira preta (fora da corrida). A peça pode cair antes (25% por volta). | cerca de uma a cada 8 corridas no grid inteiro |
| Detritos | Pedaço grande de asa na pista traz o Safety Car virtual em ~60% dos casos, nunca por cima de outro Safety Car. | 8 Safety Cars virtuais por detritos de asa |
| Saúde do carro | Fim de semana: cada componente do motor e câmbio com vida e cota, mais o que foi consertado. Corrida: no muro dos boxes, cada peça com barra, perda por volta, peça solta, pneu e motor; a bandeira aparece no topo. | — |

Testes novos em `rules-check` (12 verificações): asa parcial não para fora de hora, asa grande para, nada de parar a 2 voltas do fim, bandeira com prazo de 2 voltas, bandeira preta para quem não para, parar resolve, Safety Car virtual por detritos e nunca por cima de outro. Testado estragando a regra da bandeira preta: o teste falha.
A simulação muda com isso (pedido do dono), então a referência de determinismo foi regravada outra vez.

## 2. Problemas achados e corrigidos no caminho

1. **Em inglês, reparos de acidente nunca eram cobrados.** O motivo do abandono era reconhecido só em português; a mesma carreira dava resultados diferentes por idioma. Achado pelo teste novo `lang-parity-check`.
2. **Abrir um save que falhava punha em risco o save**: o espaço mudava antes de conferir, e o salvamento automático gravava a carreira anterior por cima.
3. **Importar com os três espaços ocupados** gravava por cima do terceiro sem perguntar.
4. **Decisões pendentes** podiam ser cortadas pelo limite de 120 mensagens.
5. **Aba "Evolução dos pontos"** da Classificação quebrava depois que a tela antiga saiu (pego pelo CI; agora o teste de telas visita todas as abas).

## 3. Mudança na simulação

Duas: o ponto por limite de pista (item 14 da avaliação) e os danos novos (pedido do dono, seção 1b). Com o ponto forçado em 1, a assinatura antiga volta igual, o que prova que nada mais mudou. A referência foi regravada em `tests/determinism.json`. Todo o resto (ganchos, pastas, traduções, interface) manteve a simulação idêntica.

## 4. Testes

Bateria final, toda verde (25 de 25):
- `npm test`: guard-check, escopo, saves em disco, esquema, 71 regras, idioma não muda o jogo, simulação 10+4 temporadas, categorias.
- Determinismo duas vezes (mesma assinatura).
- 6 saves reais da 0.8.4, 0.8.5 e 0.8.6 (entre etapas e no meio da corrida) abertos e jogados por mais 26 etapas.
- Esquema conferido a cada etapa em 3 temporadas (Manager e Observador).
- Mesmo jogo em português e inglês por 48 etapas.
- Simulações longas: 2 × 20 temporadas (até 2046) e 12 temporadas de Manager, sem erro.
- Todas as 76 telas e abas em 5 combinações de idioma, tema, menu, largura e texto "Muito grande".
- Temporadas inteiras pela interface: McLaren (2), Haas, Williams.
- 5.000 cliques ao acaso (Williams, Ferrari, Cadillac), sem erro, sem sorteio na tela e com dados coerentes.
- Corrida ao vivo sob estresse, saves no navegador, inglês, aplicativo Electron real (salvar, fechar, reabrir).
- CI do Windows: instala, abre, salva, atualiza, abre um save real da 0.8.6 no jogo instalado e o regrava compactado, desinstala sem perder saves.

## 5. Para o dono do jogo

- Saves da 0.8.7 não abrem em versões anteriores (gravados compactados). Os saves antigos continuam abrindo na 0.8.7 e o arquivo original fica nos backups.
- Publicada em 09/11/2026 com a autorização do dono do jogo.
