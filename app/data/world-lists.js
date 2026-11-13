/* Listas do mundo real que estavam no código (0.9, regra 19 do dono): fabricantes candidatos e marcas de motor,
   pneus, políticas de grupo, criadores de conteúdo, veículos de imprensa e perfis nas redes. Ficam no Pacote de dados:
   o mundo fictício troca os nomes junto. Sem pacote, as listas ficam vazias. */
const WORLD_LISTS = {
 "mfrCands": [
  {
   "id": "pu-gm",
   "name": "General Motors",
   "country": "USA",
   "logo": null,
   "dev": 130,
   "interest": 0.9,
   "from": 2029,
   "partner": "cadillac",
   "fixedEntry": { "from": 2027, "year": 2029 },
   "real": "A GM anunciou motor próprio para a Cadillac a partir de 2029."
  },
  {
   "id": "pu-toyota",
   "name": "Toyota",
   "country": "JPN",
   "logo": "logos/manufacturers/toyota-gazoo-racing.png",
   "dev": 140,
   "interest": 0.35,
   "from": 2028,
   "real": "Correu na F1 até 2009 e hoje é parceira técnica da Haas."
  },
  {
   "id": "pu-porsche",
   "name": "Porsche",
   "country": "GER",
   "logo": "logos/manufacturers/porsche.png",
   "dev": 130,
   "interest": 0.3,
   "from": 2029,
   "real": "Campeã como fornecedora da McLaren (TAG-Porsche, 1984–86)."
  },
  {
   "id": "pu-hyundai",
   "name": "Hyundai",
   "country": "KOR",
   "logo": "logos/manufacturers/hyundai.png",
   "dev": 120,
   "interest": 0.3,
   "from": 2029,
   "real": "Campeã do mundial de rali; estuda a F1 desde 2025."
  },
  {
   "id": "pu-bmw",
   "name": "BMW",
   "country": "GER",
   "logo": "logos/manufacturers/bmw.png",
   "dev": 120,
   "interest": 0.2,
   "from": 2029,
   "real": "Fornecedora campeã com a Brabham (1983) e parceira da Williams (2000–05)."
  },
  {
   "id": "pu-cosworth",
   "name": "Cosworth",
   "country": "GBR",
   "logo": null,
   "dev": 60,
   "interest": 0.15,
   "from": 2030,
   "real": "Fornecedora independente mais vitoriosa da história (DFV); saiu da F1 em 2013."
  }
 ],
 "mfrGenPool": [
  [
   "Peugeot",
   "FRA"
  ],
  [
   "Lamborghini",
   "ITA"
  ],
  [
   "Nissan",
   "JPN"
  ],
  [
   "Ilmor",
   "GBR"
  ],
  [
   "Mahindra",
   "IND"
  ],
  [
   "Rimac",
   "CRO"
  ],
  [
   "BYD",
   "CHN"
  ],
  [
   "Geely",
   "CHN"
  ],
  [
   "Kia",
   "KOR"
  ],
  [
   "Lotus Powertrain",
   "GBR"
  ],
  [
   "Mugen",
   "JPN"
  ],
  [
   "Pankl",
   "AUT"
  ],
  [
   "AVL",
   "AUT"
  ],
  [
   "Mecachrome",
   "FRA"
  ],
  [
   "Judd",
   "GBR"
  ],
  [
   "Polestar",
   "SWE"
  ],
  [
   "Tata",
   "IND"
  ],
  [
   "Xpeng",
   "CHN"
  ]
 ],
 "tyres": {
  "pirelli": {
   "name": "Pirelli",
   "logo": "logos/tyres/pirelli.png",
   "wear": 1,
   "warm": 1,
   "bid": 0.75,
   "note": [
    "Degradação planejada para estratégia",
    "Degradation designed for strategy"
   ]
  },
  "michelin": {
   "name": "Michelin",
   "logo": "logos/tyres/michelin.png",
   "wear": 0.85,
   "warm": 1.08,
   "bid": 0.6,
   "note": [
    "Pneu durável, mais difícil de aquecer",
    "Durable tyre, harder to warm up"
   ]
  },
  "bridgestone": {
   "name": "Bridgestone",
   "logo": "logos/tyres/bridgestone.png",
   "wear": 0.9,
   "warm": 1,
   "bid": 0.45,
   "note": [
    "Consistente, pouca queda de rendimento",
    "Consistent, little drop-off"
   ]
  },
  "hankook": {
   "name": "Hankook",
   "logo": "logos/tyres/hankook.png",
   "wear": 1.08,
   "warm": 0.95,
   "bid": 0.5,
   "note": [
    "Aquece rápido, gasta mais",
    "Warms up fast, wears more"
   ]
  },
  "goodyear": {
   "name": "Goodyear",
   "logo": "logos/tyres/goodyear.png",
   "wear": 0.95,
   "warm": 1.02,
   "bid": 0.35,
   "note": [
    "Robusto, conhecido pelos ovais",
    "Robust, known from ovals"
   ]
  },
  "yokohama": {
   "name": "Yokohama",
   "logo": "logos/tyres/yokohama.png",
   "wear": 1.02,
   "warm": 0.98,
   "bid": 0.3,
   "note": [
    "Equilibrado",
    "Balanced"
   ]
  },
  "firestone": {
   "name": "Firestone",
   "logo": "logos/tyres/firestone.png",
   "wear": 0.95,
   "warm": 1,
   "bid": 0.15,
   "note": [
    "Fornecedora da IndyCar",
    "IndyCar supplier"
   ]
  },
  "kumho": {
   "name": "Kumho",
   "logo": "logos/tyres/kumho.png",
   "wear": 1.05,
   "warm": 0.97,
   "bid": 0.2,
   "note": [
    "Barata e agressiva",
    "Cheap and aggressive"
   ]
  }
 },
 "groupPolicies": {
  "red-bull": {
   "name": "Red Bull",
   "teams": [
    "red-bull",
    "racing-bulls"
   ],
   "academyWeight": 14,
   "externalPenalty": 9,
   "note": "Prioridade quase total à Red Bull Junior Team; contratação externa só sem opção à altura."
  }
 },
 "creators": [
  {
   "name": "GlockDepre",
   "style": "meme"
  },
  {
   "name": "Primeira Fila F1",
   "style": "analise"
  },
  {
   "name": "Boteco F1",
   "style": "resenha"
  },
  {
   "name": "Ressaca F1",
   "style": "resenha"
  },
  {
   "name": "Rafael Lopes",
   "style": "analise"
  },
  {
   "name": "Kevin Nicolas",
   "style": "resenha"
  },
  {
   "name": "EFFE",
   "style": "analise"
  },
  {
   "name": "GP em Casa",
   "style": "noticia"
  },
  {
   "name": "Luca Morelli",
   "style": "noticia"
  },
  {
   "name": "Mariana Becker",
   "style": "reportagem"
  },
  {
   "name": "Juliana Cerasolli",
   "style": "analise"
  },
  {
   "name": "F1das_frase",
   "style": "meme"
  },
  {
   "name": "Tiago Mendonça",
   "style": "analise"
  },
  {
   "name": "Estagiário da F1",
   "style": "meme"
  }
 ],
 "outlets": {
  "f1": {
   "name": "Formula1.com",
   "handle": "F1"
  },
  "fia": {
   "name": "FIA",
   "handle": "fia"
  },
  "autosport": {
   "name": "Autosport",
   "handle": "autosport"
  },
  "therace": {
   "name": "The Race",
   "handle": "wearetherace"
  },
  "motorsport": {
   "name": "Motorsport.com",
   "handle": "motorsport"
  },
  "racefans": {
   "name": "RaceFans",
   "handle": "racefansdotnet"
  },
  "sky": {
   "name": "Sky Sports F1",
   "handle": "SkySportsF1"
  },
  "bbc": {
   "name": "BBC Sport",
   "handle": "BBCSport"
  },
  "planetf1": {
   "name": "PlanetF1",
   "handle": "Planet_F1"
  },
  "crash": {
   "name": "Crash.net",
   "handle": "crash_net"
  },
  "ge": {
   "name": "ge",
   "handle": "globoesportecom"
  },
  "gp": {
   "name": "Grande Prêmio",
   "handle": "grandepremio"
  },
  "gazzetta": {
   "name": "La Gazzetta dello Sport",
   "handle": "Gazzetta_it"
  },
  "corriere": {
   "name": "Corriere dello Sport",
   "handle": "CorSport"
  },
  "marca": {
   "name": "Marca",
   "handle": "marca"
  },
  "as": {
   "name": "AS",
   "handle": "diarioas"
  },
  "lequipe": {
   "name": "L'Équipe",
   "handle": "lequipe"
  },
  "ams": {
   "name": "auto motor und sport",
   "handle": "ams_motorsport"
  },
  "bild": {
   "name": "Bild",
   "handle": "BILD"
  },
  "telegraaf": {
   "name": "De Telegraaf",
   "handle": "telegraaf"
  },
  "speedcafe": {
   "name": "Speedcafe",
   "handle": "speedcafe"
  },
  "ole": {
   "name": "Olé",
   "handle": "DiarioOle"
  },
  "espn": {
   "name": "ESPN",
   "handle": "espn"
  },
  "record": {
   "name": "Récord",
   "handle": "record_mexico"
  },
  "nzherald": {
   "name": "NZ Herald",
   "handle": "nzherald"
  }
 },
 "handles": {
  "max-verstappen": "Max33Verstappen",
  "lewis-hamilton": "LewisHamilton",
  "charles-leclerc": "Charles_Leclerc",
  "lando-norris": "LandoNorris",
  "oscar-piastri": "OscarPiastri",
  "george-russell": "GeorgeRussell63",
  "kimi-antonelli": "KimiAntonelli",
  "fernando-alonso": "alo_oficial",
  "lance-stroll": "lance_stroll",
  "carlos-sainz-jr": "Carlossainz55",
  "alexander-albon": "alex_albon",
  "pierre-gasly": "PierreGASLY",
  "esteban-ocon": "OconEsteban",
  "nico-hulkenberg": "HulkHulkenberg",
  "yuki-tsunoda": "yukitsunoda07",
  "liam-lawson": "liamlawson30",
  "gabriel-bortoleto": "gabortoleto85",
  "isack-hadjar": "isack_hadjar",
  "oliver-bearman": "OllieBearman",
  "franco-colapinto": "FranColapinto",
  "valtteri-bottas": "ValtteriBottas",
  "sergio-perez": "SChecoPerez",
  "arvid-lindblad": "arvidracing",
  "guanyu-zhou": "ZhouGuanyu24",
  "mick-schumacher": "SchumacherMick",
  "felipe-drugovich": "FelipeDrugovich",
  "richard-verschoor": "R_Verschoor1",
  "dino-beganovic": "dinobeganovic4",
  "ayumu-iwasa": "ayumuiwasa_cars",
  "luke-browning": "lukebrown1ng",
  "ferrari": "ScuderiaFerrari",
  "mercedes": "MercedesAMGF1",
  "red-bull": "redbullracing",
  "mclaren": "McLarenF1",
  "aston-martin": "AstonMartinF1",
  "alpine": "AlpineF1Team",
  "williams": "WilliamsF1",
  "haas": "HaasF1Team",
  "racing-bulls": "VisaCashAppRB",
  "audi": "AudiF1",
  "cadillac": "cadillacf1_"
 }
};
