import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

const TILE_COLORS = {
  2: { bg: '#eee4da', text: '#776e65' },
  4: { bg: '#ede0c8', text: '#776e65' },
  8: { bg: '#f2b179', text: '#f9f6f2' },
  16: { bg: '#f59563', text: '#f9f6f2' },
  32: { bg: '#f67c5f', text: '#f9f6f2' },
  64: { bg: '#f65e3b', text: '#f9f6f2' },
  128: { bg: '#edcf72', text: '#f9f6f2' },
  256: { bg: '#edcc61', text: '#f9f6f2' },
  512: { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
  4096: { bg: '#3c3a32', text: '#f9f6f2' },
  8192: { bg: '#1c1c1b', text: '#f9f6f2' }
};

export class Game2048 {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.size = 4; // 4x4 Grid
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.tiles = [];
    this.nextTileId = 1;

    this.score = 0;
    this.highScore = getHighScore('game2048');
    this.won = false;
    this.over = false;

    // Layout metrics
    this.boardSize = 0;
    this.cellSize = 0;
    this.cellPadding = 0;

    // Animation state
    this.isAnimating = false;
    this.animStartTime = 0;
    this.animDuration = 110; // ms for snappy slide

    this.isRunning = false;
    this.animationFrameId = null;

    this.initControls();
  }

  initControls() {
    const btnUp = document.getElementById('g2048-btn-up');
    const btnDown = document.getElementById('g2048-btn-down');
    const btnLeft = document.getElementById('g2048-btn-left');
    const btnRight = document.getElementById('g2048-btn-right');

    const handleMove = (dir) => {
      if (!this.isRunning || this.over) return;
      this.triggerMove(dir);
    };

    const attachButtonEvent = (el, dir) => {
      if (!el) return;
      let lastHandled = 0;
      const trigger = (e) => {
        if (e && e.cancelable) e.preventDefault();
        const now = Date.now();
        if (now - lastHandled > 60) {
          lastHandled = now;
          handleMove(dir);
        }
      };
      el.addEventListener('pointerdown', trigger);
      el.addEventListener('touchstart', trigger, { passive: false });
      el.addEventListener('click', trigger);
    };

    attachButtonEvent(btnUp, 'up');
    attachButtonEvent(btnDown, 'down');
    attachButtonEvent(btnLeft, 'left');
    attachButtonEvent(btnRight, 'right');

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) { handleMove('up'); e.preventDefault(); }
      else if (['ArrowDown', 'KeyS'].includes(e.code)) { handleMove('down'); e.preventDefault(); }
      else if (['ArrowLeft', 'KeyA'].includes(e.code)) { handleMove('left'); e.preventDefault(); }
      else if (['ArrowRight', 'KeyD'].includes(e.code)) { handleMove('right'); e.preventDefault(); }
    });

    // Touch Swipe on Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (!isSwiping || !this.isRunning || this.over) return;
      isSwiping = false;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > 20) {
        if (absX > absY) {
          handleMove(dx > 0 ? 'right' : 'left');
        } else {
          handleMove(dy > 0 ? 'down' : 'up');
        }
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const availW = rect.width > 50 ? rect.width : (window.innerWidth || 360);
    const availH = rect.height > 50 ? rect.height : (window.innerHeight - 170);

    const size = Math.max(260, Math.min(availW - 12, availH - 12, 420));
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(size * dpr);
    this.canvas.height = Math.floor(size * dpr);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.boardSize = size;
    this.cellPadding = Math.max(6, Math.floor(size * 0.035));
    this.cellSize = (this.boardSize - this.cellPadding * (this.size + 1)) / this.size;

    this.render();
  }

  start() {
    this.highScore = getHighScore('game2048');
    this.score = 0;
    this.won = false;
    this.over = false;
    this.tiles = [];
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));

    // Spawn 2 initial tiles
    this.spawnTile();
    this.spawnTile();

    this.updateUI();
    this.isRunning = true;
    this.resize();

    cancelAnimationFrame(this.animationFrameId);
    this.loop();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  spawnTile() {
    const emptyCells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (!this.tiles.some(t => t.r === r && t.c === c && !t.isTrash)) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length > 0) {
      const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const val = Math.random() < 0.9 ? 2 : 4;
      const tile = {
        id: this.nextTileId++,
        val,
        r: cell.r,
        c: cell.c,
        fromR: cell.r,
        fromC: cell.c,
        isNew: true,
        spawnTime: performance.now()
      };
      this.tiles.push(tile);
      this.syncGrid();
    }
  }

  syncGrid() {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.tiles.forEach(t => {
      if (!t.isTrash) {
        this.grid[t.r][t.c] = t.val;
      }
    });
  }

  triggerMove(direction) {
    if (this.isAnimating) {
      // Finish previous animation immediately
      this.finishMoveAnimation();
    }

    // Vectors
    const vectors = {
      up: { r: -1, c: 0 },
      down: { r: 1, c: 0 },
      left: { r: 0, c: -1 },
      right: { r: 0, c: 1 }
    };
    const vector = vectors[direction];
    if (!vector) return;

    // Traversal order
    const rOrder = direction === 'down' ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const cOrder = direction === 'right' ? [3, 2, 1, 0] : [0, 1, 2, 3];

    let moved = false;
    let gainedScore = 0;

    // Clean any trash
    this.tiles = this.tiles.filter(t => !t.isTrash);

    // Track merged targets this turn
    const mergedGrid = Array.from({ length: this.size }, () => Array(this.size).fill(false));

    // Reset from coordinates
    this.tiles.forEach(t => {
      t.fromR = t.r;
      t.fromC = t.c;
      t.isNew = false;
      t.merged = false;
    });

    rOrder.forEach(r => {
      cOrder.forEach(c => {
        const tile = this.tiles.find(t => t.r === r && t.c === c && !t.isTrash);
        if (!tile) return;

        let nextR = r;
        let nextC = c;

        // Slide as far as possible
        while (true) {
          const testR = nextR + vector.r;
          const testC = nextC + vector.c;
          if (testR < 0 || testR >= this.size || testC < 0 || testC >= this.size) break;

          const blocker = this.tiles.find(t => t.r === testR && t.c === testC && !t.isTrash);
          if (!blocker) {
            nextR = testR;
            nextC = testC;
          } else if (blocker.val === tile.val && !mergedGrid[testR][testC] && !blocker.isTrash) {
            // Merge possible!
            nextR = testR;
            nextC = testC;
            break;
          } else {
            break;
          }
        }

        if (nextR !== r || nextC !== c) {
          const targetTile = this.tiles.find(t => t.r === nextR && t.c === nextC && !t.isTrash && t !== tile);

          if (targetTile && targetTile.val === tile.val && !mergedGrid[nextR][nextC]) {
            // Merge!
            moved = true;
            mergedGrid[nextR][nextC] = true;
            const newVal = tile.val * 2;
            gainedScore += newVal;

            tile.fromR = r;
            tile.fromC = c;
            tile.r = nextR;
            tile.c = nextC;
            tile.isTrash = true;

            targetTile.isTrash = true;

            const mergedTile = {
              id: this.nextTileId++,
              val: newVal,
              r: nextR,
              c: nextC,
              fromR: nextR,
              fromC: nextC,
              merged: true,
              spawnTime: performance.now()
            };
            this.tiles.push(mergedTile);

          } else {
            // Simple slide
            moved = true;
            tile.fromR = r;
            tile.fromC = c;
            tile.r = nextR;
            tile.c = nextC;
          }
        }
      });
    });

    if (moved) {
      sound.playMove();
      if (gainedScore > 0) {
        sound.playBrickHit();
        this.score += gainedScore;
      }
      this.syncGrid();
      this.updateUI();

      this.isAnimating = true;
      this.animStartTime = performance.now();
    }
  }

  finishMoveAnimation() {
    this.isAnimating = false;
    this.tiles = this.tiles.filter(t => !t.isTrash);
    this.tiles.forEach(t => {
      t.fromR = t.r;
      t.fromC = t.c;
      t.merged = false;
      t.isNew = false;
    });

    this.spawnTile();
    this.checkGameState();
  }

  checkGameState() {
    this.syncGrid();

    // Check 2048 victory once
    if (!this.won) {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c] === 2048) {
            this.won = true;
            sound.playVictory();
          }
        }
      }
    }

    // Check game over
    let canMove = false;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) {
          canMove = true;
          break;
        }
        if (r < this.size - 1 && this.grid[r][c] === this.grid[r + 1][c]) {
          canMove = true;
          break;
        }
        if (c < this.size - 1 && this.grid[r][c] === this.grid[r][c + 1]) {
          canMove = true;
          break;
        }
      }
      if (canMove) break;
    }

    if (!canMove) {
      this.gameOver();
    }
  }

  updateUI() {
    const scoreEl = document.getElementById('g2048-score');
    const hiEl = document.getElementById('g2048-highscore');
    if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
    if (hiEl) hiEl.textContent = Math.max(this.score, this.highScore).toLocaleString();
  }

  gameOver() {
    this.over = true;
    this.stop();
    sound.playExplode();

    const isNewHigh = saveHighScore('game2048', this.score);
    this.highScore = getHighScore('game2048');

    modal.show({
      gameTitle: gameTitles.game2048,
      score: this.score,
      highScore: this.highScore,
      isNewHigh,
      onRestart: () => this.start(),
      onHome: () => this.onReturnHome()
    });
  }

  loop() {
    if (!this.isRunning) return;

    if (this.isAnimating) {
      const elapsed = performance.now() - this.animStartTime;
      if (elapsed >= this.animDuration) {
        this.finishMoveAnimation();
      }
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  drawRoundedRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  render() {
    const w = this.boardSize;
    const h = this.boardSize;
    if (w <= 0 || h <= 0) return;

    // Clear and background frame
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#bbada0';
    this.drawRoundedRect(0, 0, w, h, 10);

    // 1. Draw 4x4 Empty Grid Cell Placeholders
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const x = this.cellPadding + c * (this.cellSize + this.cellPadding);
        const y = this.cellPadding + r * (this.cellSize + this.cellPadding);
        const s = this.cellSize;

        this.ctx.fillStyle = 'rgba(238, 228, 218, 0.35)';
        this.drawRoundedRect(x, y, s, s, 6);
      }
    }

    // 2. Draw Active Sliding / Popping Tiles
    const now = performance.now();
    let animProgress = 1;
    if (this.isAnimating) {
      animProgress = Math.min(1, (now - this.animStartTime) / this.animDuration);
    }
    // Cubic ease-out
    const ease = 1 - Math.pow(1 - animProgress, 3);

    // Sort tiles so sliding tiles render under merging pop tiles
    const renderList = [...this.tiles].sort((a, b) => (a.merged ? 1 : 0) - (b.merged ? 1 : 0));

    renderList.forEach(tile => {
      const startX = this.cellPadding + tile.fromC * (this.cellSize + this.cellPadding);
      const startY = this.cellPadding + tile.fromR * (this.cellSize + this.cellPadding);
      const endX = this.cellPadding + tile.c * (this.cellSize + this.cellPadding);
      const endY = this.cellPadding + tile.r * (this.cellSize + this.cellPadding);

      let currentX = startX + (endX - startX) * ease;
      let currentY = startY + (endY - startY) * ease;
      let s = this.cellSize;

      // Scale effects for new tiles or merged tiles
      let scale = 1;
      if (tile.isNew) {
        const spawnElapsed = now - tile.spawnTime;
        if (spawnElapsed < 140) {
          scale = 0.2 + 0.8 * (spawnElapsed / 140);
        }
      } else if (tile.merged) {
        if (this.isAnimating) {
          // Hidden while precursor tiles slide into position
          return;
        }
        const popElapsed = now - tile.spawnTime;
        if (popElapsed < 120) {
          const t = popElapsed / 120;
          scale = 1 + 0.2 * Math.sin(t * Math.PI);
        }
      }

      const style = TILE_COLORS[tile.val] || { bg: '#3c3a32', text: '#f9f6f2' };

      this.ctx.save();
      if (scale !== 1) {
        const cx = currentX + s / 2;
        const cy = currentY + s / 2;
        this.ctx.translate(cx, cy);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-cx, -cy);
      }

      this.ctx.fillStyle = style.bg;
      this.drawRoundedRect(currentX, currentY, s, s, 6);

      // Text Value
      this.ctx.fillStyle = style.text;
      let fontSize = Math.floor(s * 0.44);
      if (tile.val >= 100 && tile.val < 1000) fontSize = Math.floor(s * 0.38);
      else if (tile.val >= 1000 && tile.val < 10000) fontSize = Math.floor(s * 0.3);
      else if (tile.val >= 10000) fontSize = Math.floor(s * 0.24);

      this.ctx.font = `bold ${fontSize}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(tile.val.toString(), currentX + s / 2, currentY + s / 2 + 1);

      this.ctx.restore();
    });
  }
}
