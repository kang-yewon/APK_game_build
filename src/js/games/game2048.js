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
    // Always initialize grid immediately in constructor
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.score = 0;
    this.highScore = getHighScore('game2048');
    this.won = false;
    this.over = false;

    // Layout
    this.boardSize = 0;
    this.cellSize = 0;
    this.cellPadding = 0;

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
      const moved = this.move(dir);
      if (moved) {
        sound.playMove();
        this.addRandomTile();
        this.updateUI();
        this.checkGameState();
        this.render();
      }
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

    // Clear 4x4 Grid and add 2 starting tiles
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.addRandomTile();
    this.addRandomTile();

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

  addRandomTile() {
    if (!this.grid || this.grid.length < this.size) return;
    const emptyCells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length > 0) {
      const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  move(direction) {
    if (!this.grid || this.grid.length < this.size) return false;
    let rotatedGrid = this.copyGrid(this.grid);

    // Rotate to normalize as sliding LEFT
    if (direction === 'up') rotatedGrid = this.rotateLeft(rotatedGrid);
    else if (direction === 'right') rotatedGrid = this.rotateLeft(this.rotateLeft(rotatedGrid));
    else if (direction === 'down') rotatedGrid = this.rotateRight(rotatedGrid);

    let moved = false;
    let gainedScore = 0;

    for (let r = 0; r < this.size; r++) {
      const row = rotatedGrid[r].filter(val => val !== 0);
      const newRow = [];

      for (let i = 0; i < row.length; i++) {
        if (i < row.length - 1 && row[i] === row[i + 1]) {
          const mergedVal = row[i] * 2;
          newRow.push(mergedVal);
          gainedScore += mergedVal;
          i++; // Skip next because it was merged
        } else {
          newRow.push(row[i]);
        }
      }

      while (newRow.length < this.size) {
        newRow.push(0);
      }

      if (newRow.some((val, idx) => val !== rotatedGrid[r][idx])) {
        moved = true;
      }
      rotatedGrid[r] = newRow;
    }

    // Rotate back to original orientation
    if (direction === 'up') rotatedGrid = this.rotateRight(rotatedGrid);
    else if (direction === 'right') rotatedGrid = this.rotateLeft(this.rotateLeft(rotatedGrid));
    else if (direction === 'down') rotatedGrid = this.rotateLeft(rotatedGrid);

    if (moved) {
      this.grid = rotatedGrid;
      this.score += gainedScore;
      if (gainedScore > 0) {
        sound.playBrickHit();
      }
    }

    return moved;
  }

  rotateLeft(matrix) {
    const res = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        res[this.size - 1 - c][r] = matrix[r][c];
      }
    }
    return res;
  }

  rotateRight(matrix) {
    const res = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        res[c][this.size - 1 - r] = matrix[r][c];
      }
    }
    return res;
  }

  copyGrid(matrix) {
    return matrix.map(row => [...row]);
  }

  checkGameState() {
    if (!this.grid || this.grid.length < this.size) return;

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

    // Clear and background
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#bbada0';
    this.drawRoundedRect(0, 0, w, h, 10);

    if (!this.grid || this.grid.length < this.size) return;

    // Draw Grid & Tiles
    for (let r = 0; r < this.size; r++) {
      if (!this.grid[r]) continue;
      for (let c = 0; c < this.size; c++) {
        const val = this.grid[r][c] || 0;
        const x = this.cellPadding + c * (this.cellSize + this.cellPadding);
        const y = this.cellPadding + r * (this.cellSize + this.cellPadding);
        const s = this.cellSize;

        // Empty tile placeholder
        this.ctx.fillStyle = 'rgba(238, 228, 218, 0.35)';
        this.drawRoundedRect(x, y, s, s, 6);

        // Render Active Tile
        if (val > 0) {
          const style = TILE_COLORS[val] || { bg: '#3c3a32', text: '#f9f6f2' };

          this.ctx.fillStyle = style.bg;
          this.drawRoundedRect(x, y, s, s, 6);

          // Value Text
          this.ctx.fillStyle = style.text;
          let fontSize = Math.floor(s * 0.44);
          if (val >= 100 && val < 1000) fontSize = Math.floor(s * 0.38);
          else if (val >= 1000 && val < 10000) fontSize = Math.floor(s * 0.3);
          else if (val >= 10000) fontSize = Math.floor(s * 0.24);

          this.ctx.font = `bold ${fontSize}px sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(val.toString(), x + s / 2, y + s / 2 + 1);
        }
      }
    }
  }
}
