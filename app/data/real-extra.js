/* Dados reais complementares (contratos, salários, staff, empresários, academias) — pesquisa em 2026-11-06. Fontes: the-race.com (contratos, grid 2027); racingnews365.com (salários, engenheiros de corrida); pitdebrief.com (dirigentes e staff técnico 2026); gpblog.com (empresários); en.wikipedia.org (academias, biografias) */
const REAL_EXTRA = {
 "ref": "2026-11-06",
 "sources": [
  "the-race.com (contratos, grid 2027)",
  "racingnews365.com (salários, engenheiros de corrida)",
  "pitdebrief.com (dirigentes e staff técnico 2026)",
  "gpblog.com (empresários)",
  "en.wikipedia.org (academias, biografias)"
 ],
 "contracts": {
  "lando-norris": {
   "until": 2030,
   "salary": 30,
   "option": {
    "year": 2031,
    "holder": "mutual"
   }
  },
  "oscar-piastri": {
   "until": 2028,
   "salary": 13
  },
  "george-russell": {
   "until": 2027,
   "salary": 34,
   "clauses": [
    "performance"
   ],
   "note": "Contrato 1+1 com cláusula de desempenho para 2027"
  },
  "kimi-antonelli": {
   "until": 2027,
   "salary": 2,
   "estimated": true,
   "note": "Contrato até 2026 com opções de extensão; o jogo assume a opção exercida"
  },
  "max-verstappen": {
   "until": 2030,
   "salary": 70
  },
  "isack-hadjar": {
   "until": 2027,
   "salary": 5
  },
  "charles-leclerc": {
   "until": 2031,
   "salary": 34,
   "note": "Renovado em 2026 para \"além de 2030\""
  },
  "lewis-hamilton": {
   "until": 2027,
   "salary": 60,
   "option": {
    "year": 2028,
    "holder": "driver"
   }
  },
  "alexander-albon": {
   "until": 2027,
   "salary": 12
  },
  "carlos-sainz-jr": {
   "until": 2028,
   "salary": 13,
   "option": {
    "year": 2029,
    "holder": "team"
   }
  },
  "liam-lawson": {
   "until": 2027,
   "salary": 1,
   "estimated": true,
   "note": "Contrato real termina em 2026; Racing Bulls ainda não anunciou 2027"
  },
  "arvid-lindblad": {
   "until": 2027,
   "salary": 0.75,
   "estimated": true,
   "note": "Contrato real termina em 2026; Racing Bulls ainda não anunciou 2027"
  },
  "fernando-alonso": {
   "until": 2027,
   "salary": 20
  },
  "lance-stroll": {
   "until": 2027,
   "salary": 12
  },
  "oliver-bearman": {
   "until": 2027,
   "salary": 1,
   "option": {
    "year": 2027,
    "holder": "team"
   },
   "note": "Contrato 2+1: opção da Haas para 2027"
  },
  "esteban-ocon": {
   "until": 2026,
   "salary": 7,
   "leaves": true,
   "note": "Anunciou a saída da Haas no fim de 2026"
  },
  "nico-hulkenberg": {
   "until": 2027,
   "salary": 7
  },
  "gabriel-bortoleto": {
   "until": 2027,
   "salary": 2
  },
  "pierre-gasly": {
   "until": 2028,
   "salary": 12
  },
  "franco-colapinto": {
   "until": 2027,
   "salary": 0.75
  },
  "sergio-perez": {
   "until": 2029,
   "salary": 8
  },
  "valtteri-bottas": {
   "until": 2027,
   "salary": 5,
   "note": "Possibilidade de rescisão antecipada noticiada"
  },
  "rafael-camara": {
   "until": 2028,
   "salary": 0.75,
   "note": "Contrato plurianual com a Haas a partir de 2027 (piloto da Ferrari Driver Academy)"
  }
 },
 "moves2027": [
  {
   "driver": "rafael-camara",
   "team": "haas",
   "seat": 2,
   "replaces": "esteban-ocon"
  }
 ],
 "newDrivers": [
  {
   "id": "rafael-camara",
   "name": "Rafael Câmara",
   "firstName": "Rafael",
   "lastName": "Câmara",
   "nat": "BRA",
   "dob": "2005-05-05",
   "number": 51,
   "style": "complete",
   "ovr": 81,
   "potential": 91,
   "academy": "ferrari",
   "career": {
    "starts": 0,
    "wins": 0,
    "podiums": 0,
    "poles": 0,
    "titles": 0,
    "points": 0,
    "fl": 0
   },
   "imgCode": [
    "haasf1team",
    "rafcam01"
   ],
   "note": "Líder da F2 em 2026 pela Invicta"
  }
 ],
 "managers": {
  "lando-norris": "ADD Management (Mark Berryman, Fraser Sheader)",
  "oscar-piastri": "JAM Sports Management (Mark Webber)",
  "george-russell": "Harry Soden (Infinity Sports Management)",
  "kimi-antonelli": "Minardi Management",
  "max-verstappen": "Raymond Vermeulen",
  "isack-hadjar": "Guillaume Le Goff (The Grid Agency)",
  "charles-leclerc": "All Road Management (Nicolas Todt)",
  "lewis-hamilton": "Marc Hynes",
  "carlos-sainz-jr": "Carlos Oñoro Sainz",
  "alexander-albon": "Jacques Heckstall-Smith (Grip Sports Management)",
  "liam-lawson": "Grant McDonald",
  "arvid-lindblad": "Oliver Rowland",
  "fernando-alonso": "A14 Management (Alberto Fernández)",
  "lance-stroll": "Melvin Hoppelheim Jr.",
  "esteban-ocon": "MB1 Management",
  "oliver-bearman": "WH Driver Management",
  "nico-hulkenberg": "Raoul Spanger",
  "gabriel-bortoleto": "A14 Management",
  "pierre-gasly": "Guillaume Le Goff (The Grid Agency)",
  "franco-colapinto": "Bullet Sports Management",
  "sergio-perez": "Khalil Beschir",
  "valtteri-bottas": "Didier Coton (Aces Management Group)",
  "yuki-tsunoda": "Mario Miyakawa",
  "freddie-slater": "ADD Management"
 },
 "raceEngineers": {
  "lando-norris": "Will Joseph",
  "oscar-piastri": "Tom Stallard",
  "george-russell": "Marcus Dudley",
  "kimi-antonelli": "Peter Bonnington",
  "max-verstappen": "Gianpiero Lambiase",
  "lewis-hamilton": "Carlo Santi",
  "charles-leclerc": "Bryan Bozzi",
  "alexander-albon": "James Urwin",
  "liam-lawson": "Alexandre Iliopoulos",
  "lance-stroll": "Stephen Glass",
  "esteban-ocon": "Laura Mueller",
  "nico-hulkenberg": "Steven Petrik",
  "pierre-gasly": "Josh Peckett",
  "franco-colapinto": "Stuart Barlow",
  "valtteri-bottas": "John Howard",
  "sergio-perez": "Carlo Pasetti"
 },
 "staff": {
  "mercedes": {
   "principal": "Toto Wolff",
   "technical": "James Allison",
   "sporting": "Ron Meadows",
   "operations": "Rob Thomas",
   "commercial": "Richard Sanders",
   "engine": "Hywel Thomas",
   "chassis": "MERCEDES F1 W17",
   "pu": "Mercedes-AMG F1 M17"
  },
  "ferrari": {
   "principal": "Frédéric Vasseur",
   "deputy": "Jérôme d'Ambrosio",
   "sporting": "Diego Ioverno",
   "technical": "Loïc Serra",
   "aero": "Diego Tondi",
   "engine": "Enrico Gualtieri",
   "trackEngineering": "Matteo Togninalli",
   "chassis": "SF-26",
   "pu": "Ferrari 067/6"
  },
  "red-bull": {
   "principal": "Laurent Mekies",
   "technical": "Pierre Waché",
   "chiefEngineer": "Paul Monaghan",
   "performance": "Ben Waterhouse",
   "raceEngineering": "Gianpiero Lambiase",
   "aero": "Enrico Balbo",
   "strategy": "Hannah Schmitz",
   "operations": "Richard Wolverson",
   "chassis": "RB22",
   "pu": "Red Bull Ford DM01"
  },
  "mclaren": {
   "principal": "Andrea Stella",
   "ceo": "Zak Brown",
   "aero": "Peter Prodromou",
   "performance": "Mark Temple",
   "designer": "Rob Marshall",
   "technical": "Neil Houdley",
   "operations": "Piers Thynne",
   "chassis": "MCL40",
   "pu": "Mercedes-AMG F1 M17"
  },
  "alpine": {
   "principal": "Flavio Briatore",
   "ceo": "Philippe Krief",
   "technical": "David Sanchez",
   "racing": "Dave Greenwood",
   "operations": "Ian Pearce",
   "chiefEngineer": "Joe Burnell",
   "aero": "David Wheater",
   "chassis": "A526",
   "pu": "Mercedes-AMG F1 M17"
  },
  "racing-bulls": {
   "principal": "Alan Permane",
   "ceo": "Peter Bayer",
   "technical": "Dan Fallows",
   "sporting": "Marco Perrone",
   "cto": "Tim Goss",
   "chassis": "VCARB 03",
   "pu": "Red Bull Ford DM01"
  },
  "audi": {
   "principal": "Jonathan Wheatley",
   "head": "Mattia Binotto",
   "technical": "James Key",
   "engine": "Stefan Dreyer",
   "operations": "Christian Foyer",
   "chassis": "R26",
   "pu": "Audi AFR 26 Hybrid"
  },
  "aston-martin": {
   "principal": "Adrian Newey",
   "owner": "Lawrence Stroll",
   "technical": "Enrico Cardile",
   "strategyChief": "Andy Cowell",
   "trackside": "Mike Krack",
   "performance": "Tom McCullough",
   "chiefEngineer": "Luca Furbatto",
   "sporting": "Andy Stevenson",
   "chassis": "AMR26",
   "pu": "Honda RA626H"
  },
  "haas": {
   "principal": "Ayao Komatsu",
   "owner": "Gene Haas",
   "technical": "Andrea de Zordo",
   "designer": "Tom Coupland",
   "aero": "Davide Paganelli",
   "performance": "Damien Brayshaw",
   "sporting": "Mark Lowe",
   "chassis": "VF-26",
   "pu": "Ferrari 067/6"
  },
  "williams": {
   "principal": "James Vowles",
   "technical": "Pat Fry",
   "operations": "Axel Kruse",
   "sporting": "Sven Smeets",
   "chiefEngineer": "Dave Robson",
   "chassis": "FW48",
   "pu": "Mercedes-AMG F1 M17"
  },
  "cadillac": {
   "principal": "Graeme Lowdon",
   "ceo": "Dan Towriss",
   "technical": "Nick Chester",
   "consultant": "Pat Symonds",
   "operations": "Rob White",
   "raceEngineering": "Xavi Marcos Padros",
   "chassis": "MAC-26",
   "pu": "Ferrari 067/6"
  }
 },
 "works": [
  "mercedes",
  "ferrari",
  "red-bull",
  "aston-martin",
  "audi"
 ],
 "partners": {
  "ferrari": [
   "haas",
   "cadillac"
  ],
  "red-bull": [
   "racing-bulls"
  ],
  "mercedes": [
   "williams",
   "alpine",
   "mclaren"
  ]
 },
 "budgets": {
  "ferrari": 650,
  "mercedes": 620,
  "mclaren": 600,
  "red-bull": 560,
  "audi": 450,
  "aston-martin": 420,
  "cadillac": 400,
  "williams": 340,
  "alpine": 330,
  "racing-bulls": 300,
  "haas": 260
 },
 "academies": [
  {
   "id": "red-bull",
   "team": "red-bull",
   "name": "Red Bull Junior Team",
   "members": [
    {
     "name": "Enzo Tarnvanichkul",
     "nat": "THA",
     "series": [
      "2026 Eurocup-3 season"
     ]
    },
    {
     "name": "Rocco Coronel",
     "nat": "NLD",
     "series": [
      "2026 Formula Winter Series",
      "2026 F4 Spanish Championship"
     ]
    },
    {
     "name": "Scott Kin Lindblom",
     "nat": "SWE",
     "series": [
      "2026 UAE4 Series",
      "2026 F4 British Championship"
     ]
    },
    {
     "name": "Fionn McLaughlin",
     "nat": "IRL",
     "series": [
      "2026 Formula Regional Oceania Trophy",
      "2026 FIA Formula 3 Championship"
     ]
    },
    {
     "name": "Nikola Tsolov",
     "nat": "BUL",
     "series": [
      "2026 Formula 2 Championship"
     ]
    },
    {
     "name": "Chiara Bättig",
     "nat": "CHE",
     "series": [
      "2026 Formula Winter Series",
      "2026 F4 British Championship"
     ]
    },
    {
     "name": "Mattia Colnaghi",
     "nat": "ARG",
     "series": [
      "2026 FIA Formula 3 Championship"
     ]
    },
    {
     "name": "Melvin Kalousdian",
     "nat": "SWE",
     "series": [
      "2026 Ginetta Junior Championship"
     ]
    },
    {
     "name": "Robin Räikkönen",
     "nat": "FIN",
     "series": []
    }
   ]
  },
  {
   "id": "ferrari",
   "team": "ferrari",
   "name": "Ferrari Driver Academy",
   "members": [
    {
     "name": "Dino Beganovic",
     "nat": "SWE",
     "series": [
      "2026 Formula 2 Championship"
     ]
    },
    {
     "name": "Rafael Câmara",
     "nat": "BRA",
     "series": [
      "2026 Formula 2 Championship"
     ]
    },
    {
     "name": "Tuukka Taponen",
     "nat": "FIN",
     "series": [
      "2026 FIA Formula 3 Championship",
      "2027 Formula 2 Championship"
     ]
    },
    {
     "name": "Noah Baglin",
     "nat": "GBR",
     "series": []
    },
    {
     "name": "Filippo Sala",
     "nat": "ITA",
     "series": []
    },
    {
     "name": "Alba Hurup Larsen",
     "nat": "DNK",
     "series": [
      "2026 UAE4 Series",
      "2026 F1 Academy season",
      "2026 F4 British Championship",
      "2027 F1 Academy season"
     ]
    },
    {
     "name": "Niccolò Maccagnani",
     "nat": "ITA",
     "series": [
      "2026 UAE4 Series",
      "2026 Italian F4 Championship",
      "2026 FIA Formula 3 Championship",
      "2027 FIA Formula 3 Championship"
     ]
    },
    {
     "name": "Alp Aksoy",
     "nat": "TUR",
     "series": [
      "2027 Formula Regional European Championship"
     ]
    },
    {
     "name": "Salim Hanna",
     "nat": "COL",
     "series": [
      "2027 FIA Formula 3 Championship"
     ]
    },
    {
     "name": "Daniel Miron",
     "nat": "ESP",
     "series": []
    }
   ]
  },
  {
   "id": "mercedes",
   "team": "mercedes",
   "name": "Mercedes Junior Programme",
   "members": [
    {
     "name": "Luna Fluxá",
     "nat": "ESP",
     "series": [
      "2026 F4 Spanish Championship"
     ]
    },
    {
     "name": "Kenzo Craigie",
     "nat": "GBR",
     "series": [
      "2026 UAE4 Series",
      "2026 Italian F4 Championship",
      "2026 E4 Championship"
     ]
    },
    {
     "name": "Rashid Al Dhaheri",
     "nat": "ARE",
     "series": [
      "2026 Formula Regional Middle East Trophy",
      "2026 Formula Regional European Championship"
     ]
    },
    {
     "name": "Andy Consani",
     "nat": "FRA",
     "series": [
      "2026 UAE4 Series",
      "2026 Italian F4 Championship",
      "2026 E4 Championship"
     ]
    },
    {
     "name": "Niccolò Perico",
     "nat": "ITA",
     "series": []
    },
    {
     "name": "Devin Titz",
     "nat": "DEU",
     "series": []
    },
    {
     "name": "Payton Westcott",
     "nat": "USA",
     "series": [
      "2026 F1 Academy season",
      "2026 Italian F4 Championship"
     ]
    }
   ]
  },
  {
   "id": "mclaren",
   "team": "mclaren",
   "name": "McLaren Driver Development Programme",
   "members": [
    {
     "name": "Pato O'Ward",
     "nat": "MEX",
     "series": [
      "2026 IndyCar Series"
     ]
    },
    {
     "name": "Dries Van Langendonck",
     "nat": "BEL",
     "series": [
      "2026 Formula Winter Series",
      "2026 F4 British Championship",
      "2026 Formula Winter Series",
      "2026 F4 British Championship"
     ]
    },
    {
     "name": "Ella Lloyd",
     "nat": "GBR",
     "series": [
      "2026 F1 Academy season"
     ]
    },
    {
     "name": "Matteo De Palo",
     "nat": "ITA",
     "series": [
      "2026 FIA Formula 3 Championship"
     ]
    },
    {
     "name": "Christian Costoya",
     "nat": "ESP",
     "series": [
      "2026 UAE4 Series",
      "2026 Italian F4 Championship",
      "2026 E4 Championship"
     ]
    },
    {
     "name": "Leonardo Fornaroli",
     "nat": "ITA",
     "series": []
    },
    {
     "name": "Ella Häkkinen",
     "nat": "CZE",
     "series": [
      "2026 Formula 4 CEZ Championship"
     ]
    },
    {
     "name": "Grégoire Saucy",
     "nat": "CHE",
     "series": [
      "2026 European Le Mans Series"
     ]
    },
    {
     "name": "Richard Verschoor",
     "nat": "NLD",
     "series": [
      "2026 European Le Mans Series"
     ]
    },
    {
     "name": "Harry Williams",
     "nat": "GBR",
     "series": []
    }
   ]
  },
  {
   "id": "alpine",
   "team": "alpine",
   "name": "Alpine Academy",
   "members": [
    {
     "name": "Kush Maini",
     "nat": "IND",
     "series": [
      "2026 Formula 2 Championship"
     ]
    },
    {
     "name": "Gabriele Minì",
     "nat": "ITA",
     "series": [
      "2026 Formula 2 Championship"
     ]
    },
    {
     "name": "Kabir Anurag",
     "nat": "SGP",
     "series": [
      "2026 Formula Regional Middle East Trophy",
      "2026 Formula Regional European Championship"
     ]
    },
    {
     "name": "Keanu Al Azhari",
     "nat": "UAE",
     "series": [
      "2026 Eurocup-3 season"
     ]
    },
    {
     "name": "Nina Gademan",
     "nat": "NLD",
     "series": [
      "2026 F1 Academy season"
     ]
    },
    {
     "name": "Sukhmani Kaur Khera",
     "nat": "GBR",
     "series": []
    },
    {
     "name": "Ilie Tristan Crisan",
     "nat": "CAN",
     "series": []
    },
    {
     "name": "Alex Dunne",
     "nat": "IRL",
     "series": [
      "2026 Formula 2 Championship"
     ]
    }
   ]
  },
  {
   "id": "williams",
   "team": "williams",
   "name": "Williams Driver Academy",
   "members": [
    {
     "name": "Oleksandr Bondarev",
     "nat": "UKR",
     "series": [
      "2026 UAE4 Series",
      "2026 Italian F4 Championship",
      "2026 E4 Championship",
      "2026 Formula Regional European Championship",
      "2026 UAE4 Series"
     ]
    },
    {
     "name": "Luke Browning",
     "nat": "GBR",
     "series": [
      "2026 Super Formula Championship"
     ]
    },
    {
     "name": "Alessandro Giusti",
     "nat": "FRA",
     "series": [
      "2026 FIA Formula 3 Championship"
     ]
    },
    {
     "name": "Dean Hoogendoorn",
     "nat": "NLD",
     "series": []
    },
    {
     "name": "Jade Jacquet",
     "nat": "FRA",
     "series": [
      "2026 F1 Academy season",
      "2026 French F4 Championship",
      "2026 Formula 4 CEZ Championship"
     ]
    },
    {
     "name": "Kean Nakamura-Berta",
     "nat": "GBR",
     "series": [
      "2026 Formula Regional Middle East Trophy",
      "2026 Formula Regional European Championship",
      "2027 FIA Formula 3 Championship",
      "2026 Formula Regional Middle East Trophy"
     ]
    }
   ]
  },
  {
   "id": "aston-martin",
   "team": "aston-martin",
   "name": "Aston Martin Driver Development Programme",
   "members": [
    {
     "name": "Jak Crawford",
     "nat": "USA",
     "series": []
    },
    {
     "name": "Mari Boya",
     "nat": "ESP",
     "series": [
      "2026 Formula 2 Championship",
      "2026 GT World Challenge Europe Endurance Cup"
     ]
    },
    {
     "name": "Mathilda Paatz",
     "nat": "DEU",
     "series": [
      "2026 F1 Academy season",
      "2026 Formula Winter Series",
      "2026 Formula 4 CEZ Championship"
     ]
    },
    {
     "name": "Zhenrui Chi",
     "nat": "CHN",
     "series": [
      "2026 Formula Regional European Championship"
     ]
    },
    {
     "name": "Niklas Schaufler",
     "nat": "AUT",
     "series": []
    },
    {
     "name": "Felipe Drugovich",
     "nat": "BRA",
     "series": []
    },
    {
     "name": "Tina Hausmann",
     "nat": "CHE",
     "series": []
    }
   ]
  },
  {
   "id": "audi",
   "team": "audi",
   "name": "Audi F1 Driver Academy",
   "members": []
  }
 ],
 "superlicense": {
  "f2": [
   40,
   40,
   40,
   30,
   20,
   10,
   8,
   6,
   4,
   3
  ],
  "f3": [
   30,
   25,
   20,
   15,
   12,
   9,
   7,
   5,
   3,
   2
  ],
  "fe": [
   30,
   25,
   20,
   10,
   8,
   6,
   4,
   3,
   2,
   1
  ],
  "sf": [
   25,
   20,
   15,
   10,
   8,
   6,
   5,
   4,
   3,
   2
  ],
  "freca": [
   25,
   20,
   15,
   10,
   7,
   5,
   3,
   2,
   1,
   0
  ],
  "frme": [
   18,
   14,
   12,
   10,
   7,
   5,
   3,
   2,
   1,
   0
  ],
  "fram": [
   18,
   14,
   12,
   10,
   7,
   5,
   3,
   2,
   1,
   0
  ],
  "fras": [
   10,
   8,
   6,
   4,
   3,
   2,
   1,
   0,
   0,
   0
  ],
  "f4": [
   12,
   10,
   7,
   5,
   3,
   2,
   1,
   0,
   0,
   0
  ]
  },
 "famousStaff": {
  "Adrian Newey": 99,
  "James Allison": 94,
  "Pierre Waché": 92,
  "Toto Wolff": 95,
  "Andrea Stella": 93,
  "Peter Prodromou": 92,
  "Gianpiero Lambiase": 93,
  "Hannah Schmitz": 92,
  "Enrico Cardile": 89,
  "Loïc Serra": 89,
  "Frédéric Vasseur": 88,
  "Pat Fry": 88,
  "James Key": 87,
  "Pat Symonds": 90,
  "Mattia Binotto": 87,
  "Peter Bonnington": 92,
  "Will Joseph": 90,
  "Dan Fallows": 89,
  "Rob Marshall": 91,
  "Andy Cowell": 92,
  "Laurent Mekies": 87,
  "James Vowles": 88,
  "Jonathan Wheatley": 87,
  "Ayao Komatsu": 85,
  "Flavio Briatore": 86,
  "Zak Brown": 88
  },
 "identities": {
  "alpine": {
   "2027": {
    "name": "Gucci Racing Alpine",
    "fullName": "Gucci Racing Alpine Formula One Team",
    "titleSponsor": "Gucci",
    "sponsorsRemove": [
     "BWT"
    ],
    "sponsorsAdd": [
     "Gucci"
    ],
    "ended": "BWT",
    "status": {
     "name": "confirmado",
     "titleSponsor": "confirmado",
     "colors": "provisório (a pintura de 2027 ainda não foi apresentada)",
     "value": "não divulgado oficialmente"
    },
    "source": "Anúncio oficial da Alpine e da Gucci em 27/05/2026 (media.alpinecars.com; formula1.com)",
    "verified": "2026-11-06",
    "note": "A Gucci é title partner e parceira de marca, não proprietária. A inscrição no campeonato segue como Alpine.",
    "news": {
     "title": "Alpine vira Gucci Racing Alpine: a Gucci é a nova title partner da equipe",
     "body": "A partir desta temporada a equipe corre como Gucci Racing Alpine Formula One Team. É a primeira vez que uma casa de moda de luxo assume o title partnership de uma equipe de Fórmula 1. A Gucci substitui a BWT, que deixa o posto de title partner; a equipe segue inscrita como Alpine e pertence ao grupo Renault."
    }
   }
  }
 },
 /* dinheiro anual do dono (US$ mi), por equipe (antes Econ.OWNER no código) */
 "ownerFunds": {
  "mercedes": 55,
  "ferrari": 85,
  "red-bull": 100,
  "mclaren": 30,
  "racing-bulls": 80,
  "alpine": 85,
  "haas": 35,
  "audi": 160,
  "williams": 45,
  "aston-martin": 95,
  "cadillac": 150
 },
 /* peso da tradição no prêmio da FOM, por equipe (antes Econ.HERITAGE) */
 "heritage": {
  "ferrari": 45,
  "mercedes": 15,
  "red-bull": 15,
  "mclaren": 10,
  "williams": 10
 },
 /* equipe irmã -> equipe-mãe (antes Sisters.REAL) */
 "sisters": {
  "racing-bulls": "red-bull"
 },
 /* equipe cliente -> [fornecedora, peças em português, peças em inglês] (antes Owners.PARTNERS) */
 "partsDeals": {
  "haas": [
   "ferrari",
   [
    "motor",
    "câmbio",
    "suspensão",
    "túnel de vento"
   ],
   [
    "engine",
    "gearbox",
    "suspension",
    "wind tunnel"
   ]
  ],
  "williams": [
   "mercedes",
   [
    "motor",
    "câmbio",
    "suspensão traseira"
   ],
   [
    "engine",
    "gearbox",
    "rear suspension"
   ]
  ],
  "cadillac": [
   "ferrari",
   [
    "motor",
    "câmbio"
   ],
   [
    "engine",
    "gearbox"
   ]
  ],
  "alpine": [
   "mercedes",
   [
    "motor",
    "câmbio"
   ],
   [
    "engine",
    "gearbox"
   ]
  ]
 },
 /* até que ano vai o contrato de motor de cada equipe cliente (antes Mfr.REAL_CONTRACTS) */
 "engineDeals": {
  "mclaren": 2030,
  "williams": 2030,
  "alpine": 2030,
  "haas": 2028,
  "cadillac": 2028,
  "racing-bulls": 2030
 },
 /* orçamento de desenvolvimento de cada fabricante de motor; os demais, 120 (antes no Mfr.ensure) */
 "engineDev": {
  "mercedes": 150,
  "ferrari": 150,
  "honda": 140,
  "audi": 140
 },
 /* traços reais por piloto: longevity (carreira longa), instant (adaptação imediata a outra disciplina), slTracked (superlicença acompanhada sem ser reserva), noSuperLicence (antes no código: talent, disciplines e data.js) */
 "driverTraits": {
  "fernando-alonso": {
   "longevity": true,
   "instant": true
  },
  "lewis-hamilton": {
   "longevity": true
  },
  "max-verstappen": {
   "instant": true
  },
  "rafael-camara": {
   "slTracked": true
  },
  "freddie-slater": {
   "noSuperLicence": true
  }
 },
 /* fatos de cada pista do mundo real, por id (antes no código): alloc = compostos da Pirelli em 2026 [duro, médio, macio, 1 = confirmado em fontes] (Engine.ALLOC); light = corrida noturna ou ao entardecer (Engine.NIGHT); heat = calor a mais do deserto, em °C (Engine.DESERT); corners = curvas por setor, para a narração (Narr.CORNERS); fiaName = nome na lista de circuitos da FIA (Circuits.MAP); fiaNote = por que não está na lista (Circuits.NOTE); f1Now = no calendário atual da F1, com Grau 1 (Circuits.F1_NOW); classic = clássico que o Conselho não tira do calendário (Council.CLASSICS); gpName = nome histórico do GP (Council.GP); noSprint = o Conselho nunca propõe sprint ali */
 "trackInfo": {
  "melbourne": {
   "alloc": [
    3,
    4,
    5,
    1
   ],
   "corners": [
    [
     "curva 1",
     "curva 3"
    ],
    [
     "sequência das curvas 6 e 7",
     "chicane das curvas 9 e 10"
    ],
    [
     "curva 11",
     "curva 13",
     "última curva"
    ]
   ],
   "f1Now": true,
   "classic": true
  },
  "shanghai": {
   "alloc": [
    2,
    3,
    4,
    1
   ],
   "fiaName": "SHANGHAI INTERNATIONAL",
   "f1Now": true
  },
  "suzuka": {
   "alloc": [
    1,
    2,
    3,
    1
   ],
   "corners": [
    [
     "curva 1",
     "Esses",
     "Dunlop"
    ],
    [
     "Degner",
     "hairpin",
     "Spoon"
    ],
    [
     "130R",
     "chicane Casio"
    ]
   ],
   "fiaName": "SUZUKA",
   "f1Now": true,
   "classic": true
  },
  "catalunya": {
   "alloc": [
    2,
    3,
    4,
    1
   ],
   "corners": [
    [
     "curva 1",
     "curva 3"
    ],
    [
     "Repsol",
     "Campsa"
    ],
    [
     "La Caixa",
     "curva final"
    ]
   ],
   "fiaName": "CATALUNYA",
   "f1Now": true
  },
  "silverstone": {
   "alloc": [
    1,
    2,
    3,
    1
   ],
   "corners": [
    [
     "Abbey",
     "Village",
     "The Loop",
     "Aintree"
    ],
    [
     "Brooklands",
     "Luffield",
     "Copse",
     "Maggotts",
     "Becketts"
    ],
    [
     "Chapel",
     "Stowe",
     "Vale",
     "Club"
    ]
   ],
   "fiaName": "SILVERSTONE GRAND PRIX",
   "f1Now": true,
   "classic": true
  },
  "austin": {
   "alloc": [
    2,
    3,
    4,
    1
   ],
   "corners": [
    [
     "curva 1",
     "Esses"
    ],
    [
     "hairpin da curva 11",
     "curva 12"
    ],
    [
     "setor do estádio",
     "curvas 16 a 18"
    ]
   ],
   "fiaName": "CIRCUIT OF THE AMERICAS",
   "f1Now": true
  },
  "montreal": {
   "alloc": [
    3,
    4,
    5,
    1
   ],
   "corners": [
    [
     "curva Senna",
     "curva 3"
    ],
    [
     "hairpin",
     "curva 8"
    ],
    [
     "chicane final",
     "Muro dos Campeões"
    ]
   ],
   "fiaName": "MONTREAL GILLES VILLENEUVE",
   "f1Now": true,
   "classic": true
  },
  "monza": {
   "alloc": [
    3,
    4,
    5,
    1
   ],
   "corners": [
    [
     "Variante del Rettifilo",
     "Curva Grande"
    ],
    [
     "Variante della Roggia",
     "primeira de Lesmo",
     "segunda de Lesmo"
    ],
    [
     "Variante Ascari",
     "Curva Alboreto"
    ]
   ],
   "fiaName": "MONZA",
   "f1Now": true,
   "classic": true
  },
  "miami": {
   "alloc": [
    2,
    3,
    4,
    0
   ],
   "fiaName": "MIAMI",
   "f1Now": true
  },
  "monaco": {
   "alloc": [
    3,
    4,
    5,
    0
   ],
   "corners": [
    [
     "Sainte Dévote",
     "Massenet",
     "Casino"
    ],
    [
     "Mirabeau",
     "Grand Hotel",
     "Portier",
     "túnel"
    ],
    [
     "chicane do Porto",
     "Tabac",
     "Piscine",
     "Rascasse",
     "Anthony Noghès"
    ]
   ],
   "fiaName": "MONACO",
   "f1Now": true,
   "classic": true,
   "noSprint": true
  },
  "spielberg": {
   "alloc": [
    3,
    4,
    5,
    0
   ],
   "corners": [
    [
     "curva Niki Lauda",
     "Remus"
    ],
    [
     "Schlossgold",
     "Rauch",
     "Würth"
    ],
    [
     "Rindt",
     "Red Bull Mobile"
    ]
   ],
   "fiaName": "RED BULL RING - SPIELBERG",
   "f1Now": true
  },
  "spa-francorchamps": {
   "alloc": [
    2,
    3,
    4,
    0
   ],
   "corners": [
    [
     "La Source",
     "Eau Rouge",
     "Raidillon"
    ],
    [
     "Les Combes",
     "Bruxelles",
     "Pouhon",
     "Campus"
    ],
    [
     "Blanchimont",
     "chicane da Bus Stop"
    ]
   ],
   "fiaName": "SPA-FRANCORCHAMPS",
   "f1Now": true,
   "classic": true
  },
  "hungaroring": {
   "alloc": [
    3,
    4,
    5,
    0
   ],
   "corners": [
    [
     "curva 1",
     "curva 2"
    ],
    [
     "chicane das curvas 6 e 7",
     "curva 11"
    ],
    [
     "curva 13",
     "curva 14"
    ]
   ],
   "fiaName": "HUNGARORING",
   "f1Now": true
  },
  "zandvoort": {
   "alloc": [
    2,
    3,
    4,
    0
   ],
   "corners": [
    [
     "Tarzan",
     "Gerlach",
     "Hugenholtz"
    ],
    [
     "Scheivlak",
     "Masters",
     "Hans Ernst"
    ],
    [
     "curva Arie Luyendyk"
    ]
   ],
   "fiaName": "ZANDVOORT",
   "f1Now": true
  },
  "madring": {
   "alloc": [
    2,
    3,
    4,
    0
   ],
   "fiaName": "MADRID IFEMA",
   "f1Now": true
  },
  "baku": {
   "alloc": [
    3,
    4,
    5,
    0
   ],
   "corners": [
    [
     "curva 1",
     "curva 3"
    ],
    [
     "trecho do castelo",
     "curva 12"
    ],
    [
     "reta da orla",
     "curva 16"
    ]
   ],
   "fiaName": "BAKU",
   "f1Now": true
  },
  "sepang": {
   "alloc": [
    1,
    2,
    3,
    0
   ],
   "fiaName": "SEPANG"
  },
  "marina-bay": {
   "alloc": [
    3,
    4,
    5,
    0
   ],
   "light": "night",
   "corners": [
    [
     "curva 1",
     "curva 3",
     "curva 5"
    ],
    [
     "ponte Anderson",
     "Esplanade"
    ],
    [
     "curva 16",
     "última curva"
    ]
   ],
   "fiaName": "SINGAPORE - MARINA BAY",
   "f1Now": true
  },
  "mexico-city": {
   "alloc": [
    2,
    3,
    4,
    0
   ],
   "heat": -6,
   "corners": [
    [
     "curva 1",
     "Esses"
    ],
    [
     "curva 12"
    ],
    [
     "Foro Sol",
     "Peraltada"
    ]
   ],
   "fiaName": "AUTODROMO HERMANOS RODRIGUEZ",
   "f1Now": true
  },
  "interlagos": {
   "alloc": [
    2,
    3,
    4,
    0
   ],
   "corners": [
    [
     "S do Senna",
     "Curva do Sol"
    ],
    [
     "Descida do Lago",
     "Ferradura",
     "Pinheirinho",
     "Bico de Pato",
     "Mergulho"
    ],
    [
     "Junção",
     "Subida dos Boxes"
    ]
   ],
   "fiaName": "INTERLAGOS",
   "f1Now": true,
   "classic": true
  },
  "las-vegas": {
   "alloc": [
    3,
    4,
    5,
    0
   ],
   "light": "night",
   "heat": 2,
   "corners": [
    [
     "curva 1",
     "curva 5"
    ],
    [
     "reta da Strip",
     "curva 12"
    ],
    [
     "chicane da curva 14",
     "curva 17"
    ]
   ],
   "fiaName": "LAS VEGAS GRAND PRIX",
   "f1Now": true
  },
  "lusail": {
   "alloc": [
    1,
    2,
    3,
    0
   ],
   "light": "night",
   "heat": 7,
   "f1Now": true
  },
  "yas-marina": {
   "alloc": [
    3,
    4,
    5,
    0
   ],
   "light": "dusk",
   "heat": 6,
   "fiaName": "ABU DHABI - YAS MARINA",
   "f1Now": true
  },
  "bahrain": {
   "alloc": [
    1,
    2,
    3,
    0
   ],
   "light": "night",
   "heat": 6,
   "fiaName": "BAHRAIN",
   "f1Now": true
  },
  "jeddah": {
   "alloc": [
    2,
    3,
    4,
    0
   ],
   "light": "night",
   "heat": 6,
   "corners": [
    [
     "curva 1",
     "curvas rápidas do primeiro setor"
    ],
    [
     "curva 13 inclinada",
     "curva 22"
    ],
    [
     "curva 27",
     "reta dos boxes"
    ]
   ],
   "fiaName": "JEDDAH CORNICHE CIRCUIT",
   "f1Now": true
  },
  "imola": {
   "alloc": [
    3,
    4,
    5,
    0
   ],
   "corners": [
    [
     "Tamburello",
     "Villeneuve"
    ],
    [
     "Tosa",
     "Piratella",
     "Acque Minerali"
    ],
    [
     "Variante Alta",
     "Rivazza"
    ]
   ],
   "fiaName": "IMOLA"
  },
  "paul-ricard": {
   "fiaName": "PAUL RICARD",
   "gpName": "GP da França"
  },
  "hockenheimring": {
   "fiaName": "HOCKENHEIM GRAND PRIX",
   "gpName": "GP da Alemanha"
  },
  "nurburgring": {
   "fiaName": "NÜRBURGRING GRAND PRIX",
   "gpName": "GP da Alemanha"
  },
  "portimao": {
   "fiaName": "ALGARVE",
   "f1Now": true,
   "gpName": "GP de Portugal"
  },
  "mugello": {
   "fiaName": "MUGELLO",
   "gpName": "GP da Toscana"
  },
  "magny-cours": {
   "fiaName": "MAGNY-COURS",
   "gpName": "GP da França"
  },
  "estoril": {
   "fiaName": "ESTORIL",
   "gpName": "GP de Portugal"
  },
  "indianapolis": {
   "fiaName": "INDIANAPOLIS GRAND PRIX",
   "gpName": "GP de Indianápolis"
  },
  "buenos-aires": {
   "fiaName": "BUENOS AIRES",
   "gpName": "GP da Argentina"
  },
  "jacarepagua": {
   "fiaNote": "Autódromo demolido em 2012.",
   "gpName": "GP do Rio de Janeiro"
  },
  "istanbul": {
   "fiaNote": "Na lista de 04/11/2026 só aparece um traçado curto (Grau 6R), não o traçado de Grande Prêmio.",
   "f1Now": true,
   "gpName": "GP da Turquia"
  },
  "kyalami": {
   "fiaNote": "Não consta na lista de 04/11/2026.",
   "gpName": "GP da África do Sul"
  },
  "watkins-glen": {
   "fiaNote": "Não consta na lista de 04/11/2026.",
   "gpName": "GP de Watkins Glen"
  }
 },
 /* regras e tabelas das séries do mundo real, por id de série (antes no código): secondary/pro/up/feeders/rangeFix/support (Cats), ratingRange/slTable/slEstimated/dbPro/dbLate (DriverDB), disc (Disc.SERIES), risk (Chaos.RISK), tyres (Mfr.SERIES_TYRES), kartF4/kartFallback (Kart: a F4 de cada campeonato de kart), uiGroups (grupos da tela de categorias), calKind (cor da série no calendário) e info (fatos soltos: main = a série principal; ladder = degrau rumo à principal; fullTeams/allCars = vagas; academySeat = custo da vaga para a academia; bigNews/winNewsChance = notícias; promoteTop = quantos sobem; notable = título que mantém o piloto na base; fromDec = temporada começa em dezembro do ano anterior; pool/poolMaxYears = de onde vêm os pilotos da série paralela; women = só pilotas; retireDisc = aposentadoria; natFit = afinidade por nacionalidade) */
 "series": {
  "secondary": {
   "frme": true,
   "e4": true,
   "f4uae": true
  },
  "pro": {
   "fe": true,
   "sf": true,
   "indycar": true,
   "wec": true,
   "dtm": true,
   "stockcar": true,
   "nascup": true
  },
  "up": {
   "f4de": "freca",
   "f1a": "freca",
   "f4uae": "freca",
   "f4it": "freca",
   "f4es": "freca",
   "f4gb": "freca",
   "e4": "freca",
   "f4br": "freca",
   "f4us": "fram",
   "f4jp": "frj",
   "freca": "f3",
   "frme": "f3",
   "fram": "f3",
   "frj": "f3",
   "f3": "f2"
  },
  "feeders": {
   "f2": [
    "f3",
    "freca"
   ],
   "f3": [
    "freca",
    "frme",
    "fram",
    "frj",
    "f4it",
    "f4es",
    "f4gb",
    "f4de"
   ],
   "freca": [
    "f4it",
    "f4es",
    "f4gb",
    "f4de",
    "e4",
    "f4br",
    "f1a",
    "f4uae"
   ],
   "fram": [
    "f4us"
   ],
   "frj": [
    "f4jp"
   ],
   "fe": [
    "f2",
    "sf"
   ],
   "sf": [
    "f2",
    "frj",
    "f3"
   ],
   "dtm": [
    "wec",
    "f2",
    "f3",
    "freca",
    "f4it",
    "f4de",
    "f4es",
    "f4gb"
   ],
   "stockcar": [
    "f4br",
    "fram",
    "freca",
    "f3",
    "f2"
   ],
   "nascup": [
    "f4us",
    "fram",
    "indycar"
   ]
  },
  "rangeFix": {
   "indycar": [
    70,
    80
   ]
  },
  "support": {
   "f2": true,
   "f3": true,
   "f1a": true
  },
  "ratingRange": {
   "f1": [
    80,
    94
   ],
   "indycar": [
    70,
    81
   ],
   "fe": [
    75,
    85
   ],
   "sf": [
    73,
    83
   ],
   "wec": [
    70,
    82
   ],
   "f2": [
    72,
    81
   ],
   "imsa": [
    68,
    80
   ],
   "dtm": [
    67,
    79
   ],
   "f3": [
    66,
    78
   ],
   "nxt": [
    65,
    76
   ],
   "elms": [
    64,
    76
   ],
   "supercars": [
    65,
    77
   ],
   "stockcar": [
    63,
    76
   ],
   "nascup": [
    64,
    77
   ],
   "nasxf": [
    61,
    72
   ],
   "nastr": [
    57,
    68
   ],
   "sfl": [
    62,
    72
   ],
   "freca": [
    61,
    74
   ],
   "efo": [
    60,
    71
   ],
   "gb3": [
    59,
    71
   ],
   "eurocup3": [
    58,
    70
   ],
   "frme": [
    59,
    72
   ],
   "fram": [
    57,
    69
   ],
   "frj": [
    56,
    68
   ],
   "froc": [
    56,
    68
   ],
   "usfpro": [
    57,
    69
   ],
   "alms": [
    57,
    70
   ],
   "f1a": [
    50,
    65
   ],
   "usf2000": [
    53,
    65
   ],
   "fws": [
    52,
    64
   ],
   "f4it": [
    52,
    66
   ],
   "f4es": [
    52,
    66
   ],
   "f4gb": [
    52,
    66
   ],
   "e4": [
    52,
    65
   ],
   "f4br": [
    50,
    63
   ],
   "f4us": [
    49,
    62
   ],
   "f4jp": [
    50,
    63
   ],
   "f4uae": [
    51,
    64
   ],
   "f4cez": [
    49,
    62
   ],
   "f4au": [
    48,
    61
   ],
   "f4de": [
    50,
    64
   ]
  },
  "slTable": {
   "indycar": [
    40,
    30,
    20,
    10,
    8,
    6,
    4,
    3,
    2,
    1
   ],
   "wec": [
    20,
    16,
    12,
    10,
    8,
    6,
    4,
    3,
    2,
    1
   ],
   "nxt": [
    15,
    12,
    10,
    7,
    5,
    3,
    2,
    1,
    0,
    0
   ],
   "f1a": [
    10,
    7,
    5,
    3,
    2,
    1,
    0,
    0,
    0,
    0
   ],
   "dtm": [
    10,
    8,
    6,
    4,
    3,
    2,
    1,
    0,
    0,
    0
   ],
   "imsa": [
    10,
    8,
    6,
    4,
    3,
    2,
    1,
    0,
    0,
    0
   ],
   "f2": [
    40,
    40,
    40,
    30,
    20,
    10,
    8,
    6,
    4,
    3
   ],
   "f3": [
    30,
    25,
    20,
    15,
    12,
    9,
    7,
    5,
    3,
    2
   ],
   "fe": [
    30,
    25,
    20,
    10,
    8,
    6,
    4,
    3,
    2,
    1
   ],
   "sf": [
    25,
    20,
    15,
    10,
    8,
    6,
    5,
    4,
    3,
    2
   ],
   "freca": [
    25,
    20,
    15,
    10,
    7,
    5,
    3,
    2,
    1,
    0
   ],
   "usfpro": [
    10,
    8,
    6,
    4,
    3,
    2,
    1,
    0,
    0,
    0
   ]
  },
  "slEstimated": [
   "nxt",
   "f1a",
   "dtm",
   "imsa",
   "usfpro",
   "wec"
  ],
  "dbPro": [
   "indycar",
   "fe",
   "sf",
   "wec",
   "imsa",
   "elms",
   "alms",
   "nascup",
   "nasxf",
   "nastr",
   "dtm",
   "stockcar",
   "supercars",
   "nxt",
   "f2",
   "f3",
   "sfl"
  ],
  "dbLate": [
   "nascup",
   "nasxf",
   "nastr",
   "stockcar",
   "supercars",
   "wec",
   "imsa",
   "elms",
   "alms",
   "dtm"
  ],
  "disc": {
   "wec": "end",
   "imsa": "end",
   "elms": "end",
   "alms": "end",
   "dtm": "gt",
   "stockcar": "gt",
   "supercars": "gt",
   "nascup": "gt",
   "nasxf": "gt",
   "nastr": "gt"
  },
  "risk": {
   "f2": 1,
   "f3": 1.1,
   "freca": 1.2,
   "indycar": 1.6,
   "nxt": 1.3,
   "wec": 0.9,
   "imsa": 0.8,
   "nascup": 0.7,
   "stockcar": 0.8,
   "sf": 0.9,
   "fe": 0.5,
   "dtm": 0.5,
   "kart": 0.6
  },
  "tyres": {
   "f2": "pirelli",
   "f3": "pirelli",
   "f1a": "pirelli",
   "freca": "pirelli",
   "indycar": "firestone",
   "nxt": "firestone",
   "fe": "hankook",
   "sf": "yokohama",
   "sfl": "kumho",
   "wec": "michelin",
   "imsa": "michelin",
   "elms": "goodyear",
   "nascup": "goodyear",
   "nasxf": "goodyear",
   "nastr": "goodyear",
   "dtm": "pirelli",
   "stockcar": "hankook",
   "supercars": "dunlop"
  },
  "kartF4": {
   "eu": [
    "f4it",
    "f4es",
    "f4gb",
    "f4de",
    "e4"
   ],
   "am": [
    "f4us"
   ],
   "br": [
    "f4br"
   ],
   "ap": [
    "f4jp"
   ]
  },
  "kartFallback": "f4it",
  "uiGroups": [
   [
    "Monoposto · principais",
    [
     "fe",
     "indycar",
     "sf"
    ],
    true
   ],
   [
    "GT",
    [
     "dtm",
     "stockcar",
     "nascup"
    ],
    true
   ],
   [
    "Endurance",
    [
     "wec"
    ],
    true
   ],
   [
    "Monoposto · rumo à F1",
    [
     "f2",
     "f3",
     "f1a"
    ]
   ],
   [
    "Monoposto · regionais",
    [
     "freca",
     "frme",
     "fram"
    ]
   ],
   [
    "Monoposto · Fórmula 4",
    [
     "f4it",
     "f4de",
     "f4es",
     "f4gb",
     "e4",
     "f4br",
     "f4uae"
    ]
   ],
   [
    "Ecossistema Indy",
    [
     "f4us"
    ]
   ],
   [
    "Ecossistema Super Formula",
    [
     "frj",
     "f4jp"
    ]
   ]
  ],
  "calKind": {
   "f2": "f2",
   "f3": "f2",
   "f1a": "f2",
   "fe": "fe",
   "indycar": "usa",
   "nxt": "usa",
   "nascup": "usa",
   "imsa": "end",
   "wec": "end",
   "elms": "end"
  },
  "info": {
   "f1": {
    "main": true
   },
   "f2": {
    "ladder": 1,
    "fullTeams": true,
    "academySeat": 2.6,
    "bigNews": true,
    "winNewsChance": 0.8,
    "notable": true
   },
   "f3": {
    "ladder": 2,
    "fullTeams": true,
    "academySeat": 1.2,
    "bigNews": true,
    "promoteTop": 6,
    "notable": true
   },
   "fe": {
    "fullTeams": true,
    "fromDec": true,
    "notable": true
   },
   "sf": {
   "poolNat": { "JPN": 8 },
    "notable": true
   },
   "freca": {
    "fullTeams": true,
    "academySeat": 0.9
   },
   "frme": {
    "fullTeams": true,
    "academySeat": 0.9,
    "pool": [
     "freca",
     "f3",
     "f4it",
     "f4es",
     "f4gb",
     "e4"
    ],
    "poolMaxYears": {
     "f3": 1
    }
   },
   "fram": {
    "academySeat": 0.9
   },
   "frj": {
    "academySeat": 0.9
   },
   "f1a": {
    "academySeat": 0.15,
    "women": true
   },
   "e4": {
    "pool": [
     "f4it",
     "f4es",
     "f4gb"
    ]
   },
   "f4uae": {
    "pool": [
     "f4it",
     "f4es",
     "f4gb"
    ]
   },
   "indycar": {
    "allCars": true,
    "retireDisc": "oval"
   },
   "nascup": {
    "retireDisc": "stock",
    "natFit": {
     "groups": [
      [
       [
        "USA"
       ],
       16
      ],
      [
       [
        "CAN",
        "MEX",
        "AUS"
       ],
       4
      ]
     ],
     "other": -14
    }
   },
   "stockcar": {
    "retireDisc": "stock",
    "natFit": {
     "groups": [
      [
       "SA",
       14
      ]
     ],
     "other": -8
    }
   },
   "dtm": {
    "natFit": {
     "groups": [
      [
       "EU",
       4
      ]
     ],
     "other": -4,
     "exp": {
      "end": 6,
      "gt": 4
     }
    }
   }
  }
 }
};
