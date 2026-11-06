# Plano de integração — versão 0.8

> Documento de trabalho. Atualizado a cada fase entregue.
> Princípio: complementar o que já funciona, sem sistemas duplicados, sem perder saves.

## Fase 0 — Estabilidade (ENTREGUE na 0.7.1)

**Diagnóstico do congelamento ("tr is not a function", `index.html:12853`)**
- `tr(pt, en)` era a função global de idioma (util.js, 0.7.0).
- Em `ui-race.js`, `updateRace()` declara `const tr = Career.track(...)` (o circuito) e, na torre de tempos, chamava `tr('MU', 'OM')` sempre que um carro estava com o modo de ultrapassagem ativo. Dentro da função, `tr` era o circuito: TypeError a cada redesenho.
- O laço da corrida (`scheduleTick`, ui-weekend.js) só agenda a próxima volta depois de redesenhar. Com o erro, a corrida parava de avançar; o mapa animado e o tratador global repetiam o erro no log. Em PT e EN igual; mais visível no Observador porque a corrida roda sem pausas.
- Reproduzido no build da 0.7.0 com `scripts/ui-stress.js` (mesma mensagem e mesmo ponto, `updateRace`).

**Correção na origem**
- Função renomeada para `byLang` (util.js) em todos os módulos.
- `scripts/check-scope.js` (acorn) no `npm test`: acusa chamada a função global sombreada por variável local e chamada a função inexistente. Testado injetando os dois tipos de erro.
- Laços ao vivo separam simulação e tela (corrida, mapa, treino, classificação). Erro de desenho: registrado, a corrida segue. Erro de simulação: pausa com aviso na tela. `reportError` grava pilha e contagem no log, um aviso por erro, lista em Diagnóstico.
- Testes: `npm test`; `scripts/ui-stress.js 50` (3 temporadas pela tela de corrida, Observador e Manager, PT e EN, chuva, Safety Car, abandonos em massa, Sprint; ~0,3 s por fim de semana, heap 14–38 MB); 20 temporadas no núcleo (tempo por temporada constante até 2046); teste do executável Electron com uma corrida inteira em inglês pelo laço real (também no CI do Windows).

## Fontes externas: o que pode e o que não pode

| Fonte | Situação | Uso no jogo |
|---|---|---|
| **DriverDB** (RAFA Media LLC) | Os termos proíbem, sem autorização escrita: raspagem ou coleta em massa (automática ou manual), montar base semelhante, uso comercial. O jogo será pago. | **Não há importador.** Consulta pontual como referência. Para usar a base: pedir licença à RAFA Media (contato no site). O importador fica pronto para receber um arquivo licenciado. |
| f1db (CC BY 4.0) | já usado | histórico da F1, com crédito |
| Wikidata (CC0) | livre | datas de nascimento, nacionalidades, identificadores únicos de pessoas |
| Wikipedia (CC BY-SA) | já usado em `import_categories.py` | grids e calendários das categorias, com crédito |
| Wikimedia Commons | licença por arquivo | fotos e logos com licença registrada por arquivo |
| Sites oficiais de categorias e equipes | direitos reservados | ver item seguinte |
| FIA (lista de circuitos homologados) | documento público | inventário de circuitos e validade da licença, com data de verificação |

Fotos e logos oficiais: permitidos agora (regra do dono: dados e imagens reais no jogo ainda não vendido), mas cada arquivo passa a ter `status de licença` no registro de assets, para a troca antes da venda.

## Conteúdo sensível (eventos extremos e mortalidade)

Regras fixas no código e nos dados:
- Fatos graves inventados (crimes, manipulação, festas com simbologia extremista, escândalos sexuais, mortes futuras) só com pessoas e organizações **fictícias** geradas pelo jogo. Nunca com pilotos, dirigentes, jornalistas ou equipes reais.
- Pessoas reais: só falecimentos históricos documentados; nenhuma causa médica inventada.
- Nada explícito; consequências institucionais, de reputação e de privacidade.
- Mortalidade com modelo próprio, fora do controle de "caos".
- A rede social simula perfis reais de comentaristas apenas com identificação clara de simulação ("simulação do universo do save"). Perfis padrão são fictícios.

## Mapa de sistemas (o que existe e onde será complementado)

| Pedido | Já existe | Complemento |
|---|---|---|
| Base de pilotos | `data/real-db`, `real-extra`, `categories`, `import_*.py`, `cats.js` | status de confirmação, fonte e data de verificação por registro; id único e aliases; detecção de duplicados |
| Imagens, logos, bandeiras | `imgUrl`, `headshot`, `teamLogo`, `natTag` em ui-core.js | `Assets` central (registro com tipo, entidade, origem, licença, fallback); bandeiras SVG locais únicas |
| Alpine/Gucci 2027 | patrocinadores e nomes na base | identidade por temporada (`t.identity[ano]`), aplicada na virada de ano, histórico preservado |
| Categorias | 15 categorias em `cats.js`, editor existente | grupos por ecossistema; F1 Academy e IndyCar funcionais; demais como "em preparação" |
| Potencial e scouting | `d.potential` fixo, academia | potencial dinâmico com volatilidade por idade/categoria; faixa estimada com confiança (Manager) |
| Mercado | `market.js` (ondas, contrapropostas, academias, demissões) | atratividade por perspectiva esportiva; pilotos com patrocínio; empresários com carteira; cláusulas; trocas no meio do ano só com motivo; política de academia por grupo |
| P&D | projetos em `career.js`/ui-screens | slots por estrutura; limite com motivo; destaque da peça; resultado real antes→depois |
| Corrida | modos save/normal/push em `engine.js`; bateria e modo ultrapassagem | pneus e ERS como controles separados; IA usa o mesmo; HUD nos cards |
| Sprint | SQ e Sprint já simulados volta a volta (0.7) | revisão por categoria (formato só da F1) |
| Visual da corrida | torre, Pit Wall, relatório oficial (0.7) | número, logo, bandeira; borda amarela no SC; pódio animado |
| Circuitos | base real + gerador | inventário Grade 1 com validade; circuitos reserva; editor de traçado com validação |
| Fabricantes e investidores | motores, equipes irmãs, compra | interesses de fabricantes; candidatos a entrada; investidores |
| Pneus múltiplos | Conselho da FIA | proposta de concorrência de pneus; contratos por equipe |
| Notícias | `media.js` (notícias, rede social, histórias) | decorator visual; infográficos do histórico; timeline estilo X; fluxo rumor→anúncio |
| Eventos raros | `events.js` + escândalos fictícios | raridade em níveis; ocorrência × descoberta; mortalidade; cadeias de consequência |
| Regras no meio do ano | Conselho: mudanças "já" só com 80% | padrão: vigência na temporada seguinte; urgência só por segurança/força maior |

## Migrações previstas
- Save v6 (0.8): `identity` por temporada nas equipes; `potential` real + `scout` por piloto; contratos com cláusulas e empresários; `assets`; estado de pneus/ERS no carro; eventos com fase de descoberta; `deceased` em pessoas. Todos com valores padrão; nada é apagado.
- Backup automático antes da migração (o desktop já guarda 5 cópias; a migração grava uma cópia marcada `pre-v6`).

## Ordem de execução
0. Estabilidade — entregue (0.7.1).
4. Corrida: pneus e ERS separados, HUD, Safety Car, pódio, tabela — maior impacto no jogo.
2. Identidade 2027 (Alpine/Gucci) e serviço central de assets e bandeiras.
3. Mercado, contratos, potencial dinâmico e scouting; F1 Academy e IndyCar; ecossistemas.
6. Notícias visuais, timeline, eventos raros com descoberta, mortalidade.
4b. P&D com slots.
5. Circuitos Grade 1, reservas, editor de traçado.
7. Testes longos, balanceamento, release 0.8.0.
