# Changelog

## 1.0.0 — V1: o universo completo
**Pilotos, contratos e mercado**
- Contratos reais de todos os pilotos da F1 (duração, opções, cláusulas, salários estimados), empresários, academias reais (Ferrari, Red Bull, Mercedes, McLaren, Alpine, Williams, Aston Martin, Audi) e superlicença com a tabela de pontos da FIA.
- 16 atributos e 16 estilos de pilotagem com efeito real na corrida, personalidade (ambição, lealdade, temperamento, mídia).
- Mercado em ondas (silly season): rumores, aposentadorias anunciadas, renovações, pré-contratos, demissões no meio do ano, negociação com contrapropostas.
- 15 funções de staff com nomes reais (diretor técnico, chefe de aerodinâmica, engenheiros de corrida, chefe de estratégia...), contratação com "gardening leave".

**Corrida**
- Compostos C1–C5 escolhidos por GP (Pirelli 2026), temperatura de pneu e de pista, clima por latitude, mês e horário (corridas noturnas), umidade e vento.
- Setores, velocidade máxima, bateria e modo de ultrapassagem por energia (regulamento 2026), limites de pista, bandeira vermelha.
- Nova tela de corrida: luzes de largada, torre com setores, Pit Wall dos dois carros, gráfico de líderes, previsão de estratégia.

**Regulamento, calendário e carro**
- Regulamento técnico, de desenvolvimento e esportivo editável, com mudanças programadas por temporada (ATR por posição, limite de unidades de potência e punições no grid, formato da classificação, pontos pela pole, grid invertido, rigor dos comissários).
- Calendário com datas, Sprints, distância entre etapas, rodadas consecutivas, otimização de logística e frete por distância.
- Gerador de circuitos com traçado procedural e perfil técnico coerente.
- P&D com 15 áreas, responsável, risco e impacto na confiabilidade; foco no carro do ano seguinte; projeção financeira do fim da temporada.

**Mundo vivo**
- Portal de notícias com veículos reais e imagens, rede social com perfis reais de pilotos, equipes e imprensa, memória de histórias e marcos (comparados à história real desde 1950).
- Rivalidades que nascem de batidas e disputas, esfriam com o tempo e deixam os rivais mais agressivos na pista.
- Escândalos raros, sempre com pessoas e organizações fictícias.
- Sons sintetizados (motor, luzes, pit stop, Safety Car) e animações discretas.
- Páginas de equipe (linhagem real, títulos, chefes de equipe) e de circuito (recordes de volta e vencedores), recordes de temporada no Hall da Fama.

**Outras categorias**
- F2, F3, Fórmula Regional Europeia, Fórmula Regional do Oriente Médio, Fórmula Regional das Américas, Fórmula Regional do Japão, F4 Italiana, Espanhola, Britânica, E4, F4 Brasil, F4 Estados Unidos, F4 Japonesa, Super Formula e Fórmula E, com grids, calendários e classificações reais de 2026.
- Fotos oficiais de pilotos e carros da F2/F3, equipes da Fórmula E e fotos do Wikimedia Commons.
- Simulação sincronizada pelas datas da F1, pontuação de cada série, superlicença, progressão F4 → regionais → F3 → F2 → F1 e novos talentos gerados a cada ano.

**Qualidade**
- Balanceamento carro × piloto, talentos em faixas de potencial, teste de 20 temporadas sem erros, varredura de todas as telas, migração automática de saves antigos (v1–v3 → v4).

## 0.3.0 — Dados reais e identidade F1
- Base padrão com a **F1 2026 real**: 11 equipes (com Audi e Cadillac), 22 titulares, reservas e pilotos fora do grid, motores, chefes de equipe, patrocinadores e o calendário de 23 etapas com as 6 Sprints.
- Notas dos pilotos e dos carros estimadas a partir dos resultados reais (últimas 3 temporadas, comparação com o companheiro, forma em 2026).
- Totais reais de carreira de cada piloto (GPs, vitórias, pódios, poles, títulos, pontos).
- **História real desde 1950**: navegador de temporadas e **Hall da Fama** com filtros por período, fonte (real/simulada) e nacionalidade. Dados reais e simulados sempre identificados.
- Fotos oficiais dos pilotos, carros 2026, logos das equipes, mapas oficiais e fotos dos circuitos.
- **Traçados reais** no mapa da corrida ao vivo.
- **Corridas Sprint** com pontuação própria (8 a 1).
- Novo visual inspirado na F1: vermelho oficial, preto-carbono e Titillium Web.
- Economia da IA proporcional ao teto orçamentário real; eficiência depende de staff e instalações.
- Removidos todos os textos com "IA" da interface.

## 0.2.0 — Aplicativo Windows e memória do universo
- Aplicativo desktop (Electron) com instalador `Setup.exe`, atalhos na área de trabalho e no menu Iniciar, ícone próprio, tela de abertura, janela redimensionável e tela cheia (F11).
- Saves em `%APPDATA%\PitWall Racing Simulator` com gravação atômica, 5 backups por save e recuperação automática. Logs com rotação.
- Fontes empacotadas: o jogo funciona offline.
- Migração de saves (v1 → v2).
- Modo Observador.
- IA dos chefes de equipe com caixa, personalidade, teto orçamentário, investimentos e contratação de staff.
- Registro permanente do universo, arquivo de temporadas, histórico por piloto e equipe, página do piloto.
- Tela Diagnóstico com verificação de integridade e reparo.
- Notícias baseadas em fatos (sequência de abandonos, troca de liderança, primeira vitória, duelo interno).
- Testes: simulação prolongada (`npm test`) e teste do executável (`npm run test:smoke`); CI no Windows.

## 0.1.0 — Primeira versão web
