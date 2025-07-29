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

// Profile routes (require authentication)
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.delete('/profile', authMiddleware, deleteUser);

// Admin/Teacher routes for getting all users (updated permissions)
router.get('/students', authMiddleware, roleMiddleware('teacher', 'admin'), getAllStudents);
router.get('/teachers', authMiddleware, roleMiddleware('admin'), getAllTeachers);
router.get('/parents', authMiddleware, roleMiddleware('admin'), getAllParents);

module.exports = router;