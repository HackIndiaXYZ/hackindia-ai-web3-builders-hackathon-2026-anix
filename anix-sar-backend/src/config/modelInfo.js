export const MODEL_VERSION = process.env.MODEL_VERSION || "1.0.0-qxslab";

export const MODEL_INFO = {
  name: "ANIX-SAR",
  version: MODEL_VERSION,
  description:
    "WaveNeXt-based SAR-to-optical translation fine-tuned on QXSLAB-SAROPT, with prediction-stability uncertainty estimation.",
  capabilities: {
    colorization: true,
    reconstruction: true,
    uncertainty: true,
    confidence: true,
    ensemble: true,
  },
  mocked: false,
};
