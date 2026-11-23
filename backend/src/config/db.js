const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const connectDB = async (retries = 5) => {
  if (!config.mongodbUri) {
    logger.warn('MONGODB_URI not set — running without database connection');
    return null;
  }

  mongoose.set('strictQuery', true);

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await mongoose.connect(config.mongodbUri, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 15000,
      });
      logger.info(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      lastError = err;
      logger.warn(`MongoDB connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  throw lastError;
};

module.exports = connectDB;
