const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userData) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    const room = rooms.get(roomId);
    room.set(socket.id, {
      socketId: socket.id,
      ...userData
    });

    console.log(`User ${socket.id} joined room ${roomId}. Room now has ${room.size} users.`);

    // Send list of existing users to the new user
    const existingUsers = Array.from(room.values()).filter(user => user.socketId !== socket.id);
    socket.emit('existing-users', existingUsers);

    // Notify existing users about the new user
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      ...userData
    });

    // Send updated user count to all users in the room
    io.to(roomId).emit('room-users', Array.from(room.values()));
  });

  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    for (const [roomId, room] of rooms.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        socket.to(roomId).emit('user-left', socket.id);

        // Send updated user count to remaining users
        if (room.size > 0) {
          io.to(roomId).emit('room-users', Array.from(room.values()));
        } else {
          rooms.delete(roomId);
        }
        break;
      }
    }
  });

  // Handle user mute/unmute events
  socket.on('user-toggle-audio', (data) => {
    socket.to(data.roomId).emit('user-toggle-audio', {
      userId: socket.id,
      muted: data.muted
    });
  });

  socket.on('user-toggle-video', (data) => {
    socket.to(data.roomId).emit('user-toggle-video', {
      userId: socket.id,
      videoOff: data.videoOff
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Video call server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to start video calling`);
});