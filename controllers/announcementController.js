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
      announcement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Announcements - FIXED
exports.getAnnouncements = async (req, res) => {
  try {
    const { userType } = req.user;
    const { page = 1, limit = 10, priority, active = true } = req.query;
    
    let query = { 
      isActive: active === 'true',
      $or: [
        { targetAudience: 'all' },
        { targetAudience: userType === 'student' ? 'students' : userType === 'parent' ? 'parents' : userType }
      ]
    };

    // Add class filter for students
    if (userType === 'student') {
      const user = req.user;
      query.$or.push({
        'targetClasses': {
          $elemMatch: {
            class: user.class,
            section: user.section
          }
        }
      });
    }

    if (priority) {
      query.priority = priority;
    }

    // Filter out expired announcements - FIXED
    query.$or.push(
      { expiryDate: null },
      { expiryDate: { $gte: new Date() } }
    );

    const announcements = await Announcement.find(query)
      .populate('author', 'name')
      .sort({ publishDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Announcement.countDocuments(query);

    res.json({
      success: true,
      announcements,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Rest of the functions remain the same...
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, userType } = req.user;
    const updateData = req.body;

    const announcement = await Announcement.findById(id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user is the author or admin
    if (announcement.author.toString() !== userId && userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this announcement' });
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name');

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: updatedAnnouncement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, userType } = req.user;

    const announcement = await Announcement.findById(id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if user is the author or admin
    if (announcement.author.toString() !== userId && userType !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this announcement' });
    }

    await Announcement.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, userType } = req.user;

    const announcement = await Announcement.findById(id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
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
    res.status(500).json({ message: error.message });
  }
};

exports.getAnnouncementStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findById(id)
      .populate('readBy.user', 'name email')
      .populate('author', 'name');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const stats = {
      totalReads: announcement.readBy.length,
      readByUsers: announcement.readBy,
      readPercentage: 0 // Would need total target users to calculate
    };

    res.json({
      success: true,
      announcement,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};