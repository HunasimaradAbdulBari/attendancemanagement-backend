const express = require('express');
const router = express.Router();
const {
  login,
  registerParent,
  registerTeacher,
  registerStudent,
  getProfile,
  updateProfile,
  deleteUser,
  getAllStudents,
  getAllTeachers,
  getAllParents
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Authentication routes
router.post('/login', login);
router.post('/register/parent', registerParent);
router.post('/register/teacher', registerTeacher);
router.post('/register/student', registerStudent);

// Profile routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.delete('/profile', authMiddleware, deleteUser);

// Admin routes for getting all users
router.get('/students', authMiddleware, roleMiddleware('teacher'), getAllStudents);
router.get('/teachers', authMiddleware, roleMiddleware('teacher'), getAllTeachers);
router.get('/parents', authMiddleware, roleMiddleware('teacher'), getAllParents);

module.exports = router;