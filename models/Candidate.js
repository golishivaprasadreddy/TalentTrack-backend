const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    candidateId: {
      type: String,
      unique: true,
      required: true,
    },
    name: String,
    email: String,
    phone: String,
    currentRound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round',
    },
    recruitmentDrive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentDrive',
      required: false,
    },
    status: {
      type: String,
      enum: ['round-1', 'technical', 'hr', 'selected', 'rejected'],
      default: 'round-1',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Candidate', candidateSchema);
