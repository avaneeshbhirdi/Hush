const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Emit the socket id to the client so they know their ID
  socket.emit('me', socket.id);

  // User disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    socket.broadcast.emit('callEnded');
  });

  // Call a user
  socket.on('callUser', ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit('callUser', { signal: signalData, from, name });
  });

  // Answer a call
  socket.on('answerCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal);
  });

  // ICE Candidate exchange
  socket.on('ice-candidate', (data) => {
    io.to(data.to).emit('ice-candidate', data.candidate);
  });

  // Custom chat signaling (optional since WebRTC data channel can do it, but useful as fallback)
  socket.on('sendMessage', (data) => {
    io.to(data.to).emit('receiveMessage', data);
  });
});

app.get('/', (req, res) => {
  res.send('Signaling server is running.');
});

server.listen(PORT, () => console.log(`Signaling Server listening on port ${PORT}`));
