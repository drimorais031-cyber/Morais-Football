(async () => {
let THREE;
try {
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');
  } catch (firstError) {
    THREE = await import('https://unpkg.com/three@0.161.0/build/three.module.js');
  }
} catch (loadError) {
  console.error('Falha ao carregar o motor 3D:', loadError);
  const viewport = document.getElementById('viewport');
  const menu = document.getElementById('menu');
  const message = document.createElement('div');
  message.style.cssText = 'padding:24px;color:#fff;background:#391b1b;border:1px solid #b84b4b;border-radius:12px;margin:12px;font:14px/1.5 Arial;text-align:center';
  message.innerHTML = '<strong>Não foi possível carregar o motor 3D.</strong><br>Verifique sua internet e tente atualizar a página. Se continuar, envie uma captura desta tela.';
  if (menu) menu.insertAdjacentElement('afterend', message);
  if (viewport) viewport.innerHTML = '<div style="padding:24px;color:white;text-align:center">Falha ao carregar o jogo 3D. Verifique a conexão e atualize a página.</div>';
  return;
}
const $=id=>document.getElementById(id), viewport=$('viewport');
let scene,camera,renderer,clock3,players=[],ball,active=null,raf=0,running=false,paused=false,seconds=0,score=[0,0],move={x:0,z:0},sprint=false,slideTimer=0,keys={},last=0,goalPause=0,possessionTeam=null,possessionCandidate=null,possessionCandidateTime=0,lastKick=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),FIELD_X=48,FIELD_Z=30;
const formations=[[-21,0],[-14,-10],[-14,-3],[-14,4],[-14,10],[-6,-11],[-6,-4],[-6,4],[-6,11],[1,-5],[1,5]];
function mat(color,roughness=.8){return new THREE.MeshStandardMaterial({color,roughness})}
function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);scene.add(o);return o}
function line(points,color=0xffffff){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p[0],.035,p[1])));scene.add(new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9})))}
function kit(name){
 const kits={
  'Morais FC':[0xb8e83f,0x17251b],'Brasil':[0xf2d52e,0x176b37],
  'São Paulo':[0xf2f2f2,0x252525],'Palmeiras':[0x087b42,0xf2f2f2],
  'Santos':[0xf5f5f5,0x252525],'Flamengo':[0xd51e2b,0x171717],
  'Corinthians':[0xf4f4f4,0x202020],'Argentina':[0x8bc8e8,0xf4f4f4],
  'Rivais FC':[0x315cdb,0xf1f1f1]
 };
 return kits[name]||kits['Morais FC'];
}
function makePlayer(team,index,x,z){
 const group=new THREE.Group(),colors=kit(team===0?$('homeTeam').value:$('awayTeam').value),shirt=mat(colors[0]),shorts=mat(colors[1]),skin=mat(0xd7a47b),boots=mat(0x101010);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.48,4,8),shirt);body.position.y=.98;group.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),skin);head.position.y=1.72;group.add(head);
 const legGeo=new THREE.CapsuleGeometry(.12,.36,3,6),legs=[];
 for(const side of [-1,1]){const leg=new THREE.Mesh(legGeo,shorts);leg.position.set(side*.17,.34,0);group.add(leg);legs.push(leg);const foot=new THREE.Mesh(new THREE.BoxGeometry(.19,.11,.32),boots);foot.position.set(side*.17,.1,-.12);group.add(foot)}
 const armGeo=new THREE.CapsuleGeometry(.11,.38,3,6),arms=[];
 for(const side of [-1,1]){const arm=new THREE.Mesh(armGeo,shirt);arm.position.set(side*.39,1.12,0);arm.rotation.z=side*.12;group.add(arm);arms.push(arm)}
 const neck=new THREE.Mesh(new THREE.CylinderGeometry(.105,.12,.16,8),skin);neck.position.y=1.68;group.add(neck);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.34,16,10,0,Math.PI*2,0,Math.PI*.48),mat(0x292522));hair.position.y=1.82;group.add(hair);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.045,6,24),mat(0xffffff));ring.rotation.x=Math.PI/2;ring.position.y=.04;ring.visible=false;group.add(ring);
 group.position.set(x,0,z);scene.add(group);
 return {group,ring,legs,arms,team,index,x,z,vx:0,vz:0,homeX:x,homeZ:z,speed:index===0?6.2:7.2};
}
function buildPitch(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9fc4d5);scene.fog=new THREE.Fog(0x9fc4d5,55,105);
 camera=new THREE.PerspectiveCamera(48,1,.1,180);camera.position.set(0,39,27);camera.lookAt(0,0,0);
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
  const postMat=mat(0xf4f7ee,.35),netMat=new THREE.LineBasicMaterial({color:0xe9f1e8,transparent:true,opacity:.58});
  const post=(z)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,2.45,12),postMat);m.position.set(x,1.22,z);scene.add(m);m.castShadow=true};
  post(-3.55);post(3.55);
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,7.1,12),postMat);bar.rotation.x=Math.PI/2;bar.position.set(x,2.43,0);scene.add(bar);bar.castShadow=true;
  const backX=x+side*2.5;
  const netPts=[];
  const addNet=(a,b)=>{netPts.push(new THREE.Vector3(a[0],a[1],a[2]),new THREE.Vector3(b[0],b[1],b[2]))};
  for(let z=-3.55;z<=3.56;z+=.7){addNet([x,0,z],[backX,0,z]);addNet([x,2.4,z],[backX,1.85,z]);addNet([backX,0,z],[backX,1.85,z])}
  for(let y=0;y<=2.41;y+=.48){addNet([x,y,-3.55],[backX,y*.78,-3.55]);addNet([x,y,3.55],[backX,y*.78,3.55]);addNet([backX,y*.78,-3.55],[backX,y*.78,3.55])}
  const netGeo=new THREE.BufferGeometry().setFromPoints(netPts);scene.add(new THREE.LineSegments(netGeo,netMat));
 }
 // Marcações de escanteio e pontos de pênalti.
 const spotMat=new THREE.MeshBasicMaterial({color:0xf4f7ee});
 for(const side of [-1,1]){
  const spot=new THREE.Mesh(new THREE.CircleGeometry(.13,16),spotMat);
  spot.rotation.x=-Math.PI/2;spot.position.set(side*17.1,.045,0);scene.add(spot);
  // Arco da área, construído como uma linha curta fora da grande área.
  const arc=[];for(let i=0;i<=28;i++){const a=(-Math.PI*.36)+(i/28)*(Math.PI*.72);arc.push([side*17.1+Math.cos(a)*4.5,Math.sin(a)*4.5])}line(arc,white);
  // Bandeiras nos quatro cantos: mastro, tecido triangular e base.
  for(const zSide of [-1,1]){
   const cx=side*23.55,cz=zSide*14.55;
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,1.75,8),mat(0xf3f5ef,.45));
   pole.position.set(cx,.88,cz);scene.add(pole);
   const flagGeo=new THREE.BufferGeometry();
   flagGeo.setAttribute('position',new THREE.Float32BufferAttribute([
    0,1.62,0, .72,1.43,0, 0,1.08,0
   ],3));
   flagGeo.setIndex([0,1,2]);flagGeo.computeVertexNormals();
   const flag=new THREE.Mesh(flagGeo,new THREE.MeshStandardMaterial({color:(side===1?0xffd21f:0xe83a45),side:THREE.DoubleSide,roughness:.7}));
   flag.position.set(cx,.0,cz);scene.add(flag);
   const base=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.08,10),mat(0xd7ddd4));
   base.position.set(cx,.04,cz);scene.add(base);
   // Pequeno quarto de círculo no gramado em cada escanteio.
   const corner=[];for(let i=0;i<=12;i++){const a=i/12*Math.PI/2;corner.push([cx-side*.5+Math.cos(a)*.5,cz-zSide*.5+Math.sin(a)*.5])}
   line(corner,white);
  }
 }
 // Redes dos gols com malha mais visível e estrutura reforçada.
 for(const side of [-1,1]){
  const gx=side*24,back=gx+side*2.5,netLines=[];
  for(let z=-3.5;z<=3.51;z+=.5){
   netLines.push([gx,0,z],[back,0,z],[gx,2.35,z],[back,1.9,z]);
  }
  for(let y=0;y<=2.36;y+=.35){
   const yy=y,backY=y*.81;
   netLines.push([gx,yy,-3.5],[back,backY,-3.5],[gx,yy,3.5],[back,backY,3.5]);
  }
  for(let z=-3.5;z<=3.51;z+=.5){
   netLines.push([back,0,z],[back,1.9,z]);
  }
  const points=[];for(let i=0;i<netLines.length;i++)points.push(new THREE.Vector3(netLines[i][0],netLines[i][1],netLines[i][2]));
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.72})));
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
 const ballCanvas=document.createElement('canvas');ballCanvas.width=1024;ballCanvas.height=512;
 const ctx=ballCanvas.getContext('2d');ctx.fillStyle='#f4f4ec';ctx.fillRect(0,0,1024,512);
 const pentagon=(cx,cy,r,rotation)=>{ctx.beginPath();for(let k=0;k<5;k++){const a=rotation+k*Math.PI*2/5;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.fill()};
 ctx.fillStyle='#171a18';
 for(let row=-1;row<4;row++)for(let col=-1;col<7;col++){const px=col*170+(row%2)*85,py=row*170+80;pentagon(px,py,43,(row+col)*.12)}
 ctx.strokeStyle='#b8b9b0';ctx.lineWidth=5;for(let y=0;y<=512;y+=85){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke()}
 const ballTexture=new THREE.CanvasTexture(ballCanvas);ballTexture.colorSpace=THREE.SRGBColorSpace;
 const geo=new THREE.SphereGeometry(.34,32,24);ball=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:ballTexture,roughness:.48,metalness:0}));ball.position.set(0,.36,0);ball.castShadow=true;scene.add(ball);
 const ballShadow=new THREE.Mesh(new THREE.CircleGeometry(.42,24),new THREE.MeshBasicMaterial({color:0x07110b,transparent:true,opacity:.38,depthWrite:false}));
 ballShadow.rotation.x=-Math.PI/2;ballShadow.position.y=.018;scene.add(ballShadow);ball.userData.shadow=ballShadow;
}
function nearest(team){return players.filter(p=>p.team===team&&p.index!==0).sort((a,b)=>Math.hypot(a.x-ball.position.x,a.z-ball.position.z)-Math.hypot(b.x-ball.position.x,b.z-ball.position.z))[0]}
function selectPlayer(){
 if(!running||paused||!ball||!players.length)return;
 // SWITCH escolhe sempre o atleta de linha mais próximo da bola.
 let closest=null,closestDistance=Infinity;
 for(const p of players){
  if(p.team!==0||p.index===0)continue;
  const distance=Math.hypot(p.x-ball.position.x,p.z-ball.position.z);
  if(distance<closestDistance){closest=p;closestDistance=distance}
 }
 if(!closest)return;
 if(active)active.ring.visible=false;
 active=closest;active.ring.visible=true;
 $('status').textContent='Controle: jogador mais próximo da bola';
}
function kick(type){
 if(!running||paused||goalPause>0||!active)return;
 const now=performance.now();if(now-lastKick<260)return;
 const d=Math.hypot(active.x-ball.position.x,active.z-ball.position.z);
 if(d>3.15){$('status').textContent='Chegue mais perto da bola para jogar';return}
 lastKick=now;
 // Pequena assistência de contato evita que o botão falhe quando a bola está junto ao pé.
 let dx=active.team===0?1:-1,dz=clamp(-ball.position.z*.12,-1.2,1.2),receiver=null;
 if(type==='pass'||type==='through'){
  const mates=players.filter(p=>p.team===0&&p!==active&&p.index!==0);
  receiver=mates.sort((a,b)=>{
   const score=p=>Math.hypot(p.x-active.x,p.z-active.z)-Math.max(0,(p.x-active.x))*(type==='through'?.95:.65);
   return score(a)-score(b);
  })[0];
  if(receiver){dx=receiver.x-ball.position.x+(type==='through'?4:0);dz=receiver.z-ball.position.z}
 }else{
  const keeper=players.find(p=>p.team===1&&p.index===0);
  const targetZ=clamp(ball.position.z*.12-(keeper?keeper.z*.12:0),-2.95,2.95);
  dz=targetZ-ball.position.z;
 }
 const len=Math.hypot(dx,dz)||1;
 const power=type==='shoot'?25:type==='through'?17.5:14.5;
 ball.position.x=active.x+Math.sin(active.group.rotation.y)*.78;
 ball.position.z=active.z+Math.cos(active.group.rotation.y)*.78;
 ball.position.y=.38;
 ball.userData.vx=dx/len*power;ball.userData.vz=dz/len*power;
 ball.userData.vy=type==='shoot'?4.1:type==='through'?1.35:.55;
 // Após passe ou lançamento, o controle muda para o companheiro escolhido para receber.
 if(receiver){
  if(active)active.ring.visible=false;
  active=receiver;active.ring.visible=true;
  $('status').textContent='PASSE! Controle mudou para o jogador que vai receber.';
 }else{
  $('status').textContent=type==='shoot'?'CHUTE DIRECIONADO! ⚽':'PASSE PARA FRENTE!';
 }
}
function slideTackle(){
 if(!running||paused||!active)return;
 const opponent=players.filter(p=>p.team===1&&p.index!==0).sort((a,b)=>Math.hypot(a.x-active.x,a.z-active.z)-Math.hypot(b.x-active.x,b.z-active.z))[0];
 if(!opponent)return;
 const dx=opponent.x-active.x,dz=opponent.z-active.z,d=Math.hypot(dx,dz)||1;
 slideTimer=.42;active.vx=dx/d*active.speed*2.1;active.vz=dz/d*active.speed*2.1;
 if(d<3.2){
  ball.userData.vx=dx/d*10;ball.userData.vz=dz/d*10;ball.userData.vy=.7;
  $('status').textContent='DESARME! BOA ROUBADA DE BOLA';
 }else $('status').textContent='CARRINHO! APROXIME-SE DO ADVERSÁRIO';
}
function start(){
 try {
 if(document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});
 if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});
 if(!renderer)buildPitch();if(ball?.userData.shadow)scene.remove(ball.userData.shadow);if(ball)scene.remove(ball);players.forEach(p=>scene.remove(p.group));score=[0,0];seconds=0;move={x:0,z:0};sprint=false;goalPause=0;
 $('homeLabel').textContent=$('homeTeam').value.toUpperCase();$('awayLabel').textContent=$('awayTeam').value.toUpperCase();$('homeScore').textContent='0';$('awayScore').textContent='0';
 setup();$('menu').classList.add('hidden');$('game').classList.remove('hidden');$('loading').style.display='none';running=true;paused=false;$('status').textContent='Partida em andamento';$('pauseBtn').textContent='PAUSAR';last=performance.now();cancelAnimationFrame(raf);resize();raf=requestAnimationFrame(loop);
 } catch(error) { console.error('Erro ao iniciar partida:',error); running=false; const msg=document.createElement('div');msg.style.cssText='padding:16px;margin:10px;color:#fff;background:#391b1b;border:1px solid #b84b4b;border-radius:10px;font:13px/1.5 Arial';msg.textContent='Não foi possível iniciar a partida 3D: '+error.message;$('loading').style.display='none';viewport.appendChild(msg); }
}
function resize(){if(!renderer)return;const rect=viewport.getBoundingClientRect(),w=Math.floor(rect.width),h=Math.floor(rect.height);if(!w||!h)return;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.domElement.style.width='100%';renderer.domElement.style.height='100%'}
function resetGoal(){players.forEach(p=>{p.x=p.homeX;p.z=p.homeZ;p.vx=p.vz=0;p.group.position.set(p.x,0,p.z)});ball.position.set(0,.36,0);ball.userData.vx=ball.userData.vz=ball.userData.vy=0;possessionTeam=null;possessionCandidate=null;possessionCandidateTime=0;goalPause=1.2}
function updatePossession(dt){
 // Considera posse apenas quando um atleta de linha está realmente perto da bola, baixa e sem grande velocidade.
 if(ball.position.y>1.15||Math.hypot(ball.userData.vx||0,ball.userData.vz||0)>8.5){possessionCandidate=null;possessionCandidateTime=0;return}
 let closest=null,closestDistance=1.15;
 for(const p of players){
  if(p.index===0)continue;
  const d=Math.hypot(p.x-ball.position.x,p.z-ball.position.z);
  if(d<closestDistance){closest=p;closestDistance=d}
 }
 if(!closest){possessionCandidate=null;possessionCandidateTime=0;return}
 if(possessionCandidate!==closest.team){possessionCandidate=closest.team;possessionCandidateTime=0}
 possessionCandidateTime+=dt;
 if(possessionCandidateTime<.18)return;
 const previousTeam=possessionTeam;
 possessionTeam=possessionCandidate;
 if(previousTeam===1&&possessionTeam===0){
  let receiver=null,nearestDistance=Infinity;
  for(const p of players){
   if(p.team!==0||p.index===0)continue;
   const d=Math.hypot(p.x-ball.position.x,p.z-ball.position.z);
   if(d<nearestDistance){receiver=p;nearestDistance=d}
  }
  if(receiver&&receiver!==active){if(active)active.ring.visible=false;active=receiver;active.ring.visible=true}
  $('status').textContent='BOLA RECUPERADA! Controle automático no jogador mais próximo. ⚽';
 }
}
function update(dt){
 seconds+=dt;if(seconds>=180){seconds=180;$('status').textContent='FIM DE JOGO';paused=true}
 $('clock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');
 if(goalPause>0){goalPause-=dt;return}
 if(slideTimer>0)slideTimer=Math.max(0,slideTimer-dt);
 const controlled=active;
 players.forEach(p=>{
  let tx=p.homeX,tz=p.homeZ;
  if(p===controlled){if(slideTimer>0){const rival=players.filter(q=>q.team===1&&q.index!==0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(rival){tx=rival.x;tz=rival.z}}else{tx=p.x+move.x*100;tz=p.z+move.z*100}}
  else if(p.index===0){
   const goalX=p.team===0?-22.2:22.2;
   const danger=p.team===0?ball.position.x< -12:ball.position.x>12;
   tx=danger?goalX+(ball.position.x-goalX)*.12:goalX;
   tz=clamp(ball.position.z,-3.0,3.0);
  }
  else{
   const ch=nearest(p.team);
   if(p===ch){
    tx=ball.position.x+(p.team===0?-0.9:0.9);tz=ball.position.z;
   }else{
    const attackDir=p.team===0?1:-1;
    tx=p.homeX+clamp((ball.position.x-p.homeX)*.22,-4,4);
    tz=p.homeZ+clamp((ball.position.z-p.homeZ)*.24,-3,3);
    if(Math.abs(ball.position.x-p.x)<7)tx+=attackDir*1.4;
   }
  }
  let dx=tx-p.x,dz=tz-p.z,len=Math.hypot(dx,dz);let speed=p===controlled?(slideTimer>0?11.5:(sprint?9.6:7.8)):p.speed*(p===nearest(p.team)?1:.72);
  if(len>0.08){const desiredX=dx/len*speed,desiredZ=dz/len*speed,blend=Math.min(1,dt*(p===controlled?13:7));p.vx+=(desiredX-p.vx)*blend;p.vz+=(desiredZ-p.vz)*blend}else{const drag=Math.max(0,1-dt*(p===controlled?12:9));p.vx*=drag;p.vz*=drag}
  p.x=clamp(p.x+p.vx*dt,-23,23);p.z=clamp(p.z+p.vz*dt,-14,14);p.group.position.set(p.x,0,p.z);
  const velocity=Math.hypot(p.vx,p.vz);
  if(p===controlled&&Math.hypot(move.x,move.z)>.08)p.group.rotation.y=Math.atan2(move.x,move.z);
  else if(velocity>.2)p.group.rotation.y=Math.atan2(p.vx,p.vz);
  const stride=Math.min(1,velocity/5),phase=performance.now()*.012+(p.index%2)*Math.PI;
  p.legs[0].rotation.x=Math.sin(phase)*.72*stride;
  p.legs[1].rotation.x=-Math.sin(phase)*.72*stride;
  p.arms[0].rotation.x=-Math.sin(phase)*.48*stride;
  p.arms[1].rotation.x=Math.sin(phase)*.48*stride;
 });
 // Keep player bodies from occupying the same point.
 for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>0&&d<.8){const push=(.8-d)*.5;a.x-=dx/d*push;a.z-=dz/d*push;b.x+=dx/d*push;b.z+=dz/d*push;a.group.position.set(a.x,0,a.z);b.group.position.set(b.x,0,b.z)}}
 let vx=ball.userData.vx||0,vz=ball.userData.vz||0,vy=ball.userData.vy||0;
 // Domínio assistido: a bola acompanha o pé do atleta quando ele chega perto.
 const controlDistance=Math.hypot(active.x-ball.position.x,active.z-ball.position.z);
 const ballSpeed=Math.hypot(vx,vz);
 const hasInput=Math.hypot(move.x,move.z)>.08;
 if(controlDistance<2.0&&ballSpeed<12.5&&ball.position.y<1.2){
  if(hasInput)active.group.rotation.y=Math.atan2(move.x,move.z);
  const facing=active.group.rotation.y;
  const targetX=active.x+Math.sin(facing)*(hasInput?.88:.7);
  const targetZ=active.z+Math.cos(facing)*(hasInput?.88:.7);
  const follow=Math.min(1,dt*(hasInput?22:17));
  ball.position.x+=(targetX-ball.position.x)*follow;
  ball.position.z+=(targetZ-ball.position.z)*follow;
  vx=active.vx*.98;vz=active.vz*.98;vy=0;
 }
 // Colisão física com os demais atletas. O jogador controlado não chuta a bola para longe ao dominá-la.
 for(const p of players){
  if(p===active&&controlDistance<2.0&&ballSpeed<12.5)continue;
  const dx=ball.position.x-p.x,dz=ball.position.z-p.z,dist=Math.hypot(dx,dz);
  if(dist>.001&&dist<.66&&ball.position.y<1.15){
   const nx=dx/dist,nz=dz/dist;
   ball.position.x=p.x+nx*.67;ball.position.z=p.z+nz*.67;
   const impact=Math.max(2.4,Math.hypot(p.vx,p.vz)*.75);
   vx=nx*impact+p.vx*.45;vz=nz*impact+p.vz*.45;vy=Math.max(vy,.65);
   if(p.team===1&&p===nearest(1)){$('status').textContent='O adversário disputou a bola';}
   if(p.index===0){vx=(p.team===0?1:-1)*Math.max(7,Math.abs(vx));vz+=p.vz*.5;$('status').textContent='DEFESA DO GOLEIRO! 🧤';}
  }
 }
 ball.position.x+=vx*dt;ball.position.z+=vz*dt;vy-=9.8*dt;ball.position.y+=vy*dt;
 ball.userData.shadow.position.set(ball.position.x,.018,ball.position.z);
 ball.userData.shadow.scale.setScalar(clamp(1-(ball.position.y-.36)*.22,.55,1));
 if(ball.position.y<.36){ball.position.y=.36;if(vy<-.9)vy=-vy*.24;else vy=0}
 const drag=Math.pow(ball.position.y>.37?.996:.986,dt*60);vx*=drag;vz*=drag;
 ball.userData.vx=vx;ball.userData.vz=vz;ball.userData.vy=vy;
 ball.rotation.x+=vz*dt*2;ball.rotation.z-=vx*dt*2;
 updatePossession(dt);
 if(Math.abs(ball.position.z)>14.5){ball.position.z=clamp(ball.position.z,-14.5,14.5);ball.userData.vz*=-.55}
 if(Math.abs(ball.position.x)>24){
  if(Math.abs(ball.position.z)<3.18&&ball.position.y<2.18&&ball.position.y>.12){
   const side=ball.position.x>0?0:1;score[side]++;$(side===0?'homeScore':'awayScore').textContent=score[side];$('status').textContent='GOOOOOOL! ⚽🥅';resetGoal();
  }else{ball.position.x=clamp(ball.position.x,-24,24);ball.userData.vx*=-.42;if(Math.abs(ball.position.z)>=3.18)$('status').textContent='A bola passou ao lado do gol';else $('status').textContent='A bola bateu no travessão';}
 }
 }
function loop(t){
 if(!running)return;
 const dt=Math.min((t-last)/1000,.04);last=t;
 if(!paused)update(dt);
 // Câmera acompanha a jogada para manter a ação no centro da tela.
 if(active&&ball){
  const tx=active.x*.42+ball.position.x*.58,tz=active.z*.42+ball.position.z*.58;
  const desired=new THREE.Vector3(tx,39,tz+27);
  camera.position.lerp(desired,Math.min(1,dt*1.8));
  camera.lookAt(tx,0,tz);
 }
 renderer.render(scene,camera);raf=requestAnimationFrame(loop)
}
$('startBtn').addEventListener('click',start);
// Ações no pointerdown: cada dedo é tratado como um ponteiro independente (multitoque).
function bindTouchAction(id,action){
 const button=$(id);
 button.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  button.classList.add('pressed');
  action();
 });
 const release=()=>button.classList.remove('pressed');
 ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>button.addEventListener(ev,release));
}
bindTouchAction('slideBtn',slideTackle);
bindTouchAction('passBtn',()=>kick('pass'));
bindTouchAction('shootBtn',()=>kick('shoot'));
bindTouchAction('throughBtn',()=>kick('through'));
bindTouchAction('switchBtn',selectPlayer);
$('pauseBtn').addEventListener('click',()=>{paused=!paused;$('pauseBtn').textContent=paused?'CONTINUAR':'PAUSAR';$('status').textContent=paused?'Partida pausada':'Partida em andamento'});
$('backBtn').addEventListener('click',()=>{running=false;cancelAnimationFrame(raf);$('game').classList.add('hidden');$('menu').classList.remove('hidden')});
const joystick=$('joystick'),stick=$('stick');let stickPointer=null;
function updateStick(e){
 const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.31,len=Math.hypot(dx,dy);
 if(len>max){dx=dx/len*max;dy=dy/len*max}
 stick.style.transform='translate('+dx+'px,'+dy+'px)';
 const nx=dx/max,ny=dy/max,mag=Math.hypot(nx,ny),dead=.13;
 if(mag<dead){move={x:0,z:0};return}
 const strength=(mag-dead)/(1-dead),scale=strength/mag;
 move={x:nx*scale,z:ny*scale};
}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();stickPointer=e.pointerId;try{joystick.setPointerCapture(e.pointerId)}catch(_){}updateStick(e)});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();updateStick(e)}});
function releaseStick(e){if(e.pointerId!==stickPointer)return;stickPointer=null;move={x:0,z:0};stick.style.transform='translate(0,0)'}
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>joystick.addEventListener(ev,releaseStick));
// O sprint só desliga quando o toque é solto ou cancelado, não ao sair da borda do botão.
const sprintBtn=$('sprintBtn');let sprintPointer=null;
sprintBtn.addEventListener('pointerdown',e=>{e.preventDefault();sprintPointer=e.pointerId;sprint=true;try{sprintBtn.setPointerCapture(e.pointerId)}catch(_){}sprintBtn.classList.add('pressed')});
function releaseSprint(e){if(sprintPointer!==null&&e.pointerId!==sprintPointer)return;sprintPointer=null;sprint=false;sprintBtn.classList.remove('pressed')}
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>sprintBtn.addEventListener(ev,releaseSprint));
window.addEventListener('blur',()=>{sprint=false;sprintPointer=null;move={x:0,z:0};stick.style.transform='translate(0,0)';sprintBtn.classList.remove('pressed')});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sprint=false;sprintPointer=null;move={x:0,z:0};sprintBtn.classList.remove('pressed')}});
window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='ArrowUp'||e.key==='w')move.z=-1;if(e.key==='ArrowDown'||e.key==='s')move.z=1;if(e.key==='ArrowLeft'||e.key==='a')move.x=-1;if(e.key==='ArrowRight'||e.key==='d')move.x=1;if(e.key===' ')kick('shoot');if(e.key.toLowerCase()==='x')kick('pass')});
window.addEventListener('keyup',e=>{keys[e.key]=false;if(['ArrowUp','w','ArrowDown','s'].includes(e.key))move.z=0;if(['ArrowLeft','a','ArrowRight','d'].includes(e.key))move.x=0});
window.addEventListener('resize',()=>{requestAnimationFrame(resize)});window.addEventListener('orientationchange',()=>{setTimeout(()=>{resize();if(running&&renderer){renderer.domElement.style.display='block';}},180)});if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(resize));document.addEventListener('visibilitychange',()=>{if(document.hidden)paused=true});
})();
