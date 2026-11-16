// Ember Bloom — every pixel the player sees. The renderer only reads
// the world; it never changes it.
import { CFG, PALETTE, ENEMY_TYPES } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawBackground(ctx, world, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Twinkling stars.
  for (const s of world.ambient) {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(world.time * s.sp + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe8ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Grassy silhouette along the bottom.
  ctx.fillStyle = PALETTE.grassDark;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, H - 26);
  for (let x = 0; x <= W; x += 24) {
    const h = 14 + 16 * Math.abs(Math.sin(x * 0.05 + 1.7));
    ctx.lineTo(x + 12, H - 26 - h);
    ctx.lineTo(x + 24, H - 26);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  // The bloom's glow on the ground.
  const glow = ctx.createRadialGradient(CFG.FLOWER_X, CFG.FLOWER_Y, 10, CFG.FLOWER_X, CFG.FLOWER_Y, 150);
  glow.addColorStop(0, 'rgba(255, 93, 143, 0.20)');
  glow.addColorStop(1, 'rgba(255, 93, 143, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(CFG.FLOWER_X - 150, CFG.FLOWER_Y - 150, 300, 300);
}

export function drawFlower(ctx, world) {
  const pulse = 1 + 0.06 * Math.sin(world.time * 2.2);
  const hp = world.flowerHp;
  ctx.save();
  ctx.translate(CFG.FLOWER_X, CFG.FLOWER_Y);

  // Stem and leaves.
  ctx.strokeStyle = '#2f9e6e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.quadraticCurveTo(6, 60, -4, 108);
  ctx.stroke();
  ctx.fillStyle = '#2f9e6e';
  ctx.beginPath();
  ctx.ellipse(-16, 66, 18, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, 82, 18, 7, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Five petals; lost petals turn grey and droop.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const alive = hp > 0 && i < hp + 2;
    ctx.save();
    ctx.rotate(a);
    ctx.scale(pulse, pulse);
    const pg = ctx.createRadialGradient(0, -26, 2, 0, -26, 26);
    if (alive) {
      pg.addColorStop(0, '#ff8fb0');
      pg.addColorStop(1, PALETTE.bloomPetal);
    } else {
      pg.addColorStop(0, '#5a6b7a');
      pg.addColorStop(1, '#3a4a58');
    }
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(0, -26, 15, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Golden heart.
  const cg = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
  cg.addColorStop(0, '#fff3b0');
  cg.addColorStop(1, PALETTE.bloomCore);
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a4a00';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMite(ctx, e) {
  ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : ENEMY_TYPES.mite.color;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a1010';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a = e.wobble * 2 + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(a) * e.radius * 0.7, e.y + Math.sin(a) * e.radius * 0.7);
    ctx.lineTo(e.x + Math.cos(a) * (e.radius + 7), e.y + Math.sin(a) * (e.radius + 7));
    ctx.stroke();
  }
  ctx.fillStyle = '#1a0505';
  ctx.beginPath();
  ctx.arc(e.x - 3, e.y - 2, 2, 0, Math.PI * 2);
  ctx.arc(e.x + 3, e.y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpore(ctx, e) {
  ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : ENEMY_TYPES.spore.color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius + 3 + Math.sin(e.wobble * 3) * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#5b21b6';
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e9d5ff';
  ctx.beginPath();
  ctx.arc(e.x - 3, e.y - 3, 2, 0, Math.PI * 2);
  ctx.arc(e.x + 4, e.y + 2, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeetle(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(Math.atan2(CFG.FLOWER_Y - e.y, CFG.FLOWER_X - e.x));
  ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : ENEMY_TYPES.beetle.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, e.radius + 2, e.radius - 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a4a00';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-e.radius, 0);
  ctx.lineTo(e.radius, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-4, -6, 7, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Health pips above tough enemies.
  if (e.maxHp > 1 && e.hp < e.maxHp) {
    ctx.fillStyle = '#ff5d5d';
    for (let i = 0; i < e.maxHp; i++) {
      ctx.globalAlpha = i < e.hp ? 1 : 0.25;
      ctx.fillRect(e.x - e.maxHp * 4 + i * 8, e.y - e.radius - 12, 6, 3);
    }
    ctx.globalAlpha = 1;
  }
}

function drawWasp(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(Math.atan2(CFG.FLOWER_Y - e.y, CFG.FLOWER_X - e.x) + Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-7, -4, 6, 9, -0.5, 0, Math.PI * 2);
  ctx.ellipse(7, -4, 6, 9, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : ENEMY_TYPES.wasp.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, e.radius * 0.7, e.radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-e.radius * 0.7, -3, e.radius * 1.4, 3);
  ctx.fillRect(-e.radius * 0.7, 3, e.radius * 1.4, 3);
  ctx.restore();
}

export function drawEnemies(ctx, world) {
  for (const e of world.enemies) {
    if (e.type === 'mite') drawMite(ctx, e);
    else if (e.type === 'spore') drawSpore(ctx, e);
    else if (e.type === 'beetle') drawBeetle(ctx, e);
    else drawWasp(ctx, e);
  }
}

export function drawPlayer(ctx, world) {
  const p = world.player;
  // Glow.
  const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 42);
  g.addColorStop(0, 'rgba(184, 255, 93, 0.5)');
  g.addColorStop(1, 'rgba(184, 255, 93, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(p.x - 42, p.y - 42, 84, 84);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Wings.
  const flap = Math.sin(p.wing) * 0.5;
  ctx.fillStyle = 'rgba(230, 255, 200, 0.75)';
  ctx.beginPath();
  ctx.ellipse(-2, -10 - flap * 3, 7, 11, -0.5 - flap * 0.2, 0, Math.PI * 2);
  ctx.ellipse(-2, 10 + flap * 3, 7, 11, 0.5 + flap * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a4a00';
  ctx.fillRect(2, -6, 3, 12);
  ctx.fillRect(7, -5, 2, 10);
  // Lamp.
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath();
  ctx.arc(11, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBullets(ctx, world) {
  for (const b of world.bullets) {
    ctx.strokeStyle = 'rgba(126, 249, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, CFG.BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSeeds(ctx, world) {
  for (const s of world.seeds) {
    const bob = Math.sin(s.phase) * 2;
    const g = ctx.createRadialGradient(s.x, s.y + bob, 1, s.x, s.y + bob, 14);
    g.addColorStop(0, 'rgba(126, 249, 255, 0.7)');
    g.addColorStop(1, 'rgba(126, 249, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(s.x - 14, s.y + bob - 14, 28, 28);
    ctx.fillStyle = '#c9fbff';
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x - 1.5, s.y + bob - 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawTexts(ctx, world) {
  ctx.textAlign = 'center';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

export function drawBurstRing(ctx, world) {
  if (!world.burstRing) return;
  const ring = world.burstRing;
  ctx.save();
  // A disc of light inside the ring, then the ring itself.
  const disc = ctx.createRadialGradient(world.player.x, world.player.y, 4, world.player.x, world.player.y, Math.max(4, ring.r));
  disc.addColorStop(0, `rgba(255, 243, 176, ${0.34 * ring.alpha})`);
  disc.addColorStop(1, 'rgba(255, 243, 176, 0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(world.player.x, world.player.y, Math.max(4, ring.r), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = ring.alpha;
  ctx.strokeStyle = PALETTE.burst;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(world.player.x, world.player.y, ring.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(world.player.x, world.player.y, Math.max(1, ring.r - 9), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawHUD(ctx, world, W, H) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Top bar.
  ctx.fillStyle = 'rgba(6, 16, 28, 0.55)';
  roundRect(ctx, 10, 8, W - 20, 44, 10);
  ctx.fill();

  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('SCORE', 24, 24);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(String(world.score), 24, 46);

  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('WAVE', 190, 24);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`${Math.max(1, world.wave)} / ${CFG.WAVE_COUNT}`, 190, 46);

  // Bloom petals (lives).
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('BLOOM', 330, 24);
  for (let i = 0; i < CFG.FLOWER_HP; i++) {
    const x = 340 + i * 24;
    const y = 38;
    ctx.fillStyle = i < world.flowerHp ? PALETTE.bloomPetal : '#3a4a58';
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Burst charge.
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('BURST [E]', 460, 24);
  ctx.fillStyle = '#1d2f45';
  roundRect(ctx, 460, 30, 150, 12, 6);
  ctx.fill();
  const frac = world.burstCharge / CFG.BURST_COST;
  if (frac > 0) {
    const bg = ctx.createLinearGradient(460, 0, 610, 0);
    bg.addColorStop(0, '#ffd166');
    bg.addColorStop(1, '#fff3b0');
    ctx.fillStyle = bg;
    roundRect(ctx, 460, 30, Math.max(12, 150 * frac), 12, 6);
    ctx.fill();
  }
  if (frac >= 1) {
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('READY!', 616, 41);
  }

  // Combo.
  if (world.combo >= 3) {
    const mult = Math.min(CFG.COMBO_MAX, 1 + world.combo * CFG.COMBO_STEP).toFixed(1);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`COMBO x${mult}`, W - 24, 42);
    ctx.textAlign = 'left';
  }

  // Wave banner.
  if (world.waveState === 'banner' && world.state === 'playing') {
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(6, 16, 28, 0.6)';
    const tw = ctx.measureText(world.bannerText).width + 48;
    roundRect(ctx, W / 2 - tw / 2, 84, tw, 56, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(world.bannerText, W / 2, 122);
    ctx.textAlign = 'left';
  }

  // Bottom hint.
  ctx.fillStyle = 'rgba(234, 246, 255, 0.6)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD / arrows move · mouse aims · hold click or Space to shoot · E burst · P pause · M mute', 24, H - 14);
}

function screenPanel(ctx, W, H) {
  ctx.fillStyle = 'rgba(8, 10, 30, 0.72)';
  ctx.fillRect(0, 0, W, H);
}

export function drawTitle(ctx, world, W, H) {
  screenPanel(ctx, W, H);
  ctx.textAlign = 'center';
  // Logo flower.
  const cx = W / 2;
  const cy = 128;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    const pg = ctx.createRadialGradient(0, -30, 2, 0, -30, 30);
    pg.addColorStop(0, '#ff8fb0');
    pg.addColorStop(1, PALETTE.bloomPetal);
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(0, -30, 17, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = PALETTE.bloomCore;
  ctx.beginPath();
  ctx.arc(cx, cy, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff3b0';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('EMBER BLOOM', cx, 236);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('You are Pip, a firefly. Guard the last Ember Bloom.', cx, 272);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Shadow beetles crawl in from the dark to snuff it out. Shoot them,', cx, 302);
  ctx.fillText('gather dew-seeds, and burst with light when the garden needs it.', cx, 326);

  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — fly      Mouse — aim      Click / Space — shoot', cx, 380);
  ctx.fillText('E or right-click — Bloom Burst (needs a full charge)      P — pause', cx, 408);

  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('Click or press Enter to start', cx, 462);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Survive all ${CFG.WAVE_COUNT} waves to save the garden.`, cx, 496);
  ctx.textAlign = 'left';
}

export function drawPaused(ctx, W, H) {
  screenPanel(ctx, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('Paused', W / 2, H / 2 - 10);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Press P to keep playing', W / 2, H / 2 + 30);
  ctx.textAlign = 'left';
}

export function drawGameOver(ctx, world, W, H) {
  screenPanel(ctx, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d5d';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText('The bloom has faded', W / 2, 190);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('The dark crept in while the garden slept.', W / 2, 228);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`Score  ${world.score}`, W / 2, 292);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(`Waves survived: ${Math.max(0, world.wave - 1)}  ·  Beetles stopped: ${world.kills}  ·  Best: ${world.best}`, W / 2, 328);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Press R or click to play again', W / 2, 392);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function drawWin(ctx, world, W, H) {
  screenPanel(ctx, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff3b0';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText('The garden blooms again!', W / 2, 190);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Ten waves turned back. Dawn breaks over the Ember Bloom.', W / 2, 228);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`Score  ${world.score}`, W / 2, 292);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(`Beetles stopped: ${world.kills}  ·  Shots fired: ${world.shotsFired}  ·  Best: ${world.best}`, W / 2, 328);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Press R or click to play again', W / 2, 392);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// One frame: background, world, HUD, then the screen for the state.
export function drawFrame(ctx, world, W, H) {
  ctx.save();
  if (world.shake > 0) {
    // Deterministic wobble from the world's own clock, so a frozen
    // screenshot frame never jitters between renders.
    const sx = Math.sin(world.time * 61.7) * world.shake * 0.6;
    const sy = Math.cos(world.time * 47.3) * world.shake * 0.6;
    ctx.translate(sx, sy);
  }
  drawBackground(ctx, world, W, H);
  drawFlower(ctx, world);
  drawSeeds(ctx, world);
  drawEnemies(ctx, world);
  drawBullets(ctx, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawBurstRing(ctx, world);
  drawTexts(ctx, world);
  ctx.restore();
  if (world.state === 'playing' || world.state === 'paused') drawHUD(ctx, world, W, H);
  if (world.state === 'title') drawTitle(ctx, world, W, H);
  else if (world.state === 'paused') drawPaused(ctx, W, H);
  else if (world.state === 'over') drawGameOver(ctx, world, W, H);
  else if (world.state === 'win') drawWin(ctx, world, W, H);
}
