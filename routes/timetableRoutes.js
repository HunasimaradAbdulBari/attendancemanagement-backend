const express = require('express');
const router = express.Router();
const {
  getTimetable,
  createTimetable,
  getTeacherClasses,
  getHolidays
} = require('../controllers/timetableController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Get timetable for a specific class and section
router.get('/:class/:section', authMiddleware, getTimetable);

// Create or update timetable (Admin only)
router.post('/', authMiddleware, roleMiddleware('admin'), createTimetable);

// Get teacher's assigned classes
router.get('/teacher/classes', authMiddleware, roleMiddleware('teacher'), getTeacherClasses);

// Get holidays for a specific class and section
router.get('/holidays/:class/:section', authMiddleware, getHolidays);

module.exports = router;