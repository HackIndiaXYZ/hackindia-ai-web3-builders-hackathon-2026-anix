from pathlib import Path
import base64
import io
import os
import time

import numpy as np
import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Keep the model package importable when this service is launched from /app.
ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("PYTHONPATH", str(ROOT))

from src.models.wavenext.inference import load_generator  # noqa: E402

CHECKPOINT = ROOT / "checkpoints" / "anix_sar_qxslab.ckpt"
CONFIG = ROOT / "src" / "models" / "wavenext" / "config.yaml"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
N_SAMPLES = int(os.getenv("UNCERTAINTY_SAMPLES", "8"))
NOISE_STD = float(os.getenv("UNCERTAINTY_NOISE_STD", "0.02"))

app = FastAPI(title="ANIX-SAR AI Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
model_load_seconds = None


def encode_png(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def preprocess(image: Image.Image) -> torch.Tensor:
    image = image.convert("L").resize((256, 256), Image.Resampling.BILINEAR)
    arr = np.asarray(image, dtype=np.float32) / 255.0
    return torch.from_numpy(arr)[None, None].mul(2.0).sub(1.0)


def optical_to_image(tensor: torch.Tensor) -> Image.Image:
    x = ((tensor.detach().float().cpu().clamp(-1, 1) + 1.0) * 127.5)
    x = x.squeeze(0).permute(1, 2, 0).numpy().astype(np.uint8)
    return Image.fromarray(x, "RGB")


def colorized_sar(image: Image.Image) -> Image.Image:
    import matplotlib.cm as cm

    gray = np.asarray(image.convert("L").resize((256, 256)), dtype=np.float32)
    lo, hi = np.percentile(gray, [2, 98])
    stretched = np.clip((gray - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    rgb = (cm.turbo(stretched)[..., :3] * 255).astype(np.uint8)
    return Image.fromarray(rgb)


def heatmap(tensor: torch.Tensor, cmap_name: str) -> Image.Image:
    import matplotlib.cm as cm

    arr = np.squeeze(tensor.detach().float().cpu().numpy())
    arr = np.clip(arr, 0.0, 1.0)
    rgb = (cm.get_cmap(cmap_name)(arr)[..., :3] * 255).astype(np.uint8)
    return Image.fromarray(rgb)


@app.on_event("startup")
def load_model() -> None:
    global model, model_load_seconds
    if not CHECKPOINT.exists():
        raise RuntimeError(f"ANIX-SAR checkpoint not found: {CHECKPOINT}")
    started = time.perf_counter()
    print(f"[ANIX-SAR] Loading model on {DEVICE}...")
    model = load_generator(str(CONFIG), str(CHECKPOINT), device=DEVICE, use_live_weights=False)
    model.eval()
    model_load_seconds = time.perf_counter() - started
    print(f"[ANIX-SAR] Model ready in {model_load_seconds:.1f}s")


@app.get("/health")
def health():
    return {
        "status": "ok" if model is not None else "degraded",
        "model_loaded": model is not None,
        "model": "ANIX-SAR WaveNeXt QXSLAB",
        "device": DEVICE,
        "checkpoint": str(CHECKPOINT),
    }


@app.get("/model-info")
def model_info():
    return {
        "name": "ANIX-SAR",
        "version": os.getenv("MODEL_VERSION", "1.0.0-qxslab"),
        "architecture": "WaveNeXt Base",
        "task": "SAR-to-optical translation",
        "dataset": "QXSLAB-SAROPT",
        "input_size": "256x256",
        "uncertainty": {
            "enabled": True,
            "method": "prediction-stability ensemble",
            "samples": N_SAMPLES,
            "noise_std": NOISE_STD,
            "calibrated_probability": False,
        },
        "device": DEVICE,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="AI model is not loaded")

    try:
        raw = await file.read()
        image = Image.open(io.BytesIO(raw)).convert("L")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc

    started = time.perf_counter()
    x = preprocess(image).to(DEVICE)

    with torch.inference_mode():
        base = model(x)
        predictions = []
        for _ in range(N_SAMPLES):
            perturbed = (x + torch.randn_like(x) * NOISE_STD).clamp(-1, 1)
            predictions.append(model(perturbed))

        stack = torch.stack(predictions, dim=0)
        ensemble_mean = stack.mean(dim=0)
        uncertainty = stack.std(dim=0).mean(dim=1, keepdim=True)
        uncertainty = uncertainty / (uncertainty.amax() + 1e-8)
        confidence = 1.0 - uncertainty

    elapsed_ms = (time.perf_counter() - started) * 1000.0

    return {
        "success": True,
        "model": "ANIX-SAR WaveNeXt QXSLAB",
        "device": DEVICE,
        "inference_time_ms": round(elapsed_ms, 2),
        "uncertainty_method": "prediction-stability ensemble",
        "uncertainty_samples": N_SAMPLES,
        "uncertainty_mean": round(float(uncertainty.mean().item()), 6),
        "uncertainty_max": round(float(uncertainty.max().item()), 6),
        "optical_image_base64": encode_png(optical_to_image(base)),
        "ensemble_mean_base64": encode_png(optical_to_image(ensemble_mean)),
        "colorized_sar_base64": encode_png(colorized_sar(image)),
        "uncertainty_base64": encode_png(heatmap(uncertainty, "magma")),
        "confidence_base64": encode_png(heatmap(confidence, "viridis")),
    }
