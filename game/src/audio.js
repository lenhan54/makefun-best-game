// All sound is synthesized with WebAudio — no audio files, no network.
// Each effect is a few oscillators / filtered noise bursts.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Browsers only let audio start after a gesture; call from one.
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  tone({ f0 = 440, f1 = null, dur = 0.1, type = 'sine', vol = 0.5, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.15, vol = 0.4, freq = 1200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() {
    this.tone({ f0: 880 + Math.random() * 120, f1: 520, dur: 0.07, type: 'square', vol: 0.12 });
  }

  hit() {
    this.noise({ dur: 0.08, vol: 0.25, freq: 2400 });
    this.tone({ f0: 320, f1: 140, dur: 0.09, type: 'triangle', vol: 0.3 });
  }

  kill() {
    this.tone({ f0: 520, f1: 980, dur: 0.12, type: 'sine', vol: 0.3 });
    this.noise({ dur: 0.1, vol: 0.2, freq: 3200 });
  }

  seed() {
    this.tone({ f0: 1180, f1: 1760, dur: 0.12, type: 'sine', vol: 0.35 });
  }

  burst() {
    this.tone({ f0: 180, f1: 1400, dur: 0.5, type: 'sawtooth', vol: 0.22 });
    this.noise({ dur: 0.5, vol: 0.3, freq: 900 });
    this.tone({ f0: 1560, dur: 0.25, type: 'sine', vol: 0.2, delay: 0.08 });
  }

  damage() {
    this.tone({ f0: 140, f1: 60, dur: 0.3, type: 'sawtooth', vol: 0.45 });
    this.noise({ dur: 0.2, vol: 0.3, freq: 500 });
  }

  wave() {
    this.tone({ f0: 392, dur: 0.16, type: 'triangle', vol: 0.3 });
    this.tone({ f0: 523, dur: 0.22, type: 'triangle', vol: 0.3, delay: 0.15 });
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => {
      this.tone({ f0: f, dur: 0.3, type: 'triangle', vol: 0.32, delay: i * 0.22 });
    });
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone({ f0: f, dur: 0.28, type: 'sine', vol: 0.32, delay: i * 0.13 });
    });
  }

  click() {
    this.tone({ f0: 660, dur: 0.06, type: 'sine', vol: 0.25 });
  }
}
