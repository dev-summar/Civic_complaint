require('dotenv').config();

const config = require('../config');
const connectDB = require('../config/db');
const logger = require('../utils/logger');
const { User, Department, Zone } = require('../models');
const { ROLES } = require('../utils/constants');

const DEMO_PASSWORD = 'Demo@1234';

const DEPARTMENTS = [
  {
    name: 'Sanitation',
    code: 'SAN',
    description: 'Garbage collection, public toilets, and waste management',
    categories: ['garbage', 'illegal_dumping', 'dead_animals', 'public_toilets'],
  },
  {
    name: 'Roads',
    code: 'ROAD',
    description: 'Road maintenance, potholes, and snow clearance',
    categories: ['potholes', 'road_damage', 'snow_blockage'],
  },
  {
    name: 'Electrical',
    code: 'ELEC',
    description: 'Street lighting and electrical infrastructure',
    categories: ['broken_streetlights'],
  },
  {
    name: 'Water Supply',
    code: 'WATER',
    description: 'Drinking water and pipeline maintenance',
    categories: ['water_leakage'],
  },
  {
    name: 'Sewage',
    code: 'SEW',
    description: 'Sewage lines, drains, and overflow management',
    categories: ['sewage_overflow'],
  },
  {
    name: 'Parks & Horticulture',
    code: 'PARK',
    description: 'Parks, gardens, and tree maintenance',
    categories: ['fallen_trees'],
  },
  {
    name: 'General Administration',
    code: 'GEN',
    description: 'General municipal grievances',
    categories: ['others'],
  },
];

const ZONES = [
  {
    name: 'Srinagar Central',
    code: 'SRG-C',
    district: 'Srinagar',
    center: { type: 'Point', coordinates: [74.7973, 34.0837] },
  },
  {
    name: 'Jammu City',
    code: 'JMU-C',
    district: 'Jammu',
    center: { type: 'Point', coordinates: [74.857, 32.7266] },
  },
  {
    name: 'Anantnag Town',
    code: 'ANT-T',
    district: 'Anantnag',
    center: { type: 'Point', coordinates: [75.1487, 33.7311] },
  },
  {
    name: 'Baramulla Town',
    code: 'BRM-T',
    district: 'Baramulla',
    center: { type: 'Point', coordinates: [74.3636, 34.198] },
  },
];

const DEMO_USERS = [
  {
    key: 'admin',
    name: 'System Administrator',
    email: config.admin.email,
    phone: config.admin.phone,
    password: config.admin.password,
    role: ROLES.ADMIN,
    isVerified: true,
  },
  {
    key: 'officer',
    name: 'Harish',
    email: 'harish@demo.rabtajk.gov.in',
    phone: '9876543210',
    password: DEMO_PASSWORD,
    role: ROLES.OFFICER,
    isVerified: true,
  },
  {
    key: 'worker',
    name: 'Deep',
    email: 'deep@demo.rabtajk.gov.in',
    phone: '9876543211',
    password: DEMO_PASSWORD,
    role: ROLES.WORKER,
    isVerified: true,
  },
  {
    key: 'citizen',
    name: 'Summar Kumar',
    email: 'summar.kumar@demo.rabtajk.gov.in',
    phone: '9876543212',
    password: DEMO_PASSWORD,
    role: ROLES.CITIZEN,
    isVerified: true,
  },
];

/** Old placeholder accounts — removed on seed so only real named users remain */
const LEGACY_DEMO_EMAILS = [
  'officer@demo.rabtajk.gov.in',
  'worker@demo.rabtajk.gov.in',
  'citizen@demo.rabtajk.gov.in',
];

const upsertDepartment = async (dept) => {
  const doc = await Department.findOneAndUpdate(
    { code: dept.code },
    { $set: { ...dept, isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
};

const upsertZone = async (zone) => {
  const doc = await Zone.findOneAndUpdate(
    { code: zone.code },
    {
      $set: { ...zone, isActive: true },
      $unset: { polygon: '' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
};

const upsertUser = async (userData, refs = {}) => {
  let user =
    (await User.findOne({ email: userData.email }).select('+password')) ||
    (userData.phone
      ? await User.findOne({ phone: userData.phone }).select('+password')
      : null);

  if (user) {
    user.name = userData.name;
    user.email = userData.email;
    user.phone = userData.phone;
    user.role = userData.role;
    user.isVerified = userData.isVerified;
    user.status = 'active';
    if (refs.department) user.department = refs.department;
    if (refs.zone) user.zone = refs.zone;
    if (userData.password) {
      user.password = userData.password;
    }
    await user.save();
    return { user, created: false };
  }

  user = await User.create({
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    password: userData.password,
    role: userData.role,
    isVerified: userData.isVerified,
    status: 'active',
    department: refs.department || null,
    zone: refs.zone || null,
  });

  return { user, created: true };
};

const seed = async () => {
  await connectDB();

  if (!config.mongodbUri) {
    logger.error('MONGODB_URI is not set. Update .env before running seed.');
    process.exit(1);
  }

  const existingAdmin = await User.findOne({ email: config.admin.email });
  if (existingAdmin) {
    logger.info(`Admin already exists (${config.admin.email}) — upserting remaining seed data`);
  }

  logger.info('Seeding departments…');
  const departmentMap = {};
  for (const dept of DEPARTMENTS) {
    departmentMap[dept.code] = await upsertDepartment(dept);
  }

  logger.info('Seeding zones…');
  const zoneMap = {};
  for (const zone of ZONES) {
    zoneMap[zone.code] = await upsertZone(zone);
  }

  const srinagarZone = zoneMap['SRG-C'];
  const sanitationDept = departmentMap.SAN;

  const removedLegacy = await User.deleteMany({ email: { $in: LEGACY_DEMO_EMAILS } });
  if (removedLegacy.deletedCount > 0) {
    logger.info(`Removed ${removedLegacy.deletedCount} legacy demo account(s)`);
  }

  logger.info('Seeding users…');
  const userResults = {};

  for (const demoUser of DEMO_USERS) {
    const refs = {};
    if (demoUser.role === ROLES.OFFICER) {
      refs.department = sanitationDept._id;
      refs.zone = srinagarZone._id;
    }
    if (demoUser.role === ROLES.WORKER) {
      refs.department = sanitationDept._id;
      refs.zone = srinagarZone._id;
    }

    const { user, created } = await upsertUser(demoUser, refs);
    userResults[demoUser.key] = user;
    logger.info(`${created ? 'Created' : 'Updated'} user: ${user.name} <${user.email}> (${user.role})`);
  }

  if (sanitationDept && userResults.officer) {
    sanitationDept.headOfficer = userResults.officer._id;
    await sanitationDept.save();
  }

  logger.info('Seed completed successfully (no sample complaints — ready for E2E testing)');
  logger.info(`Departments: ${DEPARTMENTS.length}, Zones: ${ZONES.length}, Users: ${DEMO_USERS.length}`);
  logger.info('Logins — Summar Kumar / Harish / Deep: password Demo@1234');
  logger.info(`Admin login: ${config.admin.email}`);

  process.exit(0);
};

seed().catch((err) => {
  logger.error('Seed failed', { message: err.message, stack: err.stack });
  process.exit(1);
});
