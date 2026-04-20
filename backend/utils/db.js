// utils/db.js — MongoDB connection
const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/dlnlite");
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
