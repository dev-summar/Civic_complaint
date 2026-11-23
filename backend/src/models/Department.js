const mongoose = require('mongoose');
const { COMPLAINT_CATEGORIES } = require('../utils/constants');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    categories: {
      type: [
        {
          type: String,
          enum: {
            values: COMPLAINT_CATEGORIES,
            message: '{VALUE} is not a valid complaint category',
          },
        },
      ],
      default: [],
    },
    headOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

departmentSchema.index({ name: 1 });
departmentSchema.index({ isActive: 1, code: 1 });

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
