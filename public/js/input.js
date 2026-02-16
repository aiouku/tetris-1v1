import { DAS_DELAY, DAS_INTERVAL } from './constants.js';

export class InputHandler {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.dasTimers = {};
    this.dasActive = {};
    this.actions = {
      'ArrowLeft': () => this.game.moveLeft(),
      'ArrowRight': () => this.game.moveRight(),
      'ArrowDown': () => this.game.moveDown(),
      'ArrowUp': () => this.game.rotate(1),
      'KeyZ': () => this.game.rotate(-1),
      'KeyX': () => this.game.rotate(1),
      'Space': () => this.game.hardDrop(),
      'ShiftLeft': () => this.game.hold(),
      'ShiftRight': () => this.game.hold(),
      'KeyC': () => this.game.hold(),
      // WASD
      'KeyA': () => this.game.moveLeft(),
      'KeyD': () => this.game.moveRight(),
      'KeyS': () => this.game.moveDown(),
      'KeyW': () => this.game.rotate(1),
    };
    this.dasKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'KeyA', 'KeyD', 'KeyS']);
    this.enabled = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  enable() {
    this.enabled = true;
    this.keys = {};
    this.dasTimers = {};
    this.dasActive = {};
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  disable() {
    this.enabled = false;
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    if (!this.enabled) return;
    const code = e.code;
    if (this.actions[code]) {
      e.preventDefault();
      if (!this.keys[code]) {
        this.keys[code] = true;
        this.actions[code]();
        if (this.dasKeys.has(code)) {
          this.dasTimers[code] = 0;
          this.dasActive[code] = false;
        }
      }
    }
  }

  _onKeyUp(e) {
    const code = e.code;
    if (this.keys[code]) {
      this.keys[code] = false;
      delete this.dasTimers[code];
      delete this.dasActive[code];
    }
  }

  update(dt) {
    if (!this.enabled) return;
    for (const code of this.dasKeys) {
      if (!this.keys[code]) continue;
      this.dasTimers[code] = (this.dasTimers[code] || 0) + dt;
      if (!this.dasActive[code]) {
        if (this.dasTimers[code] >= DAS_DELAY) {
          this.dasActive[code] = true;
          this.dasTimers[code] = 0;
          this.actions[code]();
        }
      } else {
        if (this.dasTimers[code] >= DAS_INTERVAL) {
          this.dasTimers[code] = 0;
          this.actions[code]();
        }
      }
    }
  }
}
