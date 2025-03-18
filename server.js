const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('public'));// comment out 
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {};
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
  // Create a room
  socket.on('createRoom', (data) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    const roomName = data.name || `Room ${roomId}`;
    const gameMode = data.settings.gameMode || 'multiplayer'; // Default to multiplayer
    const settings = { maxPlayers: data.settings.maxPlayers || 2, gameMode };
    rooms[roomId] = {
      name: roomName,
      settings,
      player1: null,
      player2: null,
      hp: { player1: 100, player2: 100 },
      givenWord: getRandomWord(),
      usedWords: { player1: new Set(), player2: new Set() }
    };
    socket.emit('roomCreated', { roomId, roomName, gameMode });
  });
  
  // Join a room
  socket.on('joinRoom', (roomId) => {
    if (rooms[roomId]) {
      if (!rooms[roomId].player1) {
        rooms[roomId].player1 = socket.id;
        socket.playerPosition = 'player1';
      } else if (!rooms[roomId].player2) {
        rooms[roomId].player2 = socket.id;
        socket.playerPosition = 'player2';
      } else {
        socket.emit('roomFull', { message: 'Room is full' });
        return;
      }
      socket.join(roomId);
      socket.roomId = roomId;
      socket.emit('joinedRoom', { roomId, roomName: rooms[roomId].name });
      if (rooms[roomId].player1 && rooms[roomId].player2) {
        io.to(roomId).emit('gameData', { givenWord: rooms[roomId].givenWord });
        setTimeout(() => io.to(roomId).emit('startGame', { message: 'Game starting!' }), 500);
      }
    } else {
      socket.emit('roomNotFound', { message: 'Room does not exist' });
    }
  });

  // Send room list
  socket.on('getRoomList', () => {
    const roomList = Object.entries(rooms).map(([id, room]) => {
      // Count connected players by filtering non-null player slots
      const connectedPlayers = [room.player1, room.player2].filter(player => player !== null).length;
      return {
        id,
        name: room.name,
        players: connectedPlayers,
        maxPlayers: room.settings.maxPlayers,
        status: connectedPlayers < room.settings.maxPlayers ? 'Open' : 'Full'
      };
    });
    socket.emit('roomList', roomList);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      if (rooms[roomId].player1 === socket.id) {
        rooms[roomId].player1 = null;
      } else if (rooms[roomId].player2 === socket.id) {
        rooms[roomId].player2 = null;
      }
      // Store disconnected player info
      disconnectedPlayers[socket.id] = { 
        roomId, 
        timestamp: Date.now(), 
        position: socket.playerPosition 
      };
      setTimeout(() => {
        if (disconnectedPlayers[socket.id]) {
          delete disconnectedPlayers[socket.id];
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
        
        // Send word result to player but don't update HP yet
        socket.emit('wordResult', { valid: true, word, damage, increaseMultiplier: true });
        
        // Store pending damage in temporary variable
        if (!rooms[roomId].pendingDamage) {
            rooms[roomId].pendingDamage = {};
        }
        rooms[roomId].pendingDamage[socket.id] = {
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
  socket.on('fireballHit', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId] || !rooms[roomId].pendingDamage || !rooms[roomId].pendingDamage[socket.id]) return;
    
    // Apply the pending damage
    const pendingInfo = rooms[roomId].pendingDamage[socket.id];
    const opponentPos = pendingInfo.opponentPos;
    const damage = pendingInfo.damage;
    
    // Now apply the damage
    rooms[roomId].hp[opponentPos] = Math.max(0, rooms[roomId].hp[opponentPos] - damage);
    
    // Clean up the pending damage
    delete rooms[roomId].pendingDamage[socket.id];
    
    // Send updated HP to both players
    const player1HP = rooms[roomId].hp.player1;
    const player2HP = rooms[roomId].hp.player2;
    io.to(rooms[roomId].player1).emit('updateHP', { yourHP: player1HP, opponentHP: player2HP });
    io.to(rooms[roomId].player2).emit('updateHP', { yourHP: player2HP, opponentHP: player1HP });
    
    // Check if game is over
    if (player1HP <= 0 || player2HP <= 0) {
        io.to(roomId).emit('gameEnded', { winner: player1HP <= 0 ? rooms[roomId].player2 : rooms[roomId].player1 });
    }
  });

  // Add to socket events in server.js
  socket.on('fireballLaunched', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    
    // Get opponent socket id
    let opponentId;
    if (rooms[roomId].player1 === socket.id) {
        opponentId = rooms[roomId].player2;
    } else {
        opponentId = rooms[roomId].player1;
    }
    
    // Send fireball data to opponent only
    if (opponentId) {
        io.to(opponentId).emit('opponentFireball', data);
    }
  });

  socket.on('reconnectToRoom', (roomId) => {
    const dp = Object.values(disconnectedPlayers).find(dp => dp.roomId === roomId && dp.position);
    if (dp) {
      rooms[roomId][dp.position] = socket.id;
      socket.playerPosition = dp.position;
      socket.join(roomId);
      socket.roomId = roomId;
      socket.emit('joinedRoom', { roomId: roomId });
      delete disconnectedPlayers[socket.id];
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

// Calculate damage based on word length and complexity
function calculateDamage(givenWord, submittedWord) {
  // Base damage from word length
  let damage = submittedWord.length;
  
  // Check if word is a substring (easier to form)
  const isSubstring = givenWord.includes(submittedWord);
  
  // Apply non-linear scaling for longer words
  // Words longer than 5 letters get bonus damage
  if (submittedWord.length > 5) {
    damage += Math.pow(submittedWord.length - 5, 1.5);
  }
  
  // Reduce damage for substrings (easier words)
  if (isSubstring) {
    damage = Math.max(1, Math.floor(damage * 0.7));
  }
  
  // Calculate letter rearrangement complexity
  const letterComplexity = calculateLetterComplexity(givenWord, submittedWord);
  damage = Math.ceil(damage * (1 + letterComplexity * 0.2));
  
  return Math.max(1, Math.floor(damage));
}

// Calculate letter rearrangement complexity
function calculateLetterComplexity(givenWord, submittedWord) {
  // Count unique letters used
  const uniqueLetters = new Set(submittedWord.split('')).size;
  
  // Calculate ratio of unique letters to total length
  return uniqueLetters / submittedWord.length;
}

server.listen(3000, () => {
  console.log('Server running on port 3000');
});