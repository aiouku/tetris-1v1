import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { Multiplayer } from './multiplayer.js';
import { UI } from './ui.js';
import { audio } from './audio.js';

const ui = new UI();
const mp = new Multiplayer();
let game = null;
let renderer = null;
let opponentRenderer = null;
let input = null;
let lastTime = 0;
let running = false;
let myName = '';
let opponentName = '';

async function init() {
  await mp.connect();

  ui.elements.playBtn.addEventListener('click', findMatch);
  ui.elements.rematchBtn.addEventListener('click', requestRematch);
  ui.elements.menuBtn.addEventListener('click', backToMenu);

  // Multiplayer events
  mp.on('waiting', () => {
    ui.showWaiting();
  });

  mp.on('match_found', (data) => {
    ui.hideWaiting();
    opponentName = data.opponentName;
    ui.setPlayerNames(myName, opponentName);
  });

  mp.on('countdown', (count) => {
    ui.showScreen('game');
    ui.showCountdown(count);
    audio.countdown();
    if (count === 3) {
      setupGame();
    }
  });

  mp.on('game_start', () => {
    ui.hideCountdown();
    audio.gameStart();
    startGame();
  });

  mp.on('opponent_board', (board) => {
    if (opponentRenderer) {
      opponentRenderer.renderOpponentBoard(board);
    }
  });

  mp.on('receive_attack', (lines) => {
    if (game && !game.gameOver) {
      game.receiveGarbage(lines);
      ui.updatePendingGarbage(game.pendingGarbage);
      audio.garbage();
    }
  });

  mp.on('game_result', (data) => {
    running = false;
    if (input) input.disable();
    ui.showResult(data.won, data.winnerName);
    if (data.won) {
      audio.win();
    } else {
      audio.lose();
    }
  });

  mp.on('opponent_wants_rematch', () => {
    ui.showOpponentWantsRematch();
  });

  mp.on('opponent_disconnected', () => {
    if (running) {
      running = false;
      if (input) input.disable();
      ui.showResult(true);
      ui.elements.resultMessage.textContent = 'Opponent disconnected';
      audio.win();
    } else {
      ui.elements.rematchStatus.textContent = 'Opponent disconnected';
      ui.elements.rematchBtn.disabled = true;
    }
  });
}

function findMatch() {
  myName = ui.elements.nameInput.value.trim() || '名無しのごんべえ';
  mp.findMatch(myName);
  ui.showScreen('game');
  ui.showWaiting();
}

function setupGame() {
  const canvas = document.getElementById('game-canvas');
  const oppCanvas = document.getElementById('opponent-canvas');

  game = new Game();
  renderer = new Renderer(canvas);
  opponentRenderer = new Renderer(oppCanvas, true);
  input = new InputHandler(game);

  game.onAttack = (lines) => {
    mp.sendAttack(lines);
  };

  game.onBoardUpdate = (board) => {
    mp.sendBoardUpdate(board);
  };

  game.onGameOver = () => {
    audio.gameOver();
    mp.sendGameOver();
  };

  game.onLinesClear = (lines) => {
    audio.lineClear(lines.length);
  };

  game.onMove = () => { audio.move(); };
  game.onRotate = () => { audio.rotate(); };
  game.onDrop = () => { audio.drop(); };
  game.onHold = () => { audio.hold(); };

  // Initial render
  renderer.renderGame(game);
  opponentRenderer.clear();
  updateUI();
  updatePreviews();
}

function startGame() {
  running = true;
  input.enable();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (!running) return;

  const dt = timestamp - lastTime;
  lastTime = timestamp;

  input.update(dt);
  game.update(dt);

  renderer.renderGame(game);
  updateUI();
  updatePreviews();

  requestAnimationFrame(gameLoop);
}

function updateUI() {
  ui.updateScore(game.score);
  ui.updateLevel(game.level);
  ui.updateLines(game.lines);
  ui.updatePendingGarbage(game.pendingGarbage);
}

function updatePreviews() {
  for (let i = 0; i < 3; i++) {
    renderer.drawPreview(ui.elements.nextPreviews[i], game.nextPieces[i]);
  }
  if (game.holdPiece) {
    ui.elements.holdPreview.classList.remove('empty');
    renderer.drawPreview(ui.elements.holdPreview, game.holdPiece);
  } else {
    const ctx = ui.elements.holdPreview.getContext('2d');
    ui.elements.holdPreview.width = 80;
    ui.elements.holdPreview.height = 60;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 80, 60);
    ui.elements.holdPreview.classList.add('empty');
  }
}

function requestRematch() {
  mp.playAgain();
  ui.showRematchWaiting();
}

function backToMenu() {
  running = false;
  if (input) input.disable();
  mp.cancelMatch();
  ui.elements.rematchBtn.disabled = false;
  ui.showScreen('menu');
}

init();
