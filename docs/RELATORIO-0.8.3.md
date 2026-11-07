# Relatório da V0.8.3 — talento, carros, academia, olheiros e patrocínio

Data: 07/11/2026. Plano e decisões do dono: `docs/PLANO-0.8.3.md`. Simulações completas: `docs/RELATORIO-SIMULACAO.md`.

## 1. Resumo executivo

**Implementado (as 12 respostas do dono)**
1. **Nível oculto que define o teto do potencial**, na escala única do automobilismo:
   - níveis de F1: Geracional 96, Acima da média 90, Bom 88, Mediano 86, Medíocre 84;
   - abaixo da F1: **Vencedor** 82 (ganha títulos nas categorias de acesso e profissionais), **Pelotão** 78 (meio de grid) e **Coadjuvante** 74 (fundo de grid, carreira curta).
   - O nível não decide a carreira.
2. Pilotos com nota 90 ou mais na F1: de 1 a 6. **Medido: sempre de 1 a 5, média de 2 a 2,8.**
3. Pódio: meta de 4 a 6 equipes. **Medido: média de 4,6 a 6,7.**
4. Fim da equalização artificial dos carros.
5. Nível só estimado na tela, com olheiros reformulados no estilo FM / F1 Manager.
6. Saves deixados para depois da V1 (lembrete em `docs/PENDENCIAS-V1.md`).
7. Patrocínio completo com valores realistas, mais os logos que faltavam.
8. Sem empréstimos.
9. DriverDB usado como uma das evidências.
10. Titular da F1 com nota mínima de 80.
11. Academia reformulada.
12. Licenças de circuito: o sistema funcionava, mas sem tela; nova tela **Circuitos e licenças**.

## 2. Pilotos e talento

**Níveis do grid da F1 (decisão do dono)**

| Nível | Pilotos |
|---|---|
| Geracional | Verstappen, Antonelli, Hamilton, Alonso |
| Acima da média | Leclerc, Norris, Russell, Piastri, Câmara, Bearman |
| Bom | Sainz, Gasly, Albon, Hülkenberg, Hadjar, Bortoleto, Lindblad |
| Mediano | Bottas, Pérez, Lawson |
| Medíocre | Colapinto, Stroll |

Os demais 1.200 pilotos recebem o nível automaticamente pela nota, idade e posição real em 2026. Há sorteio raro para quem sobe a "acima da média".

**Censo na carreira nova (1.242 pilotos ativos)**

| Nível | Pilotos | % |
|---|---|---|
| Geracional | 5 | 0,40% |
| Acima da média | 11 | 0,89% |
| Bom | 39 | 3,1% |
| Mediano | 54 | 4,4% |
| Medíocre | 73 | 5,9% |
| Vencedor | 159 | 12,8% |
| Pelotão | 242 | 19,5% |
| Coadjuvante | 659 | 53,1% (inclui o kart, que é fictício) |

**Antes e depois**

| Métrica | 0.8.2 | 0.8.3 |
|---|---|---|
| Potencial de 90 ou mais no início | 33 (2,6%) | 16 (1,3%), sendo 5 geracionais |
| Veteranos de 34 a 42 anos com potencial 90+ | 7 | 0 |
| Pilotos da F1 com 90+ em 10 anos | 1 → 8 | 1 a 3 |
| Diferença entre o melhor e o pior atributo de um piloto | cerca de 5 | cerca de 15 (perfil real; nenhum atributo foge mais de 12 da tendência) |
| Pilotos ativos em 50 anos | 1.242 → cerca de 660 | 1.242 → 1.110 |
| Faixa de notas da F1 no início | 80–94 | 80–94 (mínimo de 80 garantido) |

**O que mudou no motor**
- Teto rígido por nível. Corrigido o vazamento: a evolução passava do potencial, e o potencial "seguia" a nota.
- Evolução fecha uma fração da distância até o pico esperado: mais rápida quanto mais jovem e quanto mais alto o nível de competição.
- Idade: queda a partir dos 34 anos (37 com longevidade), com os reflexos caindo antes da experiência.
- Talento de elite não some por temporadas ruins: o pico esperado cai no máximo alguns pontos. A carreira, porém, ainda pode decepcionar por falta de vaga ou de carro.
- Séries fora do jogo recebem pilotos novos, e o kart não encolhe mais (nomes únicos).

## 3. Carros e equilíbrio

**O que saiu:** o puxão anual para uma média fixa, o piso de diferença entre carros e a compressão extra na troca de regulamento.

**O que entrou:**
- Carro novo mantém a distância para a média do grid.
- Capacidade técnica e **eficiência da organização** (oculta e lenta, por resultados e crises) pesam no rendimento do dinheiro, para a IA e para o jogador.
- A IA tem fila de projetos com vagas, prazos, falhas, problemas de correlação e peças que ganham desempenho perdendo confiabilidade.
- Menos sorte por fim de semana (antes cerca de 1,8 ponto de carro), e nem toda batida neutraliza a corrida.

**Simulações (modo Observador; média por temporada)**

| Teste | Equipes vencedoras | Equipes no pódio | Pilotos com 90+ na F1 | Desvio entre carros | Campeões de construtores |
|---|---|---|---|---|---|
| 5 anos (semente 1) | 3,4 | 4,6 | 1,8 (1–2) | 3,2 | Ferrari 3, Mercedes 2 |
| 10 anos (semente 11) | 4,1 | 5,2 | 2,0 (1–3) | 3,4 | Mercedes 5, Red Bull 5 |
| 10 anos, Manager | 3,6 | 5,7 | 2,5 (2–3) | 3,3 | Ferrari 5, Red Bull 3, Mercedes 2 |
| 20 anos (semente 11) | 4,2 | 6,1 | 2,0 (1–3) | 4,1 | Mercedes 9, Red Bull 6, Ferrari 3, McLaren 2 |
| 30 anos (semente 7) | 4,0 | 5,9 | 2,5 (2–4) | 4,5 | Mercedes 16, Ferrari 10, McLaren 3, Red Bull 1 |
| 50 anos (semente 3) | 4,5 | 6,7 | 2,8 (1–5) | 4,5 | Ferrari 22, McLaren 14, Mercedes 10, Red Bull 4 |

Na 0.8.2, os mesmos testes davam 5 a 9 equipes vencedoras e 8 a 10 no pódio. Há ciclos de domínio: uma equipe fica na frente vários anos e perde a posição numa troca de regulamento ou numa crise.

**Ainda acima da meta:** as equipes vencedoras (média de 4, meta de 2 a 4) e o pódio no teste de 50 anos (6,7). Na F1 real o pódio vai de 4 a 7 equipes (2020 e 2021 tiveram 7).

## 4. Academia e olheiros

**Academia**
- Negociação com contrato de júnior: salário, duração e multa.
- O piloto pesa o salário, o prestígio da academia e as academias rivais interessadas.
- Custeio do assento (F4 ~$350K, regional ~$900K, F3 ~$1,2M, F2 ~$2,6M).
- A tela mostra, para cada membro, onde corre, a posição no campeonato, a nota e o nível estimado.
- Plano para o ano seguinte (ficar, subir ou trocar de região), cumprido na virada do ano.
- Contratos com renovação; a IA também contrata juniores.
- Teste: um júnior da F4 Brasil pediu cerca de US$ 210 mil por ano e tinha 2 academias rivais interessadas. Depois de assinar, o plano de ir para a FRECA foi cumprido. A academia da Williams custou US$ 4,15 milhões por ano entre salários e assentos.

**Olheiros**
- Departamento de até 6 olheiros, com nome, região, qualidade de avaliação e salário, e mercado anual.
- Missões: observar um piloto, cobrir uma categoria ou procurar talentos numa região.
- O jogador vê o **nível estimado** (estrelas, faixa e confiança), nunca o real.
- Teste: Freddie Slater começou estimado como "Bom" (confiança baixa). Depois de 4 etapas observado, a estimativa foi "Medíocre" (confiança alta), que é o nível real dele nesta carreira.

## 5. Patrocínio e logos

**Patrocínio**
- Marcas com segmento e porte.
- Exclusividade: uma marca por segmento em cada equipe, e marca de rival não fecha com você.
- Cláusula de posição no Mundial e rompimento no meio do ano.
- As equipes da IA ganham e perdem marcas conforme os resultados.
- Valores dentro do mercado de cada equipe:
  - principal da Mercedes (Petronas): cerca de US$ 80 milhões por ano;
  - principal da Haas (Toyota): cerca de US$ 40 milhões;
  - marcas menores: de 3 a 11 milhões.

**Logos**
- Marcas: de 18 para 60 dos 67 do banco (todos conferidos visualmente; o "BOSS" que veio era de outra empresa e foi descartado).
- Novo: Eurocup-4. FOM, IMSA, NASCAR e os pneus já tinham entrado na 0.8.2.
- Seguem sem logo, usando a sigla ou o nome: FR Américas, Formula Winter Series, F4 CEZ, ACO, MSC Cruises, Bitpanda, Allwyn, Mobil 1, Castore, Hantec Markets e Hugo Boss. Não há logo confiável nas fontes consultadas (Wikipedia, Wikidata/Commons, DriverDB).

## 6. Circuitos e licenças (item 12)
- **Diagnóstico:** a vistoria anual existia e funcionava (em 4 anos simulados, Zolder, Laguna Seca, Lime Rock, Dijon, Sugo e Road America subiram ao Grau 1). Mas não havia tela no menu, e as vistorias só apareciam como notícia.
- **Correção:**
  - nova tela **Circuitos e licenças**, com filtros por calendário, Grau 1, Grau 2 e outros;
  - grau, validade e origem da licença: lista oficial da FIA, calendário oficial da F1 ou simulação do jogo;
  - última vistoria de cada circuito e resumo dos promovidos.
  - Portimão e Istambul, que estão no calendário oficial de 2027, passam a contar como Grau 1.

## 7. Dados que existiam e não eram usados
- **Usado agora:** o duelo real com o companheiro na F1 (classificação e corrida, das últimas 3 temporadas), importado na 0.8 e nunca usado. Ele define os pontos fortes e fracos dos pilotos da F1.
- **Usado agora:** os logos das equipes nos perfis do DriverDB, já aproveitados na 0.8.2.
- **Ainda sem uso:**
  - as siglas de 3 letras dos pilotos (a torre de tempos usa o sobrenome);
  - os empresários dos pilotos (aparecem só na página do piloto);
  - o comprimento OSM dos traçados.
- **Já com uso, ao contrário do que a varredura automática indicou:** histórico de 1950 em diante (temporadas, construtores e circuitos), recordes e linhagens.

## 8. Testes

| Teste | Resultado |
|---|---|
| `npm test` (escopo, 10 e 4 temporadas, modos Manager e Observador, migrações v1/v3/v4 → v7) | OK, 0 erros |
| Estresse da interface ao vivo (português e inglês; Observador e Manager) | OK, sem erros |
| Teste do aplicativo Electron (carreira, corrida, salvar, fechar, reabrir) | OK, 0 erros |
| Telas novas (academia, negociação, olheiros, circuitos, finanças e equipe) em português e inglês | 0 erros de página |
| Save da 0.8.2 publicada (etapa 6) aberto na 0.8.3 | abre, termina a temporada e segue, com 0 erros |
| Simulações de 5, 10 (Manager e Observador), 20, 30 e 50 anos | 0 duplicatas, 0 erros de integridade, nenhum estouro do teto pela IA |

**Pendências conhecidas**
- Em 4 a 5 de 50 temporadas, a F1 teve um titular abaixo de 80 (substituto de emergência sem opção melhor livre).
- Alguns textos dinâmicos da página do piloto ainda aparecem em português no modo inglês (cláusulas de contrato vindas da base).

## 9. Arquivos

**Novos**
- Código: `app/src/talent.js`, `app/src/cardev.js`, `app/src/academy.js`, `app/src/scouting.js`.
- Dados: `app/data/driver-tiers.js`, `app/data/sponsor-brands.js`.
- Documentação: `docs/PLANO-0.8.3.md`, `docs/RELATORIO-0.8.3.md`, `docs/PENDENCIAS-V1.md`.
- Imagens: logos de marcas e da Eurocup-4.

**Modificados**
- Núcleo: `ai.js`, `career.js`, `cats.js`, `circuits.js`, `driverdb.js`, `econ.js`, `engine.js`, `kart.js`, `market.js`, `rnd.js`.
- Interface: `ui-circuits.js`, `ui-people.js`, `ui-scout.js`, `i18n-en.js`.
- Scripts: `scripts/audit.js`, `scripts/modules.js`, `scripts/import_logos.py`.
- Projeto e documentação: `package.json`, `package-lock.json`, `CHANGELOG.md`, `docs/RELATORIO-SIMULACAO.md`, `app/data/asset-registry.js`, `app/assets/img/sources.json`.

## 10. Próxima etapa: V0.8.4 (aguarda autorização)
Pelo documento mestre: equipes, mercado, política, eventos e refinamento visual.
- **Mercado completo:** concorrência entre as equipes da IA pelo mesmo piloto, janelas, pré-contratos disputados e tela de negociação de patrocínio com cláusulas.
- **Ciclo de vida das equipes:** valor de mercado, venda, falência, saída do grid e entrada de equipe nova com plano de negócios e aprovação política.
- **Política:** poder de veto diferenciado e concessões em troca de votos no Conselho.
- **Eventos:** nível de caos de 0 a 4 e escândalos encadeados.
- **Interface:** calendário mensal, pódio e cartões de piloto.

**Dúvida para a 0.8.4:** o número de equipes vencedoras por ano ainda fica em média em 4 (a meta era de 2 a 4). Posso reduzir mais a variação de corrida, mas isso deixa as corridas mais previsíveis. Prefere manter como está?
