# Semaphore-Discord-Bot

A Discord bot that bridges Discord interactions with SemaphoreUI automation, allowing users to trigger Ansible playbooks directly from Discord using interactive buttons.

## Overview


This project now includes:
- A persistent Discord bot (`app/discord_slash_commands.py`) using discord.py, supporting slash commands and interactive buttons to trigger SemaphoreUI webhooks directly from Discord.

![Bot Demo](demo.gif)

*Interactive Discord bot triggering infrastructure automation through SemaphoreUI*

## Features

- Trigger SemaphoreUI playbooks via Discord button interactions
- Slash command `/playbooks` in Discord to bring up interactive playbook buttons
- Docker deployment ready

## Requirements

- Python 3.11+
- Docker (optional, for containerized deployment)
- A Discord application with a bot token
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
   DISCORD_SEMAPHORE_POST_PUBLIC_KEY=your_discord_app_public_key_here (Bot 1: Interactions Endpoint)
   DISCORD_SEMAPHORE_CONTROL_BOT_TOKEN=your_discord_bot_token_here (Bot 2: Slash Commands)
   SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL=your_semaphore_trigger_url_here
   SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL=your_semaphore_trigger_url_here
   SEMAPHORE_PHYSICAL_HOSTS_UPDATE_TRIGGER_URL=your_semaphore_trigger_url_here
   SEMAPHORE_VMS_LXCS_UPDATE_REPORT_TRIGGER_URL=your_semaphore_report_trigger_url_here
   SEMAPHORE_PVE_CLUSTERS_UPDATE_REPORT_TRIGGER_URL=your_semaphore_report_trigger_url_here
   SEMAPHORE_PHYSICAL_HOSTS_UPDATE_REPORT_TRIGGER_URL=your_semaphore_report_trigger_url_here
   ```

## Running Locally

To run the FastAPI endpoint:
```sh
uvicorn app.interactions_endpoint:app --reload
```

To run the discord.py bot:
```sh
python app/discord_slash_commands.py
```

## Docker

Build and run the container (both FastAPI and discord.py bot will run together using Supervisor):

```sh
docker build -t semaphore-discord-bot .
docker run --env-file .env -p 8000:8000 semaphore-discord-bot
```

## Endpoints

- `POST /interactions`  
  Handles Discord interaction payloads (FastAPI). Verifies signatures and responds to pings and custom component interactions.

- Discord slash command `/playbooks`  
  Brings up a menu of buttons in Discord to trigger SemaphoreUI webhooks (discord.py bot).

- Needs to be hosted publicly over HTTPS, the easiest method is to put behind a reverse-proxy (for FastAPI endpoint).

## How It Works

1. **Ansible playbooks** can send Discord messages with interactive buttons to channels (handled by FastAPI endpoint)
2. **Users can also use the `/webhooks` slash command** in Discord to bring up interactive buttons (handled by discord.py bot)
3. **Users click buttons** in Discord to trigger playbooks
4. **Bot receives the interaction, verifies the signature (FastAPI) or handles via gateway (discord.py), and calls SemaphoreUI webhooks**
5. **SemaphoreUI** executes the corresponding Ansible playbooks
6. **Users receive feedback** in Discord about the operation status

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

The custom_id would match with the button interaction function, so that when the button is pressed, it calls the webhook URL configured via environment variable that matches with it, triggering the playbook in Semaphore (FastAPI endpoint). For the discord.py bot, use the `/webhooks` command to bring up interactive playbook buttons.

## Contributing

Feel free to fork and adapt to suit your needs. This is fairly basic and will probably be improved upon over time to make it more generalised.

## License

This project is open source. Please check the license file for more details.