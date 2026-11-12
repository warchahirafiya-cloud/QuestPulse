FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY questpulse_video_worker.py .
USER 10001:10001
CMD ["python", "questpulse_video_worker.py"]
