# Roadmap

| Fase | Conteúdo | Situação |
|---|---|---|
| 0 | Aplicativo Windows: Electron, instalador NSIS, atalhos, saves em %APPDATA% com backup e recuperação, logs, tela de abertura, tela cheia, migrações, testes automáticos e CI no Windows | **Feito na v0.2.0**, validado a cada versão em Windows pelo GitHub Actions |
| 1 | Estrutura e estabilidade: auditoria, registro permanente de decisões, arquivo histórico, IA com caixa e personalidade, diagnóstico, modo Observador, teste de 10 temporadas | **Feito na v0.2.0** |
| 2 | Categorias: modelo genérico de categoria, F2 e F3 com equipes, pilotos, calendários e regulamentos próprios, promoção entre categorias, editor de categorias | Próxima |
| 3 | Pilotos e equipes: atributos ampliados (largada, combustível, adaptabilidade, feedback), estilos com efeito real, progressão kart→F1, superlicença, academias, staff ampliado, IA de chefes de equipe com objetivos | Planejada |
| 4 | Corrida: pneus C1–C5 por fornecedor, temperatura de pneu e pista, clima por região e data, setores, Pit Wall ampliado, gráfico de líderes | Planejada |
| 5 | Notícias com imagens, rede social, histórias com IA (memória de eventos), escândalos raros com personagens fictícios, identidade visual por categoria, sons | Planejada |
| 6 | Histórico real da F1 desde 1950 (separado do histórico simulado), páginas de piloto e equipe, Hall da Fama | **Parte feita na v0.3.0**: temporadas 1950–2026, Hall da Fama com filtros, página do piloto com história real. Faltam a página de equipe e os recordes por circuito |
| 7 | Simulação de dezenas de temporadas, balanceamento, otimização | Contínua (`npm test`) |

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
