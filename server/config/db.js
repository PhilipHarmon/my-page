const mongoose = require('mongoose');

// Connect to MongoDB without ever crashing the server: /api/health must
// answer even when the database is missing or unreachable, and the page
// endpoints report "database unavailable" gracefully instead.
async function connectDB() {
  const uri = (process.env.MONGO_URI || '').trim();
  if (!uri) {
    console.warn('MONGO_URI is not set — page endpoints will report the database as unavailable.');
    return false;
  }
  try {
    const opts = {};
    const dbName = (process.env.MONGO_DB_NAME || '').trim();
    if (dbName) opts.dbName = dbName;
    await mongoose.connect(uri, opts);
    console.log('MongoDB connected.');
    return true;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    return false;
  }
}

function dbReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, dbReady };
