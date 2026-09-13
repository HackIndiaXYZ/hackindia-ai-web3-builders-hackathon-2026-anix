import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema({
  anonymousUserId: {
    type: String,
    required: true,
    default: "unknown_user" 
  },
  // New section to store the user's hardware info
  hardwareDetails: {
    os: { type: String, default: "Unknown" },
    cpuCores: { type: Number },
    deviceMemoryGB: { type: Number }
  },
  originalSarPath: { type: String, required: true },
  colorizedPath: { type: String },
  uncertaintyMapPath: { type: String },
  reconstructedSarPath: { type: String },
  status: { type: String, default: "processing" },
  modelVersion: { type: String },
  inferenceTimeMs: { type: Number },
  uncertaintyStatistics: {
    meanUncertainty: { type: Number },
    maxUncertainty: { type: Number }
  },
  preservationMetrics: {
    reconstructionError: { type: Number },
    ssim: { type: Number } 
  },
  blockchainHash: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Analysis = mongoose.model("Analysis", analysisSchema);

export default Analysis;