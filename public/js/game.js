import { COLS, ROWS, HIDDEN_ROWS, TOTAL_ROWS, PIECES, PIECE_NAMES, GRAVITY, LOCK_DELAY, MAX_LOCK_RESETS, ATTACK_TABLE, getKickData } from './constants.js';

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.bag = [];
    this.nextPieces = [];
    this.current = null;
    this.currentX = 0;
    this.currentY = 0;
    this.currentRotation = 0;
    this.currentType = '';
    this.holdPiece = null;
    this.holdCount = 0;
    this.maxHolds = 2;
    this.gameOver = false;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.locking = false;
    this.lockResets = 0;
    this.pendingGarbage = 0;
    this.clearedLines = [];
    this.clearAnimTimer = 0;
    this.clearAnimDuration = 300;
    this.onAttack = null;
    this.onBoardUpdate = null;
    this.onGameOver = null;
    this.onMove = null;
    this.onRotate = null;
    this.onDrop = null;
    this.onHold = null;
    this.onLinesClear = null;

    // Fill next pieces
    for (let i = 0; i < 3; i++) {
      this.nextPieces.push(this.drawPiece());
    }
    this.spawnPiece();
  }

  drawPiece() {
    if (this.bag.length === 0) {
      this.bag = [...PIECE_NAMES];
      // Fisher-Yates shuffle
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  spawnPiece() {
    this.currentType = this.nextPieces.shift();
    this.nextPieces.push(this.drawPiece());
    this.current = PIECES[this.currentType].shape.map(r => [...r]);
    this.currentRotation = 0;
    this.currentX = Math.floor((COLS - this.current[0].length) / 2);
    this.currentY = 0;
    this.holdCount = 0;
    this.locking = false;
    this.lockTimer = 0;
    this.lockResets = 0;

    if (this.collides(this.current, this.currentX, this.currentY)) {
      this.gameOver = true;
      if (this.onGameOver) this.onGameOver();
    }
  }

  hold() {
    if (this.holdCount >= this.maxHolds) return;
    this.holdCount++;
    if (this.onHold) this.onHold();
    const prevHold = this.holdPiece;
    this.holdPiece = this.currentType;

    if (prevHold) {
      // Swap: use the held piece directly (no spawnPiece, no holdCount reset)
      this.currentType = prevHold;
      this.current = PIECES[this.currentType].shape.map(r => [...r]);
      this.currentRotation = 0;
      this.currentX = Math.floor((COLS - this.current[0].length) / 2);
      this.currentY = 0;
      this.locking = false;
      this.lockTimer = 0;
      this.lockResets = 0;
    } else {
      // No held piece yet: draw from next
      this.spawnPiece();
    }
  }

  collides(shape, px, py) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const bx = px + x;
        const by = py + y;
        if (bx < 0 || bx >= COLS || by >= TOTAL_ROWS) return true;
        if (by >= 0 && this.board[by][bx]) return true;
      }
    }
    return false;
  }

  rotate(dir) {
    if (this.currentType === 'O') return;
    const from = this.currentRotation;
    const to = (from + dir + 4) % 4;
    const rotated = this.rotateMatrix(this.current, dir);
    const kicks = getKickData(this.currentType, from, to);

    for (const [dx, dy] of kicks) {
      if (!this.collides(rotated, this.currentX + dx, this.currentY - dy)) {
        this.current = rotated;
        this.currentX += dx;
        this.currentY -= dy;
        this.currentRotation = to;
        this.resetLock();
        if (this.onRotate) this.onRotate();
        return;
      }
    }
  }

  rotateMatrix(matrix, dir) {
    const n = matrix.length;
    const result = Array.from({ length: n }, () => Array(n).fill(0));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (dir === 1) {
          result[x][n - 1 - y] = matrix[y][x];
        } else {
          result[n - 1 - x][y] = matrix[y][x];
        }
      }
    }
    return result;
  }

  moveLeft() {
    if (!this.collides(this.current, this.currentX - 1, this.currentY)) {
      this.currentX--;
      this.resetLock();
      if (this.onMove) this.onMove();
      return true;
    }
    return false;
  }

  moveRight() {
    if (!this.collides(this.current, this.currentX + 1, this.currentY)) {
      this.currentX++;
      this.resetLock();
      if (this.onMove) this.onMove();
      return true;
    }
    return false;
  }

  moveDown() {
    if (!this.collides(this.current, this.currentX, this.currentY + 1)) {
      this.currentY++;
      this.dropTimer = 0;
      return true;
    }
    return false;
  }

  hardDrop() {
    let dropped = 0;
    while (!this.collides(this.current, this.currentX, this.currentY + 1)) {
      this.currentY++;
      dropped++;
    }
    this.score += dropped * 2;
    if (this.onDrop) this.onDrop();
    this.lockPiece();
  }

  getGhostY() {
    let gy = this.currentY;
    while (!this.collides(this.current, this.currentX, gy + 1)) {
      gy++;
    }
    return gy;
  }

  resetLock() {
    if (this.locking && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  lockPiece() {
    // Place piece on board
    for (let y = 0; y < this.current.length; y++) {
      for (let x = 0; x < this.current[y].length; x++) {
        if (!this.current[y][x]) continue;
        const by = this.currentY + y;
        const bx = this.currentX + x;
        if (by >= 0 && by < TOTAL_ROWS && bx >= 0 && bx < COLS) {
          this.board[by][bx] = PIECES[this.currentType].color;
        }
      }
    }

    // Check for line clears
    const cleared = [];
    for (let y = 0; y < TOTAL_ROWS; y++) {
      if (this.board[y].every(cell => cell !== null)) {
        cleared.push(y);
      }
    }

    if (cleared.length > 0) {
      this.clearedLines = cleared;
      this.clearAnimTimer = this.clearAnimDuration;
      if (this.onLinesClear) this.onLinesClear(cleared);
    } else {
      // Add pending garbage immediately if no lines cleared
      this.addGarbage();
      this.spawnPiece();
      if (this.onBoardUpdate) this.onBoardUpdate(this.getBoardSnapshot());
    }

    // Send attack
    if (cleared.length > 0) {
      const attack = ATTACK_TABLE[cleared.length] || 0;
      // Cancel pending garbage first
      if (attack > 0 && this.pendingGarbage > 0) {
        const cancel = Math.min(attack, this.pendingGarbage);
        this.pendingGarbage -= cancel;
        const remaining = attack - cancel;
        if (remaining > 0 && this.onAttack) {
          this.onAttack(remaining);
        }
      } else if (attack > 0 && this.onAttack) {
        this.onAttack(attack);
      }

      this.lines += cleared.length;
      this.score += [0, 100, 300, 500, 800][cleared.length] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
    }
  }

  finishLineClear() {
    // Remove cleared lines
    for (const y of this.clearedLines.sort((a, b) => b - a)) {
      this.board.splice(y, 1);
      this.board.unshift(Array(COLS).fill(null));
    }
    this.clearedLines = [];
    this.clearAnimTimer = 0;

    // Add pending garbage after lines removed
    this.addGarbage();
    this.spawnPiece();
    if (this.onBoardUpdate) this.onBoardUpdate(this.getBoardSnapshot());
  }

  addGarbage() {
    if (this.pendingGarbage <= 0) return;
    const count = this.pendingGarbage;
    this.pendingGarbage = 0;
    const hole = Math.floor(Math.random() * COLS);

    for (let i = 0; i < count; i++) {
      this.board.shift();
      const row = Array(COLS).fill('#888888');
      row[hole] = null;
      this.board.push(row);
    }

    // Check if current piece now overlaps
    if (this.current && this.collides(this.current, this.currentX, this.currentY)) {
      // Push piece up
      while (this.currentY > 0 && this.collides(this.current, this.currentX, this.currentY)) {
        this.currentY--;
      }
      if (this.collides(this.current, this.currentX, this.currentY)) {
        this.gameOver = true;
        if (this.onGameOver) this.onGameOver();
      }
    }
  }

  receiveGarbage(count) {
    this.pendingGarbage += count;
  }

  getBoardSnapshot() {
    // Return board with current piece placed (for sending to opponent)
    const snapshot = this.board.map(r => [...r]);
    if (this.current) {
      for (let y = 0; y < this.current.length; y++) {
        for (let x = 0; x < this.current[y].length; x++) {
          if (!this.current[y][x]) continue;
          const by = this.currentY + y;
          const bx = this.currentX + x;
          if (by >= 0 && by < TOTAL_ROWS && bx >= 0 && bx < COLS) {
            snapshot[by][bx] = PIECES[this.currentType].color;
          }
        }
      }
    }
    return snapshot;
  }

  update(dt) {
    if (this.gameOver) return;

    // Line clear animation
    if (this.clearAnimTimer > 0) {
      this.clearAnimTimer -= dt;
      if (this.clearAnimTimer <= 0) {
        this.finishLineClear();
      }
      return;
    }

    // Gravity
    const speed = GRAVITY[Math.min(this.level - 1, GRAVITY.length - 1)];
    this.dropTimer += dt;
    if (this.dropTimer >= speed) {
      this.dropTimer = 0;
      if (!this.moveDown()) {
        // Start lock delay
        if (!this.locking) {
          this.locking = true;
          this.lockTimer = 0;
        }
      }
    }

    // Lock delay
    if (this.locking) {
      // Check if piece is still on ground
      if (!this.collides(this.current, this.currentX, this.currentY + 1)) {
        this.locking = false;
        this.lockTimer = 0;
      } else {
        this.lockTimer += dt;
        if (this.lockTimer >= LOCK_DELAY) {
          this.lockPiece();
        }
      }
    }
  }
}
