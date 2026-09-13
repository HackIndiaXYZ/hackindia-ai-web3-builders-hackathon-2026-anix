export const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

export const AI_SERVICE_TIMEOUT_MS = Number(
  process.env.AI_SERVICE_TIMEOUT_MS || 180000
);
