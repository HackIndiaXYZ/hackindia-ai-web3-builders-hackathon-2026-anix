// We import mongoose to handle our database connection
import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// This function attempts to connect to MongoDB, retrying a few times in
// case the database (e.g. the 'mongo' container) is still starting up.
const connectDB = async () => {
  // Use MONGODB_URI from the environment (e.g. set by docker-compose to
  // point at the 'mongo' service). Falls back to a local Mongo instance
  // for running the backend outside Docker.
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/anix_sar_db";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(
        `Database connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`
      );
      if (attempt === MAX_RETRIES) {
        console.error("Giving up. Please ensure MongoDB is running and reachable.");
        process.exit(1); // Stop the server if we still can't connect
      }
      await sleep(RETRY_DELAY_MS);
    }
  }
};

export default connectDB;