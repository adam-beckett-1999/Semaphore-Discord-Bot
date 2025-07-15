# Semaphore-Discord-Bot

A Discord bot that bridges Discord interactions with SemaphoreUI automation, allowing users to trigger Ansible playbooks directly from Discord using interactive buttons.

## Overview

This minimal FastAPI-based Discord bot handles Discord interactions and triggers Ansible playbooks in SemaphoreUI (https://semaphoreui.com/) via custom component interactions.

![Bot Demo](demo.gif)

*Interactive Discord bot triggering infrastructure automation through SemaphoreUI*

## Features

- 🔐 Secure Discord interaction verification using Ed25519 signatures
- 🚀 Trigger SemaphoreUI playbooks via Discord button interactions
- 🐳 Docker deployment ready
- ⚡ Async FastAPI backend for high performance

## Requirements

- Python 3.11+
- Docker (optional, for containerized deployment)
- A Discord application with a public key
- SemaphoreUI environment with configured 'Integrations' for your playbooks

## Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/adam-beckett-1999/semaphore-discord-bot.git
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
   SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL=your_semaphore_trigger_url_here
   SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL=your_semaphore_trigger_url_here
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

- Needs to be hosted publicly over HTTPS, the easiest method is to put behind a reverse-proxy.

## How It Works

1. **Ansible playbooks** send Discord messages with interactive buttons to channels
2. **Users click buttons** in Discord to trigger playbooks
3. **Discord bot** receives the interaction, verifies the signature, and calls SemaphoreUI webhooks
4. **SemaphoreUI** executes the corresponding Ansible playbooks
5. **Users receive feedback** in Discord about the operation status

## Ansible Playbooks

This ties in with my playbooks and roles which can be found here: https://github.com/adam-beckett-1999/Ansible-Playbooks

Example role: https://github.com/adam-beckett-1999/Ansible-Playbooks/blob/dev/roles/update-report-aggregated-alert/tasks/main.yml

```yaml
- name: Send Discord prompt with styled embed and interactive button via bot API
  uri:
    url: "{{ discord_channel_url }}"
    method: POST
    headers:
      Content-Type: "application/json"
      Authorization: "Bot {{ discord_bot_token }}"
    body_format: json
    body:
      embeds:
        - title: "⚙️ Update Playbook Trigger"
          description: "Do you want to trigger the update playbook now?\nClick the button below to start the update process."
          color: 3447003
          footer:
            text: "Triggered from Ansible"
      components:
        - type: 1
          components:
            - type: 2
              style: 1
              label: "Run Update Playbook"
              custom_id: "{{ custom_id }}"
  run_once: true
```

The custom_id would match with the button interaction function, so that when the button is pressed, it calls the webhook URL configured via environment variable that matches with it, triggering the playbook in Semaphore.

## Contributing

Feel free to fork and adapt to suit your needs. This is fairly basic and will probably be improved upon over time to make it more generalised.

## License

This project is open source. Please check the license file for more details.