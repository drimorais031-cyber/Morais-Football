export const FIELD = { length: 100, width: 64, goalWidth: 14, goalHeight: 5.2, goalDepth: 3 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class BallPhysics {
  constructor(mesh) {
    this.mesh = mesh;
    this.v = { x: 0, y: 0, z: 0 };
    this.radius = .42;
    this.cooldown = 0;
    this.lastTouch = -1;
    this.targetPlayerId = -1;
  }

  kick(direction, power, lift = .4, playerId = -1, receiverId = -1) {
    const length = Math.hypot(direction.x, direction.z) || 1;
    this.v.x = direction.x / length * power;
    this.v.z = direction.z / length * power;
    this.v.y = lift;
    this.lastTouch = playerId;
    this.targetPlayerId = receiverId;
  }

  trapAtPlayer(player) {
    const p = this.mesh.position;
    const moving = Math.hypot(player.velocity?.x || 0, player.velocity?.z || 0) > .35;
    const angle = moving
      ? Math.atan2(player.velocity.x, player.velocity.z)
      : player.mesh.rotation.y;
    p.x = player.mesh.position.x + Math.sin(angle) * .88;
    p.z = player.mesh.position.z + Math.cos(angle) * .88;
    p.y = this.radius;
    this.v.x = 0;
    this.v.y = 0;
    this.v.z = 0;
    this.lastTouch = player.id;
    this.targetPlayerId = -1;
  }

  collideWithFrame(p, v) {
    const goalLine = Math.abs(p.x) >= 49.45;
    if (!goalLine) return false;

    const nearPost = Math.abs(Math.abs(p.z) - 7) < .62 && p.y < 5.8;
    if (nearPost) {
      p.z = Math.sign(p.z || 1) * 7.62;
      v.z = -Math.sign(p.z) * Math.max(Math.abs(v.z) * .68, 1.5);
      v.x *= .72;
      return true;
    }

    const underBar = Math.abs(p.z) < 7.5 && p.y > 4.72 && p.y < 5.85;
    if (underBar) {
      p.y = 4.72;
      v.y = -Math.abs(v.y) * .48;
      v.x *= .72;
      return true;
    }
    return false;
  }

  update(dt, players, onGoal, controlledPlayerId = -1) {
    const p = this.mesh.position;
    const v = this.v;
    this.cooldown = Math.max(0, this.cooldown - dt);

    p.x += v.x * dt;
    p.y += v.y * dt;
    p.z += v.z * dt;

    const airborne = p.y > this.radius + .015;
    if (airborne) {
      v.y -= 19.2 * dt;
      v.x *= Math.exp(-.12 * dt);
      v.z *= Math.exp(-.12 * dt);
    } else {
      p.y = this.radius;
      if (v.y < 0) {
        v.y = -v.y * .34;
        if (v.y < 1.05) v.y = 0;
      }
      const speed = Math.hypot(v.x, v.z);
      const reduced = Math.max(0, speed - 1.85 * dt);
      if (speed > .001) {
        v.x *= reduced / speed;
        v.z *= reduced / speed;
      }
    }

    if (Math.abs(p.z) > 31.55) {
      p.z = clamp(p.z, -31.55, 31.55);
      v.z *= -.72;
    }

    this.collideWithFrame(p, v);

    // Domínio orientado: o jogador escolhido para receber o passe amortece
    // a bola ao chegar, em vez de sofrer uma colisão que a lança para a frente.
    const receiver = this.targetPlayerId >= 0
      ? players.find(player => player.id === this.targetPlayerId)
      : null;
    if (receiver) {
      const d = Math.hypot(p.x - receiver.mesh.position.x, p.z - receiver.mesh.position.z);
      if (d < 1.9 && p.y < 2.8) this.trapAtPlayer(receiver);
    } else {
      // Também permite dominar uma bola mansa que chega ao jogador controlado.
      const controlled = players.find(player => player.id === controlledPlayerId);
      if (controlled) {
        const d = Math.hypot(p.x - controlled.mesh.position.x, p.z - controlled.mesh.position.z);
        if (d < 1.42 && p.y < 1.65 && Math.hypot(v.x, v.z) < 13) this.trapAtPlayer(controlled);
      }
    }

    const insideMouth = Math.abs(p.z) < 6.55 && p.y < 5.05;
    if (Math.abs(p.x) > 50 && insideMouth && this.cooldown <= 0) {
      onGoal(p.x > 0 ? 0 : 1);
      this.cooldown = 2.2;
    } else if (Math.abs(p.x) > 49.65 && !insideMouth) {
      p.x = clamp(p.x, -49.65, 49.65);
      v.x *= -.68;
    } else if (Math.abs(p.x) > 53) {
      p.x = Math.sign(p.x) * 53;
      v.x *= -.45;
    }

    for (const player of players) {
      const dx = p.x - player.mesh.position.x;
      const dz = p.z - player.mesh.position.z;
      const distance = Math.hypot(dx, dz);
      const minimum = player.role === "GK" ? 1.55 : .42 + player.radius;
      const maxHeight = player.role === "GK" ? 3.1 : 1.45;

      if (distance < minimum && p.y < maxHeight) {
        const nx = dx / (distance || 1);
        const nz = dz / (distance || 1);
        p.x = player.mesh.position.x + nx * minimum;
        p.z = player.mesh.position.z + nz * minimum;
        const impact = v.x * nx + v.z * nz;
        if (impact < 0) {
          v.x -= 1.75 * impact * nx;
          v.z -= 1.75 * impact * nz;
        }
        if (player.role === "GK" && p.y > 1.2) v.y = Math.max(v.y, 2.2);
      }
    }

    this.mesh.rotation.x += v.z * dt / this.radius;
    this.mesh.rotation.z -= v.x * dt / this.radius;
  }

  reset(x = 0, z = 0) {
    this.mesh.position.set(x, this.radius, z);
    this.v = { x: 0, y: 0, z: 0 };
    this.targetPlayerId = -1;
    this.lastTouch = -1;
  }

  get speed() {
    return Math.hypot(this.v.x, this.v.z);
  }
}
