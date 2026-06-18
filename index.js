If your bot works but Discord still says **"The application did not respond"**, there are two hidden bottlenecks in the interaction workflow causing this:

1. **The Button Setup (`updateUI`):** When you click a button (like selecting "Duo" or "PC"), the bot updates the map data, updates the embed, and then calls `interaction.reply({ content: "Updated selection!", ephemeral: true });`. However, if the network has even a millisecond of latency, Discord's strict 3-second window expires.
2. **The Fix:** We change all the setup button behaviors to use `interaction.deferUpdate()`. This instantly stops Discord's loading spinner and silently modifies the panel state without requiring popup alert spam.

Here is the finalized code. Replacing your script with this version ensures every interaction is structurally acknowledged within the required execution window.

```javascript
const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");

// ================= EXPRESS WEB SERVER =================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot is up and running for Render!");
});

app.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// ================= DISCORD BOT SETUP =================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const userData = new Map();

client.once("clientReady", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ================= PR SCRAPER FUNCTION =================
async function getPR(name) {
    try {
        const url = `https://fortnitetracker.com/profile/all/${encodeURIComponent(name)}/events`;

        const { data } = await axios.get(url, {
            timeout: 12000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html"
            }
        });

        const $ = cheerio.load(data);
        let pr = $(".profile-events-totals__value").first().text().trim();

        if (!pr) return "0 PR";
        return `${pr} PR`;

    } catch (err) {
        console.log("PR blocked or not found:", err.response?.status || err.message);
        return "0 PR";
    }
}

// ================= INTERACTION HANDLER =================
client.on("interactionCreate", async (interaction) => {

    // ================= CHAT COMMAND =================
    if (interaction.isChatInputCommand() && interaction.commandName === "look_for_player") {
        const modal = new ModalBuilder()
            .setCustomId("lfp_modal")
            .setTitle("Player Setup");

        const nameInput = new TextInputBuilder()
            .setCustomId("name")
            .setLabel("Epic Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        return interaction.showModal(modal);
    }

    // ================= MODAL SUBMIT =================
    if (interaction.isModalSubmit() && interaction.customId === "lfp_modal") {
        const name = interaction.fields.getTextInputValue("name");

        userData.set(interaction.user.id, {
            name,
            team: null,
            ping: null,
            fps: null,
            role: null,
            platform: null,
            region: null,
            tournament: null,
            pr: "Click SEND to fetch",
            msgId: null
        });

        const msg = await interaction.reply({
            embeds: [buildEmbed(userData.get(interaction.user.id))],
            components: buildUI(),
            fetchReply: true
        });

        userData.get(interaction.user.id).msgId = msg.id;
        return;
    }

    // ================= BUTTONS =================
    if (interaction.isButton()) {
        const data = userData.get(interaction.user.id);
        if (!data) return interaction.reply({ content: "Run /look_for_player first", ephemeral: true });

        // POST HANDLING (CRITICAL DEFENSE FOR SLOW CALLS)
        if (interaction.customId === "send_post") {
            if (!data.name) return interaction.reply({ content: "Setup first", ephemeral: true });
            
            // Instantly tells Discord we are processing so it doesn't say "Application did not respond"
            await interaction.deferReply({ ephemeral: true });

            data.pr = await getPR(data.name);

            const finalEmbed = new EmbedBuilder()
                .setTitle("🔥 LOOKING FOR PLAYER")
                .setColor("Purple")
                .addFields(
                    { name: "Player", value: data.name, inline: true },
                    { name: "Team Size", value: data.team || "N/A", inline: true },
                    { name: "Role", value: data.role || "N/A", inline: true },
                    { name: "Ping", value: data.ping || "N/A", inline: true },
                    { name: "FPS", value: data.fps || "N/A", inline: true },
                    { name: "Platform", value: data.platform || "N/A", inline: true },
                    { name: "Region", value: data.region || "N/A", inline: true },
                    { name: "Tournament", value: data.tournament || "N/A", inline: true },
                    { name: "PR", value: data.pr, inline: true }
                );

            await interaction.channel.send({ embeds: [finalEmbed] });
            return interaction.editReply({ content: "Posted successfully with updated PR!" });
        }

        // Defer UI changes immediately to stop loading animations
        await interaction.deferUpdate();

        // Selections Parsing
        if (interaction.customId.startsWith("team_")) data.team = interaction.customId.replace("team_", "");
        if (interaction.customId.startsWith("ping_")) data.ping = interaction.customId.replace("ping_", "").replaceAll("_", "-") + "ms";
        if (interaction.customId.startsWith("fps_")) data.fps = interaction.customId.replace("fps_", "") + "+";
        if (interaction.customId.startsWith("role_")) data.role = interaction.customId.replace("role_", "").toUpperCase();
        if (interaction.customId.startsWith("platform_")) data.platform = interaction.customId.replace("platform_", "").toUpperCase();

        userData.set(interaction.user.id, data);
        await updateUI(interaction);
        return;
    }

    // ================= SELECT MENUS =================
    if (interaction.isStringSelectMenu()) {
        const data = userData.get(interaction.user.id);
        if (!data) return;

        await interaction.deferUpdate();

        if (interaction.customId === "region") data.region = interaction.values[0];
        if (interaction.customId === "tournament") data.tournament = interaction.values[0];

        userData.set(interaction.user.id, data);
        await updateUI(interaction);
        return;
    }
});

// ================= UI GENERATION =================
function buildEmbed(data) {
    return new EmbedBuilder()
        .setTitle("🟣 BUSCANDO JUGADORES")
        .setColor("DarkButNotBlack")
        .setDescription("Fill all options below, then press **⚡ SEND POST**")
        .addFields(
            { name: "Player", value: data.name || "N/A", inline: true },
            { name: "Team", value: data.team || "N/A", inline: true },
            { name: "Role", value: data.role || "N/A", inline: true },
            { name: "Ping", value: data.ping || "N/A", inline: true },
            { name: "FPS", value: data.fps || "N/A", inline: true },
            { name: "Platform", value: data.platform || "N/A", inline: true },
            { name: "Region", value: data.region || "N/A", inline: true },
            { name: "Tournament", value: data.tournament || "N/A", inline: true },
            { name: "PR Status", value: data.pr || "0 PR", inline: true }
        );
}

function buildUI() {
    return [
        // ROW 1: TEAM SIZE & PLATFORM
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("team_duo").setLabel("Duo").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("team_trio").setLabel("Trio").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("platform_pc").setLabel("PC").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("platform_console").setLabel("Console").setStyle(ButtonStyle.Success)
        ),

        // ROW 2: ROLES & SUBMIT
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("role_igl").setLabel("IGL").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_fragger").setLabel("Fragger").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_support").setLabel("Support").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("send_post").setLabel("⚡ SEND POST").setStyle(ButtonStyle.Danger)
        ),

        // ROW 3: REGION DROPDOWN
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("region")
                .setPlaceholder("Select Region")
                .addOptions(
                    { label: "NAE", value: "NAE" },
                    { label: "NAC", value: "NAC" },
                    { label: "EU", value: "EU" },
                    { label: "BR", value: "BR" }
                )
        ),

        // ROW 4: TOURNAMENT DROPDOWN
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("tournament")
                .setPlaceholder("Select Tournament")
                .addOptions(
                    { label: "Cash Cup", value: "Cash Cup" },
                    { label: "FNCS", value: "FNCS" },
                    { label: "Scrims", value: "Scrims" },
                    { label: "Ranked", value: "Ranked" }
                )
        )
    ];
}

// ================= COMPONENT UPDATER =================
async function updateUI(interaction) {
    const data = userData.get(interaction.user.id);
    if (!data?.msgId) return;

    try {
        const msg = await interaction.channel.messages.fetch(data.msgId);
        await msg.edit({
            embeds: [buildEmbed(data)],
            components: buildUI()
        });
    } catch (err) {
        console.log("Update error:", err.message);
    }
}

client.login(process.env.TOKEN);

```
