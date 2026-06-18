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

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const userData = new Map();

client.once("clientReady", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ================= COMMAND =================
client.on("interactionCreate", async (interaction) => {

    // ===== /lfd =====
    if (interaction.isChatInputCommand() && interaction.commandName === "lfd") {

        const modal = new ModalBuilder()
            .setCustomId("lfd_modal")
            .setTitle("LFD Setup");

        const nameInput = new TextInputBuilder()
            .setCustomId("fortnite_name")
            .setLabel("Fortnite Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput)
        );

        return interaction.showModal(modal);
    }

    // ===== MODAL =====
    if (interaction.isModalSubmit() && interaction.customId === "lfd_modal") {

        const fortniteName = interaction.fields.getTextInputValue("fortnite_name");

        userData.set(interaction.user.id, {
            fortniteName,
            ping: null,
            fps: null,
            role: null,
            teamSize: null,
            region: null,
            mode: null,
            pr: "0",
            msgId: null
        });

        const embed = buildEmbed(userData.get(interaction.user.id));

        const components = buildUI();

        const msg = await interaction.reply({
            embeds: [embed],
            components,
            ephemeral: true,
            fetchReply: true
        });

        const data = userData.get(interaction.user.id);
        data.msgId = msg.id;
        userData.set(interaction.user.id, data);
    }

    // ================= SELECT MENUS =================
    if (interaction.isStringSelectMenu()) {

        const data = userData.get(interaction.user.id);
        if (!data) return interaction.reply({ content: "No setup", ephemeral: true });

        if (interaction.customId === "team_size") data.teamSize = interaction.values[0];
        if (interaction.customId === "region") data.region = interaction.values[0];
        if (interaction.customId === "mode") data.mode = interaction.values[0];

        userData.set(interaction.user.id, data);

        await updateUI(interaction);
        return interaction.reply({ content: "Saved", ephemeral: true });
    }

    // ================= BUTTONS =================
    if (interaction.isButton()) {

        const data = userData.get(interaction.user.id);
        if (!data) return interaction.reply({ content: "No setup found", ephemeral: true });

        if (interaction.customId.startsWith("ping_")) {
            data.ping = interaction.customId.replace("ping_", "").replaceAll("_", "-") + "ms";
        }

        if (interaction.customId.startsWith("fps_")) {
            data.fps = interaction.customId.replace("fps_", "") + "+ FPS";
        }

        if (interaction.customId.startsWith("role_")) {
            data.role = interaction.customId.replace("role_", "").toUpperCase();
        }

        userData.set(interaction.user.id, data);

        // ===== SEND FINAL =====
        if (interaction.customId === "lfd_send") {

            const d = userData.get(interaction.user.id);

            if (!d?.fortniteName) {
                return interaction.reply({ content: "Finish setup first", ephemeral: true });
            }

            d.pr = await getPR(d.fortniteName);

            const embed = new EmbedBuilder()
                .setTitle("🔥 LFD POST")
                .setColor("Green")
                .addFields(
                    { name: "Name", value: d.fortniteName || "N/A", inline: true },
                    { name: "Team", value: d.teamSize || "N/A", inline: true },
                    { name: "PR", value: d.pr, inline: true },
                    { name: "Ping", value: d.ping || "N/A", inline: true },
                    { name: "FPS", value: d.fps || "N/A", inline: true },
                    { name: "Role", value: d.role || "N/A", inline: true },
                    { name: "Region", value: d.region || "N/A", inline: true },
                    { name: "Mode", value: d.mode || "N/A", inline: true }
                );

            await interaction.channel.send({ embeds: [embed] });

            return interaction.reply({ content: "Posted", ephemeral: true });
        }

        await updateUI(interaction);
        return interaction.reply({ content: "Updated", ephemeral: true });
    }
});

// ================= UI BUILDER =================
function buildEmbed(data) {
    return new EmbedBuilder()
        .setTitle("🎮 LFD SYSTEM")
        .setColor("Blue")
        .addFields(
            { name: "Name", value: data.fortniteName || "N/A", inline: true },
            { name: "Team", value: data.teamSize || "N/A", inline: true },
            { name: "Region", value: data.region || "N/A", inline: true },
            { name: "Mode", value: data.mode || "N/A", inline: true },
            { name: "Ping", value: data.ping || "N/A", inline: true },
            { name: "FPS", value: data.fps || "N/A", inline: true },
            { name: "Role", value: data.role || "N/A", inline: true },
            { name: "PR", value: data.pr || "0", inline: true }
        );
}

function buildUI() {
    return [

        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("team_size")
                .setPlaceholder("Team Size")
                .addOptions(
                    { label: "Duo", value: "Duo" },
                    { label: "Trio", value: "Trio" },
                    { label: "Squad", value: "Squad" }
                )
        ),

        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("region")
                .setPlaceholder("Region")
                .addOptions(
                    { label: "NAE", value: "NAE" },
                    { label: "NAC", value: "NAC" },
                    { label: "EU", value: "EU" }
                )
        ),

        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("mode")
                .setPlaceholder("Mode")
                .addOptions(
                    { label: "Cash Cup", value: "Cash Cup" },
                    { label: "FNCS", value: "FNCS" },
                    { label: "Zero Build", value: "ZeroBuild" },
                    { label: "Reload", value: "Reload" }
                )
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ping_0_20").setLabel("0-20").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_20_40").setLabel("20-40").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_40_60").setLabel("40-60").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_60_100").setLabel("60-100").setStyle(ButtonStyle.Secondary)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("fps_60").setLabel("60-120 FPS").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("fps_120").setLabel("120-240 FPS").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("role_igl").setLabel("IGL").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_fragger").setLabel("FRAGGER").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("lfd_send").setLabel("SEND POST").setStyle(ButtonStyle.Success)
        )
    ];
}

// ================= LIVE UPDATE =================
async function updateUI(interaction) {
    const data = userData.get(interaction.user.id);
    if (!data?.msgId) return;

    try {
        const channel = interaction.channel;
        const msg = await channel.messages.fetch(data.msgId);

        await msg.edit({
            embeds: [buildEmbed(data)],
            components: buildUI()
        });
    } catch (err) {
        console.log("UpdateUI error:", err.message);
    }
}

// ================= PR =================
async function getPR(name) {
    try {
        const url = `https://fortnitetracker.com/profile/all/${encodeURIComponent(name)}/events`;

        const { data } = await axios.get(url, {
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "text/html"
            }
        });

        const $ = cheerio.load(data);
        const pr = $(".profile-events-totals__value").first().text().trim();

        return pr || "0";
    } catch (err) {
        console.log("PR blocked:", err.message);
        return "0";
    }
}

client.login(process.env.TOKEN);
