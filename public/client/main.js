// Import game scenes
import { MenuScene } from './scenes/MenuScene.js';
import { WaitingScene } from './scenes/WaitingScene.js';
import { CountdownScene } from './scenes/CountdownScene.js';
import { GameModeFactory } from './GameModeFactory.js';

// Initialize socket connection
const socket = io();
window.socket = socket;

// Get or create a stable player ID from local storage
let playerId = localStorage.getItem('playerId');
if (!playerId) {
  playerId = 'player_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('playerId', playerId);
}
window.playerId = playerId;

// Send the player ID to the server
socket.emit('setPlayerId', playerId);

// Handle room joining from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const roomIdFromUrl = urlParams.get('room');
if (roomIdFromUrl) {
  window.socket.emit('joinRoom', roomIdFromUrl);
}

// Get the appropriate game scene based on mode
const GameSceneClass = GameModeFactory.getGameScene('standard');

// Phaser game configuration
const config = {
  type: Phaser.AUTO,
  disableVisibilityChange: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 800,
    parent: 'game-container'
  },
  scene: [MenuScene, WaitingScene, CountdownScene, GameSceneClass],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

// Create the game instance
const game = new Phaser.Game(config);

// Socket listeners
window.socket.on('socketId', (data) => {
  window.socketId = data.id;
  if (data.playerId) {
    window.playerId = data.playerId;
  }
});

window.socket.on('connect', () => {
  console.log('Connected to server');
  socket.emit('setPlayerId', playerId);
  const lastRoomId = localStorage.getItem('lastRoomId');
  if (lastRoomId) {
    socket.emit('reconnectToRoom', lastRoomId);
  }
});

window.socket.on('startGame', (data) => {
  game.scene.getScenes(true).forEach(scene => {
    game.scene.stop(scene.scene.key);
  });
  game.scene.start('CountdownScene');
});

window.socket.on('gameRestarted', (data) => {
  console.log('Game restarted:', data.message);
  window.givenWord = data.givenWord;
  if (game.scene.isActive('StandardGameScene')) {
    game.scene.stop('StandardGameScene');
  }
  game.scene.start('CountdownScene');
});

// After you create your game instance and before you start any scene
console.log('Registered scenes:', game.scene.manager.keys);