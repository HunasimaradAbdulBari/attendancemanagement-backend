const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  authorType: {
    type: String,
    enum: ['teacher', 'admin'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'parents', 'teachers'],
    default: 'all'
  },
  targetClasses: [{
    class: String,
    section: String
  }],
  attachments: [{
    filename: String,
    url: String,
    fileType: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userType: {
      type: String,
      enum: ['Student', 'Parent', 'Teacher', 'Admin'],
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ targetAudience: 1, isActive: 1 });
announcementSchema.index({ 'targetClasses.class': 1, 'targetClasses.section': 1 });

module.exports = mongoose.model('Announcement', announcementSchema);