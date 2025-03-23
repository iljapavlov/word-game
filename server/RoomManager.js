const rooms = {};

function createRoom(socket, data, randomWord) {
  const roomId = Math.random().toString(36).substring(2, 8);
  const roomName = data.name || `Room ${roomId}`;
  const gameMode = data.settings.gameMode || 'standard';
  const settings = { maxPlayers: data.settings.maxPlayers || 2 };
  
  console.log(`Creating room ${roomId} with name "${roomName}" and game mode "${gameMode}"`);
  console.log(`Creator ID: ${socket.playerId}`);
  
  rooms[roomId] = {
    name: roomName,
    settings,
    player1: socket.playerId, // Set player1 to creator's ID immediately
    player2: null,
    hp: { player1: 100, player2: 100 },
    givenWord: randomWord,
    usedWords: { player1: new Set(), player2: new Set() },
    creator: socket.playerId,
    gameMode: gameMode,
  };
  
  console.log(`Room created. Current rooms: ${Object.keys(rooms).length}`);
  return { roomId, roomName, gameMode };
}

function deleteRoom(socket, roomId, io) {
  if (rooms[roomId] && rooms[roomId].creator === socket.playerId) {
    if (rooms[roomId].player1 || rooms[roomId].player2) {
      io.to(roomId).emit('roomDeleted', { message: 'The room has been deleted by the creator.' });
    }
    delete rooms[roomId];
    return true;
  }
  return false;
}

module.exports = { createRoom, deleteRoom, rooms };