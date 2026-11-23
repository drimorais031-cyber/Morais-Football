import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
(() => {
const $=id=>document.getElementById(id), viewport=$('viewport');
let scene,camera,renderer,clock3,players=[],ball,active=null,raf=0,running=false,paused=false,seconds=0,score=[0,0],move={x:0,z:0},sprint=false,keys={},last=0,goalPause=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),FIELD_X=48,FIELD_Z=30;
const formations=[[-21,0],[-14,-10],[-14,-3],[-14,4],[-14,10],[-6,-11],[-6,-4],[-6,4],[-6,11],[1,-5],[1,5]];
function mat(color,roughness=.8){return new THREE.MeshStandardMaterial({color,roughness})}
function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);scene.add(o);return o}
function line(points,color=0xffffff){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p[0],.035,p[1])));scene.add(new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9})))}
function makePlayer(team,index,x,z){
 const group=new THREE.Group(),shirt=mat(team===0?0xb8e83f:0xf0f2ee),shorts=mat(team===0?0x17251b:0x252b31),skin=mat(0xd7a47b),boots=mat(0x101010);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.62,4,8),shirt);body.position.y=1.05;group.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),skin);head.position.y=1.82;group.add(head);
 const legGeo=new THREE.CapsuleGeometry(.13,.48,3,6);
 for(const side of [-1,1]){const leg=new THREE.Mesh(legGeo,shorts);leg.position.set(side*.19,.42,0);group.add(leg);const foot=new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.38),boots);foot.position.set(side*.19,.12,-.12);group.add(foot)}
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.045,6,24),mat(0xffffff));ring.rotation.x=Math.PI/2;ring.position.y=.04;ring.visible=false;group.add(ring);
 group.position.set(x,0,z);scene.add(group);
 return {group,ring,team,index,x,z,vx:0,vz:0,homeX:x,homeZ:z,speed:index===0?6.2:7.2};
}
function buildPitch(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9fc4d5);scene.fog=new THREE.Fog(0x9fc4d5,55,105);
 camera=new THREE.PerspectiveCamera(48,1,.1,180);camera.position.set(0,31,39);camera.lookAt(0,0,0);
 renderer=new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;viewport.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xe8f4ff,0x31502b,2.0));
 const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-12,28,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 const grass=mat(0x176b37);box(FIELD_X,.3,FIELD_Z,grass,0,-.2,0);
 for(let i=0;i<12;i++)box(FIELD_X/12,.012,FIELD_Z,mat(i%2?0x1b743d:0x1d7b41),-FIELD_X/2+FIELD_X/24+i*FIELD_X/12,-.035,0);
 const white=0xe8f2df;
 line([[-FIELD_X/2, -FIELD_Z/2],[FIELD_X/2,-FIELD_Z/2],[FIELD_X/2,FIELD_Z/2],[-FIELD_X/2,FIELD_Z/2],[-FIELD_X/2,-FIELD_Z/2]],white);
 line([[0,-FIELD_Z/2],[0,FIELD_Z/2]],white);
 const circle=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;circle.push([Math.cos(a)*4.5,Math.sin(a)*4.5])}line(circle,white);
 box(6,.02,0.08,mat(white),0,.02,0);
 for(const side of [-1,1]){
  const x=side*FIELD_X/2;
  line([[x,-9],[x-side*5,-9],[x-side*5,9],[x,9]],white);
  line([[x,-4],[x-side*2,-4],[x-side*2,4],[x,4]],white);
  const goal=box(.25,2.4,7,mat(0xffffff),x+side*.9,1.15,0);goal.material.transparent=true;goal.material.opacity=.7;
  for(let z=-3.5;z<=3.5;z+=1.75)box(1.8,.045,.035,mat(0xdce7ee),x+side*1.8,1.1,z);
  box(.04,2.2,7,mat(0xffffff),x+side*2.7,1.1,0);
 }
 // Low stands and floodlight pylons frame the pitch.
 for(const side of [-1,1]){
  box(FIELD_X,.8,3,mat(0x25343a),0,-.1,side*18);
  for(let i=0;i<18;i++){const seat=box(1.9,.35,1.1,mat(i%2?0x465b62:0x35494f),-22+i*2.6,.55,side*18);seat.position.y=.45}
  for(const x of [-20,20]){box(.25,12,.25,mat(0x697c80),x,5,side*18);box(3,.2,.6,mat(0xeaf6ff),x,11,side*18)}
 }
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),mat(0x405b3d));ground.rotation.x=-Math.PI/2;ground.position.y=-.4;scene.add(ground);
}
function setup(){
 players=[];for(let t=0;t<2;t++)formations.forEach((p,i)=>{const x=t===0?p[0]:-p[0],z=t===0?p[1]:-p[1];players.push(makePlayer(t,i,x,z))});
 active=players.find(p=>p.team===0&&p.index===9);active.ring.visible=true;
 const geo=new THREE.SphereGeometry(.34,20,16);ball=new THREE.Mesh(geo,mat(0xffffff,.35));ball.position.set(0,.36,0);ball.castShadow=true;scene.add(ball);
 const seam=new THREE.Mesh(new THREE.TorusGeometry(.23,.012,5,24),mat(0x202020));seam.rotation.x=Math.PI/2;ball.add(seam);
}
function nearest(team){return players.filter(p=>p.team===team&&p.index!==0).sort((a,b)=>Math.hypot(a.x-ball.position.x,a.z-ball.position.z)-Math.hypot(b.x-ball.position.x,b.z-ball.position.z))[0]}
function selectPlayer(){const p=nearest(0);if(active)active.ring.visible=false;active=p;if(active)active.ring.visible=true;$('status').textContent='Jogador selecionado'}
function kick(type){
 if(!running||paused||goalPause>0||!active)return;
 const d=Math.hypot(active.x-ball.position.x,active.z-ball.position.z);
 if(d>2.5){$('status').textContent='Aproxime-se da bola';return}
 let dx=active.team===0?1:-1,dz=0;
 if(type==='pass'){const mate=players.filter(p=>p.team===0&&p!==active&&p.index!==0).sort((a,b)=>Math.hypot(a.x-active.x,a.z-active.z)-Math.hypot(b.x-active.x,b.z-active.z))[0];if(mate){dx=mate.x-ball.position.x;dz=mate.z-ball.position.z}}
 const len=Math.hypot(dx,dz)||1;ball.userData.vx=dx/len*(type==='shoot'?19:12);ball.userData.vz=dz/len*(type==='shoot'?19:12);$('status').textContent=type==='shoot'?'CHUTE! ⚽':'Passe!';
}
function start(){
 if(!renderer)buildPitch();if(ball)scene.remove(ball);players.forEach(p=>scene.remove(p.group));score=[0,0];seconds=0;
 $('homeLabel').textContent=$('homeTeam').value.toUpperCase();$('awayLabel').textContent=$('awayTeam').value.toUpperCase();$('homeScore').textContent='0';$('awayScore').textContent='0';
 setup();$('menu').classList.add('hidden');$('game').classList.remove('hidden');$('loading').style.display='none';running=true;paused=false;$('status').textContent='Partida em andamento';$('pauseBtn').textContent='PAUSAR';last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);resize();
}
function resize(){if(!renderer)return;const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
function resetGoal(){players.forEach(p=>{p.x=p.homeX;p.z=p.homeZ;p.vx=p.vz=0;p.group.position.set(p.x,0,p.z)});ball.position.set(0,.36,0);ball.userData.vx=ball.userData.vz=0;goalPause=1.2}
function update(dt){
 seconds+=dt;if(seconds>=180){seconds=180;$('status').textContent='FIM DE JOGO';paused=true}
 $('clock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');
 if(goalPause>0){goalPause-=dt;return}
 const controlled=active;
 players.forEach(p=>{
  let tx=p.homeX,tz=p.homeZ;
  if(p===controlled){tx=p.x+move.x;tz=p.z+move.z}
  else if(p.index===0){tx=p.team===0?-22:22;tz=clamp(ball.position.z,-3.2,3.2);if(Math.abs(ball.position.x-tx)<8){tx=ball.position.x}}
  else{const ch=nearest(p.team);if(p===ch){tx=ball.position.x+(p.team===0?-1.1:1.1);tz=ball.position.z}else{tx=p.homeX+(ball.position.x)*(p.team===0?.12:-.12);tz=p.homeZ+ball.position.z*.1}}
  let dx=tx-p.x,dz=tz-p.z,len=Math.hypot(dx,dz);let speed=p.speed*(p===controlled?(sprint?1.45:1):p===nearest(p.team)?1:.72);
  if(len>0.08){p.vx+=(dx/len*speed-p.vx)*Math.min(1,dt*7);p.vz+=(dz/len*speed-p.vz)*Math.min(1,dt*7)}else{p.vx*=.8;p.vz*=.8}
  p.x=clamp(p.x+p.vx*dt,-23,23);p.z=clamp(p.z+p.vz*dt,-14,14);p.group.position.set(p.x,0,p.z);
  if(Math.abs(p.vx)+Math.abs(p.vz)>.2)p.group.rotation.y=Math.atan2(p.vx,p.vz);
 });
 // Keep player bodies from occupying the same point.
 for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>0&&d<.8){const push=(.8-d)*.5;a.x-=dx/d*push;a.z-=dz/d*push;b.x+=dx/d*push;b.z+=dz/d*push}}
 let vx=ball.userData.vx||0,vz=ball.userData.vz||0;
 if(Math.hypot(active.x-ball.position.x,active.z-ball.position.z)<1.05&&Math.hypot(vx,vz)<5){ball.position.x=active.x+(active.team===0? .8:-.8);ball.position.z=active.z*.98;vx=active.vx*.9;vz=active.vz*.9}
 ball.position.x+=vx*dt;ball.position.z+=vz*dt;const drag=Math.pow(.985,dt*60);vx*=drag;vz*=drag;ball.userData.vx=vx;ball.userData.vz=vz;ball.rotation.x+=vz*dt*2;ball.rotation.z-=vx*dt*2;
 if(Math.abs(ball.position.z)>14.5){ball.position.z=clamp(ball.position.z,-14.5,14.5);ball.userData.vz*=-.6}
 if(Math.abs(ball.position.x)>24){if(Math.abs(ball.position.z)<3.7){const side=ball.position.x>0?0:1;score[side]++;$(side===0?'homeScore':'awayScore').textContent=score[side];$('status').textContent='GOOOOL! ⚽';resetGoal()}else{ball.position.x=clamp(ball.position.x,-24,24);ball.userData.vx*=-.55}}
 ball.position.y=.36+Math.abs(Math.sin(performance.now()*.006))*Math.min(.2,Math.hypot(vx,vz)*.012);
 }
function loop(t){if(!running)return;const dt=Math.min((t-last)/1000,.04);last=t;if(!paused)update(dt);renderer.render(scene,camera);raf=requestAnimationFrame(loop)}
$('startBtn').addEventListener('click',start);$('passBtn').addEventListener('click',()=>kick('pass'));$('shootBtn').addEventListener('click',()=>kick('shoot'));$('switchBtn').addEventListener('click',selectPlayer);
$('pauseBtn').addEventListener('click',()=>{paused=!paused;$('pauseBtn').textContent=paused?'CONTINUAR':'PAUSAR';$('status').textContent=paused?'Partida pausada':'Partida em andamento'});
$('backBtn').addEventListener('click',()=>{running=false;cancelAnimationFrame(raf);$('game').classList.add('hidden');$('menu').classList.remove('hidden')});
document.querySelectorAll('[data-dir]').forEach(btn=>{const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[btn.dataset.dir];const on=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);move={x:v[0],z:v[1]}};const off=()=>move={x:0,z:0};btn.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture'].forEach(ev=>btn.addEventListener(ev,off))});
const sprintBtn=$('sprintBtn');sprintBtn.addEventListener('pointerdown',e=>{e.preventDefault();sprint=true});['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(ev=>sprintBtn.addEventListener(ev,()=>sprint=false));
window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='ArrowUp'||e.key==='w')move.z=-1;if(e.key==='ArrowDown'||e.key==='s')move.z=1;if(e.key==='ArrowLeft'||e.key==='a')move.x=-1;if(e.key==='ArrowRight'||e.key==='d')move.x=1;if(e.key===' ')kick('shoot');if(e.key.toLowerCase()==='x')kick('pass')});
window.addEventListener('keyup',e=>{keys[e.key]=false;if(['ArrowUp','w','ArrowDown','s'].includes(e.key))move.z=0;if(['ArrowLeft','a','ArrowRight','d'].includes(e.key))move.x=0});
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden)paused=true});
})();
