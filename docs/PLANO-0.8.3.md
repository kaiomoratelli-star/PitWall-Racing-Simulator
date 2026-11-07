# V0.8.3: diagnóstico e plano (para aprovação)

**Tema:** talentos, evolução dos pilotos, desenvolvimento dos carros, equilíbrio esportivo e economia completa.
**Base:** V0.8.2 publicada. Números medidos com `scripts/audit.js` e simulações de 10 a 50 temporadas.

---

## 1. Diagnóstico

### 1.1 Talentos: o problema não está no início, está no que nasce depois

**Grid da F1 no início:** notas de 80 a 94, um piloto com 90 ou mais (Verstappen). Os atributos de cada piloto são quase iguais entre si: a diferença média entre o melhor e o pior atributo é de 5 pontos. Verstappen vai de 93 a 96 e Stroll de 77 a 82. Ninguém é "ótimo em classificação e mediano em corrida".

**Potencial ≥ 90 no início:** 33 pilotos (2,6% do universo). O documento pede 0,1% a 0,5% para geracionais. Os casos mais graves vêm da regra que sorteia o potencial, que **ignora a idade**:

| Piloto | Idade | Série | Potencial |
|---|---|---|---|
| Justin Allgaier | 41 | NASCAR | 90+ |
| Kyle Kelley | 42 | NASCAR | 90+ |
| Caleb Costner | 34 | NASCAR Trucks | 95 |
| Rafael Suzuki | 40 | Stock Car | 90+ |
| Josh Berry | 37 | NASCAR | 90+ |
| Raffaele Marciello | 33 | WEC | 90+ |

Também há potencial de elite em pilotos de F4 sorteados ao acaso (Langendonck, Savinkov, Medeiros) e numa criança de 14 anos no kart.

**Quem vira 90+ com o tempo** (20 temporadas): quase todos são esses juniores com potencial sorteado alto. Em 2037 o grid da F1 tem **8 pilotos com 90 ou mais** e mediana de 87; o pior tem 81. O grid fica espremido no topo.

**Nascem elites demais:** de 1 a 6 pilotos novos com potencial de 90 ou mais por ano.

**O universo encolhe:** em todo ano saem mais pilotos do que entram (saem 85–183, entram 63–113). Em 50 anos, estabiliza em cerca de 660 pilotos.

**Evolução:**
- quem tem menos de 27 anos sobe até o potencial quase sempre;
- o declínio começa aos 33 e é igual para todos;
- não existe "longevidade" (o caso Alonso).

### 1.2 Carros: ainda há equalização artificial

- **Todo fim de ano**, cada carro é puxado 16% em direção a uma média fixa (82). No ano de regulamento novo, o puxão é de 38%. Isso fere a regra 4.1 do documento (não forçar as equipes a se aproximarem).
- **Piso de diferença do `regcal`** (desvio mínimo de 2,0): é o oposto, separa os carros artificialmente. Hoje ele compensa o puxão; os dois deveriam sair.
- **A IA nunca erra um projeto:** tem só uma variação aleatória. O jogador tem falhas. Para a IA não existem atraso, problema de correlação, peça que melhora uma coisa e piora outra, nem perda de confiabilidade após atualização.
- **Retornos decrescentes medidos contra a média do grid**, que ajudam quem está atrás.
- **Resultado em 20 anos:**
  - o desvio entre carros se mantém em 2,1 a 2,5, graças à economia da 0.8.2;
  - mas 8 a 9 equipes sobem ao pódio por ano;
  - na F1 real são 4 a 6 (2023: 5; 2024: 4; 2025: 6).

### 1.3 Economia: a contenção da 0.8.2 funciona, falta profundidade

**Patrocinadores** são só nome, valor por GP, um objetivo e um bônus. Falta:
- segmento;
- exclusividade (dois bancos ou duas bebidas no mesmo carro);
- reputação da marca;
- cláusulas de desempenho;
- risco de cancelamento no meio do ano;
- concorrência das outras equipes pelas mesmas marcas.

**A IA não tem patrocinadores de verdade**, só um valor de mercado.

**Também falta:**
- dívida, empréstimo e juros: hoje o caixa negativo só derruba a confiança;
- custo de reconstrução após acidente grave e custo de peças de reposição por pista;
- premiação: hoje é uma tabela simples por posição, mais um bônus histórico estimado.

---

## 2. O que será feito na 0.8.3

### A. Talentos em 7 níveis
1. **Geracional, acima da média, bom, mediano, medíocre, ruim e péssimo**, com faixas de nota por nível. Proposta na escala da F1:

   | Nível | Nota |
   |---|---|
   | Geracional | 94 a 97 |
   | Acima da média | 89 a 93 |
   | Bom | 85 a 88 |
   | Mediano | 81 a 84 |
   | Medíocre | 77 a 80 |
   | Ruim | 72 a 76 |
   | Péssimo | abaixo de 72 |

   Cada categoria tem a sua escala (o "bom" da F4 é bem mais lento que o "bom" da F1).
2. **Pilotos reais classificados** pela carreira:
   - duelo com o companheiro (classificação e corrida, que já está na base);
   - rating do DriverDB;
   - títulos, vitórias e regularidade.

   A F1 vai para a sua aprovação (proposta na seção 4). As outras categorias são classificadas automaticamente pela mesma regra e conferidas por amostragem.
3. **Atributos com perfil:** cada piloto ganha pontos fortes e fracos reais (classificador, gestor de pneus, bom na chuva, largador, fraco em defesa...). A diferença entre os atributos passa de cerca de 5 para 10 a 20 pontos, sem mudar a nota geral do piloto.
4. **Raridade por categoria:**
   - geracionais: 0,1% a 0,5% do universo (de 1 a 5 vivos ao mesmo tempo);
   - acima da média: 5% a 10%.

   A F1 concentra os melhores; a F4 tem a curva cheia.
5. **Potencial depende da idade:** com mais de 26 anos, o potencial é a nota atual (sem salto). Os sorteios de elite ficam só com jovens e são raros: 1 a 3 por geração, não por ano.
6. **Potencial que nem sempre se realiza:** falta de vaga, de dinheiro, ambiente ruim, lesão ou temporada fraca fazem o potencial cair. Isso já existe em parte (`potential.js`) e será calibrado.

### B. Evolução e envelhecimento
1. **Curva por idade:**
   - crescimento rápido até 23 anos;
   - auge entre 27 e 33;
   - declínio gradual a partir de 34 e mais forte depois dos 38;
   - reflexos (classificação, largada) caem antes da experiência (gestão de pneus, consistência).
2. **Longevidade individual** (o caso Alonso): alguns pilotos caem mais devagar. É um traço raro e escondido.
3. **Entrada de novos pilotos** para manter o universo estável (±10% em 50 anos), respeitando a raridade.

### C. Desenvolvimento dos carros e equilíbrio
1. **Sai o puxão anual para a média e sai o piso de diferença.**
   - Fica a regressão natural do ano: o carro novo carrega 70% a 90% do que a equipe sabe, conforme a capacidade dela.
   - Fica o regulamento novo, que embaralha pelo acerto do conceito (já existe).
2. **Capacidade de desenvolvimento por equipe**, para a IA e para o jogador com a mesma regra: engenheiros, instalações, túnel de vento e CFD, dinheiro e organização. Equipe pequena faz menos projetos por ano, não só projetos mais baratos.
3. **Para todos:**
   - falhas de projeto;
   - atraso;
   - correlação túnel × pista (a peça rende menos que o previsto);
   - peça que melhora um atributo e piora outro;
   - confiabilidade que cai depois de uma atualização grande.

   O risco depende da qualidade da equipe: aleatoriedade com contexto, não arbitrária.
4. **Congelamento de desenvolvimento e restrições de testes** quando o regulamento ou o Conselho determinar.
5. **Meta medida:** de 4 a 6 equipes no pódio por ano, de 2 a 4 equipes vencedoras, e equipe dominante possível por vários anos, mas não para sempre.

### D. Economia completa
1. **Patrocinadores com segmento, exclusividade, reputação, valor fixo, bônus, cláusulas, duração e risco de cancelamento.** As marcas escolhem equipes pela exposição, e a IA também disputa patrocinadores.
2. **Dívida e empréstimos com juros.** Dívida alta limita gastos e pressiona a diretoria. A saída do grid fica para a 0.8.4, como previsto.
3. **Custos que faltam:** reconstrução após acidente grave, peças de reposição e frete por distância (o frete já existe e será revisto).
4. **Premiação revisada:** parcela fixa, parcela por posição e bônus histórico, com valores estimados e marcados como estimativa.

### E. Testes e entrega
- Simulações de 5, 10, 20, 30 e 50 temporadas, comparadas com a linha de base da 0.8.2. Relatório antes e depois para cada meta.
- Teste da interface, teste do aplicativo Electron, saves da 0.6 à 0.8.2 e instalador no CI.

**Arquivos que vão mudar:**
- Núcleo: `career.js` (evolução, fim de temporada), `potential.js`, `cats.js` (sorteio de potencial e novos pilotos), `data.js` (atributos com perfil), `ai.js`, `rnd.js` (desenvolvimento), `regcal.js`, `econ.js` e `events.js` (patrocínio).
- Interface: `ui-*` (nível do piloto, patrocinadores, dívida).
- Saves: `migrate.js` (save v8).
- Novo arquivo: `app/data/driver-tiers.js` (classificação dos pilotos reais, com a evidência de cada um).

---

## 3. Metas de aceite (medidas em 20 e 50 temporadas)

| Métrica | Hoje (0.8.2) | Meta |
|---|---|---|
| Equipes no pódio por temporada | 8 a 9 | 4 a 6 (às vezes 3 ou 7) |
| Equipes vencedoras por temporada | 5 a 7 | 2 a 4 |
| Pilotos da F1 com nota ≥ 90 | 1 → 8 em 10 anos | 1 a 4, sempre |
| Potencial ≥ 90 no universo | 2,6% | 0,5% ou menos (geracionais de 0,1% a 0,5%) |
| Faixa de notas da F1 | 80 a 94 → 81 a 93 | cerca de 76 a 95, estável |
| Diferença entre atributos de um piloto | cerca de 5 | 10 a 20 |
| Tamanho do universo em 50 anos | −47% | ±10% |
| Desvio entre carros | 2,1 a 2,5 (com piso artificial) | 2 a 4, sem piso artificial |

---

## 4. Informações que preciso de você

### 4.1 Classificação dos pilotos da F1 (proposta)

Colunas:
- **Nota:** a nota atual no jogo.
- **Duelo:** a diferença média para o companheiro, em classificação e em corrida (positivo = mais rápido).
- **DriverDB:** o rating do DriverDB.

| Piloto | Idade | Nota | DriverDB | Duelo (class./corrida) | Nível proposto |
|---|---|---|---|---|---|
| Max Verstappen | 29 | 94 | 2.565 | +4,6 / +5,1 | **Geracional** |
| Lewis Hamilton | 41 | 90 | 2.128 | −1,6 / −1,0 | Geracional na carreira; **acima da média hoje, em declínio** |
| Fernando Alonso | 45 | 87 | 1.402 | +3,1 / +2,6 | Geracional na carreira; **acima da média hoje, longevidade rara** |
| Charles Leclerc | 29 | 89 | 2.272 | +1,1 / +0,8 | Acima da média |
| Lando Norris | 27 | 88 | 2.356 | +0,9 / +0,8 | Acima da média |
| George Russell | 28 | 89 | 2.217 | +1,6 / +0,9 | Acima da média |
| Kimi Antonelli | 20 | 88 | 1.842 | −1,3 / −0,8 | Acima da média, **potencial geracional?** |
| Oscar Piastri | 25 | 84 | 2.092 | −0,9 / −0,8 | Bom (acima da média?) |
| Carlos Sainz | 32 | 83 | 1.622 | +1,2 / −0,6 | Bom |
| Pierre Gasly | 30 | 86 | 1.359 | +2,4 / +1,3 | Bom |
| Alexander Albon | 30 | 81 | 1.248 | −0,4 / +1,1 | Bom |
| Nico Hülkenberg | 39 | 84 | 1.335 | +0,4 / +1,3 | Bom, em declínio |
| Oliver Bearman | 21 | 83 | 1.320 | +1,0 / +1,1 | Bom, potencial alto |
| Isack Hadjar | 22 | 83 | 1.490 | +0,7 / −0,9 | Bom, potencial alto |
| Valtteri Bottas | 37 | 84 | 1.037 | +0,8 / −0,7 | Mediano |
| Sergio Pérez | 36 | 83 | 1.645 | −1,6 / −1,8 | Mediano |
| Gabriel Bortoleto | 22 | 82 | 1.297 | +0,1 / −0,9 | Mediano, potencial bom |
| Liam Lawson | 24 | 81 | 1.474 | −1,7 / −0,5 | Mediano |
| Arvid Lindblad | 19 | 81 | 1.373 | +0,2 / −0,7 | Mediano, potencial alto |
| Rafael Câmara | 21 | 81 | — (estreante) | — | Mediano, potencial alto (campeão da F2) |
| Franco Colapinto | 23 | 80 | 1.176 | −2,7 / −1,2 | Medíocre |
| Lance Stroll | 28 | 80 | 1.139 | −3,1 / −2,6 | Medíocre |

Com essas faixas, a F1 de 2027 iria de cerca de 77 a 95. Hoje vai de 80 a 94.

### 4.2 Fontes
Posso usar o rating do DriverDB como **uma** das evidências, junto com o duelo com o companheiro e os resultados? Ele também tem erros (por exemplo, a data de nascimento do Will Power), então nunca seria a única.

---

## 5. Dúvidas (com a minha recomendação)

1. **Geracionais hoje.** Recomendo só Verstappen no nível pleno. Hamilton e Alonso são geracionais na carreira, mas hoje rendem como "acima da média" pela idade. O Antonelli teria potencial geracional, mas ainda não nota: o jogo decide se ele chega lá. Concorda? Mudaria alguém?
2. **Quantos pilotos com 90 ou mais na F1?** Recomendo de 1 a 4 em qualquer época (hoje seriam Verstappen e 1 ou 2 no limite).
3. **Equipes no pódio por ano:** a meta de 4 a 6 (às vezes 3 ou 7) está boa?
4. **Tirar o puxão anual dos carros e o piso de diferença?** Recomendo tirar os dois. A consequência é que uma equipe rica e bem gerida pode dominar 3 a 5 anos seguidos, até um regulamento novo ou uma crise. Está de acordo?
5. **O nível aparece na tela?** Recomendo no estilo Football Manager: o jogador vê o nível estimado pelos olheiros (com margem de erro), não o número exato. Nos pilotos da própria equipe e da academia a estimativa é precisa.
6. **Carreiras em andamento:** a nova classificação dos pilotos reais vale só para carreiras novas, ou também entra nos saves existentes pela migração? Recomendo carreiras novas, mais uma opção "Recalibrar pilotos" na tela de opções para quem quiser aplicar no save atual.
7. **Patrocínio:** só o modelo novo nesta versão, com as propostas chegando pela caixa de entrada como hoje, ou também uma tela de negociação com cláusulas? Recomendo o modelo nesta versão e a tela na 0.8.4, junto com o mercado.
8. **Empréstimos:** o jogador pode pedir empréstimo (com juros e limite pelo patrimônio dos donos)? Recomendo sim, com aprovação da diretoria.

---

## 6. Decisões do dono (07/11/2026)
1. **Níveis:**
   - Antonelli entra como geracional.
   - Piastri sobe para acima da média.
   - Câmara e Bearman têm potencial de acima da média.
   - Bortoleto é bom.
   - O nível é oculto e define o teto do potencial.
   - Escala única do automobilismo:
     - níveis de F1: geracional 96 no auge, acima da média 90, bom 88, mediano 86, medíocre 84;
     - abaixo da F1: Vencedor 82 (campeões de categoria), Pelotão 78 (meio de grid), Coadjuvante 74 (fundo de grid, carreira mais curta).
   - O nível não define a carreira.
2. **Pilotos com nota ≥ 90 na F1:** de 1 a 6. Seis é raro, cinco é difícil, 3–4 é o normal e 1–2 é o mínimo.
3. **Pódio:** meta de 4 a 6 equipes aprovada.
4. **Carros:** tirar o puxão anual e o piso de diferença (aprovado).
5. **Nível na tela:** só estimado, à la Football Manager. Os olheiros devem ser reformulados no estilo F1 Manager / Football Manager.
6. **Saves:** deixar para depois da V1 (lembrete em `docs/PENDENCIAS-V1.md`).
7. **Patrocínio:**
   - O modelo novo agora, com valores realistas.
   - Buscar todos os logos que faltam.
8. **Empréstimos:** não entram.
9. **Rating do DriverDB:** pode ser usado como uma das evidências.
10. **F1:** nota mínima de 80.
11. **Academia reformulada:**
    - negociação e contrato iguais aos reais, com salário bem menor;
    - acompanhamento de onde e como cada piloto corre;
    - sugestão de categoria (ex.: F4 Brasil → FRECA, ou mais um ano numa F4 europeia).
12. **Licenças de circuito:** verificar o sistema de licenças e Grau 2 → Grau 1, que tinha sumido. Resultado: o sistema funcionava, mas não tinha tela; nova tela "Circuitos e licenças".
