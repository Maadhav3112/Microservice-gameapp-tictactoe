FROM python:3.11-slim

WORKDIR /app

# gcc is needed to build some crypto/mysql-related wheels on slim images
RUN apt-get update && apt-get install -y --no-install-recommends gcc default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=5003
EXPOSE 5003

HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5003/health')" || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5003", "--workers", "2", "app:app"]
