const Evaluation = require('../models/Evaluation');
const Round = require('../models/Round');
const Result = require('../models/Result');
const Candidate = require('../models/Candidate');

// Submit evaluation - only for assigned rounds
exports.submitEvaluation = async (req, res) => {
  try {
    const { roundId, candidateId } = req.params;
    const { score, decision, remarks } = req.body;

    // Check if panel member is assigned to this round
    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (!round.panelMembers.includes(req.user.id)) {
      return res.status(403).json({ error: 'You are not assigned to evaluate this round' });
    }

    // Check if evaluation already exists
    const existingEvaluation = await Evaluation.findOne({
      round: roundId,
      candidate: candidateId,
      panelMember: req.user.id,
    });

    if (existingEvaluation) {
      // Update existing evaluation
      existingEvaluation.score = score;
      existingEvaluation.decision = decision;
      existingEvaluation.remarks = remarks;
      await existingEvaluation.save();

      return res.json({
        message: 'Evaluation updated',
        evaluation: existingEvaluation,
      });
    }

    // Create new evaluation
    const evaluation = new Evaluation({
      round: roundId,
      candidate: candidateId,
      panelMember: req.user.id,
      score,
      decision,
      remarks,
    });

    await evaluation.save();

    // Create or update result
    let result = await Result.findOne({ round: roundId, candidate: candidateId });

    if (!result) {
      result = new Result({
        round: roundId,
        candidate: candidateId,
        evaluations: [evaluation._id],
      });
    } else {
      result.evaluations.push(evaluation._id);
    }

    // Calculate average score
    const evaluations = await Evaluation.find({
      round: roundId,
      candidate: candidateId,
    });

    const avgScore =
      evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length;
    result.avgScore = avgScore;

    // Determine overall decision (if all panel members evaluated)
    const passCount = evaluations.filter(e => e.decision === 'pass').length;
    const holdCount = evaluations.filter(e => e.decision === 'hold').length;
    const failCount = evaluations.filter(e => e.decision === 'fail').length;
    const allEvaluated = evaluations.length >= round.panelMembers.length;

    if (failCount > 0) {
      result.decision = 'rejected';
    } else if (allEvaluated && passCount + holdCount === evaluations.length) {
      result.decision = 'approved';
    } else {
      result.decision = 'pending';
    }

    await result.save();

    if (result.decision === 'approved' && allEvaluated) {
      const currentRound = await Round.findById(roundId).populate('recruitmentDrive');
      if (currentRound) {
        const nextRound = await Round.findOne({
          recruitmentDrive: currentRound.recruitmentDrive,
          sequenceNumber: currentRound.sequenceNumber + 1,
        });

        if (nextRound) {
          const existingIds = new Set(nextRound.candidates.map(id => id.toString()));
          existingIds.add(candidateId.toString());
          nextRound.candidates = Array.from(existingIds);
          await nextRound.save();

          await Candidate.updateOne(
            { _id: candidateId },
            { currentRound: nextRound._id }
          );
        }
      }
    }

    res.status(201).json({
      message: 'Evaluation submitted',
      evaluation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all candidates for a round (no assignment check)
exports.getAssignedCandidates = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findById(roundId).populate({
      path: 'candidates',
      populate: { path: 'user', select: 'name email' },
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Return all candidates - no assignment check needed
    res.json(round.candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all evaluations for a round (including feedback/remarks)
exports.getEvaluations = async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Get all evaluations with full details including remarks
    const evaluations = await Evaluation.find({ round: roundId })
      .populate('candidate', 'name email')
      .populate('panelMember', 'name email');

    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get specific candidate evaluation details with results
exports.getCandidateEvaluation = async (req, res) => {
  try {
    const { roundId, candidateId } = req.params;

    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Get all evaluations for this candidate in this round
    const evaluations = await Evaluation.find({
      round: roundId,
      candidate: candidateId,
    }).populate('panelMember', 'name email');

    // Get result for this candidate
    const result = await Result.findOne({
      round: roundId,
      candidate: candidateId,
    });

    res.json({ evaluations, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all rounds (with assignment status)
exports.getAssignedRounds = async (req, res) => {
  try {
    // Return all rounds with assignment status
    const rounds = await Round.find()
      .populate('recruitmentDrive', 'name')
      .populate('candidates', 'name email')
      .populate('panelMembers', 'name email');

    // Mark which rounds are assigned to this panel member
    const roundsWithAccess = rounds.map(round => ({
      ...round.toObject(),
      isAssigned: round.panelMembers.some(p => p._id.toString() === req.user.id),
      canEvaluate: round.panelMembers.some(p => p._id.toString() === req.user.id),
    }));

    res.json(roundsWithAccess);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
