const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Map to track active user socket connections: userId -> Set of socketIds
const onlineUsersMap = new Map();

const initializeSocket = (io) => {
  // Socket Middleware for Authentication
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers.cookie &&
          socket.handshake.headers.cookie
            .split(';')
            .find((c) => c.trim().startsWith('token='))
            ?.split('=')[1]);

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chatsphere_super_secret_jwt_key_2026_x987654321');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    // Track online user
    if (!onlineUsersMap.has(userId)) {
      onlineUsersMap.set(userId, new Set());
    }
    onlineUsersMap.get(userId).add(socket.id);

    // Join personal user room for direct messaging
    socket.join(userId);

    // Update user status in DB to online
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    // Notify all connected clients about online status
    io.emit('user_online', {
      userId,
      isOnline: true,
    });

    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // EVENT: Send Message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, receiverId, content, messageType, attachmentUrl } = data;

        if (!conversationId || !receiverId) return;

        // Save message to MongoDB
        const newMessage = await Message.create({
          conversationId,
          sender: userId,
          receiver: receiverId,
          content: content || '',
          messageType: messageType || 'text',
          attachmentUrl: attachmentUrl || null,
          isDelivered: onlineUsersMap.has(receiverId) && onlineUsersMap.get(receiverId).size > 0,
          isRead: false,
        });

        // Update Conversation lastMessage & timestamp
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: newMessage._id,
          updatedAt: new Date(),
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'name username profilePicture')
          .populate('receiver', 'name username profilePicture');

        // Emit message to receiver's room
        io.to(receiverId).emit('receive_message', populatedMessage);

        // Emit message back to sender (for instant UI reflection)
        socket.emit('message_sent', populatedMessage);

        // Notify receiver to update conversation list / unread count
        io.to(receiverId).emit('update_conversation', {
          conversationId,
          lastMessage: populatedMessage,
          senderId: userId,
        });
      } catch (err) {
        console.error('Socket send_message error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // EVENT: Typing Indicator
    socket.on('typing', ({ conversationId, receiverId }) => {
      if (receiverId) {
        io.to(receiverId).emit('user_typing', {
          conversationId,
          userId,
          username: socket.user.username,
        });
      }
    });

    // EVENT: Stop Typing Indicator
    socket.on('stop_typing', ({ conversationId, receiverId }) => {
      if (receiverId) {
        io.to(receiverId).emit('user_stop_typing', {
          conversationId,
          userId,
        });
      }
    });

    // EVENT: Message Delivered
    socket.on('message_delivered', async ({ messageId, senderId }) => {
      await Message.findByIdAndUpdate(messageId, { isDelivered: true });
      if (senderId) {
        io.to(senderId).emit('message_delivered_ack', { messageId });
      }
    });

    // EVENT: Message Read
    socket.on('message_read', async ({ messageId, conversationId, senderId }) => {
      if (messageId) {
        await Message.findByIdAndUpdate(messageId, { isRead: true });
      } else if (conversationId) {
        await Message.updateMany(
          { conversationId, receiver: userId, isRead: false },
          { $set: { isRead: true } }
        );
      }

      if (senderId) {
        io.to(senderId).emit('message_read_ack', { messageId, conversationId, readerId: userId });
      }
    });

    // EVENT: Message Edit
    socket.on('edit_message', async ({ messageId, conversationId, receiverId, content }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.sender.toString() === userId) {
          msg.content = content;
          msg.edited = true;
          await msg.save();

          const updatedMsg = await Message.findById(messageId)
            .populate('sender', 'name username profilePicture')
            .populate('receiver', 'name username profilePicture');

          io.to(receiverId).emit('message_edited', updatedMsg);
          socket.emit('message_edited', updatedMsg);
        }
      } catch (err) {
        console.error('Socket edit_message error:', err.message);
      }
    });

    // EVENT: Message Delete
    socket.on('delete_message', async ({ messageId, conversationId, receiverId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.sender.toString() === userId) {
          await Message.findByIdAndDelete(messageId);

          io.to(receiverId).emit('message_deleted', { messageId, conversationId });
          socket.emit('message_deleted', { messageId, conversationId });
        }
      } catch (err) {
        console.error('Socket delete_message error:', err.message);
      }
    });

    // EVENT: Disconnect
    socket.on('disconnect', async () => {
      const userSockets = onlineUsersMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsersMap.delete(userId);
          const lastSeen = new Date();

          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });

          io.emit('user_offline', {
            userId,
            isOnline: false,
            lastSeen,
          });
        }
      }
      console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });
};

module.exports = initializeSocket;
