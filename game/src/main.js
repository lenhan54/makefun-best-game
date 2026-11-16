// Ember Bloom — boot, the frame loop and the state machine. The
// simulation lives in world.js, the drawing in render.js; this file
// only wires them to the browser.
import { CFG } from './config.js';
import { World } from './world.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { drawFrame } from './render.js';
import { parseShot, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

// The screenshot query (?shot=...&seed=N) picks the world's seed, so a
// staged frame replays exactly; normal play uses the fixed house seed.
const earlyShot = parseShot();
const world = new World(earlyShot ? earlyShot.seed : 20261116);
const sfx = new Sfx();
let best = 0;
try {
  best = Number(window.localStorage.getItem('ember-bloom-best') || 0) || 0;
} catch {
  best = 0;
}
world.best = best;

// The canvas fills the window; the logical 960x540 garden is
// letterboxed inside it, and the mouse is mapped back through it.
let view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const scale = Math.min(canvas.width / CFG.LOGICAL_W, canvas.height / CFG.LOGICAL_H);
  view = {
    scale,
    ox: (canvas.width - CFG.LOGICAL_W * scale) / 2,
    oy: (canvas.height - CFG.LOGICAL_H * scale) / 2,
    w: canvas.width,
    h: canvas.height,
  };
}
window.addEventListener('resize', resize);
resize();

function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const px = (clientX - rect.left) * (canvas.width / rect.width);
  const py = (clientY - rect.top) * (canvas.height / rect.height);
  return {
    x: (px - view.ox) / view.scale,
    y: (py - view.oy) / view.scale,
  };
}
const input = new Input(canvas, toLogical);

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function playEvents() {
  for (const e of world.events) {
    if (e === 'shoot') sfx.shoot();
    else if (e === 'hit') sfx.hit();
    else if (e === 'kill') sfx.kill();
    else if (e === 'seed') sfx.seed();
    else if (e === 'burst') sfx.burst();
    else if (e === 'damage') sfx.damage();
    else if (e === 'wave') sfx.wave();
    else if (e === 'over') sfx.gameOver();
    else if (e === 'win') sfx.win();
  }
  world.events.length = 0;
}

function saveBest() {
  if (world.score > best) {
    best = world.score;
    world.best = best;
    try {
      window.localStorage.setItem('ember-bloom-best', String(best));
    } catch {
      // Private mode or no storage: the best score just lives for the session.
    }
  }
}

function startGame() {
  sfx.ensure();
  sfx.click();
  world.start();
  announce('Playing Ember Bloom. Guard the flower.');
}

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;

  // Menus still need a clock for their pulsing and twinkling.
  if (world.state !== 'playing') world.time += dt;

  if (input.wasPressed('KeyM')) {
    const muted = sfx.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }

  if (world.state === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed('Space') || input.mouseDown) {
      startGame();
    }
  } else if (world.state === 'playing') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      world.state = 'paused';
      announce('Paused. Press P to keep playing.');
    } else {
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard < 5) {
        const burstPressed = input.wasPressed('KeyE') || input.rightDown;
        const move = input.moveAxis();
        world.update(STEP, {
          moveX: move.x,
          moveY: move.y,
          aimX: input.mouseX,
          aimY: input.mouseY,
          firing: input.firing(),
          burstPressed,
        });
        acc -= STEP;
        guard++;
        if (world.state !== 'playing') {
          saveBest();
          announce(world.state === 'win' ? 'You saved the garden!' : 'The bloom has faded.');
          break;
        }
      }
      if (guard >= 5) acc = 0;
      playEvents();
    }
  } else if (world.state === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      world.state = 'playing';
      announce('Playing Ember Bloom.');
    }
  } else if (world.state === 'over' || world.state === 'win') {
    if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.mouseDown) {
      startGame();
    }
  }

  // Draw the logical garden letterboxed in the real canvas.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07081e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  drawFrame(ctx, world, CFG.LOGICAL_W, CFG.LOGICAL_H);
  input.endFrame();
}

// Screenshot mode (?shot=...): stage a deterministic frame, render it
// once, and keep rendering the frozen frame. The page signals readiness
// for the screenshot tool through window.__shotReady.
const shot = earlyShot;
if (shot && applyShot(world, shot)) {
  resize();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07081e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  drawFrame(ctx, world, CFG.LOGICAL_W, CFG.LOGICAL_H);
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
