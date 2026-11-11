# Plano da 0.9 — Aprimoramento e Reconstrução

Data: 11/11/2026. **Decisão do dono:** a 0.9 é 100% focada em aprimorar o jogo que já existe e em
algumas reconstruções:
- atualizar o Electron para a versão mais nova;
- criar pistas melhores;
- dar à corrida uma visualização 2D de verdade.

Nenhum modo de jogo novo entra nesta versão.

**Carreira de Piloto: adiada.** A fundação (fase 0.9-A) ficou pronta e guardada na branch
`v0.9-piloto` (commit `e7a3992`). O plano dela foi para
[`historico/PLANO-0.9-carreira-piloto.md`](historico/PLANO-0.9-carreira-piloto.md) e volta numa versão
futura, ainda sem número. Desta branch vieram só as peças gerais:
- a regra de sintaxe do `guard-check`;
- `shots/` no `.gitignore`;
- a limpeza de capturas que tinham sido commitadas.

**Branch da 0.9:** `v0.9-aprimoramento`, criada a partir do `main` (0.8.7).

Fontes deste plano:
- a auditoria de código feita fora do repositório (vault do Obsidian do dono, pasta
  "18 - AUDITORIA DO CODIGO", sobre o `main` `98ab160`);
- o Cérebro do projeto.

Toda divergência listada aqui ainda precisa ser **reproduzida com teste** antes de ser corrigida.

## Frentes

### 0.9-0 — Rede de segurança
- Fixture de save real da 0.8.7 em `tests/saves/`, aberta pelo `save-compat-check` e pelo CI. A atualização
  do Electron não pode perder saves.
- Medição de base do desempenho da corrida ao vivo, antes de mexer em qualquer coisa:
  - quadros por segundo;
  - tempo de CPU por quadro;
  - memória;
  - em janela normal e em tela cheia.
- Assinaturas de determinismo atuais preservadas. Só são regravadas quando uma correção da frente 0.9-3 mudar
  a simulação de propósito, e cada regravação é anotada no relatório.

### 0.9-1 — Plataforma: Electron novo
- Sair do Electron 33.2.1 para a versão estável mais nova com suporte. Atualizar o electron-builder junto.
- Rever as APIs que mudaram entre as versões: `main.js`, `preload.js`, `storage.js`, o splash e os modos smoke.
- **Aceleração de hardware:** hoje `app.disableHardwareAcceleration()` está ligado em `desktop/main.js`.
  - Testar com ela ligada, por causa da corrida 2D.
  - Manter uma opção de desligar (configuração ou parâmetro de linha de comando) para placas de vídeo
    problemáticas.
- Manter a segurança: `contextIsolation`, `sandbox`, sem `nodeIntegration` e a mesma CSP.
- **Critério de pronto:**
  - o CI completo passa (instalar, abrir, salvar, atualizar a partir da 0.8.7, abrir o save da 0.8.6,
    desinstalar);
  - os saves de `%APPDATA%` continuam no mesmo lugar.

### 0.9-2 — Pistas
- **Hoje:**
  - 29 traçados reais de 180 pontos (`real-tracks.js`);
  - 68 pistas com física no banco;
  - o gerador `circuitgen.js`;
  - 83% das etapas das categorias têm pista real; faltam, por exemplo, os locais da Stock Car.
- **Traçado com desenho de verdade:**
  - bordas e zebras;
  - áreas de escape;
  - linha de largada;
  - setores e retas de ativação;
  - **pit lane com entrada, saída e boxes**.
- **Gerador:** pistas novas com a mesma qualidade, por semente. Uma pista gerada fica igual para sempre.
- **Traçados que faltam:** completar com os reais quando houver fonte. Quando não houver, gerar a partir do
  nome, marcando que a pista é gerada.
- **Editor de circuitos:** pré-visualização com o desenho novo.
- **Critério de pronto:**
  - toda etapa de todas as categorias tem um traçado desenhável, com pit lane;
  - um teste confere que nenhuma pista fica sem forma.

### 0.9-3 — Verdade esportiva do motor
Primeiro reproduzir cada item com um teste, depois corrigir só o que o dono aprovar:

| # | Divergência apontada | Onde olhar |
|---|---|---|
| A1 | Bandeira vermelha avança as voltas normalmente, sem interrupção nem relargada | `core/race/engine.js` |
| A2 | Regra dos 90% de distância citada num comentário, mas fora do cálculo dos pontos | `engine.js`, `career-weekend.js` |
| A3 | Modo de ultrapassagem de 2026 usa a lógica do DRS | `engine.js`, `regs.js` |
| A4 | `calendar-2027.js` não é usado pelo `defaultDb()` | `core/base/data.js`, `app/data/calendar-2027.js` |
| B1 | `Store.sample` depende do Artifact e não existe no Electron | `ui/base/storage.js` |
| B2 | `Career.simRaceToEnd()` roda num laço síncrono (pular a corrida trava a interface) | `career-weekend.js:173` |

- Todo texto de regra diz a categoria e a temporada.
- **Critério de pronto:**
  - existe um teste por regra que falharia antes da correção;
  - o determinismo foi regravado e explicado.

### 0.9-4 — Corrida 2D
- **Referência visual aprovada pelo dono:** *Team Principal: A Racing Manager*, como leitura visual. Nada de
  copiar a arte.
- **Hoje:**
  - `drawTrack()` em `ui-core.js`, chamada num laço `requestAnimationFrame` (`startRaceAnim` em
    `ui-weekend.js`);
  - os carros são pontos, com a posição interpolada a partir do gap por volta.
- **Invariante:** o motor é a autoridade.
  - O visual só interpola estados.
  - O visual nunca cria ultrapassagem, contato, bandeira, pit stop ou resultado.
  - O visual não usa o RNG da simulação.
- **Passos, cada um com medição de desempenho:**
  1. **Contrato de dados:** um `RaceViewState` só de leitura, montado a partir do estado da corrida, com
     posição na volta, gaps, pneus, bandeiras e eventos. A interface atual (`ui85-race` e a legada)
     continua funcionando.
  2. **Carros top-down próprios:**
     - pintura com as cores da equipe;
     - companheiros diferenciados;
     - número e rótulo.
  3. **Pit lane e pit stop animados**, usando o desenho da frente 0.9-2.
  4. **Transmissão sincronizada:** torre de tempos, setores, gaps, pneus, bandeiras e rádio, todos ligados ao
     mapa.
  5. **Eventos animados:** ultrapassagens, incidentes, SC/VSC/bandeira vermelha, chuva e relargada.
  6. **Câmera:** zoom, pan e foco automático nas disputas reais.
  7. **Replay** dos eventos gravados.
  8. **Modos de visão:** transmissão, pit wall e acompanhar um piloto.
- **Tecnologia:**
  - continuar no Canvas 2D (camadas, sprites desenhados uma vez e reaproveitados);
  - PixiJS/WebGL só se a medição mostrar que o Canvas não dá conta, e como experimento isolado.
- **Progresso dentro da volta:** o motor resolve uma volta por passo. Passar para pontos de controle dentro da
  volta só depois que o visual exigir, e só com o determinismo preservado.
- **Critério de pronto:**
  - grid completo animado sem saltos;
  - posições sempre coerentes com a tabela;
  - desempenho medido igual ou melhor que a base da 0.9-0, ou dentro de uma meta definida;
  - acessibilidade (redução de movimento) respeitada.

### 0.9-5 — Reconstruções e dívida técnica
- **Interface:** passar os embrulhos antigos para o registro de ganchos:
  - 36 telas no formato `const old = SCREENS.x`;
  - 19 ACT/CHG reatribuídos;
  - 10 funções globais reatribuídas (`render`, `updateRace`, `pitWallHtml`…).
- **Módulos que se sobrepõem:** estudar a consolidação sem mudar o resultado (determinismo intocado):
  - mercado: market, market-plus, silly, contracts, career-market;
  - notícias e eventos: events, stories, chaos, media;
  - regras: regs, regcal, council;
  - desenvolvimento: career-dev, rnd, cardev;
  - talento: talent, potential, scouting.
- **Componentes de motor:** `Regs.puTick` foi substituído na prática por `parts.js`. Limpar ou documentar.
- **README:** corrigir, porque ainda diz "Versão atual: 0.8.0".

### 0.9-T — Bateria final
- `npm test` completo, determinismo, saves (0.8.4 a 0.8.7) e testes de interface em todas as combinações.
- Corrida 2D medida em máquina real.
- CI do Windows completo e relatório da 0.9.

## Regras de engenharia (as mesmas da 0.8.7)
- **Ganchos:** tudo passa por ganchos com nome.
- **Save:** todo campo novo de `G` entra no `Schema`.
- **Idiomas:** todo texto novo usa `byLang`.
- **Telas:** nenhuma tela sorteia ao desenhar.
- **Testes:** cada mecânica nova ou corrigida tem um teste por regra.
- **Modos existentes:** Manager e Observador não mudam sem intenção.
- **Mudanças visuais:** nunca alteram o resultado da corrida.
- **Desempenho:** toda mudança visual pesada é medida antes e depois.
