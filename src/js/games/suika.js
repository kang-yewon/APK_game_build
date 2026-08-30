import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

export const FRUITS = [
  { name: '체리', emoji: '🍒', radius: 14, color: '#ef4444', score: 2 },
  { name: '딸기', emoji: '🍓', radius: 18, color: '#f43f5e', score: 4 },
  { name: '포도', emoji: '🍇', radius: 24, color: '#a855f7', score: 8 },
  { name: '귤', emoji: '🍊', radius: 30, color: '#f97316', score: 16 },
  { name: '감', emoji: '柿', radius: 37, color: '#ea580c', score: 32 },
  { name: '사과', emoji: '🍎', radius: 45, color: '#dc2626', score: 64 },
  { name: '배', emoji: '🍐', radius: 53, color: '#84cc16', score: 128 },
  { name: '복숭아', emoji: '🍑', radius: 62, color: '#fb7185', score: 256 },
  { name: '파인애플', emoji: '🍍', radius: 73, color: '#eab308', score: 512 },
  { name: '멜론', emoji: '🍈', radius: 85, color: '#22c55e', score: 1024 },
  { name: '수박', emoji: '🍉', radius: 98, color: '#15803d', score: 2048 }
];

export class SuikaGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.score = 0;
    this.highScore = getHighScore('suika');

    // Box dimensions
    this.boxWidth = 320;
    this.boxHeight = 440;
    this.boxX = 0;
    this.boxY = 0;
    this.dangerY = 70; // Danger threshold from top of box

    // Physics items
    this.fruits = [];
    this.particles = [];
    this.nextFruitLevel = 0;
    this.currentFruitLevel = 0;
    this.nextFruitId = 1;

    // Dropper state
    this.dropX = 160;
    this.canDrop = true;
    this.isHolding = false;
    this.dropCooldownMs = 600;
    this.lastDropTime = 0;

    // Danger timer (seconds above danger line)
    this.dangerTime = 0;

    this.isRunning = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;

    this.initControls();
  }

  initControls() {
    const btnDrop = document.getElementById('suika-btn-drop');
    const btnLeft = document.getElementById('suika-btn-left');
    const btnRight = document.getElementById('suika-btn-right');

    btnDrop?.addEventListener('click', () => {
      if (this.isRunning) this.dropFruit();
    });

    const moveDropper = (dx) => {
      if (!this.isRunning) return;
      const radius = FRUITS[this.currentFruitLevel].radius;
      this.dropX = Math.max(this.boxX + radius + 4, Math.min(this.boxX + this.boxWidth - radius - 4, this.dropX + dx));
    };

    btnLeft?.addEventListener('pointerdown', (e) => { if (e.cancelable) e.preventDefault(); moveDropper(-20); });
    btnRight?.addEventListener('pointerdown', (e) => { if (e.cancelable) e.preventDefault(); moveDropper(20); });

    // Touch and Drag on Canvas
    const getCanvasPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = (this.canvas.width / dpr) / rect.width;
      const scaleY = (this.canvas.height / dpr) / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const onTouchStart = (e) => {
      if (!this.isRunning) return;
      const pos = getCanvasPos(e);
      const radius = FRUITS[this.currentFruitLevel].radius;
      this.dropX = Math.max(this.boxX + radius + 4, Math.min(this.boxX + this.boxWidth - radius - 4, pos.x));
      this.isHolding = true;
      if (e.cancelable) e.preventDefault();
    };

    const onTouchMove = (e) => {
      if (!this.isRunning || !this.isHolding) return;
      const pos = getCanvasPos(e);
      const radius = FRUITS[this.currentFruitLevel].radius;
      this.dropX = Math.max(this.boxX + radius + 4, Math.min(this.boxX + this.boxWidth - radius - 4, pos.x));
      if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = (e) => {
      if (!this.isRunning || !this.isHolding) return;
      this.isHolding = false;
      this.dropFruit();
      if (e.cancelable) e.preventDefault();
    };

    this.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    this.canvas.addEventListener('mousedown', onTouchStart);
    this.canvas.addEventListener('mousemove', onTouchMove);
    this.canvas.addEventListener('mouseup', onTouchEnd);

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { moveDropper(-15); e.preventDefault(); }
      else if (['ArrowRight', 'KeyD'].includes(e.code)) { moveDropper(15); e.preventDefault(); }
      else if (['Space', 'ArrowDown', 'KeyS'].includes(e.code)) { this.dropFruit(); e.preventDefault(); }
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

    this.screenWidth = availW;
    this.screenHeight = availH;

    this.boxWidth = Math.min(availW - 16, 360);
    this.boxHeight = Math.min(availH - 24, 520);
    this.boxX = (availW - this.boxWidth) / 2;
    this.boxY = 12;

    this.render();
  }

  start() {
    this.highScore = getHighScore('suika');
    this.score = 0;
    this.fruits = [];
    this.particles = [];
    this.dangerTime = 0;
    this.canDrop = true;

    this.currentFruitLevel = this.getRandomStartLevel();
    this.nextFruitLevel = this.getRandomStartLevel();

    this.isRunning = true;
    this.resize();

    this.dropX = this.boxX + this.boxWidth / 2;
    this.updateUI();

    this.lastFrameTime = performance.now();
    cancelAnimationFrame(this.animationFrameId);
    this.loop(this.lastFrameTime);
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  getRandomStartLevel() {
    // Drop cherry, strawberry, grape, or tangerine at start
    const rand = Math.random();
    if (rand < 0.4) return 0; // Cherry
    if (rand < 0.7) return 1; // Strawberry
    if (rand < 0.9) return 2; // Grape
    return 3; // Tangerine
  }

  dropFruit() {
    if (!this.canDrop || !this.isRunning) return;

    const level = this.currentFruitLevel;
    const def = FRUITS[level];

    this.fruits.push({
      id: this.nextFruitId++,
      level,
      x: this.dropX,
      y: this.boxY + 30,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1.5,
      radius: def.radius,
      isSettled: false,
      settleTimer: 0,
      isMerging: false
    });

    sound.playDrop();
    this.canDrop = false;

    setTimeout(() => {
      if (this.isRunning) {
        this.currentFruitLevel = this.nextFruitLevel;
        this.nextFruitLevel = this.getRandomStartLevel();
        this.canDrop = true;
        this.updateUI();
      }
    }, this.dropCooldownMs);
  }

  updatePhysics(delta) {
    const gravity = 0.32;
    const bounce = 0.22;
    const friction = 0.985;
    const iterations = 8;

    // 1. Move fruits & apply gravity
    this.fruits.forEach(f => {
      if (f.isMerging) return;
      f.vy += gravity;
      f.vx *= friction;
      f.vy *= friction;

      f.x += f.vx;
      f.y += f.vy;

      // Box Boundaries
      const leftWall = this.boxX + f.radius;
      const rightWall = this.boxX + this.boxWidth - f.radius;
      const floor = this.boxY + this.boxHeight - f.radius;

      if (f.x < leftWall) {
        f.x = leftWall;
        f.vx = -f.vx * bounce;
      } else if (f.x > rightWall) {
        f.x = rightWall;
        f.vx = -f.vx * bounce;
      }

      if (f.y >= floor) {
        f.y = floor;
        f.vy = -f.vy * bounce;
        f.isSettled = true;
      }
    });

    // 2. Circle-Circle Collision & Merge
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < this.fruits.length; i++) {
        for (let j = i + 1; j < this.fruits.length; j++) {
          const f1 = this.fruits[i];
          const f2 = this.fruits[j];
          if (f1.isMerging || f2.isMerging) continue;

          const dx = f2.x - f1.x;
          const dy = f2.y - f1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = f1.radius + f2.radius;

          if (dist < minDist && dist > 0.001) {
            // Check Merge
            if (f1.level === f2.level && f1.level < FRUITS.length - 1) {
              f1.isMerging = true;
              f2.isMerging = true;

              const midX = (f1.x + f2.x) / 2;
              const midY = (f1.y + f2.y) / 2;
              const nextLevel = f1.level + 1;

              this.mergeFruits(midX, midY, nextLevel);
              break;
            }

            // Push apart
            const overlap = (minDist - dist);
            const nx = dx / dist;
            const ny = dy / dist;

            const m1 = f1.radius;
            const m2 = f2.radius;
            const totalM = m1 + m2;

            f1.x -= nx * overlap * (m2 / totalM);
            f1.y -= ny * overlap * (m2 / totalM);
            f2.x += nx * overlap * (m1 / totalM);
            f2.y += ny * overlap * (m1 / totalM);

            // Velocity impulse
            const kx = f1.vx - f2.vx;
            const ky = f1.vy - f2.vy;
            const p = 2 * (nx * kx + ny * ky) / totalM;

            f1.vx -= p * m2 * nx * 0.4;
            f1.vy -= p * m2 * ny * 0.4;
            f2.vx += p * m1 * nx * 0.4;
            f2.vy += p * m1 * ny * 0.4;

            f1.isSettled = true;
            f2.isSettled = true;
          }
        }
      }
    }

    // Clean merged fruits
    this.fruits = this.fruits.filter(f => !f.isMerging);

    // 3. Danger Line Check
    let hasOverflow = false;
    this.fruits.forEach(f => {
      if (f.isSettled && f.y - f.radius < this.boxY + this.dangerY) {
        hasOverflow = true;
      }
    });

    if (hasOverflow) {
      this.dangerTime += delta / 1000;
      if (this.dangerTime > 2.5) {
        this.gameOver();
      }
    } else {
      this.dangerTime = Math.max(0, this.dangerTime - delta / 1000);
    }

    // 4. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.035;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  mergeFruits(x, y, newLevel) {
    const def = FRUITS[newLevel];
    this.fruits.push({
      id: this.nextTileId++,
      level: newLevel,
      x,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1.5, // Pop bounce on merge
      radius: def.radius,
      isSettled: true,
      isMerging: false
    });

    this.score += def.score;
    this.updateUI();

    if (newLevel === 10) {
      sound.playVictory();
    } else {
      sound.playBrickHit();
    }

    // Spawn juicy merge particles
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 3,
        color: def.color,
        life: 1.0
      });
    }
  }

  updateUI() {
    const scoreEl = document.getElementById('suika-score');
    const nextEl = document.getElementById('suika-next-fruit');
    if (scoreEl) scoreEl.textContent = `SCORE: ${this.score.toLocaleString()}`;
    if (nextEl) nextEl.textContent = `${FRUITS[this.nextFruitLevel].emoji} ${FRUITS[this.nextFruitLevel].name}`;
  }

  gameOver() {
    this.stop();
    sound.playExplode();

    const isNewHigh = saveHighScore('suika', this.score);
    this.highScore = getHighScore('suika');

    modal.show({
      gameTitle: gameTitles.suika,
      score: this.score,
      highScore: this.highScore,
      isNewHigh,
      onRestart: () => this.start(),
      onHome: () => this.onReturnHome()
    });
  }

  loop(timestamp) {
    if (!this.isRunning) return;
    const delta = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    this.updatePhysics(Math.min(delta, 50));
    this.render();

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  render() {
    const w = this.screenWidth;
    const h = this.screenHeight;
    if (!w || !h) return;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, w, h);

    const bx = this.boxX;
    const by = this.boxY;
    const bw = this.boxWidth;
    const bh = this.boxHeight;

    // 1. Draw Jar / Box Container
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(bx, by, bw, bh);

    // Box Walls (Left, Right, Bottom)
    this.ctx.fillStyle = '#475569';
    this.ctx.fillRect(bx - 6, by, 6, bh + 6);
    this.ctx.fillRect(bx + bw, by, 6, bh + 6);
    this.ctx.fillRect(bx - 6, by + bh, bw + 12, 8);

    // 2. Danger Line
    const dangerY = by + this.dangerY;
    this.ctx.strokeStyle = this.dangerTime > 0 ? '#ef4444' : '#eab308';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);
    this.ctx.beginPath();
    this.ctx.moveTo(bx, dangerY);
    this.ctx.lineTo(bx + bw, dangerY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    if (this.dangerTime > 0) {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`⚠️ 위험! ${(3 - this.dangerTime).toFixed(1)}초`, bx + bw / 2, dangerY - 8);
    }

    // 3. Draw Dropper Guide & Held Fruit
    if (this.canDrop) {
      const curDef = FRUITS[this.currentFruitLevel];

      // Dashed Aiming Guide Line
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.dropX, by);
      this.ctx.lineTo(this.dropX, by + bh);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Top fruit preview
      this.drawFruitCircle(this.dropX, by + 30, curDef.radius, curDef.color, curDef.emoji);
    }

    // 4. Draw Fruits in Box
    this.fruits.forEach(f => {
      const def = FRUITS[f.level];
      this.drawFruitCircle(f.x, f.y, f.radius, def.color, def.emoji);
    });

    // 5. Draw Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    });
  }

  drawFruitCircle(x, y, radius, color, emoji) {
    this.ctx.save();

    // Shadow & Outer border
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // 3D Glass / Gloss shine
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.45, 0, Math.PI * 2);
    this.ctx.fill();

    // Emoji icon in center
    this.ctx.font = `${Math.floor(radius * 1.05)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, x, y + 2);

    this.ctx.restore();
  }
}
