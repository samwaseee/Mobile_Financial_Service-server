const express = require('express');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Agent = require('../models/Agent'); // Import Agent model
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Admin Login
router.post('/login', async (req, res) => {
  const { mobileNumber, email, pin } = req.body;
  
  try {
    // Find admin by mobile number or email
    const admin = await Admin.findOne({ $or: [{ mobileNumber }, { email }] });

    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    // Validate PIN
    const isPinValid = await admin.matchPin(pin);

    if (!isPinValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });

  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// View All Users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// View All Agents
router.get('/agents', authMiddleware, async (req, res) => {
  try {
    const agents = await Agent.find();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: 'Server error fetching agents' });
  }
});

// Activate/Block User
router.put('/users/:id', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const user = await User.findById(req.params.id);
  if (user) {
    if (status === 'active') {
      user.status = 'active';
    } else if (status === 'pending') {
      user.status = 'pending';
    } else {
      return res.status(400).json({ message: 'Invalid status' });
    }
    await user.save();
    res.json({ message: 'User status updated' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Activate/Block Agent
router.put('/agents/:id', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const agent = await Agent.findById(req.params.id);
  if (agent) {
    agent.status = status;
    await agent.save();
    res.json({ message: 'Agent status updated' });
  } else {
    res.status(404).json({ message: 'Agent not found' });
  }
});

module.exports = router;
