const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chatsphere_super_secret_jwt_key_2026_x987654321');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'User no longer exists' });
      }
      res.clearCookie('token');
      return res.redirect('/login');
    }

    req.user = user;
    res.locals.currentUser = user; // Make available in EJS templates
    next();
  } catch (error) {
    console.error('JWT Verification error:', error.message);
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
    }
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

module.exports = { protect };
