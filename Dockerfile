FROM python:3.14.0rc1-alpine3.22

WORKDIR /app

# Update system packages and install security updates before installing dependencies
RUN apk update && apk upgrade

# Install system dependencies
RUN apk add --no-cache build-base libsodium-dev

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app/ ./app

# Expose port
EXPOSE 8000

# Start the FastAPI app using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
