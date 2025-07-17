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
  StringSelectMenuBuilder,
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
  'SEMAPHORE_PVE_CORE_CLUSTER_REBOOT_URL',
  'SEMAPHORE_PVE_MINI_CLUSTER_REBOOT_URL',
  'SEMAPHORE_PVE_TEST_CLUSTER_REBOOT_URL',
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
  {
    category: 'PVE Cluster Reboots',
    description: 'Perform a rolling reboot of your PVE clusters (HA-Aware).',
    buttons: [
      {
        label: 'Reboot PVE-CORE-CLUSTER',
        emoji: '🔄',
        customId: 'webhook_Reboot PVE-CORE-CLUSTER',
        url: process.env.SEMAPHORE_PVE_CORE_CLUSTER_REBOOT_URL,
      },
      {
        label: 'Reboot PVE-MINI-CLUSTER',
        emoji: '🔄',
        customId: 'webhook_Reboot PVE-MINI-CLUSTER',
        url: process.env.SEMAPHORE_PVE_MINI_CLUSTER_REBOOT_URL,
      },
      {
        label: 'Reboot PVE-TEST-CLUSTER',
        emoji: '🔄',
        customId: 'webhook_Reboot PVE-TEST-CLUSTER',
        url: process.env.SEMAPHORE_PVE_TEST_CLUSTER_REBOOT_URL,
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
    name: 'automations',
    description: 'Show Semaphore automation buttons.',
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
  // Main menu: show select menu for categories
  if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'automations') {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_category')
      .setPlaceholder('Select an automation category...')
      .addOptions(
        buttonGroups.map(group => ({
          label: group.category,
          description: group.description,
          value: group.category,
          emoji: group.category === 'Update Reports' ? '📄' : '⬇️',
        }))
      );
    const row = new ActionRowBuilder().addComponents(selectMenu);
    const closeButton = new ButtonBuilder()
      .setCustomId('close_menu')
      .setLabel('❌ Close')
      .setStyle(ButtonStyle.Secondary);
    const closeRow = new ActionRowBuilder().addComponents(closeButton);
    await interaction.reply({
      content: '\n**Semaphore Automations**\n\nPlease select a category to view available automations.',
      components: [row, closeRow]
    });
    // Fetch the reply for later deletion if needed
    const reply = await interaction.fetchReply();
    interaction._mainMsg = reply;
    return;
  }

  // Handle select menu for category
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_category') {
    const selectedCategory = interaction.values[0];
    const group = buttonGroups.find(g => g.category === selectedCategory);
    if (!group) {
      await interaction.update({ content: 'Category not found.', components: [] });
      return;
    }
    // Build submenu with buttons for this category
    let content = `\n**${group.category}**\n\n${group.description}\n\n*Choose an automation below:*`;
    const groupButtons = group.buttons.map(btn =>
      new ButtonBuilder()
        .setCustomId(btn.customId)
        .setLabel(`${btn.emoji} ${btn.label}`)
        .setStyle(ButtonStyle.Primary)
    );
    const rows = [];
    for (let i = 0; i < groupButtons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(groupButtons.slice(i, i + 5)));
    }
    // Add back and close buttons
    const backButton = new ButtonBuilder()
      .setCustomId('back_to_main')
      .setLabel('⬅️ Back')
      .setStyle(ButtonStyle.Secondary);
    const closeButton = new ButtonBuilder()
      .setCustomId('close_menu')
      .setLabel('❌ Close')
      .setStyle(ButtonStyle.Secondary);
    rows.push(new ActionRowBuilder().addComponents(backButton, closeButton));
    await interaction.update({ content, components: rows });
    return;
  }

  // Handle back button
  if (interaction.isButton() && interaction.customId === 'back_to_main') {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_category')
      .setPlaceholder('Select an automation category...')
      .addOptions(
        buttonGroups.map(group => ({
          label: group.category,
          description: group.description,
          value: group.category,
          emoji: group.category === 'Update Reports' ? '📄' : '⬇️',
        }))
      );
    const row = new ActionRowBuilder().addComponents(selectMenu);
    const closeButton = new ButtonBuilder()
      .setCustomId('close_menu')
      .setLabel('❌ Close')
      .setStyle(ButtonStyle.Secondary);
    const closeRow = new ActionRowBuilder().addComponents(closeButton);
    await interaction.update({
      content: '\n**Semaphore Automations**\n\nPlease select a category to view available automations.',
      components: [row, closeRow],
    });
    return;
  }

  // Handle close button
  if (interaction.isButton() && interaction.customId === 'close_menu') {
    await interaction.update({ content: 'Menu closed.', components: [] });
    setTimeout(async () => {
      try {
        await interaction.message.delete();
      } catch (e) {
        // Ignore if already deleted or missing permissions
      }
    }, 5000);
    return;
  }

  // Handle playbook button
  if (interaction.isButton() && interaction.customId.startsWith('webhook_')) {
    const label = interaction.customId.replace('webhook_', '');
    const webhookUrl = webhookUrls[label];
    if (!webhookUrl) {
      await interaction.reply({ content: 'Webhook URL not found.' });
      const reply = await interaction.fetchReply();
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch (e) {}
      }, 5000);
      return;
    }
    try {
      const resp = await fetch(webhookUrl, { method: 'POST' });
      if (resp.ok) {
        await interaction.reply({ content: `Running Automation for: ${label}!` });
      } else {
        await interaction.reply({ content: `Failed to run Automation for: ${label}.` });
      }
      const reply = await interaction.fetchReply();
      setTimeout(async () => {
        try {
          await reply.delete();
          await interaction.message.delete();
        } catch (e) {}
      }, 5000);
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}` });
      const reply = await interaction.fetchReply();
      setTimeout(async () => {
        try {
          await reply.delete();
          await interaction.message.delete();
        } catch (e) {}
      }, 5000);
    }
    return;
  }
});

client.login(token);
