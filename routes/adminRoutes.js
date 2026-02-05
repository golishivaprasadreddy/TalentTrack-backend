const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware, roleMiddleware(['admin']));

// Get all panel members
router.get('/panel-members', adminController.getPanelMembers);

// Get all candidates
router.get('/candidates', adminController.getAllCandidates);

// Recruitment drive management
router.post('/drives', adminController.createRecruitmentDrive);
router.get('/drives', adminController.getAllDrives);
router.get('/drives/:driveId', adminController.getDriveDetails);

// Round management
router.post('/drives/:driveId/rounds', adminController.addRound);

// Candidate management
router.post('/drives/:driveId/candidates', adminController.addCandidates);

// Panel assignment
router.post('/rounds/:roundId/assign-panel', adminController.assignPanelToRound);

// Add candidates to round
router.post('/rounds/:roundId/add-candidates', adminController.addCandidatesToRound);

// Results
router.get('/rounds/:roundId/results', adminController.getRoundResults);
router.put('/results/:resultId/approve', adminController.approveCandidate);

// Promote candidates to next round
router.post('/rounds/:roundId/promote', adminController.promoteToNextRound);

module.exports = router;
