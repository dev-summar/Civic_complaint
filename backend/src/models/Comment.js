const mongoose = require('mongoose');

const ATTACHMENT_SCHEMA = {
  url: {
    type: String,
    required: [true, 'Attachment URL is required'],
    trim: true,
  },
  publicId: {
    type: String,
    trim: true,
    default: null,
  },
  mimeType: {
    type: String,
    trim: true,
    default: null,
  },
  fileName: {
    type: String,
    trim: true,
    default: null,
  },
};

const commentSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: 3000,
    },
    attachments: {
      type: [ATTACHMENT_SCHEMA],
      default: [],
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

commentSchema.index({ complaintId: 1, createdAt: 1 });
commentSchema.index({ complaintId: 1, isInternal: 1, createdAt: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
