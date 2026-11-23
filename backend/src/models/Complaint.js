const mongoose = require('mongoose');
const {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS,
  PRIORITY,
} = require('../utils/constants');

const MEDIA_IMAGE_SCHEMA = {
  url: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true,
  },
  publicId: {
    type: String,
    trim: true,
    default: null,
  },
  width: {
    type: Number,
    min: 0,
    default: null,
  },
  height: {
    type: Number,
    min: 0,
    default: null,
  },
};

const MEDIA_VIDEO_SCHEMA = {
  url: {
    type: String,
    required: [true, 'Video URL is required'],
    trim: true,
  },
  publicId: {
    type: String,
    trim: true,
    default: null,
  },
  duration: {
    type: Number,
    min: 0,
    default: null,
  },
};

const TIMELINE_ENTRY_SCHEMA = {
  status: {
    type: String,
    enum: {
      values: Object.values(COMPLAINT_STATUS),
      message: '{VALUE} is not a valid complaint status',
    },
    required: [true, 'Timeline status is required'],
  },
  note: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: '',
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  at: {
    type: Date,
    default: Date.now,
  },
};

const CHECKLIST_ITEM_SCHEMA = {
  item: {
    type: String,
    required: [true, 'Checklist item text is required'],
    trim: true,
    maxlength: 300,
  },
  done: {
    type: Boolean,
    default: false,
  },
};

const AI_DUPLICATE_SCHEMA = {
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: [true, 'Duplicate complaint reference is required'],
  },
  score: {
    type: Number,
    min: 0,
    max: 1,
    required: [true, 'Duplicate similarity score is required'],
  },
};

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: {
        values: COMPLAINT_CATEGORIES,
        message: '{VALUE} is not a valid complaint category',
      },
      required: [true, 'Complaint category is required'],
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(PRIORITY),
        message: '{VALUE} is not a valid priority level',
      },
      default: PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(COMPLAINT_STATUS),
        message: '{VALUE} is not a valid complaint status',
      },
      default: COMPLAINT_STATUS.DRAFT,
      index: true,
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen reference is required'],
      index: true,
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      default: null,
      index: true,
    },
    images: {
      type: [MEDIA_IMAGE_SCHEMA],
      default: [],
    },
    videos: {
      type: [MEDIA_VIDEO_SCHEMA],
      default: [],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Location coordinates are required'],
        validate: {
          validator(coords) {
            return Array.isArray(coords)
              && coords.length === 2
              && coords[0] >= -180 && coords[0] <= 180
              && coords[1] >= -90 && coords[1] <= 90;
          },
          message: 'Coordinates must be [longitude, latitude] within valid bounds',
        },
      },
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    aiClassification: {
      type: String,
      trim: true,
      default: null,
    },
    aiSeverity: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    aiSummary: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    aiEstimatedDays: {
      type: Number,
      min: 0,
      default: null,
    },
    aiDuplicates: {
      type: [AI_DUPLICATE_SCHEMA],
      default: [],
    },
    timeline: {
      type: [TIMELINE_ENTRY_SCHEMA],
      default: [],
    },
    beforePhotos: {
      type: [MEDIA_IMAGE_SCHEMA],
      default: [],
    },
    afterPhotos: {
      type: [MEDIA_IMAGE_SCHEMA],
      default: [],
    },
    checklist: {
      type: [CHECKLIST_ITEM_SCHEMA],
      default: [],
    },
    signature: {
      url: {
        type: String,
        trim: true,
        default: null,
      },
      signedAt: {
        type: Date,
        default: null,
      },
      signedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: null,
    },
    rejectedReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    resolvedAt: {
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

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ status: 1, category: 1, createdAt: -1 });
complaintSchema.index({ status: 1, priority: 1, createdAt: -1 });
complaintSchema.index({ status: 1, zone: 1, createdAt: -1 });
complaintSchema.index({ status: 1, department: 1, createdAt: -1 });
complaintSchema.index({ citizenId: 1, status: 1, createdAt: -1 });
complaintSchema.index({ assignedOfficer: 1, status: 1, createdAt: -1 });
complaintSchema.index({ assignedWorker: 1, status: 1, createdAt: -1 });
complaintSchema.index({ category: 1, zone: 1, status: 1 });

complaintSchema.pre('save', function syncGeoFields() {
  if (this.isModified('latitude') || this.isModified('longitude')) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  } else if (this.isModified('location') && this.location?.coordinates?.length === 2) {
    [this.longitude, this.latitude] = this.location.coordinates;
  }
});

complaintSchema.methods.addTimelineEntry = function addTimelineEntry(status, note, by) {
  this.timeline.push({
    status,
    note: note || '',
    by: by || null,
    at: new Date(),
  });
  this.status = status;
};

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
