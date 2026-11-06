# Changelog

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
