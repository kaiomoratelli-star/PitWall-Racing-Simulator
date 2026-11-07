# Duplicatas de pilotos

Gerado por `scripts/audit.js db` em 2026-11-07, numa carreira nova (semente "audit"). Regra em `app/src/persons.js`: só une com nome compatível (forma canônica, apelidos e transliterações) **e** sem conflito (QID do Wikidata, nascimento, nacionalidade, idade possível, Jr./Sr.). Homônimos sem evidência ficam separados.

## Confirmadas e unificadas (3)
| Ficou | Saiu (apelido) | Evidência |
|---|---|---|
| Austin J. Hill (`c-austin-j-hill`) | Austin Hill (`c-austin-hill`) | mesmo nome, nome e nacionalidade |
| Maximilian Popov (`c-maximilian-popov`) | Maksimilian Popov (`c-maksimilian-popov`) | mesmo nome, nome e nacionalidade |
| Cam Waters (`c-cam-waters`) | Cameron Waters (`c-cameron-waters`) | mesmo nome, nome e nacionalidade |

As duplicatas também são evitadas na importação: as categorias e a base do DriverDB procuram a pessoa pelo mesmo índice antes de criar um registro.

## Revisão manual: mesmo sobrenome e nacionalidade, primeiro nome parecido (4)
Não foram unidas: sem evidência de que sejam a mesma pessoa.

| Registro 1 | Registro 2 | País |
|---|---|---|
| Ren Sato (`c-ren-sato`) | Rintaro Sato (`c-rintaro-sato`) | JPN |
| Ryo Sakai (`c-ryo-sakai`) | Ryutaro Sakai (`c-ryutaro-sakai`) | JPN |
| Kaoru Yoshida (`c-kaoru-yoshida`) | Kodai Yoshida (`c-kodai-yoshida`) | JPN |
| Tameem Hassiba (`c-tameem-hassiba`) | Taha Hassiba (`c-taha-hassiba`) | QAT |

## Pilotos gerados renomeados (0)
- nenhum
