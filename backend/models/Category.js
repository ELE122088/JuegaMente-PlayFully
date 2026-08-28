const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la categoría es obligatorio'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
    },
    icon: {
      type: String,
      default: '📚',
    },
    color: {
      type: String,
      default: '#6C63FF',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    roomCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    gameMode: {
      type: String,
      enum: ['practice', 'exam'],
      default: 'exam',
    },
    initialLives: {
      type: Number,
      default: 3,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    timePerQuestion: {
      type: Number,
      default: 15,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Category', categorySchema);
