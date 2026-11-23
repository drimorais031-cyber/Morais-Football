(() => {
  const $ = id => document.getElementById(id);
  const menu=$("menu"), game=$("game"), canvas=$("pitch"), ctx=canvas.getContext("2d");
  let players=[], ball, keys={}, score=[0,0], seconds=0, running=false, paused=false, last=0, raf=0, move={x:0,y:0};
  const W=900,H=560;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function makePlayer(x,y,team,keeper=false){return {x,y,vx:0,vy:0,team,keeper,r:keeper?13:11,speed:keeper?1.8:2.25};}
  function setup(){
    players=[];
    players.push(makePlayer(95,280,0,true));
    for(let i=0;i<5;i++) players.push(makePlayer(245+(i%2)*75,100+i*75,0));
    players.push(makePlayer(805,280,1,true));
    for(let i=0;i<5;i++) players.push(makePlayer(655-(i%2)*75,100+i*75,1));
    ball={x:W/2,y:H/2,vx:0,vy:0,r:8};
    score=[0,0];seconds=0;updateScore();
  }
  function updateScore(){
    $("homeScore").textContent=score[0];$("awayScore").textContent=score[1];
    $("clock").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(Math.floor(seconds%60)).padStart(2,"0");
  }
  function start(){
    $("homeLabel").textContent=$("homeTeam").value.toUpperCase();
    $("awayLabel").textContent=$("awayTeam").value.toUpperCase();
    menu.classList.add("hidden");game.classList.remove("hidden");setup();running=true;paused=false;
    $("status").textContent="Partida em andamento";last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?"#197441":"#1c7d47";ctx.fillRect(i*90,0,90,H)}
    ctx.strokeStyle="#d7f0d8";ctx.lineWidth=3;ctx.strokeRect(18,18,W-36,H-36);
    ctx.beginPath();ctx.moveTo(W/2,18);ctx.lineTo(W/2,H-18);ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,H/2,75,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,H/2,4,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
    ctx.strokeRect(18,175,105,210);ctx.strokeRect(W-123,175,105,210);
    ctx.strokeRect(18,225,48,110);ctx.strokeRect(W-66,225,48,110);
    ctx.fillStyle="#d8f0dc";ctx.fillRect(0,245,18,70);ctx.fillRect(W-18,245,18,70);
    players.forEach((p,i)=>{
      ctx.beginPath();ctx.fillStyle=p.team===0?"#d9f34e":"#f5f5f5";ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      ctx.lineWidth=3;ctx.strokeStyle=p.team===0?"#324c19":"#c52d32";ctx.stroke();
      if(i===1){ctx.beginPath();ctx.arc(p.x,p.y,p.r+4,0,Math.PI*2);ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.stroke()}
    });
    ctx.beginPath();ctx.fillStyle="#fff";ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#202820";ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(ball.x-4,ball.y);ctx.lineTo(ball.x+4,ball.y);ctx.moveTo(ball.x,ball.y-4);ctx.lineTo(ball.x,ball.y+4);ctx.stroke();
  }
  function closest(team){return players.filter(p=>p.team===team&&!p.keeper).sort((a,b)=>Math.hypot(a.x-ball.x,a.y-ball.y)-Math.hypot(b.x-ball.x,b.y-ball.y))[0]}
  function action(type){
    const p=closest(0);if(!p)return;
    const dx=ball.x-p.x,dy=ball.y-p.y;
    if(Math.hypot(dx,dy)<58){
      if(type==="shoot"){ball.vx=6.5;ball.vy=(ball.y-H/2)*-.035; $("status").textContent="CHUTE!";}
      else {ball.vx=5.2;ball.vy=(Math.random()-.5)*4;$("status").textContent="Passe executado";}
    }else $("status").textContent="Aproxime-se da bola para "+(type==="shoot"?"chutar":"passar");
  }
  function update(dt){
    seconds+=dt/1000;updateScore();
    const p=closest(0);
    if(p){p.vx=move.x*p.speed;p.vy=move.y*p.speed;if(keys.ArrowLeft||keys.a)p.vx=-p.speed;if(keys.ArrowRight||keys.d)p.vx=p.speed;if(keys.ArrowUp||keys.w)p.vy=-p.speed;if(keys.ArrowDown||keys.s)p.vy=p.speed;
      p.x=clamp(p.x+p.vx,35,W-35);p.y=clamp(p.y+p.vy,35,H-35);
      if(Math.hypot(ball.x-p.x,ball.y-p.y)<p.r+ball.r+4){ball.vx+=p.vx*.7;ball.vy+=p.vy*.7;}
    }
    const opponent=closest(1);if(opponent){const dx=ball.x-opponent.x,dy=ball.y-opponent.y,d=Math.hypot(dx,dy)||1;opponent.x+=dx/d*1.15;opponent.y+=dy/d*1.15;if(d<24){ball.vx-=.8;ball.vy+=(Math.random()-.5)*1.5}}
    ball.x+=ball.vx;ball.y+=ball.vy;ball.vx*=.985;ball.vy*=.985;
    if(ball.y<28||ball.y>H-28)ball.vy*=-.8;
    if(ball.x<18||ball.x>W-18){if(ball.y>245&&ball.y<315){score[ball.x>W/2?0:1]++;setupAfterGoal();$("status").textContent="GOL!";}else ball.vx*=-.8}
    ball.x=clamp(ball.x,18,W-18);ball.y=clamp(ball.y,28,H-28);
  }
  function setupAfterGoal(){players.forEach((p,i)=>{p.x=p.team===0?(p.keeper?95:245+(i%2)*70):(p.keeper?805:655-(i%2)*70);p.y=i===0||i===6?280:100+(i%5)*75});ball={x:W/2,y:H/2,vx:0,vy:0,r:8};}
  function loop(t){if(!running)return;const dt=Math.min(32,t-last);last=t;if(!paused)update(dt);draw();raf=requestAnimationFrame(loop)}
  $("startBtn").addEventListener("click",start);
  $("passBtn").addEventListener("click",()=>action("pass"));$("shootBtn").addEventListener("click",()=>action("shoot"));
  $("pauseBtn").addEventListener("click",()=>{paused=!paused;$("pauseBtn").textContent=paused?"CONTINUAR":"PAUSAR";$("status").textContent=paused?"Partida pausada":"Partida em andamento"});
  $("backBtn").addEventListener("click",()=>{running=false;cancelAnimationFrame(raf);game.classList.add("hidden");menu.classList.remove("hidden")});
  window.addEventListener("keydown",e=>{keys[e.key]=true;if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault()});
  window.addEventListener("keyup",e=>keys[e.key]=false);
  document.querySelectorAll("[data-dir]").forEach(btn=>{
    const dir=btn.dataset.dir, vals={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    const on=()=>{move={x:vals[dir][0],y:vals[dir][1]}};const off=()=>{move={x:0,y:0}};
    btn.addEventListener("pointerdown",e=>{e.preventDefault();on()});["pointerup","pointerleave","pointercancel"].forEach(ev=>btn.addEventListener(ev,off));
  });
  draw();
})();