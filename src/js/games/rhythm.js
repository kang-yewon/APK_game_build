import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

// Note frequencies (Hz) for Alan Walker - Faded (Eb minor)
const NOTES = {
  'REST': 0,
  'Eb3': 155.56, 'Gb3': 185.00, 'Ab3': 207.65, 'Bb3': 233.08, 'B3': 246.94, 'Db4': 277.18,
  'Eb4': 311.13, 'F4': 349.23, 'Gb4': 369.99, 'Ab4': 415.30, 'Bb4': 466.16, 'B4': 493.88,
  'Db5': 554.37, 'Eb5': 622.25, 'F5': 698.46, 'Gb5': 739.99, 'Ab5': 830.61, 'Bb5': 932.33
};

// Alan Walker - Faded Melody & Beat Sheet (Time in ms, Lane: 0=Left Drum, 1=Right Drum, Note tone)
const FADED_SONG_DURATION = 58000; // ~58 seconds loop
const BPM = 90;
const BEAT = 60000 / BPM; // 666.67 ms per beat

function generateFadedChart() {
  const chart = [];
  const startOffset = 2200; // ms lead-in

  // Faded Melody Pattern Data [timeOffsetInBeats, lane, noteName, isDrumBeat]
  const pattern = [
    // --- INTRO (Arpeggio) ---
    [0.0, 0, 'Eb4'], [0.5, 1, 'Bb4'], [1.0, 0, 'Gb4'], [1.5, 1, 'Ab4'], [2.0, 0, 'Bb4'],
    [2.5, 1, 'B4'], [3.0, 0, 'Gb4'], [3.5, 1, 'Ab4'],
    [4.0, 0, 'Db4'], [4.5, 1, 'Ab4'], [5.0, 0, 'F4'], [5.5, 1, 'Gb4'], [6.0, 0, 'Ab4'],
    [6.5, 1, 'Bb4'], [7.0, 0, 'Gb4'], [7.5, 1, 'F4'],

    // --- VERSE ("You were the shadow to my light...") ---
    [8.0, 0, 'Eb4'], [8.75, 1, 'Eb4'], [9.5, 0, 'Eb4'], [10.0, 1, 'F4'], [10.5, 0, 'Gb4'],
    [11.5, 1, 'Gb4'], [12.0, 0, 'F4'], [12.5, 1, 'Eb4'], [13.0, 0, 'F4'], [13.5, 1, 'Gb4'],
    [14.5, 0, 'Db4'], [15.25, 1, 'Db4'], [16.0, 0, 'Eb4'], [16.75, 1, 'Eb4'], [17.5, 0, 'Gb4'],
    [18.5, 1, 'F4'], [19.0, 0, 'Eb4'], [19.5, 1, 'F4'], [20.0, 0, 'Gb4'], [21.0, 1, 'Ab4'],
    [22.0, 0, 'Bb4'], [23.0, 1, 'Bb4'],

    // --- BUILD UP ("Where are you now...") ---
    [24.0, 0, 'Bb4'], [24.5, 1, 'Bb4'], [25.0, 0, 'Ab4'], [25.5, 1, 'Gb4'], [26.0, 0, 'Ab4'], [27.0, 1, 'Bb4'],
    [28.0, 0, 'Bb4'], [28.5, 1, 'Bb4'], [29.0, 0, 'Ab4'], [29.5, 1, 'Gb4'], [30.0, 0, 'Ab4'], [31.0, 1, 'F4'],
    [32.0, 0, 'Eb4'], [32.5, 1, 'Gb4'], [33.0, 0, 'Bb4'], [33.5, 1, 'Db5'], [34.0, 0, 'Eb5'],
    [35.0, 1, 'Db5'], [35.5, 0, 'Bb4'], [36.0, 1, 'Ab4'], [37.0, 0, 'Gb4'], [38.0, 1, 'Ab4'], [39.0, 0, 'Bb4'],

    // --- CHORUS DROP ("I'm Faded... So Lost...") ---
    [40.0, 0, 'Eb5'], [40.5, 1, 'Eb5'], [41.0, 0, 'Db5'], [41.5, 1, 'Bb4'], [42.0, 0, 'Ab4'], [42.5, 1, 'Gb4'],
    [43.0, 0, 'Ab4'], [43.5, 1, 'Bb4'], [44.0, 0, 'Eb5'], [44.5, 1, 'Db5'], [45.0, 0, 'Bb4'], [45.5, 1, 'Ab4'],
    [46.0, 0, 'Gb4'], [46.5, 1, 'Ab4'], [47.0, 0, 'Bb4'], [47.5, 1, 'Db5'], [48.0, 0, 'Eb5'], [48.5, 1, 'Gb5'],
    [49.0, 0, 'F5'], [49.5, 1, 'Eb5'], [50.0, 0, 'Db5'], [50.5, 1, 'Bb4'], [51.0, 0, 'Ab4'], [51.5, 1, 'Gb4'],
    [52.0, 0, 'Eb4'], [53.0, 1, 'Gb4'], [54.0, 0, 'Bb4'], [55.0, 1, 'Eb5'], [56.0, 0, 'Eb5']
  ];

  pattern.forEach(([beatOffset, lane, noteName]) => {
    chart.push({
      time: Math.round(startOffset + beatOffset * BEAT),
      lane, // 0: Left Drum, 1: Right Drum
      note: noteName,
      freq: NOTES[noteName] || 440,
      hit: false,
      missed: false
    });
  });

  return chart;
}

export class RhythmGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.highScore = getHighScore('rhythm');

    this.notes = [];
    this.particles = [];
    this.judgements = []; // Floating 'PERFECT', 'GREAT', 'MISS'

    // Drum hit states
    this.leftDrumHitTime = 0;
    this.rightDrumHitTime = 0;

    // Track audio playback time
    this.startTime = 0;
    this.elapsedTime = 0;
    this.audioScheduleIndex = 0;

    // Note Speed & Fall duration
    this.fallDurationMs = 1200; // Time from top to drum line

    // Layout
    this.width = 360;
    this.height = 540;
    this.drumY = 460;
    this.leftDrumX = 80;
    this.rightDrumX = 280;
    this.drumRadius = 38;

    this.isRunning = false;
    this.animationFrameId = null;

    this.initControls();
  }

  initControls() {
    const btnLeft = document.getElementById('rhythm-btn-left-drum');
    const btnRight = document.getElementById('rhythm-btn-right-drum');

    const handleLeftHit = () => {
      if (!this.isRunning) return;
      this.leftDrumHitTime = performance.now();
      this.hitDrum(0);
      sound.playPaddleHit();
    };

    const handleRightHit = () => {
      if (!this.isRunning) return;
      this.rightDrumHitTime = performance.now();
      this.hitDrum(1);
      sound.playPaddleHit();
    };

    const attachDrumButton = (el, fn) => {
      if (!el) return;
      let last = 0;
      const trigger = (e) => {
        if (e && e.cancelable) e.preventDefault();
        const now = Date.now();
        if (now - last > 50) {
          last = now;
          fn();
        }
      };
      el.addEventListener('pointerdown', trigger);
      el.addEventListener('touchstart', trigger, { passive: false });
    };

    attachDrumButton(btnLeft, handleLeftHit);
    attachDrumButton(btnRight, handleRightHit);

    // Direct Touch on Canvas (Left half = Left Drum, Right half = Right Drum)
    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.isRunning) return;
      const rect = this.canvas.getBoundingClientRect();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchX = touch.clientX - rect.left;
        if (touchX < rect.width / 2) {
          handleLeftHit();
        } else {
          handleRightHit();
        }
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    // Keyboard support (D/F or Left for Left Drum, J/K or Right for Right Drum)
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (['KeyD', 'KeyF', 'ArrowLeft'].includes(e.code)) {
        handleLeftHit();
        e.preventDefault();
      } else if (['KeyJ', 'KeyK', 'ArrowRight', 'Space'].includes(e.code)) {
        handleRightHit();
        e.preventDefault();
      }
    });
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const availW = Math.max(280, rect.width > 50 ? rect.width : (window.innerWidth || 360));
    const availH = Math.max(380, rect.height > 50 ? rect.height : (window.innerHeight - 150));
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(availW * dpr);
    this.canvas.height = Math.floor(availH * dpr);
    this.canvas.style.width = `${availW}px`;
    this.canvas.style.height = `${availH}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.width = availW;
    this.height = availH;

    this.drumY = availH - 65;
    this.leftDrumX = Math.floor(availW * 0.28);
    this.rightDrumX = Math.floor(availW * 0.72);
    this.drumRadius = Math.min(42, Math.floor(availW * 0.12));

    this.render();
  }

  start() {
    this.highScore = getHighScore('rhythm');
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.particles = [];
    this.judgements = [];

    this.notes = generateFadedChart();
    this.audioScheduleIndex = 0;

    this.isRunning = true;
    this.resize();

    this.startTime = performance.now();
    this.elapsedTime = 0;

    this.updateUI();
    cancelAnimationFrame(this.animationFrameId);
    this.loop();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  hitDrum(lane) {
    const currentTime = this.elapsedTime;

    // Find nearest unhit note in this lane
    let closestNote = null;
    let minDiff = Infinity;

    this.notes.forEach(note => {
      if (note.lane === lane && !note.hit && !note.missed) {
        const diff = Math.abs(currentTime - note.time);
        if (diff < minDiff && diff <= 220) {
          minDiff = diff;
          closestNote = note;
        }
      }
    });

    const drumX = lane === 0 ? this.leftDrumX : this.rightDrumX;
    const drumY = this.drumY;

    if (closestNote) {
      closestNote.hit = true;
      let text = 'GOOD';
      let color = '#38bdf8';
      let pts = 100;

      if (minDiff <= 55) {
        text = 'PERFECT!';
        color = '#facc15';
        pts = 300;
      } else if (minDiff <= 120) {
        text = 'GREAT!';
        color = '#4ade80';
        pts = 200;
      }

      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += pts + this.combo * 10;

      // Play the actual melody synthesizer note!
      this.playSynthTone(closestNote.freq, 0.18);

      // Hit particles
      this.addHitParticles(drumX, drumY, color);
      this.addJudgement(drumX, drumY - 50, text, color);

    } else {
      // Tap without note nearby (minor feedback)
      this.addHitParticles(drumX, drumY, 'rgba(255,255,255,0.4)', 4);
    }

    this.updateUI();
  }

  playSynthTone(freq, duration = 0.15) {
    if (!freq || freq <= 0) return;
    sound.playTone(freq, 'sawtooth', duration, 0, 0.18);
    // Add sub-bass resonance
    sound.playTone(freq / 2, 'sine', duration * 1.2, 0, 0.12);
  }

  addHitParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        life: 1.0
      });
    }
  }

  addJudgement(x, y, text, color) {
    this.judgements.push({
      x, y,
      text,
      color,
      alpha: 1.0,
      scale: 1.3
    });
  }

  update(now) {
    this.elapsedTime = now - this.startTime;

    // 1. Play Background BGM chords & beats if needed
    this.playAutoBGMTrack(this.elapsedTime);

    // 2. Check for Missed Notes
    this.notes.forEach(note => {
      if (!note.hit && !note.missed) {
        if (this.elapsedTime - note.time > 220) {
          note.missed = true;
          this.combo = 0;
          const drumX = note.lane === 0 ? this.leftDrumX : this.rightDrumX;
          this.addJudgement(drumX, this.drumY - 50, 'MISS', '#ef4444');
          this.updateUI();
        }
      }
    });

    // 3. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 4. Update Judgements
    for (let i = this.judgements.length - 1; i >= 0; i--) {
      const j = this.judgements[i];
      j.y -= 0.8;
      j.alpha -= 0.035;
      j.scale = Math.max(1.0, j.scale - 0.02);
      if (j.alpha <= 0) this.judgements.splice(i, 1);
    }

    // 5. Check Song End
    const lastNoteTime = this.notes[this.notes.length - 1].time;
    if (this.elapsedTime > lastNoteTime + 2500) {
      this.songComplete();
    }
  }

  playAutoBGMTrack(time) {
    // Light backing bass pulse on every beat
    const beatIndex = Math.floor((time - 2200) / BEAT);
    if (beatIndex > this.audioScheduleIndex && beatIndex >= 0) {
      this.audioScheduleIndex = beatIndex;
      // Kick drum pulse
      sound.playTone(65, 'triangle', 0.09, 0, 0.2);
    }
  }

  songComplete() {
    this.stop();
    sound.playVictory();

    const isNewHigh = saveHighScore('rhythm', this.score);
    this.highScore = getHighScore('rhythm');

    modal.show({
      gameTitle: '🎵 Alan Walker - Faded (완곡!)',
      score: this.score,
      highScore: this.highScore,
      isNewHigh,
      isVictory: true,
      onRestart: () => this.start(),
      onHome: () => this.onReturnHome()
    });
  }

  updateUI() {
    const scoreEl = document.getElementById('rhythm-score');
    const comboEl = document.getElementById('rhythm-combo');
    if (scoreEl) scoreEl.textContent = `SCORE: ${this.score.toLocaleString()}`;
    if (comboEl) comboEl.textContent = this.combo > 1 ? `COMBO ${this.combo}🔥` : '';
  }

  loop() {
    if (!this.isRunning) return;
    const now = performance.now();
    this.update(now);
    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  render() {
    const w = this.width;
    const h = this.height;
    if (!w || !h) return;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Neon Stage Background
    this.ctx.fillStyle = '#080c16';
    this.ctx.fillRect(0, 0, w, h);

    // 2. Note Falling Track Lanes
    const lx = this.leftDrumX;
    const rx = this.rightDrumX;

    // Track Gradients
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
    this.ctx.fillRect(lx - 28, 0, 56, this.drumY);

    this.ctx.fillStyle = 'rgba(244, 63, 94, 0.05)';
    this.ctx.fillRect(rx - 28, 0, 56, this.drumY);

    // Track guideline borders
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(lx - 28, 0); this.ctx.lineTo(lx - 28, this.drumY);
    this.ctx.moveTo(lx + 28, 0); this.ctx.lineTo(lx + 28, this.drumY);
    this.ctx.moveTo(rx - 28, 0); this.ctx.lineTo(rx - 28, this.drumY);
    this.ctx.moveTo(rx + 28, 0); this.ctx.lineTo(rx + 28, this.drumY);
    this.ctx.stroke();

    // 3. Falling White Disc Notes
    const now = this.elapsedTime;
    this.notes.forEach(note => {
      if (note.hit || note.missed) return;

      const timeUntilHit = note.time - now;
      if (timeUntilHit < this.fallDurationMs && timeUntilHit > -200) {
        const progress = 1 - (timeUntilHit / this.fallDurationMs);
        const noteY = progress * this.drumY;
        const noteX = note.lane === 0 ? lx : rx;

        // Glowing White Disc Note
        this.ctx.save();
        this.ctx.shadowColor = note.lane === 0 ? '#38bdf8' : '#f43f5e';
        this.ctx.shadowBlur = 12;

        // Outer white ring
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(noteX, noteY, 18, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner glowing core
        this.ctx.fillStyle = note.lane === 0 ? '#38bdf8' : '#f43f5e';
        this.ctx.beginPath();
        this.ctx.arc(noteX, noteY, 10, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
      }
    });

    // 4. Hit Zone Drums (Left & Right)
    const nowPerf = performance.now();
    const isLeftActive = nowPerf - this.leftDrumHitTime < 100;
    const isRightActive = nowPerf - this.rightDrumHitTime < 100;

    this.drawDrum(lx, this.drumY, this.drumRadius, '#38bdf8', '좌측 북 (L)', isLeftActive);
    this.drawDrum(rx, this.drumY, this.drumRadius, '#f43f5e', '우측 북 (R)', isRightActive);

    // 5. Hit Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    });

    // 6. Floating Judgement Texts ('PERFECT!', 'GREAT!')
    this.judgements.forEach(j => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, j.alpha);
      this.ctx.fillStyle = j.color;
      this.ctx.font = `bold ${Math.floor(18 * j.scale)}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(j.text, j.x, j.y);
      this.ctx.restore();
    });
  }

  drawDrum(x, y, radius, color, label, isHit) {
    this.ctx.save();

    // Pulse scale on hit
    const r = isHit ? radius * 1.15 : radius;

    // Glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = isHit ? 24 : 10;

    // Drum Rim
    this.ctx.fillStyle = isHit ? '#ffffff' : '#1e293b';
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();

    // Drum Membrane
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = isHit ? 5 : 3.5;
    this.ctx.stroke();

    // Inner icon
    this.ctx.fillStyle = isHit ? color : '#f8fafc';
    this.ctx.font = `${Math.floor(r * 0.65)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🥁', x, y);

    // Label under drum
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.fillText(label, x, y + r + 16);

    this.ctx.restore();
  }
}
