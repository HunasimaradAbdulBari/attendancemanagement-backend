const Student = require('../models/student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const Attendance = require('../models/Attendance');

// Get Notifications (Enhanced with real data)
exports.getNotifications = async (req, res) => {
  try {
    const { id, userType } = req.user;
    const { page = 1, limit = 10, unreadOnly = false } = req.query;

    let notifications = [];

    if (userType === 'parent') {
      // Get notifications for parent about their children's attendance
      const parent = await Parent.findById(id).populate('children');
      
      if (parent && parent.children && parent.children.length > 0) {
        // Get recent absences for all children
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        for (const child of parent.children) {
          const absentRecords = await Attendance.find({
            student: child._id,
            status: 'absent',
            date: { $gte: sevenDaysAgo }
          })
          .populate('teacher', 'name')
          .sort({ date: -1 })
          .limit(5);

          absentRecords.forEach(record => {
            notifications.push({
              id: record._id,
              type: 'attendance_alert',
              title: 'Attendance Alert',
              message: `${child.name} was absent in ${record.subject} class on ${record.date.toDateString()}`,
              data: {
                studentName: child.name,
                subject: record.subject,
                date: record.date,
                teacher: record.teacher?.name,
                class: record.class,
                section: record.section
              },
              date: record.date,
              read: false,
              priority: 'medium'
            });
          });
        }

        // Add summary notification if there are multiple absences
        const totalAbsences = notifications.length;
        if (totalAbsences > 0) {
          notifications.unshift({
            id: `parent_summary_${id}`,
            type: 'attendance_summary',
            title: 'Weekly Attendance Summary',
            message: `Your children have ${totalAbsences} absence(s) this week`,
            data: {
              totalAbsences,
              childrenCount: parent.children.length,
              weekPeriod: '7 days'
            },
            date: new Date(),
            read: false,
            priority: totalAbsences > 3 ? 'high' : 'medium'
          });
        }
      }
    } else if (userType === 'student') {
      // Get notifications for student about their own attendance
      const recentAttendance = await Attendance.find({
        student: id,
        date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
      .populate('teacher', 'name')
      .sort({ date: -1 })
      .limit(10);

      const absentCount = recentAttendance.filter(record => record.status === 'absent').length;
      const presentCount = recentAttendance.filter(record => record.status === 'present').length;
      
      // Add attendance summary notification
      if (recentAttendance.length > 0) {
        const attendancePercentage = Math.round(((presentCount) / recentAttendance.length) * 100);
        
        notifications.push({
          id: `student_summary_${id}`,
          type: 'attendance_summary',
          title: 'Weekly Attendance Summary',
          message: `Your attendance: ${attendancePercentage}% (${presentCount} present, ${absentCount} absent)`,
          data: {
            absentCount,
            presentCount,
            totalClasses: recentAttendance.length,
            attendancePercentage
          },
          date: new Date(),
          read: false,
          priority: attendancePercentage < 75 ? 'high' : absentCount > 0 ? 'medium' : 'low'
        });
      }

      // Add individual absence notifications
      const absentRecords = recentAttendance.filter(record => record.status === 'absent');
      absentRecords.forEach(record => {
        notifications.push({
          id: record._id,
          type: 'attendance_alert',
          title: 'Absence Recorded',
          message: `You were absent in ${record.subject} class on ${record.date.toDateString()}`,
          data: {
            subject: record.subject,
            date: record.date,
            teacher: record.teacher?.name,
            class: record.class,
            section: record.section,
            period: record.period
          },
          date: record.date,
          read: false,
          priority: 'medium'
        });
      });

    } else if (userType === 'teacher') {
      // Get notifications for teacher about classes and attendance
      const teacher = await Teacher.findById(id);
      
      if (teacher && teacher.assignedClasses && teacher.assignedClasses.length > 0) {
        // Welcome notification
        notifications.push({
          id: `teacher_welcome_${id}`,
          type: 'info',
          title: 'Welcome Teacher',
          message: `You have ${teacher.assignedClasses.length} assigned classes`,
          data: {
            assignedClasses: teacher.assignedClasses.length,
            subjects: teacher.subjects || []
          },
          date: new Date(),
          read: false,
          priority: 'low'
        });

        // Get recent attendance statistics for teacher's classes
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        
        for (const assignedClass of teacher.assignedClasses) {
          try {
            const recentAttendance = await Attendance.find({
              teacher: id,
              class: assignedClass.class,
              section: assignedClass.section,
              subject: assignedClass.subject,
              date: { $gte: threeDaysAgo }
            });

            if (recentAttendance.length > 0) {
              const absentCount = recentAttendance.filter(record => record.status === 'absent').length;
              const attendanceRate = Math.round(((recentAttendance.length - absentCount) / recentAttendance.length) * 100);

              if (absentCount > 0) {
                notifications.push({
                  id: `class_attendance_${assignedClass.class}_${assignedClass.section}_${assignedClass.subject}`,
                  type: 'class_update',
                  title: 'Class Attendance Update',
                  message: `${assignedClass.class}-${assignedClass.section} ${assignedClass.subject}: ${absentCount} absences in last 3 days`,
                  data: {
                    class: assignedClass.class,
                    section: assignedClass.section,
                    subject: assignedClass.subject,
                    absentCount,
                    totalRecords: recentAttendance.length,
                    attendanceRate,
                    period: '3 days'
                  },
                  date: new Date(),
                  read: false,
                  priority: absentCount > 5 ? 'high' : 'medium'
                });
              }
            }
          } catch (classError) {
            console.error('Error fetching class attendance:', classError);
            // Continue processing other classes
          }
        }
      }

      // Add reminder notifications for pending attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if teacher has taken attendance today
      const todayAttendance = await Attendance.find({
        teacher: id,
        date: { $gte: today }
      });

      if (todayAttendance.length === 0 && teacher.assignedClasses && teacher.assignedClasses.length > 0) {
        notifications.push({
          id: `attendance_reminder_${id}`,
          type: 'reminder',
          title: 'Attendance Reminder',
          message: 'Don\'t forget to take attendance for your classes today',
          data: {
            assignedClasses: teacher.assignedClasses,
            reminderType: 'daily_attendance'
          },
          date: new Date(),
          read: false,
          priority: 'medium'
        });
      }

    } else if (userType === 'admin') {
      // Get notifications for admin about system activities
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      try {
        // Get recent registrations
        const [newStudents, newTeachers, newParents] = await Promise.all([
          Student.countDocuments({ createdAt: { $gte: oneDayAgo } }),
          Teacher.countDocuments({ createdAt: { $gte: oneDayAgo } }),
          Parent.countDocuments({ createdAt: { $gte: oneDayAgo } })
        ]);

        const totalNewUsers = newStudents + newTeachers + newParents;

        if (totalNewUsers > 0) {
          notifications.push({
            id: `admin_new_users_${Date.now()}`,
            type: 'system_update',
            title: 'New User Registrations',
            message: `${totalNewUsers} new users registered in the last 24 hours`,
            data: {
              newStudents,
              newTeachers,
              newParents,
              totalNewUsers,
              period: '24 hours'
            },
            date: new Date(),
            read: false,
            priority: 'low'
          });
        }

        // Get attendance statistics for today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayAttendanceCount = await Attendance.countDocuments({
          date: { $gte: todayStart, $lte: todayEnd }
        });

        if (todayAttendanceCount > 0) {
          notifications.push({
            id: `admin_attendance_stats_${Date.now()}`,
            type: 'daily_stats',
            title: 'Daily Attendance Statistics',
            message: `${todayAttendanceCount} attendance records created today`,
            data: {
              totalAttendanceRecords: todayAttendanceCount,
              date: todayStart,
              type: 'daily_summary'
            },
            date: new Date(),
            read: false,
            priority: 'low'
          });
        }

      } catch (adminError) {
        console.error('Error fetching admin notifications:', adminError);
      }
    }

    // Sort notifications by priority and date (high priority first, then newest first)
    notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      return new Date(b.date) - new Date(a.date); // Newer first
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    // Filter unread only if requested
    const filteredNotifications = unreadOnly === 'true' 
      ? paginatedNotifications.filter(n => !n.read)
      : paginatedNotifications;

    res.json({
      success: true,
      data: {
        notifications: filteredNotifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(notifications.length / limit),
          total: notifications.length,
          hasNext: endIndex < notifications.length,
          hasPrev: page > 1
        },
        summary: {
          total: notifications.length,
          unread: notifications.filter(n => !n.read).length,
          byPriority: {
            high: notifications.filter(n => n.priority === 'high').length,
            medium: notifications.filter(n => n.priority === 'medium').length,
            low: notifications.filter(n => n.priority === 'low').length
          },
          byType: notifications.reduce((acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Mark Notification as Read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { id: userId } = req.user;
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required'
      });
    }

    // In a real implementation, you would update the notification status in the database
    // For now, we'll just return success
    // This is a placeholder implementation since we don't have a notifications collection
    
    console.log(`📝 Marking notification ${notificationId} as read for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notificationId,
        userId,
        readAt: new Date()
      }
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get Notification Summary (Additional endpoint for dashboard widgets)
exports.getNotificationSummary = async (req, res) => {
  try {
    const { id, userType } = req.user;
    
    let summary = {
      totalUnread: 0,
      byPriority: { high: 0, medium: 0, low: 0 },
      byType: {},
      latestNotification: null
    };

    // This would typically query a notifications collection
    // For now, we'll return a basic summary based on recent data
    
    if (userType === 'parent') {
      const parent = await Parent.findById(id).populate('children');
      if (parent && parent.children && parent.children.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        let totalAbsences = 0;
        for (const child of parent.children) {
          const absentCount = await Attendance.countDocuments({
            student: child._id,
            status: 'absent',
            date: { $gte: sevenDaysAgo }
          });
          totalAbsences += absentCount;
        }
        
        summary.totalUnread = totalAbsences;
        summary.byPriority.medium = totalAbsences;
        summary.byType.attendance_alert = totalAbsences;
      }
    } else if (userType === 'student') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const absentCount = await Attendance.countDocuments({
        student: id,
        status: 'absent',
        date: { $gte: sevenDaysAgo }
      });
      
      summary.totalUnread = absentCount > 0 ? absentCount + 1 : 1; // +1 for summary
      summary.byPriority.medium = absentCount;
      summary.byPriority.low = 1;
      summary.byType.attendance_summary = 1;
      summary.byType.attendance_alert = absentCount;
    } else if (userType === 'teacher') {
      // Basic teacher summary
      const teacher = await Teacher.findById(id);
      summary.totalUnread = teacher && teacher.assignedClasses ? teacher.assignedClasses.length + 1 : 1;
      summary.byPriority.low = 1;
      summary.byPriority.medium = teacher && teacher.assignedClasses ? teacher.assignedClasses.length : 0;
      summary.byType.info = 1;
      summary.byType.class_update = teacher && teacher.assignedClasses ? teacher.assignedClasses.length : 0;
    }

    res.json({
      success: true,
      data: {
        summary
      }
    });
  } catch (error) {
    console.error('Get notification summary error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};