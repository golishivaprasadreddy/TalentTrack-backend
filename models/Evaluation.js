const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema(
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
    panelMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    decision: {
      type: String,
      enum: ['pass', 'fail', 'hold'],
      required: true,
    },
    remarks: String,
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure unique evaluation per candidate per round per panel member
evaluationSchema.index(
  { round: 1, candidate: 1, panelMember: 1 },
  { unique: true }
);

module.exports = mongoose.model('Evaluation', evaluationSchema);
