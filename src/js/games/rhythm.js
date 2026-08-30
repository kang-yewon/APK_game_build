import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

// Pitch frequencies (Hz) for Avicii - Waiting for Love (F# minor / A major)
const PITCH = {
  'F#2': 92.50, 'G#2': 103.83, 'A2': 110.00, 'B2': 123.47, 'C#3': 138.59, 'D3': 146.83, 'E3': 164.81,
  'F#3': 185.00, 'G#3': 207.65, 'A3': 220.00, 'B3': 246.94, 'C#4': 277.18, 'D4': 293.66, 'E4': 329.63,
  'F#4': 369.99, 'G#4': 415.30, 'A4': 440.00, 'B4': 493.88, 'C#5': 554.37, 'D5': 587.33, 'E5': 659.25,
  'F#5': 739.99, 'G#5': 830.61, 'A5': 880.00
};

// Avicii - Waiting for Love Tempo & Timing
const BPM = 128; // 128 BPM Progressive House
const BEAT = (60 / BPM) * 1000; // 468.75 ms
const HALF_BEAT = BEAT / 2; // 234.375 ms (8th note)
const Q_BEAT = BEAT / 4; // 117.1875 ms (16th note)

// Master Sequence for Avicii - Waiting for Love
// Format: [beatOffset, leadNote, chordBass, drumType: 'kick'|'snare'|'hat'|'roll'|'']
const AVICII_BGM_SCORE = [
  // --- SECTION 1: INTRO PIANO RIFF ("Where there's a will...") (Beats 0 - 31) ---
  // F#m (0-7)
  [0.0, 'C#4', 'F#3', ''], [0.75, 'A4', '', ''], [1.5, 'F#4', 'F#2', ''], [2.5, 'C#4', '', ''],
  [3.25, 'A4', 'F#3', ''], [4.0, 'F#4', '', 'hat'], [5.0, 'C#4', 'F#2', 'hat'], [6.0, 'A4', '', 'hat'], [7.0, 'F#4', '', 'hat'],
  // D (8-15)
  [8.0, 'D4', 'D3', 'hat'], [8.75, 'A4', '', 'hat'], [9.5, 'F#4', 'D2', 'hat'], [10.5, 'D4', '', 'hat'],
  [11.25, 'A4', 'D3', 'hat'], [12.0, 'F#4', '', 'hat'], [13.0, 'D4', 'D2', 'hat'], [14.0, 'A4', '', 'hat'], [15.0, 'F#4', '', 'hat'],
  // A (16-23)
  [16.0, 'C#4', 'A3', 'kick'], [16.75, 'E4', '', 'hat'], [17.5, 'A4', 'A2', 'snare'], [18.5, 'C#4', '', 'hat'],
  [19.25, 'E4', 'A3', 'kick'], [20.0, 'A4', '', 'snare'], [21.0, 'C#4', 'A2', 'kick'], [22.0, 'E4', '', 'snare'], [23.0, 'A4', '', 'hat'],
  // E (24-31)
  [24.0, 'B3', 'E3', 'kick'], [24.75, 'E4', '', 'hat'], [25.5, 'G#4', 'E2', 'snare'], [26.5, 'B3', '', 'hat'],
  [27.25, 'E4', 'E3', 'kick'], [28.0, 'G#4', '', 'snare'], [29.0, 'B3', 'E2', 'kick'], [30.0, 'E4', '', 'snare'], [31.0, 'G#4', '', 'hat'],

  // --- SECTION 2: PRE-CHORUS BUILD-UP ("Monday left me broken, Tuesday...") (Beats 32 - 63) ---
  // Monday left me broken (F#m)
  [32.0, 'C#5', 'F#3', 'kick'], [33.0, 'C#5', '', 'snare'], [34.0, 'B4', 'F#2', 'kick'], [35.0, 'A4', '', 'snare'],
  // Tuesday I was through with hoping (D)
  [36.0, 'A4', 'D3', 'kick'], [37.0, 'G#4', '', 'snare'], [38.0, 'F#4', 'D2', 'kick'], [39.0, 'E4', '', 'snare'],
  // Wednesday my empty arms were open (A)
  [40.0, 'A4', 'A3', 'kick'], [41.0, 'A4', '', 'snare'], [42.0, 'B4', 'A2', 'kick'], [43.0, 'C#5', '', 'snare'],
  // Thursday waiting for love (E)
  [44.0, 'B4', 'E3', 'kick'], [45.0, 'A4', '', 'snare'], [46.0, 'G#4', 'E2', 'kick'], [47.0, 'F#4', '', 'snare'],
  // Friday burning like a fire (F#m + accelerating snare roll)
  [48.0, 'C#5', 'F#3', 'snare'], [48.5, 'C#5', '', 'snare'], [49.0, 'D5', '', 'snare'], [49.5, 'C#5', '', 'snare'],
  [50.0, 'B4', 'D3', 'snare'], [50.5, 'A4', '', 'snare'], [51.0, 'B4', '', 'snare'], [51.5, 'C#5', '', 'snare'],
  // Sunday waiting for love (A -> E riser roll)
  [52.0, 'C#5', 'A3', 'roll'], [52.5, 'D5', '', 'roll'], [53.0, 'E5', '', 'roll'], [53.5, 'F#5', '', 'roll'],
  [54.0, 'G#5', 'E3', 'roll'], [54.5, 'A5', '', 'roll'], [55.0, 'G#5', '', 'roll'], [55.5, 'F#5', '', 'roll'],
  [56.0, 'E5', '', 'roll'], [57.0, 'C#5', '', 'roll'], [58.0, 'A4', '', 'roll'], [59.0, 'F#4', '', 'roll'],
  [60.0, 'E4', '', 'roll'], [61.0, 'C#4', '', 'roll'], [62.0, '', '', ''], [63.0, 'C#5', '', 'hat'],

  // --- SECTION 3: THE LEGENDARY AVICII DROP (Beats 64 - 100) ---
  // Phrase 1 (F#m)
  [64.0, 'C#5', 'F#2', 'kick'], [64.5, 'B4', '', 'hat'], [65.0, 'A4', '', 'snare'], [65.5, 'G#4', '', 'hat'],
  [66.0, 'F#4', 'F#3', 'kick'], [66.5, 'A4', '', 'hat'], [67.0, 'G#4', '', 'snare'], [67.5, 'F#4', '', 'hat'],
  // Phrase 2 (D)
  [68.0, 'E4', 'D2', 'kick'], [68.5, 'F#4', '', 'hat'], [69.0, 'C#5', '', 'snare'], [69.5, 'D5', '', 'hat'],
  [70.0, 'C#5', 'D3', 'kick'], [70.5, 'B4', '', 'hat'], [71.0, 'A4', '', 'snare'], [71.5, 'B4', '', 'hat'],
  // Phrase 3 (A)
  [72.0, 'C#5', 'A2', 'kick'], [72.5, 'E5', '', 'hat'], [73.0, 'C#5', '', 'snare'], [73.5, 'B4', '', 'hat'],
  [74.0, 'A4', 'A3', 'kick'], [74.5, 'G#4', '', 'hat'], [75.0, 'F#4', '', 'snare'], [75.5, 'A4', '', 'hat'],
  // Phrase 4 (E)
  [76.0, 'G#4', 'E2', 'kick'], [76.5, 'F#4', '', 'hat'], [77.0, 'E4', '', 'snare'], [77.5, 'F#4', '', 'hat'],
  [78.0, 'G#4', 'E3', 'kick'], [78.5, 'A4', '', 'hat'], [79.0, 'B4', '', 'snare'], [79.5, 'C#5', '', 'hat'],

  // Drop Repeat 2 (Higher Energy with synths)
  [80.0, 'C#5', 'F#2', 'kick'], [80.5, 'B4', '', 'hat'], [81.0, 'A4', '', 'snare'], [81.5, 'G#4', '', 'hat'],
  [82.0, 'F#4', 'F#3', 'kick'], [82.5, 'A4', '', 'hat'], [83.0, 'G#4', '', 'snare'], [83.5, 'F#4', '', 'hat'],
  [84.0, 'E4', 'D2', 'kick'], [84.5, 'F#4', '', 'hat'], [85.0, 'C#5', '', 'snare'], [85.5, 'D5', '', 'hat'],
  [86.0, 'E5', 'D3', 'kick'], [86.5, 'D5', '', 'hat'], [87.0, 'C#5', '', 'snare'], [87.5, 'B4', '', 'hat'],
  [88.0, 'A4', 'A2', 'kick'], [88.5, 'B4', '', 'hat'], [89.0, 'C#5', '', 'snare'], [89.5, 'D5', '', 'hat'],
  [90.0, 'E5', 'A3', 'kick'], [90.5, 'F#5', '', 'hat'], [91.0, 'E5', '', 'snare'], [91.5, 'D5', '', 'hat'],
  [92.0, 'C#5', 'E2', 'kick'], [92.5, 'B4', '', 'hat'], [93.0, 'A4', '', 'snare'], [93.5, 'G#4', '', 'hat'],
  [94.0, 'F#4', 'E3', 'kick'], [95.0, 'F#4', '', 'snare'], [96.0, 'F#4', 'F#2', 'kick'], [97.0, 'F#4', '', 'snare']
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
    this.currentPatternName = '랜덤 패턴';

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
    this.fallDurationMs = 1200; // ms for white disc to reach drum from top at 128 BPM

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

    // Keyboard support (D/F or Left for Left Drum, J/K/Space or Right for Right Drum)
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

  // Generates procedurally randomized note chart for Avicii 128 BPM Waiting for Love
  generateDynamicChart() {
    const chart = [];
    const leadInMs = 2000; // ms lead-in before first note hits drum

    // 4 Distinct Pattern Archetypes chosen randomly each run
    const PATTERNS = [
      { name: '아비치 드롭 댄스', doubleChance: 0.25, streamChance: 0.35, swapRate: 0.65, syncopate: true },
      { name: '피아노 앤 보컬 리듬', doubleChance: 0.15, streamChance: 0.20, swapRate: 0.50, syncopate: false },
      { name: '좌우 128BPM 트위스트', doubleChance: 0.20, streamChance: 0.55, swapRate: 0.85, syncopate: false },
      { name: 'EDM 4비트 킥 클랩', doubleChance: 0.40, streamChance: 0.40, swapRate: 0.45, syncopate: true }
    ];

    const style = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    this.currentPatternName = style.name;

    let curLane = Math.random() < 0.5 ? 0 : 1;

    AVICII_BGM_SCORE.forEach(([beatOffset, leadNote, bassNote, drumType]) => {
      const baseTime = Math.round(leadInMs + beatOffset * BEAT);

      // Section 1: Intro Piano (0 - 31 beats)
      if (beatOffset < 32) {
        if (leadNote && (beatOffset % 1 === 0 || Math.random() < 0.75)) {
          if (Math.random() < style.swapRate) curLane = 1 - curLane;
          chart.push({ time: baseTime, lane: curLane, hit: false, missed: false });
        }
      }
      // Section 2: Monday-Sunday Pre-Chorus (32 - 47 beats)
      else if (beatOffset < 48) {
        if (leadNote || (drumType === 'kick' && Math.random() < 0.6)) {
          if (Math.random() < style.swapRate) curLane = 1 - curLane;
          chart.push({ time: baseTime, lane: curLane, hit: false, missed: false });

          // Syncopated 16th ghost note
          if (style.syncopate && Math.random() < 0.25) {
            chart.push({ time: baseTime + Q_BEAT, lane: 1 - curLane, hit: false, missed: false });
          }
        }
      }
      // Section 3: Accelerating Snare Roll Riser (48 - 63 beats)
      else if (beatOffset < 64) {
        if (leadNote || drumType === 'snare' || drumType === 'roll') {
          if (Math.random() < style.swapRate) curLane = 1 - curLane;
          chart.push({ time: baseTime, lane: curLane, hit: false, missed: false });

          // Stream burst note
          if (Math.random() < style.streamChance) {
            chart.push({ time: baseTime + HALF_BEAT, lane: 1 - curLane, hit: false, missed: false });
          }
        }
      }
      // Section 4: Avicii Legendary Drop (64 - 100 beats)
      else {
        const isDouble = Math.random() < style.doubleChance;
        if (isDouble) {
          // Double tap (both drums hit simultaneously on heavy drops)
          chart.push({ time: baseTime, lane: 0, hit: false, missed: false });
          chart.push({ time: baseTime, lane: 1, hit: false, missed: false });
        } else if (leadNote || drumType) {
          if (Math.random() < style.swapRate) curLane = 1 - curLane;
          chart.push({ time: baseTime, lane: curLane, hit: false, missed: false });

          if (Math.random() < style.streamChance) {
            chart.push({ time: baseTime + Q_BEAT, lane: 1 - curLane, hit: false, missed: false });
          }
        }
      }
    });

    // Sort by timestamp
    chart.sort((a, b) => a.time - b.time);
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
    this.bgmEvents = AVICII_BGM_SCORE.map(([beatOffset, leadNote, bassNote, drumType]) => ({
      time: Math.round(2000 + beatOffset * BEAT),
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

  // Plays punchy acoustic/electronic drum impact on hit
  playDrumAcoustic(lane) {
    if (!sound.isSoundEnabled()) return;
    if (lane === 0) {
      // Left Drum: Punchy Bass Drum 'DON'
      sound.playTone(90, 'triangle', 0.10, 0, 0.30);
      sound.playTone(60, 'sine', 0.16, 0, 0.35);
    } else {
      // Right Drum: Snappy EDM Clap / Snare 'KA'
      sound.playTone(480, 'square', 0.05, 0, 0.20);
      sound.playTone(320, 'sawtooth', 0.08, 0, 0.22);
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
        if (diff < minDiff && diff <= 200) {
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

      if (minDiff <= 50) {
        text = 'PERFECT!';
        color = '#facc15';
        pts = 300;
      } else if (minDiff <= 110) {
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

  // Synthesizes Avicii - Waiting for Love 128 BPM multi-voice EDM track
  updateBGM(currentTime) {
    if (!sound.isSoundEnabled()) return;

    while (this.bgmEventIndex < this.bgmEvents.length) {
      const ev = this.bgmEvents[this.bgmEventIndex];
      if (currentTime >= ev.time) {
        ev.played = true;
        this.bgmEventIndex++;

        // 1. Play Lead Synth Melody (Avicii signature bright saw lead)
        if (ev.leadNote && PITCH[ev.leadNote]) {
          const freq = PITCH[ev.leadNote];
          sound.playTone(freq, 'sawtooth', 0.18, 0, 0.15);
          sound.playTone(freq * 0.5, 'sine', 0.20, 0, 0.12);
        }

        // 2. Play Bass note (Driving EDM bassline)
        if (ev.bassNote && PITCH[ev.bassNote]) {
          const freq = PITCH[ev.bassNote];
          sound.playTone(freq, 'triangle', 0.28, 0, 0.18);
        }

        // 3. Play Drum Elements (Four-on-the-floor 128 BPM beat)
        if (ev.drumType === 'kick') {
          sound.playTone(65, 'sine', 0.08, 0, 0.24);
        } else if (ev.drumType === 'snare') {
          sound.playTone(240, 'square', 0.06, 0, 0.14);
        } else if (ev.drumType === 'hat') {
          sound.playTone(950, 'square', 0.02, 0, 0.06);
        } else if (ev.drumType === 'roll') {
          sound.playTone(200 + Math.random() * 80, 'square', 0.04, 0, 0.10);
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
        if (this.elapsedTime - note.time > 200) {
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
      gameTitle: `🎵 Avicii - Waiting for Love (${this.currentPatternName}) 완곡!`,
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
    const patternEl = document.getElementById('rhythm-pattern-style');

    if (scoreEl) scoreEl.textContent = `SCORE: ${this.score.toLocaleString()}`;
    if (comboEl) comboEl.textContent = this.combo > 1 ? `COMBO ${this.combo}🔥` : '';
    if (patternEl) patternEl.textContent = `🎲 ${this.currentPatternName}`;
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

    // 1. Neon EDM Stage Background
    this.ctx.fillStyle = '#090d1a';
    this.ctx.fillRect(0, 0, w, h);

    // 2. Note Falling Track Lanes
    const lx = this.leftDrumX;
    const rx = this.rightDrumX;

    // Track Lane Gradients
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
    this.ctx.fillRect(lx - 28, 0, 56, this.drumY);

    this.ctx.fillStyle = 'rgba(244, 63, 94, 0.07)';
    this.ctx.fillRect(rx - 28, 0, 56, this.drumY);

    // Track Borders
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
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
        this.ctx.shadowBlur = 14;

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
