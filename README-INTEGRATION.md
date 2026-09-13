# ANIX-SAR local AI integration

This update preserves the existing Express/MongoDB backend and adds a separate FastAPI AI-serving service for the real WaveNeXt model.

Architecture:

Frontend :3000 -> Express :4000 -> FastAPI :8000 -> WaveNeXt on NVIDIA GPU

MongoDB remains the application database.

## Required files outside this package

The model repository must contain:

- `checkpoints/anix_sar_qxslab.ckpt`
- `src/models/wavenext/`
- `src/models/wavenext/config.yaml`

The frontend source is intentionally not included because it was not part of the uploaded archive. Use `frontend-integration/README.md` to connect it without changing its existing structure.

## Start

From the repository root:

```powershell
docker compose up --build
```

Requirements for the AI container:

- Docker Desktop
- NVIDIA driver with working Docker GPU support
- NVIDIA Container Toolkit / Docker Desktop GPU support

The first AI build/download may take a while because PyTorch and the Hugging Face ConvNeXtV2 backbone are large. The model checkpoint is mounted read-only from `./checkpoints`.

## Verify

Backend:

`http://localhost:4000/health`

AI service:

`http://localhost:8000/health`

AI model metadata:

`http://localhost:8000/model-info`

Backend API docs:

`http://localhost:4000/api-docs`

## Frontend

The browser should call only the Express backend:

`http://localhost:4000/predict`

Do not expose or call `http://localhost:8000/predict` from the frontend. The FastAPI service is an internal AI-serving layer.

## Ngrok

Expose only port 4000 with ngrok. The AI service stays private on the Docker network.
