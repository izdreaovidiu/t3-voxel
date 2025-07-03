# WebSocket Implementation Guide

## 🔌 **Socket.IO Real-time Features**

### **What's New:**
- ✅ **Real-time messaging** - Messages appear instantly across all users
- ✅ **Live notifications** - Bouncing badges for unread messages  
- ✅ **Auto-start servers** - Both Next.js + Socket.IO start with `bun dev`
- ✅ **Connection status** - Live/Offline indicator in chat
- ✅ **Smart notifications** - Only show for users who haven't seen messages

## 🚀 **How to Run:**

```bash
# Start both servers at once
bun dev

# This will start:
# - Next.js dev server on :3000
# - Socket.IO server on :3001
```

## 🎯 **Features:**

### **📱 Real-time Messaging:**
- Type message → Instant delivery to all users in channel
- No page refresh needed
- Messages persist in database + show live

### **🔔 Smart Notifications:**
- **Bouncing badge** on server cards for unread messages
- **Auto-clear** when user enters server/channel  
- **No self-notifications** - don't see badges for your own messages
- **Persistent across sessions** - tracked in socket server memory

### **🌐 Connection Management:**
- **Auto-connect** when entering dashboard
- **Room management** - users join server/channel rooms
- **Graceful disconnect** handling
- **Live status indicator** in chat header

## 🔧 **Technical Implementation:**

### **Server Events:**
```typescript
// User management
'user:join' - Join server room
'channel:join' - Join specific channel  

// Messaging
'message:send' - Send new message
'message:new' - Receive new message

// Notifications  
'notification:update' - New message notification
'notifications:get' - Get unread count
'notifications:count' - Receive unread count
```

### **Client Hook:**
```typescript
const { 
  sendMessage,           // Send message via socket
  subscribeToMessages,   // Listen for new messages  
  getNotificationCount,  // Get unread count for server
  isConnected           // Connection status
} = useSocket();
```

## 🎨 **Visual Features:**

### **🎯 Bouncing Notifications:**
- **Slow bounce animation** (2s infinite)
- **Glowing red badge** with enhanced shadows
- **"99+" for counts over 99**
- **Automatic hide** when user reads messages

### **🔴 Connection Status:**
- **Green dot + "Live"** when connected
- **Red dot + "Offline"** when disconnected  
- **Real-time updates** in chat header

## 🐛 **Troubleshooting:**

### **Socket Server Won't Start:**
```bash
# Check if port 3001 is available
lsof -i :3001

# Kill any process using the port
kill -9 <PID>

# Restart dev servers
bun dev
```

### **Messages Not Appearing:**
- Check console for Socket.IO connection errors
- Verify both servers are running
- Ensure user is authenticated (Clerk)

### **Notifications Not Working:**
- Check if user has joined server room
- Verify socket connection status
- Clear browser cache if needed

## 📁 **File Structure:**
```
src/
├── server/socket/
│   └── server.ts          # Socket.IO server
├── hooks/
│   └── useSocket.ts       # Client socket hook  
├── scripts/
│   └── dev.mjs           # Dual server startup
└── app/_components/
    ├── carusel.tsx       # Notification badges
    └── serverPage.tsx    # Real-time chat
```

## 🎉 **Testing:**

1. **Open 2 browser windows**
2. **Login as different users** 
3. **Send message in one window**
4. **See instant delivery + notification in other**
5. **Enter server to clear notification**

## ⚡ **Performance Notes:**

- **Memory-based notifications** - resets on server restart
- **Room-based broadcasting** - efficient message delivery
- **Auto-cleanup** on user disconnect
- **Minimal database queries** for real-time features

---

**🔌 Socket.IO + Next.js = Perfect real-time experience!** 🚀
