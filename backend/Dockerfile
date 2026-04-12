FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gcc libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (separate layer for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

# Create non-root user
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

# start.sh handles: wait for DB, run migrations, start server
CMD ["sh", "-c", "\
    echo 'Running DB migrations...' && \
    alembic upgrade head && \
    echo 'Starting server...' && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 \
"]
