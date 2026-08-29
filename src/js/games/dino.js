import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

export class DinoGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.score = 0;
    this.highScore = getHighScore('dino');
    this.speed = 5.0; // Starts easier
    this.distance = 0;
    this.gameStartTime = 0;
    this.obstacleDelayMs = 4000; // 4 seconds delay before any obstacle spawns

    // Dino Physics & State
    this.dino = {
      x: 40,
      y: 0,
      w: 36,
      h: 40,
      vy: 0,
      gravity: 0.75,
      jumpForce: -13.5,
      isGrounded: true,
      isDucking: false,
      legFrame: 0,
      animTimer: 0
    };

    this.groundY = 170;
    this.obstacles = [];
    this.clouds = [];
    this.nextObstacleDistance = 80;

    this.isNightMode = false;
    this.isRunning = false;
    this.animationFrameId = null;

    this.initControls();
  }

  initControls() {
    const btnJump = document.getElementById('dino-btn-jump');
    const btnDuck = document.getElementById('dino-btn-duck');

    const handleJump = () => {
      if (!this.isRunning) return;
      if (this.dino.isGrounded) {
        this.dino.vy = this.dino.jumpForce;
        this.dino.isGrounded = false;
        sound.playJump();
      }
    };

    const handleDuck = (val) => {
      this.dino.isDucking = val;
    };

    btnJump?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleJump(); });
    btnDuck?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleDuck(true); });
    btnDuck?.addEventListener('pointerup', (e) => { e.preventDefault(); handleDuck(false); });
    btnDuck?.addEventListener('pointercancel', () => handleDuck(false));

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { handleJump(); e.preventDefault(); }
      else if (['ArrowDown', 'KeyS'].includes(e.code)) { handleDuck(true); e.preventDefault(); }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowDown', 'KeyS'].includes(e.code)) handleDuck(false);
    });

    // Touch on canvas
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleJump();
    }, { passive: false });

    this.canvas.addEventListener('mousedown', () => {
      handleJump();
    });
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    // Landscape wide canvas
    const width = Math.min(parent.clientWidth - 16, 680);
    const height = Math.min(Math.floor(width * 0.45), 260);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.groundY = height - 40;
    this.dino.y = this.groundY - this.dino.h;

    this.render();
  }

  start() {
    this.highScore = getHighScore('dino');
    this.score = 0;
    this.distance = 0;
    this.speed = 5.0; // Easier initial speed
    this.isNightMode = false;
    this.gameStartTime = performance.now();
    this.updateUI();

    this.dino.vy = 0;
    this.dino.isGrounded = true;
    this.dino.isDucking = false;
    this.dino.y = this.groundY - this.dino.h;

    this.obstacles = [];
    this.clouds = [
      { x: 100, y: 30, speed: 0.8 },
      { x: 320, y: 55, speed: 0.6 },
      { x: 520, y: 25, speed: 0.9 }
    ];
    this.nextObstacleDistance = 140;

    this.isRunning = true;
    this.resize();

    cancelAnimationFrame(this.animationFrameId);
    this.loop();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  updateUI() {
    const scoreEl = document.getElementById('dino-score');
    const hiEl = document.getElementById('dino-highscore');
    if (scoreEl) scoreEl.textContent = `${Math.floor(this.score).toString().padStart(5, '0')}`;
    if (hiEl) hiEl.textContent = `HI ${Math.floor(this.highScore).toString().padStart(5, '0')}`;
  }

  loop() {
    if (!this.isRunning) return;
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  update() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const timeSinceStart = performance.now() - this.gameStartTime;

    // Score & Speed
    this.distance += this.speed;
    const prevScore = Math.floor(this.score);
    this.score += 0.15;
    const curScore = Math.floor(this.score);

    // Milestone sound every 100 points
    if (curScore > 0 && curScore % 100 === 0 && curScore !== prevScore) {
      sound.playClick();
    }

    // Day/Night switch every 500 points
    this.isNightMode = Math.floor(curScore / 500) % 2 === 1;

    // Gradual speed scaling starting from 5.0 up to 13.0
    this.speed = Math.min(13.0, 5.0 + Math.floor(curScore / 80) * 0.35);
    this.updateUI();

    // Dino Physics
    if (!this.dino.isGrounded) {
      this.dino.vy += this.dino.gravity;
      this.dino.y += this.dino.vy;

      if (this.dino.y >= this.groundY - this.dino.h) {
        this.dino.y = this.groundY - this.dino.h;
        this.dino.vy = 0;
        this.dino.isGrounded = true;
      }
    }

    // Dino animation
    this.dino.animTimer++;
    if (this.dino.animTimer % 6 === 0) {
      this.dino.legFrame = (this.dino.legFrame + 1) % 2;
    }

    // Update Clouds
    this.clouds.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x < -60) {
        cloud.x = w + Math.random() * 80;
        cloud.y = Math.random() * 60 + 20;
      }
    });

    // Spawn Obstacles ONLY AFTER 4 seconds delay
    if (timeSinceStart >= this.obstacleDelayMs) {
      this.nextObstacleDistance -= this.speed;
      if (this.nextObstacleDistance <= 0) {
        this.spawnObstacle(w);
        this.nextObstacleDistance = Math.random() * 220 + 170 + (12 - this.speed) * 12;
      }
    }

    // Move Obstacles & Collision Check
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed;

      // Pterodactyl wing flap
      if (obs.type === 'bird') {
        obs.frameTimer = (obs.frameTimer || 0) + 1;
        if (obs.frameTimer % 8 === 0) {
          obs.frame = (obs.frame || 0) === 0 ? 1 : 0;
        }
      }

      // Check Collision
      if (this.checkCollision(this.dino, obs)) {
        this.gameOver();
        return;
      }

      // Remove off-screen
      if (obs.x + obs.w < -20) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  spawnObstacle(canvasWidth) {
    const isBird = this.score > 350 && Math.random() < 0.3;

    if (isBird) {
      const birdYVariants = [this.groundY - 30, this.groundY - 55, this.groundY - 75];
      const by = birdYVariants[Math.floor(Math.random() * birdYVariants.length)];
      this.obstacles.push({
        type: 'bird',
        x: canvasWidth + 20,
        y: by,
        w: 38,
        h: 24,
        frame: 0
      });
    } else {
      const cactusType = Math.floor(Math.random() * 3); // small single, small double, large
      let w = 18, h = 34;
      if (cactusType === 1) { w = 34; h = 34; }
      else if (cactusType === 2) { w = 24; h = 46; }

      this.obstacles.push({
        type: 'cactus',
        x: canvasWidth + 20,
        y: this.groundY - h,
        w,
        h,
        variant: cactusType
      });
    }
  }

  checkCollision(dino, obs) {
    const pad = 6; // Hitbox forgiveness
    const dinoW = dino.isDucking ? dino.w + 10 : dino.w;
    const dinoH = dino.isDucking ? dino.h * 0.6 : dino.h;
    const dinoY = dino.isDucking ? this.groundY - dinoH : dino.y;

    return (
      dino.x + pad < obs.x + obs.w - pad &&
      dino.x + dinoW - pad > obs.x + pad &&
      dinoY + pad < obs.y + obs.h - pad &&
      dinoY + dinoH - pad > obs.y + pad
    );
  }

  gameOver() {
    this.stop();
    sound.playExplode();
    const finalScore = Math.floor(this.score);
    const isNewHigh = saveHighScore('dino', finalScore);
    this.highScore = getHighScore('dino');

    modal.show({
      gameTitle: gameTitles.dino,
      score: finalScore,
      highScore: this.highScore,
      isNewHigh,
      onRestart: () => this.start(),
      onHome: () => this.onReturnHome()
    });
  }

  render() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    const bgColor = this.isNightMode ? '#1e293b' : '#f8fafc';
    const fgColor = this.isNightMode ? '#e2e8f0' : '#475569';
    const accentColor = this.isNightMode ? '#38bdf8' : '#334155';

    // Background
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, w, h);

    // 1. Draw Clouds
    this.clouds.forEach(cloud => {
      this.ctx.fillStyle = this.isNightMode ? '#334155' : '#cbd5e1';
      this.ctx.fillRect(cloud.x, cloud.y, 40, 10);
      this.ctx.fillRect(cloud.x + 10, cloud.y - 6, 20, 6);
    });

    // 2. Draw Ground Line & Terrain bumps
    this.ctx.fillStyle = fgColor;
    this.ctx.fillRect(0, this.groundY, w, 2);

    // Moving terrain dots
    const offset = Math.floor(this.distance) % 20;
    for (let x = -offset; x < w; x += 20) {
      if ((x + 5) % 40 === 0) {
        this.ctx.fillRect(x, this.groundY + 6, 6, 2);
      } else if (x % 30 === 0) {
        this.ctx.fillRect(x, this.groundY + 12, 10, 2);
      }
    }

    // 3. Draw Dino (Pixel T-Rex)
    this.drawDino(fgColor);

    // 4. Draw Obstacles
    this.obstacles.forEach(obs => {
      if (obs.type === 'cactus') {
        this.drawCactus(obs, accentColor);
      } else if (obs.type === 'bird') {
        this.drawBird(obs, accentColor);
      }
    });
  }

  drawDino(color) {
    const d = this.dino;
    const dy = d.isDucking ? this.groundY - d.h * 0.6 : d.y;
    this.ctx.fillStyle = color;

    if (!d.isDucking) {
      // Body & Head
      this.ctx.fillRect(d.x + 16, dy, 18, 16); // Head
      this.ctx.fillRect(d.x + 12, dy + 16, 16, 14); // Torso
      this.ctx.fillRect(d.x, dy + 18, 12, 8); // Tail
      this.ctx.fillRect(d.x + 28, dy + 16, 4, 3); // Arm

      // Eye (cutout)
      this.ctx.fillStyle = this.isNightMode ? '#1e293b' : '#f8fafc';
      this.ctx.fillRect(d.x + 20, dy + 3, 3, 3);
      this.ctx.fillStyle = color;

      // Legs
      if (d.isGrounded) {
        if (d.legFrame === 0) {
          this.ctx.fillRect(d.x + 14, dy + 30, 4, 10);
          this.ctx.fillRect(d.x + 22, dy + 30, 4, 6);
        } else {
          this.ctx.fillRect(d.x + 14, dy + 30, 4, 6);
          this.ctx.fillRect(d.x + 22, dy + 30, 4, 10);
        }
      } else {
        // Jumping legs tucked
        this.ctx.fillRect(d.x + 14, dy + 30, 4, 6);
        this.ctx.fillRect(d.x + 22, dy + 30, 4, 6);
      }
    } else {
      // Ducking Dino
      this.ctx.fillRect(d.x + 10, dy + 4, 30, 12); // Long body
      this.ctx.fillRect(d.x + 36, dy, 8, 8); // Low head
      this.ctx.fillRect(d.x, dy + 6, 10, 8); // Tail
      this.ctx.fillRect(d.x + 16, dy + 16, 4, 8);
      this.ctx.fillRect(d.x + 26, dy + 16, 4, 8);
    }
  }

  drawCactus(obs, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(obs.x + obs.w * 0.35, obs.y, obs.w * 0.3, obs.h);
    this.ctx.fillRect(obs.x, obs.y + obs.h * 0.3, obs.w * 0.35, 6);
    this.ctx.fillRect(obs.x, obs.y + obs.h * 0.15, 6, obs.h * 0.2);
    this.ctx.fillRect(obs.x + obs.w * 0.65, obs.y + obs.h * 0.45, obs.w * 0.35, 6);
    this.ctx.fillRect(obs.x + obs.w - 6, obs.y + obs.h * 0.3, 6, obs.h * 0.2);
  }

  drawBird(obs, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(obs.x + 10, obs.y + 8, 20, 8);
    this.ctx.fillRect(obs.x, obs.y + 10, 10, 4);
    if (obs.frame === 0) {
      this.ctx.fillRect(obs.x + 14, obs.y, 8, 8);
    } else {
      this.ctx.fillRect(obs.x + 14, obs.y + 16, 8, 8);
    }
  }
}
