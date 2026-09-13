import path from "path";
import mongoose from "mongoose";
import Analysis from "../models/Analysis.js";
import { MODEL_INFO, MODEL_VERSION } from "../config/modelInfo.js";
import { runAiPrediction, saveAiOutputs } from "../utils/aiClient.js";

const toPublicUrl = (req, relativeFilePath) =>
  relativeFilePath
    ? `${req.protocol}://${req.get("host")}/${relativeFilePath.replace(/\\/g, "/")}`
    : null;

const parseHardware = (value) => {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return {}; }
};

export const predict = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No SAR image uploaded" });

    const analysis = await Analysis.create({
      anonymousUserId: req.body.anonymousUserId || "unknown_user",
      hardwareDetails: parseHardware(req.body.hardwareDetails),
      originalSarPath: req.file.path,
      status: "processing",
      modelVersion: MODEL_VERSION,
    });

    const start = Date.now();
    try {
      const ai = await runAiPrediction(req.file.path);
      const outputs = await saveAiOutputs(analysis._id, ai);
      const inferenceTimeMs = Date.now() - start;

      analysis.status = "completed";
      analysis.colorizedPath = outputs.colorized;
      analysis.reconstructedSarPath = outputs.reconstruction;
      analysis.uncertaintyMapPath = outputs.uncertainty;
      analysis.inferenceTimeMs = inferenceTimeMs;
      analysis.uncertaintyStatistics = {
        meanUncertainty: ai.uncertainty_mean,
        maxUncertainty: ai.uncertainty_max,
      };
      await analysis.save();

      return res.status(200).json({
        analysis_id: analysis._id,
        colorized_sar: toPublicUrl(req, outputs.colorized),
        reconstructed_sar: toPublicUrl(req, outputs.reconstruction),
        ensemble_mean: toPublicUrl(req, outputs.ensemble),
        uncertainty: toPublicUrl(req, outputs.uncertainty),
        confidence: toPublicUrl(req, outputs.confidence),
        inference_time: inferenceTimeMs,
        model_version: MODEL_VERSION,
        uncertainty_method: ai.uncertainty_method,
      });
    } catch (aiError) {
      analysis.status = "failed";
      await analysis.save();
      console.error("ANIX-SAR AI service error:", aiError);
      return res.status(502).json({ error: "AI inference service unavailable", details: aiError.message });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error during prediction" });
  }
};

export const health = async (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "degraded",
    database: dbConnected ? "connected" : "disconnected",
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

export const modelInfo = (_req, res) => res.status(200).json(MODEL_INFO);

export const metrics = async (_req, res) => {
  try {
    const [totalAnalyses, completedAnalyses, failedAnalyses, avgAgg] = await Promise.all([
      Analysis.countDocuments({}),
      Analysis.countDocuments({ status: "completed" }),
      Analysis.countDocuments({ status: "failed" }),
      Analysis.aggregate([
        { $match: { inferenceTimeMs: { $ne: null } } },
        { $group: { _id: null, avgInferenceTimeMs: { $avg: "$inferenceTimeMs" } } },
      ]),
    ]);
    res.status(200).json({
      total_analyses: totalAnalyses,
      completed_analyses: completedAnalyses,
      failed_analyses: failedAnalyses,
      avg_inference_time_ms: avgAgg[0]?.avgInferenceTimeMs ?? null,
      model_version: MODEL_VERSION,
      uncertainty_model_available: true,
      uptime_seconds: Math.round(process.uptime()),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while computing metrics" });
  }
};

const serveResultFile = async (req, res, { field, label }) => {
  try {
    const analysis = await Analysis.findById(req.params.analysisId);
    if (!analysis) return res.status(404).json({ error: "Analysis not found" });
    const filePath = analysis[field];
    if (!filePath) return res.status(404).json({ error: `${label} is not ready (status: ${analysis.status}).` });
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: `Server error while fetching ${label.toLowerCase()}` });
  }
};

export const getColorizedResult = (req, res) =>
  serveResultFile(req, res, { field: "colorizedPath", label: "Colorized SAR image" });
export const getReconstructionResult = (req, res) =>
  serveResultFile(req, res, { field: "reconstructedSarPath", label: "Reconstructed optical image" });
export const getUncertaintyResult = (req, res) =>
  serveResultFile(req, res, { field: "uncertaintyMapPath", label: "Uncertainty map" });
