FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=5001
EXPOSE 5001

# Simple healthcheck so Docker/K8s know the service is alive
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health')" || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "app:app"]
