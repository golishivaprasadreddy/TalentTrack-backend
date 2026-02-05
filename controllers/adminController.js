const RecruitmentDrive = require('../models/RecruitmentDrive');
const Round = require('../models/Round');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const Result = require('../models/Result');
const Evaluation = require('../models/Evaluation');

// Create recruitment drive
exports.createRecruitmentDrive = async (req, res) => {
  try {
    const { name, description, company, startDate } = req.body;

    const drive = new RecruitmentDrive({
      name,
      description,
      company,
      startDate,
      createdBy: req.user.id,
    });

    await drive.save();
    res.status(201).json({ message: 'Recruitment drive created', drive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add round to recruitment drive
exports.addRound = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { name, description, sequenceNumber } = req.body;

    const drive = await RecruitmentDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ error: 'Recruitment drive not found' });
    }

    const round = new Round({
      name,
      description,
      sequenceNumber,
      recruitmentDrive: driveId,
    });

    await round.save();
    drive.rounds.push(round._id);
    await drive.save();

    // If this is Round 1, auto-assign all existing candidates
    if (sequenceNumber === 1) {
      const allCandidates = await Candidate.find();
      round.candidates = allCandidates.map(c => c._id);
      await round.save();

      // Update candidates' currentRound if not set
      await Candidate.updateMany(
        { currentRound: null },
        { currentRound: round._id }
      );
    }

    res.status(201).json({ message: 'Round added', round });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add candidates to recruitment drive
exports.addCandidates = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { candidates } = req.body; // Array of { name, email, phone }

    const drive = await RecruitmentDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ error: 'Recruitment drive not found' });
    }

    const createdCandidates = [];

    for (const candidateData of candidates) {
      const user = new User({
        name: candidateData.name,
        email: candidateData.email,
        password: 'default123', // Should be changed by candidate
        role: 'candidate',
      });

      await user.save();

      const candidateId = `CAND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const candidate = new Candidate({
        user: user._id,
        candidateId,
        name: candidateData.name,
        email: candidateData.email,
        phone: candidateData.phone,
        recruitmentDrive: driveId,
      });

      await candidate.save();
      createdCandidates.push(candidate);
    }

    res.status(201).json({
      message: 'Candidates added',
      candidates: createdCandidates,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all panel members
exports.getPanelMembers = async (req, res) => {
  try {
    const panelMembers = await User.find({ role: 'panel' }).select(
      'name email'
    );
    res.json(panelMembers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Assign panel members to round
exports.assignPanelToRound = async (req, res) => {
  try {
    const { roundId } = req.params;
    const { panelMemberIds } = req.body;

    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    round.panelMembers = panelMemberIds;
    await round.save();

    res.json({ message: 'Panel members assigned', round });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add candidates to round
exports.addCandidatesToRound = async (req, res) => {
  try {
    const { roundId } = req.params;
    const { candidateIds } = req.body;

    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    round.candidates = candidateIds;
    round.status = 'in-progress';
    await round.save();

    // Update candidate current round
    await Candidate.updateMany(
      { _id: { $in: candidateIds } },
      { currentRound: roundId }
    );

    res.json({ message: 'Candidates added to round', round });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all results for a round
exports.getRoundResults = async (req, res) => {
  try {
    const { roundId } = req.params;

    const results = await Result.find({ round: roundId })
      .populate('candidate', 'name email')
      .populate('evaluations');

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve/Reject candidate for next round
exports.approveCandidate = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { decision } = req.body; // 'approved' or 'rejected'

    const result = await Result.findById(resultId);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    result.decision = decision;
    result.approvedBy = req.user.id;
    result.approovalDate = new Date();
    await result.save();

    // Update candidate status
    const candidate = await Candidate.findById(result.candidate);
    if (decision === 'approved') {
      candidate.status = 'technical'; // Move to next round
    } else {
      candidate.status = 'rejected';
    }
    await candidate.save();

    res.json({ message: 'Approval decision saved', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all recruitment drives
exports.getAllDrives = async (req, res) => {
  try {
    const drives = await RecruitmentDrive.find()
      .populate('rounds')
      .populate('createdBy', 'name email');

    res.json(drives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get recruitment drive details
exports.getDriveDetails = async (req, res) => {
  try {
    const { driveId } = req.params;

    const drive = await RecruitmentDrive.findById(driveId)
      .populate({
        path: 'rounds',
        populate: [
          { path: 'panelMembers', select: 'name email' },
          { path: 'candidates', populate: { path: 'user', select: 'name email' } },
        ],
      })
      .populate('createdBy', 'name email');

    if (!drive) {
      return res.status(404).json({ error: 'Recruitment drive not found' });
    }

    res.json(drive);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Promote candidates from current round to next round based on results
exports.promoteToNextRound = async (req, res) => {
  try {
    const { roundId } = req.params;

    const currentRound = await Round.findById(roundId).populate('recruitmentDrive');
    if (!currentRound) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Get all results for this round where decision is 'approved' or passed
    const results = await Result.find({ 
      round: roundId,
      decision: 'approved'
    }).populate('candidate');

    if (results.length === 0) {
      return res.status(400).json({ error: 'No candidates passed this round' });
    }

    // Find next round in sequence
    const nextRound = await Round.findOne({
      recruitmentDrive: currentRound.recruitmentDrive,
      sequenceNumber: currentRound.sequenceNumber + 1,
    });

    if (!nextRound) {
      return res.status(404).json({ error: 'No next round found' });
    }

    // Add passed candidates to next round
    const candidateIds = results.map(r => r.candidate._id);
    
    // Remove duplicates and add to next round
    const uniqueCandidates = [...new Set([...nextRound.candidates, ...candidateIds])];
    nextRound.candidates = uniqueCandidates;
    await nextRound.save();

    // Update candidate current round
    await Candidate.updateMany(
      { _id: { $in: candidateIds } },
      { currentRound: nextRound._id }
    );

    res.json({
      message: `${candidateIds.length} candidates promoted to ${nextRound.name}`,
      promotedCount: candidateIds.length,
      nextRound: nextRound.name,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Get all candidates
exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find()
      .populate('user', ['name', 'email'])
      .populate('currentRound')
      .select('name email status feedback currentRound');

    const formattedCandidates = candidates.map(candidate => ({
      _id: candidate._id,
      name: candidate.name || candidate.user?.name || 'Unknown',
      email: candidate.email || candidate.user?.email || '',
      status: candidate.status,
      feedback: candidate.feedback,
      currentRound: candidate.currentRound?.name || null,
    }));

    res.json(formattedCandidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};