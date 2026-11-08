# Protótipo das propostas de interface (0.8.5)

Página estática, sem dependências:
- `index.src.html` traz a barra de revisão e o palco de 1440×900;
- `build.js` junta CSS e JS em `dist/index.html`.

| Arquivo | O que é |
|---|---|
| `data.js` | Dados de uma carreira real (McLaren, 2028, após a 8ª etapa), gerados por `export-proto.js` |
| `core.js` | Índices, formatação, catálogo das 55 telas, rotas e barra de revisão |
| `screens1.js`, `screens2.js` | Conteúdo base de cada tela, montado com o kit de componentes da proposta |
| `a.js`, `a.css` | Proposta A: kit, casca (trilho lateral) e telas com layout próprio |
| `b.js`, `b.css` | Proposta B: kit, casca (menu no topo) e telas com layout próprio |
| `shot.js`, `sheet.js` | Capturas das telas com Playwright e folhas de contato |

## Para abrir

1. Copie as imagens usadas para `assets/`:
   - `app/assets/img/...` vai para `assets/img/...`;
   - `app/assets/flags` vai para `assets/flags`.
2. Gere a página:

   ```bash
   node build.js
   ```

3. Abra `preview.html`.

## Para gerar os dados de novo

`export-proto.js` usa `load.js` (nesta pasta), que roda o motor do jogo em Node, e grava o JSON que vira `data.js`.
