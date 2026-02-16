export class UI {
  constructor() {
    this.screens = {
      menu: document.getElementById('menu-screen'),
      game: document.getElementById('game-screen'),
      result: document.getElementById('result-screen'),
    };
    this.elements = {
      nameInput: document.getElementById('name-input'),
      playBtn: document.getElementById('play-btn'),
      myName: document.getElementById('my-name'),
      opponentName: document.getElementById('opponent-name'),
      score: document.getElementById('score'),
      level: document.getElementById('level'),
      linesCount: document.getElementById('lines-count'),
      nextPreviews: [
        document.getElementById('next-0'),
        document.getElementById('next-1'),
        document.getElementById('next-2'),
      ],
      holdPreview: document.getElementById('hold-preview'),
      opponentCanvas: document.getElementById('opponent-canvas'),
      countdown: document.getElementById('countdown-overlay'),
      countdownText: document.getElementById('countdown-text'),
      resultTitle: document.getElementById('result-title'),
      resultMessage: document.getElementById('result-message'),
      rematchBtn: document.getElementById('rematch-btn'),
      menuBtn: document.getElementById('menu-btn'),
      rematchStatus: document.getElementById('rematch-status'),
      waitingOverlay: document.getElementById('waiting-overlay'),
      pendingGarbage: document.getElementById('pending-garbage'),
    };
  }

  showScreen(name) {
    for (const [key, el] of Object.entries(this.screens)) {
      el.classList.toggle('hidden', key !== name);
    }
  }

  updateScore(score) {
    this.elements.score.textContent = score;
  }

  updateLevel(level) {
    this.elements.level.textContent = level;
  }

  updateLines(lines) {
    this.elements.linesCount.textContent = lines;
  }

  updatePendingGarbage(count) {
    const bar = this.elements.pendingGarbage;
    bar.style.height = `${Math.min(count, 20) * 30}px`;
    bar.style.display = count > 0 ? 'block' : 'none';
  }

  showCountdown(text) {
    this.elements.countdown.classList.remove('hidden');
    this.elements.countdownText.textContent = text;
  }

  hideCountdown() {
    this.elements.countdown.classList.add('hidden');
  }

  showWaiting() {
    this.elements.waitingOverlay.classList.remove('hidden');
  }

  hideWaiting() {
    this.elements.waitingOverlay.classList.add('hidden');
  }

  setPlayerNames(myName, opponentName) {
    this.elements.myName.textContent = myName;
    this.elements.opponentName.textContent = opponentName;
  }

  showResult(won, winnerName) {
    this.showScreen('result');
    if (winnerName) {
      this.elements.resultTitle.textContent = won ? 'YOU WIN!' : 'YOU LOSE';
      this.elements.resultMessage.textContent = `${winnerName} の勝ち！`;
    } else {
      this.elements.resultTitle.textContent = won ? 'YOU WIN!' : 'YOU LOSE';
      this.elements.resultMessage.textContent = '';
    }
    this.elements.resultTitle.className = won ? 'result-win' : 'result-lose';
    this.elements.rematchStatus.textContent = '';
  }

  showRematchWaiting() {
    this.elements.rematchStatus.textContent = 'Waiting for opponent...';
  }

  showOpponentWantsRematch() {
    this.elements.rematchStatus.textContent = 'Opponent wants a rematch!';
  }
}
