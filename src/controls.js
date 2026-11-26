export class Controls {
  constructor() {
    this.keys = new Set();
    this.a = {};
    this.actions = { pass:false, through:false, switch:false, shootTap:false, shootReleased:false };
    this.move = { x:0, z:0 };
    this.bind();
  }

  bind() {
    addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k === "j") this.actions.pass = true;
      if (k === "l") this.actions.through = true;
      if (k === "tab") this.actions.switch = true;
      if (k === "k") this.actions.shootTap = true;
    });
    addEventListener("keyup", e => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      if (k === "k") this.actions.shootReleased = true;
    });

    const zone = document.querySelector("#stickZone");
    const stick = document.querySelector("#stick");
    let pid = null;
    const move = e => {
      const r = zone.getBoundingClientRect();
      const dx = e.clientX-r.left-r.width/2, dy = e.clientY-r.top-r.height/2;
      const m = r.width*.34, n = Math.hypot(dx,dy), s = Math.min(1,m/(n||1));
      this.move = { x:dx*s/m, z:dy*s/m };
      stick.style.transform = `translate(${dx*s}px,${dy*s}px)`;
    };
    zone.addEventListener("pointerdown", e => {
      e.preventDefault(); pid=e.pointerId; zone.setPointerCapture(pid); move(e);
    });
    zone.addEventListener("pointermove", e => { if(e.pointerId===pid) move(e); });
    const endMove = e => {
      if(e.pointerId===pid){pid=null;this.move={x:0,z:0};stick.style.transform="";}
    };
    zone.addEventListener("pointerup",endMove);
    zone.addEventListener("pointercancel",endMove);
    document.querySelectorAll("[data-a]").forEach(b => {
      const a=b.dataset.a;
      b.addEventListener("pointerdown",e=>{
        e.preventDefault(); b.setPointerCapture(e.pointerId); this.a[a]=true;
        if(a==="pass"||a==="through"||a==="switch") this.actions[a]=true;
        if(a==="shoot") this.actions.shootTap=true;
      });
      const end=()=>{
        if(a==="shoot") this.actions.shootReleased=true;
        this.a[a]=false;
      };
      b.addEventListener("pointerup",end);
      b.addEventListener("pointercancel",end);
      b.addEventListener("lostpointercapture",end);
    });
  }

  read() {
    let x=this.move.x,z=this.move.z;
    for(const [k,dx,dz] of [["a",-1,0],["arrowleft",-1,0],["d",1,0],["arrowright",1,0],["w",0,-1],["arrowup",0,-1],["s",0,1],["arrowdown",0,1]]) {
      if(this.keys.has(k)){x+=dx;z+=dz;}
    }
    const n=Math.hypot(x,z); if(n>1){x/=n;z/=n;}
    const r={
      x,z,
      sprint:this.keys.has("shift")||this.a.sprint,
      shoot:this.keys.has("k")||!!this.a.shoot,
      shootTap:this.actions.shootTap,
      shootReleased:this.actions.shootReleased,
      pass:this.actions.pass,
      through:this.actions.through,
      switch:this.actions.switch
    };
    this.actions={pass:false,through:false,switch:false,shootTap:false,shootReleased:false};
    return r;
  }
}