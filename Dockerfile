
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app/ ./app

# Expose port for FastAPI (optional for discord.py bot)
EXPOSE 8000

# Install supervisor to run multiple processes
RUN pip install supervisor

# Add supervisor config
COPY supervisord.conf ./

# Default: Start both FastAPI and discord.py bot using supervisor
CMD ["supervisord", "-c", "/app/supervisord.conf"]
