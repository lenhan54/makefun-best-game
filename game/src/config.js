// Ember Bloom — tuning and palette. One place for every number the
// designers (me) tweak; the simulation and the renderer both read it.
export const CFG = {
  // Logical playfield. The renderer letterboxes this into any window.
  LOGICAL_W: 960,
  LOGICAL_H: 540,

  // The flower at the heart of the garden.
  FLOWER_X: 480,
  FLOWER_Y: 270,
  FLOWER_RADIUS: 34,
  FLOWER_HP: 3,

  // Pip, the firefly you fly.
  PLAYER_SPEED: 275,
  PLAYER_RADIUS: 12,
  PLAYER_ACCEL: 2600,

  // Pollen sparks.
  BULLET_SPEED: 580,
  BULLET_RADIUS: 4,
  FIRE_INTERVAL: 0.12,

  // Bloom Burst: needs a full charge, wipes the screen.
  BURST_COST: 100,
  BURST_RADIUS: 260,
  SEED_CHARGE: 14,

  // Waves. Ten waves, then the garden is saved.
  WAVE_COUNT: 10,
  COMBO_WINDOW: 2.5,
  COMBO_STEP: 0.1,
  COMBO_MAX: 3.0,
  SEED_DROP_CHANCE: 0.45,
  SEED_SCORE: 25,
};

// How many enemies each wave sends, and how fast they arrive.
export function waveEnemyCount(wave) {
  return 6 + 4 * wave;
}
export function waveSpawnInterval(wave) {
  return Math.max(0.35, 1.15 - 0.07 * wave);
}
export function waveSpeedBonus(wave) {
  return 1 + 0.05 * (wave - 1);
}

// The four things that crawl out of the dark, by wave.
export const ENEMY_TYPES = {
  mite: { hp: 1, speed: 58, radius: 10, score: 50, color: '#ff5d5d' },
  spore: { hp: 2, speed: 40, radius: 13, score: 100, color: '#c77dff' },
  beetle: { hp: 3, speed: 27, radius: 17, score: 150, color: '#ff9f1c' },
  wasp: { hp: 1, speed: 98, radius: 10, score: 120, color: '#ffe66d' },
};

// Which enemies a wave may contain (wasps join from wave 4).
export function waveRoster(wave) {
  const roster = ['mite', 'mite', 'spore', 'beetle'];
  if (wave >= 2) roster.push('spore', 'mite');
  if (wave >= 3) roster.push('beetle', 'spore');
  if (wave >= 4) roster.push('wasp', 'wasp');
  if (wave >= 6) roster.push('beetle', 'wasp');
  if (wave >= 8) roster.push('wasp', 'beetle', 'spore');
  return roster;
}

export const PALETTE = {
  skyTop: '#12082e',
  skyBottom: '#0a2e2a',
  grass: '#0d3b2e',
  grassDark: '#082a20',
  hudText: '#eaf6ff',
  hudDim: '#9db8c9',
  gold: '#ffd166',
  bloomPetal: '#ff5d8f',
  bloomCore: '#ffd166',
  player: '#b8ff5d',
  playerGlow: '#d8ff9e',
  bullet: '#7ef9ff',
  seed: '#7ef9ff',
  burst: '#fff3b0',
};
