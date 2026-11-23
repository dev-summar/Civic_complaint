const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Token hash is required'],
      select: false,
    },
    deviceInfo: {
      type: DEVICE_INFO_SCHEMA,
      default: () => ({}),
    },
    expiresAt: {
      type: Date,
      required: [true, 'Token expiry is required'],
      index: true,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

refreshTokenSchema.index({ userId: 1, revoked: 1, expiresAt: -1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.statics.hashToken = async function hashToken(rawToken) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(rawToken, salt);
};

refreshTokenSchema.statics.generateRawToken = function generateRawToken() {
  return crypto.randomBytes(48).toString('hex');
};

refreshTokenSchema.methods.compareToken = async function compareToken(rawToken) {
  if (!rawToken || !this.token) {
    return false;
  }
  return bcrypt.compare(rawToken, this.token);
};

refreshTokenSchema.methods.revoke = function revoke() {
  this.revoked = true;
  return this.save();
};

refreshTokenSchema.methods.isValid = function isValid() {
  return !this.revoked && this.expiresAt > new Date();
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
