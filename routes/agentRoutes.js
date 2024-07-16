// routes/agentRoutes.js
const express = require('express');
const Agent = require('../models/Agent');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Agent Registration
router.post('/register', async (req, res) => {
  const { name, pin, mobileNumber, email } = req.body;
  const agent = new Agent({ name, pin, mobileNumber, email });
  await agent.save();
  res.status(201).json({ message: 'Agent registered successfully' });
});

// Agent Login
router.post('/login', async (req, res) => {
  const { mobileNumber, email, pin } = req.body;
  const agent = await Agent.findOne({ $or: [{ mobileNumber }, { email }] });
  if (agent && (await agent.matchPin(pin))) {
    const token = jwt.sign({ id: agent._id }, 'secret', { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Balance Inquiry
router.get('/balance', authMiddleware, async (req, res) => {
  const agent = await Agent.findById(req.user.id);
  res.json({ balance: agent.balance });
});

// Transaction History
router.get('/transactions', authMiddleware, async (req, res) => {
  const transactions = await Transaction.find({ sender: req.user.id }).sort({ date: -1 }).limit(20);
  res.json(transactions);
});

module.exports = router;
