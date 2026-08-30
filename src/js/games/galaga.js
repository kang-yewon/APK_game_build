import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

export class GalagaGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.score = 0;
    this.highScore = getHighScore('galaga');
    this.stage = 1;
    this.lives = 3;

    // Player spaceship
    this.player = {
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      speed: 5,
      isInvulnerable: false,
      invulnerableTimer: 0
    };

    // Game objects
    this.stars = [];
    this.lasers = [];
    this.enemyLasers = [];
    this.enemies = [];
    this.explosions = [];

    // Controller input
    this.keys = { left: false, right: false, fire: false };
    this.touchX = null;
    this.lastFireTime = 0;
    this.fireInterval = 220; // ms

    // Formation & Dive logic
    this.formationX = 0;
    this.formationDir = 1;
    this.formationSwaySpeed = 0.6;
    this.diveTimer = 0;
    this.diveInterval = 1800; // ms between enemy dive-bombs

    this.isRunning = false;
    this.animationFrameId = null;

    this.initStars();
    this.initControls();
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * 400,
        y: Math.random() * 600,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 2.5 + 0.8,
        color: ['#ffffff', '#93c5fd', '#fef08a', '#f472b6'][Math.floor(Math.random() * 4)]
      });
    }
  }

  initControls() {
    const btnLeft = document.getElementById('galaga-btn-left');
    const btnRight = document.getElementById('galaga-btn-right');
    const btnFire = document.getElementById('galaga-btn-fire');

    const attachHold = (btn, onStart, onEnd) => {
      if (!btn) return;
      const start = (e) => { if (e && e.cancelable) e.preventDefault(); onStart(); };
      const end = (e) => { if (e && e.cancelable) e.preventDefault(); onEnd(); };

      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointerleave', end);
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
    };

    attachHold(btnLeft, () => { this.keys.left = true; }, () => { this.keys.left = false; });
    attachHold(btnRight, () => { this.keys.right = true; }, () => { this.keys.right = false; });
    attachHold(btnFire, () => { this.keys.fire = true; this.shootLaser(); }, () => { this.keys.fire = false; });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { this.keys.left = true; e.preventDefault(); }
      else if (['ArrowRight', 'KeyD'].includes(e.code)) { this.keys.right = true; e.preventDefault(); }
      else if (['Space', 'KeyK', 'ArrowUp', 'KeyW'].includes(e.code)) {
        this.keys.fire = true;
        this.shootLaser();
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.left = false;
      else if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.right = false;
      else if (['Space', 'KeyK', 'ArrowUp', 'KeyW'].includes(e.code)) this.keys.fire = false;
    });

    // Touch Drag on Canvas for direct ship steering
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scaleX = (this.canvas.width / dpr) / rect.width;
        this.touchX = (e.touches[0].clientX - rect.left) * scaleX;
        this.shootLaser();
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scaleX = (this.canvas.width / dpr) / rect.width;
        this.touchX = (e.touches[0].clientX - rect.left) * scaleX;
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      this.touchX = null;
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = Math.max(280, rect.width > 50 ? rect.width : (window.innerWidth || 360));
    const height = Math.max(380, rect.height > 50 ? rect.height : (window.innerHeight - 150));
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.screenWidth = width;
    this.screenHeight = height;

    this.player.y = height - 52;
    if (this.player.x === 0 || this.player.x > width) {
      this.player.x = width / 2 - this.player.width / 2;
    }

    this.render();
  }

  start() {
    this.highScore = getHighScore('galaga');
    this.score = 0;
    this.stage = 1;
    this.lives = 3;
    this.lasers = [];
    this.enemyLasers = [];
    this.explosions = [];

    this.isRunning = true;
    this.resize();

    this.player.x = this.screenWidth / 2 - this.player.width / 2;
    this.player.y = this.screenHeight - 52;
    this.player.isInvulnerable = false;
    this.player.invulnerableTimer = 0;

    this.spawnWave(this.stage);
    this.updateUI();

    this.lastFrameTime = performance.now();
    cancelAnimationFrame(this.animationFrameId);
    this.loop(this.lastFrameTime);
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  spawnWave(stageNum) {
    this.enemies = [];
    const cols = 8;
    const rows = 4;
    const spacingX = Math.min(38, Math.floor((this.screenWidth - 40) / cols));
    const spacingY = 28;
    const startX = (this.screenWidth - cols * spacingX) / 2;
    const startY = 35;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = 'bee'; // Row 2,3
        let points = 50;
        let hp = 1;
        let color = '#feca57';

        if (r === 0) {
          type = 'boss';
          points = 150;
          hp = 2;
          color = '#1dd1a1';
        } else if (r === 1) {
          type = 'fighter';
          points = 80;
          hp = 1;
          color = '#ff6b6b';
        }

        this.enemies.push({
          type,
          points,
          hp,
          maxHp: hp,
          color,
          formX: startX + c * spacingX + spacingX / 2,
          formY: startY + r * spacingY,
          x: startX + c * spacingX + spacingX / 2,
          y: startY + r * spacingY,
          width: 24,
          height: 20,
          state: 'formation', // 'formation', 'diving', 'returning'
          diveAngle: 0,
          diveSpeed: 2.2 + stageNum * 0.3,
          diveCurve: Math.random() * 0.05 + 0.02
        });
      }
    }
  }

  shootLaser() {
    if (!this.isRunning) return;
    const now = performance.now();
    if (now - this.lastFireTime < this.fireInterval) return;
    this.lastFireTime = now;

    // Dual laser from player wings
    this.lasers.push({
      x: this.player.x + 6,
      y: this.player.y,
      width: 3,
      height: 12,
      speed: 9
    });
    this.lasers.push({
      x: this.player.x + this.player.width - 9,
      y: this.player.y,
      width: 3,
      height: 12,
      speed: 9
    });

    sound.playLaser();
  }

  enemyShoot(enemy) {
    if (Math.random() < 0.65) {
      this.enemyLasers.push({
        x: enemy.x + enemy.width / 2 - 2,
        y: enemy.y + enemy.height,
        width: 4,
        height: 10,
        vx: (this.player.x + this.player.width / 2 - enemy.x) * 0.015,
        vy: 3.5 + this.stage * 0.4
      });
    }
  }

  update(delta) {
    // 1. Move Stars
    this.stars.forEach(s => {
      s.y += s.speed;
      if (s.y > this.screenHeight) {
        s.y = 0;
        s.x = Math.random() * this.screenWidth;
      }
    });

    // 2. Player Controls
    if (this.keys.left) {
      this.player.x -= this.player.speed;
    }
    if (this.keys.right) {
      this.player.x += this.player.speed;
    }
    if (this.touchX !== null) {
      const targetCenterX = this.touchX;
      const curCenterX = this.player.x + this.player.width / 2;
      const diff = targetCenterX - curCenterX;
      if (Math.abs(diff) > 4) {
        this.player.x += Math.sign(diff) * Math.min(Math.abs(diff), this.player.speed * 1.5);
      }
    }

    // Keep player in bounds
    this.player.x = Math.max(4, Math.min(this.screenWidth - this.player.width - 4, this.player.x));

    if (this.keys.fire) {
      this.shootLaser();
    }

    // Invulnerability timer
    if (this.player.isInvulnerable) {
      this.player.invulnerableTimer -= delta;
      if (this.player.invulnerableTimer <= 0) {
        this.player.isInvulnerable = false;
      }
    }

    // 3. Update Player Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.y -= laser.speed;
      if (laser.y < -15) {
        this.lasers.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (
          laser.x < enemy.x + enemy.width &&
          laser.x + laser.width > enemy.x &&
          laser.y < enemy.y + enemy.height &&
          laser.y + laser.height > enemy.y
        ) {
          // Hit enemy
          this.lasers.splice(i, 1);
          enemy.hp--;

          if (enemy.hp <= 0) {
            this.score += enemy.points;
            this.updateUI();
            sound.playBrickHit();
            this.addExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
            this.enemies.splice(j, 1);

            // Check Wave Clear
            if (this.enemies.length === 0) {
              sound.playVictory();
              this.stage++;
              setTimeout(() => {
                if (this.isRunning) this.spawnWave(this.stage);
              }, 1200);
            }
          } else {
            sound.playPaddleHit();
          }
          break;
        }
      }
    }

    // 4. Update Formation Sway & Enemy Dive-Bombs
    this.formationX += this.formationDir * this.formationSwaySpeed;
    if (Math.abs(this.formationX) > 20) {
      this.formationDir *= -1;
    }

    this.diveTimer += delta;
    if (this.diveTimer >= this.diveInterval && this.enemies.length > 0) {
      this.diveTimer = 0;
      // Pick random formation enemy to dive
      const readyEnemies = this.enemies.filter(e => e.state === 'formation');
      if (readyEnemies.length > 0) {
        const diver = readyEnemies[Math.floor(Math.random() * readyEnemies.length)];
        diver.state = 'diving';
        diver.diveAngle = Math.atan2(this.player.y - diver.y, this.player.x - diver.x);
        this.enemyShoot(diver);
      }
    }

    // Update each enemy
    this.enemies.forEach(e => {
      if (e.state === 'formation') {
        e.x = e.formX + this.formationX;
        e.y = e.formY;
      } else if (e.state === 'diving') {
        e.x += Math.cos(e.diveAngle) * e.diveSpeed;
        e.y += Math.sin(e.diveAngle) * e.diveSpeed;
        e.diveAngle += (e.x < this.player.x ? 0.02 : -0.02);

        if (e.y > this.screenHeight + 30) {
          e.y = -30;
          e.state = 'returning';
        }
      } else if (e.state === 'returning') {
        const targetX = e.formX + this.formationX;
        const targetY = e.formY;
        e.x += (targetX - e.x) * 0.08;
        e.y += (targetY - e.y) * 0.08;
        if (Math.hypot(targetX - e.x, targetY - e.y) < 4) {
          e.state = 'formation';
        }
      }

      // Check collision with player
      if (!this.player.isInvulnerable && this.checkPlayerHit(e)) {
        this.playerHit();
      }
    });

    // 5. Update Enemy Lasers
    for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
      const el = this.enemyLasers[i];
      el.x += el.vx;
      el.y += el.vy;

      if (el.y > this.screenHeight + 20) {
        this.enemyLasers.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (!this.player.isInvulnerable && this.checkPlayerHit(el)) {
        this.enemyLasers.splice(i, 1);
        this.playerHit();
      }
    }

    // 6. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.life -= 0.04;
      exp.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
      });
      if (exp.life <= 0) {
        this.explosions.splice(i, 1);
      }
    }
  }

  checkPlayerHit(obj) {
    return (
      obj.x < this.player.x + this.player.width - 4 &&
      obj.x + obj.width > this.player.x + 4 &&
      obj.y < this.player.y + this.player.height - 4 &&
      obj.y + obj.height > this.player.y + 4
    );
  }

  playerHit() {
    this.lives--;
    sound.playExplode();
    this.addExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#38bdf8', 20);
    this.updateUI();

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.player.isInvulnerable = true;
      this.player.invulnerableTimer = 2000;
      this.player.x = this.screenWidth / 2 - this.player.width / 2;
    }
  }

  addExplosion(x, y, color, count = 12) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() < 0.5 ? color : '#f59e0b',
        size: Math.random() * 4 + 2
      });
    }
    this.explosions.push({ particles, life: 1.0 });
  }

  updateUI() {
    const scoreEl = document.getElementById('galaga-score');
    const livesEl = document.getElementById('galaga-lives');
    const stageEl = document.getElementById('galaga-stage');

    if (scoreEl) scoreEl.textContent = `SCORE: ${this.score.toLocaleString()}`;
    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
    if (stageEl) stageEl.textContent = `STAGE ${this.stage}`;
  }

  gameOver() {
    this.stop();
    sound.playGameOver();

    const isNewHigh = saveHighScore('galaga', this.score);
    this.highScore = getHighScore('galaga');

    modal.show({
      gameTitle: gameTitles.galaga,
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

    this.update(Math.min(delta, 50));
    this.render();

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  render() {
    const w = this.screenWidth;
    const h = this.screenHeight;
    if (!w || !h) return;

    // 1. Deep Space Background
    this.ctx.fillStyle = '#050814';
    this.ctx.fillRect(0, 0, w, h);

    // 2. Stars
    this.stars.forEach(s => {
      this.ctx.fillStyle = s.color;
      this.ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // 3. Player Lasers
    this.ctx.fillStyle = '#ef4444';
    this.ctx.shadowColor = '#f87171';
    this.ctx.shadowBlur = 8;
    this.lasers.forEach(l => {
      this.ctx.fillRect(l.x, l.y, l.width, l.height);
    });
    this.ctx.shadowBlur = 0;

    // 4. Enemy Lasers
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.shadowColor = '#0ea5e9';
    this.ctx.shadowBlur = 6;
    this.enemyLasers.forEach(el => {
      this.ctx.fillRect(el.x, el.y, el.width, el.height);
    });
    this.ctx.shadowBlur = 0;

    // 5. Enemies (Retro Galaga Insect & Boss Shapes)
    this.enemies.forEach(e => {
      this.drawEnemy(e);
    });

    // 6. Player Spaceship
    if (!this.player.isInvulnerable || Math.floor(performance.now() / 100) % 2 === 0) {
      this.drawPlayer();
    }

    // 7. Explosions
    this.explosions.forEach(exp => {
      this.ctx.globalAlpha = Math.max(0, exp.life);
      exp.particles.forEach(p => {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
      this.ctx.globalAlpha = 1.0;
    });
  }

  drawPlayer() {
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;

    // Ship Body (White / Red Arcade Fighter)
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.beginPath();
    this.ctx.moveTo(px + pw / 2, py);
    this.ctx.lineTo(px + pw - 2, py + ph);
    this.ctx.lineTo(px + pw / 2, py + ph - 8);
    this.ctx.lineTo(px + 2, py + ph);
    this.ctx.closePath();
    this.ctx.fill();

    // Red Wing Accents
    this.ctx.fillStyle = '#ef4444';
    this.ctx.fillRect(px, py + ph - 12, 6, 12);
    this.ctx.fillRect(px + pw - 6, py + ph - 12, 6, 12);

    // Cockpit
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillRect(px + pw / 2 - 2, py + 8, 4, 8);

    // Thruster Flame
    this.ctx.fillStyle = Math.random() < 0.5 ? '#f59e0b' : '#ef4444';
    this.ctx.beginPath();
    this.ctx.moveTo(px + pw / 2 - 4, py + ph - 4);
    this.ctx.lineTo(px + pw / 2 + 4, py + ph - 4);
    this.ctx.lineTo(px + pw / 2, py + ph + 8 + Math.random() * 4);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawEnemy(e) {
    const ex = e.x;
    const ey = e.y;
    const ew = e.width;
    const eh = e.height;

    this.ctx.save();
    this.ctx.fillStyle = e.color;

    if (e.type === 'boss') {
      // Green/Cyan Boss Galaga with horns
      this.ctx.fillRect(ex + 4, ey, ew - 8, eh);
      this.ctx.fillRect(ex, ey + 4, 4, eh - 6);
      this.ctx.fillRect(ex + ew - 4, ey + 4, 4, eh - 6);
      // Yellow Boss Eyes
      this.ctx.fillStyle = '#facc15';
      this.ctx.fillRect(ex + 6, ey + 6, 3, 4);
      this.ctx.fillRect(ex + ew - 9, ey + 6, 3, 4);

    } else if (e.type === 'fighter') {
      // Red Winged Fighter Alien
      this.ctx.beginPath();
      this.ctx.moveTo(ex + ew / 2, ey + eh);
      this.ctx.lineTo(ex, ey);
      this.ctx.lineTo(ex + ew, ey);
      this.ctx.closePath();
      this.ctx.fill();

      // Wingtips
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(ex + 2, ey + 2, 4, 4);
      this.ctx.fillRect(ex + ew - 6, ey + 2, 4, 4);

    } else {
      // Yellow Bee Alien
      this.ctx.beginPath();
      this.ctx.arc(ex + ew / 2, ey + eh / 2, ew / 2 - 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Bee Antennae
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(ex + 4, ey - 3, 2, 4);
      this.ctx.fillRect(ex + ew - 6, ey - 3, 2, 4);
    }

    this.ctx.restore();
  }
}
