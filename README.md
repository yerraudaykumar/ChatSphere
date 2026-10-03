# ChatSphere - Full-Stack Real-Time Chat Application 🚀

ChatSphere is a modern, full-stack real-time messaging web application built using Node.js, Express, Socket.IO, MongoDB, and EJS templates.

---

## 🌟 Features

- 🔐 **Authentication & Security**:
  - JWT (JSON Web Token) authentication stored in HTTP-Only cookies.
  - Secure password hashing using `bcryptjs`.
  - Rate limiting, Helmet security headers, CORS policies, and input validation.
- 💬 **Real-Time Communication (Socket.IO)**:
  - Instant 1-on-1 messaging without page refreshes.
  - Real-time online/offline presence tracking & last seen timestamps.
  - Live "User is typing..." typing indicators.
  - Read receipts with double checkmarks (sent, delivered, read).
  - Message editing & live deletion broadcast.
  - Unread message counters & live toast alerts.
- 📁 **File & Media Sharing**:
  - Profile avatar upload via Multer.
  - Image and document attachment sharing with live preview grid.
- 🎨 **Modern UI/UX**:
  - Glassmorphism design aesthetics with smooth CSS transitions.
  - Dark & Light mode toggle with persistent state.
  - Emoji picker dropdown.
  - Mobile responsive single-column chat drawer interface.

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Real-Time Engine**: Socket.IO
- **Database**: MongoDB with Mongoose ODM (with seamless in-memory fallback for zero-setup instant testing)
- **Templating & View**: EJS (Embedded JavaScript)
- **File Uploads**: Multer
- **Styling**: Modern Vanilla CSS3 with Design Tokens & Variables
- **Security**: JsonWebToken, BcryptJS, Cookie-Parser, Helmet, Express-Rate-Limit, CORS

---

## 📁 Project Structure

```text
ChatSphere/
├── server.js                   # Application entry point & Socket.IO server
├── package.json                # Dependencies & npm scripts
├── .env                        # Environment variables
├── .env.example                # Example environment configuration
├── README.md                   # Complete documentation
│
├── config/
│   └── db.js                   # MongoDB connection logic (with memory fallback)
│
├── models/
│   ├── User.js                 # User Mongoose schema
│   ├── Conversation.js         # Conversation Mongoose schema
│   └── Message.js              # Message Mongoose schema
│
├── controllers/
│   ├── authController.js       # Register, Login, Logout, GetMe
│   ├── userController.js       # User search, profile updates
│   ├── conversationController.js # Conversations CRUD
│   └── messageController.js    # Messages CRUD
│
├── routes/
│   ├── authRoutes.js           # Auth REST endpoints
│   ├── userRoutes.js           # User management endpoints
│   ├── conversationRoutes.js   # Conversation endpoints
│   ├── messageRoutes.js        # Message endpoints
│   └── uploadRoutes.js         # File upload endpoint
│
├── middleware/
│   ├── authMiddleware.js       # JWT protection middleware
│   ├── errorMiddleware.js      # Global error handler
│   └── uploadMiddleware.js     # Multer upload configuration
│
├── socket/
│   └── socketHandler.js        # Socket.IO real-time event listeners
│
├── public/
│   ├── css/
│   │   └── style.css           # Modern design system & themes
│   ├── js/
│   │   ├── chat.js             # Client chat engine & UI controller
│   │   ├── auth.js             # Auth forms & profile management
│   │   └── socket.js           # Socket.IO client setup
│   ├── images/                 # Default avatars & static assets
│   └── uploads/                # User uploaded avatars & attachments
│
└── views/
    ├── login.ejs               # Login view
    ├── register.ejs            # Registration view
    ├── chat.ejs                # Main real-time chat interface
    ├── profile.ejs             # User profile settings
    ├── settings.ejs            # Application preferences
    └── error.ejs              # Error handling view
```

---

## ⚙️ Environment Variables (.env)

Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/chatsphere
JWT_SECRET=chatsphere_super_secret_jwt_key_2026_x987654321
CLIENT_URL=http://localhost:3000
```

---

## 🚀 Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Production Server
```bash
npm start
```

### 3. Start Development Server (with auto-reload)
```bash
npm run dev
```

Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## 🔌 Socket.IO Events Reference

| Event Name | Type | Payload / Description |
| :--- | :--- | :--- |
| `connection` | Server | Triggered when client establishes WebSocket connection |
| `disconnect` | Server | User disconnects; status updated to offline & `lastSeen` set |
| `user_online` | Broadcast | Emitted when a user comes online |
| `user_offline` | Broadcast | Emitted when a user goes offline |
| `send_message` | Client -> Server | `{ conversationId, receiverId, content, messageType, attachmentUrl }` |
| `receive_message` | Server -> Client | Emits new message object to receiver's socket room |
| `typing` | Client -> Server | `{ conversationId, receiverId }` triggers typing indicator |
| `stop_typing` | Client -> Server | `{ conversationId, receiverId }` removes typing indicator |
| `message_read` | Client -> Server | `{ messageId, conversationId, senderId }` updates read receipt |
| `edit_message` | Client -> Server | `{ messageId, conversationId, receiverId, content }` |
| `delete_message` | Client -> Server | `{ messageId, conversationId, receiverId }` |

---

## 📡 REST API Documentation

### Authentication Routes (`/api/auth`)
- **POST** `/api/auth/register` - Register a new user (multipart for profile picture)
- **POST** `/api/auth/login` - Authenticate user & receive JWT cookie
- **POST** `/api/auth/logout` - Clear auth session & set status offline
- **GET** `/api/auth/me` - Get current logged-in user profile

### User Routes (`/api/users`)
- **GET** `/api/users` - Fetch all users
- **GET** `/api/users/search?query=...` - Search users by name, username, or email
- **GET** `/api/users/:id` - Fetch user details by ID
- **PUT** `/api/users/profile` - Update profile details & password

### Conversation Routes (`/api/conversations`)
- **GET** `/api/conversations` - Get all conversations for current user
- **POST** `/api/conversations` - Start or retrieve 1-on-1 conversation
- **GET** `/api/conversations/:id` - Fetch conversation details
- **DELETE** `/api/conversations/:id` - Delete conversation & history

### Message Routes (`/api/messages`)
- **GET** `/api/messages/:conversationId` - Fetch all messages in a conversation
- **POST** `/api/messages` - Send a message via REST
- **PUT** `/api/messages/:id` - Edit message content
- **DELETE** `/api/messages/:id` - Delete message
- **PUT** `/api/messages/:id/read` - Mark message as read

### Upload Routes (`/api/upload`)
- **POST** `/api/upload` - Upload image or file attachment

---

## 🛠 Troubleshooting

1. **MongoDB Connection Warning**:
   If local MongoDB service is not running on your machine, ChatSphere will automatically fall back to an internal **In-Memory MongoDB instance**, allowing full testing out of the box without any setup errors.
2. **Socket.IO Not Connecting**:
   Verify that your browser does not block WebSocket connections and `PORT` 3000 is open.
