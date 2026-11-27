export class Match{
  constructor(update,message){
    this.home=0;this.away=0;this.elapsed=0;this.duration=360;this.halfDuration=180;
    this.half=1;this.kickoffTeam=0;this.running=false;this.pause=0;
    this.updateUI=update;this.message=message;
  }
  start(){
    this.home=this.away=this.elapsed=0;this.half=1;this.kickoffTeam=0;
    this.pause=0;this.running=true;this.publish();
  }
  update(dt){
    if(!this.running)return;
    if(this.pause>0){this.pause=Math.max(0,this.pause-dt);return;}
    this.elapsed+=dt;
    if(this.half===1&&this.elapsed>=this.halfDuration){
      this.elapsed=this.halfDuration;this.half=2;this.kickoffTeam=1;this.pause=3;
      this.message("INTERVALO! 2º TEMPO: saída de bola dos adversários.");
      this.publish();return;
    }
    if(this.elapsed>=this.duration){
      this.elapsed=this.duration;this.running=false;this.message("FIM DE JOGO");
    }
    this.publish();
  }
  goal(team){
    if(!this.running||this.pause>0)return;
    if(team===0)this.home++;else this.away++;
    this.kickoffTeam=1-team;this.pause=2;
    this.message(team===0?"GOOOOL! MORAIS FC":"GOL DOS RIVAIS");this.publish();
  }
  get paused(){return this.pause>0;}
  format(){
    const matchSeconds=Math.min(5400,Math.floor(this.elapsed*15));
    const minutes=Math.floor(matchSeconds/60),seconds=matchSeconds%60;
    return String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
  }
  publish(){this.updateUI({home:this.home,away:this.away,time:this.elapsed,half:this.half});}
}