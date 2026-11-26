import * as THREE from "three";
import { FIELD } from "./physics.js";

const mat=(color,roughness=.82)=>new THREE.MeshStandardMaterial({color,roughness});
const addBox=(parent,w,h,d,color,x,y,z,roughness=.8)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,roughness));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
};
function line(scene,pts,color=0xffffff,opacity=1){
  const g=new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(...p)));
  const m=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));
  scene.add(m);return m;
}
function circlePoints(x,z,r,y=.055){
  const pts=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;pts.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);}return pts;
}
function createPitch(scene){
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(100,64),mat(0x267a38));
  grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;scene.add(grass);
  for(let i=0;i<16;i++){
    const stripe=new THREE.Mesh(new THREE.PlaneGeometry(6.25,64),new THREE.MeshBasicMaterial({color:i%2?0x2b843e:0x247235}));
    stripe.rotation.x=-Math.PI/2;stripe.position.set(-46.875+i*6.25,.012,0);scene.add(stripe);
  }
  const y=.055,L=50,W=32;
  line(scene,[[-L,y,-W],[L,y,-W],[L,y,W],[-L,y,W],[-L,y,-W]]);
  line(scene,[[0,y,-W],[0,y,W]]);
  line(scene,circlePoints(0,0,9.15,y));
  const spot=(x,z,r=.18)=>{const m=new THREE.Mesh(new THREE.CircleGeometry(r,20),new THREE.MeshBasicMaterial({color:0xffffff}));m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);scene.add(m);};
  spot(0,0);
  for(const side of [-1,1]){
    const x=side*50;
    line(scene,[[x,y,-20],[x-side*16.5,y,-20],[x-side*16.5,y,20],[x,y,20]]);
    line(scene,[[x,y,-9],[x-side*5.5,y,-9],[x-side*5.5,y,9],[x,y,9]]);
    line(scene,circlePoints(x-side*11,0,9.15,y).filter(p=>side===1?p[0]<x-16.5:p[0]>x+16.5));
    spot(x-side*11,0);
    spot(x-side*16.5,-20,.12);spot(x-side*16.5,20,.12);
    // Arco de escanteio
    for(const z of [-1,1])line(scene,Array.from({length:14},(_,i)=>{const a=i/13*Math.PI/2;return [x-side*.9*Math.sin(a),y,z*(32-.9*Math.cos(a))]}));
  }
}
function createGoal(scene,side){
  const x=side*50,back=x+side*3.1,white=mat(0xf5f5ed,.38);
  const postGeo=new THREE.CylinderGeometry(.19,.19,5.35,16);
  for(const z of [-7,7]){const p=new THREE.Mesh(postGeo,white);p.position.set(x,2.675,z);p.castShadow=true;scene.add(p);}
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,14.2,16),white);
  bar.rotation.x=Math.PI/2;bar.position.set(x,5.35,0);bar.castShadow=true;scene.add(bar);
  const netMat=new THREE.LineBasicMaterial({color:0xe9eee9,transparent:true,opacity:.48});
  const netGroup=new THREE.Group();
  // Laterais e fundo da rede
  for(const z of [-7,7])netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x,0,z),new THREE.Vector3(back,0,z),new THREE.Vector3(back,5.25,z),new THREE.Vector3(x,5.25,z)
  ]),netMat));
  for(let i=0;i<=14;i++){
    const z=-7+i;
    netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(back,0,z),new THREE.Vector3(back,5.25,z)
    ]),netMat));
  }
  for(let j=0;j<=10;j++){
    const yy=j*.525;
    netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(back,yy,-7),new THREE.Vector3(back,yy,7)
    ]),netMat));
    for(const z of [-7,7])netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x,yy,z),new THREE.Vector3(back,yy,z)
    ]),netMat));
  }
  for(let i=0;i<=6;i++){
    const z=-7+i*14/6;
    netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x,5.25,z),new THREE.Vector3(back,5.25,z)
    ]),netMat));
  }
  scene.add(netGroup);
  // Placa de base e suportes discretos
  for(const z of [-7,7])addBox(scene,3.2,.13,.13,0xd9dedb,x+side*1.5,.08,z);
}
function createStadium(scene){
  // Estádio retangular e compacto, inspirado na Vila Belmiro.
  // Arquibancadas próximas ao campo, quatro lados definidos e cobertura simples.
  const standMat=mat(0x263847,.9);
  const seatColors=[0x263f59,0x315f85,0xd7dce0,0x2c7658,0xb83d3d];
  // Laterais: arquibancadas em degraus acompanhando o comprimento do gramado.
  for(const side of [-1,1]){
    const z=side*41;
    addBox(scene,108,7,15,0x263847,0,4.0,z);
    for(let row=0;row<6;row++){
      const y=1.45+row*1.02;
      const depth=1.55;
      const seat=addBox(scene,103-row*.9,.42,depth,seatColors[row%seatColors.length],0,y,side*(34.8+row*1.75));
      seat.castShadow=false;
    }
    // Cobertura reta, com estrutura metálica aparente.
    addBox(scene,112,.85,17,0x172733,0,13.2,side*42.5);
    for(const x of [-49,-25,0,25,49]){
      const pillar=new THREE.Mesh(new THREE.BoxGeometry(.75,10,.85),mat(0x657786,.72));
      pillar.position.set(x,6.5,side*48.3);pillar.castShadow=true;scene.add(pillar);
    }
    addBox(scene,108,.28,.35,0xd6b23d,0,9.9,side*33.8);
  }
  // Fundos atrás dos gols: arquibancadas mais curtas, mantendo o formato quadrado.
  for(const side of [-1,1]){
    const x=side*59;
    addBox(scene,15,7,70,0x263847,x,4.0,0);
    for(let row=0;row<6;row++){
      const y=1.45+row*1.02;
      addBox(scene,1.55,.42,65-row*.8,seatColors[(row+1)%seatColors.length],side*(51.8+row*1.75),y,0).castShadow=false;
    }
    addBox(scene,17,.85,74,0x172733,side*59,13.2,0);
    for(const z of [-29,-14,0,14,29]){
      const pillar=new THREE.Mesh(new THREE.BoxGeometry(.85,10,.75),mat(0x657786,.72));
      pillar.position.set(side*67.2,6.5,z);pillar.castShadow=true;scene.add(pillar);
    }
  }
  // Torres de iluminação nos quatro cantos.
  for(const x of [-1,1])for(const z of [-1,1]){
    const px=x*69,pz=z*51;
    const mast=new THREE.Mesh(new THREE.BoxGeometry(.65,22,.65),mat(0x596873,.65));
    mast.position.set(px,11,pz);mast.castShadow=true;scene.add(mast);
    addBox(scene,5,.55,1.6,0x263541,px,22.2,pz);
    for(let n=0;n<7;n++){
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(.42,.22,.12),new THREE.MeshBasicMaterial({color:0xfff2cf}));
      lamp.position.set(px-1.8+n*.6,22,pz);scene.add(lamp);
    }
  }
  // Placar no fundo, acima da arquibancada.
  addBox(scene,1.1,5.4,17,0x071827,0,16,-55);
  const scoreFace=new THREE.Mesh(new THREE.PlaneGeometry(15,4.2),new THREE.MeshBasicMaterial({color:0x123a42,side:THREE.DoubleSide}));
  scoreFace.position.set(0,16,-54.35);scene.add(scoreFace);
}
function stadiumSignTexture(title,subtitle,color){
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#071827";ctx.fillRect(0,0,1024,256);
  ctx.fillStyle=color;ctx.fillRect(0,0,18,256);ctx.fillRect(1006,0,18,256);
  ctx.fillStyle="#ffffff";ctx.font="900 92px Arial";ctx.textAlign="center";ctx.fillText(title,512,118);
  ctx.fillStyle="#c9e5dc";ctx.font="bold 38px Arial";ctx.fillText(subtitle,512,184);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function createStadiumDetails(scene){
  // Grandes placas luminosas, voltadas para dentro do campo e fáceis de enxergar durante o jogo.
  const signs=[
    ["MORAIS FOOTBALL","FUTEBOL 3D ARCADE","#e2b936"],
    ["JOGUE COM RAÇA","MORAIS FC","#e34b43"],
    ["RESPEITO AO JOGO","PAIXÃO PELO FUTEBOL","#28a878"],
    ["MORAIS FC","A CASA DO FUTEBOL","#347fd0"]
  ];
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){
      const x=-37+i*24.5;
      const panel=addBox(scene,22,1.65,.42,0xffffff,x,1.12,side*33.0);
      panel.material=new THREE.MeshBasicMaterial({map:stadiumSignTexture(...signs[(i+(side===1?1:0))%signs.length]),toneMapped:false});
      panel.material.side=THREE.DoubleSide;
      addBox(scene,22.25,.12,.55,0xd8b33e,x,.22,side*33.0);
      for(const postX of [x-9.7,x+9.7])addBox(scene,.22,.75,.35,0x263541,postX,.35,side*33.0);
    }
    // Banco de reservas maior, com cobertura colorida e assentos individuais.
    const bx=side===-1?-17:17,bz=side*38.1;
    addBox(scene,17,.28,3.4,0x172b3a,bx,.28,bz);
    addBox(scene,17,.35,3.8,side===-1?0x9d2937:0x245c9a,bx,2.75,bz);
    addBox(scene,.22,2.4,3.7,0x647987,bx-8.2,1.45,bz);
    addBox(scene,.22,2.4,3.7,0x647987,bx+8.2,1.45,bz);
    for(let n=0;n<8;n++){
      const sx=bx-7+n*2;
      addBox(scene,1.45,.24,1.05,n%2?0x315b4b:0x344c60,sx,.92,bz);
      addBox(scene,1.45,.95,.18,0x243b49,sx,1.48,bz-side*.48);
    }
  }
  // Bandeiras grandes nos quatro escanteios, com cores fortes.
  for(const x of [-49.3,49.3])for(const z of [-31.3,31.3]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,3.15,10),mat(0xf5f3e9,.35));
    pole.position.set(x,1.57,z);pole.castShadow=true;scene.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.25,.72),new THREE.MeshBasicMaterial({color:(x*z)>0?0xffd43b:0xf04444,side:THREE.DoubleSide}));
    flag.position.set(x+.58,2.7,z);flag.rotation.y=x>0?Math.PI:0;scene.add(flag);
  }
  // Placar principal com texto legível, voltado para o gramado.
  const board=addBox(scene,19,5.4,.7,0x071827,0,15.2,-47.5);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(18,4.5),new THREE.MeshBasicMaterial({map:stadiumSignTexture("MORAIS FC  0  x  0","FUTEBOL 3D  •  JOGUE COM RAÇA","#e2b936"),toneMapped:false,side:THREE.DoubleSide}));
  screen.position.set(0,15.2,-47.08);scene.add(screen);
  // Torres de iluminação altas e visíveis nos quatro cantos do estádio.
  for(const x of [-54,54])for(const z of [-42,42]){
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.2,.34,20,10),mat(0x65717b,.6));
    mast.position.set(x,10,z);mast.castShadow=true;scene.add(mast);
    addBox(scene,4,.55,1.4,0x263541,x,20,z);
    for(let n=0;n<7;n++){
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(.38,.22,.12),new THREE.MeshBasicMaterial({color:0xfff4d0}));
      lamp.position.set(x-1.45+n*.48,20,z);scene.add(lamp);
    }
  }
}

function makePlayer(id,team,role,x,z,players,scene){
  const group=new THREE.Group();
  const homeColor=team===0?0xe5c83e:0xf2f2ed;
  const shortsColor=team===0?0x183326:0x243b70;
  const shirt=mat(homeColor,.62),shorts=mat(shortsColor),skin=mat(0xb9815e),socks=mat(team===0?0xe9e1bf:0xf4f4f0),boots=mat(0x171b1d,.55);
  // Tronco, gola e cabeça
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.48,.72,5,10),shirt);torso.position.y=1.62;torso.castShadow=true;group.add(torso);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,.2,10),skin);neck.position.y=2.22;group.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.31,16,12),skin);head.position.y=2.55;head.castShadow=true;group.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.315,14,8,0,Math.PI*2,0,Math.PI*.48),mat(team===0?0x30251e:0x211d1a));hair.position.y=2.65;group.add(hair);
  const pants=new THREE.Mesh(new THREE.BoxGeometry(.78,.42,.5),shorts);pants.position.y=1.04;group.add(pants);
  const legs=[];
  for(const side of [-1,1]){
    const pivot=new THREE.Group();pivot.position.set(side*.23,.91,0);
    const upper=new THREE.Mesh(new THREE.CylinderGeometry(.16,.14,.42,10),skin);upper.position.y=-.2;pivot.add(upper);
    const sock=new THREE.Mesh(new THREE.CylinderGeometry(.115,.12,.34,10),socks);sock.position.y=-.56;pivot.add(sock);
    const boot=new THREE.Mesh(new THREE.BoxGeometry(.22,.14,.38),boots);boot.position.set(0,-.75,.12);pivot.add(boot);
    group.add(pivot);legs.push(pivot);
    const armPivot=new THREE.Group();armPivot.position.set(side*.49,1.95,0);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.48,4,8),shirt);arm.rotation.z=side*-.12;arm.position.set(side*.02,-.31,0);armPivot.add(arm);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(.105,8,8),skin);hand.position.set(side*.04,-.62,0);armPivot.add(hand);group.add(armPivot);
  }
  // Número na frente
  const number=new THREE.Mesh(new THREE.PlaneGeometry(.25,.3),new THREE.MeshBasicMaterial({color:team===0?0x152719:0x273d6e}));
  number.position.set(0,1.7,.493);group.add(number);
  group.position.set(x,0,z);scene.add(group);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.78,.96,36),new THREE.MeshBasicMaterial({color:0xffe45b,side:THREE.DoubleSide,transparent:true,opacity:.9}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.065;ring.visible=false;group.add(ring);
  const p={id,team,role,mesh:group,ring,legs,kit:shirt,shorts,phase:Math.random()*Math.PI*2,home:{x,z},velocity:{x:0,z:0},stamina:100,radius:.7};
  players.push(p);
}
export function createScene(){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x7899b4);scene.fog=new THREE.Fog(0x7899b4,145,230);
  const camera=new THREE.PerspectiveCamera(49,innerWidth/innerHeight,.1,300);
  camera.position.set(0,76,112);camera.lookAt(0,2,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  document.querySelector("#game").prepend(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xe9f5ff,0x263b28,2.1));
  const sun=new THREE.DirectionalLight(0xfff4dc,2.4);sun.position.set(-28,62,24);sun.castShadow=true;
  sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-65;sun.shadow.camera.right=65;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;scene.add(sun);
  createPitch(scene);createStadium(scene);createStadiumDetails(scene);createGoal(scene,-1);createGoal(scene,1);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.43,24,18),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.32}));
  ball.castShadow=true;ball.position.y=.43;scene.add(ball);
  // Gomos e detalhes visíveis da bola
  for(let i=0;i<5;i++){
    const seam=new THREE.Mesh(new THREE.TorusGeometry(.432,.008,4,32),new THREE.MeshBasicMaterial({color:0x252525}));
    seam.rotation.set(i*.63,i*.91,0);ball.add(seam);
  }
  const players=[];
  [[-28,-15],[-28,0],[-28,15],[-12,-8],[-12,8]].forEach((p,i)=>makePlayer(i,0,i===0?"GK":"FIELD",...p,players,scene));
  [[28,-15],[28,0],[28,15],[12,-8],[12,8]].forEach((p,i)=>makePlayer(i+5,1,i===0?"GK":"FIELD",...p,players,scene));
  return{
    scene,camera,renderer,ball,players,
    setTeamColors(home,away){for(const p of players){const t=p.team===0?home:away;p.kit.color.setHex(t.shirt);p.shorts.color.setHex(t.shorts);}},
    resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)},
    follow(p,dt){
      const target=new THREE.Vector3(p.x*.28,45.5,18+p.z*.48);
      camera.position.lerp(target,1-Math.exp(-1.8*dt));camera.lookAt(p.x*.32,0,p.z*.32);
    },
    render(){renderer.render(scene,camera)}
  };
}