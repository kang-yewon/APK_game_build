import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

// Block Shapes definition
const SHAPES = [
  // 1x1
  { matrix: [[1]], color: '#f38120' },
  // 1x2, 2x1
  { matrix: [[1, 1]], color: '#2575fc' },
  { matrix: [[1], [1]], color: '#2575fc' },
  // 1x3, 3x1
  { matrix: [[1, 1, 1]], color: '#3bc461' },
  { matrix: [[1], [1], [1]], color: '#3bc461' },
  // 1x4, 4x1
  { matrix: [[1, 1, 1, 1]], color: '#00d2d3' },
  { matrix: [[1], [1], [1], [1]], color: '#00d2d3' },
  // 1x5, 5x1
  { matrix: [[1, 1, 1, 1, 1]], color: '#00d2d3' },
  // 2x2 Square
  { matrix: [[1, 1], [1, 1]], color: '#ffd026' },
  // 3x3 Square
  { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#ffd026' },
  // L Shapes
  { matrix: [[1, 0], [1, 0], [1, 1]], color: '#eb3b5a' },
  { matrix: [[0, 1], [0, 1], [1, 1]], color: '#eb3b5a' },
  { matrix: [[1, 1, 1], [1, 0, 0]], color: '#eb3b5a' },
  { matrix: [[1, 1, 1], [0, 0, 1]], color: '#eb3b5a' },
  // Small L (2x2)
  { matrix: [[1, 0], [1, 1]], color: '#9b59b6' },
  { matrix: [[0, 1], [1, 1]], color: '#9b59b6' },
  { matrix: [[1, 1], [1, 0]], color: '#9b59b6' },
  { matrix: [[1, 1], [0, 1]], color: '#9b59b6' },
  // T Shape
  { matrix: [[1, 1, 1], [0, 1, 0]], color: '#9b59b6' },
  { matrix: [[0, 1, 0], [1, 1, 1]], color: '#9b59b6' },
  // 2x3 & 3x2
  { matrix: [[1, 1, 1], [1, 1, 1]], color: '#f38120' },
  { matrix: [[1, 1], [1, 1], [1, 1]], color: '#f38120' }
];

export class BlockBlastGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.gridSize = 8; // 8x8 Board
    this.board = [];
    this.trayPieces = [null, null, null];
    this.score = 0;
    this.highScore = getHighScore('blockblast');
    this.combo = 0;

    // Board layout metrics
    this.boardSize = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.cellSize = 0;

    // Tray layout metrics
    this.trayY = 0;
    this.trayHeight = 0;
    this.traySlotWidth = 0;

    // Dragging & Tapping state
    this.dragIndex = -1;
    this.selectedTrayIndex = -1;
    this.dragX = 0;
    this.dragY = 0;
    this.dragOffsetHoverY = -50;
    this.touchMoved = false;

    this.particles = [];
    this.isRunning = false;
    this.animationFrameId = null;

    this.initTouch();
  }

  initTouch() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0].clientX : e.clientX);
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0].clientY : e.clientY);
      const logicalW = this.canvas.width / (window.devicePixelRatio || 1);
      const logicalH = this.canvas.height / (window.devicePixelRatio || 1);
      const scaleX = rect.width > 0 ? (logicalW / rect.width) : 1;
      const scaleY = rect.height > 0 ? (logicalH / rect.height) : 1;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const onStart = (e) => {
      if (!this.isRunning) return;
      const pos = getPos(e);
      this.touchMoved = false;

      // 1. Check if clicked in Tray
      if (pos.y >= this.trayY - 15 && pos.y <= this.trayY + this.trayHeight + 15) {
        const slotIdx = Math.floor(pos.x / this.traySlotWidth);
        if (slotIdx >= 0 && slotIdx < 3 && this.trayPieces[slotIdx]) {
          this.dragIndex = slotIdx;
          this.selectedTrayIndex = slotIdx;
          this.dragX = pos.x;
          this.dragY = pos.y + this.dragOffsetHoverY;
          sound.playClick();
          if (e.cancelable) e.preventDefault();
          return;
        }
      }

      // 2. Check if tapped on Board with a previously selected tray piece
      if (this.selectedTrayIndex !== -1 && this.trayPieces[this.selectedTrayIndex]) {
        const piece = this.trayPieces[this.selectedTrayIndex];
        const col = Math.floor((pos.x - this.boardX) / this.cellSize);
        const row = Math.floor((pos.y - this.boardY) / this.cellSize);
        if (row >= 0 && col >= 0 && this.canPlace(piece.matrix, row, col)) {
          this.placePiece(piece, row, col, this.selectedTrayIndex);
          this.selectedTrayIndex = -1;
          this.dragIndex = -1;
          if (e.cancelable) e.preventDefault();
          return;
        }
      }
    };

    const onMove = (e) => {
      if (!this.isRunning || this.dragIndex === -1) return;
      this.touchMoved = true;
      const pos = getPos(e);
      this.dragX = pos.x;
      this.dragY = pos.y + this.dragOffsetHoverY;
      if (e.cancelable) e.preventDefault();
    };

    const onEnd = (e) => {
      if (!this.isRunning || this.dragIndex === -1) {
        this.dragIndex = -1;
        return;
      }
      const pieceIdx = this.dragIndex;
      const piece = this.trayPieces[pieceIdx];

      if (piece && this.touchMoved) {
        const gridPos = this.getGridCoordForPiece(piece, this.dragX, this.dragY);
        if (gridPos && this.canPlace(piece.matrix, gridPos.r, gridPos.c)) {
          this.placePiece(piece, gridPos.r, gridPos.c, pieceIdx);
          this.selectedTrayIndex = -1;
        }
      }
      this.dragIndex = -1;
      if (e && e.cancelable) e.preventDefault();
    };

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', onEnd, { passive: false });

    this.canvas.addEventListener('mousedown', onStart);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onEnd);
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = rect.width > 50 ? rect.width : (window.innerWidth || 360);
    const height = rect.height > 50 ? rect.height : (window.innerHeight - 60);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    // Layout calculations
    this.boardSize = Math.min(width - 12, height * 0.65);
    this.boardX = (width - this.boardSize) / 2;
    this.boardY = 8;
    this.cellSize = this.boardSize / this.gridSize;

    this.trayY = this.boardY + this.boardSize + 14;
    this.trayHeight = Math.max(95, height - this.trayY - 10);
    this.traySlotWidth = width / 3;

    this.render();
  }

  start() {
    this.highScore = getHighScore('blockblast');
    this.score = 0;
    this.combo = 0;
    this.selectedTrayIndex = -1;
    this.dragIndex = -1;
    this.updateScoreUI();

    // Reset 8x8 Board
    this.board = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
    this.particles = [];
    this.spawnTrayPieces();

    this.isRunning = true;
    this.resize();

    cancelAnimationFrame(this.animationFrameId);
    this.loop();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  spawnTrayPieces() {
    for (let i = 0; i < 3; i++) {
      const template = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      this.trayPieces[i] = {
        matrix: template.matrix.map(row => [...row]),
        color: template.color
      };
    }
  }

  canPlace(matrix, row, col) {
    const rows = matrix.length;
    const cols = matrix[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] === 1) {
          const br = row + r;
          const bc = col + c;
          if (br < 0 || br >= this.gridSize || bc < 0 || bc >= this.gridSize) {
            return false;
          }
          if (this.board[br][bc] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  }

  canPieceFitAnywhere(matrix) {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.canPlace(matrix, r, c)) {
          return true;
        }
      }
    }
    return false;
  }

  getGridCoordForPiece(piece, canvasX, canvasY) {
    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;
    const pieceWidth = cols * this.cellSize;
    const pieceHeight = rows * this.cellSize;

    const pieceLeft = canvasX - pieceWidth / 2;
    const pieceTop = canvasY - pieceHeight / 2;

    const col = Math.round((pieceLeft - this.boardX) / this.cellSize);
    const row = Math.round((pieceTop - this.boardY) / this.cellSize);

    if (row >= 0 && row + rows <= this.gridSize && col >= 0 && col + cols <= this.gridSize) {
      return { r: row, c: col };
    }
    // Allow slight tolerance
    if (row >= -1 && row <= this.gridSize && col >= -1 && col <= this.gridSize) {
      const clampedR = Math.max(0, Math.min(this.gridSize - rows, row));
      const clampedC = Math.max(0, Math.min(this.gridSize - cols, col));
      return { r: clampedR, c: clampedC };
    }
    return null;
  }

  placePiece(piece, row, col, traySlotIndex) {
    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;
    let blockCount = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (piece.matrix[r][c] === 1) {
          this.board[row + r][col + c] = piece.color;
          blockCount++;
        }
      }
    }

    this.trayPieces[traySlotIndex] = null;
    this.score += blockCount * 10;
    sound.playDrop();

    this.checkLines();

    if (this.trayPieces.every(p => p === null)) {
      this.spawnTrayPieces();
    }

    this.updateScoreUI();
    this.checkGameOver();
  }

  checkLines() {
    const fullRows = [];
    const fullCols = [];

    // Rows
    for (let r = 0; r < this.gridSize; r++) {
      if (this.board[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }

    // Cols
    for (let c = 0; c < this.gridSize; c++) {
      let isFull = true;
      for (let r = 0; r < this.gridSize; r++) {
        if (this.board[r][c] === null) {
          isFull = false;
          break;
        }
      }
      if (isFull) fullCols.push(c);
    }

    const totalLines = fullRows.length + fullCols.length;
    if (totalLines > 0) {
      this.combo++;

      let linePoints = 0;
      if (totalLines === 1) linePoints = 100;
      else if (totalLines === 2) linePoints = 250;
      else if (totalLines === 3) linePoints = 350;
      else linePoints = 350 + (totalLines - 3) * 100;

      const comboBonus = this.combo > 1 ? (this.combo * 50) : 0;
      this.score += linePoints + comboBonus;

      sound.playLineClear();
      if (this.combo > 1) {
        sound.playCombo(this.combo);
      }

      const clearedSet = new Set();
      fullRows.forEach(r => {
        for (let c = 0; c < this.gridSize; c++) clearedSet.add(`${r},${c}`);
      });
      fullCols.forEach(c => {
        for (let r = 0; r < this.gridSize; r++) clearedSet.add(`${r},${c}`);
      });

      clearedSet.forEach(coord => {
        const [r, c] = coord.split(',').map(Number);
        const color = this.board[r][c] || '#ffd026';
        this.board[r][c] = null;
        this.addExplosionParticles(
          this.boardX + (c + 0.5) * this.cellSize,
          this.boardY + (r + 0.5) * this.cellSize,
          color
        );
      });
    } else {
      this.combo = 0;
    }
  }

  addExplosionParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 3,
        color,
        life: 1.0,
        decay: Math.random() * 0.04 + 0.03
      });
    }
  }

  checkGameOver() {
    const remaining = this.trayPieces.filter(p => p !== null);
    if (remaining.length === 0) return;

    const anyCanFit = remaining.some(p => this.canPieceFitAnywhere(p.matrix));
    if (!anyCanFit) {
      this.gameOver();
    }
  }

  gameOver() {
    this.stop();
    sound.playExplode();
    const isNewHigh = saveHighScore('blockblast', this.score);
    this.highScore = getHighScore('blockblast');

    modal.show({
      gameTitle: gameTitles.blockblast,
      score: this.score,
      highScore: this.highScore,
      isNewHigh,
      onRestart: () => this.start(),
      onHome: () => this.onReturnHome()
    });
  }

  updateScoreUI() {
    const scoreEl = document.getElementById('blockblast-score');
    if (scoreEl) scoreEl.textContent = `Score: ${this.score}`;
  }

  loop() {
    if (!this.isRunning) return;
    this.updateParticles();
    this.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
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
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    if (w <= 0 || h <= 0) return;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#0e1626';
    this.ctx.fillRect(0, 0, w, h);

    // 1. Draw 8x8 Board Container
    this.ctx.fillStyle = '#1c283c';
    this.ctx.fillRect(this.boardX - 4, this.boardY - 4, this.boardSize + 8, this.boardSize + 8);

    this.ctx.fillStyle = '#0f1724';
    this.ctx.fillRect(this.boardX, this.boardY, this.boardSize, this.boardSize);

    // 2. Draw Grid Cells
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const x = this.boardX + c * this.cellSize;
        const y = this.boardY + r * this.cellSize;
        const pad = 1.5;

        // Empty Cell
        this.ctx.fillStyle = '#162235';
        this.ctx.fillRect(x + pad, y + pad, this.cellSize - pad * 2, this.cellSize - pad * 2);

        // Filled Cell
        const color = this.board[r][c];
        if (color) {
          this.drawBlock(x + pad, y + pad, this.cellSize - pad * 2, color);
        }
      }
    }

    // 3. Draw Drag Hover Preview on Board
    if (this.dragIndex !== -1 && this.trayPieces[this.dragIndex]) {
      const piece = this.trayPieces[this.dragIndex];
      const gridPos = this.getGridCoordForPiece(piece, this.dragX, this.dragY);
      if (gridPos) {
        const valid = this.canPlace(piece.matrix, gridPos.r, gridPos.c);
        const rows = piece.matrix.length;
        const cols = piece.matrix[0].length;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (piece.matrix[r][c] === 1) {
              const br = gridPos.r + r;
              const bc = gridPos.c + c;
              if (br >= 0 && br < this.gridSize && bc >= 0 && bc < this.gridSize) {
                const x = this.boardX + bc * this.cellSize;
                const y = this.boardY + br * this.cellSize;
                this.ctx.fillStyle = valid ? 'rgba(59, 196, 97, 0.45)' : 'rgba(235, 59, 90, 0.45)';
                this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
              }
            }
          }
        }
      }
    }

    // 4. Draw Tray Container
    this.ctx.fillStyle = '#182436';
    this.drawRoundedRect(10, this.trayY, w - 20, this.trayHeight, 10);

    // 5. Draw Tray Pieces
    for (let i = 0; i < 3; i++) {
      const piece = this.trayPieces[i];
      if (!piece || i === this.dragIndex) continue;

      const slotCenterX = (i + 0.5) * this.traySlotWidth;
      const slotCenterY = this.trayY + this.trayHeight / 2;

      const isSelected = (i === this.selectedTrayIndex);
      if (isSelected) {
        this.ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        this.drawRoundedRect(slotCenterX - 36, slotCenterY - 36, 72, 72, 8);
      }

      const miniCellSize = Math.min(22, this.cellSize * 0.55);
      const rows = piece.matrix.length;
      const cols = piece.matrix[0].length;
      const startX = slotCenterX - (cols * miniCellSize) / 2;
      const startY = slotCenterY - (rows * miniCellSize) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (piece.matrix[r][c] === 1) {
            this.drawBlock(startX + c * miniCellSize, startY + r * miniCellSize, miniCellSize - 2, piece.color);
          }
        }
      }
    }

    // 6. Draw Dragging Piece
    if (this.dragIndex !== -1 && this.trayPieces[this.dragIndex]) {
      const piece = this.trayPieces[this.dragIndex];
      const rows = piece.matrix.length;
      const cols = piece.matrix[0].length;
      const startX = this.dragX - (cols * this.cellSize) / 2;
      const startY = this.dragY - (rows * this.cellSize) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (piece.matrix[r][c] === 1) {
            this.drawBlock(startX + c * this.cellSize + 2, startY + r * this.cellSize + 2, this.cellSize - 4, piece.color, true);
          }
        }
      }
    }

    // 7. Draw Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      this.ctx.globalAlpha = 1.0;
    });
  }

  drawBlock(x, y, size, color, isFloating = false) {
    this.ctx.save();
    if (isFloating) {
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 12;
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, size);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fillRect(x, y, size, 3);
    this.ctx.fillRect(x, y, 3, size);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    this.ctx.fillRect(x, y + size - 3, size, 3);
    this.ctx.fillRect(x + size - 3, y, 3, size);

    this.ctx.restore();
  }
}
