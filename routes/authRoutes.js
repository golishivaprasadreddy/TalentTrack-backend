const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/candidates', authMiddleware, authController.getAllCandidates);

module.exports = router;
