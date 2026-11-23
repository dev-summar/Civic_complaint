const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');

const generateOTP = () =>
  crypto.randomInt(100000, 1000000).toString();

const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(config.bcryptRounds);
  return bcrypt.hash(otp, salt);
};

const verifyOtp = async (candidateOtp, hashedOtp) => {
  if (!candidateOtp || !hashedOtp) {
    return false;
  }
  return bcrypt.compare(candidateOtp, hashedOtp);
};

const getOtpExpiryDate = () =>
  new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

module.exports = {
  generateOTP,
  hashOtp,
  verifyOtp,
  getOtpExpiryDate,
};
