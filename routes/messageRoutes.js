const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  markAsRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/:conversationId', protect, getMessages);
router.post('/', protect, upload.single('attachment'), sendMessage);
router.put('/:id', protect, updateMessage);
router.delete('/:id', protect, deleteMessage);
router.put('/:id/read', protect, markAsRead);

module.exports = router;
