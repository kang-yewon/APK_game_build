import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

export class SnakeGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.gridSize = 13; // 13x13 grid matching the retro screenshot proportions
    this.tileSize = 0;

    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.food = { x: 0, y: 0 };
    this.score = 0;
    this.highScore = getHighScore('snake');
    this.speed = 140; // ms per step
    this.lastTime = 0;
    this.accumulatedTime = 0;

    this.isRunning = false;
    this.animationFrameId = null;

    this.initControls();
  }

  initControls() {
    // Touch buttons
    const btnUp = document.getElementById('snake-btn-up');
    const btnDown = document.getElementById('snake-btn-down');
    const btnLeft = document.getElementById('snake-btn-left');
    const btnRight = document.getElementById('snake-btn-right');

    const handleInput = (newDir) => {
      // Prevent 180 degree instant reversal
      if (newDir.x !== -this.direction.x && newDir.y !== -this.direction.y) {
        this.nextDirection = newDir;
        sound.playClick();
      }
    };

    btnUp?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleInput({ x: 0, y: -1 }); });
    btnDown?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleInput({ x: 0, y: 1 }); });
    btnLeft?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleInput({ x: -1, y: 0 }); });
    btnRight?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleInput({ x: 1, y: 0 }); });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) { handleInput({ x: 0, y: -1 }); e.preventDefault(); }
      else if (['ArrowDown', 'KeyS'].includes(e.code)) { handleInput({ x: 0, y: 1 }); e.preventDefault(); }
      else if (['ArrowLeft', 'KeyA'].includes(e.code)) { handleInput({ x: -1, y: 0 }); e.preventDefault(); }
      else if (['ArrowRight', 'KeyD'].includes(e.code)) { handleInput({ x: 1, y: 0 }); e.preventDefault(); }
    });

    // Swipe controls on canvas
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (!this.isRunning) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > 20) {
        if (absX > absY) {
          handleInput({ x: dx > 0 ? 1 : -1, y: 0 });
        } else {
          handleInput({ x: 0, y: dy > 0 ? 1 : -1 });
        }
      }
    }, { passive: true });
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const size = Math.min(parent.clientWidth - 16, parent.clientHeight - 16, 420);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.tileSize = size / this.gridSize;
    this.render();
  }

  start() {
    this.highScore = getHighScore('snake');
    this.score = 0;
    this.updateScoreUI();
    this.speed = 135;

    const mid = Math.floor(this.gridSize / 2);
    this.snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };

    this.spawnFood();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulatedTime = 0;

    this.resize();
    cancelAnimationFrame(this.animationFrameId);
    this.loop(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  spawnFood() {
    const emptyTiles = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (!this.snake.some(seg => seg.x === x && seg.y === y)) {
          emptyTiles.push({ x, y });
        }
      }
    }
    if (emptyTiles.length > 0) {
      this.food = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    }
  }

  updateScoreUI() {
    const scoreEl = document.getElementById('snake-score');
    if (scoreEl) scoreEl.textContent = this.score;
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulatedTime += delta;

    while (this.accumulatedTime >= this.speed) {
      this.step();
      this.accumulatedTime -= this.speed;
      if (!this.isRunning) return;
    }

    this.render();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  step() {
    this.direction = this.nextDirection;
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    // Wall collision
    if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
      this.gameOver();
      return;
    }

    // Self collision
    if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      this.gameOver();
      return;
    }

    this.snake.unshift(head);

    // Food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.updateScoreUI();
      sound.playEat();
      // Increase speed slightly
      if (this.speed > 70) this.speed -= 2;
      this.spawnFood();
    } else {
      this.snake.pop();
    }
  }

  gameOver() {
    this.stop();
    sound.playExplode();
    const isNewHigh = saveHighScore('snake', this.score);
    this.highScore = getHighScore('snake');

    modal.show({
      gameTitle: gameTitles.snake,
      score: this.score,
      highScore: this.highScore,
      isNewHigh,
      onRestart: () => this.start(),
      onHome: () => this.onReturnHome()
    });
  }

  render() {
    const size = this.canvas.width / (window.devicePixelRatio || 1);
    const ts = this.tileSize;

    // Clear background
    this.ctx.fillStyle = '#162235';
    this.ctx.fillRect(0, 0, size, size);

    // 1. Draw Checkered Grid (Light Gray & Light Green)
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const isGreen = (x + y) % 2 === 0;
        this.ctx.fillStyle = isGreen ? '#7eb356' : '#b0b8bc';
        this.ctx.fillRect(x * ts, y * ts, ts, ts);
      }
    }

    // 2. Draw Apple
    const fx = this.food.x * ts + ts / 2;
    const fy = this.food.y * ts + ts / 2;
    const r = ts * 0.4;

    // Apple body
    this.ctx.fillStyle = '#e52521';
    this.ctx.beginPath();
    this.ctx.arc(fx, fy + 1, r, 0, Math.PI * 2);
    this.ctx.fill();

    // Apple highlight
    this.ctx.fillStyle = '#ff7b7b';
    this.ctx.beginPath();
    this.ctx.arc(fx - r * 0.3, fy - r * 0.3, r * 0.28, 0, Math.PI * 2);
    this.ctx.fill();

    // Apple stem & Leaf
    this.ctx.fillStyle = '#5c3317';
    this.ctx.fillRect(fx - 1, fy - r - 3, 2, 4);

    this.ctx.fillStyle = '#3eb549';
    this.ctx.beginPath();
    this.ctx.ellipse(fx + 3, fy - r - 2, 4, 2, Math.PI / 4, 0, Math.PI * 2);
    this.ctx.fill();

    // 3. Draw Snake
    this.snake.forEach((seg, i) => {
      const px = seg.x * ts;
      const py = seg.y * ts;
      const pad = 1.5;

      if (i === 0) {
        // Head
        this.ctx.fillStyle = '#226b2a';
        this.ctx.fillRect(px + pad, py + pad, ts - pad * 2, ts - pad * 2);

        // Head inner
        this.ctx.fillStyle = '#399342';
        this.ctx.fillRect(px + pad + 2, py + pad + 2, ts - pad * 2 - 4, ts - pad * 2 - 4);

        // Eyes
        const eyeOffset = ts * 0.25;
        const eyeSize = Math.max(3, ts * 0.16);

        let eyeX1 = px + eyeOffset;
        let eyeY1 = py + eyeOffset;
        let eyeX2 = px + ts - eyeOffset;
        let eyeY2 = py + eyeOffset;

        if (this.direction.x === 1) { // Right
          eyeX1 = px + ts - eyeOffset; eyeY1 = py + eyeOffset;
          eyeX2 = px + ts - eyeOffset; eyeY2 = py + ts - eyeOffset;
        } else if (this.direction.x === -1) { // Left
          eyeX1 = px + eyeOffset; eyeY1 = py + eyeOffset;
          eyeX2 = px + eyeOffset; eyeY2 = py + ts - eyeOffset;
        } else if (this.direction.y === 1) { // Down
          eyeX1 = px + eyeOffset; eyeY1 = py + ts - eyeOffset;
          eyeX2 = px + ts - eyeOffset; eyeY2 = py + ts - eyeOffset;
        }

        // White of eye
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
        this.ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupil
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(eyeX1, eyeY1, eyeSize * 0.5, 0, Math.PI * 2);
        this.ctx.arc(eyeX2, eyeY2, eyeSize * 0.5, 0, Math.PI * 2);
        this.ctx.fill();

      } else {
        // Body / Tail
        const isTail = i === this.snake.length - 1;
        this.ctx.fillStyle = '#26732f';
        this.ctx.fillRect(px + pad, py + pad, ts - pad * 2, ts - pad * 2);

        this.ctx.fillStyle = '#3ea048';
        this.ctx.fillRect(px + pad + 2, py + pad + 2, ts - pad * 2 - 4, ts - pad * 2 - 4);

        // Pattern on body
        if (i % 2 === 0 && !isTail) {
          this.ctx.fillStyle = '#5ac265';
          this.ctx.fillRect(px + ts * 0.35, py + ts * 0.35, ts * 0.3, ts * 0.3);
        }
      }
    });
  }
}
