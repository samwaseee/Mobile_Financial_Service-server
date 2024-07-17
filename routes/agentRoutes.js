const express = require('express');
const Agent = require('../models/Agent');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Agent Registration
router.post('/register', async (req, res) => {
  const { name, pin, mobileNumber, email } = req.body;

  console.log('Received Registration Data:', req.body);

  // Check if agent with the given mobile number or email already exists
  const existingAgent = await Agent.findOne({ $or: [{ mobileNumber }, { email }] });
  if (existingAgent) {
    return res.status(400).json({ message: 'Mobile number or email already registered' });
  }

  const agent = new Agent({ name, pin, mobileNumber, email, status: 'pending' });
  await agent.save();
  res.status(201).json({ message: 'Agent registered successfully' });
});

// Agent Login
router.post('/login', async (req, res) => {
  const { mobileNumber, email, pin } = req.body;

  try {
    const agent = await Agent.findOne({ $or: [{ mobileNumber }, { email }] });

    if (!agent) {
      return res.status(401).json({ message: 'Agent not found' });
    }

    console.log('Stored hashed PIN:', agent.pin);
    console.log('Received PIN:', pin);

    const isPinValid = await agent.matchPin(pin); // Using matchPin method

    console.log('PIN comparison result:', isPinValid);

    if (isPinValid) {
      const token = jwt.sign({ id: agent._id, role: 'agent' }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Added role to token
      return res.json({
        token,
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          mobileNumber: agent.mobileNumber,
          balance: agent.balance,
        },
      });
    } else {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during agent login:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

// Balance Inquiry
router.get('/balance', authMiddleware, async (req, res) => {
  const agent = await Agent.findById(req.user.id).select('balance');
  res.json({ balance: agent.balance });
});

// Transaction History
router.get('/transactions', authMiddleware, async (req, res) => {
  const transactions = await Transaction.find({ $or: [{ sender: req.user.id }, { recipient: req.user.id }] })
    .sort({ date: -1 })
    .limit(20);
  res.json(transactions);
});

// Cash In
router.post('/cash-in', authMiddleware, async (req, res) => {
  const { userId, amount } = req.body;

  const agent = await Agent.findById(req.user.id);
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  agent.balance -= amount;
  user.balance += amount;

  await agent.save();
  await user.save();

  res.status(200).json({
    message: 'Cash in successful',
    agentBalance: agent.balance,
    userBalance: user.balance,
  });
});

// Cash Out
router.post('/cash-out', authMiddleware, async (req, res) => {
  const { userId, amount, pin } = req.body;

  const agent = await Agent.findById(req.user.id);
  const user = await User.findById(userId);

  if (user && (await bcrypt.compare(pin, user.pin))) {
    const fee = amount * 0.015;
    const totalAmount = amount + fee;

    if (user.balance < totalAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.balance -= totalAmount;
    agent.balance += amount + fee;

    await user.save();
    await agent.save();
    res.status(200).json({
      message: 'Cash out successful',
      userBalance: user.balance,
      agentBalance: agent.balance,
    });
  } else {
    res.status(401).json({ message: 'Invalid PIN' });
  }
});

// Agent Data
router.get('/me', authMiddleware, async (req, res) => {
  const agent = await Agent.findById(req.user.id).select('-pin'); // Exclude the pin field
  if (agent) {
    res.json(agent);
  } else {
    res.status(404).json({ message: 'Agent not found' });
  }
});

module.exports = router;
