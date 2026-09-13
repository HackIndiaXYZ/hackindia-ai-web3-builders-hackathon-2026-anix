import fs from "fs/promises";
import path from "path";
import { AI_SERVICE_TIMEOUT_MS, AI_SERVICE_URL } from "../config/aiService.js";

const dataUrlToBuffer = (value) => {
  if (!value || typeof value !== "string") {
    throw new Error("AI service returned an invalid image payload");
  }
  const comma = value.indexOf(",");
  const encoded = comma >= 0 ? value.slice(comma + 1) : value;
  return Buffer.from(encoded, "base64");
};

export const runAiPrediction = async (filePath) => {
  const body = new FormData();
  const bytes = await fs.readFile(filePath);
  body.append("file", new Blob([bytes]), path.basename(filePath));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/predict`, {
      method: "POST",
      body,
      signal: controller.signal,
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.detail || payload.error || `AI service returned ${response.status}`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

export const saveAiOutputs = async (analysisId, payload) => {
  const directory = path.join("uploads", "results", String(analysisId));
  await fs.mkdir(directory, { recursive: true });

  const outputs = {
    colorized: path.join(directory, "colorized_sar.png"),
    reconstruction: path.join(directory, "reconstructed_optical.png"),
    ensemble: path.join(directory, "ensemble_mean.png"),
    uncertainty: path.join(directory, "uncertainty_map.png"),
    confidence: path.join(directory, "confidence_map.png"),
  };

  await Promise.all([
    fs.writeFile(outputs.colorized, dataUrlToBuffer(payload.colorized_sar_base64)),
    fs.writeFile(outputs.reconstruction, dataUrlToBuffer(payload.optical_image_base64)),
    fs.writeFile(outputs.ensemble, dataUrlToBuffer(payload.ensemble_mean_base64)),
    fs.writeFile(outputs.uncertainty, dataUrlToBuffer(payload.uncertainty_base64)),
    fs.writeFile(outputs.confidence, dataUrlToBuffer(payload.confidence_base64)),
  ]);

  return outputs;
};
