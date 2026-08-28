const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'El texto de la pregunta es obligatorio'],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, 'Las opciones son obligatorias'],
      validate: {
        validator: function (val) {
          return val.length === 4;
        },
        message: 'Debe haber exactamente 4 opciones',
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, 'La respuesta correcta es obligatoria'],
      min: 0,
      max: 3,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La categoría es obligatoria'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Question', questionSchema);
