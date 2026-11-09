# Avaliação do jogo (V0.8.3) e roadmap da V0.8.4

Data: 08/11/2026. Base: tudo o que foi auditado, medido e simulado da 0.8.2 até a 0.8.3 (relatórios em `docs/`). Notas de 0 a 10, comparando com o objetivo do documento mestre: profundidade de Football Manager e apresentação de F1 Manager.

## 1. Onde estamos
| Versão | Tema | Situação |
|---|---|---|
| 0.8.2 | Auditoria, integridade da database, calendário 2027, contenção econômica | Publicada |
| 0.8.3 | Talento oculto, carros sem equalização, academia, olheiros, patrocínio, circuitos; calibração com a F1 real | Publicada (instalador atualizado em 08/11) |
| **0.8.4** | **Mercado, equipes (ciclo de vida), política, eventos, notícias e interface** | **Este documento: aguarda aprovação** |
| 0.9 | Expansão esportiva e administrativa (funcionários, química, rádio, comissários, categorias jogáveis...) | Depois da 0.8.4 |
| 1.0 | Carreira de piloto, Sandbox, modos especiais, preparação para lançamento | Depois da 0.9 |

## 2. Avaliação completa

Medições de uma carreira de 20 anos (modo Observador):
- **Desempenho:** save de 2,6 MB no ano 1, 3,7 MB no ano 10 e 4,5 MB no ano 20; cada temporada simula em cerca de 3 s.
- **Eventos:** 11 histórias raras em 20 anos, de apenas 4 tipos:
  - 5 mortes por causas naturais;
  - 2 escândalos;
  - 3 problemas de túnel de vento;
  - 1 de logística.
- **Equipes:** 3 anos-equipe em crise em 20 anos. Nenhuma troca de dono, venda, falência, saída ou entrada no grid; o grid é sempre o mesmo de 11 equipes.
- **Conselho da FIA:** 45 propostas votadas em 20 anos.

| Área | Nota | Pontos fortes | O que falta |
|---|---|---|---|
| Simulação de corrida | **7,5** | Volta a volta com pneus C1–C6, temperatura, ERS, clima por região, SC/VSC/bandeira vermelha, estratégia, narração, sprint, classificação ao vivo; calibrada com a F1 real (vencedores, pódios, peso do carro) | Danos individuais, ordens de equipe completas, comissários e punições mais ricas (0.9) |
| Database | **7** | Cerca de 1.400 pilotos; uma pessoa, um registro; 22 séries conferidas com o DriverDB; grid real de 2026 com status de cada vaga; calendário oficial de 2027 | 323 pilotos ativos sem nascimento (F4 e kart); 45 datas divergentes para revisão; contratos de 2027 ainda estimados |
| Pilotos e talento | **8** | Nível oculto com teto, raridade calibrada, perfis reais (duelo com o companheiro), curva de idade, teto dinâmico até os 23 anos, universo estável por 50 anos | Personalidade pesa pouco no dia a dia (moral, química e relação com o chefe ficam para a 0.9) |
| Carros e P&D | **7,5** | Sem equalização artificial, eficiência das organizações, IA com as mesmas falhas do jogador, conceito no regulamento novo, troca de forças calibrada | Congelamento de chassi e motor negociado no Conselho; limite de testes; componentes de motor com punição (0.9) |
| Economia | **6,5** | Receitas reais por componente, custo de fábrica, teto auditado para todos, patrimônio separado, patrocínio por segmento com exclusividade | Sem dívida estruturada; os donos não tomam decisões (vender, investir, sair); premiação simplificada |
| Mercado e contratos | **5** | Negociação com contraproposta, cláusulas de saída e desempenho, multa mínima e consentimento da equipe, pré-contratos, superlicença, academias disputando juniores | As equipes da IA não disputam o mesmo piloto entre si; não há janelas nem "silly season" com rumores e leilão; empresários existem nos dados mas não negociam; não há direitos de imagem |
| Equipes: lado corporativo | **3** | Equipes irmãs (compra e academia compartilhada), identidade por temporada (nome e patrocinador principal) | **Nada de dono, valor de mercado, venda, falência, saída ou entrada de equipe nova**: o maior buraco do jogo, segundo o próprio documento mestre |
| Política | **5** | Conselho com propostas, impacto por equipe, votos e negociação | Todos votam com o mesmo peso; sem veto (Ferrari), sem concessões em troca de voto; a política não decide entrada de equipe nem congelamento de motor |
| Eventos e histórias | **4,5** | Escândalos fictícios, mortes naturais (opcional), raridade correta | Pouca variedade (4 tipos em 20 anos); sem nível de caos de 0 a 4; sem consequências em cadeia; sem investigação; sem morte em acidente com probabilidade por época e segurança |
| Mídia e notícias | **6,5** | Portal, rede social, veículos reais, artes automáticas (breaking, oficial, resultado, campeão) | Arte só para 4 tipos; sem infográficos de recorde e histórico; textos gerados antigos não se traduzem |
| Outras categorias | **7** | 23 séries simuladas por data, com grids reais, progressão e superlicença | Só a F1 é jogável (categorias jogáveis ficam para a 0.9) |
| Academia e olheiros | **7,5** | Contratos, plano de carreira, custeio de assento, rivais; olheiros com missões e nível estimado | Relatórios mais ricos (vídeo, comparação com jogadores-referência); lesões e problemas de financiamento do júnior |
| Interface | **6** | Muitas telas e dados; português e inglês; identidade visual da F1 | Painel principal carregado; **sem calendário mensal** no estilo F1 Manager; cartões de piloto não padronizados; pódio e pós-corrida podem crescer; algumas frases ainda em português no modo inglês |
| Técnica e estabilidade | **8** | Determinístico, testes de 5 a 50 anos, auditoria de realismo, teste do Electron, CI no Windows com instalação real, saves com backup | O fim de temporada passa por cerca de 12 módulos encadeados (risco de ordem); falta migração final de save (adiada até a V1) |
| Distribuição | **7** | Instalador NSIS testado no CI, saves em `%APPDATA%`, logs | Sem atualização automática dentro do app; sem assinatura digital (aviso do Windows SmartScreen) |
| Licenças | ⚠️ | Fontes registradas por arquivo (`sources.json`) | Fotos, logos e nomes reais precisam de licença ou substituição **antes de qualquer venda** |

**Nota geral: cerca de 6,5/10 em relação ao objetivo.** A base esportiva (pilotos, carros, corrida, categorias) está forte e calibrada com dados reais. O que mais separa o jogo de um "FM do automobilismo" é o mundo em volta da pista: equipes como empresas, mercado vivo, política e histórias. É exatamente o escopo da 0.8.4.

## 3. Roadmap da V0.8.4

**Recomendação: dividir em duas entregas**, porque o escopo do documento mestre para a 0.8.4 é o maior até agora:
- **0.8.4 — O mundo:** mercado, equipes, política e eventos.
- **0.8.5 — Interface e imersão:** painel, cartões, calendário mensal, pódio, notícias visuais e gestão de corrida.

Cada entrega segue o mesmo processo: implementar, medir, testar e apresentar o relatório.

### 0.8.4-A — Mercado de pilotos vivo
1. **Janelas:** "silly season" a partir das férias de verão; rumores na mídia com fonte e confiabilidade; anúncios em ondas.
2. **Leilão de verdade:** várias equipes da IA disputam o mesmo piloto; o piloto escolhe pelo projeto, salário, prestígio, papel e relação com o chefe. O jogador pode perder um alvo para um rival.
3. **Empresários** (os nomes reais já estão nos dados): negociam comissão, empurram o piloto para a melhor proposta e vazam interesse para a mídia.
4. **Contratos mais completos:** direitos de imagem, opções de renovação (da equipe e do piloto), bônus por pódio e título, salário escalonado.
5. **Renovações da IA com antecedência:** as equipes travam os pilotos-chave antes da silly season.
6. **Meta:** troca de equipe dos pilotos de ponta com frequência parecida com a real (medida de 2000 a 2025 pelo histórico da base).

### 0.8.4-B — Equipes como empresas (o maior buraco)
1. **Dono e valor de mercado:**
   - cada equipe tem dono (montadora, bilionário, fundo, grupo), ambição e paciência;
   - valor estimado pelo resultado, receita, patrimônio, dívida e instalações.
2. **Decisões dos donos:** aumentar ou cortar o aporte, trocar o chefe de equipe, colocar a equipe à venda.
3. **Venda:**
   - compradores interessados (montadoras e grupos), negociação de preço, assunção de dívidas;
   - troca de nome e identidade com linhagem preservada, como Sauber → Audi;
   - não acontece de uma hora para outra: exige aprovação.
4. **Crise e saída:** dívida acumulada, perda de patrocinadores, salários atrasados. Sem comprador, a equipe sai do grid e a vaga fica aberta.
5. **Entrada de equipe nova:**
   - candidatura com plano de negócios e nível de ambição (sobreviver, médio prazo, pódios, títulos em X anos);
   - investimento inicial, fábrica, motor e contratações;
   - aprovação da FIA e da categoria, com a posição das equipes atuais.
   - O processo leva de 1 a 2 anos.
6. **Equipes irmãs e parceiras:** irmã (controle comum) e parceira (acordo técnico ou de motor) com regras diferentes; limites para transferência de tecnologia.
7. **Metas medidas em 50 anos:**
   - 2 a 5 vendas ou trocas de dono;
   - 1 a 3 saídas;
   - 1 a 3 entradas;
   - equipes em crise de verdade de vez em quando, mas não todo ano.

### 0.8.4-C — Política
1. **Peso de voto diferenciado** e **veto** conforme o acordo vigente (o veto histórico da Ferrari, por exemplo), com data de validade.
2. **Concessões:** a categoria oferece dinheiro, horas de túnel ou exceções em troca de apoio (por exemplo, aceitar uma equipe nova ou um congelamento de motor).
3. **A política decide de verdade:** entrada de equipe, congelamento de motor, mudança de regulamento e teto de gastos.
4. **Bastidores:** alianças e blocos (equipes clientes votam com a fornecedora de motor), com notícias de bastidor.

### 0.8.4-D — Eventos, escândalos e consequências
1. **Nível de caos** 0–4 (Desligado, Raro, Normal, Novela, Caos), com opções por tipo de evento. A frequência é calibrada sem forçar eventos.
2. **Catálogo de eventos** (sempre com pessoas e organizações fictícias):
   - manipulação de resultado (estilo Crashgate);
   - espionagem industrial;
   - vazamento;
   - fraude financeira;
   - apostas ilegais;
   - conflito interno;
   - festas e tabloides (só por insinuação);
   - sabotagem;
   - fraude regulamentar;
   - escândalo extremista, tratado como gravíssimo.
3. **Cada evento tem:** precondições, probabilidade, gravidade, tempo mínimo até repetir, decisões, consequências imediatas e futuras, investigação, reação da imprensa e registro permanente. Um evento pode gerar outros.
4. **Morte em acidente:** extremamente rara, com probabilidade pela época, pela segurança do carro e do circuito e pela categoria. É tratada com gravidade: luto, homenagem, investigação e revisão de segurança, sem ser usada como punição.
5. **Lesões** com gravidade e substituto.
6. **Meta:** no nível Normal, de 3 a 5 eventos grandes por temporada, de tipos variados e sem repetição exagerada com o mesmo personagem.

### 0.8.5 — Interface e imersão
1. **Painel principal** reorganizado: situação, próximo compromisso, classificação, resultados, notícias, finanças, pilotos, desenvolvimento e objetivos.
2. **Cartões de piloto** reutilizáveis (foto, bandeira, equipe, número, nota, nível estimado, contrato, moral) em mercado, classificação e resultados.
3. **Calendário mensal** no estilo F1 Manager: grade com dias da semana, navegação entre meses sem mudar a data, eventos de todas as categorias, filtros. O botão "Continuar" leva ao próximo compromisso.
4. **Pódio pós-corrida** visual (troféu, fotos, logos, bandeiras), com comemoração quando o piloto é seu e alternância com a análise completa.
5. **Notícias visuais:** artes para recordes, investigações, atualizações técnicas, eventos históricos, com infográficos; arte gerada sob demanda para notícias antigas.
6. **Gestão de corrida:** controles por piloto (ritmo de pneu, ERS por categoria, ataque e defesa).
7. **Revisão completa do inglês.**

## 4. O que preciso de você
1. **Aprova dividir em 0.8.4 (o mundo) e 0.8.5 (interface)?** Recomendo que sim: dá para testar o mundo antes de redesenhar as telas.
2. **Equipes novas:** os candidatos ao grid podem usar marcas reais (Toyota, Porsche, Hyundai, BYD...) como projetos fictícios, ou só equipes inventadas? Recomendo marcas reais, sempre marcadas como "projeção do jogo".
3. **Equipes reais podem falir ou ser vendidas na sua carreira** (uma Haas vendida, uma Williams em crise)? Recomendo que sim, com baixa probabilidade e sempre explicado pelos números.
4. **Veto da Ferrari:** ativar (era real até o acordo de 2021, e hoje tem forma mais limitada) ou deixar todos com o mesmo peso? Recomendo ativar, com a validade de cada acordo.
5. **Nível de caos padrão e morte em acidente:** recomendo caos 2 (Normal) e morte em acidente **desligada por padrão**, com opção para ligar.
6. **O jogador pode comprar uma equipe ou fundar uma nova nesta fase**, ou isso fica para o Sandbox da 1.0? Recomendo que, na 0.8.4, o jogador apenas viva as consequências (dono novo, venda, fusão) e que a criação de equipe pelo jogador fique para a 1.0.
7. **Referências visuais para a 0.8.5:** se quiser, mande capturas de tela do F1 Manager ou do EA FC 27 das telas que mais gosta (calendário, painel, pódio).
8. **Retorno de quem jogou a 0.8.3:** qualquer coisa estranha em partida real (finanças, mercado, telas) entra como correção na 0.8.4.

## 5. Lembretes
- Saves: migração completa e opção "Recalibrar" só depois da V1.0 (`docs/PENDENCIAS-V1.md`).
- Antes de vender: licenças de imagens, logos, nomes e da fonte Formula1 Display; assinatura digital do instalador (opcional, tira o aviso do Windows).
