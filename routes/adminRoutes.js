// routes/adminRoutes.js
const express = require('express');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Admin Registration (for initial setup)
router.post('/register', async (req, res) => {
  const { name, pin, mobileNumber, email } = req.body;
  const admin = new Admin({ name, pin, mobileNumber, email });
  await admin.save();
  res.status(201).json({ message: 'Admin registered successfully' });
});

// Admin Login
router.post('/login', async (req, res) => {
  const { mobileNumber, email, pin } = req.body;
  const admin = await Admin.findOne({ $or: [{ mobileNumber }, { email }] });
  if (admin && (await admin.matchPin(pin))) {
    const token = jwt.sign({ id: admin._id }, 'secret', { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// View All Users
router.get('/users', authMiddleware, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// View All Agents
router.get('/agents', authMiddleware, async (req, res) => {
  const agents = await Agent.find();
  res.json(agents);
});

// View All Transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  const transactions = await Transaction.find().sort({ date: -1 });
  res.json(transactions);
});

// Activate/Block User
router.put('/users/:id', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const user = await User.findById(req.params.id);
  if (user) {
    user.status = status;
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
