# Verificação da database (DriverDB, 2026)

Gerado por `scripts/audit.js db` em 2026-11-07. Fonte de conferência: DriverDB (classificações de 2026 e perfis), baixado em 2026-11-07 por `scripts/import_driverdb.py`. A base do jogo continua vindo da Wikipedia/Wikidata e do f1db; o DriverDB só preenche o que falta (apelidos, nascimento, nacionalidade, foto) e é comparado aqui.

Como ler:
- **Fora do jogo:** quem pontuou ou largou em 2026 e não existe no universo. Normalmente são pilotos de meio período, convidados ou pilotos de classes que o jogo não simula (WEC LMGT3, por exemplo).
- **No jogo em outra série:** quem corre mais de uma série; no jogo, cada pessoa tem uma categoria principal.
- **Status das vagas de 2027:** anunciado (a fonte lista para 2027), grid2026 (correu em 2026, 2027 a confirmar), projeção (o jogo preencheu com piloto real livre) ou gerado (piloto fictício, só sem alternativa real).

Universo: 1242 pilotos (1242 ativos: 108 gerados pelo jogo, dos quais 80 no kart). **323 ativos sem data de nascimento.**

| Série | DriverDB 2026 | No grid certo | Em outra série | Fora do jogo | Grid sem DriverDB | Status das vagas de 2027 |
|---|---|---|---|---|---|---|
| Fórmula 1 | 36 | 32 | 3 | 1 | 0 | — |
| Fórmula 2 | 23 | 21 | 2 | 0 | 1 | grid2026 22 |
| Fórmula 3 | 35 | 30 | 5 | 0 | 0 | grid2026 21, anunciado 9 |
| Fórmula E | 20 | 20 | 0 | 0 | 0 | anunciado 16, grid2026 4 |
| IndyCar | 33 | 32 | 0 | 1 | 0 | grid2026 12, anunciado 21 |
| WEC | 0 | 0 | 0 | 0 | 54 | grid2026 28, anunciado 26 |
| DTM | 23 | 19 | 3 | 1 | 1 | grid2026 20 |
| NASCAR Cup | 57 | 34 | 15 | 8 | 0 | anunciado 32, grid2026 2 |
| Stock Car | 63 | 31 | 20 | 12 | 0 | grid2026 31 |
| Super Formula | 26 | 21 | 4 | 1 | 2 | grid2026 23 |
| F1 Academy | 22 | 20 | 2 | 0 | 0 | grid2026 20 |
| FRECA | 37 | 26 | 7 | 4 | 1 | grid2026 28, anunciado 2 |
| F4 Itália | 74 | 27 | 35 | 12 | 2 | grid2026 30 |
| F4 Espanha | 49 | 27 | 16 | 6 | 2 | grid2026 30 |
| F4 Brasil | 19 | 16 | 1 | 2 | 2 | grid2026 19 |
| Eurocup-4 | 48 | 26 | 12 | 10 | 3 | ? 30 |
| Fórmula Regional Japão | 17 | 11 | 0 | 6 | 6 | grid2026 16 |
| Super Formula Lights | 16 | 7 | 4 | 5 | 0 | — |
| NASCAR Trucks | 129 | 50 | 35 | 44 | 0 | — |
| Supercars | 54 | 35 | 1 | 18 | 0 | — |
| Eurocup-3 | 42 | 0 | 29 | 13 | 0 | — |
| Formula Winter Series | 46 | 0 | 32 | 14 | 0 | — |

## F1 2027 (grid inicial do jogo)
| Equipe | Piloto | Situação na fonte |
|---|---|---|
| Mercedes | Kimi Antonelli | confirmado (lista anunciada) |
| Mercedes | George Russell | confirmado (lista anunciada) |
| Ferrari | Lewis Hamilton | confirmado (lista anunciada) |
| Ferrari | Charles Leclerc | confirmado (lista anunciada) |
| Red Bull | Max Verstappen | confirmado (lista anunciada) |
| Red Bull | Isack Hadjar | confirmado (lista anunciada) |
| McLaren | Oscar Piastri | confirmado (lista anunciada) |
| McLaren | Lando Norris | confirmado (lista anunciada) |
| Racing Bulls | Liam Lawson | vaga ainda não definida na fonte |
| Racing Bulls | Arvid Lindblad | vaga ainda não definida na fonte |
| Gucci Racing Alpine | Franco Colapinto | confirmado (lista anunciada) |
| Gucci Racing Alpine | Pierre Gasly | confirmado (lista anunciada) |
| Haas | Oliver Bearman | vaga ainda não definida na fonte |
| Haas | Rafael Câmara | confirmado (lista anunciada) |
| Audi | Nico Hülkenberg | confirmado (lista anunciada) |
| Audi | Gabriel Bortoleto | confirmado (lista anunciada) |
| Williams | Carlos Sainz Jr. | confirmado (lista anunciada) |
| Williams | Alexander Albon | confirmado (lista anunciada) |
| Aston Martin | Fernando Alonso | confirmado (lista anunciada) |
| Aston Martin | Lance Stroll | confirmado (lista anunciada) |
| Cadillac | Sergio Pérez | confirmado (lista anunciada) |
| Cadillac | Valtteri Bottas | confirmado (lista anunciada) |

## Nascimento divergente entre Wikipedia/Wikidata e DriverDB (45)
Não corrigido automaticamente: o jogo mantém a data da Wikipedia/Wikidata e lista a diferença para revisão.

| Piloto | Jogo | DriverDB |
|---|---|---|
| Colton Herta | 2000-03-30 | 2000-03-20 |
| Théophile Naël | 2007-06-22 | 2007-06-27 |
| Jin Nakamura | 2005-02-01 | 2006-02-01 |
| Alessandro Giusti | 2006-09-10 | 2005-09-10 |
| Louis Sharp | 2007-05-11 | 2007-05-10 |
| José Garfias | 2004-10-25 | 2004-10-26 |
| Jake Dennis | 1995-06-16 | 1995-06-30 |
| Scott McLaughlin | 1993-06-10 | 1993-06-11 |
| Will Power | 1981-03-01 | 1979-03-01 |
| Mick Schumacher | 1999-03-22 | 1999-03-25 |
| Finn Wiebelhaus | 2006-03-05 | 2006-05-06 |
| Bastian Buus | 2003-06-19 | 2003-06-20 |
| William Byron | 1997-11-27 | 1997-11-29 |
| Connor Zilisch | 2006-07-21 | 2006-07-22 |
| Cody Ware | 1995-11-07 | 1995-07-11 |
| Corey Heim | 2002-07-05 | 2002-07-15 |
| Arthur Leist | 2001-06-17 | 2001-06-18 |
| Felipe Baptista | 2003-04-08 | 2002-04-08 |
| Daniel Serra | 1984-03-24 | 1984-02-24 |
| Cacá Bueno | 1976-01-24 | 1976-07-24 |
| Renan Guerra | 1989-05-21 | 1989-07-08 |
| Rafa Reis | 2001-10-03 | 1993-04-07 |
| Kakunoshin Ohta | 1999-06-22 | 1999-06-16 |
| Ren Sato | 2000-08-05 | 2001-08-05 |
| Rikuto Kobayashi | 2005-07-01 | 1967-01-25 |
| Nina Gademan | 2003-08-30 | 2003-09-30 |
| Alba Hurup Larsen | 2008-12-12 | 2009-12-12 |
| Natalia Granada | 1967-01-01 | 2008-03-18 |
| Ava Dobson | 2008-06-08 | 2009-06-09 |
| Alexander Abkhazava | 2006-10-28 | 2006-10-29 |
| Alex Ninovic | 2007-03-04 | 2007-03-05 |
| Dion Gowda | 2007-11-29 | 2007-11-30 |
| Kai Daryanani | 2005-04-12 | 2005-04-13 |
| Ary Bansal | 2009-11-08 | 2009-09-08 |
| Kotaro Shimbara | 2004-04-12 | 2004-12-04 |
| Kaden Honeycutt | 2003-06-23 | 2002-06-23 |
| Gio Ruggiero | 2006-08-29 | 2004-10-06 |
| Spencer Boyd | 1996-01-01 | 1995-06-26 |
| Carter Fartuch | 1995-02-16 | 1995-02-17 |
| Brent Crews | 2008-03-29 | 2008-03-30 |
| Justin Carroll | 1995-12-08 | 1996-03-29 |
| Jack Le Brocq | 1992-07-02 | 1992-07-07 |
| Aaron Cameron | 2000-01-27 | 2000-01-21 |
| Kacper Sztuka | 2006-01-28 | 2006-01-29 |
| Tommy Harfield | 2009-01-01 | 2008-10-15 |

## Detalhe por série
### Fórmula 1
- **Fora do jogo (1):** Carlos Sainz (7 pts)
- **No jogo em outra série (3):** Esteban Ocon → livre; Freddie Slater → F3; Nikola Tsolov → F2
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### Fórmula 2
- **Fora do jogo (0):** nenhum
- **No jogo em outra série (2):** Rafael Câmara → F1 HAA; Hiyu Yamakoshi → F3
- **No grid do jogo sem constar da classificação 2026 do DriverDB (1):** Amaury Cordeel [grid de 2026 (2027 a confirmar)]

### Fórmula 3
- **Fora do jogo (0):** nenhum
- **No jogo em outra série (5):** Patrick Heuzenroeder → livre; Michael Shin → livre; Ricardo Escotto → livre; Salim Hanna → FRECA; Niccolò Maccagnani → F4 ITA
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### Fórmula E
- **Fora do jogo (0):** nenhum
- **No jogo em outra série (0):** nenhum
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### IndyCar
- **Fora do jogo (1):** Kyffin Simpson (327 pts)
- **No jogo em outra série (0):** nenhum
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### WEC
- **Fora do jogo (0):** nenhum
- **No jogo em outra série (0):** nenhum
- **No grid do jogo sem constar da classificação 2026 do DriverDB (54):** Tom Gamble [grid de 2026 (2027 a confirmar)]; Harry Tincknell [grid de 2026 (2027 a confirmar)]; Ross Gunn [grid de 2026 (2027 a confirmar)]; Alex Riberas [grid de 2026 (2027 a confirmar)]; Marco Sørensen [grid de 2026 (2027 a confirmar)]; Roman De Angelis [grid de 2026 (2027 a confirmar)]; Mike Conway [grid de 2026 (2027 a confirmar)]; Kamui Kobayashi [grid de 2026 (2027 a confirmar)]; Brendon Hartley [grid de 2026 (2027 a confirmar)]; Ryō Hirakawa [grid de 2026 (2027 a confirmar)]; Will Stevens [anunciado para 2027]; Louis Delétraz [grid de 2026 (2027 a confirmar)]; Ricky Taylor [anunciado para 2027]; Alex Lynn [anunciado para 2027]; Earl Bamber [anunciado para 2027]; Sébastien Bourdais [grid de 2026 (2027 a confirmar)]; Jack Aitken [anunciado para 2027]; Kevin Magnussen [grid de 2026 (2027 a confirmar)]; Raffaele Marciello [grid de 2026 (2027 a confirmar)]; Dries Vanthoor [grid de 2026 (2027 a confirmar)]; Robin Frijns [grid de 2026 (2027 a confirmar)]; René Rast [grid de 2026 (2027 a confirmar)]; Sheldon van der Linde [grid de 2026 (2027 a confirmar)]; Pipo Derani [anunciado para 2027]; Mathys Jaubert [anunciado para 2027]; André Lotterer [anunciado para 2027]; Paul-Loup Chatin [anunciado para 2027]; Mathieu Jaminet [anunciado para 2027]; Daniel Juncadella [anunciado para 2027]; Ferdinand Habsburg [grid de 2026 (2027 a confirmar)]; Charles Milesi [grid de 2026 (2027 a confirmar)]; Jules Gounon [grid de 2026 (2027 a confirmar)]; Victor Martins [grid de 2026 (2027 a confirmar)]; Frédéric Makowiecki [grid de 2026 (2027 a confirmar)]; Antonio Fuoco [anunciado para 2027]; Miguel Molina [anunciado para 2027]; Nicklas Nielsen [anunciado para 2027]; James Calado [anunciado para 2027]; Antonio Giovinazzi [anunciado para 2027]; Alessandro Pier Guidi [anunciado para 2027]; Phil Hanson [anunciado para 2027]; Robert Kubica [grid de 2026 (2027 a confirmar)]; Yifei Ye [anunciado para 2027]; Paul di Resta [anunciado para 2027]; Stoffel Vandoorne [grid de 2026 (2027 a confirmar)]; Alex Quinn [grid de 2026 (2027 a confirmar)]; Loïc Duval [anunciado para 2027]; Malthe Jakobsen [anunciado para 2027]; Théo Pourchaire [grid de 2026 (2027 a confirmar)]; Laurens Vanthoor [anunciado para 2027]; Matt Campbell [anunciado para 2027]; Michael Christensen [grid de 2026 (2027 a confirmar)]; Robert Shwartzman [anunciado para 2027]; Mikkel Jensen [anunciado para 2027]

### DTM
- **Fora do jogo (1):** Jules Gounon (111 pts)
- **No jogo em outra série (3):** Nicolas Baert → livre; Christian Engelhart → livre; Simon Connor Primm → livre
- **No grid do jogo sem constar da classificação 2026 do DriverDB (1):** Ayhancan Güven [grid de 2026 (2027 a confirmar)]

### NASCAR Cup
- **Fora do jogo (8):** Casey Mears (9 pts), Jimmie Johnson (8 pts), Daniel Dye, Josh Bilicki, Gray Gaulding, Chandler Smith, Corey LaJoie, J. J. Yeley (1047 pts)
- **No jogo em outra série (15):** Cody Ware → livre; Kyle Busch → livre; Kevin Magnussen → WEC; Katherine Legge → INDY; B. J. McLeod → série nasxf; Corey Heim → série nascup; Justin Allgaier → livre; Anthony Alfredo → livre; Austin Hill → série nasxf; Timmy Hill → série nastr; Chad Finchum → série nasxf; Joey Gase → série nasxf; Harrison Burton → livre; Myatt Snider → série nasxf; Jesse Love → série nascup
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### Stock Car
- **Fora do jogo (12):** Rafael Reis (324 pts), Alberto Cattucci (1105 pts), Antônio Pizzonia (1153 pts), Enzo Bedani (1097 pts), Gabriel Koenigkan (1119 pts), Duda Oliveira (1003 pts), Jeff Giassi (1150 pts), Dennis Dirani (1102 pts), William Freire, Albert Costa (1264 pts), Vitor Baptista, Danilo Dirani
- **No jogo em outra série (20):** Hélio Castroneves → INDY; Vicente Orige → livre; Bruna Tomaselli → livre; Rafael Martins → livre; Caio Chaves → livre; Antonella Bassani → livre; Lucas Di Grassi → FE; Arthur Gama → série stockcar; Diego Nunes → série stockcar; Pedro Piquet → série stockcar; Felipe Drugovich → FE; Sergio Ramalho → série stockcar; Gianluca Petecof → série stockcar; Nicolas Costa → série stockcar; André Negrão → série stockcar; Gabriel Robe → série stockcar; Fernando Barrichello → F3; Denis Navarro → série stockcar; Marcos Gomes → série stockcar; Caio Collet → INDY
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### Super Formula
- **Fora do jogo (1):** Juju Noda
- **No jogo em outra série (4):** Kamui Kobayashi → WEC; Ukyo Sasahara → livre; Seita Nonaka → livre; Kazuhisa Urabe → livre
- **No grid do jogo sem constar da classificação 2026 do DriverDB (2):** "Juju" [grid de 2026 (2027 a confirmar)]; Oliver Rasmussen [grid de 2026 (2027 a confirmar)]

### F1 Academy
- **Fora do jogo (0):** nenhum
- **No jogo em outra série (2):** Shi Wei → livre; Alexia Danielsson → livre
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### FRECA
- **Fora do jogo (4):** Kean Nakamura-Berta (201 pts), Zhenrui Chi (73 pts), Maksimilian Popov (60 pts), Saqer Al-Maousherji (15 pts)
- **No jogo em outra série (7):** Rahim Alibhai → F4 ESP; Giovanni Maschio → livre; Enea Frey → livre; Thomas Strauven → livre; Kyuho Lee → livre; Noah Lisle → livre; René Lammers → livre
- **No grid do jogo sem constar da classificação 2026 do DriverDB (1):** Saqer Al-Maosherji [grid de 2026 (2027 a confirmar)]

### F4 Itália
- **Fora do jogo (12):** Edward  Robinson Lliteras (308 pts), Oleksandr Savinkov (227 pts), Oscar Repetto (98 pts), Kingsley Zheng (56 pts), Lyboslav Ruykov (39 pts), Alexander Chartier (29 pts), Teodor Borenstein (21 pts), Georgyi Zasov (8 pts), Beni Gaspar (998 pts), Kirill Kutskov (1043 pts), Joaquín Pagola Jacob (1007 pts), Musaad Albassam (79 pts)
- **No jogo em outra série (35):** Ary Bansal → FRECA; Oleksandr Bondarev → FRECA; Simon Rechenmacher → livre; Dean Pedersen → livre; Artem Severiukhin → livre; Bernardo Bernoldi → livre; Payton Westcott → F1A; Andre Rodriguez → livre; Roland Kuklane → livre; Emma Felbermayr → F1A; Federico Díaz Quaglia → livre; Igor Polak → livre; Vittorio Orsini → livre; Tamás Gender → livre; Evan Michelini → livre; Jesse Phillips → livre; Fabricio Fogaca → F4 BRA; Ginevra Panzeri → livre; Rafaela Ferreira → F1A; Thiago Palotini → livre; Rosanne den Drijver → livre; George Proudford-Nalder → F4 GBR; Ignacio Diaz Morel Vulliez → F4 BRA; Andreas Lo Bue → livre; Zoe Florescu-Potolea → F1A; Rocco Coronel → F4 ESP; Joaquin Rubino → livre; James Anagnostiadis → livre; Bautista Acosta → livre; Lucas Pasquinetti → livre; Mathilda Paatz → F1A; Filippo Sala → livre; Yibei Sun → livre; Antonio Errigo → livre; Nikolaj Dyrved → livre
- **No grid do jogo sem constar da classificação 2026 do DriverDB (2):** Edu Robinson [grid de 2026 (2027 a confirmar)]; Luca Viișoreanu [grid de 2026 (2027 a confirmar)]

### F4 Espanha
- **Fora do jogo (6):** Louis Cochet (1005 pts), Rodrigo Martínez (901 pts), Alexander Chartier (1006 pts), Sam Urus (943 pts), Max Mokarem (1022 pts), Stefano Pedani (1008 pts)
- **No jogo em outra série (16):** Jensen Burnett → F4 ITA; Zoe Florescu-Potolea → F1A; Sebastian Frigolet → livre; Pablo Riccobono Bello → livre; Sandro Perez Sanchez → livre; Alfons Miettinen → livre; Maria Germano Neto → livre; Jorden Moodley → livre; Andre Rodriguez → livre; Ryusho Nakazato → F4 JPN; Dean Pedersen → livre; Jorge Bruno → livre; Thiago Palotini → livre; Lucas Pasquinetti → livre; Romuald Bocquet → livre; Archie Davies → livre
- **No grid do jogo sem constar da classificação 2026 do DriverDB (2):** Juan Cota [grid de 2026 (2027 a confirmar)]; Hudson Schwartz [grid de 2026 (2027 a confirmar)]

### F4 Brasil
- **Fora do jogo (2):** Ignacio Diaz (68 pts), Marcelo Hahn
- **No jogo em outra série (1):** Fausto Arnaudo → F4 ESP
- **No grid do jogo sem constar da classificação 2026 do DriverDB (2):** Celo Hahn [grid de 2026 (2027 a confirmar)]; Heitor Dall'Agnol [grid de 2026 (2027 a confirmar)]

### Eurocup-4
- **Fora do jogo (10):** Oleksandr Savinkov (110 pts), Edward  Robinson Lliteras (64 pts), Kingsley Zheng (22 pts), Georgyi Zasov (10 pts), Lyboslav Ruykov (8 pts), Teodor Borenstein (6 pts), Victoria Farfus (4 pts), Oscar Repetto (4 pts), Alexander Chartier (1006 pts), Ella Häkkinen (996 pts)
- **No jogo em outra série (12):** George Proudford-Nalder → F4 GBR; Ginevra Panzeri → livre; Bader Al Sulaiti → F4 ITA; Bernardo Bernoldi → livre; Andre Rodriguez → livre; Pedro Lima → F4 ITA; Tamas Gender → livre; Joaquin Rubino → livre; Abdullah Ayman Kamel → livre; Lucas Pasquinetti → livre; Yibei Sun → livre; Payton Westcott → F1A
- **No grid do jogo sem constar da classificação 2026 do DriverDB (3):** Edu Robinson [sem status]; Georgiy Zasov [sem status]; Lyuboslav Ruykov [sem status]

### Fórmula Regional Japão
- **Fora do jogo (6):** Lin Cheng Hua (31 pts), Xuanyu Li (12 pts), Atsushi Akita (10 pts), "Yuki", Yugo Tanabe, Paul Wong
- **No jogo em outra série (0):** nenhum
- **No grid do jogo sem constar da classificação 2026 do DriverDB (6):** Lin Chenghua [grid de 2026 (2027 a confirmar)]; Tokiya Suzuki [grid de 2026 (2027 a confirmar)]; Yu Oda [grid de 2026 (2027 a confirmar)]; Li Xuanyu [grid de 2026 (2027 a confirmar)]; Shunji Okumoto [grid de 2026 (2027 a confirmar)]; Tosei Moriyama [grid de 2026 (2027 a confirmar)]

### Super Formula Lights
- **Fora do jogo (5):** Nobuhiro Imada, Ken Watanabe, Yasuhiro Shimizu, Ryuji Kumita, Daichi Okamoto
- **No jogo em outra série (4):** Tokiya Suzuki → FRJ; Kazuhisa Urabe → livre; Yuzuki Miura → FRJ; Kenta Kumagai → F4 JPN
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### NASCAR Trucks
- **Fora do jogo (44):** Chandler Smith (889 pts), Daniel Hemric (609 pts), Tanner Gray (499 pts), Andrés Pérez de Lara (483 pts), Cole Butcher (363 pts), Corey LaJoie (336 pts), Connor Mosack (269 pts), Daniel Dye (150 pts), Josh Reaume (113 pts), Adam Andretti (76 pts), Clay Greenfield (41 pts), Jason M. White (28 pts), Thomas Annunziata (28 pts), Carson Ferguson (26 pts), Stephen Mallozzi (25 pts), Cory Roper (22 pts), Brendan Gaughan (21 pts), Stefan Parsons (19 pts), Dario Franchitti (18 pts), Graham Doyle (18 pts), Donovan Strauss (14 pts), Monty Tipton (14 pts), Spencer Davis (13 pts), Ryan Newman (13 pts), Justin Marks (12 pts), Clint Bowyer (8 pts), Jason Kitzmiller (7 pts), Cassten Everidge (5 pts), Elliott Sadler (5 pts), Tony Stewart (4 pts), Natalie Decker (4 pts), Dystany Spurlock (3 pts), Jamie McMurray (3 pts), Derek White (2 pts), Jackson Macenko (2 pts), Corey Day, Jimmie Johnson, Garrett Smithley, Norm Benning, Bryan Dauzat, Greg Van Alst, Jonathan Shafer, Landon Huffman (988 pts), D. L. Wilson (913 pts)
- **No jogo em outra série (35):** Tyler Ankrum → série nasxf; Justin Haley → livre; Corey Heim → série nascup; Nick Leitz → série nasxf; Leland Honeyman → série nasxf; Nick Sanchez → série nasxf; Conor Daly → INDY; Derek Lemke → série nasxf; Louis Foster → INDY; Tyler Tomassi → série nasxf; Kyle Busch → livre; Carson Hocevar → NASCAR; Christopher Bell → NASCAR; Shane van Gisbergen → NASCAR; Connor Zilisch → NASCAR; Ross Chastain → NASCAR; Brent Crews → série nasxf; Rajah Caruth → série nasxf; Austin Green → série nasxf; Taylor Gray → série nasxf; Michael McDowell → NASCAR; Ricky Stenhouse, Jr. → NASCAR; John Hunter Nemechek → NASCAR; Cleetus McFarland → série nasxf; Ty Dillon → NASCAR; William Sawalich → série nasxf; A. J. Allmendinger → NASCAR; Brandon Jones → série nasxf; Parker Retzlaff → série nasxf; Jesse Love → série nascup; Chase Elliott → NASCAR; Harrison Burton → livre; Brennan Poole → série nasxf; Chase Briscoe → NASCAR; Daniel Suárez → NASCAR
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### Supercars
- **Fora do jogo (18):** Scott Pye (510 pts), Harri Jones (376 pts), Tim Slade (338 pts), David Russell (335 pts), Fabian Coulthard (300 pts), Craig Lowndes (262 pts), Mark Winterbottom (224 pts), Tony D'Alberto (206 pts), Lee Holdsworth (182 pts), Brad Vaughan (180 pts), James Courtney (131 pts), Jordan Boys (119 pts), Jack Perkins (115 pts), Zak Best (110 pts), Nash Morris (73 pts), Nathan Herne (67 pts), James Moffat (67 pts), Campbell Logan (57 pts)
- **No jogo em outra série (1):** Cameron Waters → série nastr
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### Eurocup-3
- **Fora do jogo (13):** Rafaël Pérard (58 pts), Rayan Caretti (4 pts), Linus Lundqvist (1249 pts), Stylianos Kolovos (932 pts), Benjamin Beckley (908 pts), Renzo Barbuy (939 pts), Édouard Borgna (892 pts), Lorenzo Campos (1008 pts), Jakob Bergmeister (999 pts), Casper Stevenson (1090 pts), Daniel Maciá (1043 pts), Valentin Kluss (1073 pts), Sam Urus (943 pts)
- **No jogo em outra série (29):** James Egozi → série f3; Ean Eyckmans → série freca; Keanu Al Azhari → série f3; René Lammers → livre; Heitor Dall'Agnol → F4 BRA; Kacper Sztuka → série freca; Alex Powell → F3; Patrick Heuzenroeder → livre; Gianmarco Pradel → série gb3; Christopher El Feghali → série f4es; Thomas Strauven → livre; Gino Trappa → série efo; Enzo Tarnvanichkul → série gb3; Bart Harrison → série nxt; Santino Panetta → série f4es; Filippo Fiorentino → série efo; Juan Cota → F4 ESP; Alceu Feldmann → livre; Stefan Bostandjiev → série gb3; Luca Viisoreanu → F4 ITA; Bianca Bustamante → série gb3; Andre Rodriguez → livre; Andrej Petrovic → F4 ESP; Tommy Harfield → F4 GBR; Nacho Tuñón → F4 ESP; Yani Stevenheydens → F4 ESP; Nathan Tye → F4 ESP; Francisco Macedo → FRECA; James Hedley → série frme
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum

### Formula Winter Series
- **Fora do jogo (14):** Tomas Rudokas (971 pts), Oscar Repetto (1029 pts), Maximilian Kammerlander (966 pts), Markas Silkunas (1074 pts), Samuel Ifrid (1048 pts), Georgyi Zasov (1038 pts), Teodor Borenstein (1079 pts), Oleksandr Savinkov (1110 pts), Viktor Poulsen (951 pts), Emmilio Del Grosso (1045 pts), Eric Poulsen (955 pts), Caitlyn McDaniel (835 pts), Platon Kostin (1020 pts), Alexander Chartier (1006 pts)
- **No jogo em outra série (32):** Dries Van Langendonck → F4 GBR; Alfie Slater → F4 GBR; Levi Arn → F4 ITA; Alisha Palmowski → F1A; Noah Killion → F4 ITA; Arjen Kräling → F4 ITA; Felipe Reijs → F4 ESP; Ginevra Panzeri → livre; Ludovico Busso → F4 ITA; Thomas Bearman → F4 ITA; Rocco Coronel → F4 ESP; Chiara Bättig → F1A; Vittorio Orsini → livre; Andre Rodriguez → livre; Rafaela Ferreira → F1A; Mathilda Paatz → F1A; Pedro Lima → F4 ITA; Roman Kamyab → F4 ITA; Aleksander Ruta → F4 ITA; Ary Bansal → FRECA; Ethan Lennon → F4 GBR; Abdullah Ayman Kamel → livre; Nicolás Cortés → F4 ITA; Leon Hedfors → F4 GBR; Ella Stevens → F1A; Alexandre Louza → F4 BRA; Zoe Florescu-Potolea → F1A; Jensen Burnett → F4 ITA; George Proudford-Nalder → F4 GBR; Rahim Alibhai → F4 ESP; Megan Bruce → F1A; Timo Jüngling → F4 GBR
- **No grid do jogo sem constar da classificação 2026 do DriverDB (0):** nenhum
