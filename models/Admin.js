// models/Admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: String,
  pin: String,
  mobileNumber: String,
  email: String
});

adminSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
  next();
});

adminSchema.methods.matchPin = async function(enteredPin) {
  return await bcrypt.compare(enteredPin, this.pin);
};

module.exports = mongoose.model('Admin', adminSchema);
