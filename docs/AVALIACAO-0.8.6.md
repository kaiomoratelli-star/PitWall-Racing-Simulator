# Avaliação completa do PitWall Racing Simulator (0.8.6)

Data: 09/11/2026. Base: código da 0.8.6 publicada, 20 temporadas simuladas, 2 temporadas jogadas pela interface (`scripts/playthrough-check.js`), comparação tela a tela com a 0.8.4 e leitura do código.

## 1. Resumo

| Área | Situação | Comentário curto |
|---|---|---|
| Simulação esportiva | Forte | Corrida volta a volta, regras reais (comissários, superlicença, motor por componente), 20 temporadas estáveis |
| Profundidade de gestão | Forte | Equipe como empresa, mercado vivo, Conselho, fábrica, P&D, pessoas |
| Interface | Boa, mas irregular | Telas novas bonitas e coerentes; telas antigas ainda aparecem dentro das novas (Equipe irmã, partes do fim de semana) |
| Estabilidade do código | **Fraca** | Muitas camadas que se sobrescrevem; foi isso que fez funções sumirem |
| Testes | Bons para simulação, novos para a interface | Faltam testes por regra e testes de interface no CI |
| Desempenho | Bom | ~0,5 s por fim de semana; save cresce rápido (3 MB em 2 temporadas) |
| Tradução | Média | Inglês funciona por "tradução depois de pronto" (dicionário + 36 blocos de padrões), frágil |
| Pronto para venda | Não | Fotos, logos e marcas sem licença; sem tutorial; sem assinatura e atualização automática |

## 2. O que está forte
- **Simulação:**
  - corrida com pneus, energia, clima, Safety Car, danos e ordens;
  - comissários com investigação, revisão e apelação;
  - motor por componente com cotas reais;
  - calibrada com a F1 de 2022 a 2025 (abandonos, punições, punições de motor).
- **Mundo vivo:**
  - 23 categorias simuladas dia a dia;
  - mercado com empresários;
  - Conselho com votos e bastidores;
  - equipes com dono, valor e venda;
  - fabricantes e eventos fora da pista.
- **Pessoas:** moral com causas, química, conversas que não se repetem, promessas e funcionários com pedidos e conflitos.
- **Medição:** cada fase tem simulação longa e relatório; o jogo roda 20 temporadas sem erro.
- **Processo de publicação:** o CI testa o jogo instalado numa máquina Windows real antes de soltar o instalador.

## 3. Pontos a melhorar

Prioridade: **P1** = resolver antes da 0.9, **P2** = durante a 0.9, **P3** = antes da 1.0.

### 3.1 Estrutura do código (causa das funcionalidades que sumiram)

| # | Problema | Efeito | Prioridade |
|---|---|---|---|
| 1 | **Cadeias de embrulho.** Para acrescentar algo, cada módulo novo "embrulha" a função anterior: `Career.finishWeekend` tem 16 versões encadeadas, `Career.endSeason` 18, `Career.startWeekend` 7, `Events.applyEffects` 7. | A ordem dos arquivos decide o resultado. Uma redefinição sem embrulho apaga em silêncio tudo o que veio antes. Foi assim que o gráfico de tempos de volta, a aba Artes e a previsão das Finanças sumiram. | **P1** |
| 2 | **Três camadas de interface carregadas juntas:** o legado `ui-*` (4.647 linhas), `ui85-*` (1.805) e `ui86` (498). Telas novas chamam pedaços das antigas (ex.: a aba Artes passa pela tela de notícias antiga; a Equipe irmã ainda é a tela antiga com cartões novos embaixo). | Quem mexe numa tela antiga quebra uma nova sem saber; o visual fica irregular. | **P1** |
| 3 | **Arquivos grandes demais e misturados:** `career.js` (71 KB), `owners.js` (58 KB), `ui86.js` (66 KB, várias telas diferentes num arquivo só). | Difícil achar e revisar; aumenta o risco do item 1. | P2 |
| 4 | **Estado global único (`G`) sem esquema.** Qualquer módulo cria campos novos em `G`, nos pilotos e nas equipes. | Saves antigos não sabem dos campos novos; não há lista do que existe nem validação ao carregar. | P2 |
| 5 | **Tradução depois de pronto.** O texto é escrito em português e traduzido na tela por dicionário exato (104 KB) e 36 blocos de padrões. | Cada frase nova precisa de padrão; fácil escapar português no modo inglês; custo de desempenho. | P2 |
| 6 | **Sorteio global (`RNG`) compartilhado.** A interface não pode sortear ao desenhar a tela, ou o resultado da simulação muda. Um caso foi pego nesta versão (previsão do motor). | Bugs difíceis de reproduzir. | P2 |

### 3.2 Testes e processo

| # | Problema | Prioridade |
|---|---|---|
| 7 | Os testes de interface (`ui85-check`, `playthrough-check`, cliques em todos os botões) só rodam na máquina de desenvolvimento, não no CI. | **P1** |
| 8 | Falta teste por regra: comissários, cotas do motor, superlicença e TL1, teto de gastos, revisão e recálculo da classificação. Hoje são conferidos por medição, não por teste que falha. | P2 |
| 9 | Documentação espalhada (24 arquivos em `docs/`, vários planos e relatórios por versão). Falta um índice do que vale hoje. | P3 |

### 3.3 Jogabilidade

| # | Ponto | Sugestão | Prioridade |
|---|---|---|---|
| 10 | **Não há tutorial nem primeiros passos.** São 50 telas e muitas pendências logo no início. | Roteiro guiado na primeira carreira (5 a 8 passos com o "Avançar") e dicas por tela na primeira visita. | P2 |
| 11 | Muitas cartas por etapa em carreiras longas (comissários, motor, danos, testes, funcionários, ordens). | Agrupar no "Resumo da etapa" e deixar o jogador escolher o que vira carta e o que fica só no registro. | P2 |
| 12 | Na corrida, as investigações e punições aparecem só no texto do rádio. | Faixa "Direção de prova" no topo da corrida com os casos abertos e a contagem até a decisão. | P2 |
| 13 | Efeitos pouco visíveis: química, ATR, confiança e vida das peças mudam números, mas o jogador nem sempre vê o "porquê". | Etiqueta "por que" nas telas de treino e corrida (ex.: "+2 de confiança: química com o companheiro"). | P3 |
| 14 | Suspensões por pontos: 2 em 8 temporadas, um pouco acima da F1 real. | Reduzir um pouco os pontos por limite de pista. | P3 |
| 15 | O save cresce rápido: ~3 MB em 2 temporadas, ~5 MB em 20 (notícias, redes, histórico volta a volta). | Compactar o histórico antigo (guardar só os resumos de anos passados) e limitar redes e notícias por ano. | P2 |

### 3.4 Interface

| # | Ponto | Prioridade |
|---|---|---|
| 16 | Telas antigas ainda visíveis no meio das novas: Equipe irmã, Academia, Olheiros, partes do treino e da estratégia, editor. | **P1** (junto com o item 2) |
| 17 | Partes antigas ainda sem inglês completo (corpo de alguns eventos antigos, textos do editor). | P2 |
| 18 | Acessibilidade: navegação por teclado parcial, contraste de textos pequenos no tema claro, nenhum ajuste de tamanho de fonte. | P3 |
| 19 | Telas muito longas (Finanças, Carro, Parcerias) pedem rolagem grande; caberiam abas internas. | P3 |

### 3.5 Lançamento comercial (antes da 1.0)
- **Licenças:** fotos, logos e marcas reais sem licença livre precisam ser licenciadas ou trocadas. A tela "Créditos e licenças" já mostra o que falta.
- **Instalador:** assinatura digital e atualização automática.
- **Saves:** migração final e opção "Recalibrar" (`docs/PENDENCIAS-V1.md`).

## 4. Solidificação já feita nesta versão (para nada mais sumir em silêncio)

| Proteção | O que faz | Onde |
|---|---|---|
| `guard-check` (roda no `npm test` e no CI do Windows) | Falha se duas funções têm o mesmo nome; se uma tela ou ação é refeita por inteiro sem registro; se um botão chama uma ação inexistente; se um arquivo fica fora do build. | `scripts/guard-check.js` |
| **Lista oficial de funcionalidades** | 49 telas, 189 ações, 1.065 funções do motor e 144 painéis. Se qualquer um sumir, o teste falha. Remoção só de propósito, com o motivo no commit. | `tests/features.json`, gerada por `scripts/features-snapshot.js` |
| **Substituições aprovadas** | Toda tela ou ação refeita por inteiro precisa estar listada, com o que foi conferido. | `tests/replacements.json` |
| **Teste de jogador** | Joga temporadas inteiras pela interface e confere a integridade dos dados a cada etapa. | `scripts/playthrough-check.js` (`npm run playthrough`) |
| **Regras de desenvolvimento** | O que fazer antes de remover ou refazer uma tela. | `docs/DESENVOLVIMENTO.md` |

Teste das proteções: removendo de propósito uma tela e um painel, o `npm test` falhou e apontou os dois.

## 5. Reorganização proposta

### 5.1 Estrutura de pastas
```
app/src/
  core/                     regras e simulação, sem interface
    engine/                 corrida, física, comissários, danos
    season/                 calendário, fim de semana, classificação, pontos
    team/                   carro, P&D, fábrica, motor e peças, parcerias, irmãs
    people/                 pilotos, moral, química, conversas, funcionários
    world/                  mercado, Conselho, donos, fabricantes, categorias, eventos
    hooks.js                ganchos com nome (substitui as cadeias de embrulho)
    schema.js               lista dos campos do save, valores padrão e migração
  ui/
    kit/                    componentes (cartão, tabela, gráficos)
    shell/                  casca, menu, busca, avançar
    screens/<tela>.js       UMA tela por arquivo, sem chamar a versão antiga
  i18n/                     chaves de texto (pt e en) para o código novo
tests/                      lista de funcionalidades, substituições, testes por regra
```

### 5.2 Ganchos no lugar das cadeias de embrulho
Hoje:
```js
const fw = Career.finishWeekend;
Career.finishWeekend = (G) => { /* antes */ const r = fw(G); /* depois */ return r; };
```
Proposto:
```js
Hooks.on('weekend:after', 'comissarios', (G, race) => { ... }, { order: 40 });
```
- Cada gancho tem nome e ordem explícitos.
- Uma tela de diagnóstico lista todos.
- Dois ganchos com o mesmo nome dão erro.
- Nada substitui nada em silêncio.

### 5.3 Etapas sugeridas (versão 0.8.7 "Solidificação", antes da Carreira de Piloto)
1. **Ganchos.** Criar `hooks.js` e migrar as 70+ cadeias de embrulho do núcleo, sem mudar o comportamento. O `playthrough-check` e as simulações longas confirmam que nada mudou: mesma semente, mesmo campeão.
2. **Telas.** Portar as telas antigas que ainda aparecem para `ui/screens/` e apagar o legado `ui-*`, uma tela por vez. A lista de funcionalidades garante que nada some.
3. **Save.**
   - `schema.js` com versão e valores padrão;
   - compactação do histórico;
   - meta: menos de 1 MB por temporada.
4. **CI.** Rodar `guard-check`, `playthrough-check` (1 temporada) e `ui85-check` no CI.
5. **Testes por regra.** Comissários, motor, superlicença, teto e revisão.
6. **Tradução por chaves** para o código novo; o tradutor atual fica só para o legado, até ele acabar.
7. **Tutorial curto** e resumo da etapa (itens 10 e 11).

Estimativa: as etapas 1, 2 e 4 são o centro e mudam pouco o que o jogador vê. As etapas 3, 5, 6 e 7 podem ser divididas entre a 0.8.7 e a 0.9.
