import express from "express";
import multer from "multer";
import {
  predict,
  health,
  modelInfo,
  metrics,
  getColorizedResult,
  getReconstructionResult,
  getUncertaintyResult,
} from "../controllers/predictController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /predict — upload a SAR image, run inference, get results back
router.post("/predict", upload.single("file"), predict);

// GET /health, /model-info, /metrics
router.get("/health", health);
router.get("/model-info", modelInfo);
router.get("/metrics", metrics);

// GET /results/{analysis_id}/colorized | reconstruction | uncertainty
router.get("/results/:analysisId/colorized", getColorizedResult);
router.get("/results/:analysisId/reconstruction", getReconstructionResult);
router.get("/results/:analysisId/uncertainty", getUncertaintyResult);

export default router;
