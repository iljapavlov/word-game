const rooms = {};

function createRoom(socket, data, randomWord) {
  const roomId = Math.random().toString(36).substring(2, 8);
  const roomName = data.name || `Room ${roomId}`;
  const gameMode = data.settings.gameMode || 'multiplayer';
  const settings = { maxPlayers: data.settings.maxPlayers || 2, gameMode };
  rooms[roomId] = {
    name: roomName,
    settings,
    player1: null,
    player2: null,
    hp: { player1: 100, player2: 100 },
    givenWord: randomWord,
    usedWords: { player1: new Set(), player2: new Set() },
    creator: socket.playerId
  };
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