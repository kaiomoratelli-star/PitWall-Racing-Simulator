# PitWall Racing Simulator

Simulador de gestão de automobilismo (monopostos) em português, para **Windows 10 e 11 (64 bits)**.

- **Modo Manager:** você comanda uma equipe, com acerto, estratégia ao vivo, contratos, staff, P&D, finanças e diretoria.
- **Modo Observador:** todas as equipes são da IA e você acompanha o campeonato sem interferir.
- Universo com memória: cada contrato, investimento, título e aposentadoria fica registrado.
- Base de dados 100% editável (regras, equipes, pilotos, pistas, motores, calendário), com importação e exportação em JSON.

## Instalar
Baixe `PitWall-Racing-Simulator-Setup-<versão>.exe` em **Releases** (ou no artefato da última
execução do GitHub Actions) e execute-o. O jogo cria atalhos na área de trabalho e no menu Iniciar.
Não precisa de internet, navegador nem ferramentas de desenvolvimento.

Saves: `%APPDATA%\PitWall Racing Simulator\saves`. São preservados ao atualizar ou desinstalar.

## Desenvolver
```
npm install
npm run dev        # jogo com ferramentas de desenvolvedor
npm test           # simulação prolongada com diagnóstico
npm run test:smoke # testa o aplicativo real
npm run dist       # gera o instalador (no Windows)
```
Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e próximos passos em [docs/ROADMAP.md](docs/ROADMAP.md).

## Créditos dos dados
- Resultados, pilotos, equipes e circuitos de 1950 até hoje: [f1db](https://github.com/f1db/f1db) (CC BY 4.0).
- Fotos de pilotos, carros, logos e mapas oficiais: formula1.com (uso pessoal, sem fins comerciais).
- Geometria real dos circuitos: [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT).
- Para atualizar os dados: `python3 scripts/import_real_data.py`.
