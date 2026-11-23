const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Zone name is required'],
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: [true, 'Zone code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      maxlength: 80,
      index: true,
    },
    polygon: {
      type: {
        type: String,
        enum: ['Polygon'],
      },
      coordinates: {
        type: [[[Number]]],
      },
    },
    center: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        validate: {
          validator(coords) {
            if (!coords || coords.length === 0) return true;
            return coords.length === 2
              && coords[0] >= -180 && coords[0] <= 180
              && coords[1] >= -90 && coords[1] <= 90;
          },
          message: 'Center coordinates must be [longitude, latitude]',
        },
      },
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

zoneSchema.index({ center: '2dsphere' }, { sparse: true });
zoneSchema.index({ polygon: '2dsphere' }, { sparse: true });
zoneSchema.index({ district: 1, isActive: 1 });

const Zone = mongoose.model('Zone', zoneSchema);

module.exports = Zone;
