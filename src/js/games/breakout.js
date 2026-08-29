import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

export class BreakoutGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.score = 0;
    this.lives = 3;
    this.highScore = getHighScore('breakout');
    this.level = 1;

    // Paddle
    this.paddleWidth = 75;
    this.paddleHeight = 12;
    this.paddleX = 0;
    this.paddleSpeed = 8;
    this.isMovingLeft = false;
    this.isMovingRight = false;

    // Ball
    this.ballRadius = 6;
    this.ballX = 0;
    this.ballY = 0;
    this.ballSpeedX = 0;
    this.ballSpeedY = 0;
    this.ballSpeedBase = 5;
    this.ballAttached = true; // Attached to paddle before launch

    // Bricks
    this.brickRows = 6;
    this.brickCols = 8;
    this.bricks = [];
    this.brickColors = ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#1abc9c'];

    // Particles & Stars
    this.particles = [];
    this.stars = [];

    this.isRunning = false;
    this.animationFrameId = null;

    this.initControls();
    this.initStars();
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.03 + 0.01
      });
    }
  }

  initControls() {
    const btnLeft = document.getElementById('breakout-btn-left');
    const btnRight = document.getElementById('breakout-btn-right');

    const setLeft = (val) => { this.isMovingLeft = val; if (this.ballAttached && val) this.launchBall(); };
    const setRight = (val) => { this.isMovingRight = val; if (this.ballAttached && val) this.launchBall(); };

    btnLeft?.addEventListener('pointerdown', (e) => { e.preventDefault(); setLeft(true); });
    btnLeft?.addEventListener('pointerup', (e) => { e.preventDefault(); setLeft(false); });
    btnLeft?.addEventListener('pointercancel', () => setLeft(false));

    btnRight?.addEventListener('pointerdown', (e) => { e.preventDefault(); setRight(true); });
    btnRight?.addEventListener('pointerup', (e) => { e.preventDefault(); setRight(false); });
    btnRight?.addEventListener('pointercancel', () => setRight(false));

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { setLeft(true); e.preventDefault(); }
      else if (['ArrowRight', 'KeyD'].includes(e.code)) { setRight(true); e.preventDefault(); }
      else if (e.code === 'Space' && this.ballAttached) { this.launchBall(); e.preventDefault(); }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) setLeft(false);
      else if (['ArrowRight', 'KeyD'].includes(e.code)) setRight(false);
    });

    // Touch paddle drag on canvas
    const handleTouchMove = (e) => {
      if (!this.isRunning) return;
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const w = this.canvas.width / (window.devicePixelRatio || 1);

      this.paddleX = Math.max(0, Math.min(w - this.paddleWidth, x - this.paddleWidth / 2));
      if (this.ballAttached) {
        this.ballX = this.paddleX + this.paddleWidth / 2;
      }
    };

    const handleTouchStart = (e) => {
      handleTouchMove(e);
      if (this.ballAttached) {
        this.launchBall();
      }
    };

    this.canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    this.canvas.addEventListener('mousedown', handleTouchStart);
    this.canvas.addEventListener('mousemove', (e) => { if (e.buttons === 1) handleTouchMove(e); });
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = Math.min(parent.clientWidth - 16, 420);
    const height = Math.min(parent.clientHeight - 16, 560);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.resetBall();
    this.render();
  }

  start() {
    this.highScore = getHighScore('breakout');
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.updateUI();

    this.initBricks();
    this.resetBall();

    this.isRunning = true;
    this.resize();

    cancelAnimationFrame(this.animationFrameId);
    this.loop();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  initBricks() {
    const w = this.canvas.width / (window.devicePixelRatio || 1) || 360;
    const padding = 6;
    const offsetTop = 40;
    const offsetLeft = 12;
    const brickWidth = (w - offsetLeft * 2 - (this.brickCols - 1) * padding) / this.brickCols;
    const brickHeight = 16;

    this.bricks = [];
    for (let r = 0; r < this.brickRows; r++) {
      for (let c = 0; c < this.brickCols; c++) {
        const x = offsetLeft + c * (brickWidth + padding);
        const y = offsetTop + r * (brickHeight + padding);
        this.bricks.push({
          x, y,
          w: brickWidth,
          h: brickHeight,
          color: this.brickColors[r % this.brickColors.length],
          points: (this.brickRows - r) * 10,
          alive: true
        });
      }
    }
  }

  resetBall() {
    const w = this.canvas.width / (window.devicePixelRatio || 1) || 360;
    const h = this.canvas.height / (window.devicePixelRatio || 1) || 500;

    this.paddleX = (w - this.paddleWidth) / 2;
    this.ballAttached = true;
    this.ballX = this.paddleX + this.paddleWidth / 2;
    this.ballY = h - 50 - this.ballRadius;
    this.ballSpeedX = 0;
    this.ballSpeedY = 0;
  }

  launchBall() {
    if (!this.ballAttached) return;
    this.ballAttached = false;
    const angle = (Math.random() * 0.6 - 0.3) * Math.PI; // -54 to +54 deg from vertical
    const speed = this.ballSpeedBase + (this.level - 1) * 0.5;
    this.ballSpeedX = Math.sin(angle) * speed;
    this.ballSpeedY = -Math.cos(angle) * speed;
    sound.playPaddleHit();
  }

  loop() {
    if (!this.isRunning) return;
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  update() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    // Update paddle movement via buttons
    if (this.isMovingLeft) {
      this.paddleX = Math.max(0, this.paddleX - this.paddleSpeed);
    }
    if (this.isMovingRight) {
      this.paddleX = Math.min(w - this.paddleWidth, this.paddleX + this.paddleSpeed);
    }

    if (this.ballAttached) {
      this.ballX = this.paddleX + this.paddleWidth / 2;
      this.ballY = h - 45 - this.ballRadius;
      return;
    }

    // Move Ball
    this.ballX += this.ballSpeedX;
    this.ballY += this.ballSpeedY;

    // Wall collisions
    if (this.ballX - this.ballRadius <= 0) {
      this.ballX = this.ballRadius;
      this.ballSpeedX = -this.ballSpeedX;
      sound.playPaddleHit();
    } else if (this.ballX + this.ballRadius >= w) {
      this.ballX = w - this.ballRadius;
      this.ballSpeedX = -this.ballSpeedX;
      sound.playPaddleHit();
    }

    if (this.ballY - this.ballRadius <= 0) {
      this.ballY = this.ballRadius;
      this.ballSpeedY = -this.ballSpeedY;
      sound.playPaddleHit();
    }

    // Paddle collision
    const paddleY = h - 45;
    if (
      this.ballY + this.ballRadius >= paddleY &&
      this.ballY - this.ballRadius <= paddleY + this.paddleHeight &&
      this.ballX >= this.paddleX &&
      this.ballX <= this.paddleX + this.paddleWidth &&
      this.ballSpeedY > 0
    ) {
      // Calculate hit point on paddle (-1 left edge to +1 right edge)
      const hitPoint = (this.ballX - (this.paddleX + this.paddleWidth / 2)) / (this.paddleWidth / 2);
      const maxBounceAngle = Math.PI * 0.38; // 68 degrees
      const bounceAngle = hitPoint * maxBounceAngle;
      const speed = Math.hypot(this.ballSpeedX, this.ballSpeedY);

      this.ballSpeedX = Math.sin(bounceAngle) * speed;
      this.ballSpeedY = -Math.cos(bounceAngle) * speed;
      this.ballY = paddleY - this.ballRadius;

      sound.playPaddleHit();
      this.spawnSparks(this.ballX, paddleY, '#ffffff');
    }

    // Bottom loss
    if (this.ballY - this.ballRadius > h) {
      this.lives--;
      this.updateUI();
      sound.playExplode();

      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.resetBall();
      }
      return;
    }

    // Brick collisions
    let remainingBricks = 0;
    for (let brick of this.bricks) {
      if (!brick.alive) continue;
      remainingBricks++;

      if (
        this.ballX + this.ballRadius >= brick.x &&
        this.ballX - this.ballRadius <= brick.x + brick.w &&
        this.ballY + this.ballRadius >= brick.y &&
        this.ballY - this.ballRadius <= brick.y + brick.h
      ) {
        brick.alive = false;
        this.score += brick.points;
        this.updateUI();
        sound.playBrickHit();
        this.spawnSparks(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);

        // Simple axis reflection
        const prevBallX = this.ballX - this.ballSpeedX;
        if (prevBallX < brick.x || prevBallX > brick.x + brick.w) {
          this.ballSpeedX = -this.ballSpeedX;
        } else {
          this.ballSpeedY = -this.ballSpeedY;
        }
        break;
      }
    }

    // Next Level Clear
    if (remainingBricks === 0) {
      this.level++;
      this.score += 500;
      sound.playLineClear();
      this.initBricks();
      this.resetBall();
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  spawnSparks(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.0,
        size: Math.random() * 3 + 2
      });
    }
  }

  updateUI() {
    const scoreEl = document.getElementById('breakout-score');
    const livesEl = document.getElementById('breakout-lives');
    if (scoreEl) scoreEl.textContent = this.score;
    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
  }

  gameOver() {
    this.stop();
    const isNewHigh = saveHighScore('breakout', this.score);
    this.highScore = getHighScore('breakout');

    modal.show({
      gameTitle: gameTitles.breakout,
      score: this.score,
      highScore: this.highScore,
      isNewHigh,
      onRestart: () => this.start(),
      onHome: () => this.onReturnHome()
    });
  }

  render() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    // 1. Cosmic Space Background
    this.ctx.fillStyle = '#0a101f';
    this.ctx.fillRect(0, 0, w, h);

    // Stars
    this.stars.forEach(star => {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      this.ctx.fillRect(star.x * w, star.y * h, star.size, star.size);
    });

    // 2. Bricks
    this.bricks.forEach(b => {
      if (!b.alive) return;
      this.ctx.fillStyle = b.color;
      this.ctx.fillRect(b.x, b.y, b.w, b.h);

      // Bevel
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fillRect(b.x, b.y, b.w, 2);
      this.ctx.fillRect(b.x, b.y, 2, b.h);

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(b.x, b.y + b.h - 2, b.w, 2);
      this.ctx.fillRect(b.x + b.w - 2, b.y, 2, b.h);
    });

    // 3. Paddle (Metallic bevel pill)
    const paddleY = h - 45;
    this.ctx.fillStyle = '#bdc3c7';
    this.ctx.beginPath();
    this.ctx.roundRect ? this.ctx.roundRect(this.paddleX, paddleY, this.paddleWidth, this.paddleHeight, 6) : this.ctx.fillRect(this.paddleX, paddleY, this.paddleWidth, this.paddleHeight);
    this.ctx.fill();

    this.ctx.fillStyle = '#3498db';
    this.ctx.fillRect(this.paddleX + 10, paddleY + 3, this.paddleWidth - 20, this.paddleHeight - 6);

    // 4. Ball (Glowing colorful sphere)
    this.ctx.save();
    this.ctx.shadowColor = '#00d2d3';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = '#00d2d3';
    this.ctx.beginPath();
    this.ctx.arc(this.ballX, this.ballY, this.ballRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // 5. Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      this.ctx.globalAlpha = 1.0;
    });

    // Launch hint if attached
    if (this.ballAttached) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('화면을 터치하거나 버튼을 눌러 발사', w / 2, h - 80);
      this.ctx.textAlign = 'left';
    }
  }
}
