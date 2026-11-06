# PitWall Racing Simulator

Simulador de gestão de automobilismo (monopostos) em português, para **Windows 10 e 11 (64 bits)**.

- **Modo Manager:** você comanda uma equipe, com acerto, estratégia ao vivo, contratos, staff, P&D, finanças e diretoria.
- **Modo Observador:** todas as equipes são da IA e você acompanha o campeonato sem interferir.
- Universo com memória: cada contrato, investimento, título e aposentadoria fica registrado.
- F1 2026 real (equipes, pilotos, contratos, staff, academias, calendário) e a história desde 1950 separada da história simulada.
- 15 outras categorias simuladas ao mesmo tempo: F2, F3, regionais, sete campeonatos de F4, Super Formula e Fórmula E. Os pilotos sobem de categoria até a F1.
- Corrida volta a volta com pneus C1–C5, temperatura, clima por local e data, setores, bateria 2026 e Pit Wall.
- Imprensa e rede social reais, rivalidades, recordes e escândalos fictícios raros.
- Base de dados 100% editável (regras, regulamento por temporada, equipes, pilotos, pistas, gerador de circuitos, motores, calendário, categorias), com importação e exportação em JSON.

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
- Outras categorias (grids, calendários e classificações 2026): Wikipedia; datas de nascimento e redes sociais: Wikidata; fotos: sites oficiais da F2, F3 e Fórmula E e Wikimedia Commons.
- Para atualizar os dados: `python3 scripts/import_real_data.py`, `python3 scripts/import_records.py` e `python3 scripts/import_categories.py`.
