FROM python:3.11-slim

# Create working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app/ ./app

# Set environment variables (can be overridden with -e or docker-compose)
ENV DISCORD_PUBLIC_KEY=""

# Start server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
