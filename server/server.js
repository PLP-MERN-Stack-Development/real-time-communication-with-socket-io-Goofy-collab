
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 5e6, // 5MB for file uploads
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data stores
const users = new Map();
const messages = new Map(); // room -> messages
const privateMessages = new Map(); // userId -> messages
const typingUsers = new Map(); // room -> Set of userIds
const readReceipts = new Map(); // messageId -> Set of userIds who read it
const rooms = ['general', 'random', 'tech'];

// Initialize room message stores
rooms.forEach(room => {
  messages.set(room, []);
  typingUsers.set(room, new Set());
});

// Helper function to get user info
const getUserInfo = (socketId) => users.get(socketId);

// Helper function to add message to room
const addRoomMessage = (room, message) => {
  const roomMessages = messages.get(room) || [];
  roomMessages.push(message);
  
  // Keep only last 100 messages per room
  if (roomMessages.length > 100) {
    roomMessages.shift();
  }
  
  messages.set(room, roomMessages);
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (username) => {
    users.set(socket.id, {
      id: socket.id,
      username,
      joinedAt: new Date().toISOString(),
      currentRoom: 'general',
    });

    // Join default room
    socket.join('general');

    // Emit user list to all clients
    io.emit('user_list', Array.from(users.values()));
    
    // Emit user joined notification
    io.emit('user_joined', {
      username,
      id: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Send existing messages to the new user
    const generalMessages = messages.get('general') || [];
    socket.emit('message_history', {
      room: 'general',
      messages: generalMessages,
    });

    console.log(`${username} joined the chat`);
  });

  // Handle joining a room
  socket.on('join_room', (room) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    // Leave current room
    if (user.currentRoom) {
      socket.leave(user.currentRoom);
      const typingSet = typingUsers.get(user.currentRoom);
      if (typingSet) {
        typingSet.delete(socket.id);
        io.to(user.currentRoom).emit('typing_users', {
          room: user.currentRoom,
          users: Array.from(typingSet).map(id => getUserInfo(id)?.username).filter(Boolean),
        });
      }
    }

    // Join new room
    socket.join(room);
    user.currentRoom = room;
    users.set(socket.id, user);

    // Send room message history
    const roomMessages = messages.get(room) || [];
    socket.emit('message_history', {
      room,
      messages: roomMessages,
    });

    console.log(`${user.username} joined room: ${room}`);
  });

  // Handle chat messages
  socket.on('send_message', (data) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    const { message, file, room = user.currentRoom } = data;

    const messageData = {
      id: `${Date.now()}-${socket.id}`,
      sender: user.username,
      senderId: socket.id,
      message,
      file,
      room,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Add to room messages
    addRoomMessage(room, messageData);

    // Emit to all users in the room
    io.to(room).emit('receive_message', messageData);

    // Acknowledge message delivery
    socket.emit('message_delivered', {
      id: messageData.id,
      timestamp: messageData.timestamp,
    });

    console.log(`Message in ${room} from ${user.username}`);
  });

  // Handle private messages
  socket.on('private_message', ({ to, message, file }) => {
    const sender = getUserInfo(socket.id);
    if (!sender) return;

    const messageData = {
      id: `${Date.now()}-${socket.id}`,
      sender: sender.username,
      senderId: socket.id,
      to,
      message,
      file,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      read: false,
    };

    // Store private message
    const senderPM = privateMessages.get(socket.id) || [];
    senderPM.push(messageData);
    privateMessages.set(socket.id, senderPM);

    const recipientPM = privateMessages.get(to) || [];
    recipientPM.push(messageData);
    privateMessages.set(to, recipientPM);

    // Send to recipient
    io.to(to).emit('private_message', messageData);
    
    // Send back to sender (for confirmation)
    socket.emit('private_message', messageData);

    // Acknowledge delivery
    socket.emit('message_delivered', {
      id: messageData.id,
      timestamp: messageData.timestamp,
    });

    console.log(`Private message from ${sender.username} to ${to}`);
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    const room = user.currentRoom;
    const typingSet = typingUsers.get(room) || new Set();

    if (isTyping) {
      typingSet.add(socket.id);
    } else {
      typingSet.delete(socket.id);
    }

    typingUsers.set(room, typingSet);

    // Emit to others in the room
    socket.to(room).emit('typing_users', {
      room,
      users: Array.from(typingSet)
        .map(id => getUserInfo(id)?.username)
        .filter(Boolean),
    });
  });

  // Handle read receipts
  socket.on('message_read', ({ messageId, room }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    const readSet = readReceipts.get(messageId) || new Set();
    readSet.add(socket.id);
    readReceipts.set(messageId, readSet);

    // Notify message sender
    const roomMessages = messages.get(room) || [];
    const message = roomMessages.find(m => m.id === messageId);
    
    if (message && message.senderId) {
      io.to(message.senderId).emit('message_read_receipt', {
        messageId,
        readBy: user.username,
        readAt: new Date().toISOString(),
      });
    }
  });

  // Handle message reactions
  socket.on('add_reaction', ({ messageId, emoji, room }) => {
    const user = getUserInfo(socket.id);
    if (!user) return;

    io.to(room).emit('reaction_added', {
      messageId,
      emoji,
      username: user.username,
      userId: socket.id,
    });
  });

  // Handle pagination request
  socket.on('request_messages', ({ room, before, limit = 20 }) => {
    const roomMessages = messages.get(room) || [];
    
    let filteredMessages = roomMessages;
    if (before) {
      const index = roomMessages.findIndex(m => m.id === before);
      if (index > 0) {
        filteredMessages = roomMessages.slice(Math.max(0, index - limit), index);
      }
    } else {
      filteredMessages = roomMessages.slice(-limit);
    }

    socket.emit('message_history', {
      room,
      messages: filteredMessages,
      hasMore: filteredMessages.length === limit,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = getUserInfo(socket.id);
    
    if (user) {
      // Remove from typing indicators
      if (user.currentRoom) {
        const typingSet = typingUsers.get(user.currentRoom);
        if (typingSet) {
          typingSet.delete(socket.id);
          io.to(user.currentRoom).emit('typing_users', {
            room: user.currentRoom,
            users: Array.from(typingSet).map(id => getUserInfo(id)?.username).filter(Boolean),
          });
        }
      }

      // Emit user left notification
      io.emit('user_left', {
        username: user.username,
        id: socket.id,
        timestamp: new Date().toISOString(),
      });

      console.log(`${user.username} left the chat`);
    }

    // Remove user
    users.delete(socket.id);
    privateMessages.delete(socket.id);

    // Emit updated user list
    io.emit('user_list', Array.from(users.values()));
  });

  // Handle reconnection
  socket.on('reconnect_user', (username) => {
    console.log(`User reconnecting: ${username}`);
    socket.emit('user_join', username);
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    users: users.size,
    rooms: rooms.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/messages/:room', (req, res) => {
  const { room } = req.params;
  const roomMessages = messages.get(room) || [];
  res.json({
    room,
    messages: roomMessages,
    count: roomMessages.length,
  });
});

app.get('/api/users', (req, res) => {
  res.json({
    users: Array.from(users.values()),
    count: users.size,
  });
});

app.get('/api/rooms', (req, res) => {
  res.json({
    rooms: rooms.map(room => ({
      name: room,
      users: Array.from(users.values()).filter(u => u.currentRoom === room).length,
      messages: (messages.get(room) || []).length,
    })),
  });
});

app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available rooms: ${rooms.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = { app, server, io };


