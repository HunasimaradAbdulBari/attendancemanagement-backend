// Enhanced notification service with better error handling and logging
// You can integrate with Firebase, Twilio, SendGrid, or any other service

const sendNotification = async (student, parent, classInfo) => {
  try {
    if (!student || !parent || !classInfo) {
      throw new Error('Missing required parameters: student, parent, or classInfo');
    }

    // Validate required fields
    if (!student.name || !parent.email || !classInfo.subject || !classInfo.date) {
      throw new Error('Missing required fields in student, parent, or classInfo objects');
    }

    // Format date for better readability
    const formattedDate = new Date(classInfo.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create notification data
    const notificationData = {
      to: parent.email,
      subject: `Attendance Alert - ${student.name}`,
      message: `Dear Parent,\n\nYour child ${student.name} was marked absent in ${classInfo.subject} class on ${formattedDate}.\n\nClass: ${classInfo.class}-${classInfo.section}\nSubject: ${classInfo.subject}\nPeriod: ${classInfo.period || 'N/A'}\nDate: ${formattedDate}\n\nPlease contact the school if you have any questions.\n\nBest regards,\nSchool Administration`,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        class: student.class,
        section: student.section
      },
      parent: {
        name: parent.name,
        email: parent.email,
        phone: parent.phone
      },
      classInfo: {
        class: classInfo.class,
        section: classInfo.section,
        subject: classInfo.subject,
        period: classInfo.period,
        date: classInfo.date
      },
      timestamp: new Date(),
      type: 'absence_alert'
    };

    // Log the notification for debugging
    console.log('📧 Sending absence notification:', {
      student: student.name,
      parent: parent.email,
      subject: classInfo.subject,
      date: formattedDate
    });

    // Here you would integrate with actual notification services
    // Examples:

    // 1. Email Service (SendGrid, Nodemailer, etc.)
    // await emailService.send({
    //   to: notificationData.to,
    //   subject: notificationData.subject,
    //   html: generateEmailTemplate(notificationData)
    // });

    // 2. SMS Service (Twilio, etc.)
    // if (parent.phone) {
    //   await smsService.send({
    //     to: parent.phone,
    //     message: `${student.name} was absent in ${classInfo.subject} on ${formattedDate}. Please check your email for details.`
    //   });
    // }

    // 3. Push Notification Service (Firebase, etc.)
    // await pushService.send({
    //   userId: parent._id,
    //   title: 'Attendance Alert',
    //   body: `${student.name} was absent in ${classInfo.subject}`,
    //   data: notificationData
    // });

    // 4. In-app Notification (save to database)
    // await Notification.create({
    //   userId: parent._id,
    //   userType: 'parent',
    //   type: 'absence_alert',
    //   title: 'Attendance Alert',
    //   message: notificationData.message,
    //   data: notificationData,
    //   isRead: false
    // });

    // Simulate successful notification
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation

    console.log('✅ Notification sent successfully to:', parent.email);
    
    return { 
      success: true, 
      message: 'Notification sent successfully',
      data: {
        recipientEmail: parent.email,
        studentName: student.name,
        subject: classInfo.subject,
        date: formattedDate,
        sentAt: new Date()
      }
    };

  } catch (error) {
    console.error('❌ Notification error:', {
      error: error.message,
      student: student?.name,
      parent: parent?.email,
      subject: classInfo?.subject
    });
    
    return { 
      success: false, 
      error: error.message,
      data: {
        studentName: student?.name,
        parentEmail: parent?.email,
        subject: classInfo?.subject,
        failedAt: new Date()
      }
    };
  }
};

// Helper function to generate email template (you can customize this)
const generateEmailTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
        .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Attendance Alert</h2>
        </div>
        <div class="content">
          <p>Dear Parent,</p>
          <div class="alert">
            <strong>Absence Notification</strong><br>
            Your child <strong>${data.student.name}</strong> was marked absent.
          </div>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Student: ${data.student.name}</li>
            <li>Class: ${data.classInfo.class}-${data.classInfo.section}</li>
            <li>Subject: ${data.classInfo.subject}</li>
            <li>Date: ${new Date(data.classInfo.date).toLocaleDateString()}</li>
            <li>Period: ${data.classInfo.period || 'N/A'}</li>
          </ul>
          <p>If you have any questions, please contact the school administration.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the School Attendance System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendNotification,
  generateEmailTemplate
};