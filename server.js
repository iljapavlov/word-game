const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const rooms = {};
const players = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
  
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });

    socket.on('joinRoom', (roomId) => {
        if (!rooms[roomId]) {
          rooms[roomId] = [];
        }

        if (rooms[roomId].length < 2) {
          rooms[roomId].push(socket.id);
          players[socket.id] = roomId;
          socket.join(roomId);
          socket.emit('joinedRoom', { roomId });

          console.log(`Player ${socket.id} joined room ${roomId}`);
      
          if (rooms[roomId].length === 2) {
            io.to(roomId).emit('startGame', { message: 'Game starting!' });
          }
        } else {
          socket.emit('roomFull', { message: 'Room is full' });
        }
      });

    socket.on('dealDamage', (data) => {
      const roomId = socket.roomId;
      const players = rooms[roomId];
      const opponentId = players.find(id => id !== socket.id);
      io.to(opponentId).emit('receiveDamage', { damage: data.damage });
    });
  });

app.use(express.static('public'));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});