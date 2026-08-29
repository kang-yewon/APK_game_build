import confetti from 'canvas-confetti';
import { sound } from './sound.js';

class ModalManager {
  constructor() {
    this.modalEl = null;
    this.titleEl = null;
    this.statusEl = null;
    this.scoreValEl = null;
    this.highValEl = null;
    this.newHighBadge = null;
    this.restartBtn = null;
    this.homeBtn = null;

    this.onRestartCallback = null;
    this.onHomeCallback = null;
  }

  init() {
    this.modalEl = document.getElementById('game-modal-overlay');
    this.titleEl = document.getElementById('modal-game-title');
    this.statusEl = document.getElementById('modal-status-text');
    this.scoreValEl = document.getElementById('modal-current-score');
    this.highValEl = document.getElementById('modal-high-score');
    this.newHighBadge = document.getElementById('modal-new-high-badge');
    this.restartBtn = document.getElementById('modal-btn-restart');
    this.homeBtn = document.getElementById('modal-btn-home');

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        sound.playClick();
        this.hide();
        if (typeof this.onRestartCallback === 'function') {
          this.onRestartCallback();
        }
      });
    }

    if (this.homeBtn) {
      this.homeBtn.addEventListener('click', () => {
        sound.playClick();
        this.hide();
        if (typeof this.onHomeCallback === 'function') {
          this.onHomeCallback();
        }
      });
    }
  }

  show({ gameTitle, score, highScore, isNewHigh, isVictory = false, isTimeScore = false, onRestart, onHome }) {
    this.onRestartCallback = onRestart;
    this.onHomeCallback = onHome;

    if (!this.modalEl) this.init();

    this.titleEl.textContent = gameTitle;

    if (isVictory) {
      this.statusEl.textContent = '🎉 게임 승리! (VICTORY)';
      this.statusEl.className = 'modal-status victory';
      sound.playVictory();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      this.statusEl.textContent = '💀 게임 오버 (GAME OVER)';
      this.statusEl.className = 'modal-status gameover';
      sound.playGameOver();
    }

    const formatScore = (val) => {
      if (isTimeScore) {
        if (val === 0) return '-';
        const mins = Math.floor(val / 60);
        const secs = val % 60;
        return `${mins > 0 ? mins + '분 ' : ''}${secs}초`;
      }
      return Number(val).toLocaleString();
    };

    this.scoreValEl.textContent = formatScore(score);
    this.highValEl.textContent = formatScore(highScore);

    if (isNewHigh) {
      this.newHighBadge.classList.remove('hidden');
      if (!isVictory) {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.65 }
        });
      }
    } else {
      this.newHighBadge.classList.add('hidden');
    }

    this.modalEl.classList.remove('hidden');
  }

  hide() {
    if (this.modalEl) {
      this.modalEl.classList.add('hidden');
    }
  }
}

export const modal = new ModalManager();
