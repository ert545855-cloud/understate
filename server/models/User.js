const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    money: { type: Number, default: 1000, min: 0 },
    inventory: { type: mongoose.Schema.Types.Mixed, default: {} },
    equippedItems: { type: mongoose.Schema.Types.Mixed, default: {} },
    gameData: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastLogin: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
    socketId: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    level: this.level,
    xp: this.xp,
    money: this.money,
    inventory: this.inventory,
    equippedItems: this.equippedItems,
    gameData: this.gameData,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
