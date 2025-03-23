const { getRandomWord, validateWord } = require('./GameLogic.js');
const { createRoom, deleteRoom, rooms } = require('./RoomManager.js');

const disconnectedPlayers = {};

function setupSocketHandlers(io, socket, rooms, playerSockets) {
  // Send socket ID to client - update to send playerId instead
  socket.emit('socketId', { id: socket.id, playerId: socket.playerId });

  // Create a room
  socket.on('createRoom', (data) => {
    const randomWord = getRandomWord();
    const { roomId, roomName, gameMode } = createRoom(socket, data, randomWord);
    
    // Join the room after creating it
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerPosition = 'player1'; // Creator is always player1
    
    console.log(`${socket.playerId} created and joined room ${roomId} as player1 with word`);
    
    // Emit both events to ensure client gets proper redirection
    socket.emit('roomCreated', { roomId, roomName, gameMode });
    socket.emit('joinedRoom', { roomId, position: 'player1', gameMode });
    
    io.emit('roomListUpdated');
  });

  socket.on('deleteRoom', (roomId) => {
    if (deleteRoom(socket, roomId, io)) {
      io.emit('roomListUpdated');
    } else {
      socket.emit('deleteRoomFailed', { message: 'Only the room creator can delete the room' });
    }
  });

  // Join a room
  socket.on('joinRoom', (roomId) => {
    console.log(`${socket.playerId} wants to join room ${roomId}`);
    if (!rooms[roomId]) {
      console.log(`Room ${roomId} not found!`);
      socket.emit('roomNotFound', { message: 'Room does not exist' });
      return;
    }
  
    const room = rooms[roomId];
    console.log(`Room ${roomId} found. Current players: player1=${room.player1}, player2=${room.player2}`);
    
    // Make sure we're using the correct gameMode property
    const gameMode = room.gameMode || room.settings.gameMode || 'standard';
    
    // If this player is the creator and already player1
    if (room.creator === socket.playerId && room.player1 === socket.playerId) {
      console.log(`${socket.playerId} is rejoining as creator and player1`);
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerPosition = 'player1';
      socket.emit('joinedRoom', { roomId, position: 'player1', gameMode });
      return;
    }
    
    // If this player is already player2
    if (room.player2 === socket.playerId) {
      console.log(`${socket.playerId} is rejoining as player2`);
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerPosition = 'player2';
      socket.emit('joinedRoom', { roomId, position: 'player2', gameMode });
      return;
    }
    
    // If player1 slot is empty (shouldn't happen with our fix, but just in case)
    if (!room.player1) {
      console.log(`Assigning ${socket.playerId} as player1`);
      room.player1 = socket.playerId;
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerPosition = 'player1';
      socket.emit('joinedRoom', { roomId, position: 'player1', gameMode });
    } 
    // If player2 slot is empty, this must be a new player joining
    else if (!room.player2) {
      console.log(`Assigning ${socket.playerId} as player2`);
      room.player2 = socket.playerId;
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerPosition = 'player2';
      socket.emit('joinedRoom', { roomId, position: 'player2', gameMode });
  
      // Both players are here, start the game
      if (room.player1 && room.player2) {
        console.log(`Starting game in room ${roomId} with word: ${room.givenWord}`);
        console.log(`Players: player1=${room.player1}, player2=${room.player2}`);
        
        // First send the word to both players
        io.to(roomId).emit('gameData', { givenWord: room.givenWord });
        
        // Then after a short delay, send the start game signal
        setTimeout(() => {
          io.to(roomId).emit('startGame', { message: 'Game starting!' });
        }, 500);
      }
    } else {
      console.log(`Room ${roomId} is full. Cannot add ${socket.playerId}`);
      socket.emit('roomFull', { message: 'Room is full' });
    }
  });

  // Send room list
  socket.on('getRoomList', () => {
    const roomList = Object.entries(rooms).map(([id, room]) => {
      const connectedPlayers = [room.player1, room.player2].filter(player => player !== null).length;
      return {
        id,
        name: room.name,
        players: connectedPlayers,
        maxPlayers: room.settings.maxPlayers,
        status: connectedPlayers < room.settings.maxPlayers ? 'Open' : 'Full',
        isCreator: room.creator === socket.playerId,
        gameMode: room.gameMode // Include gameMode
      };
    });
    socket.emit('roomList', roomList);
  });

  socket.on('disconnect', () => {
    console.log(`Player ${socket.playerId} disconnected`);
    delete playerSockets[socket.playerId]; // Clean up

    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      if (rooms[roomId].player1 === socket.playerId) {
        rooms[roomId].player1 = null;
      } else if (rooms[roomId].player2 === socket.playerId) {
        rooms[roomId].player2 = null;
      }
      // Store disconnected player info
      disconnectedPlayers[socket.playerId] = { 
        roomId, 
        timestamp: Date.now(), 
        position: socket.playerPosition 
      };
      setTimeout(() => {
        if (disconnectedPlayers[socket.playerId]) {
          delete disconnectedPlayers[socket.playerId];
          if (rooms[roomId] && (!rooms[roomId].player1 || !rooms[roomId].player2)) {
            io.to(roomId).emit('gameAbandoned', { message: 'Opponent did not reconnect in time.' });
          }
        }
      }, 30000); // 30 seconds
      if (!rooms[roomId].player1 || !rooms[roomId].player2) {
        io.to(roomId).emit('playerDisconnected', { message: 'Opponent disconnected, waiting for reconnection...' });
      }
    }
  });
  
  // Handle word submission and damage dealing
  socket.on('submitWord', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const word = data.word.toLowerCase();
    const givenWord = rooms[roomId].givenWord;
    const multiplier = data.multiplier || 1;
    const position = socket.playerPosition;

    const result = validateWord(givenWord, word, rooms[roomId].usedWords[position]);
    if (result.valid) {
      rooms[roomId].usedWords[position].add(word);
      let damage = result.damage;
      damage = Math.floor(damage * multiplier);

      socket.emit('wordResult', { valid: true, word, damage, increaseMultiplier: true });

      const opponentId = position === 'player1' ? rooms[roomId].player2 : rooms[roomId].player1;
      const opponentSocket = playerSockets[opponentId];
      if (opponentSocket) {
        opponentSocket.emit('opponentWordSuccess', { damage, word });
      }
    } else {
      socket.emit('wordResult', result);
    }
  });

  // Add new handler for hit confirmation
  socket.on('fireballHit', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    const room = rooms[roomId];
    
    // Update HP values in the room state
    if (!room.hp) {
      room.hp = { player1: 100, player2: 100 };
    }
    
    if (data.targetIsPlayer) {
      // The player was hit
      if (socket.playerPosition === 'player1') {
        room.hp.player1 = Math.max(0, room.hp.player1 - data.damage);
      } else {
        room.hp.player2 = Math.max(0, room.hp.player2 - data.damage);
      }
    } else {
      // The opponent was hit
      if (socket.playerPosition === 'player1') {
        room.hp.player2 = Math.max(0, room.hp.player2 - data.damage);
      } else {
        room.hp.player1 = Math.max(0, room.hp.player1 - data.damage);
      }
    }
    
    // Send updated HP to both players
    io.to(roomId).emit('updateHP', {
      hp: room.hp
    });
    
    // Check for game end
    if (room.hp.player1 <= 0 || room.hp.player2 <= 0) {
      const winner = room.hp.player1 <= 0 ? room.player2 : room.player1;
      io.to(roomId).emit('gameEnded', { winner });
    }
  });

  socket.on('wordSuccess', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    // Get opponent socket id
    let opponentId;
    if (rooms[roomId].player1 === socket.id) {
      opponentId = rooms[roomId].player2;
    } else {
      opponentId = rooms[roomId].player1;
    }
    
    // Send fireball data to opponent
    if (opponentId) {
      io.to(opponentId).emit('opponentWordSuccess', {
        damage: data.damage,
        // No need to send positions as they'll be calculated on the opponent's side
      });
    }
  });

  socket.on('leaveRoom', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
        // Remove player from room
        if (rooms[roomId].player1 === socket.playerId) {
            rooms[roomId].player1 = null;
        } else if (rooms[roomId].player2 === socket.playerId) {
            rooms[roomId].player2 = null;
        }
        
        // Leave the socket.io room
        socket.leave(roomId);
        
        // Notify other player if present
        if (rooms[roomId].player1 || rooms[roomId].player2) {
            io.to(roomId).emit('playerLeft', { message: 'Opponent has left the game.' });
        }
        
        // Clean up empty rooms
        if (!rooms[roomId].player1 && !rooms[roomId].player2) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted because it's empty`);
        }
        
        // Clear room ID from socket
        socket.roomId = null;
        socket.playerPosition = null;
        
        // Update room list for all clients
        io.emit('roomListUpdated');
    }
  });

  socket.on('returnToLobby', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
        // Remove player from room
        if (rooms[roomId].player1 === socket.playerId) {
            rooms[roomId].player1 = null;
        } else if (rooms[roomId].player2 === socket.playerId) {
            rooms[roomId].player2 = null;
        }
        
        // Leave the socket.io room
        socket.leave(roomId);
        
        // Notify other player if present
        if (rooms[roomId].player1 || rooms[roomId].player2) {
            io.to(roomId).emit('playerLeft', { message: 'Opponent has left the game.' });
        }
        
        // Clean up empty rooms
        if (!rooms[roomId].player1 && !rooms[roomId].player2) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted because it's empty`);
        }
        
        // Clear room ID from socket
        socket.roomId = null;
        socket.playerPosition = null;
        
        // Update room list for all clients
        io.emit('roomListUpdated');
    }
  });

  // Handle game stats request
  socket.on('requestGameStats', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    const room = rooms[roomId];
    
    // Check if both players are present
    if (!room.player1 || !room.player2) return;
    
    const player1Id = room.player1;
    const player2Id = room.player2;
    
    // Get words used by each player (use player1 and player2 as keys)
    const player1Words = Array.from(room.usedWords.player1 || []);
    const player2Words = Array.from(room.usedWords.player2 || []);
    
    // Find unique and common words
    const player1UniqueWords = player1Words.filter(word => !room.usedWords.player2.has(word));
    const player2UniqueWords = player2Words.filter(word => !room.usedWords.player1.has(word));
    const commonWords = player1Words.filter(word => room.usedWords.player2.has(word));
    
    // Calculate damage for each word
    const player1UniqueWithDamage = player1UniqueWords.map(word => ({
      word,
      damage: calculateDamage(room.givenWord, word)
    })).sort((a, b) => b.damage - a.damage);
    
    const player2UniqueWithDamage = player2UniqueWords.map(word => ({
      word,
      damage: calculateDamage(room.givenWord, word)
    })).sort((a, b) => b.damage - a.damage);
    
    const commonWordsWithDamage = commonWords.map(word => ({
      word,
      damage: calculateDamage(room.givenWord, word)
    }));
    
    // Send stats to the requesting player
    if (socket.id === player1Id) {
      socket.emit('gameStats', {
        yourUniqueWords: player1UniqueWithDamage,
        opponentUniqueWords: player2UniqueWithDamage,
        commonWords: commonWordsWithDamage
      });
    } else {
      socket.emit('gameStats', {
        yourUniqueWords: player2UniqueWithDamage,
        opponentUniqueWords: player1UniqueWithDamage,
        commonWords: commonWordsWithDamage
      });
    }
  });

  socket.on('requestGameState', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    const room = rooms[roomId];
    socket.emit('gameState', {
        givenWord: room.givenWord,
        hp: room.hp
    });
  });
  
  // Handle game restart request
  socket.on('restartGame', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    // Reset room data
    rooms[roomId].givenWord = getRandomWord();
    rooms[roomId].hp = { player1: 100, player2: 100 };
    rooms[roomId].usedWords = { player1: new Set(), player2: new Set() };
    
    console.log(`Restarting game in room ${roomId} with word: ${rooms[roomId].givenWord}`);
    
    // Immediately send restart event with the new word
    io.to(roomId).emit('gameRestarted', { 
        message: 'Game restarted!',
        givenWord: rooms[roomId].givenWord 
    });
  });
}

module.exports = { setupSocketHandlers }