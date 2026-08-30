// LocalStorage High Score & Data Manager

const STORAGE_KEYS = {
  SNAKE: 'arcade_highscore_snake',
  TETRIS: 'arcade_highscore_tetris',
  BLOCKBLAST: 'arcade_highscore_blockblast',
  BREAKOUT: 'arcade_highscore_breakout',
  DINO: 'arcade_highscore_dino',
  MINESWEEPER: 'arcade_highscore_minesweeper',
  GAME2048: 'arcade_highscore_game2048',
  SUIKA: 'arcade_highscore_suika',
  RHYTHM: 'arcade_highscore_rhythm'
};

export const gameTitles = {
  snake: '스네이크 게임',
  tetris: '테트리스',
  blockblast: '블록 블라스트',
  breakout: '벽돌 깨기 게임',
  dino: '크롬 공룡 게임',
  minesweeper: '지뢰 찾기 게임',
  game2048: '2048',
  suika: '수박 게임 (Suika)',
  rhythm: '비트 드럼 (Waiting for Love)'
};

export function getHighScore(gameKey) {
  const key = STORAGE_KEYS[gameKey.toUpperCase()];
  if (!key) return 0;
  const val = localStorage.getItem(key);
  if (gameKey === 'minesweeper') {
    return val ? parseInt(val, 10) : 0;
  }
  return val ? parseInt(val, 10) : 0;
}

export function saveHighScore(gameKey, score) {
  const key = STORAGE_KEYS[gameKey.toUpperCase()];
  if (!key) return false;

  const currentHigh = getHighScore(gameKey);
  let isNewHigh = false;

  if (gameKey === 'minesweeper') {
    if (currentHigh === 0 || score < currentHigh) {
      localStorage.setItem(key, score.toString());
      isNewHigh = true;
    }
  } else {
    if (score > currentHigh) {
      localStorage.setItem(key, score.toString());
      isNewHigh = true;
    }
  }

  return isNewHigh;
}

export function getAllHighScores() {
  return {
    snake: getHighScore('snake'),
    tetris: getHighScore('tetris'),
    blockblast: getHighScore('blockblast'),
    breakout: getHighScore('breakout'),
    dino: getHighScore('dino'),
    minesweeper: getHighScore('minesweeper'),
    game2048: getHighScore('game2048'),
    suika: getHighScore('suika'),
    rhythm: getHighScore('rhythm')
  };
}
