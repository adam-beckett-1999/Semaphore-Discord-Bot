// index.js
import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Events,
  InteractionType
} from 'discord.js';
import fetch from 'node-fetch';

// Validate required environment variables
const requiredEnv = [
  'DISCORD_SEMAPHORE_CONTROL_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_SERVER_ID',
  'SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL',
  'SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL',
  'SEMAPHORE_PHYSICAL_HOSTS_UPDATE_TRIGGER_URL',
  'SEMAPHORE_VMS_LXCS_UPDATE_REPORT_TRIGGER_URL',
  'SEMAPHORE_PVE_CLUSTERS_UPDATE_REPORT_TRIGGER_URL',
  'SEMAPHORE_PHYSICAL_HOSTS_UPDATE_REPORT_TRIGGER_URL',
];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const token = process.env.DISCORD_SEMAPHORE_CONTROL_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_SERVER_ID;

const webhookUrls = {
  'Generate Update-Report for VMs & LXCs': process.env.SEMAPHORE_VMS_LXCS_UPDATE_REPORT_TRIGGER_URL,
  'Generate Update-Report for PVE Clusters': process.env.SEMAPHORE_PVE_CLUSTERS_UPDATE_REPORT_TRIGGER_URL,
  'Generate Update-Report for Physical Hosts': process.env.SEMAPHORE_PHYSICAL_HOSTS_UPDATE_REPORT_TRIGGER_URL,
  'Update VMs & LXCs': process.env.SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL,
  'Update PVE Clusters': process.env.SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL,
  'Update Physical Hosts': process.env.SEMAPHORE_PHYSICAL_HOSTS_UPDATE_TRIGGER_URL,
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Register slash command
const commands = [
  {
    name: 'playbooks',
    description: 'Show Semaphore playbook buttons.',
  },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Registering slash command...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );
    console.log('Slash command registered.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'playbooks') {
    // Create buttons (max 5 per row)
    const buttons = Object.entries(webhookUrls).map(([label, url]) =>
      new ButtonBuilder()
        .setCustomId(`webhook_${label}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary)
    );
    // Split buttons into rows of 5
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }
    await interaction.reply({ content: 'Select a playbook to trigger:', components: rows, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId.startsWith('webhook_')) {
    const label = interaction.customId.replace('webhook_', '');
    const webhookUrl = webhookUrls[label];
    if (!webhookUrl) {
      await interaction.reply({ content: 'Webhook URL not found.', ephemeral: true });
      return;
    }
    try {
      const resp = await fetch(webhookUrl, { method: 'POST' });
      if (resp.ok) {
        await interaction.reply({ content: `Running Playbook for: ${label}!`, ephemeral: true });
      } else {
        await interaction.reply({ content: `Failed to run Playbook for: ${label}.`, ephemeral: true });
      }
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
});

client.login(token);
