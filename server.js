const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, 'public')));

// Simple matchmaking
let waitingPlayer = null;
const rooms = new Map(); // socketId -> roomId
const roomData = new Map(); // roomId -> { players: [id1, id2], names: {id: name}, rematch: Set }
const playerNames = new Map(); // socketId -> name

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('find_match', (name) => {
    const playerName = (typeof name === 'string' && name.trim()) ? name.trim().slice(0, 12) : '名無しのごんべえ';
    playerNames.set(socket.id, playerName);

    if (waitingPlayer && waitingPlayer.connected && waitingPlayer.id !== socket.id) {
      // Match found
      const roomId = `room_${Date.now()}`;
      const opponent = waitingPlayer;
      waitingPlayer = null;

      socket.join(roomId);
      opponent.join(roomId);
      rooms.set(socket.id, roomId);
      rooms.set(opponent.id, roomId);
      const names = {};
      names[opponent.id] = playerNames.get(opponent.id) || '名無しのごんべえ';
      names[socket.id] = playerName;
      roomData.set(roomId, {
        players: [opponent.id, socket.id],
        names,
        rematch: new Set()
      });

      // Send match_found with opponent name to each player
      socket.emit('match_found', { opponentName: names[opponent.id] });
      opponent.emit('match_found', { opponentName: names[socket.id] });

      // Countdown 3-2-1-GO
      let count = 3;
      const interval = setInterval(() => {
        if (count > 0) {
          io.to(roomId).emit('countdown', count);
          count--;
        } else {
          clearInterval(interval);
          io.to(roomId).emit('game_start');
        }
      }, 1000);
    } else {
      waitingPlayer = socket;
      socket.emit('waiting');
    }
  });

  socket.on('board_update', (board) => {
    const roomId = rooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('opponent_board', board);
    }
  });

  socket.on('attack', (lines) => {
    const roomId = rooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('receive_attack', lines);
    }
  });

  socket.on('game_over', () => {
    const roomId = rooms.get(socket.id);
    if (!roomId) return;
    const room = roomData.get(roomId);
    if (!room) return;

    // The player who sent game_over lost
    const names = room.names || {};
    const winnerId = room.players.find(id => id !== socket.id);
    const winnerName = names[winnerId] || '名無しのごんべえ';
    const loserName = names[socket.id] || '名無しのごんべえ';
    socket.emit('game_result', { won: false, winnerName });
    socket.to(roomId).emit('game_result', { won: true, winnerName });
  });

  socket.on('play_again', () => {
    const roomId = rooms.get(socket.id);
    if (!roomId) return;
    const room = roomData.get(roomId);
    if (!room) return;

    room.rematch.add(socket.id);
    socket.to(roomId).emit('opponent_wants_rematch');

    // Both want rematch
    if (room.rematch.size === 2) {
      room.rematch.clear();
      let count = 3;
      const interval = setInterval(() => {
        if (count > 0) {
          io.to(roomId).emit('countdown', count);
          count--;
        } else {
          clearInterval(interval);
          io.to(roomId).emit('game_start');
        }
      }, 1000);
    }
  });

  socket.on('cancel_match', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    leaveRoom(socket);
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    const roomId = rooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('opponent_disconnected');
      leaveRoom(socket);
    }
  });
});

function leaveRoom(socket) {
  const roomId = rooms.get(socket.id);
  if (!roomId) return;

  const room = roomData.get(roomId);
  if (room) {
    for (const pid of room.players) {
      rooms.delete(pid);
    }
    roomData.delete(roomId);
  }
  rooms.delete(socket.id);
  socket.leave(roomId);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Tetris server running on http://localhost:${PORT}`);
});
