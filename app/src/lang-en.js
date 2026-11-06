/* ============================================================
   PIT WALL — textos do núcleo em inglês: narração da classificação e da
   corrida, rádio, retorno do piloto no treino, nomes de pneus, clima e
   abandonos. applyLang('en') troca os modelos; applyLang('pt') devolve
   os originais. Os nomes reais das curvas não mudam; "curva 3" vira "turn 3".
   ============================================================ */
'use strict';

const LangEN = {};
LangEN.corner = (c) => String(c)
  .replace(/^sequência das curvas (\d+) e (\d+)$/, 'the turn $1-$2 sequence')
  .replace(/^chicane das curvas (\d+) e (\d+)$/, 'the turn $1-$2 chicane')
  .replace(/^chicane da curva (\d+)$/, 'the turn $1 chicane')
  .replace(/^hairpin da curva (\d+)$/, 'the turn $1 hairpin')
  .replace(/^curvas (\d+) a (\d+)$/, 'turns $1 to $2')
  .replace(/^curva (\d+) inclinada$/, 'the banked turn $1')
  .replace(/^curva (\d+)$/, 'turn $1')
  .replace(/^curva final$|^última curva$/, 'the final corner')
  .replace(/^curva ([A-Z].*)$/, '$1 corner')
  .replace(/^chicane final$/, 'the final chicane')
  .replace(/^chicane do Porto$/, 'the harbour chicane').replace(/^chicane da Bus Stop$/, 'the Bus Stop chicane').replace(/^chicane Casio$/, 'the Casio Triangle')
  .replace(/^túnel$/, 'the tunnel').replace(/^hairpin$/, 'the hairpin').replace(/^Esses$/, 'the Esses')
  .replace(/^primeira de Lesmo$/, 'Lesmo 1').replace(/^segunda de Lesmo$/, 'Lesmo 2')
  .replace(/^trecho do castelo$/, 'the castle section').replace(/^reta da orla$/, 'the seafront straight').replace(/^reta da Strip$/, 'the Strip straight')
  .replace(/^setor do estádio$/, 'the stadium section').replace(/^curvas rápidas do primeiro setor$/, 'the fast first-sector sweeps').replace(/^reta dos boxes$/, 'the pit straight')
  .replace(/^ponte Anderson$/, 'Anderson Bridge').replace(/^Muro dos Campeões$/, 'the Wall of Champions');

LangEN.BEHAVIOR = {
  balance: { neg: ['the front would not turn in at {c}', 'clear understeer at {c}', 'had to wait for the car to rotate at {c}'], pos: ['the rear stepped out on the exit of {c}', 'oversteer at {c}, quick correction', 'the car rotated too much into {c}'] },
  braking: { neg: ['locked the front into {c}', 'smoke from the front tyre at {c}'], pos: ['the rear went light under braking for {c}', 'unstable braking into {c}'] },
  cornering: { neg: ['the car rolled too much through {c}', 'scraped the floor at {c}'], pos: ['the car bounced over the kerb at {c}', 'skipped over the bumps at {c}'] },
  traction: { neg: ['slow exit from {c}, the car pushed wide', 'slow to rotate on the exit of {c}'], pos: ['wheelspin out of {c}', 'lost traction accelerating out of {c}'] },
  straights: { neg: ['quick on the straights but struggles in the fast corners', 'great top speed, loose in the corners'], pos: ['slow on the straights, too much downforce', 'losing a lot on the straights to rivals'] },
};
LangEN.R = {
  overtake: ['{a} passes {b} at {c} and takes P{p}!', 'Move by {a} on {b} at {c}: now P{p}.', '{a} gets alongside at {c} and completes the pass on {b}. P{p}.', 'Overtake! {a} wins the fight with {b} at {c}, up to P{p}.', '{a} uses the slipstream and leaves {b} behind before {c}.'],
  defend: ['{b} holds off {a} at {c} with a firm defence.', '{a} tries the inside at {c}, but {b} shuts the door.', '{b} resists the pressure from {a} for another lap.'],
  pit: ['{a} pits: {t}s stationary, {tyre} tyres. Rejoins P{p}.', 'Box for {a}! {t}s stop and on to {tyre}. Back out in P{p}.', '{a} makes the stop ({t}s) for {tyre}; rejoins P{p}.'],
  slowPit: ['Problem at the stop for {a}: {t}s stationary! Loses places, rejoins P{p}.', 'Slow stop for {a}, {t}s. The rear wheel nut was stubborn.'],
  fastLap: ['{a} sets the fastest lap: {t}.', 'Fastest lap of the race for {a}, {t}.'],
  undercut: ['The undercut worked: {a} comes out of the pits ahead of {b}.', '{a} gets the place from {b} on strategy, with the undercut.'],
};
LangEN.qSector = (v, r) => {
  const S = ['first', 'second', 'third'][v.sec];
  const c = v.corner;
  if (v.traffic) return Narr.fill(Narr.pick('qT', ['{name} hits traffic at {c} and loses {x}s in the {S} sector.', 'Bad luck for {name}: slow car at {c}, the {S} sector is {x}s worse.', '{name} is held up at {c}; the {S} sector is {x}s slower.'], r), { name: v.name, c, x: v.traffic.toFixed(2), S });
  if (v.err) return Narr.fill(Narr.pick('qE', ['{name} makes a mistake at {c}! Runs wide, loses {x}s in the {S} sector.', 'Lock-up at {c} for {name} — {x}s thrown away in the {S} sector.', '{name} goes straight on at {c}; lap compromised, {x}s lost.'], r), { name: v.name, c, x: v.err.toFixed(2), S });
  if (v.status === 'purple') return Narr.fill(Narr.pick('qP', ['{name} lights up the {S} sector in purple: {t}, the best of the session!', 'Purple {S} sector for {name}! {t}, {d} on the previous best.', '{name} flies through the {S} sector: {t}, nobody has been that quick there.'], r), { name: v.name, t: Narr.t3(v.t), S, d: Narr.gap(v.delta) });
  if (v.issue) return Narr.fill(Narr.pick('qI', ['{S} sector for {name} in {t} ({d}): {issue}.', '{name} completes the {S} sector in {t}, {d} to the best; {issue}.', 'In the {S} sector, {issue}. {name} sets {t} ({d}).'], r), { name: v.name, t: Narr.t3(v.t), d: Narr.gap(v.delta), issue: v.issue, S });
  if (v.status === 'green') return Narr.fill(Narr.pick('qG', ['{name} improves in the {S} sector: {t}, green, personal best.', 'Green for {name} in the {S} sector ({t}), {d} to the session best.', '{name} finds time in the {S} sector: {t}.'], r), { name: v.name, t: Narr.t3(v.t), d: Narr.gap(v.delta), S });
  return Narr.fill(Narr.pick('qY', ['{name} crosses the {S} sector in {t}, {d} to the best.', '{S} sector for {name}: {t} ({d}).', '{name} a little slower in the {S} sector: {t}, {d}.'], r), { name: v.name, t: Narr.t3(v.t), d: Narr.gap(v.delta), S });
};
LangEN.qLap = (v, r) => {
  if (v.deleted) return Narr.fill(Narr.pick('qD', ['Lap DELETED for {name}: track limits at {c}. The {t} does not count.', 'The stewards delete the lap of {name} for track limits at {c}. What a blow!'], r), v);
  const posTxt = v.pos === 1 ? (v.last ? 'provisional pole' : `top of ${v.seg}`) : `P${v.pos}, +${v.gap.toFixed(3)}`;
  const tail = v.pole ? Narr.pick(v.last ? 'qPo' : 'qTop', v.last ? [' NEW PROVISIONAL POLE!', ' The fastest of them all!', ' What a lap, takes pole!'] : [' Leads the session.', ' Nobody has been that quick so far.', ' Fastest time of the session.'], r)
    : v.elim ? Narr.pick('qEl', [' In the drop zone!', ' For now, would be out.', ' Still at risk of elimination.'], r)
      : v.safe ? Narr.pick('qSa', [' Out of the drop zone.', ' Enough for now.', ''], r) : '';
  const base = v.pole ? Narr.pick('qLp', ['{name} completes the lap in {t}.', '{name} crosses the line with {t}!', 'Lap done for {name}: {t}.'], r) : Narr.pick('qL', ['{name} completes the lap in {t}: {posTxt}.', '{name} crosses the line with {t}, {posTxt}.', 'Lap done for {name}: {t}, {posTxt}.'], r);
  return Narr.fill(base, { ...v, posTxt }) + tail + (v.setupNote ? ' ' + v.setupNote : '');
};
LangEN.PHRASES = {
  balance: {
    neg: ['The front will not turn in the slow corners, a lot of understeer.', 'I am waiting for the car to rotate on entry; not enough front.', 'Understeer mid-corner, I have to open the wheel early.'],
    pos: ['The rear is very nervous, oversteer out of the slow corners.', 'The car rotates too much on entry, the rear does not follow.', 'I am correcting the rear all the time, oversteer.'],
    ok: ['The balance is good, I can put the car where I want.', 'Front and rear are working well together.', 'Balance is spot on.'],
  },
  braking: {
    neg: ['Locking the front under heavy braking.', 'The front locks easily at the end of the straight, brakes too far forward.', 'Front left locking into turn 1.'],
    pos: ['The rear goes light under braking, I nearly spun.', 'Too unstable on the brakes, the rear wants to come round.', 'Braking in a straight line and the rear moves.'],
    ok: ['Stable braking, I can attack the braking zones.', 'I trust the brakes, they are great.', 'Brakes are in the right place.'],
  },
  cornering: {
    neg: ['Too soft, the car rolls and is slow to change direction.', 'The car is lazy in the chicanes, not enough support.', 'Bottoming out in the compressions, too low or too soft.'],
    pos: ['Too stiff, bouncing over the kerbs.', 'The car skips over the bumps and loses grip.', 'I cannot use the kerbs, it is too stiff.'],
    ok: ['Good in the corners, great mechanical grip.', 'The car rides the kerbs well.', 'Stable platform in the corners.'],
  },
  traction: {
    neg: ['Out of the slow corners the car does not rotate, it pushes wide.', 'Not enough rotation on exit, I lose time waiting to get on the power.', 'On traction the front washes out, not enough rotation.'],
    pos: ['A lot of wheelspin out of the slow corners.', 'The rear lets go when I get on the throttle.', 'Losing traction on exit, wheels spinning.'],
    ok: ['Good traction, I can get on the power early.', 'Clean corner exits.', 'Traction is spot on.'],
  },
  straights: {
    neg: ['Plenty of straight-line speed, we can add more downforce.', 'Very quick on the straights and too little downforce in the corners.', 'I gain on the straights but lose it all in the fast corners.'],
    pos: ['Far too slow on the straights, too much drag.', 'They pass me easily on the straight, too much wing.', 'The car will not go on the straights, too much downforce.'],
    ok: ['Good straight-line speed for this track.', 'Drag and downforce well balanced.', 'The right compromise between straights and corners.'],
  },
};
LangEN.REASONS = { fuel: 'with the heavier fuel load', fuelLight: 'with the car light', rubber: 'with the track rubbering in', heat: 'with the hotter asphalt', cool: 'with the track cooling down', wind: 'with the wind changing', push: 'pushing harder on the limit', wear: 'with more worn tyres' };
LangEN.ART = { balance: 'the balance', braking: 'the braking', cornering: 'the car in the corners', traction: 'the traction', straights: 'the straight-line speed' };
LangEN.ADVICE = {
  balance: { neg: 'take some rear wing off or add front wing', pos: 'add rear wing or take front wing off' },
  braking: { neg: 'move the brake balance a bit rearwards', pos: 'move the brake balance forwards' },
  cornering: { neg: 'stiffen the suspension or raise the car a bit', pos: 'soften the suspension or lower the car' },
  traction: { neg: 'stiffen the rear a little', pos: 'add rear wing or soften the suspension' },
  straights: { neg: 'add more downforce on the wings', pos: 'take wing off, mainly the rear' },
};
LangEN.CATS = [
  ['balance', 'Balance', 'Understeer', 'Oversteer'],
  ['braking', 'Braking', 'Front locking', 'Unstable rear'],
  ['cornering', 'Cornering', 'Too soft', 'Too stiff'],
  ['traction', 'Traction', 'Lack of rotation on exit', 'Wheelspin on exit'],
  ['straights', 'Straights', 'Too little downforce', 'Too much drag'],
];
LangEN.RADIO = {
  tyres: [['{d}', 'The tyres are gone, I am losing a lot of time.'], ['{d}', 'No grip at the rear any more. When are we stopping?'], ['{d}', 'The tyres are dropping off, I cannot do many more laps.']],
  tyresReply: ['Understood, box this lap.', 'Hold on two more laps, we are setting up the window.', 'Copy. Looking at plan B.'],
  faster: [['{d}', 'I am faster, I need to get by!'], ['{d}', 'I am stuck behind {b}, losing time.'], ['{d}', '{b} is holding everyone up.'], ['{d}', 'I cannot get close, too much dirty air behind {b}.']],
  teamOrderAsk: 'Let {m} through, he is on a different strategy.',
  teamOrderHold: 'Hold positions. No fighting between you two.',
  teamOrderReply: [['{d}', 'Understood... but he will have to give it back later.'], ['{d}', 'Seriously? OK, OK.'], ['{d}', 'Copy.']],
  scNoPit: [['{d}', 'Why did we not stop under the Safety Car?!'], ['{d}', 'Everybody pitted! What is the plan?']],
  scNoPitReply: ['We stayed out to gain track position. Trust the plan.', 'Tyres are still good, we go to the end.'],
  contact: [['{d}', 'He pushed me off! That has to be investigated.'], ['{d}', 'He left me no room at all!'], ['{d}', 'What was that move? He hit me!']],
  battery: [['{d}', 'The battery is empty, I cannot attack.'], ['{d}', 'No energy on the straight, I need to recharge.']],
  push: ['{n} laps to go. Qualifying pace now!', 'All or nothing in the last {n} laps.'],
  win: [['{d}', 'YES! What a race! Thank you, guys!'], ['{d}', 'We won! What a car, what a team!']],
  box: ['Box, box. Box this lap.', 'Box, box! Confirm.', 'In now, box, box.', 'Box this lap, tyres are ready.'],
  boxSC: ['Safety Car! Box, box, box!', 'Box now, use the Safety Car!'],
  rain: [['{d}', 'It is starting to rain at {c}!'], ['{d}', 'Track getting slippery at {c}, careful.'], ['{d}', 'It is getting wet, when do we change?']],
  dry: [['{d}', 'The track is drying, the racing line is dry already.'], ['{d}', 'These tyres are overheating, the track is dry.']],
  gap: ['{a}s to {f} ahead. You are {d} quicker per lap.', 'Gap of {a}s to {f}. Good pace, keep going.', '{b}s ahead of {g} behind. Keep the pace.'],
  fl: ['Fastest lap! Excellent.', 'Purple in sector three, fastest lap. Well done.'],
};
LangEN.TYRES = { S: 'Soft', M: 'Medium', H: 'Hard', I: 'Intermediate', W: 'Wet' };
LangEN.FAILURES = ['Engine failure', 'Gearbox problem', 'Hydraulic pressure loss', 'Electrical failure', 'Overheating', 'Brake problem', 'Energy store failure'];

const LANG_ORIG = {};
function applyLang(l) {
  const has = (x) => typeof x !== 'undefined';
  if (!LANG_ORIG.saved) {
    LANG_ORIG.saved = true;
    if (has(Narr)) Object.assign(LANG_ORIG, { BEH: Narr.BEHAVIOR, R: Narr.R, qSector: Narr.qSector, qLap: Narr.qLap, corner: Narr.corner, at: Narr.at, of: Narr.of });
    if (has(Setup)) Object.assign(LANG_ORIG, { PH: Setup.PHRASES, REA: Setup.REASONS, ART: Setup.ART, ADV: Setup.ADVICE, CATS: Setup.CATS });
    if (has(RaceLog)) LANG_ORIG.RADIO = RaceLog.RADIO;
    LANG_ORIG.TYRES = Object.fromEntries(Object.entries(TYRES).map(([k, v]) => [k, v.name]));
    LANG_ORIG.TSHORT = Object.fromEntries(Object.entries(TYRES).map(([k, v]) => [k, v.short]));
    LANG_ORIG.FAILURES = FAILURES.slice();
    if (has(Engine.CPROPS)) LANG_ORIG.CW = Engine.CPROPS.W && Engine.CPROPS.W.name;
  }
  const en = l === 'en';
  if (has(Narr)) {
    Narr.BEHAVIOR = en ? LangEN.BEHAVIOR : LANG_ORIG.BEH;
    Narr.R = en ? LangEN.R : LANG_ORIG.R;
    Narr.qSector = en ? LangEN.qSector : LANG_ORIG.qSector;
    Narr.qLap = en ? LangEN.qLap : LANG_ORIG.qLap;
    Narr.corner = en ? (track, sec, r) => LangEN.corner(LANG_ORIG.corner(track, sec, r)) : LANG_ORIG.corner;
    Narr.at = en ? (c) => `at ${c}` : LANG_ORIG.at;
    Narr.of = en ? (c) => `of ${c}` : LANG_ORIG.of;
  }
  if (has(Setup)) {
    Setup.PHRASES = en ? LangEN.PHRASES : LANG_ORIG.PH;
    Setup.REASONS = en ? LangEN.REASONS : LANG_ORIG.REA;
    Setup.ART = en ? LangEN.ART : LANG_ORIG.ART;
    Setup.ADVICE = en ? LangEN.ADVICE : LANG_ORIG.ADV;
    Setup.CATS = en ? LangEN.CATS : LANG_ORIG.CATS;
  }
  if (has(RaceLog)) RaceLog.RADIO = en ? LangEN.RADIO : LANG_ORIG.RADIO;
  Object.keys(TYRES).forEach(k => { TYRES[k].name = en ? (LangEN.TYRES[k] || LANG_ORIG.TYRES[k]) : LANG_ORIG.TYRES[k]; TYRES[k].short = en ? k : LANG_ORIG.TSHORT[k]; });
  if (has(Engine.CPROPS) && Engine.CPROPS.W) Engine.CPROPS.W.name = en ? 'Wet' : LANG_ORIG.CW;
  FAILURES.splice(0, FAILURES.length, ...(en ? LangEN.FAILURES : LANG_ORIG.FAILURES));
}
