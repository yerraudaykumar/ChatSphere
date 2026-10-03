const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [req.user._id] },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Mark all unread messages sent to this user in this conversation as read
    await Message.updateMany(
      { conversationId, receiver: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({ conversationId })
      .populate('sender', 'name username profilePicture')
      .populate('receiver', 'name username profilePicture')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, receiverId, content, messageType, attachmentUrl } = req.body;
    const senderId = req.user._id;

    if (!conversationId || !receiverId) {
      return res.status(400).json({ success: false, message: 'Conversation ID and receiver ID are required' });
    }

    if (!content && !attachmentUrl && !req.file) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    let finalAttachmentUrl = attachmentUrl || null;
    let finalMessageType = messageType || 'text';

    if (req.file) {
      finalAttachmentUrl = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith('image/')) {
        finalMessageType = 'image';
      } else {
        finalMessageType = 'file';
      }
    }

    const message = await Message.create({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      content: content || '',
      messageType: finalMessageType,
      attachmentUrl: finalAttachmentUrl,
      isDelivered: true,
      isRead: false,
    });

    // Update conversation lastMessage and timestamp
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username profilePicture')
      .populate('receiver', 'name username profilePicture');

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update / Edit a message
// @route   PUT /api/messages/:id
// @access  Private
exports.updateMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this message' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    message.content = content.trim();
    message.edited = true;
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username profilePicture')
      .populate('receiver', 'name username profilePicture');

    res.status(200).json({ success: true, data: updatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(req.params.id);

    // If this was the last message in the conversation, update the conversation's lastMessage reference
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation && conversation.lastMessage && conversation.lastMessage.toString() === message._id.toString()) {
      const latestMsg = await Message.findOne({ conversationId: conversation._id }).sort({ createdAt: -1 });
      conversation.lastMessage = latestMsg ? latestMsg._id : null;
      await conversation.save();
    }

    res.status(200).json({ success: true, message: 'Message deleted successfully', messageId: req.params.id, conversationId: message.conversationId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    message.isRead = true;
    await message.save();

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
