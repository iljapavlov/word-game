const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { setupSocketHandlers } = require('./SocketHandlers.js');
const { createRoom, deleteRoom, rooms } = require('./RoomManager.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(express.static('public'));

const playerSockets = {}; // playerId -> socket

io.on('connection', (socket) => {
  socket.on('setPlayerId', (playerId) => {
    socket.playerId = playerId; // Attach playerId to the socket
    playerSockets[playerId] = socket; // Store the mapping
    console.log(`Player ${playerId} connected`);
  });

  setupSocketHandlers(io, socket, rooms, playerSockets);
})

server.listen(3000, () => console.log('Server running on port 3000'));