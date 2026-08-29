import { sound } from './sound.js';
import { getHighScore, getAllHighScores, gameTitles } from './storage.js';
import { modal } from './modal.js';
import { SnakeGame } from './games/snake.js';
import { BlockBlastGame } from './games/blockblast.js';
import { TetrisGame } from './games/tetris.js';
import { BreakoutGame } from './games/breakout.js';
import { DinoGame } from './games/dino.js';
import { MinesweeperGame } from './games/minesweeper.js';

class App {
  constructor() {
    this.currentScreen = 'home';
    this.activeGameInstance = null;
    this.games = {};
  }

  init() {
    modal.init();
    this.initAudioToggle();
    this.initNavigation();
    this.initGames();
    this.initHighScoreModal();

    // Resize listener
    window.addEventListener('resize', () => {
      if (this.activeGameInstance && typeof this.activeGameInstance.resize === 'function') {
        this.activeGameInstance.resize();
      }
    });

    // Android back button handling
    window.addEventListener('popstate', (e) => {
      if (this.currentScreen !== 'home') {
        this.navigateTo('home');
      }
    });
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
    // 1. Snake
    const snakeCanvas = document.getElementById('snake-canvas');
    if (snakeCanvas) {
      this.games.snake = new SnakeGame(snakeCanvas, () => this.navigateTo('home'));
    }

    // 2. Block Blast
    const blockblastCanvas = document.getElementById('blockblast-canvas');
    if (blockblastCanvas) {
      this.games.blockblast = new BlockBlastGame(blockblastCanvas, () => this.navigateTo('home'));
    }

    // 3. Tetris
    const tetrisCanvas = document.getElementById('tetris-canvas');
    if (tetrisCanvas) {
      this.games.tetris = new TetrisGame(tetrisCanvas, () => this.navigateTo('home'));
    }

    // 4. Breakout
    const breakoutCanvas = document.getElementById('breakout-canvas');
    if (breakoutCanvas) {
      this.games.breakout = new BreakoutGame(breakoutCanvas, () => this.navigateTo('home'));
    }

    // 5. Dino
    const dinoCanvas = document.getElementById('dino-canvas');
    if (dinoCanvas) {
      this.games.dino = new DinoGame(dinoCanvas, () => this.navigateTo('home'));
    }

    // 6. Minesweeper
    const minesweeperCanvas = document.getElementById('minesweeper-canvas');
    if (minesweeperCanvas) {
      this.games.minesweeper = new MinesweeperGame(minesweeperCanvas, () => this.navigateTo('home'));
    }
  }

  initNavigation() {
    // Home screen game tiles
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const gameKey = card.getAttribute('data-game');
        if (gameKey) {
          sound.playClick();
          this.navigateTo(gameKey);
        }
      });
    });

    // Top Bar Home buttons in all games
    document.querySelectorAll('.btn-header-home').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.navigateTo('home');
      });
    });
  }

  navigateTo(screenId) {
    // Stop any running game
    if (this.activeGameInstance && typeof this.activeGameInstance.stop === 'function') {
      this.activeGameInstance.stop();
      this.activeGameInstance = null;
    }

    modal.hide();

    // Hide all screens
    document.querySelectorAll('.screen-view').forEach(el => {
      el.classList.add('hidden');
    });

    // Show target screen
    const targetEl = document.getElementById(`screen-${screenId}`);
    if (targetEl) {
      targetEl.classList.remove('hidden');
      this.currentScreen = screenId;
    }

    // Start selected game
    if (this.games[screenId]) {
      this.activeGameInstance = this.games[screenId];
      // Push history state so Android back button works
      history.pushState({ screen: screenId }, '', `#${screenId}`);
      setTimeout(() => {
        this.activeGameInstance.start();
      }, 50);
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

// App Launch
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
