const express = require('express');
const router = express.Router();
const {
  login,
  registerParent,
  registerTeacher,
  registerStudent,
  getProfile
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/login', login);
router.post('/register/parent', registerParent);
router.post('/register/teacher', registerTeacher);
router.post('/register/student', registerStudent);
router.get('/profile', authMiddleware, getProfile);

module.exports = router;