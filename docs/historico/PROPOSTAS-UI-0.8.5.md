# Propostas de interface da V0.8.5

Data: 08/11/2026.

São duas propostas completas, A e B. Cada uma traz as 55 telas do jogo, alimentadas por uma carreira real rodada pelo motor do jogo:
- equipe: McLaren;
- momento: temporada 2028, depois da 8ª etapa;
- dados mostrados: classificação, contratos, caixa, projetos, Conselho, fabricantes, notícias e as demais telas.

**Protótipo clicável:** https://claude.ai/artifact/NPFBr3mvinRWShBAgGr4xa

No topo do protótipo:
- um botão alterna entre A e B na mesma tela;
- uma lista escolhe a tela;
- o "Mapa de telas" mostra todas as telas com um código (A-01 a A-55, B-01 a B-55).

Use esses códigos para pedir mudanças, por exemplo "B-09: quero os comandos da A".

## Proposta A · Transmissão
- **Ideia:** o muro dos boxes visto por uma transmissão de TV.
- **Visual:**
  - fundo carbono escuro;
  - a cor da equipe como luz de destaque;
  - números em fonte mono;
  - faixas de cor das equipes como no grafismo da F1.
- **Navegação:** trilho lateral com 10 áreas (Início, Corrida, Equipe, Carro, Fábrica, Mercado, Finanças, Mundo, Arquivo e Sistema). As telas de cada área aparecem como abas no topo.
- **Telas com destaque:**
  - Central com a próxima etapa em foto;
  - corrida com torre de TV e mapa grande;
  - pódio em tela cheia;
  - ficha do piloto com o número gigante e o carro;
  - sede como campus;
  - P&D sobre a planta do carro;
  - votação do Conselho com placar.

## Proposta B · Paddock
- **Ideia:** a papelada oficial do paddock (folhas de cronometragem, comunicados da FIA e revistas de corrida).
- **Visual:**
  - fundo claro e tinta preta;
  - títulos condensados em caixa alta;
  - a cor da equipe em blocos chapados.
- **Navegação:** menu no topo com 7 áreas e uma segunda linha com as telas de cada área.
- **Telas com destaque:**
  - Central como capa de revista, com a pauta "Para decidir";
  - corrida em formato de folha de cronometragem completa;
  - pódio como pôster;
  - ficha do piloto com gráfico de radar;
  - sede como planta baixa;
  - P&D em quadro de etapas;
  - Conselho como documento da FIA;
  - notícias como jornal.

## Comum às duas
- Uma ação principal por tela: o botão Avançar, que mostra as decisões pendentes quando elas bloqueiam o avanço.
- Notas com escala de cor.
- Busca rápida (Ctrl+K).
- Dicas no lugar de parágrafos.
- Foto, bandeira e cor da equipe em todas as listas de pilotos.

## Arquivos
- `docs/ui-085/propostas/`:
  - folhas de contato com todas as telas de cada proposta (`folha-a-*.jpg`, `folha-b-*.jpg`);
  - quatro telas-chave em tamanho real.
- `docs/ui-085/prototipo/`: código do protótipo (veja o README da pasta).
