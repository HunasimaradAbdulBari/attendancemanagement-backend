const Announcement = require('../models/Announcement');
const Student = require('../models/student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');

// Create Announcement (Teacher/Admin)
exports.createAnnouncement = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      priority, 
      targetAudience, 
      targetClasses,
      expiryDate 
    } = req.body;
    
    const { id, userType } = req.user;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high'
      });
    }

    if (targetAudience && !['all', 'students', 'parents', 'teachers'].includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'Target audience must be all, students, parents, or teachers'
      });
    }

    const announcement = new Announcement({
      title,
      content,
      author: id,
      authorType: userType,
      priority: priority || 'medium',
      targetAudience: targetAudience || 'all',
      targetClasses: targetClasses || [],
      expiryDate: expiryDate ? new Date(expiryDate) : null
    });

    await announcement.save();
    await announcement.populate('author', 'name email');

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: {
        announcement
      }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get Announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const { userType } = req.user;
    const { page = 1, limit = 10, priority, active = true } = req.query;
    
    // Build query based on user type and targeting
    let query = { 
      isActive: active === 'true'
    };

    // Filter expired announcements
    const currentDate = new Date();
    query.$and = [
      {
        $or: [
          { expiryDate: null },
          { expiryDate: { $gte: currentDate } }
        ]
      }
    ];

    // Target audience filtering
    let audienceQuery = [
      { targetAudience: 'all' }
    ];

    if (userType === 'student') {
      audienceQuery.push({ targetAudience: 'students' });
      
      // Add class-specific targeting for students
      const user = req.user;
      if (user.class && user.section) {
        audienceQuery.push({
          'targetClasses': {
            $elemMatch: {
              class: user.class,
              section: user.section
            }
          }
        });
      }
    } else if (userType === 'parent') {
      audienceQuery.push({ targetAudience: 'parents' });
    } else if (userType === 'teacher') {
      audienceQuery.push({ targetAudience: 'teachers' });
    }

    query.$and.push({ $or: audienceQuery });

    if (priority) {
      query.priority = priority;
    }

    const announcements = await Announcement.find(query)
      .populate('author', 'name')
      .sort({ priority: -1, publishDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Announcement.countDocuments(query);

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Update Announcement (Author only)
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, userType } = req.user;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Announcement ID is required'
      });
    }

    const announcement = await Announcement.findById(id);
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: 'Announcement not found' 
      });
    }

    // Check if user is the author or admin
    if (announcement.author.toString() !== userId && userType !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this announcement' 
      });
    }

    // Remove sensitive fields
    delete updateData._id;
    delete updateData.__v;
    delete updateData.author;
    delete updateData.authorType;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Validate priority if provided
    if (updateData.priority && !['low', 'medium', 'high'].includes(updateData.priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high'
      });
    }

    // Validate targetAudience if provided
    if (updateData.targetAudience && !['all', 'students', 'parents', 'teachers'].includes(updateData.targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'Target audience must be all, students, parents, or teachers'
      });
    }

    // Convert expiryDate to Date object if provided
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name');

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: {
        announcement: updatedAnnouncement
      }
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Delete Announcement (Author/Admin only)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, userType } = req.user;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Announcement ID is required'
      });
    }

    const announcement = await Announcement.findById(id);
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: 'Announcement not found' 
      });
    }

    // Check if user is the author or admin
    if (announcement.author.toString() !== userId && userType !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this announcement' 
      });
    }

    await Announcement.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Mark Announcement as Read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, userType } = req.user;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Announcement ID is required'
      });
    }

    const announcement = await Announcement.findById(id);
    
    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: 'Announcement not found' 
      });
    }

    // Check if user already marked as read
    const alreadyRead = announcement.readBy.some(
      reader => reader.user.toString() === userId
    );

    if (!alreadyRead) {
      announcement.readBy.push({
        user: userId,
        userType: userType.charAt(0).toUpperCase() + userType.slice(1)
      });
      
      await announcement.save();
    }

    res.json({
      success: true,
      message: 'Announcement marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get Announcement Statistics (Admin/Teacher)
exports.getAnnouncementStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Announcement ID is required'
      });
    }

    const announcement = await Announcement.findById(id)
      .populate('readBy.user', 'name email')
      .populate('author', 'name');

    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: 'Announcement not found' 
      });
    }

    // Calculate total potential audience based on targetAudience
    let totalPotentialReaders = 0;
    
    try {
      if (announcement.targetAudience === 'all') {
        const [students, teachers, parents] = await Promise.all([
          Student.countDocuments({ isActive: true }),
          Teacher.countDocuments({ isActive: true }),
          Parent.countDocuments({ isActive: true })
        ]);
        totalPotentialReaders = students + teachers + parents;
      } else if (announcement.targetAudience === 'students') {
        if (announcement.targetClasses && announcement.targetClasses.length > 0) {
          // Count students in specific classes
          for (const classInfo of announcement.targetClasses) {
            const count = await Student.countDocuments({
              class: classInfo.class,
              section: classInfo.section,
              isActive: true
            });
            totalPotentialReaders += count;
          }
        } else {
          totalPotentialReaders = await Student.countDocuments({ isActive: true });
        }
      } else if (announcement.targetAudience === 'parents') {
        totalPotentialReaders = await Parent.countDocuments({ isActive: true });
      } else if (announcement.targetAudience === 'teachers') {
        totalPotentialReaders = await Teacher.countDocuments({ isActive: true });
      }
    } catch (countError) {
      console.error('Error calculating potential readers:', countError);
      // Continue with stats calculation even if count fails
    }

    const stats = {
      totalReads: announcement.readBy.length,
      readByUsers: announcement.readBy,
      totalPotentialReaders,
      readPercentage: totalPotentialReaders > 0 
        ? Math.round((announcement.readBy.length / totalPotentialReaders) * 100) 
        : 0
    };

    res.json({
      success: true,
      data: {
        announcement,
        stats
      }
    });
  } catch (error) {
    console.error('Get announcement stats error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};