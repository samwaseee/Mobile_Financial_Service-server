const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, pin, mobileNumber, email } = req.body;
  const user = new User({ name, pin, mobileNumber, email });
  await user.save();
  res.status(201).json({ message: 'User registered successfully' });
});

router.post('/login', async (req, res) => {
  const { mobileNumber, email, pin } = req.body;
  const user = await User.findOne({ $or: [{ mobileNumber }, { email }] });
  if (user && (await user.matchPin(pin))) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

router.post('/send-money', authMiddleware, async (req, res) => {
  const { recipientId, amount, pin } = req.body;
  const user = await User.findById(req.user.id);
  if (user && (await user.matchPin(pin))) {
    const recipient = await User.findById(recipientId);
    if (recipient) {
      user.balance -= amount;
      recipient.balance += amount;
      await user.save();
      await recipient.save();
      res.status(200).json({ message: 'Money sent successfully' });
    } else {
      res.status(404).json({ message: 'Recipient not found' });
    }
  } else {
    res.status(401).json({ message: 'Invalid PIN' });
  }
});

module.exports = router;
