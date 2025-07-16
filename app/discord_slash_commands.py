import discord # type: ignore
from discord import app_commands, Interaction # type: ignore
from discord.ext import commands # type: ignore
import aiohttp # type: ignore
import os

# Replace with your bot token, webhook URLs, and your test guild ID
token = os.getenv('DISCORD_SEMAPHORE_CONTROL_BOT_TOKEN')
webhook_urls = {
    'Generate Update-Report for VMs & LXCs': os.getenv('SEMAPHORE_VMS_LXCS_UPDATE_REPORT_TRIGGER_URL'),
    'Generate Update-Report for PVE Clusters': os.getenv('SEMAPHORE_PVE_CLUSTERS_UPDATE_REPORT_TRIGGER_URL'),
    'Generate Update-Report for Physical Hosts': os.getenv('SEMAPHORE_PHYSICAL_HOSTS_UPDATE_REPORT_TRIGGER_URL'),
    'Update VMs & LXCs': os.getenv('SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL'),
    'Update PVE Clusters': os.getenv('SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL'),
    'Update Physical Hosts': os.getenv('SEMAPHORE_PHYSICAL_HOSTS_UPDATE_TRIGGER_URL'),
}

# Set your test guild ID here for faster command sync during development
GUILD_ID = int(os.getenv('DISCORD_SERVER_ID', '0'))  # Set this env var to your test guild ID

class WebhookButton(discord.ui.Button):
    def __init__(self, label: str, webhook_url: str):
        super().__init__(label=label, style=discord.ButtonStyle.primary)
        self.webhook_url = webhook_url

    async def callback(self, interaction: Interaction):
        async with aiohttp.ClientSession() as session:
            async with session.post(self.webhook_url) as resp:
                if resp.status == 200:
                    await interaction.response.send_message(f"Running Playbook for: {self.label}!", ephemeral=True)
                else:
                    await interaction.response.send_message(f"Failed to run Playbook for: {self.label}.", ephemeral=True)

class WebhookView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        for label, url in webhook_urls.items():
            self.add_item(WebhookButton(label, url))

class MyBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(command_prefix="!", intents=intents)
        self.tree.add_command(self.playbooks2)

    @app_commands.command(name="playbooks", description="Show Semaphore playbook buttons.")
    async def playbooks(self, interaction: Interaction):  # <-- rename here
        await interaction.response.send_message("Select a playbook to trigger:", view=WebhookView(), ephemeral=True)
    @app_commands.command(name="playbooks2", description="Show Semaphore playbook buttons.")
    async def playbooks2(self, interaction: Interaction):
        await interaction.response.send_message("Select a playbook to trigger:", view=WebhookView(), ephemeral=True)

    async def setup_hook(self):
        # Force guild-specific sync for faster updates and to avoid signature mismatch
        if GUILD_ID:
            guild = discord.Object(id=GUILD_ID)
            await self.tree.sync(guild=guild)
        else:
            await self.tree.sync()

if __name__ == "__main__":
    bot = MyBot()
    bot.run(token)
