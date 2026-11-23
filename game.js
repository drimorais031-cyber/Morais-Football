(() => {
  const $ = id => document.getElementById(id);
  const menu=$("menu"), game=$("game"), canvas=$("pitch"), ctx=canvas.getContext("2d");
  const W=900,H=560, GOAL_TOP=225, GOAL_BOTTOM=335;
  let players=[],ball,keys={},score=[0,0],seconds=0,running=false,paused=false,last=0,raf=0;
  let move={x:0,y:0},activePlayer=null,matchEnded=false,kickoffTimer=0,sprinting=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const formations=[
    [{x:.08,y:.50},{x:.23,y:.18},{x:.23,y:.39},{x:.23,y:.61},{x:.23,y:.82},{x:.42,y:.17},{x:.42,y:.39},{x:.42,y:.61},{x:.42,y:.83},{x:.60,y:.36},{x:.60,y:.64}],
    [{x:.92,y:.50},{x:.77,y:.18},{x:.77,y:.39},{x:.77,y:.61},{x:.77,y:.82},{x:.58,y:.17},{x:.58,y:.39},{x:.58,y:.61},{x:.58,y:.83},{x:.40,y:.36},{x:.40,y:.64}]
  ];
  const teamNames=["Morais FC","Rivais FC","Apucarana","São Paulo","Palmeiras","Santos","Flamengo","Corinthians","Brasil","Argentina"];
  for(const id of ["homeTeam","awayTeam"]) teamNames.forEach(n=>{if(![...$(id).options].some(o=>o.value===n)){const o=document.createElement("option");o.textContent=n;o.value=n;$(id).append(o)}});
  const teamColor=t=>t===0?"#d9f34e":"#f5f5f5";
  function makePlayer(x,y,team,index){return {x,y,homeX:x,homeY:y,team,index,keeper:index===0,r:index===0?13:10,speed:index===0?2.3:2.65,face:team===0?1:-1};}
  function setup(){
    players=[];
    for(let t=0;t<2;t++) formations[t].forEach((pos,i)=>players.push(makePlayer(pos.x*W,pos.y*H,t,i)));
    ball={x:W/2,y:H/2,vx:0,vy:0,r:8,owner:null};
    activePlayer=players.find(p=>p.team===0&&p.index===9);
    kickoffTimer=700;updateScore();
  }
  function updateScore(){
    $("homeScore").textContent=score[0];$("awayScore").textContent=score[1];
    $("clock").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(Math.floor(seconds%60)).padStart(2,"0");
  }
  function start(){
    if(window.matchMedia("(max-width: 700px)").matches && screen.orientation && screen.orientation.lock){
      screen.orientation.lock("landscape").catch(()=>{});
    }
    $("homeLabel").textContent=$("homeTeam").value.toUpperCase();$("awayLabel").textContent=$("awayTeam").value.toUpperCase();
    menu.classList.add("hidden");game.classList.remove("hidden");
    score=[0,0];seconds=0;matchEnded=false;setup();running=true;paused=false;
    $("status").textContent="Partida em andamento";$("pauseBtn").textContent="PAUSAR";
    last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?"#197441":"#1c7d47";ctx.fillRect(i*90,0,90,H)}
    ctx.strokeStyle="#e8f3e7";ctx.lineWidth=3;ctx.strokeRect(18,18,W-36,H-36);
    ctx.beginPath();ctx.moveTo(W/2,18);ctx.lineTo(W/2,H-18);ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,H/2,75,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,H/2,4,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
    ctx.strokeRect(18,155,145,250);ctx.strokeRect(W-163,155,145,250);
    ctx.strokeRect(18,215,55,130);ctx.strokeRect(W-73,215,55,130);
    ctx.fillStyle="#d8f0dc";ctx.fillRect(0,GOAL_TOP,18,GOAL_BOTTOM-GOAL_TOP);ctx.fillRect(W-18,GOAL_TOP,18,GOAL_BOTTOM-GOAL_TOP);
    ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle="#fff";ctx.lineWidth=1;
    for(let y=GOAL_TOP;y<GOAL_BOTTOM;y+=12){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(18,y);ctx.stroke();ctx.beginPath();ctx.moveTo(W-18,y);ctx.lineTo(W,y);ctx.stroke()}ctx.restore();
    players.forEach(p=>{
      ctx.beginPath();ctx.fillStyle="#0005";ctx.ellipse(p.x+2,p.y+5,p.r+2,p.r*.7,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.fillStyle=teamColor(p.team);ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      ctx.lineWidth=p.keeper?3:2;ctx.strokeStyle=p.keeper?"#f5b642":(p.team===0?"#324c19":"#c52d32");ctx.stroke();
      if(p===activePlayer){ctx.beginPath();ctx.arc(p.x,p.y,p.r+6,0,Math.PI*2);ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke()}
      ctx.fillStyle="#17251a";ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillText(p.keeper?"G":String(p.index),p.x,p.y+3);
    });
    ctx.beginPath();ctx.fillStyle="#0006";ctx.ellipse(ball.x+2,ball.y+5,ball.r+2,ball.r*.7,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.fillStyle="#fff";ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#222";ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(ball.x-4,ball.y);ctx.lineTo(ball.x+4,ball.y);ctx.moveTo(ball.x,ball.y-4);ctx.lineTo(ball.x,ball.y+4);ctx.stroke();
  }
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function nearest(team,includeKeeper=false){return players.filter(p=>p.team===team&&(includeKeeper||!p.keeper)).sort((a,b)=>dist(a,ball)-dist(b,ball))[0]}
  function selectNearest(){activePlayer=nearest(0);$("status").textContent="Jogador selecionado";}
  function action(type){
    if(!running||paused||matchEnded)return;
    const p=activePlayer||nearest(0);if(!p)return;
    const d=dist(p,ball);
    if(d>58){$("status").textContent="Chegue mais perto da bola!";return}
    const dir=p.face||1;
    if(type==="shoot"){
      const targetX=dir===1?W-10:10,targetY=clamp(H/2+(ball.y-H/2)*.38,GOAL_TOP+12,GOAL_BOTTOM-12);
      const dx=targetX-ball.x,dy=targetY-ball.y,len=Math.hypot(dx,dy)||1;
      ball.vx=dx/len*12.5;ball.vy=dy/len*12.5;ball.owner=null;
      $("status").textContent="CHUTE! ⚽";
    }else{
      const mates=players.filter(q=>q.team===p.team&&q!==p&&!q.keeper);
      const target=mates.sort((a,b)=>((b.x-p.x)*dir)-((a.x-p.x)*dir))[0];
      if(target){const dx=target.x-ball.x,dy=target.y-ball.y,len=Math.hypot(dx,dy)||1;ball.vx=dx/len*8.5;ball.vy=dy/len*8.5;ball.owner=null}
      $("status").textContent="Passe!";
    }
  }
  function movePlayer(p,dx,dy,scale){
    const len=Math.hypot(dx,dy);if(!len)return;
    p.x=clamp(p.x+dx/len*p.speed*scale,30,W-30);p.y=clamp(p.y+dy/len*p.speed*scale,30,H-30);
    if(Math.abs(dx)>.1)p.face=dx>0?1:-1;
  }
  function resetAfterGoal(){
    players.forEach(p=>{p.x=p.homeX;p.y=p.homeY});
    ball={x:W/2,y:H/2,vx:0,vy:0,r:8,owner:null};activePlayer=players.find(p=>p.team===0&&p.index===9);kickoffTimer=1100;
  }
  function update(dt){
    const scale=Math.min(dt/16.667,2.2);seconds+=dt/1000;updateScore();
    if(seconds>=180){matchEnded=true;$("status").textContent="FIM DE JOGO! "+(score[0]===score[1]?"Empate":score[0]>score[1]?"Morais FC venceu!":"O adversário venceu!");return}
    if(kickoffTimer>0){kickoffTimer-=dt;return}
    const controlled=activePlayer||nearest(0);
    if(controlled){
      let dx=move.x,dy=move.y;
      if(keys.ArrowLeft||keys.a||keys.A)dx=-1;if(keys.ArrowRight||keys.d||keys.D)dx=1;
      if(keys.ArrowUp||keys.w||keys.W)dy=-1;if(keys.ArrowDown||keys.s||keys.S)dy=1;
      movePlayer(controlled,dx,dy,scale*(sprinting?1.65:1));
      if(dist(controlled,ball)<controlled.r+ball.r+7){
        ball.x=controlled.x+controlled.face*18;ball.y=controlled.y+clamp((ball.y-controlled.y)*.45,-12,12);
        ball.vx=controlled.face*1.1;ball.vy*=.6;
      }
    }
    players.forEach(p=>{
      if(p===controlled)return;
      let tx=p.homeX,ty=p.homeY;
      if(p.keeper){
        const goalX=p.team===0?48:W-48;
        tx=goalX;ty=clamp(ball.y,GOAL_TOP+18,GOAL_BOTTOM-18);
        if((p.team===0&&ball.x<260)||(p.team===1&&ball.x>W-260))tx=clamp(ball.x,goalX-35,goalX+35);
      }else{
        const chaser=nearest(p.team);
        if(p===chaser){tx=ball.x;ty=ball.y}
        else{tx=p.homeX+(ball.x-W/2)*(p.team===0?.13:-.13);ty=p.homeY+(ball.y-H/2)*.10}
      }
      const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy)||1,step=Math.min(p.speed*scale*(p===nearest(p.team)?1.05:.55),d);
      p.x+=dx/d*step;p.y+=dy/d*step;
      if(p.team===1&&!p.keeper&&dist(p,ball)<p.r+ball.r+8){
        const attackDir=-1;ball.vx=attackDir*(p.keeper?0:3.5);ball.vy=(Math.random()-.5)*3;ball.owner=null;
      }
    });
    ball.x+=ball.vx*scale;ball.y+=ball.vy*scale;ball.vx*=Math.pow(.985,scale);ball.vy*=Math.pow(.985,scale);
    if(ball.y<27||ball.y>H-27){ball.y=clamp(ball.y,27,H-27);ball.vy*=-.78}
    if(ball.x<18||ball.x>W-18){
      if(ball.y>GOAL_TOP&&ball.y<GOAL_BOTTOM){
        const scorer=ball.x>W/2?0:1;score[scorer]++;$("status").textContent="GOOOOL! ⚽";updateScore();resetAfterGoal();
      }else{ball.x=clamp(ball.x,18,W-18);ball.vx*=-.72}
    }
    ball.x=clamp(ball.x,18,W-18);ball.y=clamp(ball.y,27,H-27);
  }
  function loop(t){if(!running)return;const dt=Math.min(40,t-last);last=t;if(!paused&&!matchEnded)update(dt);draw();raf=requestAnimationFrame(loop)}
  $("startBtn").addEventListener("click",start);
  $("passBtn").addEventListener("click",()=>action("pass"));$("shootBtn").addEventListener("click",()=>action("shoot"));
  $("switchBtn").addEventListener("click",selectNearest);
  const sprintBtn=$("sprintBtn");
  sprintBtn.addEventListener("pointerdown",e=>{e.preventDefault();sprinting=true;sprintBtn.classList.add("pressed")});
  ["pointerup","pointerleave","pointercancel","lostpointercapture"].forEach(ev=>sprintBtn.addEventListener(ev,()=>{sprinting=false;sprintBtn.classList.remove("pressed")}));
  $("pauseBtn").addEventListener("click",()=>{if(matchEnded)return;paused=!paused;$("pauseBtn").textContent=paused?"CONTINUAR":"PAUSAR";$("status").textContent=paused?"Partida pausada":"Partida em andamento"});
  $("backBtn").addEventListener("click",()=>{running=false;cancelAnimationFrame(raf);game.classList.add("hidden");menu.classList.remove("hidden")});
  window.addEventListener("keydown",e=>{keys[e.key]=true;if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();if(e.key===" "){action("shoot")}if(e.key==="x"||e.key==="X")action("pass")});
  window.addEventListener("keyup",e=>keys[e.key]=false);
  document.querySelectorAll("[data-dir]").forEach(btn=>{
    const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[btn.dataset.dir];
    const on=e=>{e.preventDefault();move={x:v[0],y:v[1]}},off=()=>{move={x:0,y:0}};
    btn.addEventListener("pointerdown",on);["pointerup","pointerleave","pointercancel","lostpointercapture"].forEach(ev=>btn.addEventListener(ev,off));
  });
  canvas.addEventListener("pointerdown",e=>{
    if(!running||paused)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*W/rect.width,y=(e.clientY-rect.top)*H/rect.height;
    const candidates=players.filter(p=>p.team===0&&!p.keeper);
    activePlayer=candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
    $("status").textContent="Controle: jogador "+activePlayer.index;
  });
  setup();draw();
})();