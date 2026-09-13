FROM nvidia/cuda:12.8.1-cudnn-runtime-ubuntu24.04

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY ai_service/requirements.txt /app/ai_service/requirements.txt
RUN python3 -m pip install --break-system-packages \
    torch==2.8.0 torchvision==0.23.0 --index-url https://download.pytorch.org/whl/cu128 \
    && python3 -m pip install --break-system-packages -r /app/ai_service/requirements.txt

COPY src /app/src
COPY ai_service /app/ai_service

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
