const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  channel:   { type: String, required: true, index: true },
  message:   { type: String, required: true, maxlength: 300 },
  sender:    { type: String, required: true },
  userId:    { type: String, default: null, index: true },
  filtered:  { type: Boolean, default: false },
  msgId:     { type: String, default: null },
}, { timestamps: true });

// TTL: mesajlar 30 gün sonra otomatik silinir
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
// Kanal bazlı son mesajları hızlı çekmek için
chatMessageSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
