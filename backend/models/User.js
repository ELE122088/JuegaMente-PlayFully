const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'El nombre de usuario es obligatorio'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    adminPin: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
      default: '',
    },
    history: [
      {
        categoryName: {
          type: String,
          required: true,
        },
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
          default: null,
        },
        roomCode: {
          type: String,
          default: '',
        },
        score: {
          type: Number,
          required: true,
        },
        total: {
          type: Number,
          required: true,
        },
        percentage: {
          type: Number,
          required: true,
        },
        questions: [
          {
            text: { type: String, required: true },
            options: { type: [String], required: true },
            correctAnswer: { type: Number, required: true },
            userAnswer: { type: Number, required: true }
          }
        ],
        lives: {
          type: Number,
          default: 3,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
