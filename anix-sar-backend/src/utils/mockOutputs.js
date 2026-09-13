import fs from "fs";
import path from "path";

// A minimal 1x1 transparent PNG, used as a stand-in output so that the
// /results/*/colorized and /results/*/reconstruction endpoints have a
// real file to serve end-to-end before the actual model is wired in.
const PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const UPLOADS_DIR = "uploads";

/**
 * Writes a mock output file for the given analysis and kind ("colorized"
 * or "reconstruction") and returns its relative path (relative to the
 * project root, e.g. "uploads/<id>_colorized.png").
 */
export function writeMockOutput(analysisId, kind) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const filename = `${analysisId}_${kind}.png`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(PLACEHOLDER_PNG_BASE64, "base64"));
  return filePath;
}
