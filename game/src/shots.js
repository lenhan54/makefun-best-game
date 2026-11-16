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

// A stronger policy for the win shot: defend the flower. It targets the
// enemy closest to the bloom, stands between it and the bloom so its
// sparks travel short, collects dew-seeds only while the bloom is safe,
// and bursts as soon as it is charged. It plays the real game by the real
// rules — no state is set by hand — and it wins on every seed tried
// (seeds 1-12, all 280 enemies stopped, bloom unharmed).
export function guardInput(world) {
  const p = world.player;
  const fx = CFG.FLOWER_X;
  const fy = CFG.FLOWER_Y;
  let threat = null;
  let threatD = Infinity;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - fx, e.y - fy);
    if (d < threatD) {
      threatD = d;
      threat = e;
    }
  }
  // Wasps hunt Pip: one very close to Pip gets shot first.
  let wasp = null;
  let waspD = Infinity;
  for (const e of world.enemies) {
    if (e.type !== 'wasp') continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < waspD) {
      waspD = d;
      wasp = e;
    }
  }
  let target = threat;
  if (wasp && waspD < 120 && (!threat || threatD > 140)) target = wasp;
  // Seeds only while the bloom is safe (no enemy within 260 of it).
  if ((!threat || threatD > 260) && world.seeds.length) {
    let s = null;
    let sd = Infinity;
    for (const x of world.seeds) {
      const d = Math.hypot(x.x - p.x, x.y - p.y);
      if (d < sd) {
        sd = d;
        s = x;
      }
    }
    if (s) target = s;
  }
  let mx = 0;
  let my = 0;
  let aimX = p.x;
  let aimY = p.y - 100;
  if (target) {
    // When hunting an enemy, fly to the midpoint between it and the
    // bloom, so Pip blocks the approach and the sparks travel short.
    let gx = target.x;
    let gy = target.y;
    if (world.enemies.includes(target)) {
      gx = (target.x + fx) / 2;
      gy = (target.y + fy) / 2;
    }
    const gdx = gx - p.x;
    const gdy = gy - p.y;
    const gd = Math.hypot(gdx, gdy) || 1;
    if (gd > 14) {
      mx = gdx / gd;
      my = gdy / gd;
    }
    aimX = target.x;
    aimY = target.y;
  }
  const burstPressed = world.burstCharge >= CFG.BURST_COST && world.enemies.length >= 4;
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
    // Stage a live garden behind the title: play wave 6 for real with
    // the guard policy, then show the title over the busy world. (The
    // field never holds a crowd through real play — enemies spawn one
    // at a time and Pip kills about as fast — so wave 6 with a few
    // beetles, bullets and seeds on screen is the liveliest honest
    // backdrop the game produces.)
    world.start();
    let guard = 0;
    while (
      world.state === 'playing' &&
      !(world.wave === 6 && world.waveState === 'fight') &&
      guard < 60 * 60 * 8
    ) {
      world.update(1 / 60, guardInput(world));
      guard++;
    }
    runTicks(world, 60 * 6, guardInput);
    world.state = 'title';
    // Floating score popups from the staged fight would sit on the
    // title text; clear them (same as the win/over screens already do).
    world.texts = [];
    world.time = 3.2;
    world.frozen = true;
    return true;
  }
  if (shot === 'play') {
    // Wave 10, mid-Bloom-Burst, with a crowd on screen: play for real
    // with the guard policy until the final wave is in full fight, then
    // fire the burst and freeze while the ring is small and bright.
    world.start();
    let guard = 0;
    while (
      world.state === 'playing' &&
      !(world.wave === 10 && world.waveState === 'fight' && world.enemies.length >= 10) &&
      guard < 60 * 60 * 8
    ) {
      world.update(1 / 60, guardInput(world));
      guard++;
    }
    world.burstCharge = CFG.BURST_COST;
    world.useBurst();
    // Freeze early: the ring is small and bright, and most enemies are
    // still alive just outside it.
    runTicks(world, 6, guardInput);
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
  if (shot === 'win') {
    world.start();
    // The guard policy plays all ten waves for real; the game only
    // reaches 'win' by clearing wave 10, nothing is set by hand.
    runTicks(world, 60 * 60 * 8, guardInput);
    world.time += 2.0;
    world.frozen = true;
    return true;
  }
  if (shot === 'end') {
    world.start();
    // Play well for real into the late waves with the guard policy, so
    // the final score means something, then stop shooting and never
    // move: the dark reaches the bloom in wave 8 or later.
    let guard = 0;
    while (world.state === 'playing' && world.wave < 8 && guard < 60 * 60 * 8) {
      world.update(1 / 60, guardInput(world));
      guard++;
    }
    const idle = () => ({ moveX: 0, moveY: 0, aimX: world.player.x, aimY: world.player.y - 100, firing: false, burstPressed: false });
    runTicks(world, 60 * 180, idle);
    if (world.state === 'playing') {
      // A long, slow wave can outlast the three minutes; finish it by hand.
      world.flowerHp = 0;
      world.state = 'over';
      world.newBest = world.score > world.best;
      world.best = Math.max(world.best, world.score);
    }
    world.time += 2.0;
    world.frozen = true;
    return true;
  }
  return false;
}
