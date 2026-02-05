const express = require('express');
const panelController = require('../controllers/panelController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// All panel routes require authentication and panel role
router.use(authMiddleware, roleMiddleware(['panel']));

// Get assigned rounds
router.get('/rounds', panelController.getAssignedRounds);

// Get candidates for a round
router.get('/rounds/:roundId/candidates', panelController.getAssignedCandidates);

// Submit evaluation
router.post('/rounds/:roundId/candidates/:candidateId/evaluate', panelController.submitEvaluation);

// Get all evaluations for a round
router.get('/rounds/:roundId/evaluations', panelController.getEvaluations);

// Get specific candidate evaluation details
router.get('/rounds/:roundId/candidates/:candidateId/evaluations', panelController.getCandidateEvaluation);

module.exports = router;
