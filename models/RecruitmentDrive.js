const mongoose = require('mongoose');

const recruitmentDriveSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    company: String,
    startDate: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'on-hold'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rounds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Round',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('RecruitmentDrive', recruitmentDriveSchema);
