const express = require('express');
const router = express.Router();
const { getUsers, searchUsers, getUserById, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', protect, getUsers);
router.get('/search', protect, searchUsers);
router.get('/:id', protect, getUserById);
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);

module.exports = router;
