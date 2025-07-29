const Attendance = require('../models/Attendance');
const Student = require('../models/student'); // Note: lowercase 's' as per your file
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const { sendNotification } = require('../utils/sendNotification');

// Updated AttendanceGrid.jsx submitAttendance function (for reference)
/*
  const submitAttendance = async () => {
    setSubmitting(true);
    try {
      const attendanceArray = Object.values(attendanceData);

      const payload = {
        attendanceData: attendanceArray,
        classInfo: {
          class: classInfo.class,
          section: classInfo.section,
          subject: classInfo.subject,
          period: classInfo.period,
          date: new Date().toISOString().split('T')[0]
        }
      };

      const response = await attendanceAPI.takeAttendance(payload);

      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        
        if (response.data.errors && response.data.errors.length > 0) {
          console.warn('Some records had issues:', response.data.errors);
          alert(`⚠️ Warning: ${response.data.errors.length} records had issues. Check console for details.`);
        }

        const absentStudents = attendanceArray.filter(record => record.status === 'absent');
        if (absentStudents.length > 0) {
          alert(`ℹ️ ${absentStudents.length} students marked absent. Notifications sent.`);
        }
      } else {
        throw new Error(response.data.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      
      let errorMessage = 'Failed to submit attendance';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };
*/

// Take Attendance (Teacher) - FIXED VERSION
exports.takeAttendance = async (req, res) => {
  try {
    const { attendanceData, classInfo } = req.body;
    const teacherId = req.user.id;

    const attendanceRecords = [];
    const errors = [];
    
    for (const record of attendanceData) {
      try {
        // Use findOneAndUpdate with upsert to handle duplicates
        const filter = {
          student: record.studentId,
          teacher: teacherId,
          class: classInfo.class,
          section: classInfo.section,
          subject: classInfo.subject,
          date: new Date(classInfo.date),
          period: classInfo.period
        };

        const updateData = {
          ...filter,
          status: record.status,
          remarks: record.remarks || '',
          updatedAt: new Date()
        };

        const attendance = await Attendance.findOneAndUpdate(
          filter,
          updateData,
          { 
            upsert: true, 
            new: true,
            runValidators: true
          }
        );

        attendanceRecords.push(attendance);

        // Send notification if student is absent
        if (record.status === 'absent') {
          const student = await Student.findById(record.studentId).populate('parentId');
          if (student && student.parentId) {
            await sendNotification(student, student.parentId, classInfo);
          }
        }
      } catch (error) {
        console.error(`Error processing attendance for student ${record.studentId}:`, error);
        errors.push({
          studentId: record.studentId,
          error: error.message
        });
      }
    }

    // Return success even if some records had issues
    res.status(201).json({
      success: true,
      message: `Attendance recorded successfully. Processed: ${attendanceRecords.length} records`,
      records: attendanceRecords.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in takeAttendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to record attendance',
      error: error.message 
    });
  }
};

// Get Students by Class (Teacher) - FIXED VERSION
exports.getStudentsByClass = async (req, res) => {
  try {
    const { class: className, section } = req.params;
    
    // Using Student model instead of User model
    const students = await Student.find({
      class: className,
      section: section,
      isActive: true
    }).select('name rollNumber email class section');

    res.json({ 
      success: true, 
      students,
      count: students.length 
    });
  } catch (error) {
    console.error('Error in getStudentsByClass:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch students',
      error: error.message 
    });
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
    console.error('Error in getStudentAttendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch student attendance',
      error: error.message 
    });
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

    res.json({ 
      success: true, 
      records: attendanceRecords 
    });
  } catch (error) {
    console.error('Error in getAttendanceReport:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch attendance report',
      error: error.message 
    });
  }
};