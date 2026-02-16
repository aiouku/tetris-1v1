export class Multiplayer {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.handlers = {};
  }

  connect() {
    return new Promise((resolve) => {
      this.socket = io();
      this.socket.on('connect', () => {
        this.connected = true;
        resolve();
      });

      // Register event forwarding
      const events = [
        'waiting', 'match_found', 'countdown', 'game_start',
        'opponent_board', 'receive_attack', 'game_result',
        'opponent_wants_rematch', 'opponent_disconnected'
      ];
      for (const event of events) {
        this.socket.on(event, (data) => {
          if (this.handlers[event]) this.handlers[event](data);
        });
      }
    });
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  findMatch(name) {
    this.socket.emit('find_match', name);
  }

  sendBoardUpdate(board) {
    this.socket.emit('board_update', board);
  }

  sendAttack(lines) {
    this.socket.emit('attack', lines);
  }

  sendGameOver() {
    this.socket.emit('game_over');
  }

  playAgain() {
    this.socket.emit('play_again');
  }

  cancelMatch() {
    this.socket.emit('cancel_match');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}
