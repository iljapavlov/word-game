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
  } catch (err) {
    console.error('Error loading dictionary:', err);
    // Create an empty set if file doesn't exist yet
    russianNouns = new Set();
  }
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

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle player joining a room
  socket.on('joinRoom', (roomId) => {
    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = { 
        players: [], 
        hp: {}, 
        givenWord: 'многоножка',
        usedWords: {} // Track used words per player instead of for the whole room
      };
    }
    // Add player to room if there's space
    if (rooms[roomId].players.length < 2) {
      rooms[roomId].players.push(socket.id);
      rooms[roomId].hp[socket.id] = 100;
      // Initialize player's used words set
      if (!rooms[roomId].usedWords[socket.id]) {
        rooms[roomId].usedWords[socket.id] = new Set();
      }
      socket.join(roomId);
      socket.roomId = roomId;
      socket.emit('joinedRoom', { roomId: roomId });

      // Start game when two players are in the room
      if (rooms[roomId].players.length === 2) {
        console.log('emitted start -> '+roomId);
        io.to(roomId).emit('startGame', { message: 'Game starting!' });
      }
    } else {
      socket.emit('roomFull', { message: 'Room is full' });
    }
  });

  // Handle word submission and damage dealing
  socket.on('submitWord', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const word = data.word.toLowerCase(); // Normalize to lowercase
    const givenWord = rooms[roomId].givenWord;
    const multiplier = data.multiplier || 1; // Get current multiplier from client

    // Check if word is too short (less than 3 letters)
    if (word.length < 3) {
      socket.emit('wordResult', { 
        valid: false, 
        word: word, 
        reason: 'Word must be at least 3 letters long',
        resetMultiplier: true
      });
      return;
    }

    // Check if word is the same as the given word
    if (word === givenWord.toLowerCase()) {
      socket.emit('wordResult', { 
        valid: false, 
        word: word, 
        reason: 'Cannot use the original word',
        resetMultiplier: true
      });
      return;
    }

    // Check if this player already used this word
    if (rooms[roomId].usedWords[socket.id].has(word)) {
      socket.emit('wordResult', { 
        valid: false, 
        word: word, 
        reason: 'You already used this word',
        resetMultiplier: true
      });
      return;
    }

    if (canFormWord(givenWord, word)) {
      if (isValidRussianNoun(word)) {
        // Add word to player's used words set
        rooms[roomId].usedWords[socket.id].add(word);
        
        // Calculate damage based on word length and complexity
        let damage = calculateDamage(givenWord, word);
        
        // Apply multiplier to damage
        damage = Math.floor(damage * multiplier);
        
        const players = rooms[roomId].players;
        const opponentId = players.find(id => id !== socket.id);
        if (opponentId) {
          // Apply damage to opponent's HP
          rooms[roomId].hp[opponentId] = Math.max(0, rooms[roomId].hp[opponentId] - damage);

          // Send updated HP to both players
          const player1Id = players[0];
          const player2Id = players[1];
          const player1HP = rooms[roomId].hp[player1Id];
          const player2HP = rooms[roomId].hp[player2Id];
          io.to(player1Id).emit('updateHP', { yourHP: player1HP, opponentHP: player2HP });
          io.to(player2Id).emit('updateHP', { yourHP: player2HP, opponentHP: player1HP });

          // Check if game has ended
          if (player1HP <= 0 || player2HP <= 0) {
            io.to(roomId).emit('gameEnded', { 
              winner: player1HP <= 0 ? player2Id : player1Id 
            });
          }
        }

        // Send feedback to player with increased multiplier
        socket.emit('wordResult', { 
          valid: true, 
          word: word, 
          damage: damage,
          increaseMultiplier: true
        });
      } else {
        socket.emit('wordResult', { 
          valid: false, 
          word: word, 
          reason: 'Not a valid Russian noun',
          resetMultiplier: true
        });
      }
    } else {
      socket.emit('wordResult', { 
        valid: false, 
        word: word, 
        reason: 'Cannot be formed from given letters',
        resetMultiplier: true
      });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
      delete rooms[roomId].hp[socket.id];
      if (rooms[roomId].players.length < 2) {
        io.to(roomId).emit('playerDisconnected', { message: 'Opponent disconnected' });
      }
    }
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