const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>a+(b-a)*t;
function steer(p,tx,tz,dt,speed=6.3){
 const dx=tx-p.mesh.position.x,dz=tz-p.mesh.position.z,d=Math.hypot(dx,dz);
 if(d<.18){p.velocity.x*=Math.exp(-5*dt);p.velocity.z*=Math.exp(-5*dt);return}
 const response=1-Math.exp(-5.5*dt),v=speed*Math.min(1,d/2.5);
 p.velocity.x+=(dx/d*v-p.velocity.x)*response;p.velocity.z+=(dz/d*v-p.velocity.z)*response;
}
export function updateAI(players,ball,dt,activeId,homeHasBall){
 const teams=[0,1];
 for(const team of teams){
  const own=team===0,dir=own?1:-1;
  const outfield=players.filter(p=>p.team===team&&p.role!=="GK");
  const opponents=players.filter(p=>p.team!==team&&p.role!=="GK");
  const nearest=[...outfield].sort((a,b)=>dist(a.mesh.position,ball)-dist(b.mesh.position,ball));
  const closest=nearest[0],second=nearest[1];
  const enemyHasBall=team===1?homeHasBall:!homeHasBall;
  for(const p of outfield){
   if(p.id===activeId)continue;
   const dBall=dist(p.mesh.position,ball),isPress=enemyHasBall&&p===closest;
   let tx=p.home.x,tz=p.home.z,speed=6.2;
   if(p===closest){
    tx=ball.x-dir*(enemyHasBall?1.15:1.8);tz=ball.z;
    speed=enemyHasBall?7.7:6.8;
    if(!enemyHasBall){tx=ball.x-dir*1.2;tz=ball.z;}
   }else if(p===second&&enemyHasBall){
    tx=ball.x-dir*5.5;tz=ball.z+(p.home.z<0?-4.5:4.5);speed=6.4;
   }else if(!enemyHasBall){
    // Quando ataca, abre linhas de passe e ataca o espaço à frente da bola.
    const lane=p.home.z===0?Math.sign(p.mesh.position.z||1):Math.sign(p.home.z);
    tx=clamp(Math.max(p.home.x,ball.x+dir*7),-43,43);
    tz=clamp(p.home.z*.62+lane*2,-25,25);
    const marked=opponents.some(o=>dist(o.mesh.position,p.mesh.position)<4.5);
    if(marked)tz=clamp(tz+(tz>=0?-5:5),-25,25);
    speed=5.9;
   }else{
    // Bloco defensivo compacto, protegendo o corredor central e a área.
    const retreat=clamp(ball.x-dir*8,-39,39);
    tx=lerp(p.home.x,retreat,.58);
    tz=clamp(p.home.z*.72+ball.z*.18,-24,24);
    if(Math.abs(ball.z)<9)tz=lerp(tz,p.home.z*.55,.35);
   }
   // Reação extra quando a bola entra no último terço.
   if(team===1&&ball.x>27){tx=Math.max(tx,ball.x-2);tz=lerp(tz,ball.z,.28);speed=Math.max(speed,7.1)}
   steer(p,clamp(tx,-46,46),clamp(tz,-29,29),dt,speed);
  }
 }
}
export function updateGoalkeepers(players,ball,dt){
 for(const p of players.filter(q=>q.role==="GK")){
  const homeX=p.team===0?-48:48;
  p.mesh.position.x+=(homeX-p.mesh.position.x)*Math.min(1,dt*3.8);
  const threat=p.team===0?ball.x<0:ball.x>0;
  const targetZ=clamp(ball.z*(threat?.72:.28),-6.2,6.2);
  p.mesh.position.z+=(targetZ-p.mesh.position.z)*Math.min(1,dt*(threat?5.5:3.2));
  const dx=ball.x-p.mesh.position.x,dz=ball.z-p.mesh.position.z;
  if(Math.abs(dx)<5.5&&Math.abs(dz)<5.2&&ball.y<3.2){
   p.mesh.position.z+=Math.sign(dz||1)*Math.min(1.35,dt*10);
   p.mesh.position.x+=Math.sign(dx||1)*Math.min(.8,dt*5);
  }
 }
}