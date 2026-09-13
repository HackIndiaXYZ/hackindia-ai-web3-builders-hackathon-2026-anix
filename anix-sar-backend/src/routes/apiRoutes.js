import express from "express";
import multer from "multer";
import { uploadAndAnalyze, getAnalysis } from "../controllers/imageController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST route: Takes the upload and starts processing
router.post("/analyze", upload.single("sarImage"), uploadAndAnalyze);

// GET route: Fetches the results using the database ID
router.get("/analysis/:id", getAnalysis);

export default router;