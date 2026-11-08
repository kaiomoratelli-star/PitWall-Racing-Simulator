const fs=require('fs');
const c=require('./load')();
c.run(`var __OUT=null; var imgUrl=r=>r; var HAS_IMG=true;`); c.run(fs.readFileSync('/workspace/pitwall-racing-simulator/app/src/assets.js','utf8').replace(/^const Assets/m,'var Assets'));
const code=`(()=>{
const G=Career.create(defaultDb(),{mode:'manager',seed:'proto85',teamId:'mclaren'});
G.player.name='Kaio Moratelli';
const full=()=>{Career.startWeekend(G);Career.finishPractice(G);Career.runQualifying(G);Career.startRace(G);Career.simRaceToEnd(G);Career.finishWeekend(G);};
const t0=Career.team(G);
try{Fac.upgrade(G,t0,'tunel');}catch(e){}
while(!Career.seasonOver(G)) full();
Career.endSeason(G);
for(let i=0;i<8;i++){ if(i===7){ G.__p=[RnD.start(G,{area:'floor',amb:'aggressive',focus:'downforce',wt:90,cfd:600}),RnD.start(G,{area:'frontWing',amb:'balanced',focus:'efficiency',wt:50,cfd:300})]; } full(); if(i===3){ try{Fac.upgrade(G,t0,'simulador');}catch(e){} } }
G.__p.push(RnD.start(G,{area:'suspension',amb:'conservative',focus:'tyres',next:true,wt:0,cfd:150}));
try{ const SS=Scouting.state(G); if(SS.staff[0]) Scouting.assign(G,SS.staff[0].id,{kind:'cat',cat:'f2'}); if(SS.staff[1]) Scouting.assign(G,SS.staff[1].id,{kind:'region',region:'sa'}); }catch(e){G.__p.push('scout '+e.message);}
let councilOpen=null; try{ Council.openMeeting(G); councilOpen=JSON.parse(JSON.stringify(G.council.open)); }catch(e){G.__p.push('council '+e.message);}
const R=(x,d=1)=>x==null?null:+(+x).toFixed(d);
const T=Career.team(G);
const teamsC=Career.standingsC(G), drvD=Career.standingsD(G);
const cpos={};teamsC.forEach((s,i)=>cpos[s.tid]={pos:i+1,pts:s.pts});
const dpos={};drvD.forEach((s,i)=>dpos[s.did]={pos:i+1,pts:s.pts,st:s.st});
const ATTR=['pace','qualifying','racecraft','consistency','tyre','wet','overtaking','defending','start','energy','adaptability','concentration','feedback'];
const allD=G.db.drivers;
const f1ids=new Set(G.db.teams.map(t=>t.id));
const dOut=d=>({face:Assets.face(d),id:d.id,name:d.name,first:d.firstName,last:d.lastName,abbr:d.abbr,nat:d.nat,age:d.age,num:d.number,team:d.team,seat:d.seat,img:d.img||null,ovr:R(d.ovr),pot:d.potential,style:d.style,attrs:Object.fromEntries(ATTR.map(a=>[a,R(d[a],0)])),pers:d.personality,morale:R(d.morale,0),pop:R(d.popularity,0),exp:R(d.experience,0),contract:d.contract?{until:d.contract.until,salary:d.contract.salary,option:d.contract.option,clauses:d.contract.clauses}:null,manager:d.manager||null,career:d.career,season:dpos[d.id]||null,injured:d.injured||0,real:(d.realSeasons||[]).map(s=>[s[0],s[1],s[2],s[3],s[4],s[5]])});
const f1Drivers=allD.filter(d=>d.team&&f1ids.has(d.team)&&d.seat).map(dOut);
const res=G.season.results;
const matrix={}; res.forEach((r,ri)=>r.cls.forEach(x=>{(matrix[x.did]=matrix[x.did]||[])[ri]=x.status==='fin'||x.status==='lapped'?x.pos:'R';}));
const teams=G.db.teams.map(t=>({id:t.id,name:t.name,full:t.fullName,short:t.short,country:t.country,color:t.color,color2:t.color2,logo:t.logo,carImg:t.carImg,engine:t.engine,works:t.works,car:Object.fromEntries(Object.entries(t.car).map(([k,v])=>[k,R(v)])),pitCrew:R(t.pitCrew),facilities:R(t.facilities),budget:t.budget,reputation:R(t.reputation),cash:R(t.cash),staff:t.staff,staffNames:t.staffNames,chassis:t.chassisName,pu:t.puName,sponsors:t.sponsors,owner:t.owner,ownerMood:R(t.ownerMood,0),debt:R(t.debt),value:R(Owners.value(G,t),0),sale:Owners.protection?Owners.protection(G,t):null,fac:t.fac,partnerOf:t.partnerOf,persona:t.ai&&t.ai.persona,founded:t.founded,champ:cpos[t.id]||null,lineup:Career.teamDrivers(G,t.id).map(d=>d.id),realStats:t.realStats||null}));
const cal=G.season.calendar.map((id,i)=>{const tr=Career.track(G,id)||{};const r=res[i];return {round:i+1,id,gp:tr.gp,circuit:tr.circuit,place:tr.place,country:tr.country,date:tr.date,sprint:!!tr.sprint,laps:tr.laps,length:tr.length,turns:tr.turns,street:tr.street,overtaking:tr.overtaking,tyreStress:tr.tyreStress,rain:tr.rain,weights:tr.weights,pitLoss:tr.pitLoss,drs:tr.drs,racesHeld:tr.racesHeld,shape:tr.shape,done:!!r,winner:r?r.winner:null,pole:r?r.pole:null,fastest:r&&r.fastest?r.fastest.did:null,record:G.trackRecords&&G.trackRecords[id]||null};});
const last=G.lastRace;
const lastOut={round:last.round,gp:last.gp,trackId:last.trackId,laps:last.laps,wet:last.wet,weather:last.weather,events:(last.events||[]).filter(e=>e.imp).slice(0,40),pitLog:(last.pitLog||[]).slice(0,40),sc:last.scHistory,cars:last.cars.map(x=>({did:x.did,tid:x.tid,grid:x.grid,pos:x.pos,status:x.status,best:R(x.best,3),pits:x.pits,overtakes:x.overtakes,stints:x.stints,positions:x.positions,gaps:(x.gaps||[]).map(g=>R(g,2)),vmax:x.vmax,times:(x.times||[]).map(g=>R(g,3))})),cls:res[res.length-1].cls.map(x=>({did:x.did,tid:x.tid,pos:x.pos,grid:x.grid,pts:x.pts,status:x.status,reason:x.reason,laps:x.laps,T:R(x.T,3),best:R(x.best,3),pits:x.pits,penalty:x.penalty})),quali:last.quali};
// próximo fim de semana: treino + classificação + corrida pela metade
Career.startWeekend(G);
const W=G.weekend;
const pre={round:W.round,trackId:W.trackId,weather:W.weather,forecast:W.forecast,optimum:W.optimum,setups:W.setups,strategy:W.strategy,fp:W.fp,form:W.form};
Career.finishPractice(G);Career.runQualifying(G);
const Q=JSON.parse(JSON.stringify(W.quali));
Career.startRace(G);
for(let i=0;i<31;i++)Career.stepRace(G);
const RR=W.race;
const live={lap:RR.lap,laps:RR.laps,sc:RR.sc,wet:RR.wet,fastest:RR.fastest,weather:W.weather,events:RR.events.slice(-30),cars:RR.cars.map(x=>({did:x.did,tid:x.tid,pos:x.pos,grid:x.grid,T:R(x.T,3),last:R(x.lastLap,3),best:R(x.best,3),tyre:x.tyre&&{c:x.tyre.c,wear:R(x.tyre.wear,0),age:x.tyre.age,temp:R(x.tyre.temp,0)},used:x.used,soc:R(x.soc,0),fuel:R(x.fuel,1),mode:x.mode,tyreMode:x.tyreMode,ersMode:x.ersMode,damage:x.damage,status:x.status,pits:x.pits,isPlayer:x.isPlayer,drs:x.drs,gapAhead:R(x.lastGapAhead,3),gapBehind:R(x.lastGapBehind,3),lastS:x.lastS,bestS:x.bestS,vmax:x.vmax,positions:x.positions,plan:x.plan})).sort((a,b)=>a.pos-b.pos),bestS:RR.bestS,pitLog:RR.pitLog};
const fin=G.finances;
const out={
 meta:{year:G.season.year,round:G.season.round,today:G.today,player:G.player,mode:G.mode,options:G.options,board:G.board,team:T.id,rounds:G.season.calendar.length,capRoom:R(Career.capRoom?Career.capRoom(G,T):null),slots:Career.slots?Career.slots(T):null},
 teams,drivers:f1Drivers,
 reserves:allD.filter(d=>d.team&&f1ids.has(d.team)&&!d.seat).slice(0,30).map(dOut),
 freeAgents:allD.filter(d=>!d.team&&!d.retired&&d.ovr>70).sort((a,b)=>b.ovr-a.ovr).slice(0,40).map(dOut),
 standD:drvD.map(s=>({did:s.did,pts:s.pts,st:s.st})),standC:teamsC,matrix,
 calendar:cal,results:res.map(r=>({round:r.round,gp:r.gp,trackId:r.trackId,winner:r.winner,pole:r.pole,fastest:r.fastest&&r.fastest.did,wet:r.wet,sc:r.sc,podium:r.cls.slice(0,3).map(x=>x.did)})),
 last:lastOut,pre,quali:Q,live,
 inbox:G.inbox.slice(0,40).map(m=>({id:m.id,read:m.read,round:m.round,year:m.year,from:m.from,tag:m.tag,title:m.title,body:m.body,choices:(m.choices||[]).map(c=>c.label),block:m.block||m.must||false})),
 news:G.news.slice(0,60),social:G.social.slice(0,40),
 finances:{balance:R(fin.balance),season:fin.season,ledger:fin.ledger.slice(-60),spent:R(fin.spent)},
 sponsors:G.sponsors,
 staff:T.staffList,staffMarket:(G.staffMarket||[]).slice(0,30),
 projects:G.projects,areas:Career.AREAS,
 history:G.history,log:G.log.slice(-200),
 academies:G.academies,
 scout:G.scout,council:G.council,councilOpen,dbg:G.__p,rndSpec:RnD.SPEC,rndFocus:RnD.FOCUS,rndAmb:RnD.AMB,sizes:Career.SIZES,
 owners:{log:(G.owners.log||[]).slice(-60),cand:G.owners.cand,apps:G.owners.apps,cands:Owners.cands().map(c=>({id:c.id,name:c.name,kind:c.kind,country:c.country,color:c.color,color2:c.color2,logo:c.logo,budget:c.budget,story:c.story||c.desc||null}))},
 mfr:{list:G.mfr.list,contracts:G.mfr.contracts,log:(G.mfr.log||[]).slice(-40),tyres:G.mfr.tyres,tyreTraits:Mfr.TYRES},
 fac:{B:Fac.B,eff:Fac.EFFECT},
 chaos:{cases:G.chaos.cases,log:G.chaos.log.slice(-60)},
 market:{talks:G.market.talks,history:G.market.history},
 sisters:G.sisterInfo,partners:G.partners,
 cats:G.cats.order.map(id=>{const k=G.cats.byId[id];return {id,name:k.name,short:k.short,tier:k.tier,color:k.color,disc:k.disc,enabled:k.enabled,teams:(k.teams||[]).length,stand:(k.stand||k.standings||[]).slice?((k.stand||k.standings||[]).slice(0,5)):null,keys:Object.keys(k).join(',')};}),
 circ:G.circ,
 memory:G.memory, FLAG:Assets.FLAG, logos:(()=>{const o={};const add=(k,n)=>{const u=Assets.logoByName(k,n);if(u)o[k+':'+n]=u;}; (G.sponsors||[]).forEach(x=>add('sponsors',x.name)); G.db.teams.forEach(t=>(t.sponsors||[]).forEach(n=>add('sponsors',n))); (G.mfr.list||[]).forEach(m=>add('manufacturers',m.name)); ['FIA','Formula One Group'].forEach(n=>add('institutions',n)); Object.keys(Mfr.TYRES).forEach(k=>add('tyres',Mfr.TYRES[k].name||k)); (G.news||[]).forEach(n=>add('media',n.outlet)); return o;})(), catLogos:G.cats.order.filter(id=>Assets.has('logos/categories/'+id+'.png')), mfrTyres:Mfr.TYRES,
};
__OUT=JSON.stringify(out);
return 'ok';})()`;
console.log(c.run(code));
const o=c.run('__OUT');
fs.writeFileSync(process.argv[2],o);
console.log((o.length/1024|0)+' KB');
