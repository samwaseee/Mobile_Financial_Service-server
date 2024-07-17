const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Agent = require('../models/Agent'); // Import the Agent model

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === 'user') {
      user = await User.findById(decoded.id).select('-pin');
    } else if (decoded.role === 'agent') {
      user = await Agent.findById(decoded.id).select('-pin'); // Adjust as per your Agent model's structure
    } else {
      return res.status(401).json({ message: 'Invalid role type' });
    }

    if (!user) {
      return res.status(401).json({ message: 'User/Agent not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Token validation error:', err.message); // Log the error for debugging
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
