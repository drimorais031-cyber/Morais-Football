(() => {
  const $ = id => document.getElementById(id);
  const menu=$("menu"), game=$("game"), canvas=$("pitch"), ctx=canvas.getContext("2d");
  const W=900,H=560;
  let players=[],ball,keys={},score=[0,0],seconds=0,running=false,paused=false,last=0,raf=0,move={x:0,y:0},activePlayer=null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const formations=[
    [ {x:.20,y:.50},{x:.32,y:.20},{x:.32,y:.40},{x:.32,y:.60},{x:.32,y:.80},{x:.48,y:.18},{x:.48,y:.40},{x:.48,y:.60},{x:.48,y:.82},{x:.62,y:.38},{x:.62,y:.62} ],
    [ {x:.80,y:.50},{x:.68,y:.20},{x:.68,y:.40},{x:.68,y:.60},{x:.68,y:.80},{x:.52,y:.18},{x:.52,y:.40},{x:.52,y:.60},{x:.52,y:.82},{x:.38,y:.38},{x:.38,y:.62} ]
  ];
  const teamNames=["Morais FC","Rivais FC","Apucarana","São Paulo","Palmeiras","Santos","Flamengo","Corinthians","Brasil","Argentina"];
  teamNames.forEach(n=>{if(![...$("homeTeam").options].some(o=>o.value===n)){const o=document.createElement("option");o.textContent=n;o.value=n;$("homeTeam").append(o)}});
  teamNames.forEach(n=>{if(![...$("awayTeam").options].some(o=>o.value===n)){const o=document.createElement("option");o.textContent=n;o.value=n;$("awayTeam").append(o)}});
  function makePlayer(x,y,team,index){return {x,y,homeX:x,homeY:y,team,index,keeper:index===0,r:index===0?13:10,speed:index===0?1.8:2.0};}
  function setup(){
    players=[];
    for(let t=0;t<2;t++) formations[t].forEach((pos,i)=>players.push(makePlayer(pos.x*W,pos.y*H,t,i)));
    ball={x:W/2,y:H/2,vx:0,vy:0,r:8};score=[0,0];seconds=0;updateScore();
    activePlayer=players.find(p=>p.team===0&&p.index===9);
  }
  function updateScore(){$("homeScore").textContent=score[0];$("awayScore").textContent=score[1];$("clock").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(Math.floor(seconds%60)).padStart(2,"0")}
  function start(){
    $("homeLabel").textContent=$("homeTeam").value.toUpperCase();$("awayLabel").textContent=$("awayTeam").value.toUpperCase();
    menu.classList.add("hidden");game.classList.remove("hidden");setup();running=true;paused=false;$("status").textContent="Partida em andamento";$("pauseBtn").textContent="PAUSAR";last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?"#197441":"#1c7d47";ctx.fillRect(i*90,0,90,H)}
    ctx.strokeStyle="#e0f2df";ctx.lineWidth=3;ctx.strokeRect(18,18,W-36,H-36);ctx.beginPath();ctx.moveTo(W/2,18);ctx.lineTo(W/2,H-18);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,75,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,4,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
    ctx.strokeRect(18,175,105,210);ctx.strokeRect(W-123,175,105,210);ctx.strokeRect(18,225,48,110);ctx.strokeRect(W-66,225,48,110);ctx.fillStyle="#d8f0dc";ctx.fillRect(0,245,18,70);ctx.fillRect(W-18,245,18,70);
    players.forEach(p=>{ctx.beginPath();ctx.fillStyle=p.team===0?"#d9f34e":"#f5f5f5";ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=p.team===0?"#324c19":"#c52d32";ctx.stroke();if(p===activePlayer){ctx.beginPath();ctx.arc(p.x,p.y,p.r+5,0,Math.PI*2);ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke()}ctx.fillStyle="#17251a";ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillText(p.index===0?"G":String(p.index),p.x,p.y+3)});
    ctx.beginPath();ctx.fillStyle="#fff";ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#202820";ctx.lineWidth=2;ctx.stroke();
  }
  function nearest(team){return players.filter(p=>p.team===team&&!p.keeper).sort((a,b)=>Math.hypot(a.x-ball.x,a.y-ball.y)-Math.hypot(b.x-ball.x,b.y-ball.y))[0]}
  function action(type){
    const p=activePlayer||nearest(0);if(!p)return;const d=Math.hypot(ball.x-p.x,ball.y-p.y);
    if(d<65){if(type==="shoot"){ball.vx=7.4;ball.vy=(ball.y-H/2)*-.045;$("status").textContent="CHUTE!";}else{const target=players.filter(q=>q.team===0&&q!==p).sort((a,b)=>Math.hypot(a.x-ball.x,a.y-ball.y)-Math.hypot(b.x-ball.x,b.y-ball.y))[0];if(target){const dx=target.x-ball.x,dy=target.y-ball.y,len=Math.hypot(dx,dy)||1;ball.vx=dx/len*6;ball.vy=dy/len*6}$("status").textContent="Passe executado";}}else $("status").textContent="Aproxime-se da bola para "+(type==="shoot"?"chutar":"passar")
  }
  function update(dt){
    seconds+=dt/1000;updateScore();
    const controlled=activePlayer||nearest(0);
    if(controlled){
      let dx=move.x,dy=move.y;if(keys.ArrowLeft||keys.a)dx=-1;if(keys.ArrowRight||keys.d)dx=1;if(keys.ArrowUp||keys.w)dy=-1;if(keys.ArrowDown||keys.s)dy=1;
      const len=Math.hypot(dx,dy)||1;controlled.x=clamp(controlled.x+dx/len*controlled.speed,30,W-30);controlled.y=clamp(controlled.y+dy/len*controlled.speed,30,H-30);
      if(Math.hypot(ball.x-controlled.x,ball.y-controlled.y)<controlled.r+ball.r+5){ball.vx+=dx/len*0.45;ball.vy+=dy/len*0.45}
    }
    players.forEach(p=>{
      if(p===controlled)return;
      const isChaser=p===nearest(p.team),tx=isChaser?ball.x:p.homeX+(p.team===0?Math.max(-40,Math.min(40,(ball.x-W/2)*.12)):-Math.max(-40,Math.min(40,(ball.x-W/2)*.12))),ty=isChaser?ball.y:p.homeY+(ball.y-H/2)*.08;
      const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy)||1,step=Math.min(p.speed*(isChaser?1.0:.55),d);p.x+=dx/d*step;p.y+=dy/d*step;
      if(p.team===1&&Math.hypot(ball.x-p.x,ball.y-p.y)<p.r+ball.r+4){ball.vx-=.35;ball.vy+=(Math.random()-.5)*.5}
    });
    ball.x+=ball.vx;ball.y+=ball.vy;ball.vx*=.987;ball.vy*=.987;
    if(ball.y<28||ball.y>H-28)ball.vy*=-.8;
    if(ball.x<18||ball.x>W-18){if(ball.y>245&&ball.y<315){score[ball.x>W/2?0:1]++;setupAfterGoal();$("status").textContent="GOOOOL!";updateScore()}else ball.vx*=-.8}
    ball.x=clamp(ball.x,18,W-18);ball.y=clamp(ball.y,28,H-28)
  }
  function setupAfterGoal(){players.forEach(p=>{const pos=formations[p.team][p.index];p.x=pos.x*W;p.y=pos.y*H});ball={x:W/2,y:H/2,vx:0,vy:0,r:8}}
  function loop(t){if(!running)return;const dt=Math.min(32,t-last);last=t;if(!paused)update(dt);draw();raf=requestAnimationFrame(loop)}
  $("startBtn").addEventListener("click",start);$("passBtn").addEventListener("click",()=>action("pass"));$("shootBtn").addEventListener("click",()=>action("shoot"));
  $("pauseBtn").addEventListener("click",()=>{paused=!paused;$("pauseBtn").textContent=paused?"CONTINUAR":"PAUSAR";$("status").textContent=paused?"Partida pausada":"Partida em andamento"});
  $("backBtn").addEventListener("click",()=>{running=false;cancelAnimationFrame(raf);game.classList.add("hidden");menu.classList.remove("hidden")});
  window.addEventListener("keydown",e=>{keys[e.key]=true;if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault()});window.addEventListener("keyup",e=>keys[e.key]=false);
  document.querySelectorAll("[data-dir]").forEach(btn=>{const d=btn.dataset.dir,v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[d];const on=()=>move={x:v[0],y:v[1]},off=()=>move={x:0,y:0};btn.addEventListener("pointerdown",e=>{e.preventDefault();on()});["pointerup","pointerleave","pointercancel"].forEach(ev=>btn.addEventListener(ev,off))});
  canvas.addEventListener("pointerdown",e=>{if(!running)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*W/rect.width,y=(e.clientY-rect.top)*H/rect.height;activePlayer=players.filter(p=>p.team===0&&!p.keeper).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]});
  setup();draw();
})();