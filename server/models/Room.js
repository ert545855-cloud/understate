const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    host: { type: String, required: true },
    maxPlayers: { type: Number, default: 20 },
    players: [
      {
        userId: String,
        username: String,
        socketId: String,
        joinedAt: Date,
        isReady: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    gameState: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
