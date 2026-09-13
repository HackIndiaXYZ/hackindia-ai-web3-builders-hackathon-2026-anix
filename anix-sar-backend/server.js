import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import connectDB from "./src/config/database.js";
import apiRoutes from "./src/routes/apiRoutes.js";
import predictRoutes from "./src/routes/predictRoutes.js";
import { openApiSpec } from "./src/config/swagger.js";

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Allow the frontend to talk to this backend without security blocks
app.use(cors());

// Tell Express to understand JSON data
app.use(express.json());

// Tell Express to serve files from the 'uploads' directory publicly
app.use("/uploads", express.static("uploads"));

// Interactive API docs — lets you upload a test file straight from the browser
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Model-service contract endpoints: POST /predict, GET /health,
// GET /model-info, GET /metrics, GET /results/:analysisId/*
app.use("/", predictRoutes);

// Legacy API routes (POST /api/analyze, GET /api/analysis/:id) — kept for
// backwards compatibility with existing clients.
app.use("/api", apiRoutes);

// Start listening for traffic
app.listen(PORT, () => {
  console.log(`ANIX-SAR Backend running on http://localhost:${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/api-docs`);
});