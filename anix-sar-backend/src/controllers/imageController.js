import Analysis from "../models/Analysis.js";
import { MODEL_VERSION } from "../config/modelInfo.js";
import { runAiPrediction, saveAiOutputs } from "../utils/aiClient.js";

const parseHardware = (value) => {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return {}; }
};

export const uploadAndAnalyze = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No SAR image uploaded" });

    const userId = req.body.anonymousUserId || "unknown_user";
    const analysis = await Analysis.create({
      anonymousUserId: userId,
      hardwareDetails: parseHardware(req.body.hardwareDetails),
      originalSarPath: req.file.path,
      status: "processing",
      modelVersion: MODEL_VERSION,
    });

    res.status(202).json({
      message: "SAR image received. Analysis started.",
      analysisId: analysis._id,
      status: "processing",
    });

    void (async () => {
      try {
        const started = Date.now();
        const ai = await runAiPrediction(req.file.path);
        const outputs = await saveAiOutputs(analysis._id, ai);

        analysis.status = "completed";
        analysis.colorizedPath = outputs.colorized;
        analysis.reconstructedSarPath = outputs.reconstruction;
        analysis.uncertaintyMapPath = outputs.uncertainty;
        analysis.inferenceTimeMs = Date.now() - started;
        analysis.uncertaintyStatistics = {
          meanUncertainty: ai.uncertainty_mean,
          maxUncertainty: ai.uncertainty_max,
        };
        await analysis.save();
        console.log(`Analysis ${analysis._id} completed for user ${userId}.`);
      } catch (error) {
        analysis.status = "failed";
        await analysis.save();
        console.error(`Analysis ${analysis._id} failed:`, error);
      }
    })();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during file upload" });
  }
};

export const getAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    if (!analysis) return res.status(404).json({ error: "Analysis not found" });
    res.status(200).json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while fetching analysis" });
  }
};
