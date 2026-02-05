const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const crypto = require('crypto');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'candidate',
    });

    await user.save();

    // If candidate role, create candidate profile and auto-assign to Round 1
    if (role === 'candidate') {
      const candidateId = `CAND-${Date.now()}`;
      const candidate = new Candidate({
        user: user._id,
        candidateId,
        name,
        email,
      });
      await candidate.save();
      user.candidateId = candidateId;
      await user.save();

      // Auto-assign to Round 1 of all active drives
      const Round = require('../models/Round');
      const round1s = await Round.find({ sequenceNumber: 1 });
      for (const round of round1s) {
        if (!round.candidates.includes(candidate._id)) {
          round.candidates.push(candidate._id);
          await round.save();
        }
      }

      // Set currentRound to first Round 1 found
      if (round1s.length > 0) {
        candidate.currentRound = round1s[0]._id;
        await candidate.save();
      }
    }

    const token = generateToken(user);

    res.json({
      message: 'Registration successful',
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const candidate = await Candidate.findOne({ user: req.user.id });

    res.json({
      user,
      candidateDetails: candidate || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all candidates (for admin to assign to drives/rounds)
exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find()
      .populate('user', 'name email')
      .select('_id candidateId name email phone status');

    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Forgot password - simple password change
exports.forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    const trimmedEmail = email.trim();
    const emailRegex = new RegExp(`^${escapeRegex(trimmedEmail)}$`, 'i');

    // Find user by email
    const user = await User.findOne({ email: { $regex: emailRegex } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password directly
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password updated successfully',
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset password - deprecated, use forgotPassword instead
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    const trimmedEmail = email.trim();
    const emailRegex = new RegExp(`^${escapeRegex(trimmedEmail)}$`, 'i');

    const user = await User.findOne({ email: { $regex: emailRegex } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password reset successful',
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
