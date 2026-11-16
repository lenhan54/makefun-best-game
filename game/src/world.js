// Ember Bloom — the simulation. Pure logic: no DOM, no canvas, no
// Math.random. A seed replays the same garden, and Node can run it
// headlessly to smoke-test the rules.
import { CFG, ENEMY_TYPES, waveEnemyCount, waveRoster, waveSpawnInterval, waveSpeedBonus } from './config.js';
import { mulberry32, edgePoint, pick, chance, rand } from './random.js';

export class World {
  constructor(seed = 1) {
    this.rng = mulberry32(seed);
    this.seed = seed;
    this.time = 0;
    this.state = 'title';
    this.frozen = false;
    this.score = 0;
    this.best = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.wave = 0;
    this.waveState = 'banner';
    this.bannerTimer = 0;
    this.bannerText = '';
    this.spawnLeft = 0;
    this.spawnTimer = 0;
    this.flowerHp = CFG.FLOWER_HP;
    this.burstCharge = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.newBest = false;
    this.shake = 0;
    this.burstRing = null;
    this.events = [];
    this.player = { x: CFG.FLOWER_X, y: CFG.FLOWER_Y + 120, vx: 0, vy: 0, angle: -Math.PI / 2, fireTimer: 0, wing: 0 };
    this.enemies = [];
    this.bullets = [];
    this.seeds = [];
    this.particles = [];
    this.texts = [];
    this.ambient = [];
    for (let i = 0; i < 70; i++) {
      this.ambient.push({
        x: this.rng() * CFG.LOGICAL_W,
        y: this.rng() * CFG.LOGICAL_H,
        r: rand(this.rng, 0.6, 1.8),
        tw: rand(this.rng, 0, Math.PI * 2),
        sp: rand(this.rng, 0.3, 1.2),
      });
    }
  }

  start() {
    this.state = 'playing';
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.newBest = false;
    this.flowerHp = CFG.FLOWER_HP;
    this.burstCharge = 0;
    this.enemies = [];
    this.bullets = [];
    this.seeds = [];
    this.particles = [];
    this.texts = [];
    this.burstRing = null;
    this.player.x = CFG.FLOWER_X;
    this.player.y = CFG.FLOWER_Y + 120;
    this.player.vx = 0;
    this.player.vy = 0;
    this.beginWave(1);
  }

  beginWave(n) {
    this.wave = n;
    this.waveState = 'banner';
    this.bannerTimer = 1.6;
    this.bannerText = n === 1 ? 'Wave 1 — they come for the bloom' : `Wave ${n} of ${CFG.WAVE_COUNT}`;
    this.spawnLeft = waveEnemyCount(n);
    this.spawnTimer = 0.8;
    this.events.push('wave');
  }

  spawnEnemy() {
    const type = pick(this.rng, waveRoster(this.wave));
    const spec = ENEMY_TYPES[type];
    const p = edgePoint(this.rng, CFG.LOGICAL_W, CFG.LOGICAL_H, 30);
    const speed = spec.speed * waveSpeedBonus(this.wave) * rand(this.rng, 0.9, 1.1);
    this.enemies.push({
      type, x: p.x, y: p.y, hp: spec.hp, maxHp: spec.hp,
      speed, radius: spec.radius, score: spec.score,
      wobble: rand(this.rng, 0, Math.PI * 2),
      wobbleSpeed: rand(this.rng, 1.2, 2.6),
      hitFlash: 0,
    });
  }

  fireBullet() {
    const p = this.player;
    const dx = Math.cos(p.angle);
    const dy = Math.sin(p.angle);
    this.bullets.push({
      x: p.x + dx * 16,
      y: p.y + dy * 16,
      vx: dx * CFG.BULLET_SPEED,
      vy: dy * CFG.BULLET_SPEED,
      life: 0.9,
    });
    this.shotsFired++;
    this.events.push('shoot');
  }

  useBurst() {
    if (this.burstCharge < CFG.BURST_COST || this.state !== 'playing') return false;
    this.burstCharge = 0;
    // A ring of light expands from Pip and burns every enemy it touches
    // as it passes; enemies beyond its reach survive, so where Pip
    // stands when he bursts matters.
    this.burstRing = { r: 20, max: CFG.BURST_RADIUS, alpha: 1 };
    this.shake = Math.max(this.shake, 10);
    this.events.push('burst');
    return true;
  }

  killEnemy(e, byBurst = false) {
    const idx = this.enemies.indexOf(e);
    if (idx === -1) return;
    this.enemies.splice(idx, 1);
    this.kills++;
    this.combo++;
    this.comboTimer = CFG.COMBO_WINDOW;
    const mult = Math.min(CFG.COMBO_MAX, 1 + this.combo * CFG.COMBO_STEP);
    const gained = Math.round(e.score * mult);
    this.score += gained;
    this.addText(e.x, e.y, `+${gained}`, mult > 1.5 ? '#ffd166' : '#eaf6ff');
    this.burstParticles(e.x, e.y, ENEMY_TYPES[e.type].color, byBurst ? 14 : 9);
    this.events.push('kill');
    if (chance(this.rng, CFG.SEED_DROP_CHANCE)) {
      this.seeds.push({ x: e.x, y: e.y, vx: rand(this.rng, -24, 24), vy: rand(this.rng, -24, 24), life: 9, phase: rand(this.rng, 0, Math.PI * 2) });
    }
  }

  damageFlower(e) {
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) this.enemies.splice(idx, 1);
    this.flowerHp--;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = Math.max(this.shake, 12);
    this.burstParticles(CFG.FLOWER_X, CFG.FLOWER_Y, '#ff5d8f', 22);
    this.addText(CFG.FLOWER_X, CFG.FLOWER_Y - 52, 'The bloom is hurt!', '#ff5d5d');
    this.events.push('damage');
    if (this.flowerHp <= 0) {
      this.state = 'over';
      this.texts = [];
      this.newBest = this.score > this.best;
      this.best = Math.max(this.best, this.score);
      this.events.push('over');
    }
  }

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.addText(x, y, `+${n}`, '#7ef9ff');
  }

  addText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 1.1 });
  }

  burstParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const sp = rand(this.rng, 40, 190);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(this.rng, 0.35, 0.8), maxLife: 0.8,
        r: rand(this.rng, 1.5, 3.5), color,
      });
    }
  }

  update(dt, input) {
    if (this.state !== 'playing' || this.frozen) return;
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.burstRing) {
      this.burstRing.r += dt * 620;
      this.burstRing.alpha = Math.max(0, 1 - this.burstRing.r / this.burstRing.max);
      // The ring burns what it touches as it passes.
      for (const e of [...this.enemies]) {
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < this.burstRing.r + e.radius) this.killEnemy(e, true);
      }
      if (this.burstRing.r >= this.burstRing.max) this.burstRing = null;
    }

    // Wave banner counts down, then the spawning starts.
    if (this.waveState === 'banner') {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.waveState = 'fight';
    } else if (this.waveState === 'fight') {
      if (this.spawnLeft > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnEnemy();
          this.spawnLeft--;
          this.spawnTimer = waveSpawnInterval(this.wave) * rand(this.rng, 0.7, 1.3);
        }
      } else if (this.enemies.length === 0) {
        this.waveState = 'clear';
        const bonus = 100 * this.wave;
        this.score += bonus;
        this.addText(CFG.FLOWER_X, CFG.FLOWER_Y - 80, `Wave clear! +${bonus}`, '#ffd166');
        this.bannerTimer = 1.8;
        this.bannerText = this.wave >= CFG.WAVE_COUNT ? 'The garden blooms again!' : `Wave ${this.wave + 1} approaches…`;
        if (this.wave >= CFG.WAVE_COUNT) {
          this.state = 'win';
          this.texts = [];
          this.newBest = this.score > this.best;
          this.best = Math.max(this.best, this.score);
          this.events.push('win');
          return;
        }
      }
    } else if (this.waveState === 'clear') {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.beginWave(this.wave + 1);
    }

    // Pip flies.
    const p = this.player;
    p.vx += input.moveX * CFG.PLAYER_ACCEL * dt;
    p.vy += input.moveY * CFG.PLAYER_ACCEL * dt;
    p.vx *= Math.pow(0.0001, dt);
    p.vy *= Math.pow(0.0001, dt);
    const sp = Math.hypot(p.vx, p.vy);
    const maxSp = CFG.PLAYER_SPEED;
    if (sp > maxSp) {
      p.vx = (p.vx / sp) * maxSp;
      p.vy = (p.vy / sp) * maxSp;
    }
    p.x = Math.max(16, Math.min(CFG.LOGICAL_W - 16, p.x + p.vx * dt));
    p.y = Math.max(16, Math.min(CFG.LOGICAL_H - 16, p.y + p.vy * dt));
    p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
    p.wing += dt * (sp > 40 ? 26 : 12);
    if (this.rng() < dt * 30 && sp > 60) {
      this.particles.push({ x: p.x, y: p.y + 6, vx: -p.vx * 0.06, vy: -p.vy * 0.06 + 12, life: 0.4, maxLife: 0.4, r: 1.6, color: '#b8ff5d' });
    }

    // Shooting.
    p.fireTimer -= dt;
    if (input.firing && p.fireTimer <= 0) {
      this.fireBullet();
      p.fireTimer = CFG.FIRE_INTERVAL;
    }
    if (input.burstPressed) this.useBurst();

    // Bullets fly and hit.
    for (const b of [...this.bullets]) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > CFG.LOGICAL_W + 20 || b.y < -20 || b.y > CFG.LOGICAL_H + 20) {
        this.bullets.splice(this.bullets.indexOf(b), 1);
        continue;
      }
      for (const e of [...this.enemies]) {
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + CFG.BULLET_RADIUS;
        if (dx * dx + dy * dy < rr * rr) {
          this.bullets.splice(this.bullets.indexOf(b), 1);
          e.hp--;
          e.hitFlash = 0.12;
          this.shotsHit++;
          this.burstParticles(b.x, b.y, '#7ef9ff', 3);
          this.events.push('hit');
          if (e.hp <= 0) this.killEnemy(e);
          break;
        }
      }
    }

    // Enemies crawl toward the bloom; wasps hunt Pip instead.
    for (const e of [...this.enemies]) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.wobble += dt * e.wobbleSpeed;
      let tx = CFG.FLOWER_X;
      let ty = CFG.FLOWER_Y;
      if (e.type === 'wasp') {
        tx = p.x;
        ty = p.y;
      }
      let dx = tx - e.x;
      let dy = ty - e.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      if (e.type === 'spore') {
        const px = -dy * Math.sin(e.wobble) * 0.7;
        const py = dx * Math.sin(e.wobble) * 0.7;
        dx += px;
        dy += py;
        const nd = Math.hypot(dx, dy) || 1;
        dx /= nd;
        dy /= nd;
      }
      e.x += dx * e.speed * dt;
      e.y += dy * e.speed * dt;
      const fd = Math.hypot(e.x - CFG.FLOWER_X, e.y - CFG.FLOWER_Y);
      if (fd < CFG.FLOWER_RADIUS + e.radius * 0.6) {
        this.damageFlower(e);
        if (this.state !== 'playing') return;
        continue;
      }
      // A wasp that touches Pip stings: it dies, Pip is knocked, no petal lost.
      if (e.type === 'wasp') {
        const pd = Math.hypot(e.x - p.x, e.y - p.y);
        if (pd < e.radius + CFG.PLAYER_RADIUS) {
          this.enemies.splice(this.enemies.indexOf(e), 1);
          this.burstParticles(e.x, e.y, '#ffe66d', 10);
          this.shake = Math.max(this.shake, 7);
          p.vx += (p.x - e.x) * 6;
          p.vy += (p.y - e.y) * 6;
          this.events.push('hit');
        }
      }
    }

    // Dew-seeds drift, then magnet to Pip and feed the burst.
    for (const s of [...this.seeds]) {
      s.life -= dt;
      if (s.life <= 0) {
        this.seeds.splice(this.seeds.indexOf(s), 1);
        continue;
      }
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 110) {
        s.vx += (dx / d) * 420 * dt;
        s.vy += (dy / d) * 420 * dt;
      } else {
        s.vx *= Math.pow(0.2, dt);
        s.vy *= Math.pow(0.2, dt);
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.phase += dt * 5;
      if (d < 24) {
        this.seeds.splice(this.seeds.indexOf(s), 1);
        this.burstCharge = Math.min(CFG.BURST_COST, this.burstCharge + CFG.SEED_CHARGE);
        this.addScore(CFG.SEED_SCORE, s.x, s.y);
        this.burstParticles(s.x, s.y, '#7ef9ff', 6);
        this.events.push('seed');
      }
    }

    // Particles and floating texts fade.
    for (const pt of [...this.particles]) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.pow(0.1, dt);
      pt.vy *= Math.pow(0.1, dt);
      if (pt.life <= 0) this.particles.splice(this.particles.indexOf(pt), 1);
    }
    for (const t of [...this.texts]) {
      t.life -= dt;
      t.y -= 26 * dt;
      if (t.life <= 0) this.texts.splice(this.texts.indexOf(t), 1);
    }
  }
}
