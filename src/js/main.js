import { sound } from './sound.js';
import { getAllHighScores, gameTitles } from './storage.js';
import { modal } from './modal.js';
import { Calculator } from './calculator.js';
import { SnakeGame } from './games/snake.js';
import { BlockBlastGame } from './games/blockblast.js';
import { TetrisGame } from './games/tetris.js';
import { BreakoutGame } from './games/breakout.js';
import { DinoGame } from './games/dino.js';
import { MinesweeperGame } from './games/minesweeper.js';
import { Game2048 } from './games/game2048.js';
import { SuikaGame } from './games/suika.js';

class App {
  constructor() {
    this.currentScreen = 'calculator';
    this.activeGameInstance = null;
    this.games = {};
    this.calculator = null;
  }

  init() {
    modal.init();
    this.initCalculator();
    this.initAudioToggle();
    this.initNavigation();
    this.initGames();
    this.initHighScoreModal();

    window.addEventListener('resize', () => {
      if (this.activeGameInstance && typeof this.activeGameInstance.resize === 'function') {
        this.activeGameInstance.resize();
      }
    });

    window.addEventListener('popstate', (e) => {
      if (this.currentScreen !== 'calculator' && this.currentScreen !== 'home') {
        this.navigateTo('home');
      } else if (this.currentScreen === 'home') {
        this.lockToCalculator();
      }
    });
  }

  initCalculator() {
    this.calculator = new Calculator(() => {
      sound.playVictory();
      this.unlockArcade();
    });
  }

  unlockArcade() {
    this.navigateTo('home');
  }

  lockToCalculator() {
    if (this.activeGameInstance && typeof this.activeGameInstance.stop === 'function') {
      this.activeGameInstance.stop();
      this.activeGameInstance = null;
    }
    modal.hide();
    this.navigateTo('calculator');
  }

  initAudioToggle() {
    const soundBtn = document.getElementById('btn-sound-toggle');
    const updateIcon = () => {
      if (soundBtn) {
        soundBtn.textContent = sound.isSoundEnabled() ? '🔊' : '🔇';
      }
    };
    updateIcon();

    soundBtn?.addEventListener('click', () => {
      const enabled = sound.toggleSound();
      updateIcon();
      if (enabled) sound.playClick();
    });
  }

  initGames() {
    const snakeCanvas = document.getElementById('snake-canvas');
    if (snakeCanvas) {
      this.games.snake = new SnakeGame(snakeCanvas, () => this.navigateTo('home'));
    }

    const blockblastCanvas = document.getElementById('blockblast-canvas');
    if (blockblastCanvas) {
      this.games.blockblast = new BlockBlastGame(blockblastCanvas, () => this.navigateTo('home'));
    }

    const tetrisCanvas = document.getElementById('tetris-canvas');
    if (tetrisCanvas) {
      this.games.tetris = new TetrisGame(tetrisCanvas, () => this.navigateTo('home'));
    }

    const breakoutCanvas = document.getElementById('breakout-canvas');
    if (breakoutCanvas) {
      this.games.breakout = new BreakoutGame(breakoutCanvas, () => this.navigateTo('home'));
    }

    const dinoCanvas = document.getElementById('dino-canvas');
    if (dinoCanvas) {
      this.games.dino = new DinoGame(dinoCanvas, () => this.navigateTo('home'));
    }

    const minesweeperCanvas = document.getElementById('minesweeper-canvas');
    if (minesweeperCanvas) {
      this.games.minesweeper = new MinesweeperGame(minesweeperCanvas, () => this.navigateTo('home'));
    }

    const g2048Canvas = document.getElementById('g2048-canvas');
    if (g2048Canvas) {
      this.games.game2048 = new Game2048(g2048Canvas, () => this.navigateTo('home'));
    }

    const suikaCanvas = document.getElementById('suika-canvas');
    if (suikaCanvas) {
      this.games.suika = new SuikaGame(suikaCanvas, () => this.navigateTo('home'));
    }
  }

  initNavigation() {
    const btnArcadeExit = document.getElementById('btn-arcade-exit');
    btnArcadeExit?.addEventListener('click', () => {
      sound.playClick();
      this.lockToCalculator();
    });

    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const gameKey = card.getAttribute('data-game');
        if (gameKey) {
          sound.playClick();
          this.navigateTo(gameKey);
        }
      });
    });

    document.querySelectorAll('.btn-header-home').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.navigateTo('home');
      });
    });
  }

  navigateTo(screenId) {
    if (this.activeGameInstance && typeof this.activeGameInstance.stop === 'function') {
      this.activeGameInstance.stop();
      this.activeGameInstance = null;
    }

    modal.hide();

    document.querySelectorAll('.screen-view').forEach(el => {
      el.classList.add('hidden');
    });

    const targetEl = document.getElementById(`screen-${screenId}`);
    if (targetEl) {
      targetEl.classList.remove('hidden');
      this.currentScreen = screenId;
    }

    if (this.games[screenId]) {
      this.activeGameInstance = this.games[screenId];
      history.pushState({ screen: screenId }, '', `#${screenId}`);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this.activeGameInstance) {
            this.activeGameInstance.start();
          }
        });
      });
    }
  }

  initHighScoreModal() {
    const btnHighScore = document.getElementById('btn-open-highscore');
    const modalHigh = document.getElementById('highscore-modal-overlay');
    const btnCloseHigh = document.getElementById('btn-close-highscore');

    const renderScores = () => {
      const scores = getAllHighScores();
      const listEl = document.getElementById('highscore-list-content');
      if (!listEl) return;

      listEl.innerHTML = `
        <div class="hs-row"><span>🐍 ${gameTitles.snake}</span><strong>${scores.snake.toLocaleString()} 점</strong></div>
        <div class="hs-row"><span>🧱 ${gameTitles.tetris}</span><strong>${scores.tetris.toLocaleString()} 점</strong></div>
        <div class="hs-row"><span>💥 ${gameTitles.blockblast}</span><strong>${scores.blockblast.toLocaleString()} 점</strong></div>
        <div class="hs-row"><span>🚀 ${gameTitles.breakout}</span><strong>${scores.breakout.toLocaleString()} 점</strong></div>
        <div class="hs-row"><span>🦖 ${gameTitles.dino}</span><strong>${scores.dino.toLocaleString()} 점</strong></div>
        <div class="hs-row"><span>💣 ${gameTitles.minesweeper}</span><strong>${scores.minesweeper > 0 ? scores.minesweeper + '초' : '기록 없음'}</strong></div>
        <div class="hs-row"><span>🔢 ${gameTitles.game2048}</span><strong>${scores.game2048.toLocaleString()} 점</strong></div>
        <div class="hs-row"><span>🍉 ${gameTitles.suika}</span><strong>${scores.suika.toLocaleString()} 점</strong></div>
      `;
    };

    btnHighScore?.addEventListener('click', () => {
      sound.playClick();
      renderScores();
      modalHigh?.classList.remove('hidden');
    });

    btnCloseHigh?.addEventListener('click', () => {
      sound.playClick();
      modalHigh?.classList.add('hidden');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
