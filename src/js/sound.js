// Retro 8-Bit Web Audio Synthesizer (Zero External Assets Required)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('arcade_sound_enabled') !== 'false';
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem('arcade_sound_enabled', this.enabled);
    return this.enabled;
  }

  isSoundEnabled() {
    return this.enabled;
  }

  playTone(freq, type, duration, startTime = 0, gainLevel = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + startTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainLevel, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  // UI Button Click
  playClick() {
    this.playTone(600, 'square', 0.04, 0, 0.08);
  }

  // Snake Apple Eat
  playEat() {
    this.playTone(523.25, 'square', 0.06, 0, 0.12);
    this.playTone(783.99, 'square', 0.1, 0.06, 0.12);
  }

  // Tetris Move / Rotate
  playMove() {
    this.playTone(300, 'triangle', 0.03, 0, 0.08);
  }

  playRotate() {
    this.playTone(480, 'square', 0.04, 0, 0.09);
  }

  playDrop() {
    this.playTone(180, 'triangle', 0.08, 0, 0.15);
  }

  // Line Clear / Block Blast Clear
  playLineClear() {
    this.playTone(523.25, 'square', 0.08, 0, 0.15);
    this.playTone(659.25, 'square', 0.08, 0.08, 0.15);
    this.playTone(783.99, 'square', 0.08, 0.16, 0.15);
    this.playTone(1046.5, 'square', 0.15, 0.24, 0.18);
  }

  // Combo Sound
  playCombo(comboCount = 1) {
    const baseFreq = 440 + Math.min(comboCount * 80, 600);
    this.playTone(baseFreq, 'sawtooth', 0.08, 0, 0.15);
    this.playTone(baseFreq * 1.25, 'sawtooth', 0.08, 0.08, 0.15);
    this.playTone(baseFreq * 1.5, 'sawtooth', 0.12, 0.16, 0.18);
  }

  // Breakout Paddle Hit
  playPaddleHit() {
    this.playTone(350, 'square', 0.05, 0, 0.12);
  }

  // Breakout Brick Destroy
  playBrickHit() {
    this.playTone(700, 'square', 0.04, 0, 0.1);
  }

  // Dino Jump
  playJump() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  // Minesweeper Flag Place / Remove
  playFlag() {
    this.playTone(880, 'sine', 0.05, 0, 0.12);
    this.playTone(1100, 'sine', 0.08, 0.05, 0.12);
  }

  // Minesweeper Tile Reveal
  playTileOpen() {
    this.playTone(400, 'triangle', 0.03, 0, 0.07);
  }

  // Explosion (Bomb / Crash)
  playExplode() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      // Noise buffer for realistic 8-bit explosion
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {
      this.playTone(120, 'sawtooth', 0.3, 0, 0.2);
    }
  }

  // Game Over Jingle
  playGameOver() {
    this.playTone(440, 'sawtooth', 0.12, 0, 0.15);
    this.playTone(415.3, 'sawtooth', 0.12, 0.12, 0.15);
    this.playTone(392, 'sawtooth', 0.12, 0.24, 0.15);
    this.playTone(349.23, 'sawtooth', 0.35, 0.36, 0.2);
  }

  // Victory Fanfare
  playVictory() {
    this.playTone(523.25, 'triangle', 0.1, 0, 0.15);
    this.playTone(659.25, 'triangle', 0.1, 0.1, 0.15);
    this.playTone(783.99, 'triangle', 0.1, 0.2, 0.15);
    this.playTone(1046.5, 'triangle', 0.3, 0.3, 0.2);
  }

  // Galaga Laser Fire
  playLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }
}

export const sound = new SoundEngine();
