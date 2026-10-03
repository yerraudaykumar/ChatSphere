const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`\n==================================================`);
    console.log(`[DATABASE MODE]: REAL MONGODB`);
    console.log(`Connected: ${conn.connection.host}`);
    console.log(`==================================================\n`);
    return conn;
  } catch (error) {
    console.warn(`Local MongoDB connection failed (${error.message}). Attempting in-memory database fallback for seamless testing...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`\n==================================================`);
      console.log(`[DATABASE MODE]: IN-MEMORY MONGODB FALLBACK`);
      console.log(`Connected successfully at ${mongoUri}`);
      console.log(`==================================================\n`);
      return conn;
    } catch (memError) {
      console.error(`MongoDB Connection Error: ${error.message}`);
      console.error(`In-Memory MongoDB Fallback Error: ${memError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
