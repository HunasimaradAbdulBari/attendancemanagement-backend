const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { sendNotification } = require('../utils/sendNotification');

// Take Attendance (Teacher)
exports.takeAttendance = async (req, res) => {
  try {
    const { attendanceData, classInfo } = req.body;
    const teacherId = req.user.id;

    const attendanceRecords = [];
    
    for (const record of attendanceData) {
      const attendance = new Attendance({
        student: record.studentId,
        teacher: teacherId,
        class: classInfo.class,
        section: classInfo.section,
        subject: classInfo.subject,
        date: new Date(classInfo.date),
        status: record.status,
        period: classInfo.period,
        remarks: record.remarks
      });

      await attendance.save();
      attendanceRecords.push(attendance);

      // Send notification if student is absent
      if (record.status === 'absent') {
        const student = await User.findById(record.studentId).populate('parentId');
        if (student && student.parentId) {
          await sendNotification(student, student.parentId, classInfo);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      records: attendanceRecords.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Students by Class (Teacher)
exports.getStudentsByClass = async (req, res) => {
  try {
    const { class: className, section } = req.params;
    
    const students = await User.find({
      role: 'student',
      class: className,
      section: section,
      isActive: true
    }).select('name rollNumber email');

    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Student Attendance (Student/Parent)
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    let query = { student: studentId };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('teacher', 'name')
      .sort({ date: -1 });

    // Calculate attendance percentage
    const totalClasses = attendanceRecords.length;
    const presentClasses = attendanceRecords.filter(record => record.status === 'present').length;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    res.json({
      success: true,
      attendance: attendanceRecords,
      statistics: {
        totalClasses,
        presentClasses,
        absentClasses: totalClasses - presentClasses,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Attendance Report (Teacher)
exports.getAttendanceReport = async (req, res) => {
  try {
    const { class: className, section, date } = req.query;
    const teacherId = req.user.id;

    let query = { teacher: teacherId };
    
    if (className) query.class = className;
    if (section) query.section = section;
    if (date) query.date = new Date(date);

    const attendanceRecords = await Attendance.find(query)
      .populate('student', 'name rollNumber')
      .sort({ date: -1, period: 1 });

    res.json({ success: true, records: attendanceRecords });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};