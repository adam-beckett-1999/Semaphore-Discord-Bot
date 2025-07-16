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


// Grouped button definitions with emojis
const buttonGroups = [
  {
    category: 'Update Reports',
    description: 'Generate update reports for your infrastructure.',
    buttons: [
      {
        label: 'VMs & LXCs',
        emoji: '📄',
        customId: 'webhook_Generate Update-Report for VMs & LXCs',
        url: process.env.SEMAPHORE_VMS_LXCS_UPDATE_REPORT_TRIGGER_URL,
      },
      {
        label: 'PVE Clusters',
        emoji: '📄',
        customId: 'webhook_Generate Update-Report for PVE Clusters',
        url: process.env.SEMAPHORE_PVE_CLUSTERS_UPDATE_REPORT_TRIGGER_URL,
      },
      {
        label: 'Physical Hosts',
        emoji: '📄',
        customId: 'webhook_Generate Update-Report for Physical Hosts',
        url: process.env.SEMAPHORE_PHYSICAL_HOSTS_UPDATE_REPORT_TRIGGER_URL,
      },
    ],
  },
  {
    category: 'Update Installs',
    description: 'Trigger update installations for your infrastructure.',
    buttons: [
      {
        label: 'VMs & LXCs',
        emoji: '⬇️',
        customId: 'webhook_Update VMs & LXCs',
        url: process.env.SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL,
      },
      {
        label: 'PVE Clusters',
        emoji: '⬇️',
        customId: 'webhook_Update PVE Clusters',
        url: process.env.SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL,
      },
      {
        label: 'Physical Hosts',
        emoji: '⬇️',
        customId: 'webhook_Update Physical Hosts',
        url: process.env.SEMAPHORE_PHYSICAL_HOSTS_UPDATE_TRIGGER_URL,
      },
    ],
  },
];

// For button interaction lookup
const webhookUrls = {};
buttonGroups.forEach(group => {
  group.buttons.forEach(btn => {
    webhookUrls[btn.customId.replace('webhook_', '')] = btn.url;
  });
});

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
    // Build a message with category descriptions
    let content = '**Semaphore Playbooks**\n\n';
    buttonGroups.forEach(group => {
      content += `__${group.category}__\n${group.description}\n`;
      group.buttons.forEach(btn => {
        content += `> ${btn.emoji} **${btn.label}**\n`;
      });
      content += '\n';
    });

    // Create rows of buttons for each group (max 5 per row)
    const rows = [];
    buttonGroups.forEach(group => {
      const groupButtons = group.buttons.map(btn =>
        new ButtonBuilder()
          .setCustomId(btn.customId)
          .setLabel(`${btn.emoji} ${btn.label}`)
          .setStyle(ButtonStyle.Primary)
      );
      for (let i = 0; i < groupButtons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(groupButtons.slice(i, i + 5)));
      }
    });
    // Add a cancel/close button (always last row)
    const cancelButton = new ButtonBuilder()
      .setCustomId('close_menu')
      .setLabel('❌ Close')
      .setStyle(ButtonStyle.Secondary);
    rows.push(new ActionRowBuilder().addComponents(cancelButton));
    await interaction.reply({ content, components: rows, ephemeral: true });
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'close_menu') {
      // Delete the reply (ephemeral, so just update to say closed)
      await interaction.update({ content: 'Menu closed.', components: [] });
      return;
    }
    if (interaction.customId.startsWith('webhook_')) {
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
  }
});

client.login(token);
