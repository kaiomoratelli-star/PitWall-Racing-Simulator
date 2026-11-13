# Documentação — o que vale hoje

Índice da pasta `docs/`. Os documentos desta lista descrevem o jogo **como ele é agora**.
Planos, dossiês e relatórios de versões passadas ficam em [`historico/`](historico/) só como registro:
podem citar caminhos de arquivo e decisões que já mudaram.

## Para quem vai mexer no código

| Documento | Para que serve |
|---|---|
| [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md) | Regras do projeto: como acrescentar algo sem apagar o que existe (ganchos com nome, esquema do save, testes obrigatórios, idiomas, sorteio). **Ler antes de qualquer mudança.** |
| [ARQUITETURA.md](ARQUITETURA.md) | Como o jogo é montado: pastas, ordem dos módulos, onde ficam os dados do jogador, como o save é gravado e conferido, build do Windows. |
| [AVALIACAO-0.8.6.md](AVALIACAO-0.8.6.md) | Avaliação completa com as prioridades P1 a P3 (base da 0.8.7). |
| [RELATORIO-0.8.7.md](RELATORIO-0.8.7.md) | O que a 0.8.7 entregou, como foi testado e o que ficou para depois. |
| [RELATORIO-0.8.6.md](RELATORIO-0.8.6.md) | Versão anterior (regras de corrida, pessoas, comissários, motor por componente). |
| [PLANO-0.9.md](PLANO-0.9.md) | Plano da 0.9 (aprimoramento e reconstrução: Electron novo, pistas, corrida 2D, verdade esportiva do motor, dívida técnica). |
| [PENDENCIAS-V1.md](PENDENCIAS-V1.md) | Ideias adiadas de propósito até a 1.0. |

## Relatórios gerados por scripts (sempre atuais)

| Documento | Gerado por |
|---|---|
| [RELATORIO-SIMULACAO.md](RELATORIO-SIMULACAO.md) | `node scripts/audit.js sim <temporadas> [semente] [modo]` |
| [DUPLICATAS.md](DUPLICATAS.md), [VERIFICACAO-DATABASE.md](VERIFICACAO-DATABASE.md) | `node scripts/audit.js db` |
| [VERIFICACAO-2027.md](VERIFICACAO-2027.md) | `node scripts/check-2027.js` |

## Testes (o que cada um garante)

| Comando | Garante |
|---|---|
| `npm test` | guard-check (nada some em silêncio), escopo, saves em disco, esquema do save, regras do regulamento, idioma não muda o jogo, simulações longas e categorias |
| `node scripts/determinism-check.js` | a mesma semente dá exatamente o mesmo jogo (assinatura gravada em `tests/determinism.json`) |
| `node scripts/save-compat-check.js` | saves reais da 0.8.4, 0.8.5 e 0.8.6 (`tests/saves/`) abrem e seguem jogando |
| `node scripts/ui85-check.js 3` | todas as telas e abas em 4 combinações de idioma, tema, menu e largura, sem erro e sem sorteio ao desenhar |
| `node scripts/playthrough-check.js 1` | uma temporada inteira jogada pela interface |
| `node scripts/browser-save-check.js` | saves compactados no navegador, saves antigos, falha ao abrir sem perder o jogo |
| `node scripts/i18n-check.js 6` | todas as telas em inglês, com no máximo 6 trechos em português (nomes próprios) |
| `node scripts/ui-stress.js 50` | cliques em todos os botões, em sequência aleatória |

O CI do Windows (`.github/workflows/windows.yml`) roda tudo isso e ainda instala o jogo, abre, salva,
atualiza, abre um save real da 0.8.6 no jogo instalado e desinstala sem perder os saves.

## Outras pastas

- `brand/`, `marketing/`: logos e peças de divulgação.
- `ui-085/`: protótipos e capturas da interface nova (0.8.5).
- `historico/`: planos, auditorias, dossiês, roteiros e relatórios das versões 0.8 a 0.8.5, e o plano adiado da Carreira de Piloto (`PLANO-0.9-carreira-piloto.md`, fundação guardada na branch `v0.9-piloto`).
