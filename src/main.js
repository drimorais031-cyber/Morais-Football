import * as THREE from "three";
import { createScene } from "./scene.js?v=mf-v1-2";
import { BallPhysics } from "./physics.js?v=mf-v1-2";
import { Controls } from "./controls.js?v=mf-v1-2";
import { updateAI, updateGoalkeepers } from "./ai.js?v=mf-v1-2";
import { Match } from "./match.js?v=mf-v1-2";

const $ = selector => document.querySelector(selector);
const world = createScene();
const controls = new Controls();
const ball = new BallPhysics(world.ball);
const clock = new THREE.Clock();
const home = world.players.filter(p => p.team === 0);
let active = 1;
let charge = 0;
let wasShooting = false;
let lastSwitch = 0;

const say = message => {
  const notice = $("#notice");
  notice.textContent = message;
  clearTimeout(say.timer);
  say.timer = setTimeout(() => notice.textContent = "", 1400);
};

const match = new Match(score => {
  $("#homeScore").textContent = score.home;
  $("#awayScore").textContent = score.away;
  $("#clock").textContent = match.format();
}, say);

function select(player) {
  if (!player) return;
  active = player.id;
  world.players.forEach(p => p.ring.visible = p.id === active);
}

function nearestTeammate() {
  return home.filter(p => p.role !== "GK").sort((a, b) =>
    distance2(a.mesh.position, ball.mesh.position) -
    distance2(b.mesh.position, ball.mesh.position)
  )[0];
}

function distance2(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function teamHasPossession() {
  return home.some(p => distance2(p.mesh.position, ball.mesh.position) < 2.05);
}

function chooseReceiver(player, longPass, aim) {
  const candidates = home.filter(p => p !== player && p.role !== "GK");
  if (!candidates.length) return null;

  const aimLength = Math.hypot(aim.x, aim.z);
  const aimX = aimLength > .15 ? aim.x / aimLength : 1;
  const aimZ = aimLength > .15 ? aim.z / aimLength : 0;

  return candidates.sort((a, b) => {
    const score = target => {
      const dx = target.mesh.position.x - player.mesh.position.x;
      const dz = target.mesh.position.z - player.mesh.position.z;
      const length = Math.hypot(dx, dz) || 1;
      const directionMatch = (dx / length) * aimX + (dz / length) * aimZ;
      const forward = dx * (longPass ? 1.15 : .45);
      const distancePenalty = length * (longPass ? .34 : .68);
      const crowdPenalty = world.players
        .filter(q => q.team === 1)
        .reduce((sum, rival) => sum + (distance2(rival.mesh.position, target.mesh.position) < 3.5 ? 1.8 : 0), 0);
      return distancePenalty - directionMatch * 5 - forward * .12 + crowdPenalty;
    };
    return score(a) - score(b);
  })[0];
}

function pass(player, longPass, aim) {
  const receiver = chooseReceiver(player, longPass, aim);
  if (!receiver) return;

  const dx = receiver.mesh.position.x - player.mesh.position.x;
  const dz = receiver.mesh.position.z - player.mesh.position.z;
  const length = Math.hypot(dx, dz) || 1;
  const direction = { x: dx / length, z: dz / length };
  const power = longPass
    ? THREE.MathUtils.clamp(12 + length * .22, 14, 23)
    : THREE.MathUtils.clamp(7.5 + length * .22, 8.5, 15);

  ball.reset(player.mesh.position.x + direction.x * .85, player.mesh.position.z + direction.z * .85);
  ball.kick(direction, power, longPass ? 3.2 : .35, player.id);
  select(receiver);
}

function shoot(player, power, aim) {
  const goalDirection = { x: 50 - player.mesh.position.x, z: -player.mesh.position.z };
  const aimLength = Math.hypot(aim.x, aim.z);
  if (aimLength > .2) {
    goalDirection.z += (aim.z / aimLength) * 8;
    goalDirection.x += (aim.x / aimLength) * 3;
  }
  const directionLength = Math.hypot(goalDirection.x, goalDirection.z) || 1;
  const direction = {
    x: goalDirection.x / directionLength,
    z: goalDirection.z / directionLength
  };
  ball.reset(player.mesh.position.x + direction.x * .9, player.mesh.position.z + direction.z * .9);
  ball.kick(direction, power, 1.1 + power * .2, player.id);
}

function movePlayer(player, dt, input, controlled) {
  if (controlled) {
    const moving = Math.hypot(input.x, input.z) > .08;
    const sprinting = input.sprint && player.stamina > 1 && moving;
    const speed = sprinting ? 10.2 : 6.4;
    player.stamina = THREE.MathUtils.clamp(
      player.stamina + (sprinting ? -25 : 15) * dt, 0, 100
    );

    const response = 1 - Math.exp(-12 * dt);
    player.velocity.x += (input.x * speed - player.velocity.x) * response;
    player.velocity.z += (input.z * speed - player.velocity.z) * response;
  }

  const p = player.mesh.position;
  p.x = THREE.MathUtils.clamp(p.x + player.velocity.x * dt, -48, 48);
  p.z = THREE.MathUtils.clamp(p.z + player.velocity.z * dt, -30, 30);

  const speed = Math.hypot(player.velocity.x, player.velocity.z);
  if (speed > .25) player.mesh.rotation.y = Math.atan2(player.velocity.x, player.velocity.z);
  if (!controlled) {
    player.velocity.x *= Math.exp(-1.5 * dt);
    player.velocity.z *= Math.exp(-1.5 * dt);
  }
}

function controlBall(player, input, dt) {
  const velocity = player.velocity;
  let forwardX = input.x;
  let forwardZ = input.z;
  let forwardLength = Math.hypot(forwardX, forwardZ);

  if (forwardLength < .12) {
    forwardX = velocity.x;
    forwardZ = velocity.z;
    forwardLength = Math.hypot(forwardX, forwardZ);
  }
  if (forwardLength < .12) {
    forwardX = player.team === 0 ? 1 : -1;
    forwardZ = 0;
    forwardLength = 1;
  }

  forwardX /= forwardLength;
  forwardZ /= forwardLength;

  const targetX = player.mesh.position.x + forwardX * .95;
  const targetZ = player.mesh.position.z + forwardZ * .95;
  const blend = 1 - Math.exp(-13 * dt);

  ball.mesh.position.x += (targetX - ball.mesh.position.x) * blend;
  ball.mesh.position.z += (targetZ - ball.mesh.position.z) * blend;
  ball.mesh.position.y = .42;
  ball.v.x = velocity.x * .78;
  ball.v.z = velocity.z * .78;

  if (input.pass) pass(player, false, input);
  if (input.through) pass(player, true, input);
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .033);

  if (!match.running || match.paused) {
    world.render();
    return;
  }

  match.update(dt);
  const input = controls.read();
  let controlled = world.players[active];

  if (input.switch && performance.now() - lastSwitch > 220) {
    select(nearestTeammate());
    lastSwitch = performance.now();
    controlled = world.players[active];
  }

  const homePossession = teamHasPossession();
  if (!homePossession) {
    const closest = nearestTeammate();
    if (closest && distance2(closest.mesh.position, ball.mesh.position) + 1.25 <
        distance2(controlled.mesh.position, ball.mesh.position)) {
      select(closest);
      controlled = world.players[active];
    }
  }

  updateAI(world.players, ball.mesh.position, dt, active, homePossession);
  updateGoalkeepers(world.players, ball.mesh.position, dt);

  for (const player of world.players) {
    movePlayer(player, dt, input, player.id === active);
  }

  const ballDistance = distance2(controlled.mesh.position, ball.mesh.position);
  if (ballDistance < 1.75 && ball.mesh.position.y < 1.35) {
    controlBall(controlled, input, dt);
  }

  const closeEnoughToShoot = ballDistance < 2.2 && ball.mesh.position.y < 1.5;
  if (input.shoot && closeEnoughToShoot) {
    charge = Math.min(100, charge + 72 * dt);
  }
  if (wasShooting && !input.shoot && charge > 0 && closeEnoughToShoot) {
    shoot(controlled, 10 + charge * .13, input);
    charge = 0;
  }
  wasShooting = input.shoot;

  ball.update(dt, world.players, scoringTeam => {
    match.goal(scoringTeam);
    ball.reset();
    world.players.forEach(player => {
      player.mesh.position.set(player.home.x, 0, player.home.z);
      player.velocity = { x: 0, z: 0 };
    });
    select(home[1]);
  });

  $("#power").style.width = charge + "%";
  $("#stamina").style.width = controlled.stamina + "%";
  world.follow(ball.mesh.position, dt);
  world.render();
}

$("#play").onclick = () => {
  match.start();
  ball.reset();
  world.players.forEach(player => {
    player.mesh.position.set(player.home.x, 0, player.home.z);
    player.velocity = { x: 0, z: 0 };
    player.stamina = 100;
  });
  select(home[1]);
  $("#start").style.display = "none";
  say("BOLA ROLANDO!");
};

addEventListener("resize", () => world.resize());
world.resize();
loop();
