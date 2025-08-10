# Real-Time Chat System Design for Thryve

## 🎯 **System Overview**

The Thryve chat system will enable secure, real-time communication between users who have matched through the compatibility system. The design focuses on:

- **Real-time messaging** using Socket.IO
- **Privacy & Security** with message encryption
- **Rich media support** for images, voice notes
- **Group chat capabilities** for community support
- **Offline message delivery**
- **Message status tracking** (sent, delivered, read)
- **Typing indicators** and online presence

## 📊 **Enhanced Database Schema**

### **Required Schema Updates:**

```prisma
model ChatSession {
  id            String           @id @default(cuid())
  type          ChatType         @default(DIRECT)  // DIRECT, GROUP
  name          String?                             // For group chats
  description   String?                             // Group description
  avatarURL     String?                             // Group avatar
  isActive      Boolean          @default(true)
  lastActivity  DateTime         @default(now())
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  // Direct chat participants
  user1         User?            @relation("User1Sessions", fields: [user1Id], references: [id])
  user1Id       String?
  user2         User?            @relation("User2Sessions", fields: [user2Id], references: [id])
  user2Id       String?

  // For group chats
  participants  ChatParticipant[]
  messages      ChatMessage[]
  
  @@unique([user1Id, user2Id]) // Prevent duplicate direct chats
}

model ChatParticipant {
  id            String           @id @default(cuid())
  chatSession   ChatSession      @relation(fields: [chatId], references: [id], onDelete: Cascade)
  chatId        String
  user          User             @relation(fields: [userId], references: [id])
  userId        String
  role          ParticipantRole  @default(MEMBER)  // ADMIN, MODERATOR, MEMBER
  joinedAt      DateTime         @default(now())
  lastRead      DateTime?        // Last message read timestamp
  isActive      Boolean          @default(true)   // For leaving/rejoining groups
  
  @@unique([chatId, userId])
}

model ChatMessage {
  id            String           @id @default(cuid())
  chatSession   ChatSession      @relation(fields: [chatId], references: [id], onDelete: Cascade)
  chatId        String
  sender        User             @relation(fields: [senderId], references: [id])
  senderId      String
  
  // Message content
  type          MessageType      @default(TEXT)    // TEXT, IMAGE, VOICE, FILE, SYSTEM
  content       String?                           // Encrypted text content
  mediaURL      String?                           // For files/images
  mediaType     String?                           // MIME type
  mediaSize     Int?                              // File size in bytes
  
  // Message metadata
  isEdited      Boolean          @default(false)
  editedAt      DateTime?
  replyTo       ChatMessage?     @relation("MessageReplies", fields: [replyToId], references: [id])
  replyToId     String?
  replies       ChatMessage[]    @relation("MessageReplies")
  
  // Status tracking
  deliveredAt   DateTime?
  readBy        MessageRead[]
  
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
}

model MessageRead {
  id            String           @id @default(cuid())
  message       ChatMessage      @relation(fields: [messageId], references: [id], onDelete: Cascade)
  messageId     String
  user          User             @relation(fields: [userId], references: [id])
  userId        String
  readAt        DateTime         @default(now())
  
  @@unique([messageId, userId])
}

model UserPresence {
  id            String           @id @default(cuid())
  user          User             @relation(fields: [userId], references: [id])
  userId        String           @unique
  isOnline      Boolean          @default(false)
  lastSeen      DateTime         @default(now())
  socketId      String?          // Current socket connection
  
  updatedAt     DateTime         @updatedAt
}

enum ChatType {
  DIRECT
  GROUP
}

enum MessageType {
  TEXT
  IMAGE
  VOICE
  FILE
  SYSTEM
}

enum ParticipantRole {
  ADMIN
  MODERATOR
  MEMBER
}
```

## 🏗️ **System Architecture**

### **1. Technology Stack:**
- **Socket.IO** - Real-time bidirectional communication
- **Redis** - Session management & pub/sub for scaling
- **Multer** - File upload handling
- **Crypto** - Message encryption/decryption
- **Sharp** - Image processing and compression

### **2. Folder Structure:**
```
src/
├── socket/
│   ├── index.js              # Socket.IO server setup
│   ├── handlers/
│   │   ├── chat.handler.js   # Chat event handlers
│   │   ├── presence.handler.js # Online presence
│   │   └── typing.handler.js # Typing indicators
│   └── middleware/
│       ├── auth.middleware.js # Socket authentication
│       └── rate-limit.js     # Rate limiting
├── controllers/
│   └── chat/
│       ├── chat.controller.js     # Chat session management
│       ├── message.controller.js  # Message CRUD operations
│       └── upload.controller.js   # Media upload handling
├── services/
│   └── chat/
│       ├── chat.service.js        # Chat business logic
│       ├── message.service.js     # Message handling
│       ├── encryption.service.js  # Message encryption
│       └── notification.service.js # Push notifications
├── routes/
│   └── chat.routes.js        # HTTP REST endpoints
└── utils/
    ├── encryption.js         # Crypto utilities
    └── fileValidator.js      # File validation
```

## 🔄 **Real-Time Events**

### **Client → Server Events:**
```javascript
// Connection & Authentication
'authenticate'           // Authenticate socket connection
'join_chat'             // Join a specific chat room
'leave_chat'            // Leave a chat room

// Messaging
'send_message'          // Send a new message
'edit_message'          // Edit existing message
'delete_message'        // Delete a message
'mark_as_read'          // Mark messages as read

// Typing & Presence
'typing_start'          // User started typing
'typing_stop'           // User stopped typing
'user_online'           // User came online
'user_offline'          // User went offline

// Group Chat Management
'create_group'          // Create new group chat
'add_participant'       // Add user to group
'remove_participant'    // Remove user from group
'update_group'          // Update group info
```

### **Server → Client Events:**
```javascript
// Message Events
'message_received'      // New message in chat
'message_edited'        // Message was edited
'message_deleted'       // Message was deleted
'message_delivered'     // Message delivery confirmation
'message_read'          // Message read confirmation

// Typing & Presence
'user_typing'           // Someone is typing
'user_stopped_typing'   // Someone stopped typing
'user_online'           // User came online
'user_offline'          // User went offline
'presence_update'       // Bulk presence updates

// Chat Management
'chat_created'          // New chat session created
'participant_added'     // Someone joined group
'participant_removed'   // Someone left group
'chat_updated'          // Chat info updated

// Error Handling
'error'                 // Error occurred
'authentication_error'  // Auth failed
'rate_limit_exceeded'   // Too many requests
```

## 🔐 **Security Features**

### **1. Message Encryption:**
- **End-to-end encryption** using AES-256
- **Key exchange** during chat session creation
- **Forward secrecy** with rotating keys

### **2. Authentication & Authorization:**
- **JWT-based socket authentication**
- **Room-based permissions** (users can only access their chats)
- **Rate limiting** to prevent spam
- **Input sanitization** and validation

### **3. Privacy Controls:**
- **Block/unblock** functionality
- **Report inappropriate content**
- **Message deletion** with proper cleanup
- **GDPR compliance** for data deletion

## 📱 **API Endpoints (HTTP)**

### **Chat Session Management:**
```
GET    /api/v1/chat/sessions          # Get user's chat sessions
POST   /api/v1/chat/sessions          # Create new chat session
GET    /api/v1/chat/sessions/:id      # Get specific chat details
PUT    /api/v1/chat/sessions/:id      # Update chat settings
DELETE /api/v1/chat/sessions/:id      # Delete/leave chat

GET    /api/v1/chat/sessions/:id/messages  # Get chat message history
POST   /api/v1/chat/upload/:id        # Upload media to chat
```

### **Message Management:**
```
GET    /api/v1/chat/messages/:id      # Get specific message
PUT    /api/v1/chat/messages/:id      # Edit message
DELETE /api/v1/chat/messages/:id      # Delete message
POST   /api/v1/chat/messages/:id/read # Mark as read
```

### **Group Chat Management:**
```
POST   /api/v1/chat/groups            # Create group chat
POST   /api/v1/chat/groups/:id/invite # Invite user to group
DELETE /api/v1/chat/groups/:id/participants/:userId # Remove participant
PUT    /api/v1/chat/groups/:id        # Update group settings
```

## 🚀 **Implementation Phases**

### **Phase 1: Foundation (Week 1)**
1. ✅ Update database schema
2. ✅ Set up Socket.IO server
3. ✅ Basic authentication middleware
4. ✅ Simple text messaging
5. ✅ Chat session creation

### **Phase 2: Core Features (Week 2)**
1. ✅ Message history and pagination
2. ✅ Online presence system
3. ✅ Typing indicators
4. ✅ Message status tracking (delivered/read)
5. ✅ File upload system

### **Phase 3: Advanced Features (Week 3)**
1. ✅ Message encryption
2. ✅ Group chat functionality
3. ✅ Message editing/deletion
4. ✅ Reply to messages
5. ✅ Push notifications

### **Phase 4: Polish & Scale (Week 4)**
1. ✅ Rate limiting and security
2. ✅ Performance optimization
3. ✅ Comprehensive testing
4. ✅ Admin moderation tools
5. ✅ Analytics and monitoring

## 💡 **Key Considerations**

### **Scalability:**
- **Redis pub/sub** for multi-server scaling
- **Message pagination** for large chat histories
- **Lazy loading** of chat participants
- **Connection pooling** for database

### **User Experience:**
- **Offline message queueing**
- **Message retry mechanism**
- **Optimistic UI updates**
- **Smart notification batching**

### **Health-Focused Features:**
- **Wellness check-ins** in group chats
- **Resource sharing** (articles, tips)
- **Mood tracking integration**
- **Crisis support escalation**

## 🎯 **Success Metrics**
- Message delivery rate (>99.5%)
- Average response time (<100ms)
- User engagement (messages per session)
- Chat retention rate
- System uptime (>99.9%)

---

**Ready to implement?** Let's start with Phase 1 - updating the schema and setting up the basic Socket.IO infrastructure!
