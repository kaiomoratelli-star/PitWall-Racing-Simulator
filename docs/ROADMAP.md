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

## Próximas versões (decisão de 08/11/2026)
| Versão | Tema |
|---|---|
| **0.8.6** | Expansão esportiva e administrativa, mais as pendências da 0.8.5. Plano em `docs/PLANO-0.8.6.md`. |
| **0.9** | Somente a Carreira de Piloto |
| **1.0** | Categorias e equipes jogáveis (F2, F3 e outras), Sandbox, modos especiais e preparação para o lançamento |

Na 0.8.6:
- **Pessoas:** moral com causas, química entre companheiros, relação piloto–chefe e funcionários com moral e pedidos.
- **Corrida e regras:** comissários com pontos na superlicença, danos por peça, ordens de equipe completas, componentes do motor, dias de teste e congelamento.
- **Pendências da 0.8.5:** rivalidades, casos e investigações, créditos e licenças, estouros do teto e limpeza do código.

Na preparação para o lançamento da 1.0:
- saves e "Recalibrar";
- licenças;
- atualização automática e assinatura.

Ideias anteriores ainda sem versão:
- mais categorias simuladas (IndyCar, WEC e kart já existem como séries simuladas);
- pacotes de dados de temporadas futuras importáveis.

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
