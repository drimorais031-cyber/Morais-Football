export const FIELD={length:100,width:64,goalWidth:14,goalHeight:5.2,goalDepth:3};const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class BallPhysics{constructor(mesh){this.mesh=mesh;this.v={x:0,y:0,z:0};this.radius=.42;this.cooldown=0;this.lastTouch=-1}
kick(dir,power,lift=.4,id=-1){const n=Math.hypot(dir.x,dir.z)||1;this.v.x=dir.x/n*power;this.v.z=dir.z/n*power;this.v.y=lift;this.lastTouch=id}
update(dt,players,onGoal){const p=this.mesh.position,v=this.v;this.cooldown=Math.max(0,this.cooldown-dt);p.x+=v.x*dt;p.y+=v.y*dt;p.z+=v.z*dt;v.x*=Math.exp(-.65*dt);v.z*=Math.exp(-.65*dt);
if(p.y>this.radius)v.y-=19.2*dt;else{p.y=this.radius;if(v.y<0){v.y=-v.y*.34;if(v.y<1.1)v.y=0}v.x*=Math.exp(-1.8*dt);v.z*=Math.exp(-1.8*dt)}
if(Math.abs(p.z)>31.6){p.z=clamp(p.z,-31.6,31.6);v.z*=-.72}
const mouth=Math.abs(p.z)<7&&p.y<5.2;if(Math.abs(p.x)>49.6){if(mouth&&this.cooldown===0){onGoal(p.x>0?0:1);this.cooldown=2.2}else if(!mouth){p.x=clamp(p.x,-49.6,49.6);v.x*=-.7}else{p.x=clamp(p.x,-53,53);v.x*=.75}}
for(const q of players){if(q.role==="GK")continue;const dx=p.x-q.mesh.position.x,dz=p.z-q.mesh.position.z,d=Math.hypot(dx,dz),min=.42+q.radius;if(d<min&&p.y<1.5){const nx=dx/(d||1),nz=dz/(d||1);p.x=q.mesh.position.x+nx*min;p.z=q.mesh.position.z+nz*min;const dot=v.x*nx+v.z*nz;if(dot<0){v.x-=1.5*dot*nx;v.z-=1.5*dot*nz}}}this.mesh.rotation.x+=v.z*dt/.42;this.mesh.rotation.z-=v.x*dt/.42}
reset(x=0,z=0){this.mesh.position.set(x,.42,z);this.v={x:0,y:0,z:0}}get speed(){return Math.hypot(this.v.x,this.v.z)}}