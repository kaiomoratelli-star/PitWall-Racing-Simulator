# Changelog

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
