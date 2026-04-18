const board = Array(9).fill(null);
const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
let currentPlayer = 'X';
let gameActive = true;
let singlePlayer = false;
const score = { X: 0, O: 0, draw: 0 };

const cells = document.querySelectorAll('.cell');
const statusElement = document.getElementById('status');
const restartButton = document.getElementById('restart');
const scoreX = document.getElementById('score-x');
const scoreO = document.getElementById('score-o');
const scoreDraw = document.getElementById('score-draw');
const modeTwoPlayer = document.getElementById('mode-two-player');
const modeSinglePlayer = document.getElementById('mode-single-player');
const modeHint = document.getElementById('mode-hint');

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const soundProfiles = {
  move: { frequency: 320, duration: 0.08, type: 'triangle' },
  win: { frequency: 680, duration: 0.18, type: 'sine' },
  draw: { frequency: 420, duration: 0.16, type: 'square' },
  reset: { frequency: 520, duration: 0.12, type: 'triangle' },
  switch: { frequency: 260, duration: 0.1, type: 'sine' },
};

function updateStatus(message) {
  statusElement.textContent = message;
}

function renderScores() {
  scoreX.textContent = score.X;
  scoreO.textContent = score.O;
  scoreDraw.textContent = score.draw;
}

function playTone({ frequency, duration, type }) {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + 0.02);
}

function playSound(name) {
  const profile = soundProfiles[name];
  if (profile) {
    playTone(profile);
  }
}

function setMode(useAI) {
  singlePlayer = useAI;
  modeTwoPlayer.classList.toggle('active', !singlePlayer);
  modeSinglePlayer.classList.toggle('active', singlePlayer);
  modeHint.textContent = singlePlayer ? 'Human X versus computer O.' : 'Two humans take turns.';
  playSound('switch');
  resetGame();
}

function getWinner() {
  for (const line of winningLines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function highlightWinningCells(winner) {
  const winningLine = winningLines.find(line => {
    const [a, b, c] = line;
    return board[a] === winner && board[b] === winner && board[c] === winner;
  });
  if (!winningLine) return;

  winningLine.forEach(index => {
    const cell = cells[index];
    cell.style.boxShadow = `0 0 0 5px rgba(255, 255, 255, 0.18), 0 0 0 12px rgba(255, 255, 255, 0.08)`;
    cell.style.transform = 'scale(1.02)';
  });
}

function finishTurn() {
  const winner = getWinner();
  if (winner) {
    gameActive = false;
    score[winner] += 1;
    renderScores();
    updateStatus(`Player ${winner} wins!`);
    highlightWinningCells(winner);
    playSound('win');
    return true;
  }

  if (board.every(Boolean)) {
    gameActive = false;
    score.draw += 1;
    renderScores();
    updateStatus('It\'s a draw! Restart to play again.');
    playSound('draw');
    return true;
  }

  return false;
}

function chooseAIMove() {
  const aiPlayer = 'O';
  const humanPlayer = 'X';

  const findWinningMove = (player) => {
    for (const line of winningLines) {
      const [a, b, c] = line;
      const values = [board[a], board[b], board[c]];
      if (values.filter(value => value === player).length === 2 && values.includes(null)) {
        return line[values.indexOf(null)];
      }
    }
    return -1;
  };

  const winIndex = findWinningMove(aiPlayer);
  if (winIndex >= 0) return winIndex;

  const blockIndex = findWinningMove(humanPlayer);
  if (blockIndex >= 0) return blockIndex;

  if (!board[4]) return 4;

  const corners = [0, 2, 6, 8].filter(index => !board[index]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];

  const edges = [1, 3, 5, 7].filter(index => !board[index]);
  if (edges.length) return edges[Math.floor(Math.random() * edges.length)];

  return board.findIndex(cell => !cell);
}

function applyMove(index) {
  board[index] = currentPlayer;
  const cell = cells[index];
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());
  cell.disabled = true;
  playSound('move');
}

function handleCellClick(event) {
  const button = event.target;
  const index = Number(button.dataset.index);

  if (!gameActive || board[index] || (singlePlayer && currentPlayer === 'O')) return;

  applyMove(index);
  if (finishTurn()) return;

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  if (singlePlayer && currentPlayer === 'O') {
    updateStatus('Computer is thinking...');
    setTimeout(makeAIMove, 300);
    return;
  }

  updateStatus(`Player ${currentPlayer}, it\'s your turn`);
}

function makeAIMove() {
  if (!gameActive) return;

  const index = chooseAIMove();
  if (index < 0) return;

  applyMove(index);
  if (finishTurn()) return;

  currentPlayer = 'X';
  updateStatus(`Player ${currentPlayer}, it\'s your turn`);
}

function resetGame() {
  board.fill(null);
  currentPlayer = 'X';
  gameActive = true;
  cells.forEach(cell => {
    cell.textContent = '';
    cell.disabled = false;
    cell.classList.remove('x', 'o');
    cell.style.boxShadow = '';
    cell.style.transform = '';
  });
  playSound('reset');
  updateStatus(`Player ${currentPlayer}, it\'s your turn`);
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', resetGame);
modeTwoPlayer.addEventListener('click', () => setMode(false));
modeSinglePlayer.addEventListener('click', () => setMode(true));
renderScores();
updateStatus(`Player ${currentPlayer}, it\'s your turn`);
