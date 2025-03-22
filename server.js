const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { createRoom, deleteRoom, rooms } = require('./public/js/roomManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const fs = require('fs');
const path = require('path');

app.use(express.static('public'));// comment out 

const playerSockets = {}; // Map to track playerId -> socket

let russianNouns = new Set();

// Load Russian nouns dictionary
function loadDictionary() {
  try {
    // You'll need to create this file with Russian nouns
    const dictionaryPath = path.join(__dirname, 'russian_nouns.txt');
    const data = fs.readFileSync(dictionaryPath, 'utf8');
    russianNouns = new Set(data.split('\n').map(word => word.trim().toLowerCase()));
    console.log(`Loaded ${russianNouns.size} Russian nouns`);
    
    prepareWordList();
  } catch (err) {
    console.error('Error loading dictionary:', err);
    // Create an empty set if file doesn't exist yet
    russianNouns = new Set();
  }
}

// Top words for random selection
let topLongestWords = [];

// Prepare list of longest words for random selection
function prepareWordList() {
  const wordsArray = Array.from(russianNouns);
  wordsArray.sort((a, b) => b.length - a.length);
  topLongestWords = wordsArray.slice(0, 300);
  console.log(`Prepared ${topLongestWords.length} longest words for random selection`);
}

// Get random word from top longest words
function getRandomWord() {  
  const randomIndex = Math.floor(Math.random() * topLongestWords.length);
  return topLongestWords[randomIndex];
}

// Load dictionary on server start
loadDictionary();

// Function to validate if the submitted word can be formed from the given word
function canFormWord(givenWord, submittedWord) {
  const givenFreq = {};
  for (let char of givenWord) {
    givenFreq[char] = (givenFreq[char] || 0) + 1;
  }
  const submittedFreq = {};
  for (let char of submittedWord) {
    submittedFreq[char] = (submittedFreq[char] || 0) + 1;
  }
  for (let char in submittedFreq) {
    if (!givenFreq[char] || submittedFreq[char] > givenFreq[char]) {
      return false;
    }
  }
  return true;
}

// Function to check if word exists in Russian dictionary
function isValidRussianNoun(word) {
  return russianNouns.has(word.toLowerCase());
}

const disconnectedPlayers = {}; // { socketId: { roomId, timestamp } }

io.on('connection', (socket) => {
  socket.on('setPlayerId', (playerId) => {
    socket.playerId = playerId; // Attach playerId to the socket
    playerSockets[playerId] = socket; // Store the mapping
    console.log(`Player ${playerId} connected`);
  });

  // Send socket ID to client - update to send playerId instead
  socket.emit('socketId', { id: socket.id, playerId: socket.playerId });
  
  // Create a room
  socket.on('createRoom', (data) => {
    const randomWord = getRandomWord();
    const { roomId, roomName, gameMode } = createRoom(socket, data, randomWord);
    socket.emit('roomCreated', { roomId, roomName, gameMode });
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
        rooms[roomId] = { player1: null, player2: null };
      }
    
      const room = rooms[roomId];
      if (!room.player1) {
        room.player1 = socket.playerId;
        socket.join(roomId);
        socket.roomId = roomId; // Store roomId on socket
        socket.playerPosition = 'player1'; // Store position on socket
        socket.emit('joinedRoom', { roomId, position: 'player1' });
      } else if (!room.player2) {
        room.player2 = socket.playerId;
        socket.join(roomId);
        socket.roomId = roomId; // Store roomId on socket
        socket.playerPosition = 'player2'; // Store position on socket
        socket.emit('joinedRoom', { roomId, position: 'player2' });
        // Both players are here, start the game
        io.to(roomId).emit('startGame', { message: 'Game on!' });
      } else {
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
        isCreator: room.creator === socket.playerId // Use playerId
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

  socket.on('joinRoom', (roomId) => {
    console.log(`${socket.playerId} wants to join room ${roomId}`);
    if (!rooms[roomId]) {
      socket.emit('roomNotFound', { message: 'Room does not exist' });
      return;
    }
  
    const room = rooms[roomId];
    if (room.creator === socket.playerId) {
      // Creator is rejoining; acknowledge their presence without assigning a new slot
      socket.join(roomId);
      socket.roomId = roomId;
      // socket.emit('joinedRoom', { roomId, position: 'creator' });
      return;
    }
  
    if (!room.player1) {
      room.player1 = socket.playerId;
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerPosition = 'player1';
      socket.emit('joinedRoom', { roomId, position: 'player1' });
    } else if (!room.player2) {
      room.player2 = socket.playerId;
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerPosition = 'player2';
      socket.emit('joinedRoom', { roomId, position: 'player2' });

      // Both players are here, start the game
      if (room.player1 && room.player2) {
        io.to(roomId).emit('gameData', { givenWord: room.givenWord });
        setTimeout(() => io.to(roomId).emit('startGame', { message: 'Game starting!' }), 500);
      }
    } else {
      socket.emit('roomFull', { message: 'Room is full' });
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
  
    if (word.length < 3) {
      socket.emit('wordResult', { valid: false, word, reason: 'Word must be at least 3 letters long', resetMultiplier: true });
      return;
    }
    if (word === givenWord.toLowerCase()) {
      socket.emit('wordResult', { valid: false, word, reason: 'Cannot use the original word', resetMultiplier: true });
      return;
    }
    if (rooms[roomId].usedWords[position].has(word)) {
      socket.emit('wordResult', { valid: false, word, reason: 'You already used this word', resetMultiplier: true });
      return;
    }
    if (canFormWord(givenWord, word)) {
      if (isValidRussianNoun(word)) {
        rooms[roomId].usedWords[position].add(word);
        let damage = calculateDamage(givenWord, word);
        damage = Math.floor(damage * multiplier);
        
        // Send word result to player
        socket.emit('wordResult', { valid: true, word, damage, increaseMultiplier: true });
        
        // Find the opponent socket
        const opponentId = socket.playerPosition === 'player1' ? rooms[roomId].player2 : rooms[roomId].player1;
        const opponentSocket = playerSockets[opponentId];

        if (opponentSocket) {
          // Send the fireball data to the opponent
          opponentSocket.emit('opponentWordSuccess', { 
            damage: damage,
            word: word
          });
        }
        
        // Store pending damage in temporary variable
        if (!rooms[roomId].pendingDamage) {
          rooms[roomId].pendingDamage = {};
        }
        
        rooms[roomId].pendingDamage[socket.playerId] = {
          damage: damage,
          opponentPos: position === 'player1' ? 'player2' : 'player1'
        };
      } else {
        socket.emit('wordResult', { valid: false, word, reason: 'Not a valid Russian noun', resetMultiplier: true });
      }
    } else {
      socket.emit('wordResult', { valid: false, word, reason: 'Cannot be formed from given letters', resetMultiplier: true });
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

  socket.on('reconnectToRoom', (roomId) => {
    const dp = Object.values(disconnectedPlayers).find(dp => dp.roomId === roomId);
    if (dp) {
      rooms[roomId][dp.position] = socket.playerId;
      socket.playerPosition = dp.position;
      socket.join(roomId);
      socket.roomId = roomId;
      socket.emit('joinedRoom', { roomId: roomId, position: dp.position });
      delete disconnectedPlayers[socket.playerId];
      if (rooms[roomId].player1 && rooms[roomId].player2) {
        io.to(roomId).emit('playerReconnected', { message: 'Opponent has reconnected!' });
        io.to(roomId).emit('resumeGame', { message: 'Game resuming!' });
      }
    } else {
      socket.emit('reconnectFailed', { message: 'Invalid reconnection attempt.' });
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
});

// Calculate damage based on word length, substring status, and complexity
function calculateDamage(givenWord, submittedWord) {
    // Base damage from word length (exponential scaling)
    let lengthFactor = submittedWord.length;
    
    // Exponential growth for longer words (words > 5 get bonus damage)
    if (submittedWord.length > 5) {
      lengthFactor += Math.pow(submittedWord.length - 5, 1.8);
    }
    
    // Substring penalty: if the word appears directly in the given word, it's easier to find
    const isSubstring = givenWord.toLowerCase().includes(submittedWord.toLowerCase());
    const substringMultiplier = isSubstring ? 0.6 : 1.0;
    
    // Letter diversity factor: using many different letters is harder than repeating the same ones
    const uniqueLetters = new Set(submittedWord.split('')).size;
    const letterDiversityFactor = 0.5 + (uniqueLetters / submittedWord.length) * 0.5;
    
    // Letter position rearrangement complexity:
    // If you use consecutive letters from the original word, it's easier
    const positionComplexity = calculatePositionComplexity(givenWord, submittedWord);
    
    // Rare letters bonus: using less common letters is harder
    const rareLetterBonus = calculateRareLetterBonus(submittedWord);
    
    // Combine all factors
    let damage = lengthFactor * substringMultiplier * letterDiversityFactor * positionComplexity;
    damage += rareLetterBonus;
    
    // Log the damage calculation components for debugging
    console.log(`Damage calculation for "${submittedWord}":
      - Length factor: ${lengthFactor}
      - Substring multiplier: ${substringMultiplier}
      - Letter diversity: ${letterDiversityFactor}
      - Position complexity: ${positionComplexity}
      - Rare letter bonus: ${rareLetterBonus}
      - Final damage: ${Math.max(1, Math.round(damage, 2))}
    `);
    
    return Math.max(1, Math.round(damage, 2));
  }
  
  // Calculate position complexity
  function calculatePositionComplexity(givenWord, submittedWord) {
    // Default complexity factor
    let complexity = 1.0;
    
    // First, check if letters are used in a different order than the original word
    // Create a mapping of original word letter positions
    const letterPositions = {};
    for (let i = 0; i < givenWord.length; i++) {
      const char = givenWord[i].toLowerCase();
      if (!letterPositions[char]) {
        letterPositions[char] = [];
      }
      letterPositions[char].push(i);
    }
    
    // Track the positions used in the submitted word
    let lastUsedPosition = -1;
    let positionJumps = 0;
    
    // Go through submitted word and check position patterns
    for (let i = 0; i < submittedWord.length; i++) {
      const char = submittedWord[i].toLowerCase();
      if (letterPositions[char] && letterPositions[char].length > 0) {
        // For each letter, find the closest position to the last used position
        let closestPosition = -1;
        let minDistance = Infinity;
        
        for (const pos of letterPositions[char]) {
          if (lastUsedPosition === -1) {
            // First letter, just use first occurrence
            closestPosition = pos;
            break;
          } else {
            const distance = Math.abs(pos - lastUsedPosition);
            if (distance < minDistance) {
              minDistance = distance;
              closestPosition = pos;
            }
          }
        }
        
        // If we used a position, update state
        if (closestPosition !== -1) {
          // If we jumped more than 1 position, count it as a complexity increase
          if (lastUsedPosition !== -1 && Math.abs(closestPosition - lastUsedPosition) > 1) {
            positionJumps++;
          }
          
          // Remove the used position to avoid reusing the same letter position
          letterPositions[char] = letterPositions[char].filter(p => p !== closestPosition);
          lastUsedPosition = closestPosition;
        }
      }
    }
    
    // More position jumps = more complexity
    if (positionJumps > 0) {
      complexity *= (1 + (positionJumps / submittedWord.length) * 0.5);
    }
    
    return complexity;
  }
  
  // Calculate bonus for using rare letters
  function calculateRareLetterBonus(word) {
    // Russian letter frequency (roughly approximated, could be refined)
    const letterFrequency = {
      'а': 0.062, 'б': 0.014, 'в': 0.038, 'г': 0.013, 'д': 0.025,
      'е': 0.072, 'ё': 0.003, 'ж': 0.007, 'з': 0.016, 'и': 0.062,
      'й': 0.010, 'к': 0.028, 'л': 0.035, 'м': 0.026, 'н': 0.053,
      'о': 0.090, 'п': 0.023, 'р': 0.040, 'с': 0.045, 'т': 0.053,
      'у': 0.021, 'ф': 0.002, 'х': 0.009, 'ц': 0.004, 'ч': 0.012,
      'ш': 0.006, 'щ': 0.003, 'ъ': 0.000, 'ы': 0.016, 'ь': 0.014,
      'э': 0.003, 'ю': 0.006, 'я': 0.018
    };
    
    let bonus = 0;
    const usedLetters = new Set(word.toLowerCase().split(''));
    
    for (const letter of usedLetters) {
      // If it's a rare letter (frequency < 0.01), add bonus
      if (letterFrequency[letter] && letterFrequency[letter] < 0.03) {
        bonus += (0.03 - letterFrequency[letter]) * 10;
      }
    }
    
    return bonus;
  }

server.listen(3000, () => {
  console.log('Server running on port 3000');
});