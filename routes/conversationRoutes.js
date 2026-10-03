const express = require('express');
const router = express.Router();
const {
  getConversations,
  createConversation,
  getConversationById,
  deleteConversation,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getConversations);
router.post('/', protect, createConversation);
router.get('/:id', protect, getConversationById);
router.delete('/:id', protect, deleteConversation);

module.exports = router;
