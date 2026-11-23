const mongoose = require('mongoose');

const DEVICE_INFO_SCHEMA = {
  platform: {
    type: String,
    trim: true,
    default: null,
  },
  os: {
    type: String,
    trim: true,
    default: null,
  },
  browser: {
    type: String,
    trim: true,
    default: null,
  },
  appVersion: {
    type: String,
    trim: true,
    default: null,
  },
  deviceId: {
    type: String,
    trim: true,
    default: null,
  },
  model: {
    type: String,
    trim: true,
    default: null,
  },
};

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    deviceInfo: {
      type: DEVICE_INFO_SCHEMA,
      default: () => ({}),
    },
    ip: {
      type: String,
      trim: true,
      default: null,
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Session expiry is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

sessionSchema.index({ userId: 1, lastActive: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.methods.touch = function touch() {
  this.lastActive = new Date();
  return this.save();
};

sessionSchema.methods.isExpired = function isExpired() {
  return this.expiresAt <= new Date();
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
