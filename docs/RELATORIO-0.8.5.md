# Relatório da 0.8.5 — nova interface

Situação: pronta no ramo `v0.8.5`, **sem lançamento**. A versão só vai para o `main` (que gera o instalador) quando o dono do jogo pedir.

## Onde está cada coisa

### Estilos
| Arquivo | Conteúdo |
|---|---|
| `app/src/ui85.css` | sistema visual, temas e casca |
| `app/src/ui85-screens.css` | estilos de cada tela |

### Módulos de interface
Carregados depois dos antigos, eles substituem as telas sem apagar o código anterior.

| Arquivo | Conteúdo |
|---|---|
| `ui85-shell.js` | áreas, abas, barra superior, busca, tema e posição do menu |
| `ui85-kit.js` | componentes e gráficos (anel, barras, linha, radar, rosca, mini-gráfico) |
| `ui85-home.js` | Central e calendário |
| `ui85-race.js` | corrida ao vivo, rádio, Pit Wall, pole, pódio |
| `ui85-team.js` | pilotos, Mano a Mano, página do piloto |
| `ui85-car.js` | carro, P&D, fabricantes |
| `ui85-money.js` | finanças, patrocinadores, diretoria |
| `ui85-world.js` | página da equipe, Conselho, notícias, redes sociais, fim de temporada |

### Motor de corrida
`app/src/engine.js`: ordens de rádio (`Engine.ord`, `Engine.applyOrders`, `Engine.ORDER_LAPS`).

## Posição do menu
Recomendação: **lateral** como padrão. Em monitores largos, a altura é o espaço mais escasso, e as tabelas (classificação, mercado, extrato) precisam dela. A lateral também deixa os ícones sempre visíveis.
- O topo é bom para telas estreitas (até cerca de 1366 px).
- Embaixo lembra jogos de console.

As três opções ficam em Opções → Interface.

## Verificação de dados e coerência

### `node scripts/ui85-check.js 7`
4 carreiras, todas sem problemas.

| Configuração | Resultado |
|---|---|
| PT, escuro, menu lateral, McLaren, 1440 px | sem problemas |
| EN, claro, menu no topo, Williams, 1366 px | sem problemas |
| PT, claro, menu embaixo, Ferrari, 1920 px | sem problemas |
| PT, escuro, menu lateral, Haas, 1100 px | sem problemas |

Em cada carreira:
- 47 telas e abas sem erro de página;
- nenhum "undefined", "NaN" ou "[object Object]" na tela;
- sem rolagem horizontal.

As 11 verificações de coerência passaram em todas:
- pontos do líder;
- posição nos construtores;
- receitas do ano;
- três primeiros do pódio;
- pole;
- etapas do calendário;
- duelos do Mano a Mano;
- busca;
- registro das ordens de rádio;
- expiração da defesa;
- ida ao pódio depois da corrida.

### Outros testes
| Teste | Resultado |
|---|---|
| `npm test` (simulações longas, migrações v1/v3/v4 → v7) | OK |
| `node scripts/ui-stress.js` (PT/EN, observador e chefe de equipe) | OK, sem erros |
| `xvfb-run -a node scripts/smoke.js` (Electron, save reaberto) | OK, 0 erros |

## Erros encontrados e corrigidos
- Tabela da corrida cortava a última coluna.
- Pit Wall alto demais: virou abas por piloto.
- Foto da pole aparecia com caixa.
- Fundo das fotos no pódio e números dos degraus fora do centro.
- Pódio antigo repetido na tela pós-corrida.
- Logos de fabricantes brancos sobre branco.
- "Seu carro" e cabeçalho duplicados no P&D.
- Mini-gráfico do caixa por cima do texto.
- Rótulos do radar do Mano a Mano cortados.
- Mapas pequenos enormes no calendário.
- Rolagem horizontal na tela de staff a 1100 px.

## Melhorias feitas na revisão
- Ordens de atacar, defender e evitar ar sujo expiram em 5 voltas. Mantidas a corrida toda, levavam a uma média de 11ª posição nos testes.
- "Deixar passar" só acontece com o companheiro logo atrás.
- Central: dados do seu carro na próxima pista (posição esperada no grid, último vencedor e maior vencedor do circuito).
- Gráfico gasto × pontos com escala a partir do menor gasto e rótulos sem sobreposição.

## Segunda rodada (pedidos depois da primeira versão)
- Conselho com a logo da FIA e o plenário da Comissão.
- Logos de fabricantes e patrocinadores no tamanho certo.
  - Causa: a imagem não respeitava a altura da caixa.
- Corrida reorganizada, com a pista maior e fixa ao rolar.
- Notícias com banco de fotos e montagens.
  - Módulo `ui85-news.js`, fotos em `assets/img/news`.
  - Créditos em `sources.json` e no registro de assets.
- Quatro propostas de tela de início em `ui85-title.js` (Largada, Garagem, Telemetria e Grid).
- Animações e transições em `ui85-fx.js` e `ui85-fx.css`, com opção para desligar.
- Defeito de dados encontrado na revisão: 5 retratos sem a cabeça (Albon, Lindblad, Colapinto, Lawson e Gasly). Foram refeitos.
- Verificação:
  - `ui85-check.js` roda com as animações desligadas, para ler os números finais;
  - outra checagem com as animações ligadas confirmou que os números terminam no valor certo e que nenhuma tela rola na horizontal durante a transição.

## Para depois da V1
Saves e migrações da nova interface: a 0.8.5 não muda o formato do save, só lê dados que já existem.
