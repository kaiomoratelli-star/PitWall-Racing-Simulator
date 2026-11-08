/* ============================================================
   PIT WALL — candidatas a entrar no grid (V0.8.4)
   20 projetos: 7 equipes reais do automobilismo, 8 montadoras com
   história nas pistas, 3 empresas de fora do esporte e 2 equipes
   criadas do zero para o jogo (Vórtice e Meridian).
   Tudo aqui é projeção do jogo: nenhum desses projetos de F1 existe
   (exceto as tentativas reais citadas em "real"). Os chefes do projeto
   são personagens gerados pelo jogo.
   Campos:
     kind      equipe | montadora | empresa | nova
     owner     dono: nome, tipo, riqueza (0–100), ambição (0–100), paciência (0–100)
     plan      meta do plano de negócios (sobreviver | meio | podios | titulos) e prazo em anos
     budget    orçamento anual inicial (milhões de dólares, antes do teto)
     funding   aporte anual do dono (milhões)
     engine    'cliente' (compra motor) ou 'propria' (projeto próprio, chega em engineYears)
     interest  peso da vontade de entrar (0–1); cresce com a saúde comercial da F1
     from      primeiro ano em que pode se candidatar
   ============================================================ */
'use strict';

const TEAM_CANDIDATES = [
  /* ---------- equipes reais do automobilismo ---------- */
  { id: 'hitech', name: 'Hitech', fullName: 'Hitech Grand Prix', short: 'HIT', kind: 'equipe', country: 'GBR', base: 'Silverstone (Reino Unido)',
    color: '#E4E4E4', color2: '#1B1B1B', logo: 'logos/teams/hitech.png',
    owner: { name: 'Hitech Grand Prix (grupo de investidores)', type: 'equipe', wealth: 55, ambition: 70, patience: 60 },
    plan: { goal: 'meio', years: 5 }, budget: 150, funding: 45, engine: 'cliente', facilities: 66, reputation: 50, staff: 72, interest: 0.55, from: 2027,
    real: 'Fundada em 2002 por Oliver Oakes. Pediu vaga na F1 no processo da FIA de 2023 e foi recusada. Forte na F2, F3 e F4.',
    pitch: 'Equipe de base mais vitoriosa do Reino Unido na última década, com fábrica pronta em Silverstone. Precisa de sócio rico para o salto.' },
  { id: 'prema', name: 'Prema', fullName: 'Prema Racing', short: 'PRE', kind: 'equipe', country: 'ITA', base: 'Grisignano di Zocco, Vicenza (Itália)',
    color: '#D7141A', color2: '#FFFFFF', logo: 'logos/teams/prema-racing.png',
    owner: { name: 'Família Rosin', type: 'equipe', wealth: 50, ambition: 75, patience: 65 },
    plan: { goal: 'meio', years: 5 }, budget: 140, funding: 40, engine: 'cliente', facilities: 64, reputation: 55, staff: 74, interest: 0.5, from: 2027,
    real: 'Fundada em 1983 por Angelo Rosin. Campeã da F2, da F3 e de várias F4; correu também no WEC e na IndyCar.',
    pitch: 'A "fábrica de campeões" das categorias de base. Rede de pilotos e engenheiros jovens incomparável, pouca experiência com carro de F1.' },
  { id: 'penske', name: 'Penske', fullName: 'Team Penske', short: 'PEN', kind: 'equipe', country: 'USA', base: 'Mooresville, Carolina do Norte (EUA), com base técnica no Reino Unido',
    color: '#FFFFFF', color2: '#E10600', logo: 'logos/teams/team-penske.png',
    owner: { name: 'Penske Corporation (Roger Penske)', type: 'equipe', wealth: 85, ambition: 85, patience: 55 },
    plan: { goal: 'podios', years: 6 }, budget: 210, funding: 90, engine: 'cliente', facilities: 72, reputation: 66, staff: 77, interest: 0.4, from: 2028,
    real: 'Correu na F1 de 1974 a 1976 e venceu o GP da Áustria de 1976 com John Watson. Gigante da IndyCar (dona da série e do circuito de Indianápolis), da NASCAR e do endurance.',
    pitch: 'Uma das organizações mais vencedoras do automobilismo mundial. Dinheiro, método e marca nos EUA, o mercado que a F1 mais quer.' },
  { id: 'ganassi', name: 'Ganassi', fullName: 'Chip Ganassi Racing', short: 'CGR', kind: 'equipe', country: 'USA', base: 'Indianápolis (EUA)',
    color: '#C8102E', color2: '#0B0B0B', logo: 'logos/teams/chip-ganassi-racing.png',
    owner: { name: 'Chip Ganassi', type: 'equipe', wealth: 60, ambition: 75, patience: 55 },
    plan: { goal: 'meio', years: 5 }, budget: 165, funding: 55, engine: 'cliente', facilities: 66, reputation: 60, staff: 75, interest: 0.35, from: 2028,
    real: 'Múltipla campeã da IndyCar e vencedora das 500 Milhas de Indianápolis, das 24 Horas de Daytona e de Le Mans (classe GT).',
    pitch: 'Equipe americana de ponta, acostumada a ganhar com pilotos estrangeiros. Precisaria montar do zero a operação europeia.' },
  { id: 'art', name: 'ART', fullName: 'ART Grand Prix', short: 'ART', kind: 'equipe', country: 'FRA', base: 'Villeneuve-la-Guyard (França)',
    color: '#0B0B0B', color2: '#E30613', logo: 'logos/teams/art-grand-prix.png',
    owner: { name: 'ART Grand Prix (Sébastien Philippe e sócios)', type: 'equipe', wealth: 45, ambition: 70, patience: 65 },
    plan: { goal: 'sobreviver', years: 4 }, budget: 130, funding: 35, engine: 'cliente', facilities: 62, reputation: 55, staff: 74, interest: 0.4, from: 2027,
    real: 'Fundada em 2004 por Frédéric Vasseur e Nicolas Todt. Revelou Hamilton, Rosberg, Leclerc e Russell nas categorias de base.',
    pitch: 'Escola de campeões com ligação histórica com a França. Orçamento curto, mas engenharia respeitada no paddock.' },
  { id: 'rodin', name: 'Rodin', fullName: 'Rodin Motorsport', short: 'ROD', kind: 'equipe', country: 'NZL', base: 'Canterbury (Nova Zelândia) e Silverstone (Reino Unido)',
    color: '#111111', color2: '#C9A227', logo: 'logos/teams/rodin-motorsport.png',
    owner: { name: 'David Dicker (Rodin Cars)', type: 'equipe', wealth: 60, ambition: 80, patience: 55 },
    plan: { goal: 'meio', years: 6 }, budget: 150, funding: 60, engine: 'cliente', facilities: 63, reputation: 48, staff: 70, interest: 0.45, from: 2027,
    real: 'Antiga Carlin, comprada pela Rodin Cars. O dono já declarou a ambição de chegar à F1; a Rodin fabrica carros de pista e peças em impressão 3D.',
    pitch: 'Projeto com dono apaixonado e fábrica própria de peças. A primeira equipe da Oceania na F1 desde os tempos de Bruce McLaren.' },
  { id: 'campos', name: 'Campos', fullName: 'Campos Racing', short: 'CAM', kind: 'equipe', country: 'ESP', base: 'Alzira, Valência (Espanha)',
    color: '#E4002B', color2: '#FFD100', logo: 'logos/teams/campos-racing.png',
    owner: { name: 'Família Campos', type: 'equipe', wealth: 40, ambition: 65, patience: 70 },
    plan: { goal: 'sobreviver', years: 4 }, budget: 115, funding: 30, engine: 'cliente', facilities: 58, reputation: 45, staff: 70, interest: 0.3, from: 2027,
    real: 'Fundada por Adrián Campos, ex-piloto de F1. Ganhou vaga para 2010 como Campos Meta e, sem dinheiro, virou a HRT antes de estrear.',
    pitch: 'Uma revanche histórica: a equipe que perdeu a vaga em 2010. Pequena, enxuta e com apoio do mercado espanhol.' },

  /* ---------- montadoras com história no automobilismo ---------- */
  { id: 'toyota', name: 'Toyota', fullName: 'Toyota Gazoo Racing F1 Team', short: 'TOY', kind: 'montadora', country: 'JPN', base: 'Colônia (Alemanha) e Toyota City (Japão)',
    color: '#FFFFFF', color2: '#EB0A1E', logo: 'logos/manufacturers/toyota-gazoo-racing.png',
    owner: { name: 'Toyota Motor Corporation', type: 'montadora', wealth: 98, ambition: 80, patience: 40 },
    plan: { goal: 'podios', years: 5 }, budget: 255, funding: 140, engine: 'propria', engineYears: 3, facilities: 82, reputation: 68, staff: 80, interest: 0.45, from: 2027, buyer: true,
    real: 'Correu na F1 de 2002 a 2009 sem vencer e saiu na crise de 2009. Hoje vence no endurance (Le Mans) e no rali e é parceira técnica da Haas desde 2024.',
    pitch: 'A maior montadora do mundo, com o túnel de vento de Colônia. Pode entrar do zero ou comprar uma equipe existente. Historicamente impaciente.' },
  { id: 'porsche', name: 'Porsche', fullName: 'Porsche Formula One Team', short: 'POR', kind: 'montadora', country: 'GER', base: 'Weissach (Alemanha)',
    color: '#FFFFFF', color2: '#D5001C', logo: 'logos/manufacturers/porsche.png',
    owner: { name: 'Porsche AG', type: 'montadora', wealth: 90, ambition: 80, patience: 50 },
    plan: { goal: 'podios', years: 6 }, budget: 245, funding: 120, engine: 'propria', engineYears: 4, facilities: 80, reputation: 70, staff: 80, interest: 0.4, from: 2028, buyer: true,
    real: 'Venceu o GP da França de 1962 como equipe de fábrica e foi campeã como fornecedora de motor da McLaren (TAG-Porsche, 1984–86). Negociou com a Red Bull em 2022, sem acordo.',
    pitch: 'Marca de corrida por excelência, com 19 vitórias em Le Mans. Prefere entrar comprando uma estrutura pronta.' },
  { id: 'hyundai', name: 'Hyundai', fullName: 'Hyundai Motorsport F1 Team', short: 'HYU', kind: 'montadora', country: 'KOR', base: 'Alzenau (Alemanha) e Namyang (Coreia do Sul)',
    color: '#002C5F', color2: '#FF6B00', logo: 'logos/manufacturers/hyundai-motorsport.png',
    owner: { name: 'Hyundai Motor Group', type: 'montadora', wealth: 92, ambition: 75, patience: 55 },
    plan: { goal: 'meio', years: 6 }, budget: 230, funding: 120, engine: 'propria', engineYears: 4, facilities: 74, reputation: 58, staff: 76, interest: 0.35, from: 2029, buyer: true,
    real: 'Campeã mundial de rali (construtores, 2019 e 2020). A imprensa especializada noticiou estudos internos sobre a F1 a partir de 2025.',
    pitch: 'Terceiro maior grupo automotivo do mundo, sem nunca ter corrido na F1. Daria à Coreia do Sul sua primeira equipe.' },
  { id: 'bmw', name: 'BMW', fullName: 'BMW M Motorsport F1 Team', short: 'BMW', kind: 'montadora', country: 'GER', base: 'Munique (Alemanha)',
    color: '#1C69D4', color2: '#0B0B0B', logo: 'logos/manufacturers/bmw.png',
    owner: { name: 'BMW AG', type: 'montadora', wealth: 92, ambition: 70, patience: 40 },
    plan: { goal: 'podios', years: 5 }, budget: 240, funding: 120, engine: 'propria', engineYears: 3, facilities: 76, reputation: 70, staff: 78, interest: 0.3, from: 2028, buyer: true,
    real: 'Campeã com a Brabham (1983, Piquet), parceira da Williams (2000–05) e dona da BMW Sauber (2006–09), que venceu o GP do Canadá de 2008. Saiu na crise de 2009.',
    pitch: 'Volta da BMW como equipe de fábrica. Tem experiência recente com motor de F1, mas sai rápido quando os resultados não vêm.' },
  { id: 'lamborghini', name: 'Lamborghini', fullName: 'Lamborghini Squadra Corse F1', short: 'LAM', kind: 'montadora', country: 'ITA', base: "Sant'Agata Bolognese (Itália)",
    color: '#0B0B0B', color2: '#DDB321', logo: 'logos/manufacturers/lamborghini.png',
    owner: { name: 'Automobili Lamborghini (Grupo Volkswagen)', type: 'montadora', wealth: 80, ambition: 65, patience: 50 },
    plan: { goal: 'meio', years: 6 }, budget: 215, funding: 100, engine: 'cliente', facilities: 70, reputation: 60, staff: 74, interest: 0.15, from: 2030, buyer: true, blockedBy: 'audi',
    real: 'Forneceu motores à F1 de 1989 a 1993 (Larrousse, Lotus, Ligier, Minardi). Corre no endurance com a Squadra Corse. O Grupo Volkswagen já tem a Audi na F1, o que torna o projeto improvável.',
    pitch: 'Marca de desejo com ligação italiana forte. Só entra se o grupo dono mudar de estratégia.' },
  { id: 'jaguar', name: 'Jaguar', fullName: 'Jaguar Racing F1 Team', short: 'JAG', kind: 'montadora', country: 'GBR', base: 'Milton Keynes e Gaydon (Reino Unido)',
    color: '#004225', color2: '#FFFFFF', logo: 'logos/teams/jaguar-tcs-racing.png',
    owner: { name: 'Tata Motors (Jaguar Land Rover)', type: 'montadora', wealth: 75, ambition: 65, patience: 55 },
    plan: { goal: 'meio', years: 6 }, budget: 200, funding: 90, engine: 'cliente', facilities: 68, reputation: 60, staff: 74, interest: 0.3, from: 2028, buyer: true,
    real: 'Correu na F1 de 2000 a 2004 e foi vendida à Red Bull, que a transformou na Red Bull Racing. Venceu na Fórmula E como Jaguar TCS Racing.',
    pitch: 'O retorno do verde britânico, agora com o grupo indiano Tata. Experiência recente em motores elétricos.' },
  { id: 'lotus', name: 'Lotus', fullName: 'Lotus F1 Team', short: 'LOT', kind: 'montadora', country: 'GBR', base: 'Hethel (Reino Unido)',
    color: '#0B0B0B', color2: '#C9A227', logo: 'logos/manufacturers/lotus.png',
    owner: { name: 'Lotus Group (Geely)', type: 'montadora', wealth: 80, ambition: 70, patience: 55 },
    plan: { goal: 'meio', years: 6 }, budget: 205, funding: 100, engine: 'cliente', facilities: 66, reputation: 62, staff: 74, interest: 0.3, from: 2028, buyer: true,
    real: 'A Team Lotus de Colin Chapman ganhou 7 títulos de construtores (1963–78). O nome voltou à F1 de 2010 a 2015 em equipes diferentes. A Lotus hoje pertence ao grupo chinês Geely.',
    pitch: 'Um dos nomes mais históricos da F1, com dono chinês rico. Daria à China uma equipe de peso no grid.' },
  { id: 'mahindra', name: 'Mahindra', fullName: 'Mahindra Racing F1 Team', short: 'MAH', kind: 'montadora', country: 'IND', base: 'Mumbai (Índia) e Banbury (Reino Unido)',
    color: '#C8102E', color2: '#1B1B1B', logo: 'logos/teams/mahindra-racing.png',
    owner: { name: 'Mahindra Group', type: 'montadora', wealth: 70, ambition: 65, patience: 60 },
    plan: { goal: 'sobreviver', years: 5 }, budget: 170, funding: 70, engine: 'cliente', facilities: 62, reputation: 50, staff: 70, interest: 0.25, from: 2029, buyer: true,
    real: 'Uma das fundadoras da Fórmula E (desde 2014). A Índia teve a Force India na F1 de 2008 a 2018.',
    pitch: 'Volta da Índia ao grid com um conglomerado gigante por trás. Projeto de crescimento lento e paciente.' },

  /* ---------- empresas de fora do automobilismo ---------- */
  { id: 'monster', name: 'Monster', fullName: 'Monster Energy Racing', short: 'MON', kind: 'empresa', country: 'USA', base: 'Corona, Califórnia (EUA), com base técnica em Banbury (Reino Unido)',
    color: '#0B0B0B', color2: '#7AC143', logo: 'logos/manufacturers/monster-energy.png',
    owner: { name: 'Monster Beverage Corporation', type: 'empresa', wealth: 80, ambition: 80, patience: 50 },
    plan: { goal: 'podios', years: 7 }, budget: 220, funding: 110, engine: 'cliente', facilities: 64, reputation: 52, staff: 72, interest: 0.3, from: 2028, buyer: true,
    real: 'Uma das maiores patrocinadoras do automobilismo (deu nome à NASCAR Cup de 2017 a 2019 e patrocinou a Mercedes na F1). Rival direta da Red Bull no mercado de energéticos.',
    pitch: 'Copiar o caminho da Red Bull: comprar ou montar uma equipe e usar a F1 como vitrine global da marca.' },
  { id: 'apple', name: 'Apple', fullName: 'Apple Formula One Team', short: 'APL', kind: 'empresa', country: 'USA', base: 'Cupertino, Califórnia (EUA), com base técnica em Oxfordshire (Reino Unido)',
    color: '#F5F5F7', color2: '#1D1D1F', logo: 'logos/manufacturers/apple.png',
    owner: { name: 'Apple Inc.', type: 'empresa', wealth: 100, ambition: 85, patience: 45 },
    plan: { goal: 'titulos', years: 8 }, budget: 300, funding: 200, engine: 'cliente', facilities: 70, reputation: 55, staff: 74, interest: 0.12, from: 2030, buyer: true,
    real: 'Produziu o filme "F1" (2025) e detém os direitos de transmissão da F1 nos EUA a partir de 2026.',
    pitch: 'A empresa mais rica do planeta, sem nenhuma experiência em corrida. Dinheiro sem limite esbarra no teto de gastos: o desafio é a engenharia.' },
  { id: 'lvmh', name: 'TAG Heuer', fullName: 'TAG Heuer Racing (LVMH)', short: 'TAG', kind: 'empresa', country: 'FRA', base: 'Paris (França), com base técnica em Silverstone (Reino Unido)',
    color: '#0B0B0B', color2: '#E30613', logo: 'logos/manufacturers/tag-heuer.png',
    owner: { name: 'LVMH', type: 'empresa', wealth: 95, ambition: 75, patience: 50 },
    plan: { goal: 'podios', years: 7 }, budget: 250, funding: 140, engine: 'cliente', facilities: 66, reputation: 56, staff: 72, interest: 0.18, from: 2029, buyer: true,
    real: 'O grupo LVMH é parceiro global da F1 desde 2025, e a TAG Heuer, cronometrista oficial. A TAG já deu nome a motores (TAG-Porsche) e patrocinou McLaren e Red Bull.',
    pitch: 'O maior grupo de luxo do mundo transformando patrocínio em equipe própria. Glamour, marketing e muito dinheiro.' },

  /* ---------- criadas do zero para o jogo ---------- */
  { id: 'vortice', name: 'Vórtice', fullName: 'Vórtice Racing', short: 'VOR', kind: 'nova', country: 'BRA', base: 'Indaiatuba, São Paulo (Brasil), com túnel de vento alugado em Colônia (Alemanha)',
    color: '#00875A', color2: '#FFC72C', logo: 'logos/teams/vortice-racing.png', fictional: true,
    owner: { name: 'Grupo Aurora Participações (fictício)', type: 'fundo', wealth: 70, ambition: 75, patience: 65 },
    plan: { goal: 'meio', years: 5 }, budget: 175, funding: 85, engine: 'cliente', facilities: 60, reputation: 45, staff: 70, interest: 0.4, from: 2027,
    leaders: { owner: 'Henrique Tavares Lacerda', principal: 'Marina Vasconcellos', technical: 'Otávio Rezende' },
    real: 'Equipe criada para o jogo. O Brasil não tem equipe na F1 desde a Fittipaldi (Copersucar), de 1975 a 1982.',
    pitch: 'O conglomerado brasileiro de energia e agronegócio Grupo Aurora (fictício) quer a primeira equipe nacional em mais de 40 anos. Sede em Indaiatuba, perto do polo de engenharia de Campinas, e academia com foco no kart e na F4 Brasil.' },
  { id: 'meridian', name: 'Meridian', fullName: 'Meridian Grand Prix', short: 'MER', kind: 'nova', country: 'ARE', base: 'Abu Dhabi (Emirados Árabes Unidos), com base técnica em Bicester (Reino Unido)',
    color: '#0A1F44', color2: '#C8783C', logo: 'logos/teams/meridian-grand-prix.png', fictional: true,
    owner: { name: 'Meridian Holdings (fictício)', type: 'fundo', wealth: 92, ambition: 85, patience: 55 },
    plan: { goal: 'podios', years: 6 }, budget: 235, funding: 130, engine: 'cliente', facilities: 66, reputation: 48, staff: 72, interest: 0.4, from: 2027, buyer: true,
    leaders: { owner: 'Khalid Al Mansouri', principal: 'Edward Harcourt', technical: 'Lucia Ferrante' },
    real: 'Equipe criada para o jogo, inspirada no aumento de investimentos do Oriente Médio no esporte.',
    pitch: 'Fundo de investimentos de Abu Dhabi (fictício) com dinheiro de sobra e paciência média. Contrata engenheiros britânicos de peso e pode comprar uma equipe em crise em vez de começar do zero.' },
];

/* donos das equipes atuais (2026) e regras de venda pedidas pelo dono do jogo:
   Ferrari e McLaren nunca são vendidas; Mercedes e Red Bull só depois de 20 anos de carreira
   e numa crise muito forte; as demais podem ser vendidas. */
const TEAM_OWNERS = {
  mercedes: { name: 'Mercedes-Benz Group, INEOS e Toto Wolff', type: 'montadora', wealth: 95, ambition: 90, patience: 70, sale: 'protegida20' },
  ferrari: { name: 'Ferrari N.V. (Exor)', type: 'montadora', wealth: 95, ambition: 95, patience: 75, sale: 'nunca' },
  'red-bull': { name: 'Red Bull GmbH', type: 'empresa', wealth: 92, ambition: 90, patience: 70, sale: 'protegida20' },
  mclaren: { name: 'McLaren Group (Mumtalakat e CYVN)', type: 'grupo', wealth: 80, ambition: 90, patience: 70, sale: 'nunca' },
  'racing-bulls': { name: 'Red Bull GmbH', type: 'empresa', wealth: 92, ambition: 55, patience: 70 },
  alpine: { name: 'Renault Group', type: 'montadora', wealth: 80, ambition: 65, patience: 40 },
  haas: { name: 'Gene Haas (Haas Automation)', type: 'independente', wealth: 55, ambition: 55, patience: 60 },
  audi: { name: 'Audi AG (com participação do Qatar Investment Authority)', type: 'montadora', wealth: 92, ambition: 85, patience: 50 },
  williams: { name: 'Dorilton Capital', type: 'fundo', wealth: 65, ambition: 70, patience: 60 },
  'aston-martin': { name: 'Lawrence Stroll (Yew Tree Investments)', type: 'independente', wealth: 75, ambition: 85, patience: 60 },
  cadillac: { name: 'TWG Global e General Motors', type: 'montadora', wealth: 90, ambition: 75, patience: 55 },
};

/* 20 logos genéricos para a equipe criada pelo jogador (assets/img/logos/generic/1.svg ... 20.svg) */
const GENERIC_LOGOS = Array.from({ length: 20 }, (_, i) => `logos/generic/${i + 1}.svg`);
