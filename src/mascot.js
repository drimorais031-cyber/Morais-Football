import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Mascote esportivo 3D estilizado, com rig simples e membros articulados.
export function createIntroMascot(container){
  if(!container)return {dispose(){}};
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(32,1,.1,50);
  camera.position.set(0,1.9,8.8);camera.lookAt(0,1.38,0);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.setClearColor(0x000000,0);container.appendChild(renderer.domElement);
  const resize=()=>{
    const w=container.clientWidth||innerWidth,h=container.clientHeight||innerHeight;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  resize();addEventListener("resize",resize);
  scene.add(new THREE.HemisphereLight(0xf4f8ff,0x34402c,2.25));
  const key=new THREE.DirectionalLight(0xffe4c5,3.3);key.position.set(-3,6,6);scene.add(key);
  const fill=new THREE.DirectionalLight(0xffffff,1.4);fill.position.set(4,3,5);scene.add(fill);
  const rim=new THREE.DirectionalLight(0x8ebeff,2.1);rim.position.set(3,4,-4);scene.add(rim);
  const mat=(color,roughness=.58,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const red=mat(0xd62935,.42),red2=mat(0x9e1726,.5),white=mat(0xf8f5ee,.48),skin=mat(0xb97953,.62),skinLight=mat(0xd08c65,.58),hair=mat(0x211b1b,.48),black=mat(0x17191e,.5),gold=mat(0xf3c94e,.32,.25),eyeWhite=mat(0xffffff,.3),iris=mat(0x4a2b1e,.35),sole=mat(0x292b31,.45);
  const sphere=(parent,r,material,pos,scale)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,28,20),material);
    m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const capsule=(parent,r,length,material,pos)=>{
    const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,length,6,16),material);
    m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const box=(parent,size,material,pos,round=.06)=>{
    const bevel=Math.min(round,Math.min(...size)*.44);const g=new RoundedBoxGeometry(...size,5,bevel);const m=new THREE.Mesh(g,material);
    m.position.set(...pos);m.castShadow=true;parent.add(m);return m;
  };
  const character=new THREE.Group();scene.add(character);character.position.y=-.13;
  // Camisa com silhueta atlética e detalhes de acabamento.
  const torso=capsule(character,.43,.62,red,[0,1.66,0]);
  torso.scale.set(1.08,1.04,.82);
  const chestStripe=box(character,[.115,.88,.035],white,[0,1.67,.355],.025);
  const sideStripeL=box(character,[.045,.62,.025],white,[-.345,1.65,.265],.015);
  const sideStripeR=box(character,[.045,.62,.025],white,[.345,1.65,.265],.015);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.145,.035,10,28),white);
  collar.position.set(0,2.035,.02);collar.rotation.x=Math.PI/2;character.add(collar);
  // Escudo MF no peito
  const badge=new THREE.Group();badge.position.set(.235,1.82,.37);character.add(badge);
  const badgeBase=new THREE.Mesh(new THREE.CircleGeometry(.105,6),gold);badge.add(badgeBase);
  const badgeMark=new THREE.Mesh(new THREE.PlaneGeometry(.115,.055),new THREE.MeshBasicMaterial({color:0x781522}));
  badgeMark.position.z=.008;badge.add(badgeMark);
  const shorts=box(character,[.73,.38,.43],black,[0,1.13,0],.09);
  box(character,[.22,.34,.445],red2,[-.18,1.13,.012],.05);
  box(character,[.22,.34,.445],red2,[.18,1.13,.012],.05);
  // Cabeça maior e expressiva, separada do tronco para acompanhar a ação.
  const head=new THREE.Group();head.position.set(0,2.22,0);character.add(head);
  capsule(head,.105,.24,skin,[0,.12,0]);
  sphere(head,.34,skin,[0,.42,.015],[.91,1.04,.88]);
  // Orelhas
  sphere(head,.085,skin,[-.31,.42,0],[.55,1,.72]);sphere(head,.085,skin,[.31,.42,0],[.55,1,.72]);
  // Cabelo com volume e topete
  sphere(head,.345,hair,[0,.61,-.015],[1.02,.56,.96]);
  sphere(head,.16,hair,[-.16,.75,.08],[1.25,.55,.8]);
  sphere(head,.13,hair,[.02,.81,.075],[1.1,.62,.8]);
  sphere(head,.105,hair,[.17,.72,.075],[1.1,.55,.8]);
  // Sobrancelhas, olhos, íris e brilho
  for(const x of [-.125,.125]){
    const brow=box(head,[.105,.028,.035],hair,[x,.49,.295],.012);brow.rotation.z=x<0?.12:-.12;
    sphere(head,.066,eyeWhite,[x,.405,.29],[.82,1.08,.42]);
    sphere(head,.031,iris,[x+.008,.405,.317],[.8,1,.5]);
    sphere(head,.013,black,[x+.01,.405,.33],[.8,1,.5]);
    sphere(head,.012,eyeWhite,[x-.002,.425,.34],[.8,1,.5]);
  }
  // Nariz pequeno e sorriso curvo
  sphere(head,.045,skinLight,[0,.335,.32],[.8,.75,.72]);
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.085,.012,8,20,Math.PI),black);
  smile.position.set(0,.265,.305);smile.rotation.z=Math.PI;head.add(smile);
  // Braços: mangas vermelhas, antebraços, mãos e punhos
  const arms=[];
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.43,1.91,0);character.add(shoulder);
    capsule(shoulder,.16,.34,red,[side*.025,-.2,0]);
    const sleeveBand=new THREE.Mesh(new THREE.TorusGeometry(.135,.018,8,20),white);
    sleeveBand.position.set(side*.035,-.39,0);sleeveBand.rotation.x=Math.PI/2;shoulder.add(sleeveBand);
    const elbow=new THREE.Group();elbow.position.set(side*.035,-.41,0);shoulder.add(elbow);
    capsule(elbow,.105,.34,skin,[0,-.2,.015]);
    sphere(elbow,.12,skinLight,[0,-.43,.035],[1,1,.9]);
    // dedos simplificados, mas com volume
    for(let f=0;f<3;f++)capsule(elbow,.026,.07,skin,[((f-1)*.045),-.49,.105]);
    arms.push({shoulder,elbow,side});
  }
  // Pernas com coxa, joelho, meia listrada e chuteira de campo.
  const legs=[];
  for(const side of [-1,1]){
    const hip=new THREE.Group();hip.position.set(side*.22,.99,0);character.add(hip);
    capsule(hip,.175,.43,black,[0,-.24,0]);
    const knee=new THREE.Group();knee.position.set(0,-.47,0);hip.add(knee);
    capsule(knee,.115,.43,white,[0,-.22,0]);
    const sockBand=new THREE.Mesh(new THREE.TorusGeometry(.108,.018,8,20),red);
    sockBand.position.set(0,-.12,0);knee.add(sockBand);
    const shinGuard=sphere(knee,.075,red2,[0,-.22,.105],[.9,1.45,.32]);
    const boot=new THREE.Group();boot.position.set(0,-.47,.045);knee.add(boot);
    const shoe=box(boot,[.25,.145,.43],red2,[0,-.02,.115],.065);
    const toe=sphere(boot,.12,black,[0,-.015,.28],[1,.58,1.1]);
    box(boot,[.255,.035,.44],sole,[0,-.095,.115],.025);
    // pequenas travas
    for(let s=-1;s<=1;s++)for(let z=0;z<2;z++)sphere(boot,.022,gold,[s*.075,-.13,.02+z*.18],[1,.7,1]);
    legs.push({hip,knee,boot,side});
  }
  // Sombra elíptica para ancorar o personagem no gramado.
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.72,40),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.28,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.012,0);shadow.scale.set(1.3,.62,1);scene.add(shadow);
  // Bola com painéis pentagonais.
  const ballGroup=new THREE.Group();scene.add(ballGroup);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.22,32,24),mat(0xf7f7f3,.27));ball.castShadow=true;ballGroup.add(ball);
  for(let i=0;i<5;i++){
    const patch=new THREE.Mesh(new THREE.CircleGeometry(.074,5),black);
    const a=i*Math.PI*2/5,normal=new THREE.Vector3(Math.cos(a)*.72,.35,Math.sin(a)*.72+.45).normalize();
    patch.position.copy(normal.clone().multiplyScalar(.216));patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);ballGroup.add(patch);
  }
  ballGroup.position.set(.48,.28,.82);
  const start=performance.now();let frame=0,disposed=false;
  const smooth=v=>{v=THREE.MathUtils.clamp(v,0,1);return v*v*(3-2*v)};
  function render(now){
    if(disposed)return;
    const t=(now-start)/1000;
    character.position.y=-.13+Math.sin(t*3.2)*.014;
    character.rotation.y=Math.sin(t*1.3)*.035;
    torso.rotation.x=Math.sin(t*2.4)*.018;
    head.rotation.y=Math.sin(t*1.8)*.035;head.rotation.z=Math.sin(t*2.2)*.018;
    arms.forEach(({shoulder,elbow,side})=>{shoulder.rotation.x=Math.sin(t*3.8+side)*.055;elbow.rotation.x=-.22});
    legs.forEach(({hip,knee,boot,side})=>{hip.rotation.x=Math.sin(t*3.8+side)*.035;knee.rotation.x=0;boot.rotation.x=0});
    const wind=smooth((t-1.35)/.85),kick=smooth((t-2.2)/.52),follow=smooth((t-2.72)/.55);
    const kicker=legs.find(l=>l.side===1),support=legs.find(l=>l.side===-1);
    kicker.hip.rotation.x=.88*wind-2.05*kick+.92*follow;
    kicker.knee.rotation.x=-.12*wind-.78*kick+.58*follow;
    kicker.boot.rotation.x=.18*kick-.12*follow;
    support.hip.rotation.x=-.22*wind+.12*follow;support.knee.rotation.x=.12*wind;
    character.rotation.z=-.12*wind+.06*kick;character.position.y+=.12*kick*(1-follow);
    head.rotation.z+=-.05*wind+.025*follow;
    arms.forEach(({shoulder,elbow,side})=>{
      shoulder.rotation.x=side===1?-.45*wind+.95*kick-.42*follow:.42*wind-.55*kick+.2*follow;
      shoulder.rotation.z=side*(.12+.18*wind);elbow.rotation.x=side===1?-.45:-.18;
    });
    const travel=smooth((t-3.02)/2.05);
    ballGroup.visible=t>2.65&&t<5.35;
    if(t<3.02){ballGroup.position.set(.48,.28,.82);ballGroup.rotation.set(0,0,0);ballGroup.scale.setScalar(1)}
    else{
      ballGroup.position.set(.48*(1-travel)+.08*travel,.28+1.0*travel+Math.sin(travel*Math.PI)*.18,.82+7.25*travel);
      ballGroup.rotation.set(travel*8,travel*12,travel*5);ballGroup.scale.setScalar(1+travel*2.2);
    }
    if(t>5.35)ballGroup.visible=false;
    renderer.render(scene,camera);frame=requestAnimationFrame(render);
  }
  frame=requestAnimationFrame(render);
  return {dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);removeEventListener("resize",resize);
    renderer.dispose();renderer.domElement.remove();
    scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose()}});
  }};
}
