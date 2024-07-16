// routes/userRoutes.js
const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
  const { name, pin, mobileNumber, email } = req.body;
  const user = new User({ name, pin, mobileNumber, email });
  await user.save();
  res.status(201).json({ message: 'User registered successfully' });
});

// User Login
router.post('/login', async (req, res) => {
  const { mobileNumber, email, pin } = req.body;
  const user = await User.findOne({ $or: [{ mobileNumber }, { email }] });
  if (user && (await user.matchPin(pin))) {
    const token = jwt.sign({ id: user._id }, 'secret', { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Send Money
router.post('/send-money', authMiddleware, async (req, res) => {
  const { recipientId, amount, pin } = req.body;
  const user = await User.findById(req.user.id);
  if (user && (await user.matchPin(pin))) {
    if (amount < 50) {
      return res.status(400).json({ message: 'Minimum transaction amount is 50 Taka' });
    }
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    if (amount > 100) {
      amount -= 5; // Deduct fee
    }
    user.balance -= amount;
    recipient.balance += amount;
    await user.save();
    await recipient.save();
    const transaction = new Transaction({ sender: user._id, recipient: recipient._id, amount, type: 'send' });
    await transaction.save();
    res.json({ message: 'Money sent successfully' });
  } else {
    res.status(401).json({ message: 'Invalid PIN' });
  }
});

// Cash-Out
router.post('/cash-out', authMiddleware, async (req, res) => {
  const { agentId, amount, pin } = req.body;
  const user = await User.findById(req.user.id);
  if (user && (await user.matchPin(pin))) {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    const fee = amount * 0.015;
    user.balance -= (amount + fee);
    agent.balance += (amount + fee);
    await user.save();
    await agent.save();
    const transaction = new Transaction({ sender: user._id, recipient: agent._id, amount, type: 'cash-out' });
    await transaction.save();
    res.json({ message: 'Cash-out successful' });
  } else {
    res.status(401).json({ message: 'Invalid PIN' });
  }
});

// Cash-In
router.post('/cash-in', authMiddleware, async (req, res) => {
  const { agentId, amount } = req.body;
  const user = await User.findById(req.user.id);
  const agent = await Agent.findById(agentId);
  if (!agent) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  user.balance += amount;
  agent.balance -= amount;
  await user.save();
  await agent.save();
  const transaction = new Transaction({ sender: agent._id, recipient: user._id, amount, type: 'cash-in' });
  await transaction.save();
  res.json({ message: 'Cash-in successful' });
});

// Balance Inquiry
router.get('/balance', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ balance: user.balance });
});

// Transaction History
router.get('/transactions', authMiddleware, async (req, res) => {
  const transactions = await Transaction.find({ sender: req.user.id }).sort({ date: -1 }).limit(10);
  res.json(transactions);
});

module.exports = router;
