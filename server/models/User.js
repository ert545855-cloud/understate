const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String, required: true, unique: true,
      trim: true, minlength: 3, maxlength: 20,
      match: /^[a-zA-Z0-9_]+$/,
    },
    email: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password:    { type: String, required: true, minlength: 6, select: false },
    role:        { type: String, default: 'user', enum: ['user', 'admin', 'moderator'] },
    banned:      { type: Boolean, default: false },
    banReason:   { type: String, default: '' },

    // Core stats
    level:        { type: Number, default: 1, min: 1 },
    xp:           { type: Number, default: 0, min: 0 },
    money:        { type: Number, default: 1000, min: 0 },
    bankMoney:    { type: Number, default: 0, min: 0 },
    underCoin:    { type: Number, default: 0, min: 0 },
    hp:           { type: Number, default: 100 },
    score:        { type: Number, default: 0 },
    creditScore:  { type: Number, default: 500 },
    meritPoints:  { type: Number, default: 0 },
    loyaltyPoints:{ type: Number, default: 0 },

    // Progression
    city:              { type: String, default: 'İstanbul' },
    position:          { type: String, default: '' },
    educationLevel:    { type: String, default: 'İlkokul' },
    educationProgress: { type: Number, default: 0 },

    // Collections
    inventory:    { type: mongoose.Schema.Types.Mixed, default: [] },
    equippedItems:{ type: mongoose.Schema.Types.Mixed, default: {} },
    holdings:     { type: mongoose.Schema.Types.Mixed, default: [] },

    // Full game snapshot
    gameData: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Auth tokens
    refreshToken:      { type: String, default: null, select: false },
    resetToken:        { type: String, default: null, select: false },
    resetTokenExpiry:  { type: Date, default: null },

    // Meta
    lastLogin:  { type: Date, default: Date.now },
    isOnline:   { type: Boolean, default: false },
    socketId:   { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = async function (pw) {
  return bcrypt.compare(pw, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    banned: this.banned,
    banReason: this.banReason,
    level: this.level,
    xp: this.xp,
    money: this.money,
    bankMoney: this.bankMoney,
    underCoin: this.underCoin,
    hp: this.hp,
    score: this.score,
    creditScore: this.creditScore,
    meritPoints: this.meritPoints,
    loyaltyPoints: this.loyaltyPoints,
    city: this.city,
    position: this.position,
    educationLevel: this.educationLevel,
    educationProgress: this.educationProgress,
    inventory: this.inventory,
    equippedItems: this.equippedItems,
    holdings: this.holdings,
    gameData: this.gameData,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
