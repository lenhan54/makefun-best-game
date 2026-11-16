// Seeded random numbers (mulberry32). The simulation never touches
// Math.random, so a seed replays the exact same garden every time —
// that is what makes the screenshot states deterministic.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rand(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function randInt(rng, lo, hi) {
  return Math.floor(rand(rng, lo, hi + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function chance(rng, p) {
  return rng() < p;
}

// A point on the edge of the playfield, for spawning enemies.
export function edgePoint(rng, w, h, margin) {
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: rand(rng, margin, w - margin), y: -margin };
  if (side === 1) return { x: rand(rng, margin, w - margin), y: h + margin };
  if (side === 2) return { x: -margin, y: rand(rng, margin, h - margin) };
  return { x: w + margin, y: rand(rng, margin, h - margin) };
}
