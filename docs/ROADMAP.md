# Roadmap

| Fase | Conteúdo | Situação |
|---|---|---|
| 0 | Aplicativo Windows: Electron, instalador NSIS, atalhos, saves em %APPDATA% com backup e recuperação, logs, tela de abertura, tela cheia, migrações, testes automáticos e CI no Windows | **Feito na v0.2.0**, validado a cada versão em Windows pelo GitHub Actions |
| 1 | Estrutura e estabilidade: auditoria, registro permanente de decisões, arquivo histórico, IA com caixa e personalidade, diagnóstico, modo Observador, teste de 10 temporadas | **Feito na v0.2.0** |
| 2 | Categorias: modelo genérico, F2, F3, regionais, F4s, Super Formula e Fórmula E com dados reais, promoção entre categorias, superlicença, editor | **Feito na v0.5.0** |
| 3 | Pilotos e equipes: atributos ampliados, estilos com efeito real, personalidade, contratos reais, academias, staff com 15 funções, IA de chefes de equipe com objetivos | **Feito na v0.5.0** |
| 4 | Corrida: pneus C1–C5 por GP, temperatura de pneu e pista, clima por região e data, setores, bateria 2026, Pit Wall ampliado, gráfico de líderes | **Feito na v0.5.0** |
| 5 | Notícias com imagens, rede social, memória de histórias, rivalidades, escândalos raros com personagens fictícios, sons | **Feito na v0.5.0** |
| 6 | Histórico real desde 1950, páginas de piloto, equipe e circuito, Hall da Fama e recordes | **Feito na v0.5.0** |
| 7 | Simulação de dezenas de temporadas, balanceamento, otimização | **Feito na v0.5.0** (20 temporadas sem erros); contínuo com `npm test` |
| 8–11 | Regulamento por temporada, calendário com logística, gerador de circuitos, P&D com 15 áreas, finanças com projeção | **Feito na v0.5.0** |

## Próximos passos (próximas versões)
- Mais categorias (IndyCar, WEC, kart) usando o mesmo modelo genérico.
- Disputar uma temporada de F2/F3 como chefe de equipe.
- Pacotes de dados de temporadas futuras importáveis.

## Feito na v0.3.0 (fora da ordem, a pedido)
- Dados reais da F1 2026 (equipes, pilotos, motores, patrocinadores, calendário, circuitos), imagens oficiais, traçados reais, Sprints, visual inspirado na F1, remoção dos textos com "IA".

## Decisões anteriores (já respondidas)
- **Dados reais (pilotos, equipes, marcas):** nomes e fatos públicos podem entrar como pacote de
  dados importável. Logos, fotos e marcas registradas exigem autorização. Sem ela, ficam
  alternativas visuais próprias.
- **Fonte do histórico 1950–hoje:** usar uma base pública verificável (ex.: a API Jolpica/Ergast)
  com data de referência gravada, em um arquivo separado dos dados simulados.
- **IA no desktop:** os eventos escritos por IA usam a conta do Claude no artefato web. No
  desktop, isso exige uma chave da API da Anthropic informada pelo jogador (opcional).
