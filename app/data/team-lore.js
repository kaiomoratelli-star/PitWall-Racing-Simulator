/* Sede, ano de estreia da linhagem e chefes de equipe das equipes atuais.
   Fontes: páginas das equipes na Wikipedia e sites oficiais (consultados em 2026).
   Os anos de chefia são aproximados quando a troca aconteceu no meio da temporada. */
const TEAM_LORE = {
  ferrari: { base: 'Maranello (Itália)', debut: 1950, principals: [['Jean Todt', 1993, 2007], ['Stefano Domenicali', 2008, 2014], ['Marco Mattiacci', 2014, 2014], ['Maurizio Arrivabene', 2015, 2018], ['Mattia Binotto', 2019, 2022], ['Frédéric Vasseur', 2023, null]] },
  mercedes: { base: 'Brackley e Brixworth (Reino Unido)', debut: 1970, principals: [['Ken Tyrrell', 1970, 1998], ['Craig Pollock', 1999, 2001], ['David Richards', 2002, 2004], ['Nick Fry', 2005, 2007], ['Ross Brawn', 2008, 2013], ['Toto Wolff', 2013, null]] },
  'red-bull': { base: 'Milton Keynes (Reino Unido)', debut: 1997, principals: [['Jackie Stewart', 1997, 1999], ['Bobby Rahal', 2001, 2001], ['Niki Lauda', 2002, 2002], ['Tony Purnell', 2003, 2004], ['Christian Horner', 2005, 2025], ['Laurent Mekies', 2025, null]] },
  mclaren: { base: 'Woking (Reino Unido)', debut: 1966, principals: [['Bruce McLaren', 1966, 1970], ['Teddy Mayer', 1970, 1980], ['Ron Dennis', 1981, 2008], ['Martin Whitmarsh', 2009, 2013], ['Éric Boullier', 2014, 2018], ['Andreas Seidl', 2019, 2022], ['Andrea Stella', 2023, null]] },
  'aston-martin': { base: 'Silverstone (Reino Unido)', debut: 1991, principals: [['Eddie Jordan', 1991, 2004], ['Colin Kolles', 2005, 2007], ['Vijay Mallya', 2008, 2018], ['Otmar Szafnauer', 2018, 2022], ['Mike Krack', 2022, 2024], ['Andy Cowell', 2025, 2025], ['Adrian Newey', 2026, null]] },
  alpine: { base: 'Enstone (Reino Unido)', debut: 1981, principals: [['Flavio Briatore', 1989, 1997], ['Flavio Briatore', 2002, 2009], ['Éric Boullier', 2010, 2013], ['Cyril Abiteboul', 2016, 2020], ['Davide Brivio', 2021, 2021], ['Otmar Szafnauer', 2022, 2023], ['Bruno Famin', 2023, 2024], ['Oliver Oakes', 2024, 2025], ['Flavio Briatore', 2025, null]] },
  williams: { base: 'Grove (Reino Unido)', debut: 1977, principals: [['Frank Williams', 1977, 2012], ['Claire Williams', 2013, 2020], ['Simon Roberts', 2020, 2021], ['Jost Capito', 2021, 2022], ['James Vowles', 2023, null]] },
  haas: { base: 'Kannapolis (EUA) e Banbury (Reino Unido)', debut: 2016, principals: [['Guenther Steiner', 2016, 2023], ['Ayao Komatsu', 2024, null]] },
  'racing-bulls': { base: 'Faenza (Itália)', debut: 1985, principals: [['Giancarlo Minardi', 1985, 2000], ['Paul Stoddart', 2001, 2005], ['Franz Tost', 2006, 2023], ['Laurent Mekies', 2024, 2025], ['Alan Permane', 2025, null]] },
  audi: { base: 'Hinwil (Suíça) e Neuburg (Alemanha)', debut: 1993, principals: [['Peter Sauber', 1993, 2005], ['Mario Theissen', 2006, 2009], ['Peter Sauber', 2010, 2012], ['Monisha Kaltenborn', 2012, 2017], ['Frédéric Vasseur', 2017, 2022], ['Alessandro Alunni Bravi', 2023, 2024], ['Jonathan Wheatley', 2025, null]] },
  cadillac: { base: 'Fishers (EUA) e Silverstone (Reino Unido)', debut: 2026, principals: [['Graeme Lowdon', 2025, null]] },
};
