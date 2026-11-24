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
  // Arquibancadas laterais em três níveis
  for(const side of [-1,1]){
    const z=side*39;
    for(let tier=0;tier<3;tier++){
      const width=108-tier*3,depth=6.5,height=3.5;
      const stand=addBox(scene,width,height,depth,[0x263644,0x344656,0x253440][tier],0,3.4+tier*4.2,z+side*tier*1.1);
      stand.material.color.setHex([0x263644,0x344656,0x253440][tier]);
      for(let row=0;row<3;row++){
        const step=addBox(scene,width-2,.25,1.2,0x71808a,0,1.9+tier*4.2+row*.8,z+side*(depth*.25+row*1.35+tier*1.1));
        step.castShadow=false;
      }
      // Torcida em instâncias: leve para celulares
      const crowdMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
      const crowdGeo=new THREE.BoxGeometry(.38,.55,.32);
      const crowd=new THREE.InstancedMesh(crowdGeo,crowdMat,360);
      const dummy=new THREE.Object3D();
      const colors=[0xd8d8d8,0xe1c547,0x2e9a59,0xc64a3d,0x315c9c,0x20252c];
      for(let i=0;i<360;i++){
        const col=i%60,row=Math.floor(i/60);
        dummy.position.set(-width/2+2+col*(width-4)/59,2.7+tier*4.2+row*.78,z+side*(1.2+row*.85+tier*1.1));
        dummy.scale.set(1,1,1);dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);
        crowd.setColorAt(i,new THREE.Color(colors[(i*7+row*3)%colors.length]));
      }
      scene.add(crowd);
    }
    // Cobertura e pilares
    addBox(scene,112,1.1,12,0x202d38,0,17.5,side*43);
    for(const x of [-48,-24,0,24,48])addBox(scene,.7,17,1,0x1d2933,x,8.5,side*43);
    // Refletores
    const rig=addBox(scene,2,.6,11,0x26313a,0,19,side*35);
    for(let i=0;i<8;i++){
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(1.05,.2,.55),new THREE.MeshBasicMaterial({color:0xfff2c6}));
      lamp.position.set(-45+i*13,18.6,side*35);scene.add(lamp);
    }
  }
  // Fundos atrás dos gols
  for(const side of [-1,1]){
    const x=side*59;
    addBox(scene,7,9,72,0x293946,x,4.5,0);
    addBox(scene,9,1,76,0x1c2a35,x,9.2,0);
    for(let i=0;i<28;i++){
      const z=-34+i*2.5;
      addBox(scene,.55,.6,.45,i%4===0?0xe2c94f:0xd5dce0,x-side*3,2+(i%3)*.7,z);
    }
  }
  // Painel de placar no alto
  addBox(scene,1,4,15,0x101a22,0,15,-48);
  addBox(scene,.18,2.8,12,0x263d4b,.58,15,-48);
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
  camera.position.set(0,48,60);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  document.querySelector("#game").prepend(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xe9f5ff,0x263b28,2.1));
  const sun=new THREE.DirectionalLight(0xfff4dc,2.4);sun.position.set(-28,62,24);sun.castShadow=true;
  sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-65;sun.shadow.camera.right=65;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;scene.add(sun);
  createPitch(scene);createStadium(scene);createGoal(scene,-1);createGoal(scene,1);
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
    setTeamColors(home,away){for(const p of players){const t=p.team===0?home:away;p.kit.color.setHex(t.shirt);p.shorts.material.color.setHex(t.shorts);}},
    resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)},
    follow(p,dt){
      const target=new THREE.Vector3(p.x*.28,45.5,18+p.z*.48);
      camera.position.lerp(target,1-Math.exp(-1.8*dt));camera.lookAt(p.x*.32,0,p.z*.32);
    },
    render(){renderer.render(scene,camera)}
  };
}