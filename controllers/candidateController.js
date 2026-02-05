const Candidate = require('../models/Candidate');
const Result = require('../models/Result');

// Get candidate status
exports.getCandidateStatus = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({
      user: req.user.id,
    }).populate('currentRound', 'name');

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Get result for current round (only status, not scores)
    const result = await Result.findOne({
      candidate: candidate._id,
    }).select('decision');

    res.json({
      candidateId: candidate.candidateId,
      name: candidate.name,
      email: candidate.email,
      status: candidate.status,
      currentRound: candidate.currentRound,
      result: result ? result.decision : 'pending',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get candidate dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({
      user: req.user.id,
    })
      .populate('recruitmentDrive', 'name company')
      .populate('currentRound', 'name sequenceNumber');

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Get all rounds candidate is/was in (from Evaluations)
    const Evaluation = require('../models/Evaluation');
    const evaluations = await Evaluation.find({
      candidate: candidate._id,
    }).populate('round', 'name sequenceNumber');

    // Get all results for this candidate
    const results = await Result.find({
      candidate: candidate._id,
    })
      .populate('round', 'name sequenceNumber')
      .select('decision round');

    // Create a map of rounds with their status
    const roundStatusMap = new Map();
    
    evaluations.forEach(evaluation => {
      if (evaluation.round) {
        const roundId = evaluation.round._id.toString();
        if (!roundStatusMap.has(roundId)) {
          roundStatusMap.set(roundId, {
            round: evaluation.round,
            status: 'pending'
          });
        }
      }
    });

    // Update status based on results
    results.forEach(result => {
      const roundId = result.round._id.toString();
      if (roundStatusMap.has(roundId)) {
        roundStatusMap.get(roundId).status = result.decision === 'approved' ? 'selected' : 'rejected';
      } else {
        roundStatusMap.set(roundId, {
          round: result.round,
          status: result.decision === 'approved' ? 'selected' : 'rejected'
        });
      }
    });

    // Convert map to sorted array by sequence number
    const sortedRounds = Array.from(roundStatusMap.values())
      .sort((a, b) => a.round.sequenceNumber - b.round.sequenceNumber);

    const statusTextMap = {
      'round-1': 'Round 1',
      'technical': 'Technical Round',
      'hr': 'HR Round',
      'selected': 'Selected',
      'rejected': 'Rejected',
    };

    res.json({
      candidateId: candidate.candidateId,
      name: candidate.name,
      email: candidate.email,
      recruitmentDrive: candidate.recruitmentDrive,
      currentStatus: statusTextMap[candidate.status] || candidate.status,
      currentRound: candidate.currentRound,
      results: sortedRounds.map((r) => ({
        round: r.round,
        status: r.status === 'selected' ? '✅ Selected' : (r.status === 'rejected' ? '❌ Not Selected' : '⏳ Under Review'),
        decision: r.status
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get only selection status (no details)
exports.getSelectionStatus = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({
      user: req.user.id,
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const result = await Result.findOne({
      candidate: candidate._id,
    }).select('decision');

    const statusMap = {
      approved: '✅ Selected for next round',
      rejected: '❌ Not selected',
      pending: '⏳ Under review',
    };

    res.json({
      status: statusMap[result?.decision] || '⏳ Under review',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
