// Screenshot states: ?shot=start|play|burst|end&seed=N
// The game runs its own simulation for a fixed number of ticks from the
// seed, with a simple autopilot flying Pip, then freezes. The frame the
// browser captures is a real render of the game's own code, just staged
// deterministically so the screenshots are reproducible.
import { CFG } from './config.js';

export function parseShot() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  return { shot, seed: Number(q.get('seed') || 1) };
}

// A simple policy that plays the game: chase the nearest dew-seed,
// otherwise close on the nearest enemy and shoot it.
export function autopilotInput(world) {
  const p = world.player;
  let target = null;
  let best = Infinity;
  for (const s of world.seeds) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < best) {
      best = d;
      target = s;
    }
  }
  if (!target) {
    for (const e of world.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < best) {
        best = d;
        target = e;
      }
    }
  }
  let mx = 0;
  let my = 0;
  let aimX = p.x;
  let aimY = p.y - 100;
  if (target) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    // Keep some distance from enemies, close in on seeds.
    const want = target.radius !== undefined && world.enemies.includes(target) ? 190 : 30;
    if (d > want + 12) {
      mx = dx / d;
      my = dy / d;
    } else if (d < want - 30) {
      mx = -dx / d;
      my = -dy / d;
    }
    aimX = target.x;
    aimY = target.y;
  }
  const burstPressed = world.burstCharge >= CFG.BURST_COST && world.enemies.length >= 6;
  return { moveX: mx, moveY: my, aimX, aimY, firing: true, burstPressed };
}

// Run the simulation a fixed number of 60 Hz ticks.
export function runTicks(world, ticks, inputFn) {
  for (let i = 0; i < ticks; i++) {
    if (world.state !== 'playing') break;
    world.update(1 / 60, inputFn(world));
  }
}

// Stage one of the four screenshot states, then freeze the world so
// the captured frame is stable. Returns true when a shot was staged.
export function applyShot(world, { shot, seed }) {
  if (shot === 'start') {
    world.state = 'title';
    world.time = 3.2;
    world.frozen = true;
    return true;
  }
  if (shot === 'play') {
    world.start();
    runTicks(world, 60 * 11, autopilotInput);
    world.frozen = true;
    return true;
  }
  if (shot === 'burst') {
    world.start();
    // Further in, so the garden is busy when the burst goes off.
    runTicks(world, 60 * 24, autopilotInput);
    world.burstCharge = CFG.BURST_COST;
    world.useBurst();
    // Freeze early: the ring is small and bright, and most enemies are
    // still alive just outside it.
    runTicks(world, 6, autopilotInput);
    world.frozen = true;
    return true;
  }
  if (shot === 'end') {
    world.start();
    // Pip plays well for a while, so the final score means something,
    // then stops shooting and never moves: the dark reaches the bloom.
    runTicks(world, 60 * 25, autopilotInput);
    const idle = () => ({ moveX: 0, moveY: 0, aimX: world.player.x, aimY: world.player.y - 100, firing: false, burstPressed: false });
    runTicks(world, 60 * 60, idle);
    if (world.state === 'playing') {
      // A long, slow wave can outlast the minute; finish it by hand.
      world.flowerHp = 0;
      world.state = 'over';
      world.best = Math.max(world.best, world.score);
    }
    world.time += 2.0;
    world.frozen = true;
    return true;
  }
  return false;
}
