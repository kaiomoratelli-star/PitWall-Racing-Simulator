'use strict';
/* =============================================================
   DANOS NA CORRIDA (0.8.7): asa dianteira parcial, bandeira preta e laranja, detritos
   - Dano parcial: um pedaço da asa custa menos tempo por volta; o carro pode seguir até a parada normal.
     A estratégia (automática ou da IA) só para fora de hora se o dano for grande ou se perder mais tempo
     do que a parada custa (Engine.aiWantsPit).
   - Peça solta: asa muito danificada pode ficar pendurada. Os comissários mostram a bandeira preta e laranja:
     o carro precisa parar em até 2 voltas. Se não parar, bandeira preta (fora da corrida). A peça pode cair
     antes disso e virar detrito.
   - Detritos: pedaços grandes de asa na pista podem trazer o Safety Car virtual.
   ============================================================= */
const Damage = { MEATBALL_LAPS: 2, FALL_P: 0.25 };
Damage.lap = (race, wk, L, scType) => {
  race.cars.forEach(c => {
    if (c.status !== 'run') { c.loosePart = null; c.meatball = null; return; }
    if (c.loosePart && !c.meatball) {
      c.meatball = { from: L, until: L + Damage.MEATBALL_LAPS };
      Engine.event(race, 'flag', byLang(`Bandeira preta e laranja para ${wk.nameOf(c.did)}: asa dianteira solta. Precisa parar nos boxes em até ${Damage.MEATBALL_LAPS} voltas.`, `Black and orange flag for ${wk.nameOf(c.did)}: loose front wing. Must pit within ${Damage.MEATBALL_LAPS} laps.`), c.did, { imp: true });
      return;
    }
    if (!c.meatball) return;
    if (RNG.chance(Damage.FALL_P)) {
      // a peça cai sozinha: acaba a bandeira, sobra o dano e o detrito
      c.loosePart = null; c.meatball = null; c.damage.wing = 1; race.debrisLap = L;
      Engine.event(race, 'issue', byLang(`A asa dianteira de ${wk.nameOf(c.did)} se solta e fica na pista.`, `${wk.nameOf(c.did)}'s front wing comes off and is left on track.`), c.did);
    } else if (L > c.meatball.until) {
      c.status = 'dnf'; c.dnfReason = byLang('Bandeira preta (peça solta)', 'Black flag (loose part)'); c.loosePart = null; c.meatball = null;
      (race.pens = race.pens || []).push({ did: c.did, s: 0, why: 'solta', lap: L, pts: 0, kind: 'bf' });
      Engine.event(race, 'penalty', byLang(`BANDEIRA PRETA: ${wk.nameOf(c.did)} está fora por não parar com a asa solta.`, `BLACK FLAG: ${wk.nameOf(c.did)} is out for not pitting with a loose wing.`), c.did, { imp: true });
    }
  });
  if (race.debrisLap != null && race.debrisLap >= L - 1 && !race.sc && !scType && RNG.chance(0.6)) {
    Engine.deploySC(race, 'VSC', byLang('detritos da asa dianteira', 'front wing debris'), wk);
    race.debrisLap = null;
  } else if (race.debrisLap != null && race.debrisLap < L - 1) race.debrisLap = null;
};
Hooks.around('Engine', Engine, 'stewardsLap', 'damage', (next, race, wk, L, scType) => { const r = next(race, wk, L, scType); try { Damage.lap(race, wk, L, scType); } catch (e) { /* a corrida segue */ } return r; });
