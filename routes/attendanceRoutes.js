const express = require('express');
const router = express.Router();
const {
  takeAttendance,
  getStudentsByClass,
  getStudentAttendance,
  getAttendanceReport
} = require('../controllers/attendanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/take', authMiddleware, roleMiddleware('teacher'), takeAttendance);
router.get('/students/:class/:section', authMiddleware, roleMiddleware('teacher'), getStudentsByClass);
router.get('/student/:studentId', authMiddleware, getStudentAttendance);
router.get('/report', authMiddleware, roleMiddleware('teacher'), getAttendanceReport);

module.exports = router;