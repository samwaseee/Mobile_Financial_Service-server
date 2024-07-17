const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
  // console.log('Received Registration Data:', req.body);

  const { name, pin, mobileNumber, email } = req.body;

  // Check if user with the given mobile number or email already exists
  const existingUser = await User.findOne({ $or: [{ mobileNumber }, { email }] });
  if (existingUser) {
    return res.status(400).json({ message: 'Mobile number or email already registered' });
  }

  // Hash PIN before saving
  const hashedPin = await bcrypt.hash(pin, 10);
  console.log('Hashed PIN:', hashedPin);

  const user = new User({ name, pin: hashedPin, mobileNumber, email, status: 'pending' });
  await user.save();
  res.status(201).json({ message: 'User registered successfully' });
});


// User Login
router.post('/login', async (req, res) => {
  const { mobileNumber, email, pin } = req.body;
  const user = await User.findOne({ $or: [{ mobileNumber }, { email }] });

  if (user && (await bcrypt.compare(pin, user.pin))) {
    let role;
    // Determine the role based on your application logic
    if (user.isAdmin) {
      role = 'admin';
    } else if (user.isAgent) {
      role = 'agent';
    } else {
      role = 'user';
    }

    const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        balance: user.balance,
      },
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// User Data
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('-pin'); // Exclude the pin field
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Send Money
router.post('/send-money', authMiddleware, async (req, res) => {
  const { recipientId, amount, pin } = req.body;

  // Validate amount
  if (amount < 50) {
    return res.status(400).json({ message: 'Minimum transaction amount is 50 Taka' });
  }

  const user = await User.findById(req.user.id);
  if (user && (await bcrypt.compare(pin, user.pin))) {
    const recipient = await User.findById(recipientId);
    if (recipient) {
      let fee = 0;
      if (amount > 100) {
        fee = 5;
      }
      user.balance -= (amount + fee);
      recipient.balance += amount;

      await user.save();
      await recipient.save();
      res.status(200).json({
        message: 'Money sent successfully',
        userBalance: user.balance,
        recipientBalance: recipient.balance,
      });
    } else {
      res.status(404).json({ message: 'Recipient not found' });
    }
  } else {
    res.status(401).json({ message: 'Invalid PIN' });
  }
});

// Cash Out
router.post('/cash-out', authMiddleware, async (req, res) => {
  const { agentId, amount, pin } = req.body;

  const user = await User.findById(req.user.id);
  if (user && (await bcrypt.compare(pin, user.pin))) {
    const agent = await User.findById(agentId);
    if (agent) {
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
      res.status(404).json({ message: 'Agent not found' });
    }
  } else {
    res.status(401).json({ message: 'Invalid PIN' });
  }
});

// Cash In
router.post('/cash-in', authMiddleware, async (req, res) => {
  const { agentId, amount } = req.body;

  const agent = await User.findById(agentId);
  if (!agent) {
    return res.status(404).json({ message: 'Agent not found' });
  }

  const user = await User.findById(req.user.id);

  agent.balance -= amount;
  user.balance += amount;

  await agent.save();
  await user.save();

  res.status(200).json({
    message: 'Cash in successful',
    userBalance: user.balance,
    agentBalance: agent.balance,
  });
});

// Balance Inquiry
router.get('/balance', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('balance');
  res.json({ balance: user.balance });
});

// Transaction History
router.get('/transactions', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  const transactions = user.transactions.slice(-10);
  res.json({ transactions });
});

module.exports = router;
