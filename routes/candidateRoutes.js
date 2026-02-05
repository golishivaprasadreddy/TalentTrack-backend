const express = require('express');
const candidateController = require('../controllers/candidateController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// All candidate routes require authentication and candidate role
router.use(authMiddleware, roleMiddleware(['candidate']));

// Get dashboard
router.get('/dashboard', candidateController.getDashboard);

// Get selection status only
router.get('/status', candidateController.getSelectionStatus);

module.exports = router;
