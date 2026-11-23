const mongoose = require('mongoose');

const ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REASSIGNED: 'reassigned',
};

const assignmentSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
      index: true,
    },
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Officer reference is required'],
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigning user reference is required'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ASSIGNMENT_STATUS),
        message: '{VALUE} is not a valid assignment status',
      },
      default: ASSIGNMENT_STATUS.PENDING,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

assignmentSchema.index({ complaintId: 1, status: 1 });
assignmentSchema.index({ officerId: 1, status: 1, assignedAt: -1 });
assignmentSchema.index({ workerId: 1, status: 1, assignedAt: -1 });

assignmentSchema.pre('save', function setLifecycleTimestamps() {
  if (this.isModified('status')) {
    if (this.status === ASSIGNMENT_STATUS.ACTIVE && !this.startedAt) {
      this.startedAt = new Date();
    }
    if (this.status === ASSIGNMENT_STATUS.COMPLETED && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
module.exports.ASSIGNMENT_STATUS = ASSIGNMENT_STATUS;
