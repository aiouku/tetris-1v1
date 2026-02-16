import { COLS, ROWS, HIDDEN_ROWS, TOTAL_ROWS, CELL_SIZE, CELL_SIZE_SMALL, PIECES } from './constants.js';

export class Renderer {
  constructor(canvas, isSmall = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = isSmall ? CELL_SIZE_SMALL : CELL_SIZE;
    this.isSmall = isSmall;
    canvas.width = COLS * this.cellSize;
    canvas.height = ROWS * this.cellSize;
  }

  clear() {
    this.ctx.fillStyle = '#141414';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
  }

  drawGrid() {
    this.ctx.strokeStyle = '#222222';
    this.ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, ROWS * this.cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(COLS * this.cellSize, y * this.cellSize);
      this.ctx.stroke();
    }
  }

  drawCell(x, y, color, alpha = 1) {
    const cs = this.cellSize;
    const px = x * cs;
    const py = (y - HIDDEN_ROWS) * cs;
    if (py < 0) return;

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);

    // Highlight
    if (!this.isSmall) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
      this.ctx.fillRect(px + 1, py + 1, cs - 2, 3);
      this.ctx.fillRect(px + 1, py + 1, 3, cs - 2);
    }
    this.ctx.globalAlpha = 1;
  }

  drawBoard(board) {
    for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) {
          this.drawCell(x, y, board[y][x]);
        }
      }
    }
  }

  drawPiece(shape, px, py, color, alpha = 1) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          this.drawCell(px + x, py + y, color, alpha);
        }
      }
    }
  }

  drawGhost(shape, px, py, color) {
    const cs = this.cellSize;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const sx = (px + x) * cs;
        const sy = (py + y - HIDDEN_ROWS) * cs;
        if (sy < 0) continue;
        this.ctx.globalAlpha = 0.25;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(sx + 1, sy + 1, cs - 2, cs - 2);
        this.ctx.globalAlpha = 0.7;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(sx + 2, sy + 2, cs - 4, cs - 4);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  drawLineClearAnim(clearedLines, progress) {
    const cs = this.cellSize;
    for (const ly of clearedLines) {
      const sy = (ly - HIDDEN_ROWS) * cs;
      if (sy < 0) continue;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress})`;
      this.ctx.fillRect(0, sy, COLS * cs, cs);
    }
  }

  renderGame(game) {
    this.clear();
    this.drawBoard(game.board);

    if (game.current && !game.gameOver) {
      // Ghost
      const ghostY = game.getGhostY();
      this.drawGhost(game.current, game.currentX, ghostY, PIECES[game.currentType].color);
      // Current piece
      this.drawPiece(game.current, game.currentX, game.currentY, PIECES[game.currentType].color);
    }

    // Line clear animation
    if (game.clearedLines.length > 0 && game.clearAnimTimer > 0) {
      const progress = 1 - game.clearAnimTimer / game.clearAnimDuration;
      this.drawLineClearAnim(game.clearedLines, progress);
    }
  }

  renderOpponentBoard(board) {
    this.clear();
    if (!board) return;
    for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y] && board[y][x]) {
          this.drawCell(x, y, board[y][x]);
        }
      }
    }
  }

  drawPreview(canvas, pieceType) {
    const ctx = canvas.getContext('2d');
    const shape = PIECES[pieceType].shape;
    const color = PIECES[pieceType].color;
    const cs = 20;
    canvas.width = shape[0].length * cs;
    canvas.height = shape.length * cs;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          ctx.fillStyle = color;
          ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, 2);
          ctx.fillRect(x * cs + 1, y * cs + 1, 2, cs - 2);
        }
      }
    }
  }
}
