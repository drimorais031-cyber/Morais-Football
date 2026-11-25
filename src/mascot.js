import * as THREE from "three";

// Mascote 3D articulado da abertura. Cada membro tem seu próprio pivô.
export function createIntroMascot(container){
  if(!container)return {dispose(){}};
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,40);
  camera.position.set(0,2.05,8.2);camera.lookAt(0,1.25,0);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000,0);
  container.appendChild(renderer.domElement);
  const resize=()=>{
    const w=container.clientWidth||innerWidth,h=container.clientHeight||innerHeight;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  resize();addEventListener("resize",resize);

  scene.add(new THREE.HemisphereLight(0xeaf5ff,0x273323,2.1));
  const key=new THREE.DirectionalLight(0xffe6bd,3.1);key.position.set(-3,6,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x8bbcff,2.0);rim.position.set(4,3,-4);scene.add(rim);
  const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const red=mat(0xc72f36),redDark=mat(0x801e29),white=mat(0xf4f0e8),skin=mat(0x9b6245),hair=mat(0x211b19),black=mat(0x171b20),gold=mat(0xe7c64b,.38,.35);
  const sphere=(parent,r,material,pos,scale)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,16),material);
    m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;
  };
  const capsule=(parent,r,length,material,pos)=>{
    const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,length,5,12),material);
    m.position.set(...pos);m.castShadow=true;parent.add(m);return m;
  };
  const character=new THREE.Group();scene.add(character);
  character.position.y=-.12;
  // Tronco e uniforme
  const torso=capsule(character,.43,.68,red,[0,1.63,0]);
  const chestStripe=new THREE.Mesh(new THREE.BoxGeometry(.12,.9,.035),white);
  chestStripe.position.set(0,1.65,.405);character.add(chestStripe);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.16,.035,8,24),white);
  collar.position.set(0,2.05,0);collar.rotation.x=Math.PI/2;character.add(collar);
  const shorts=new THREE.Mesh(new THREE.BoxGeometry(.72,.38,.43),black);
  shorts.position.set(0,1.12,0);shorts.castShadow=true;character.add(shorts);
  // Emblema simples no peito
  const badge=new THREE.Mesh(new THREE.CircleGeometry(.105,6),gold);
  badge.position.set(.23,1.82,.405);character.add(badge);
  const badgeText=new THREE.Mesh(new THREE.PlaneGeometry(.12,.055),new THREE.MeshBasicMaterial({color:0x172018}));
  badgeText.position.set(.23,1.82,.414);character.add(badgeText);
  // Cabeça, cabelo e rosto
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,.2,12),skin);neck.position.y=2.13;character.add(neck);
  sphere(character,.31,skin,[0,2.43,.015],[.92,1.08,.9]);
  sphere(character,.32,hair,[0,2.61,-.015],[1.02,.55,1.0]);
  sphere(character,.105,hair,[-.25,2.48,.02],[.65,1.1,.9]);
  sphere(character,.105,hair,[.25,2.48,.02],[.65,1.1,.9]);
  for(const x of [-.105,.105])sphere(character,.035,black,[x,2.45,.285],[.72,.8,.45]);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.055,.12,8),skin);nose.position.set(0,2.37,.31);nose.rotation.x=Math.PI/2;character.add(nose);
  // Braços com ombro, cotovelo e antebraço independentes
  const arms=[];
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.47,1.94,0);character.add(shoulder);
    capsule(shoulder,.13,.34,red,[side*.035,-.24,0]);
    const elbow=new THREE.Group();elbow.position.set(side*.035,-.46,0);shoulder.add(elbow);
    capsule(elbow,.105,.34,skin,[0,-.22,.015]);
    sphere(elbow,.105,skin,[0,-.47,.02]);
    arms.push({shoulder,elbow,side});
  }
  // Pernas com joelho articulado, caneleira, meia e chuteira
  const legs=[];
  for(const side of [-1,1]){
    const hip=new THREE.Group();hip.position.set(side*.22,1.02,0);character.add(hip);
    capsule(hip,.17,.38,black,[0,-.23,0]);
    const knee=new THREE.Group();knee.position.set(0,-.45,0);hip.add(knee);
    capsule(knee,.12,.38,white,[0,-.22,0]);
    const shinGuard=new THREE.Mesh(new THREE.BoxGeometry(.13,.25,.055),redDark);shinGuard.position.set(0,-.23,.115);knee.add(shinGuard);
    const boot=new THREE.Group();boot.position.set(0,-.48,.075);knee.add(boot);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(.25,.14,.42),black);shoe.position.set(0,-.025,.11);shoe.castShadow=true;boot.add(shoe);
    const sole=new THREE.Mesh(new THREE.BoxGeometry(.255,.035,.43),redDark);sole.position.set(0,-.095,.11);boot.add(sole);
    legs.push({hip,knee,boot,side});
  }
  // Sombra suave no gramado
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.72,32),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.24,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.012,0);shadow.scale.set(1.25,.62,1);scene.add(shadow);

  // Bola 3D com gomos escuros
  const ballGroup=new THREE.Group();scene.add(ballGroup);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.22,28,20),mat(0xf5f5f1,.28));
  ball.castShadow=true;ballGroup.add(ball);
  for(let i=0;i<5;i++){
    const patch=new THREE.Mesh(new THREE.CircleGeometry(.075,5),black);
    const a=i*Math.PI*2/5,normal=new THREE.Vector3(Math.cos(a)*.72,.35,Math.sin(a)*.72+.45).normalize();
    patch.position.copy(normal.clone().multiplyScalar(.215));
    patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
    ballGroup.add(patch);
  }
  ballGroup.position.set(.48,.28,.82);

  const start=performance.now();
  let frame=0,disposed=false;
  const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t)};
  function render(now){
    if(disposed)return;
    const t=(now-start)/1000;
    // Respiração e leve movimento de entrada
    character.position.y=-.12+Math.sin(t*3.2)*.018;
    character.rotation.y=Math.sin(t*1.4)*.045;
    torso.rotation.x=Math.sin(t*2.4)*.025;
    arms.forEach(({shoulder,elbow,side})=>{
      shoulder.rotation.x=Math.sin(t*4+side)*.08;
      elbow.rotation.x=-.18;
    });
    legs.forEach(({hip,knee,boot,side})=>{
      hip.rotation.x=Math.sin(t*4+side)*.045;knee.rotation.x=0;boot.rotation.x=0;
    });
    // Preparação: transfere o peso para a perna de apoio e leva a perna do chute para trás.
    const wind=smooth((t-1.35)/.85);
    const kick=smooth((t-2.2)/.52);
    const follow=smooth((t-2.72)/.55);
    const kicker=legs.find(l=>l.side===1),support=legs.find(l=>l.side===-1);
    kicker.hip.rotation.x=.88*wind-2.05*kick+.92*follow;
    kicker.knee.rotation.x=-.12*wind-.78*kick+.58*follow;
    kicker.boot.rotation.x=.18*kick-.12*follow;
    support.hip.rotation.x=-.22*wind+.12*follow;
    support.knee.rotation.x=.12*wind;
    character.rotation.z=-.12*wind+.06*kick;
    character.position.y+=.12*kick*(1-follow);
    arms.forEach(({shoulder,elbow,side})=>{
      shoulder.rotation.x=side===1?-.45*wind+.95*kick-.42*follow:.42*wind-.55*kick+.2*follow;
      shoulder.rotation.z=side*(.12+.18*wind);
      elbow.rotation.x=side===1?-.45:-.18;
    });
    // A bola só dispara quando a chuteira chega ao ponto de contato.
    const travel=smooth((t-3.02)/2.05);
    ballGroup.visible=t>2.65&&t<5.35;
    if(t<3.02){ballGroup.position.set(.48,.28,.82);ballGroup.rotation.set(0,0,0)}
    else{
      ballGroup.position.set(.48*(1-travel)+.08*travel,.28+1.0*travel+Math.sin(travel*Math.PI)*.18,.82+7.25*travel);
      ballGroup.rotation.set(travel*8,travel*12,travel*5);
      const scale=1+travel*2.2;ballGroup.scale.setScalar(scale);
    }
    if(t>5.35)ballGroup.visible=false;
    renderer.render(scene,camera);
    frame=requestAnimationFrame(render);
  }
  frame=requestAnimationFrame(render);
  return {dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);removeEventListener("resize",resize);
    renderer.dispose();renderer.domElement.remove();
    scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose()}});
  }};
}
