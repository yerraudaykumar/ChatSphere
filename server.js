const path = require('path');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Load Environment Variables
dotenv.config();

// Configs & Models
const connectDB = require('./config/db');
const User = require('./models/User');

// Middleware
const { protect } = require('./middleware/authMiddleware');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Socket Handler
const initializeSocket = require('./socket/socketHandler');

// Initialize App & HTTP Server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Connect to Database
connectDB();

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for flexibility with FontAwesome & CDNs
  })
);
app.use(cors({ origin: true, credentials: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

// Body Parsers & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static Files & Uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==========================================================================
// PAGE ROUTES (SERVER-SIDE RENDERING WITH EJS)
// ==========================================================================

// Chat Dashboard (Protected)
app.get('/', protect, (req, res) => {
  res.render('chat', { currentUser: req.user });
});

// Login Page
app.get('/login', (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'chatsphere_super_secret_jwt_key_2026_x987654321');
      return res.redirect('/');
    } catch (e) {
      res.clearCookie('token');
    }
  }
  res.render('login');
});

// Register Page
app.get('/register', (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'chatsphere_super_secret_jwt_key_2026_x987654321');
      return res.redirect('/');
    } catch (e) {
      res.clearCookie('token');
    }
  }
  res.render('register');
});

// Profile Settings Page (Protected)
app.get('/profile', protect, (req, res) => {
  res.render('profile', { currentUser: req.user });
});

// Application Settings Page (Protected)
app.get('/settings', protect, (req, res) => {
  res.render('settings', { currentUser: req.user });
});

// ==========================================================================
// REST API ROUTES
// ==========================================================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

// Socket.IO Logic
initializeSocket(io);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 ChatSphere Server running on http://localhost:${PORT}`);
  console.log(`==================================================`);
});
