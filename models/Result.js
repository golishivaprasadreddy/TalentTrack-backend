const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round',
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    avgScore: Number,
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approovalDate: Date,
    evaluations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evaluation',
      },
    ],
  },
  { timestamps: true }
);

// Ensure unique result per candidate per round
resultSchema.index({ round: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
