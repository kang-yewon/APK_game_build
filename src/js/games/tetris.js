import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

const COLS = 10;
const ROWS = 20;

// Tetromino definitions
const TETROMINOES = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#00d2d3' },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#2e86de' },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#ff9f43' },
  O: { shape: [[1, 1], [1, 1]], color: '#feca57' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#1dd1a1' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#9b59b6' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#ff6b6b' }
};

const PIECE_KEYS = Object.keys(TETROMINOES);

export class TetrisGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.grid = [];
    this.currentPiece = null;
    this.nextPieces = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.highScore = getHighScore('tetris');

    this.dropInterval = 800; // ms
    this.lastDropTime = 0;
    this.isRunning = false;
    this.animationFrameId = null;

    // Layout
    this.boardWidth = 0;
    this.boardHeight = 0;
    this.boardX = 10;
    this.boardY = 10;
    this.cellSize = 0;
    this.sidebarX = 0;

    this.initControls();
  }

  initControls() {
    const btnLeft = document.getElementById('tetris-btn-left');
    const btnRotate = document.getElementById('tetris-btn-rotate');
    const btnRight = document.getElementById('tetris-btn-right');
    const btnDown = document.getElementById('tetris-btn-down');
    const btnDrop = document.getElementById('tetris-btn-drop');

    const handleLeft = () => { if (this.isRunning) { this.move(-1, 0); sound.playMove(); } };
    const handleRight = () => { if (this.isRunning) { this.move(1, 0); sound.playMove(); } };
    const handleRotate = () => { if (this.isRunning) { this.rotatePiece(); } };
    const handleDown = () => { if (this.isRunning) { this.move(0, 1); sound.playMove(); } };
    const handleHardDrop = () => { if (this.isRunning) { this.hardDrop(); } };

    btnLeft?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleLeft(); });
    btnRight?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleRight(); });
    btnRotate?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleRotate(); });
    btnDown?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleDown(); });
    btnDrop?.addEventListener('pointerdown', (e) => { e.preventDefault(); handleHardDrop(); });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) { handleLeft(); e.preventDefault(); }
      else if (['ArrowRight', 'KeyD'].includes(e.code)) { handleRight(); e.preventDefault(); }
      else if (['ArrowUp', 'KeyW'].includes(e.code)) { handleRotate(); e.preventDefault(); }
      else if (['ArrowDown', 'KeyS'].includes(e.code)) { handleDown(); e.preventDefault(); }
      else if (e.code === 'Space') { handleHardDrop(); e.preventDefault(); }
    });

    // Touch swipe on canvas
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
      if (Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) handleRight(); else handleLeft();
      } else if (dy > 35 && Math.abs(dy) > Math.abs(dx)) {
        handleHardDrop();
      } else if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        handleRotate();
      }
    }, { passive: true });
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

    // Board fits roughly 65% width, sidebar takes 35%
    this.cellSize = Math.min(Math.floor((width * 0.62) / COLS), Math.floor((height - 20) / ROWS));
    this.boardWidth = this.cellSize * COLS;
    this.boardHeight = this.cellSize * ROWS;
    this.boardX = 12;
    this.boardY = Math.floor((height - this.boardHeight) / 2);
    this.sidebarX = this.boardX + this.boardWidth + 14;

    this.render();
  }

  start() {
    this.highScore = getHighScore('tetris');
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 750;
    this.updateUI();

    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.nextPieces = [this.randomPiece(), this.randomPiece(), this.randomPiece()];
    this.spawnPiece();

    this.isRunning = true;
    this.lastDropTime = performance.now();

    this.resize();
    cancelAnimationFrame(this.animationFrameId);
    this.loop(this.lastDropTime);
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  randomPiece() {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    const template = TETROMINOES[key];
    return {
      type: key,
      shape: template.shape.map(row => [...row]),
      color: template.color
    };
  }

  spawnPiece() {
    const next = this.nextPieces.shift();
    this.nextPieces.push(this.randomPiece());

    this.currentPiece = {
      ...next,
      x: Math.floor((COLS - next.shape[0].length) / 2),
      y: 0
    };

    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
      this.gameOver();
    }
  }

  checkCollision(x, y, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const nx = x + c;
          const ny = y + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && this.grid[ny][nx]) return true;
        }
      }
    }
    return false;
  }

  move(dx, dy) {
    if (!this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x + dx, this.currentPiece.y + dy, this.currentPiece.shape)) {
      this.currentPiece.x += dx;
      this.currentPiece.y += dy;
      return true;
    }
    if (dy > 0) {
      this.lockPiece();
    }
    return false;
  }

  rotatePiece() {
    if (!this.currentPiece) return;
    const orig = this.currentPiece.shape;
    const rows = orig.length;
    const cols = orig[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = orig[r][c];
      }
    }

    // Wall kick attempts
    const kicks = [0, -1, 1, -2, 2];
    for (let kick of kicks) {
      if (!this.checkCollision(this.currentPiece.x + kick, this.currentPiece.y, rotated)) {
        this.currentPiece.x += kick;
        this.currentPiece.shape = rotated;
        sound.playRotate();
        return;
      }
    }
  }

  hardDrop() {
    if (!this.currentPiece) return;
    let dropDistance = 0;
    while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
      this.currentPiece.y++;
      dropDistance++;
    }
    this.score += dropDistance * 2;
    sound.playDrop();
    this.lockPiece();
    this.updateUI();
  }

  getGhostY() {
    if (!this.currentPiece) return 0;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.shape)) {
      ghostY++;
    }
    return ghostY;
  }

  lockPiece() {
    for (let r = 0; r < this.currentPiece.shape.length; r++) {
      for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
        if (this.currentPiece.shape[r][c]) {
          const gy = this.currentPiece.y + r;
          const gx = this.currentPiece.x + c;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            this.grid[gy][gx] = this.currentPiece.color;
          }
        }
      }
    }

    this.clearLines();
    this.spawnPiece();
  }

  clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== 0)) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(COLS).fill(0));
        cleared++;
        r++; // Check same row index again
      }
    }

    if (cleared > 0) {
      this.lines += cleared;
      const points = [0, 100, 300, 500, 800][cleared] * this.level;
      this.score += points;
      sound.playLineClear();

      // Level progression
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(120, 750 - (this.level - 1) * 60);

      this.updateUI();
    }
  }

  updateUI() {
    const scoreEl = document.getElementById('tetris-score');
    const levelEl = document.getElementById('tetris-level');
    if (scoreEl) scoreEl.textContent = this.score;
    if (levelEl) levelEl.textContent = this.level;
  }

  gameOver() {
    this.stop();
    sound.playExplode();
    const isNewHigh = saveHighScore('tetris', this.score);
    this.highScore = getHighScore('tetris');

    modal.show({
      gameTitle: gameTitles.tetris,
      score: this.score,
      highScore: this.highScore,
      isNewHigh,
      onRestart: () => this.start(),
      onHome: () => this.onReturnHome()
    });
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    if (currentTime - this.lastDropTime >= this.dropInterval) {
      this.move(0, 1);
      this.lastDropTime = currentTime;
    }

    this.render();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  render() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    // Dark starry/neon background
    this.ctx.fillStyle = '#0b1322';
    this.ctx.fillRect(0, 0, w, h);

    // 1. Draw Matrix Frame
    this.ctx.fillStyle = '#182740';
    this.ctx.fillRect(this.boardX - 4, this.boardY - 4, this.boardWidth + 8, this.boardHeight + 8);

    this.ctx.fillStyle = '#0f1a2e';
    this.ctx.fillRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);

    // Subtle grid lines
    this.ctx.strokeStyle = '#182740';
    this.ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardX, this.boardY + r * this.cellSize);
      this.ctx.lineTo(this.boardX + this.boardWidth, this.boardY + r * this.cellSize);
      this.ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardX + c * this.cellSize, this.boardY);
      this.ctx.lineTo(this.boardX + c * this.cellSize, this.boardY + this.boardHeight);
      this.ctx.stroke();
    }

    // 2. Draw Locked Grid Blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c]) {
          this.drawBlock(this.boardX + c * this.cellSize, this.boardY + r * this.cellSize, this.cellSize, this.grid[r][c]);
        }
      }
    }

    // 3. Draw Ghost Piece
    if (this.currentPiece) {
      const ghostY = this.getGhostY();
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            const gx = this.boardX + (this.currentPiece.x + c) * this.cellSize;
            const gy = this.boardY + (ghostY + r) * this.cellSize;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.fillRect(gx + 1, gy + 1, this.cellSize - 2, this.cellSize - 2);
          }
        }
      }

      // 4. Draw Current Piece
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            const px = this.boardX + (this.currentPiece.x + c) * this.cellSize;
            const py = this.boardY + (this.currentPiece.y + r) * this.cellSize;
            this.drawBlock(px, py, this.cellSize, this.currentPiece.color);
          }
        }
      }
    }

    // 5. Draw Right Sidebar (Score, Level, Next Piece)
    this.renderSidebar();
  }

  renderSidebar() {
    const sx = this.sidebarX;
    const sy = this.boardY;

    // Score & Level Text
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.fillText('점수 (Score)', sx, sy + 15);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.fillText(this.score.toLocaleString(), sx, sy + 38);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.fillText('레벨 (Level)', sx, sy + 75);

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 18px monospace';
    this.ctx.fillText(`${this.level}`, sx, sy + 98);

    // Next Piece Box
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.fillText('다음 블록 (Next)', sx, sy + 135);

    const nextBoxY = sy + 148;
    this.ctx.fillStyle = '#142136';
    this.ctx.fillRect(sx, nextBoxY, 80, 180);

    // Render 2 next pieces in the box
    this.nextPieces.slice(0, 2).forEach((piece, idx) => {
      const pieceY = nextBoxY + 15 + idx * 80;
      const miniCell = 14;
      const shape = piece.shape;
      const offX = sx + 40 - (shape[0].length * miniCell) / 2;
      const offY = pieceY + 25 - (shape.length * miniCell) / 2;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            this.drawBlock(offX + c * miniCell, offY + r * miniCell, miniCell, piece.color);
          }
        }
      }
    });
  }

  drawBlock(x, y, size, color) {
    const pad = 1;
    const bs = size - pad * 2;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + pad, y + pad, bs, bs);

    // Top / Left highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fillRect(x + pad, y + pad, bs, 2.5);
    this.ctx.fillRect(x + pad, y + pad, 2.5, bs);

    // Bottom / Right shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    this.ctx.fillRect(x + pad, y + pad + bs - 2.5, bs, 2.5);
    this.ctx.fillRect(x + pad + bs - 2.5, y + pad, 2.5, bs);
  }
}
