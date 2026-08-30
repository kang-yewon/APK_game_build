import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

// Note pitch definitions (Hz) in Eb minor (Alan Walker - Faded)
const PITCH = {
  'Eb2': 77.78, 'Gb2': 92.50, 'Ab2': 103.83, 'Bb2': 116.54, 'B2': 123.47, 'Db3': 138.59,
  'Eb3': 155.56, 'F3': 174.61, 'Gb3': 185.00, 'Ab3': 207.65, 'Bb3': 233.08, 'B3': 246.94, 'Db4': 277.18,
  'Eb4': 311.13, 'F4': 349.23, 'Gb4': 369.99, 'Ab4': 415.30, 'Bb4': 466.16, 'B4': 493.88,
  'Db5': 554.37, 'Eb5': 622.25, 'F5': 698.46, 'Gb5': 739.99, 'Ab5': 830.61, 'Bb5': 932.33
};

const BPM = 90;
const BEAT = (60 / BPM) * 1000; // 666.67 ms per quarter beat
const HALF_BEAT = BEAT / 2; // 333.33 ms (8th note)
const Q_BEAT = BEAT / 4; // 166.67 ms (16th note)

// Master Faded BGM Sequence [timeInBeats, leadNote, bassNote, drumType: 'kick'|'snare'|'hat'|'']
const FADED_MASTER_BGM = [
  // --- INTRO (Beats 0 - 15) ---
  [0.0, 'Eb4', 'Eb3', ''], [0.5, 'Bb4', '', ''], [1.0, 'Gb4', '', ''], [1.5, 'Ab4', '', ''],
  [2.0, 'Bb4', 'B2', ''], [2.5, 'B4', '', ''], [3.0, 'Gb4', '', ''], [3.5, 'Ab4', '', ''],
  [4.0, 'Db4', 'Db3', ''], [4.5, 'Ab4', '', ''], [5.0, 'F4', '', ''], [5.5, 'Gb4', '', ''],
  [6.0, 'Ab4', 'Ab2', ''], [6.5, 'Bb4', '', ''], [7.0, 'Gb4', '', ''], [7.5, 'F4', '', ''],
  [8.0, 'Eb4', 'Eb3', 'hat'], [8.5, 'Bb4', '', 'hat'], [9.0, 'Gb4', '', 'hat'], [9.5, 'Ab4', '', 'hat'],
  [10.0, 'Bb4', 'B2', 'hat'], [10.5, 'B4', '', 'hat'], [11.0, 'Gb4', '', 'hat'], [11.5, 'Ab4', '', 'hat'],
  [12.0, 'Db4', 'Db3', 'hat'], [12.5, 'Ab4', '', 'hat'], [13.0, 'F4', '', 'hat'], [13.5, 'Gb4', '', 'hat'],
  [14.0, 'Ab4', 'Ab2', 'hat'], [14.5, 'Bb4', '', 'hat'], [15.0, 'Gb4', '', 'hat'], [15.5, 'F4', '', 'hat'],

  // --- VERSE ("You were the shadow to my light...") (Beats 16 - 31) ---
  [16.0, 'Eb4', 'Eb3', 'kick'], [16.5, '', '', 'hat'], [17.0, 'Eb4', '', 'snare'], [17.5, 'Eb4', '', 'hat'],
  [18.0, 'F4', 'B2', 'kick'], [18.5, 'Gb4', '', 'hat'], [19.0, 'Gb4', '', 'snare'], [19.5, 'F4', '', 'hat'],
  [20.0, 'Eb4', 'Db3', 'kick'], [20.5, 'F4', '', 'hat'], [21.0, 'Gb4', '', 'snare'], [21.5, '', '', 'hat'],
  [22.0, 'Db4', 'Ab2', 'kick'], [22.5, 'Db4', '', 'hat'], [23.0, 'Eb4', '', 'snare'], [23.5, 'Eb4', '', 'hat'],
  [24.0, 'Gb4', 'Eb3', 'kick'], [24.5, 'F4', '', 'hat'], [25.0, 'Eb4', '', 'snare'], [25.5, 'F4', '', 'hat'],
  [26.0, 'Gb4', 'B2', 'kick'], [26.5, 'Ab4', '', 'hat'], [27.0, 'Bb4', '', 'snare'], [27.5, '', '', 'hat'],
  [28.0, 'Bb4', 'Db3', 'kick'], [28.5, '', '', 'hat'], [29.0, 'Bb4', '', 'snare'], [29.5, 'Ab4', '', 'hat'],
  [30.0, 'Gb4', 'Ab2', 'kick'], [30.5, 'Ab4', '', 'hat'], [31.0, 'Bb4', '', 'snare'], [31.5, '', '', 'hat'],

  // --- BUILD UP ("Where are you now...") (Beats 32 - 47) ---
  [32.0, 'Bb4', 'Eb3', 'kick'], [32.5, 'Bb4', '', 'hat'], [33.0, 'Ab4', '', 'snare'], [33.5, 'Gb4', '', 'hat'],
  [34.0, 'Ab4', 'B2', 'kick'], [34.5, 'Bb4', '', 'hat'], [35.0, 'Bb4', '', 'snare'], [35.5, 'Bb4', '', 'hat'],
  [36.0, 'Ab4', 'Db3', 'kick'], [36.5, 'Gb4', '', 'hat'], [37.0, 'Ab4', '', 'snare'], [37.5, 'F4', '', 'hat'],
  [38.0, 'Eb4', 'Ab2', 'kick'], [38.5, 'Gb4', '', 'hat'], [39.0, 'Bb4', '', 'snare'], [39.5, 'Db5', '', 'hat'],
  [40.0, 'Eb5', 'Eb3', 'kick'], [40.5, '', '', 'snare'], [41.0, 'Db5', '', 'kick'], [41.5, 'Bb4', '', 'snare'],
  [42.0, 'Ab4', 'B2', 'kick'], [42.5, 'Gb4', '', 'snare'], [43.0, 'Ab4', '', 'kick'], [43.5, 'Bb4', '', 'snare'],
  [44.0, 'Eb5', 'Db3', 'kick'], [44.5, 'F5', '', 'snare'], [45.0, 'Gb5', '', 'kick'], [45.5, 'F5', '', 'snare'],
  [46.0, 'Eb5', 'Ab2', 'kick'], [46.5, 'Db5', '', 'snare'], [47.0, 'Bb4', '', 'kick'], [47.5, 'Ab4', '', 'snare'],

  // --- DROP / CHORUS ("I'm Faded...") (Beats 48 - 72) ---
  [48.0, 'Eb5', 'Eb2', 'kick'], [48.5, 'Eb5', 'Eb3', 'hat'], [49.0, 'Db5', '', 'snare'], [49.5, 'Bb4', '', 'hat'],
  [50.0, 'Ab4', 'B2', 'kick'], [50.5, 'Gb4', 'B3', 'hat'], [51.0, 'Ab4', '', 'snare'], [51.5, 'Bb4', '', 'hat'],
  [52.0, 'Eb5', 'Db3', 'kick'], [52.5, 'Db5', 'Db4', 'hat'], [53.0, 'Bb4', '', 'snare'], [53.5, 'Ab4', '', 'hat'],
  [54.0, 'Gb4', 'Ab2', 'kick'], [54.5, 'Ab4', 'Ab3', 'hat'], [55.0, 'Bb4', '', 'snare'], [55.5, 'Db5', '', 'hat'],
  [56.0, 'Eb5', 'Eb2', 'kick'], [56.5, 'Gb5', 'Eb3', 'hat'], [57.0, 'F5', '', 'snare'], [57.5, 'Eb5', '', 'hat'],
  [58.0, 'Db5', 'B2', 'kick'], [58.5, 'Bb4', 'B3', 'hat'], [59.0, 'Ab4', '', 'snare'], [59.5, 'Gb4', '', 'hat'],
  [60.0, 'Eb4', 'Db3', 'kick'], [60.5, 'Gb4', 'Db4', 'hat'], [61.0, 'Bb4', '', 'snare'], [61.5, 'Eb5', '', 'hat'],
  [62.0, 'Eb5', 'Ab2', 'kick'], [62.5, '', '', 'hat'], [63.0, 'Db5', '', 'snare'], [63.5, 'Bb4', '', 'hat'],
  [64.0, 'Eb5', 'Eb2', 'kick'], [65.0, 'Db5', '', 'snare'], [66.0, 'Bb4', 'B2', 'kick'], [67.0, 'Ab4', '', 'snare'],
  [68.0, 'Gb4', 'Db3', 'kick'], [69.0, 'Ab4', '', 'snare'], [70.0, 'Bb4', 'Ab2', 'kick'], [71.0, 'Eb4', '', 'snare']
];

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
    this.judgements = [];
    this.bgmEvents = [];
    this.bgmEventIndex = 0;

    // Drum hit states (vibration & pulse)
    this.leftDrumHitTime = 0;
    this.rightDrumHitTime = 0;

    // Time tracking
    this.startTime = 0;
    this.elapsedTime = 0;
    this.fallDurationMs = 1300; // ms for white disc to reach drum from top

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
      this.playDrumAcoustic(0);
    };

    const handleRightHit = () => {
      if (!this.isRunning) return;
      this.rightDrumHitTime = performance.now();
      this.hitDrum(1);
      this.playDrumAcoustic(1);
    };

    const attachDrumButton = (el, fn) => {
      if (!el) return;
      let last = 0;
      const trigger = (e) => {
        if (e && e.cancelable) e.preventDefault();
        const now = Date.now();
        if (now - last > 45) {
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

    // Keyboard (D/F or Left for Left Drum, J/K/Space or Right for Right Drum)
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

  // Generates procedurally randomized note chart for Faded so each game is fresh & dynamic!
  generateDynamicChart() {
    const chart = [];
    const leadInMs = 2400; // ms lead-in before first note hits drum

    let currentLane = Math.random() < 0.5 ? 0 : 1;
    const seed = Math.random();

    FADED_MASTER_BGM.forEach(([beatOffset, leadNote, bassNote, drumType], idx) => {
      const noteTime = Math.round(leadInMs + beatOffset * BEAT);

      // Procedural lane decision & rhythm variations
      let shouldSpawn = false;
      let targetLane = currentLane;

      if (leadNote) {
        // Melodic note
        shouldSpawn = true;

        // Dynamic lane transitions
        if (Math.random() < 0.65) {
          currentLane = 1 - currentLane; // Alternate lanes
        }
        targetLane = currentLane;

      } else if (drumType === 'snare' || drumType === 'kick') {
        // Beat-driven disc
        if (beatOffset >= 16) {
          shouldSpawn = Math.random() < 0.75;
          targetLane = (drumType === 'kick') ? 0 : 1;
        }
      }

      // Add variation: occasional double taps on strong drop beats
      if (beatOffset >= 48 && (beatOffset % 2 === 0) && Math.random() < (0.3 + seed * 0.2)) {
        chart.push({
          time: noteTime,
          lane: 0,
          hit: false,
          missed: false
        });
        chart.push({
          time: noteTime,
          lane: 1,
          hit: false,
          missed: false
        });
      } else if (shouldSpawn) {
        chart.push({
          time: noteTime,
          lane: targetLane,
          hit: false,
          missed: false
        });
      }
    });

    return chart;
  }

  start() {
    this.highScore = getHighScore('rhythm');
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.particles = [];
    this.judgements = [];

    // Build fresh dynamic chart and BGM event queue
    this.notes = this.generateDynamicChart();
    this.bgmEvents = FADED_MASTER_BGM.map(([beatOffset, leadNote, bassNote, drumType]) => ({
      time: Math.round(2400 + beatOffset * BEAT),
      leadNote,
      bassNote,
      drumType,
      played: false
    }));
    this.bgmEventIndex = 0;

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

  // Plays deep acoustic/electronic drum impact on hit
  playDrumAcoustic(lane) {
    if (!sound.isSoundEnabled()) return;
    if (lane === 0) {
      // Left Drum: Deep Taiko Bass 'DON'
      sound.playTone(85, 'triangle', 0.12, 0, 0.28);
      sound.playTone(55, 'sine', 0.18, 0, 0.35);
    } else {
      // Right Drum: Snappy Rim / Snare 'KA'
      sound.playTone(420, 'square', 0.05, 0, 0.18);
      sound.playTone(280, 'sawtooth', 0.08, 0, 0.2);
    }
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

      this.addHitParticles(drumX, drumY, color, 14);
      this.addJudgement(drumX, drumY - 50, text, color);

    } else {
      this.addHitParticles(drumX, drumY, 'rgba(255,255,255,0.3)', 4);
    }

    this.updateUI();
  }

  // Plays automatic background music in full sync with Alan Walker's Faded composition
  updateBGM(currentTime) {
    if (!sound.isSoundEnabled()) return;

    while (this.bgmEventIndex < this.bgmEvents.length) {
      const ev = this.bgmEvents[this.bgmEventIndex];
      if (currentTime >= ev.time) {
        ev.played = true;
        this.bgmEventIndex++;

        // 1. Play Lead Melody
        if (ev.leadNote && PITCH[ev.leadNote]) {
          const freq = PITCH[ev.leadNote];
          // Warm sawtooth piano lead
          sound.playTone(freq, 'sawtooth', 0.22, 0, 0.13);
          sound.playTone(freq * 0.5, 'sine', 0.25, 0, 0.1);
        }

        // 2. Play Bass note
        if (ev.bassNote && PITCH[ev.bassNote]) {
          const freq = PITCH[ev.bassNote];
          sound.playTone(freq, 'triangle', 0.35, 0, 0.16);
        }

        // 3. Play Drum Beat
        if (ev.drumType === 'kick') {
          sound.playTone(60, 'sine', 0.08, 0, 0.22);
        } else if (ev.drumType === 'snare') {
          sound.playTone(220, 'square', 0.06, 0, 0.12);
        } else if (ev.drumType === 'hat') {
          sound.playTone(900, 'square', 0.02, 0, 0.05);
        }
      } else {
        break;
      }
    }
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

    // 1. Play automatic background music
    this.updateBGM(this.elapsedTime);

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

    // 5. Check Song Completion
    if (this.notes.length > 0) {
      const lastNoteTime = this.notes[this.notes.length - 1].time;
      if (this.elapsedTime > lastNoteTime + 2200) {
        this.songComplete();
      }
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

    // 1. Neon Cyber Stage Background
    this.ctx.fillStyle = '#080c16';
    this.ctx.fillRect(0, 0, w, h);

    // 2. Note Falling Track Lanes
    const lx = this.leftDrumX;
    const rx = this.rightDrumX;

    // Track Lane Gradients
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    this.ctx.fillRect(lx - 28, 0, 56, this.drumY);

    this.ctx.fillStyle = 'rgba(244, 63, 94, 0.06)';
    this.ctx.fillRect(rx - 28, 0, 56, this.drumY);

    // Track Borders
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(lx - 28, 0); this.ctx.lineTo(lx - 28, this.drumY);
    this.ctx.moveTo(lx + 28, 0); this.ctx.lineTo(lx + 28, this.drumY);
    this.ctx.moveTo(rx - 28, 0); this.ctx.lineTo(rx - 28, this.drumY);
    this.ctx.moveTo(rx + 28, 0); this.ctx.lineTo(rx + 28, this.drumY);
    this.ctx.stroke();

    // 3. Falling Glowing White Disc Notes
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
