const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get all conversations for logged in user
// @route   GET /api/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    let conversations = await Conversation.find({
      participants: { $in: [userId] },
    })
      .populate({
        path: 'participants',
        select: 'name username email profilePicture isOnline lastSeen bio',
      })
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender receiver',
          select: 'name username profilePicture',
        },
      })
      .sort({ updatedAt: -1 });

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const convObj = conv.toObject();
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          receiver: userId,
          isRead: false,
        });
        convObj.unreadCount = unreadCount;
        return convObj;
      })
    );

    res.status(200).json({ success: true, count: conversationsWithUnread.length, data: conversationsWithUnread });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or get existing conversation between 2 users
// @route   POST /api/conversations
// @access  Private
exports.createConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required' });
    }

    if (recipientId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot create conversation with yourself' });
    }

    const recipientExists = await User.findById(recipientId);
    if (!recipientExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId], $size: 2 },
    })
      .populate({
        path: 'participants',
        select: 'name username email profilePicture isOnline lastSeen bio',
      })
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, recipientId],
      });

      conversation = await Conversation.findById(conversation._id).populate({
        path: 'participants',
        select: 'name username email profilePicture isOnline lastSeen bio',
      });
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: { $in: [req.user._id] },
    })
      .populate({
        path: 'participants',
        select: 'name username email profilePicture isOnline lastSeen bio',
      })
      .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete conversation and messages
// @route   DELETE /api/conversations/:id
// @access  Private
exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: { $in: [req.user._id] },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Delete all messages in conversation
    await Message.deleteMany({ conversationId: conversation._id });

    // Delete conversation
    await Conversation.findByIdAndDelete(conversation._id);

    res.status(200).json({ success: true, message: 'Conversation and all messages deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
