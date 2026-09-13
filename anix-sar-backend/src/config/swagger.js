export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "ANIX-SAR Backend API",
    version: "1.0.0",
    description:
      "SAR image upload + mock analysis pipeline. The colorization/AI step is currently mocked (setTimeout) pending the real model integration.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/predict": {
      post: {
        summary: "Upload a SAR image and run (mock) inference synchronously",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "The SAR image file to analyze",
                  },
                  anonymousUserId: {
                    type: "string",
                    description: "Optional client-generated user identifier",
                  },
                  hardwareDetails: {
                    type: "string",
                    description:
                      'Optional JSON string, e.g. {"os":"Windows","cpuCores":8,"deviceMemoryGB":16}',
                  },
                },
                required: ["file"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Inference complete",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    analysis_id: { type: "string" },
                    colorized_sar: { type: "string", format: "uri" },
                    reconstructed_sar: { type: "string", format: "uri" },
                    uncertainty: {
                      type: "string",
                      nullable: true,
                      description: "Always null until the uncertainty model exists",
                    },
                    inference_time: { type: "number", description: "Milliseconds" },
                    model_version: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "No file uploaded" },
          500: { description: "Server error" },
        },
      },
    },
    "/health": {
      get: {
        summary: "Service health check",
        responses: {
          200: { description: "Service and database are healthy" },
          503: { description: "Database is unreachable" },
        },
      },
    },
    "/model-info": {
      get: {
        summary: "Model name, version, and capability flags",
        responses: { 200: { description: "Model metadata" } },
      },
    },
    "/metrics": {
      get: {
        summary: "Aggregate analysis counts and average inference time",
        responses: { 200: { description: "Metrics snapshot" } },
      },
    },
    "/results/{analysis_id}/colorized": {
      get: {
        summary: "Fetch the colorized SAR output image",
        parameters: [
          {
            name: "analysis_id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Image file" },
          404: { description: "Analysis not found, or result not ready" },
        },
      },
    },
    "/results/{analysis_id}/reconstruction": {
      get: {
        summary: "Fetch the reconstructed SAR output image",
        parameters: [
          {
            name: "analysis_id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Image file" },
          404: { description: "Analysis not found, or result not ready" },
        },
      },
    },
    "/results/{analysis_id}/uncertainty": {
      get: {
        summary: "Fetch the uncertainty map (not yet implemented)",
        parameters: [
          {
            name: "analysis_id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          404: { description: "Analysis not found" },
          501: { description: "Uncertainty model not yet integrated" },
        },
      },
    },
    "/api/analyze": {
      post: {
        summary: "[Legacy] Upload a SAR image and start (mock) analysis asynchronously",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  sarImage: {
                    type: "string",
                    format: "binary",
                    description: "The image file to upload",
                  },
                  anonymousUserId: {
                    type: "string",
                    description: "Optional client-generated user identifier",
                  },
                  hardwareDetails: {
                    type: "string",
                    description:
                      'Optional JSON string, e.g. {"os":"Windows","cpuCores":8,"deviceMemoryGB":16}',
                  },
                },
                required: ["sarImage"],
              },
            },
          },
        },
        responses: {
          202: {
            description: "Upload accepted, analysis started",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    analysisId: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "No file uploaded" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/analysis/{id}": {
      get: {
        summary: "[Legacy] Fetch full analysis document by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "The analysisId returned by POST /api/analyze",
          },
        ],
        responses: {
          200: { description: "Analysis document" },
          404: { description: "Analysis not found" },
          500: { description: "Server error" },
        },
      },
    },
  },
};
