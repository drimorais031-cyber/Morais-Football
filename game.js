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
let scene,camera,renderer,clock3,players=[],ball,active=null,raf=0,running=false,paused=false,seconds=0,score=[0,0],move={x:0,z:0},sprint=false,slideTimer=0,keys={},last=0,goalPause=0,possessionTeam=null,possessionCandidate=null,possessionCandidateTime=0,lastKick=0,aiDecisionTimer=0,aiCarrier=null;
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
 camera=new THREE.PerspectiveCamera(48,1,.1,180);camera.position.set(0,32,22);camera.lookAt(0,0,0);
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
 // Estádio completo ao redor do gramado: arquibancadas em quatro lados,
 // setores em níveis, público simplificado, cobertura e refletores.
 const concrete=mat(0x68747b),darkConcrete=mat(0x35434b),seatRed=mat(0xc62836),seatBlue=mat(0x2456a6),seatYellow=mat(0xe0b52d),seatWhite=mat(0xdce4e7);
 // Laterais: três níveis de arquibancada com degraus e setores coloridos.
 for(const side of [-1,1]){
  for(let tier=0;tier<3;tier++){
   const z=side*(18.2+tier*2.45),y=.45+tier*1.18;
   box(50,.75,2.7,concrete,0,y-.35,z);
   box(49,.16,.22,darkConcrete,0,y+.18,z-side*.92);
   for(let i=0;i<34;i++){
    const x=-23.8+i*1.45;
    const colors=[seatRed,seatBlue,seatYellow,seatWhite];
    box(1.12,.42,.72,colors[(i+tier*3+(side===1?0:2))%4],x,y+.38,z-side*.28);
   }
  }
  // Cobertura suspensa e treliças externas.
  box(51,.42,4.2,mat(0x263943),0,5.35,side*26.1);
  box(50,.12,3.7,mat(0x91a6ad),0,5.58,side*26.1);
  for(const x of [-23,-12,0,12,23]){
   box(.32,5.1,.32,darkConcrete,x,2.8,side*27.2);
   box(.42,.25,3.5,mat(0x71858d),x,5.05,side*25.7);
  }
 }
 // Fundos atrás dos gols, fechando o estádio como uma arena contínua.
 for(const side of [-1,1]){
  for(let tier=0;tier<3;tier++){
   const x=side*(25.8+tier*2.35),y=.42+tier*1.15;
   box(2.7,.72,34,concrete,x,y-.32,0);
   box(.18,.14,33,darkConcrete,x-side*.92,y+.18,0);
   for(let i=0;i<23;i++){
    const z=-15.2+i*1.38;
    const colors=[seatBlue,seatRed,seatWhite,seatYellow];
    box(.72,.4,1.05,colors[(i+tier+(side===1?1:0))%4],x-side*.28,y+.36,z);
   }
  }
  box(4.1,.4,35,mat(0x263943),side*32.2,5.25,0);
  box(3.6,.12,34,mat(0x91a6ad),side*32.2,5.48,0);
  for(const z of [-14,-7,0,7,14])box(.32,5,.32,darkConcrete,side*30.2,2.7,z);
 }
 // Painéis de publicidade na borda do campo e placar principal.
 for(const side of [-1,1]){
  box(48,.65,.18,mat(side===1?0xd9b52d:0x1c4d86),0,.18,side*15.35);
 }
 box(.35,3.2,.35,darkConcrete,0,7,-30.4);
 box(9,.18,.45,mat(0x1a2934),0,8.6,-30.4);
 box(8.6,2.1,.12,mat(0x153c53),0,7.45,-30.15);
 // Refletores nas quatro extremidades da cobertura.
 for(const x of [-22,22])for(const z of [-25.5,25.5]){
  box(.28,7,.28,mat(0x71838a),x,3.5,z);
  box(2.8,.32,.65,mat(0xeaf6ff),x,7.1,z);
  for(let i=0;i<5;i++)box(.38,.2,.08,mat(0xffffff),x-1.05+i*.52,7.1,z-.36);
 }
 // Torcida nas arquibancadas: instâncias leves para manter bom desempenho no celular.
 const crowdBodyGeo=new THREE.SphereGeometry(.15,.0+8,7);
 const crowdHeadGeo=new THREE.SphereGeometry(.105,8,7);
 const crowdBodyMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});
 const crowdHeadMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9});
 const crowdPositions=[];
 // Pessoas sentadas nas três arquibancadas laterais.
 for(const side of [-1,1])for(let tier=0;tier<3;tier++){
  const z=side*(18.2+tier*2.45)-side*.28,y=.45+tier*1.18;
  for(let i=0;i<34;i++)crowdPositions.push({x:-23.8+i*1.45,z,y:y+.72,seed:i*7+tier*31+(side===1?0:17)});
 }
 // Pessoas também atrás dos gols.
 for(const side of [-1,1])for(let tier=0;tier<3;tier++){
  const x=side*(25.8+tier*2.35)-side*.28,y=.42+tier*1.15;
  for(let i=0;i<23;i++)crowdPositions.push({x,z:-15.2+i*1.38,y:y+.7,seed:i*11+tier*29+(side===1?13:3)});
 }
 const crowdBodies=new THREE.InstancedMesh(crowdBodyGeo,crowdBodyMat,crowdPositions.length);
 const crowdHeads=new THREE.InstancedMesh(crowdHeadGeo,crowdHeadMat,crowdPositions.length);
 const dummy=new THREE.Object3D(),shirtColors=[0xc8323c,0x2461a8,0xe0bd36,0xe8e8e2,0x27764a,0x242b34,0x7c4ba5,0xd87532];
 const skinColors=[0xf0c49c,0xd9a17c,0xb97854,0x8e6049];
 crowdPositions.forEach((p,i)=>{
  const sway=((p.seed*17)%9)*.018;
  dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,((p.seed%5)-2)*.035);dummy.scale.set(.85,1,.8);dummy.updateMatrix();crowdBodies.setMatrixAt(i,dummy.matrix);
  crowdBodies.setColorAt(i,new THREE.Color(shirtColors[p.seed%shirtColors.length]));
  dummy.position.set(p.x+sway,p.y+.27,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();crowdHeads.setMatrixAt(i,dummy.matrix);
  crowdHeads.setColorAt(i,new THREE.Color(skinColors[p.seed%skinColors.length]));
 });
 crowdBodies.instanceMatrix.needsUpdate=true;crowdHeads.instanceMatrix.needsUpdate=true;
 crowdBodies.castShadow=false;crowdHeads.castShadow=false;scene.add(crowdBodies,crowdHeads);
 // Bandeiras grandes dos clubes nos anéis superiores, com movimento suave de vento.
 scene.userData.stadiumFlags=[];
 const flagColors=[0xb8e83f,0xf2d52e,0xd51e2b,0x2456a6,0xf4f4f4];
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const x=-21+i*7,z=side*27.5,group=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,3.4,8),mat(0xcbd5d9,.45));pole.position.y=1.7;group.add(pole);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([0,3.15,0,1.65,2.72,0,0,2.25,0],3));
  geo.setIndex([0,1,2]);geo.computeVertexNormals();
  const cloth=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:flagColors[(i+(side===1?0:2))%flagColors.length],side:THREE.DoubleSide,roughness:.8}));
  group.add(cloth);group.position.set(x,5.65,z);scene.add(group);
  scene.userData.stadiumFlags.push({cloth,phase:i*.8+side});
 }
 // Iluminação de estádio: refletores fortes apontados para o gramado.
 for(const x of [-22,22])for(const z of [-25.5,25.5]){
  const lamp=new THREE.PointLight(0xeaf4ff,38,92,2);
  lamp.position.set(x,8.1,z);lamp.castShadow=false;scene.add(lamp);
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
 if(!running||paused||goalPause>0||!active||!ball)return;
 const now=performance.now();if(now-lastKick<220)return;
 // Se o jogador selecionado ficou longe, usa automaticamente o atleta mais próximo da bola.
 let carrier=active;
 let distance=Math.hypot(carrier.x-ball.position.x,carrier.z-ball.position.z);
 if(distance>3.6){
  const closest=players.filter(p=>p.team===0&&p.index!==0)
   .sort((a,b)=>Math.hypot(a.x-ball.position.x,a.z-ball.position.z)-Math.hypot(b.x-ball.position.x,b.z-ball.position.z))[0];
  if(closest){
   const d=Math.hypot(closest.x-ball.position.x,closest.z-ball.position.z);
   if(d<distance){if(active)active.ring.visible=false;active=carrier=closest;active.ring.visible=true;distance=d}
  }
 }
 if(distance>4.6){$('status').textContent='Aproxime o jogador da bola para executar';return}
 lastKick=now;
 const teammates=players.filter(p=>p.team===carrier.team&&p!==carrier&&p.index!==0);
 const attackDirection=carrier.team===0?1:-1;
 let receiver=null;
 if(type==='pass'&&teammates.length){
  receiver=teammates.reduce((best,p)=>!best||Math.hypot(p.x-carrier.x,p.z-carrier.z)<Math.hypot(best.x-carrier.x,best.z-carrier.z)?p:best,null);
 }else if(type==='through'&&teammates.length){
  receiver=teammates.reduce((best,p)=>{
   if(!best)return p;
   const progress=(p.x-carrier.x)*attackDirection,bestProgress=(best.x-carrier.x)*attackDirection;
   return progress>bestProgress?p:best;
  },null);
 }
 // Posiciona a bola no pé antes de calcular o vetor, evitando erro de direção.
 const facing=carrier.group.rotation.y;
 const launchX=carrier.x+Math.sin(facing)*.92;
 const launchZ=carrier.z+Math.cos(facing)*.92;
 ball.position.set(launchX,.4,launchZ);
 let dx=attackDirection,dz=0,power=15,vertical=.55;
 if(receiver){
  dx=receiver.x-launchX;dz=receiver.z-launchZ;
  const distanceToReceiver=Math.hypot(dx,dz);
  power=clamp(distanceToReceiver*1.18,type==='through'?17:13,type==='through'?23:19);
  if(type==='through'){dx+=attackDirection*2.0;vertical=1.15}
  if(active)active.ring.visible=false;
  active=receiver;active.ring.visible=true;
  $('status').textContent=type==='through'?'LANÇAMENTO! Controle passou ao companheiro mais avançado.':'PASSE! Controle passou ao companheiro mais próximo.';
 }else if(type==='shoot'){
  const goalX=carrier.team===0?24:-24;
  const keeper=players.find(p=>p.team!==carrier.team&&p.index===0);
  const targetZ=clamp((keeper?keeper.z:0)*.18,-2.65,2.65);
  dx=goalX-launchX;dz=targetZ-launchZ;power=26;vertical=4.0;
  $('status').textContent='CHUTE! ⚽';
 }
 const len=Math.hypot(dx,dz)||1;
 ball.userData.vx=dx/len*power+carrier.vx*.22;
 ball.userData.vz=dz/len*power+carrier.vz*.22;
 ball.userData.vy=vertical;
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
 // Leitura tática: identifica quem está mais perto da bola e quem deve pressionar/cobrir.
 const rankedByTeam=[0,1].map(team=>players
  .filter(p=>p.team===team&&p.index!==0)
  .map(p=>({p,d:Math.hypot(p.x-ball.position.x,p.z-ball.position.z)}))
  .sort((a,b)=>a.d-b.d));
 const firstChaser=rankedByTeam.map(list=>list[0]?.p||null);
 const secondChaser=rankedByTeam.map(list=>list[1]?.p||null);
 const ballVelocity=Math.hypot(ball.userData.vx||0,ball.userData.vz||0);
 let teamInPossession=possessionTeam;
 if(teamInPossession===null&&ball.position.y<1.1&&ballVelocity<7){
  const nearestOverall=rankedByTeam.map((list,team)=>({team,d:list[0]?.d??Infinity})).sort((a,b)=>a.d-b.d)[0];
  if(nearestOverall&&nearestOverall.d<2.35)teamInPossession=nearestOverall.team;
 }
 const ballX=ball.position.x,ballZ=ball.position.z;
 players.forEach(p=>{
  const attackDir=p.team===0?1:-1;
  const ownChaser=firstChaser[p.team],coverPlayer=secondChaser[p.team];
  let tx=p.homeX,tz=p.homeZ;
  if(p===controlled){
   if(slideTimer>0){
    const rival=players.filter(q=>q.team!==p.team&&q.index!==0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
    if(rival){tx=rival.x;tz=rival.z}
   }else{tx=p.x+move.x*100;tz=p.z+move.z*100}
  }else if(p.index===0){
   // Goleiro acompanha o ângulo da bola e sai um pouco quando há perigo real.
   const goalX=p.team===0?-22.2:22.2;
   const danger=p.team===0?ballX< -10:ballX>10;
   tx=danger?goalX+(ballX-goalX)*.16:goalX;
   tz=clamp(ballZ*.82,-3.25,3.25);
  }else if(teamInPossession===p.team){
   // Com a posse: um jogador oferece apoio curto; os demais atacam espaços e abrem o campo.
   if(p===ownChaser){
    const predictedX=ballX+clamp((ball.userData.vx||0)*.22,-2.5,2.5);
    const predictedZ=ballZ+clamp((ball.userData.vz||0)*.22,-2,2);
    tx=predictedX-attackDir*.55;tz=predictedZ;
   }else{
    const forwardProgress=(ballX-p.homeX)*attackDir;
    const isForward=p.index>=9;
    const isWide=p.index===1||p.index===4||p.index===5||p.index===8;
    const runAhead=(isForward?7.2:(isWide?4.2:2.6))+clamp(forwardProgress*.22,0,4.5);
    const lane=p.homeZ===0?(p.index%2? -4:4):p.homeZ;
    tx=p.homeX+attackDir*runAhead+attackDir*clamp((ballX-p.homeX)*.28,-2,7);
    tz=clamp(lane*.48+ballZ*.48+(isWide?Math.sign(lane)*1.8:0),-12.2,12.2);
    // Se o companheiro está livre na frente, acelera a ultrapassagem.
    if(isForward&&Math.abs(ballZ-p.z)>2.5)tz=clamp(tz+Math.sign(ballZ-p.z)*1.2,-12.5,12.5);
   }
  }else{
   // Sem a bola: pressão coordenada, cobertura e recomposição em bloco.
   if(p===ownChaser){
    tx=ballX+clamp((ball.userData.vx||0)*.18,-2.2,2.2);
    tz=ballZ+clamp((ball.userData.vz||0)*.18,-1.8,1.8);
   }else if(p===coverPlayer){
    const ownGoalX=p.team===0?-21:21;
    tx=ballX+(ownGoalX-ballX)*.28;
    tz=ballZ*.72;
   }else{
    const defensiveLine=p.index<=4?0:(p.index<=8?3.5:7.0);
    tx=p.homeX+attackDir*clamp((ballX-p.homeX)*.24,-5,5)-attackDir*defensiveLine*.22;
    tz=p.homeZ+clamp((ballZ-p.homeZ)*.30,-4.5,4.5);
    // O lado oposto fecha por dentro, evitando que todos persigam a bola.
    if(Math.abs(p.homeZ)>5&&Math.sign(p.homeZ)!==Math.sign(ballZ))tz*=.78;
   }
  }
  let dx=tx-p.x,dz=tz-p.z,len=Math.hypot(dx,dz);
  const isChasing=p===ownChaser&&p!==controlled;
  const baseSpeed=p===controlled?(slideTimer>0?11.8:(sprint?10.4:8.1)):(p.index===0?6.4:(isChasing?8.8:(teamInPossession===p.team?8.0:7.7)));
  const speed=baseSpeed*(len>7?1.04:1);
  if(len>0.12){
   const desiredX=dx/len*speed,desiredZ=dz/len*speed;
   const acceleration=p===controlled?15:(isChasing?10.5:8.2);
   const blend=Math.min(1,dt*acceleration);
   p.vx+=(desiredX-p.vx)*blend;p.vz+=(desiredZ-p.vz)*blend;
  }else{
   const drag=Math.max(0,1-dt*(p===controlled?12:10));
   p.vx*=drag;p.vz*=drag;
  }
  p.x=clamp(p.x+p.vx*dt,-23,23);p.z=clamp(p.z+p.vz*dt,-14,14);p.group.position.set(p.x,0,p.z);
  const velocity=Math.hypot(p.vx,p.vz);
  if(p===controlled&&Math.hypot(move.x,move.z)>.08)p.group.rotation.y=Math.atan2(move.x,move.z);
  else if(velocity>.25)p.group.rotation.y=Math.atan2(p.vx,p.vz);
  // Passadas mais rápidas e amplas conforme a velocidade do atleta.
  const stride=Math.min(1,velocity/5.4),phase=performance.now()*(.0105+stride*.004)+(p.index%2)*Math.PI;
  p.legs[0].rotation.x=Math.sin(phase)*(.58+stride*.22)*stride;
  p.legs[1].rotation.x=-Math.sin(phase)*(.58+stride*.22)*stride;
  p.arms[0].rotation.x=-Math.sin(phase)*.52*stride;
  p.arms[1].rotation.x=Math.sin(phase)*.52*stride;
 });
 // Keep player bodies from occupying the same point.
 for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>0&&d<.8){const push=(.8-d)*.5;a.x-=dx/d*push;a.z-=dz/d*push;b.x+=dx/d*push;b.z+=dz/d*push;a.group.position.set(a.x,0,a.z);b.group.position.set(b.x,0,b.z)}}
 let vx=ball.userData.vx||0,vz=ball.userData.vz||0,vy=ball.userData.vy||0;
 // Inteligência da equipe adversária: conduz, procura companheiro e finaliza quando chega perto da área.
 const rivalCarrier=firstChaser[1];
 const rivalDistance=rivalCarrier?Math.hypot(rivalCarrier.x-ball.position.x,rivalCarrier.z-ball.position.z):Infinity;
 if(teamInPossession===1&&rivalCarrier&&rivalDistance<1.45&&ball.position.y<1.15&&Math.hypot(vx,vz)<7.2){
  if(aiCarrier!==rivalCarrier){aiCarrier=rivalCarrier;aiDecisionTimer=0}
  aiDecisionTimer+=dt;
  const rivalFacing=Math.PI; // Equipe visitante ataca em direção ao gol de X negativo.
  ball.position.set(rivalCarrier.x+Math.sin(rivalFacing)*.82,.4,rivalCarrier.z);
  vx=rivalCarrier.vx*.52;vz=rivalCarrier.vz*.52;vy=0;
  const distanceToGoal=Math.hypot(-24-rivalCarrier.x,rivalCarrier.z);
  if(aiDecisionTimer>1.05){
   const options=players.filter(p=>p.team===1&&p!==rivalCarrier&&p.index!==0);
   const receiver=options.sort((a,b)=>{
    const score=p=>((rivalCarrier.x-p.x)*.9)-Math.abs(p.z-rivalCarrier.z)*.22+Math.min(5,Math.hypot(p.x-ball.position.x,p.z-ball.position.z)*.08);
    return score(b)-score(a);
   })[0];
   if(distanceToGoal<12.5){
    const targetZ=clamp((rivalCarrier.z*.22),-2.5,2.5),dx=-24-ball.position.x,dz=targetZ-ball.position.z,len=Math.hypot(dx,dz)||1;
    vx=dx/len*24+rivalCarrier.vx*.18;vz=dz/len*24+rivalCarrier.vz*.18;vy=3.5;
    $('status').textContent='FINALIZAÇÃO DO ADVERSÁRIO! 🥅';
   }else if(receiver){
    const dx=receiver.x-ball.position.x-1.3,dz=receiver.z-ball.position.z,len=Math.hypot(dx,dz)||1;
    const power=clamp(len*1.15,13,20);
    vx=dx/len*power+rivalCarrier.vx*.15;vz=dz/len*power+rivalCarrier.vz*.15;vy=.9;
    $('status').textContent='O adversário trabalhou a jogada e fez o passe.';
   }else{vx=-15;vz=0;vy=.8}
   ball.userData.vx=vx;ball.userData.vz=vz;ball.userData.vy=vy;
   possessionTeam=null;aiCarrier=null;aiDecisionTimer=0;
  }
 }else if(teamInPossession!==1||rivalDistance>2.2){aiCarrier=null;aiDecisionTimer=0}
 // Domínio assistido: a bola acompanha o pé do atleta quando ele chega perto. a bola acompanha o pé do atleta quando ele chega perto.
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
  const desired=new THREE.Vector3(tx,32,tz+22);
  camera.position.lerp(desired,Math.min(1,dt*1.8));
  camera.lookAt(tx,0,tz);
 }
 if(scene.userData.stadiumFlags){const wind=performance.now()*.001;scene.userData.stadiumFlags.forEach(f=>{f.cloth.rotation.y=Math.sin(wind*2.1+f.phase)*.16;f.cloth.rotation.z=Math.sin(wind*1.6+f.phase)*.07})}
 renderer.render(scene,camera);raf=requestAnimationFrame(loop)
}
$('startBtn').addEventListener('click',start);
// Entrada multitoque: nenhum controle captura o ponteiro do outro.
const actionPointers=new Map();
function bindTouchAction(id,action){
 const button=$(id);
 button.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  actionPointers.set(e.pointerId,button);
  button.classList.add('pressed');
  action();
 },{passive:false});
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
joystick.addEventListener('pointerdown',e=>{e.preventDefault();stickPointer=e.pointerId;updateStick(e)},{passive:false});
window.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();updateStick(e)}},{passive:false});
function releasePointer(e){
 const button=actionPointers.get(e.pointerId);
 if(button){button.classList.remove('pressed');actionPointers.delete(e.pointerId)}
 if(e.pointerId===stickPointer){stickPointer=null;move={x:0,z:0};stick.style.transform='translate(0,0)'}
 if(e.pointerId===sprintPointer){sprintPointer=null;sprint=false;sprintBtn.classList.remove('pressed')}
}
window.addEventListener('pointerup',releasePointer);
window.addEventListener('pointercancel',releasePointer);
// Sprint mantém seu próprio identificador de toque e não interfere no analógico nem nas ações.
const sprintBtn=$('sprintBtn');let sprintPointer=null;
sprintBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();sprintPointer=e.pointerId;sprint=true;sprintBtn.classList.add('pressed')},{passive:false});
window.addEventListener('blur',()=>{sprint=false;sprintPointer=null;stickPointer=null;actionPointers.forEach(b=>b.classList.remove('pressed'));actionPointers.clear();move={x:0,z:0};stick.style.transform='translate(0,0)';sprintBtn.classList.remove('pressed')});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sprint=false;sprintPointer=null;stickPointer=null;actionPointers.forEach(b=>b.classList.remove('pressed'));actionPointers.clear();move={x:0,z:0};sprintBtn.classList.remove('pressed')}});
window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='ArrowUp'||e.key==='w')move.z=-1;if(e.key==='ArrowDown'||e.key==='s')move.z=1;if(e.key==='ArrowLeft'||e.key==='a')move.x=-1;if(e.key==='ArrowRight'||e.key==='d')move.x=1;if(e.key===' ')kick('shoot');if(e.key.toLowerCase()==='x')kick('pass')});
window.addEventListener('keyup',e=>{keys[e.key]=false;if(['ArrowUp','w','ArrowDown','s'].includes(e.key))move.z=0;if(['ArrowLeft','a','ArrowRight','d'].includes(e.key))move.x=0});

/* Editor robusto: arrastar com um dedo e redimensionar com dois dedos. */
const controlSettings=$('controlSettings'),editControlsBtn=$('editControlsBtn'),resetControlsBtn=$('resetControlsBtn'),closeControlSettings=$('closeControlSettings'),openControlSettings=$('openControlSettings');
let controlsEditMode=false;
const movableControls=['joystick','passBtn','shootBtn','switchBtn','sprintBtn','slideBtn','throughBtn'];
function controlElements(){return movableControls.map(id=>$(id)).filter(Boolean)}
let selectedControlId='passBtn';
function getControlData(){let data={};try{data=JSON.parse(localStorage.getItem('moraisFootballControls')||'{}')}catch(e){}return data}
function saveControlPositions(){
 const data=getControlData();
 controlElements().forEach(el=>{
  const item=data[el.id]||{};
  if(el.dataset.customPosition==='1'){
   const left=parseFloat(el.style.left),top=parseFloat(el.style.top);
   if(Number.isFinite(left)&&Number.isFinite(top)){item.x=left/innerWidth;item.y=top/innerHeight}
  }
  const scale=Number(el.dataset.controlScale||1);
  if(scale!==1)item.scale=scale;else delete item.scale;
  if(Object.keys(item).length)data[el.id]=item;else delete data[el.id];
 });
 try{localStorage.setItem('moraisFootballControls',JSON.stringify(data))}catch(e){}
}
function applyControlPositions(){
 const data=getControlData();
 Object.entries(data).forEach(([id,p])=>{
  const el=$(id);if(!el)return;
  if(Number.isFinite(p.x)&&Number.isFinite(p.y)){
   el.style.position='fixed';el.style.left=(p.x*innerWidth)+'px';el.style.top=(p.y*innerHeight)+'px';
   el.style.right='auto';el.style.bottom='auto';el.style.margin='0';el.dataset.customPosition='1';
  }
  if(Number.isFinite(p.scale)){
   el.dataset.controlScale=String(clamp(p.scale,.5,2.2));el.style.setProperty('--control-scale',el.dataset.controlScale);
  }
 });
}
function resizeSelectedControl(delta){
 const el=$(selectedControlId);if(!el)return;
 const current=Number(el.dataset.controlScale||1),next=clamp(Math.round((current+delta)*10)/10,.5,2.2);
 el.dataset.controlScale=String(next);el.style.setProperty('--control-scale',String(next));
 $('selectedControlSize').textContent=Math.round(next*100)+'%';saveControlPositions();
}
function setControlsEditMode(enabled){
 controlsEditMode=enabled;$('game').classList.toggle('editing-controls',enabled);
 editControlsBtn.textContent=enabled?'CONCLUIR POSIÇÃO':'MOVER CONTROLES';
 $('controlHelp').textContent=enabled?'UM DEDO: arraste o controle. DOIS DEDOS SOBRE O MESMO CONTROLE: abra ou feche para mudar o tamanho.':'Ative MOVER CONTROLES para reposicionar e redimensionar os comandos.';
}
function openControlsSettings(){setControlsEditMode(false);controlSettings.classList.remove('hidden');openControlSettings.textContent='⚙ CONTROLES'}
openControlSettings.addEventListener('click',()=>{
 if(controlsEditMode){setControlsEditMode(false);saveControlPositions();openControlSettings.textContent='⚙ CONTROLES'}
 else openControlsSettings();
});
closeControlSettings.addEventListener('click',()=>{setControlsEditMode(false);controlSettings.classList.add('hidden');openControlSettings.textContent='⚙ CONTROLES'});
editControlsBtn.addEventListener('click',()=>{
 const enable=!controlsEditMode;setControlsEditMode(enable);
 if(enable){controlSettings.classList.add('hidden');openControlSettings.textContent='✓ CONCLUIR'}
 else{saveControlPositions();openControlSettings.textContent='⚙ CONTROLES'}
});
$('controlSizeSelect').addEventListener('change',e=>{
 selectedControlId=e.target.value;const el=$(selectedControlId);
 $('selectedControlSize').textContent=Math.round(Number(el?.dataset.controlScale||1)*100)+'%';
});
$('shrinkControlBtn').addEventListener('click',()=>resizeSelectedControl(-.1));
$('growControlBtn').addEventListener('click',()=>resizeSelectedControl(.1));
resetControlsBtn.addEventListener('click',()=>{
 try{localStorage.removeItem('moraisFootballControls')}catch(e){}
 controlElements().forEach(el=>{
  el.style.position='';el.style.left='';el.style.top='';el.style.right='';el.style.bottom='';el.style.margin='';
  el.style.removeProperty('--control-scale');delete el.dataset.customPosition;delete el.dataset.controlScale;
 });
 setControlsEditMode(false);$('selectedControlSize').textContent='100%';
});
/* Captura no window impede que os comandos do jogo sejam acionados durante a edição. */
const editorPointers=new Map();
let editorPinch=null,editorDrag=null,editorTarget=null;
function findEditableControl(target){return target instanceof Element?target.closest('#joystick,#passBtn,#shootBtn,#switchBtn,#sprintBtn,#slideBtn,#throughBtn'):null}
function editorPointerDown(e){
 if(!controlsEditMode)return;
 let el=findEditableControl(e.target);
 // Para pinça, o primeiro dedo fica no controle e o segundo pode tocar em qualquer ponto livre da tela.
 if(!el&&editorTarget&&editorPointers.size===1)el=editorTarget;
 if(!el)return;
 if(editorTarget&&editorPointers.size===1&&el!==editorTarget)el=editorTarget;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 if(editorTarget&&editorTarget!==el){editorPointers.clear();editorPinch=null;editorDrag=null}
 editorTarget=el;selectedControlId=el.id;
 const r=el.getBoundingClientRect(),scale=Number(el.dataset.controlScale||1);
 editorPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(editorPointers.size===1){
  editorDrag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};
  editorPinch=null;
 }else if(editorPointers.size===2){
  const pts=[...editorPointers.values()];
  editorPinch={distance:Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),scale};
  editorDrag=null;
 }
 $('controlSizeSelect').value=el.id;
 $('selectedControlSize').textContent=Math.round(scale*100)+'%';
}
function editorPointerMove(e){
 if(!controlsEditMode||!editorPointers.has(e.pointerId)||!editorTarget)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 editorPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(editorPointers.size>=2&&editorPinch){
  const pts=[...editorPointers.values()];
  const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
  const next=clamp(Math.round(editorPinch.scale*distance/editorPinch.distance*20)/20,.5,2.2);
  editorTarget.dataset.controlScale=String(next);
  editorTarget.style.setProperty('--control-scale',String(next));
  $('selectedControlSize').textContent=Math.round(next*100)+'%';
 }else if(editorDrag&&editorDrag.id===e.pointerId){
  const el=editorTarget,r=el.getBoundingClientRect();
  const extraX=(el.offsetWidth-r.width)/2,extraY=(el.offsetHeight-r.height)/2;
  const x=clamp(e.clientX-editorDrag.dx-extraX,0,innerWidth-el.offsetWidth);
  const y=clamp(e.clientY-editorDrag.dy-extraY,0,innerHeight-el.offsetHeight);
  el.style.position='fixed';el.style.left=x+'px';el.style.top=y+'px';
  el.style.right='auto';el.style.bottom='auto';el.style.margin='0';el.dataset.customPosition='1';
 }
}
function editorPointerUp(e){
 if(!editorPointers.has(e.pointerId))return;
 if(controlsEditMode){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
 editorPointers.delete(e.pointerId);
 if(editorPointers.size===1&&editorTarget){
  const [id,p]=[...editorPointers.entries()][0],r=editorTarget.getBoundingClientRect();
  editorDrag={id,dx:p.x-r.left,dy:p.y-r.top};editorPinch=null;
 }else if(editorPointers.size===0){
  saveControlPositions();editorDrag=null;editorPinch=null;editorTarget=null;
 }
}
window.addEventListener('pointerdown',editorPointerDown,true);
window.addEventListener('pointermove',editorPointerMove,true);
window.addEventListener('pointerup',editorPointerUp,true);
window.addEventListener('pointercancel',editorPointerUp,true);
window.addEventListener('resize',()=>{if(!controlsEditMode)applyControlPositions()});


window.addEventListener('resize',()=>{requestAnimationFrame(resize)});window.addEventListener('orientationchange',()=>{setTimeout(()=>{resize();if(running&&renderer){renderer.domElement.style.display='block';}},180)});if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(resize));document.addEventListener('visibilitychange',()=>{if(document.hidden)paused=true});
})();
