// Test quick socket behavior
import { createServer } from 'http';
import { Server } from 'socket.io';

const server = createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Simple connection counter
let connections = 0;

io.on('connection', (socket) => {
  connections++;
  console.log(`✅ Connection ${connections}: ${socket.id}`);
  
  socket.on('authenticate', (data) => {
    console.log(`🔐 Auth: ${data.userId} - ${data.username}`);
    socket.emit('authenticated', { success: true });
  });
  
  socket.on('message:send', (data) => {
    console.log(`💬 Message: ${data.content} in ${data.channelId}`);
    // Echo message back to test
    socket.emit('message:new', {
      id: Date.now().toString(),
      content: data.content,
      channelId: data.channelId,
      createdAt: new Date(),
      user: {
        id: data.userId,
        username: 'Test User',
        avatar: null
      }
    });
  });
  
  socket.on('disconnect', () => {
    connections--;
    console.log(`❌ Disconnection: ${socket.id} (${connections} remaining)`);
  });
});

server.listen(3001, () => {
  console.log('Test socket server running on port 3001');
});
