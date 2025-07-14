# Semaphore-Discord-Bot

A minimal FastAPI-based Discord bot backend for handling Discord interactions and triggering actions via custom component interactions.

## Features

- Verifies incoming Discord interaction requests using Ed25519 signatures.
- Responds to Discord pings for interaction verification.
- Handles custom component interactions (e.g., button presses).
- Dockerized for easy deployment.

## Requirements

- Python 3.11+
- Docker (optional, for containerized deployment)
- A Discord application with a public key

## Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/semaphore-discord-bot.git
   cd semaphore-discord-bot
   ```

2. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**

   Create a `.env` file in the project root:
   ```
   DISCORD_PUBLIC_KEY=your_discord_app_public_key_here
   ```

## Running Locally

```sh
uvicorn app.main:app --reload
```

## Docker

Build and run the container:

```sh
docker build -t semaphore-discord-bot .
docker run -e DISCORD_PUBLIC_KEY=your_discord_app_public_key_here -p 8000:8000 semaphore-discord-bot
```

## Endpoints

- `POST /interactions`  
  Handles Discord interaction payloads. Verifies signatures and responds to pings and custom component interactions.

- Needs to be hosted with an publicly over HTTPs, the easiest method is to put behind a reverse-proxy.

## GitHub Actions

- **docker-build-test.yml**: Builds the Docker image for pull requests to `main` (no push).
- **docker-build-publish.yml**: Builds and pushes the Docker image to Docker Hub on push to `main`.