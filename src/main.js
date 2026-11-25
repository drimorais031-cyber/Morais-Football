import * as THREE from "three";
import { createScene } from "./scene.js?v=mf-v1-13";
import { BallPhysics } from "./physics.js?v=mf-v1-13";
import { Controls } from "./controls.js?v=mf-v1-13";
import { updateAI, updateGoalkeepers } from "./ai.js?v=mf-v1-13";
import { Match } from "./match.js?v=mf-v1-13";

const $=s=>document.querySelector(s);
const TEAMS=[{"id":"flamengo","name":"Flamengo","short":"FLA","mascot":"Urubu","emoji":"🦅","shirt":11999533,"shorts":1513239},{"id":"corinthians","name":"Corinthians","short":"COR","mascot":"Mosqueteiro","emoji":"⚔️","shirt":15856107,"shorts":1513239},{"id":"palmeiras","name":"Palmeiras","short":"PAL","mascot":"Porco","emoji":"🐷","shirt":554051,"shorts":15856107},{"id":"saopaulo","name":"São Paulo","short":"SPFC","mascot":"Santo Paulo","emoji":"⭐","shirt":16052456,"shorts":1513239},{"id":"santos","name":"Santos","short":"SAN","mascot":"Peixe","emoji":"🐟","shirt":16053485,"shorts":1513239},{"id":"gremio","name":"Grêmio","short":"GRE","mascot":"Mosqueteiro","emoji":"⚔️","shirt":2440579,"shorts":15856107},{"id":"internacional","name":"Internacional","short":"INT","mascot":"Saci","emoji":"🧢","shirt":12918316,"shorts":15856107},{"id":"atleticomg","name":"Atlético-MG","short":"CAM","mascot":"Galo","emoji":"🐓","shirt":2105376,"shorts":15856107},{"id":"cruzeiro","name":"Cruzeiro","short":"CRU","mascot":"Raposa","emoji":"🦊","shirt":1461146,"shorts":15856107},{"id":"vasco","name":"Vasco","short":"VAS","mascot":"Almirante","emoji":"🏴‍☠️","shirt":1513239,"shorts":15856107}];
const teamById=id=>TEAMS.find(t=>t.id===id)||TEAMS[0];
function crest(team){return '<span class="crest" style="--crest:'+('#'+team.shirt.toString(16).padStart(6,"0"))+';--trim:'+('#'+team.shorts.toString(16).padStart(6,"0"))+'">'+team.short+'</span>'}
function preview(id,target){const t=teamById(id);$(target).innerHTML=crest(t)+'<span><b>'+t.name+'</b><small>'+t.emoji+' Mascote: '+t.mascot+'</small></span>'}
function fillTeamSelects(){
 for(const id of ["#homeTeam","#awayTeam"]){$(id).innerHTML=TEAMS.map(t=>'<option value="'+t.id+'">'+t.name+'</option>').join("")}
 $("#homeTeam").value="palmeiras";$("#awayTeam").value="flamengo";
 const refresh=()=>{if($("#homeTeam").value===$("#awayTeam").value){const alt=TEAMS.find(t=>t.id!==$("#homeTeam").value);$("#awayTeam").value=alt.id}preview($("#homeTeam").value,"#homePreview");preview($("#awayTeam").value,"#awayPreview")};
 $("#homeTeam").addEventListener("change",refresh);$("#awayTeam").addEventListener("change",refresh);refresh();
}
fillTeamSelects();
const world=createScene(),controls=new Controls(),ball=new BallPhysics(world.ball),clock=new THREE.Clock();
const home=world.players.filter(p=>p.team===0);
let active=3,charge=0,lastSwitch=0,shotPlayer=null,ballReleaseTimer=0;
const say=message=>{const n=$("#notice");n.textContent=message;clearTimeout(say.timer);say.timer=setTimeout(()=>n.textContent="",1400)};
const match=new Match(score=>{$("#homeScore").textContent=score.home;$("#awayScore").textContent=score.away;$("#clock").textContent=match.format()},say);
function select(player){if(!player)return;active=player.id;world.players.forEach(p=>p.ring.visible=p.id===active)}
const distance2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function nearestTeammate(){return home.filter(p=>p.role!=="GK").sort((a,b)=>distance2(a.mesh.position,ball.mesh.position)-distance2(b.mesh.position,ball.mesh.position))[0]}
function teamHasPossession(){return home.some(p=>distance2(p.mesh.position,ball.mesh.position)<2.25)}
function chooseReceiver(player,longPass,aim){
  const candidates=home.filter(p=>p!==player&&p.role!=="GK");if(!candidates.length)return null;
  const len=Math.hypot(aim.x,aim.z),ax=len>.15?aim.x/len:1,az=len>.15?aim.z/len:0;
  return candidates.sort((a,b)=>{
    const score=t=>{const dx=t.mesh.position.x-player.mesh.position.x,dz=t.mesh.position.z-player.mesh.position.z,d=Math.hypot(dx,dz)||1;
      const direction=(dx/d)*ax+(dz/d)*az,forward=dx*(longPass?1.15:.45),crowd=world.players.filter(q=>q.team===1).reduce((s,r)=>s+(distance2(r.mesh.position,t.mesh.position)<3.5?1.8:0),0);
      return d*(longPass?.34:.68)-direction*5-forward*.12+crowd};
    return score(a)-score(b);
  })[0];
}
function pass(player,longPass,aim){
  const receiver=chooseReceiver(player,longPass,aim);if(!receiver)return;
  const dx=receiver.mesh.position.x-player.mesh.position.x,dz=receiver.mesh.position.z-player.mesh.position.z,len=Math.hypot(dx,dz)||1;
  const direction={x:dx/len,z:dz/len},power=longPass?THREE.MathUtils.clamp(12+len*.22,14,23):THREE.MathUtils.clamp(7.5+len*.22,8.5,15);
  ball.reset(player.mesh.position.x+direction.x*1.8,player.mesh.position.z+direction.z*1.8);ball.kick(direction,power,longPass?3.2:.35,player.id);ballReleaseTimer=longPass?0.9:0.7;select(receiver);say(longPass?"LANÇAMENTO!":"PASSE!");
}
function shoot(player,power,aim){
  const goal={x:50-player.mesh.position.x,z:-player.mesh.position.z},aimLen=Math.hypot(aim.x,aim.z);
  if(aimLen>.2){goal.z+=(aim.z/aimLen)*8;goal.x+=(aim.x/aimLen)*2.5}
  const len=Math.hypot(goal.x,goal.z)||1,dir={x:goal.x/len,z:goal.z/len};
  ball.reset(player.mesh.position.x+dir.x*1.8,player.mesh.position.z+dir.z*1.8);
  ball.kick(dir,power,1.8+power*.075,player.id);
  ballReleaseTimer=0.85;
  say(power>20?"CHUTE POTENTE!":"CHUTE!");
}
function movePlayer(player,dt,input,controlled){
  if(controlled){
    const moving=Math.hypot(input.x,input.z)>.08,sprinting=input.sprint&&player.stamina>1&&moving,speed=sprinting?10.2:6.4;
    player.stamina=THREE.MathUtils.clamp(player.stamina+(sprinting?-25:15)*dt,0,100);
    const response=1-Math.exp(-12*dt);player.velocity.x+=(input.x*speed-player.velocity.x)*response;player.velocity.z+=(input.z*speed-player.velocity.z)*response;
  }
  const p=player.mesh.position;p.x=THREE.MathUtils.clamp(p.x+player.velocity.x*dt,-48,48);p.z=THREE.MathUtils.clamp(p.z+player.velocity.z*dt,-30,30);
  const speed=Math.hypot(player.velocity.x,player.velocity.z);
  if(speed>.25)player.mesh.rotation.y=Math.atan2(player.velocity.x,player.velocity.z);
  if(!controlled){player.velocity.x*=Math.exp(-1.5*dt);player.velocity.z*=Math.exp(-1.5*dt)}
  // Animação de corrida
  player.phase+=speed*dt*1.8;
  player.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(player.phase+(i*Math.PI))*Math.min(.62,speed*.075)});
}
function controlBall(player,input,dt){
  let fx=input.x,fz=input.z,len=Math.hypot(fx,fz);
  if(len<.12){fx=player.velocity.x;fz=player.velocity.z;len=Math.hypot(fx,fz)}
  if(len<.12){fx=player.team===0?1:-1;fz=0;len=1}
  fx/=len;fz/=len;
  const tx=player.mesh.position.x+fx*.95,tz=player.mesh.position.z+fz*.95,blend=1-Math.exp(-13*dt);
  ball.mesh.position.x+=(tx-ball.mesh.position.x)*blend;ball.mesh.position.z+=(tz-ball.mesh.position.z)*blend;ball.mesh.position.y=.43;
  ball.v.x=player.velocity.x*.78;ball.v.z=player.velocity.z*.78;
  if(input.pass)pass(player,false,input);if(input.through)pass(player,true,input);
}
function resetKickoff(){
  world.players.forEach(p=>{p.mesh.position.set(p.home.x,0,p.home.z);p.velocity={x:0,z:0};p.stamina=100});
  const kickoff=home[3];kickoff.mesh.position.set(-2.1,0,0);kickoff.velocity={x:0,z:0};
  ball.reset();select(kickoff);
}
function loop(){
  requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.033);
  if(!match.running){world.render();return}
  match.update(dt);
  if(match.paused){world.render();return}
  ballReleaseTimer=Math.max(0,ballReleaseTimer-dt);const input=controls.read();let controlled=world.players[active];
  if(input.switch&&performance.now()-lastSwitch>220){select(nearestTeammate());lastSwitch=performance.now();controlled=world.players[active]}
  const possession=teamHasPossession();
  if(!possession){const closest=nearestTeammate();if(closest&&distance2(closest.mesh.position,ball.mesh.position)+1.25<distance2(controlled.mesh.position,ball.mesh.position)){select(closest);controlled=world.players[active]}}
  updateAI(world.players,ball.mesh.position,dt,active,possession);updateGoalkeepers(world.players,ball.mesh.position,dt);
  for(const p of world.players)movePlayer(p,dt,input,p.id===active);
  let ballDistance=distance2(controlled.mesh.position,ball.mesh.position);
  const hasBall=ballReleaseTimer<=0&&ballDistance<2.65&&ball.mesh.position.y<1.65;
  if(hasBall&&!input.shoot&&!input.shootTap)controlBall(controlled,input,dt);
  // Entradas de toque são armazenadas pelos eventos: um toque rápido não se perde entre frames.
  if((input.shoot||input.shootTap)&&hasBall){
    if(charge===0)shotPlayer=controlled;
    if(shotPlayer===controlled)charge=Math.min(100,charge+(input.shoot?82*dt:18));
  }
  if(input.shootReleased&&charge>0&&shotPlayer){
    shoot(shotPlayer,THREE.MathUtils.clamp(14+charge*.32,14,46),input);
    charge=0;shotPlayer=null;
  } else if(input.shootTap&&!input.shoot&&hasBall){
    shoot(controlled,14,input);
    charge=0;shotPlayer=null;
  }
  ball.update(dt,world.players,team=>{
    match.goal(team);ball.reset();
    resetKickoff();
  });
  $("#power").style.width=charge+"%";
  $("#powerValue").textContent=Math.round(charge)+"%";
  $("#stamina").style.width=controlled.stamina+"%";
  world.follow(ball.mesh.position,dt);world.render();
}
$("#play").onclick=()=>{
  const homeTeam=teamById($("#homeTeam").value),awayTeam=teamById($("#awayTeam").value);
  world.setTeamColors(homeTeam,awayTeam);
  $("#hud").children[0].innerHTML=crest(homeTeam)+' <strong id="homeScore">0</strong>';
  $("#hud").children[2].innerHTML='<strong id="awayScore">0</strong> '+crest(awayTeam);
  match.start();charge=0;shotPlayer=null;ballReleaseTimer=0;resetKickoff();$("#start").style.display="none";say(homeTeam.name+" x "+awayTeam.name);
};
addEventListener("resize",()=>world.resize());world.resize();loop();