import { sound } from '../sound.js';
import { getHighScore, saveHighScore, gameTitles } from '../storage.js';
import { modal } from '../modal.js';

const DIFFICULTIES = {
  1: { name: '1단계 (쉬움)', rows: 8, cols: 8, mines: 10 },
  2: { name: '2단계 (보통)', rows: 10, cols: 10, mines: 18 },
  3: { name: '3단계 (어려움)', rows: 12, cols: 12, mines: 30 }
};

export class MinesweeperGame {
  constructor(canvas, onReturnHome) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onReturnHome = onReturnHome;

    this.currentLevel = 1;
    this.rows = 8;
    this.cols = 8;
    this.totalMines = 10;
    this.placedFlags = 0;

    this.board = [];
    this.firstClick = true;
    this.isGameOver = false;
    this.isVictory = false;

    // Timer
    this.startTime = 0;
    this.elapsedSeconds = 0;
    this.timerInterval = null;

    // Layout
    this.boardSize = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.cellSize = 0;

    // Long press tracking
    this.longPressTimer = null;
    this.touchStartPos = null;
    this.touchCell = null;
    this.isLongPressTriggered = false;
    this.longPressThresholdMs = 320;

    this.isRunning = false;
    this.initControls();
    this.initDifficultyModal();
  }

  initDifficultyModal() {
    const modalDiff = document.getElementById('minesweeper-difficulty-modal');
    document.querySelectorAll('.btn-minesweeper-diff').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = parseInt(btn.getAttribute('data-level'), 10) || 1;
        sound.playClick();
        modalDiff?.classList.add('hidden');
        this.setDifficultyAndStart(level);
      });
    });
  }

  initControls() {
    // Bottom Restart Button
    const btnRestart = document.getElementById('minesweeper-btn-restart');
    btnRestart?.addEventListener('click', () => {
      sound.playClick();
      this.promptDifficulty();
    });

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const getCell = (pos) => {
      const col = Math.floor((pos.x - this.boardX) / this.cellSize);
      const row = Math.floor((pos.y - this.boardY) / this.cellSize);
      if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
        return { r: row, c: col };
      }
      return null;
    };

    const onPointerDown = (e) => {
      if (!this.isRunning || this.isGameOver || this.isVictory) return;
      const pos = getPos(e);
      const cell = getCell(pos);
      if (!cell) return;

      this.touchStartPos = pos;
      this.touchCell = cell;
      this.isLongPressTriggered = false;

      if (this.longPressTimer) clearTimeout(this.longPressTimer);

      // Start Long Press Timer (320ms)
      this.longPressTimer = setTimeout(() => {
        if (!this.isRunning || this.isGameOver || this.isVictory) return;
        this.isLongPressTriggered = true;
        this.toggleFlag(cell.r, cell.c);
        if (navigator.vibrate) {
          try { navigator.vibrate(40); } catch (err) {}
        }
      }, this.longPressThresholdMs);

      if (e.cancelable) e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!this.touchStartPos) return;
      const pos = getPos(e);
      const dist = Math.hypot(pos.x - this.touchStartPos.x, pos.y - this.touchStartPos.y);

      // If finger moves more than 8 pixels, cancel long press (user is scrolling / dragging)
      if (dist > 8) {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      }
    };

    const onPointerUp = (e) => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (!this.isRunning || this.isGameOver || this.isVictory || !this.touchCell) {
        this.touchStartPos = null;
        this.touchCell = null;
        return;
      }

      if (!this.isLongPressTriggered) {
        this.revealTile(this.touchCell.r, this.touchCell.c);
      }

      this.touchStartPos = null;
      this.touchCell = null;
      this.isLongPressTriggered = false;
    };

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    this.canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    this.canvas.addEventListener('touchend', onPointerUp, { passive: false });
    this.canvas.addEventListener('touchcancel', () => {
      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      this.touchStartPos = null;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        e.preventDefault();
        const pos = getPos(e);
        const cell = getCell(pos);
        if (cell) this.toggleFlag(cell.r, cell.c);
      } else if (e.button === 0) {
        onPointerDown(e);
      }
    });

    this.canvas.addEventListener('mousemove', onPointerMove);
    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) onPointerUp(e);
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    // Maximize canvas size to fill available space
    const size = Math.min(parent.clientWidth - 8, parent.clientHeight - 8, 480);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.boardSize = size * 0.96;
    this.boardX = (size - this.boardSize) / 2;
    this.boardY = (size - this.boardSize) / 2;
    this.cellSize = this.boardSize / this.cols;

    this.render();
  }

  start() {
    // Show difficulty selection modal before game starts
    this.promptDifficulty();
  }

  promptDifficulty() {
    this.stop();
    const modalDiff = document.getElementById('minesweeper-difficulty-modal');
    modalDiff?.classList.remove('hidden');
  }

  setDifficultyAndStart(level = 1) {
    this.currentLevel = level;
    const conf = DIFFICULTIES[level] || DIFFICULTIES[1];
    this.rows = conf.rows;
    this.cols = conf.cols;
    this.totalMines = conf.mines;

    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.longPressTimer) clearTimeout(this.longPressTimer);

    this.firstClick = true;
    this.isGameOver = false;
    this.isVictory = false;
    this.placedFlags = 0;
    this.elapsedSeconds = 0;

    // Build empty board
    this.board = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          r, c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          isExploded: false,
          neighborCount: 0
        });
      }
      this.board.push(row);
    }

    this.updateUI();
    this.isRunning = true;
    this.resize();
  }

  stop() {
    this.isRunning = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      this.updateUI();
    }, 1000);
  }

  generateMines(safeR, safeC) {
    let placed = 0;
    while (placed < this.totalMines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);

      // Safe 3x3 region around first click
      const isAroundSafe = Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1;

      if (!this.board[r][c].isMine && !isAroundSafe) {
        this.board[r][c].isMine = true;
        placed++;
      }
    }

    // Calculate neighboring mine counts
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.board[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc].isMine) {
                count++;
              }
            }
          }
          this.board[r][c].neighborCount = count;
        }
      }
    }
  }

  toggleFlag(r, c) {
    const cell = this.board[r][c];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    this.placedFlags += cell.isFlagged ? 1 : -1;
    sound.playFlag();
    this.updateUI();
    this.render();
  }

  revealTile(r, c) {
    const cell = this.board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    if (this.firstClick) {
      this.firstClick = false;
      this.generateMines(r, c);
      this.startTimer();
    }

    if (cell.isMine) {
      cell.isRevealed = true;
      cell.isExploded = true;
      this.gameOver(false);
      return;
    }

    sound.playTileOpen();
    this.cascadeReveal(r, c);
    this.render();

    this.checkVictory();
  }

  cascadeReveal(startR, startC) {
    const queue = [[startR, startC]];
    const visited = new Set([`${startR},${startC}`]);

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      const cell = this.board[r][c];
      cell.isRevealed = true;
      cell.isFlagged = false;

      if (cell.neighborCount === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            const key = `${nr},${nc}`;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !visited.has(key)) {
              visited.add(key);
              if (!this.board[nr][nc].isRevealed && !this.board[nr][nc].isMine) {
                queue.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  }

  checkVictory() {
    let unrevealedNonMines = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.board[r][c].isMine && !this.board[r][c].isRevealed) {
          unrevealedNonMines++;
        }
      }
    }

    if (unrevealedNonMines === 0) {
      this.gameOver(true);
    }
  }

  gameOver(isWin) {
    this.stop();

    if (isWin) {
      this.isVictory = true;
      const isNewHigh = saveHighScore('minesweeper', this.elapsedSeconds);
      const highScore = getHighScore('minesweeper');

      this.render();
      modal.show({
        gameTitle: `${gameTitles.minesweeper} (${DIFFICULTIES[this.currentLevel].name})`,
        score: this.elapsedSeconds,
        highScore: highScore,
        isNewHigh,
        isVictory: true,
        isTimeScore: true,
        onRestart: () => this.promptDifficulty(),
        onHome: () => this.onReturnHome()
      });
    } else {
      this.isGameOver = true;
      sound.playExplode();

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.board[r][c].isMine) {
            this.board[r][c].isRevealed = true;
          }
        }
      }
      this.render();

      modal.show({
        gameTitle: `${gameTitles.minesweeper} (${DIFFICULTIES[this.currentLevel].name})`,
        score: this.elapsedSeconds,
        highScore: getHighScore('minesweeper'),
        isNewHigh: false,
        isVictory: false,
        isTimeScore: true,
        onRestart: () => this.promptDifficulty(),
        onHome: () => this.onReturnHome()
      });
    }
  }

  updateUI() {
    const mineCounterEl = document.getElementById('minesweeper-mines-left');
    const timerEl = document.getElementById('minesweeper-timer');

    const remainingMines = Math.max(0, this.totalMines - this.placedFlags);
    if (mineCounterEl) mineCounterEl.textContent = `💣 ${remainingMines}`;

    const mins = Math.floor(this.elapsedSeconds / 60).toString().padStart(2, '0');
    const secs = (this.elapsedSeconds % 60).toString().padStart(2, '0');
    if (timerEl) timerEl.textContent = `⏱️ ${mins}:${secs}`;
  }

  render() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    // Background
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, w, h);

    // Board Bevel Border
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(this.boardX - 4, this.boardY - 4, this.boardSize + 8, this.boardSize + 8);

    const NUMBER_COLORS = [
      '',
      '#3b82f6', // 1: Blue
      '#22c55e', // 2: Green
      '#ef4444', // 3: Red
      '#8b5cf6', // 4: Purple
      '#b91c1c', // 5: Dark Red
      '#06b6d4', // 6: Cyan
      '#000000', // 7: Black
      '#64748b'  // 8: Gray
    ];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.board[r][c];
        const x = this.boardX + c * this.cellSize;
        const y = this.boardY + r * this.cellSize;
        const s = this.cellSize;

        if (cell.isRevealed) {
          if (cell.isMine) {
            this.ctx.fillStyle = cell.isExploded ? '#ef4444' : '#1e293b';
            this.ctx.fillRect(x, y, s, s);
            this.ctx.strokeStyle = '#475569';
            this.ctx.strokeRect(x, y, s, s);

            this.ctx.fillStyle = '#000000';
            this.ctx.font = `${Math.floor(s * 0.58)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('💣', x + s / 2, y + s / 2 + 1);

          } else {
            this.ctx.fillStyle = '#e2e8f0';
            this.ctx.fillRect(x, y, s, s);
            this.ctx.strokeStyle = '#cbd5e1';
            this.ctx.strokeRect(x, y, s, s);

            if (cell.neighborCount > 0) {
              this.ctx.fillStyle = NUMBER_COLORS[cell.neighborCount] || '#000000';
              this.ctx.font = `bold ${Math.floor(s * 0.58)}px monospace`;
              this.ctx.textAlign = 'center';
              this.ctx.textBaseline = 'middle';
              this.ctx.fillText(cell.neighborCount, x + s / 2, y + s / 2 + 1);
            }
          }
        } else {
          // Unrevealed 3D beveled tile
          this.ctx.fillStyle = '#94a3b8';
          this.ctx.fillRect(x, y, s, s);

          this.ctx.fillStyle = '#f1f5f9';
          this.ctx.fillRect(x, y, s, 3);
          this.ctx.fillRect(x, y, 3, s);

          this.ctx.fillStyle = '#475569';
          this.ctx.fillRect(x, y + s - 3, s, 3);
          this.ctx.fillRect(x + sizeTileEdge(s), y, 3, s);

          if (cell.isFlagged) {
            this.ctx.font = `${Math.floor(s * 0.58)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🚩', x + s / 2, y + s / 2 + 1);
          }
        }
      }
    }
  }
}

function sizeTileEdge(s) {
  return s - 3;
}
