const Attendance = require('../models/Attendance');
const Student = require('../models/student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const { sendNotification } = require('../utils/sendNotification');

// Take Attendance (Teacher)
exports.takeAttendance = async (req, res) => {
  try {
    const { attendanceData, classInfo } = req.body;
    const teacherId = req.user.id;

    if (!attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Attendance data is required and must be a non-empty array' 
      });
    }

    if (!classInfo || !classInfo.class || !classInfo.section || !classInfo.subject || !classInfo.date) {
      return res.status(400).json({ 
        success: false,
        message: 'Class information (class, section, subject, date) is required' 
      });
    }

    const attendanceRecords = [];
    const errors = [];
    
    for (const record of attendanceData) {
      try {
        if (!record.studentId || !record.status) {
          errors.push({ studentId: record.studentId, error: 'Student ID and status are required' });
          continue;
        }

        // Check if attendance already exists for this student, date, and period
        const existingAttendance = await Attendance.findOne({
          student: record.studentId,
          date: new Date(classInfo.date),
          period: classInfo.period || 1,
          subject: classInfo.subject
        });

        if (existingAttendance) {
          // Update existing attendance
          existingAttendance.status = record.status;
          existingAttendance.remarks = record.remarks || '';
          existingAttendance.teacher = teacherId;
          await existingAttendance.save();
          attendanceRecords.push(existingAttendance);
        } else {
          // Create new attendance record
          const attendance = new Attendance({
            student: record.studentId,
            teacher: teacherId,
            class: classInfo.class,
            section: classInfo.section,
            subject: classInfo.subject,
            date: new Date(classInfo.date),
            status: record.status,
            period: classInfo.period || 1,
            remarks: record.remarks || ''
          });

          await attendance.save();
          attendanceRecords.push(attendance);
        }

        // Send notification if student is absent
        if (record.status === 'absent') {
          try {
            const student = await Student.findById(record.studentId).populate('parentId');
            if (student && student.parentId) {
              await sendNotification(student, student.parentId, classInfo);
            }
          } catch (notificationError) {
            console.error('Notification error for student:', record.studentId, notificationError);
            // Don't fail the entire request for notification errors
          }
        }
      } catch (recordError) {
        console.error('Error processing attendance record:', recordError);
        errors.push({ studentId: record.studentId, error: recordError.message });
      }
    }

    if (attendanceRecords.length === 0 && errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to record any attendance',
        errors: errors
      });
    }

    res.status(201).json({
      success: true,
      message: `Attendance recorded successfully for ${attendanceRecords.length} students`,
      data: {
        recordsCreated: attendanceRecords.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('Error taking attendance:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get Students by Class (Teacher) - FIXED VERSION
exports.getStudentsByClass = async (req, res) => {
  try {
    const { class: className, section } = req.params;
    
    if (!className || !section) {
      return res.status(400).json({
        success: false,
        message: 'Class and section parameters are required'
      });
    }

    const students = await Student.find({
      class: className,
      section: section,
      isActive: true
    })
    .select('name rollNumber email class section')
    .sort({ rollNumber: 1 });

    res.json({ 
      success: true, 
      data: {
        students: students,
        count: students.length
      }
    });
  } catch (error) {
    console.error('Error getting students by class:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get Student Attendance (Student/Parent)
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    let query = { student: studentId };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('teacher', 'name')
      .sort({ date: -1, period: 1 });

    // Calculate attendance statistics
    const totalClasses = attendanceRecords.length;
    const presentClasses = attendanceRecords.filter(record => record.status === 'present').length;
    const absentClasses = totalClasses - presentClasses;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    res.json({
      success: true,
      data: {
        attendance: attendanceRecords,
        statistics: {
          totalClasses,
          presentClasses,
          absentClasses,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Error getting student attendance:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get Attendance Report (Teacher)
exports.getAttendanceReport = async (req, res) => {
  try {
    const { class: className, section, date, subject } = req.query;
    const teacherId = req.user.id;

    let query = { teacher: teacherId };
    
    if (className) query.class = className;
    if (section) query.section = section;
    if (subject) query.subject = subject;
    if (date) {
      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('student', 'name rollNumber class section')
      .sort({ date: -1, period: 1 });

    // Group by date for better organization
    const groupedRecords = {};
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toDateString();
      if (!groupedRecords[dateKey]) {
        groupedRecords[dateKey] = [];
      }
      groupedRecords[dateKey].push(record);
    });

    res.json({ 
      success: true, 
      data: {
        records: attendanceRecords,
        groupedRecords: groupedRecords,
        totalRecords: attendanceRecords.length
      }
    });
  } catch (error) {
    console.error('Error getting attendance report:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};