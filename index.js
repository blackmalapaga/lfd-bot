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

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ================= MAIN =================
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
            ping: "",
            fps: "",
            role: "",
            teamSize: "",
            region: "",
            mode: "",
            pr: "Loading..."
        });

        const teamMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("team_size")
                .setPlaceholder("Team Size")
                .addOptions(
                    { label: "Duo", value: "Duo" },
                    { label: "Trio", value: "Trio" },
                    { label: "Squad", value: "Squad" }
                )
        );

        const regionMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("region")
                .setPlaceholder("Region")
                .addOptions(
                    { label: "NAE", value: "NAE" },
                    { label: "NAC", value: "NAC" },
                    { label: "EU", value: "EU" }
                )
        );

        const modeMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("mode")
                .setPlaceholder("Mode")
                .addOptions(
                    { label: "Cash Cup", value: "Cash Cup" },
                    { label: "FNCS", value: "FNCS" },
                    { label: "Zero Build", value: "ZeroBuild" },
                    { label: "Reload", value: "Reload" }
                )
        );

        const pingButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ping_0_20").setLabel("0-20ms").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_20_40").setLabel("20-40ms").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_40_60").setLabel("40-60ms").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_60_100").setLabel("60-100ms").setStyle(ButtonStyle.Secondary)
        );

        const fpsButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("fps_60").setLabel("60-120").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("fps_120").setLabel("120-240").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("fps_240").setLabel("240+").setStyle(ButtonStyle.Secondary)
        );

        const roleButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("role_igl").setLabel("IGL").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_fragger").setLabel("Fragger").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_support").setLabel("Support").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_backpack").setLabel("Backpack").setStyle(ButtonStyle.Primary)
        );

        const sendButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("lfd_send")
                .setLabel("SEND LFD")
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            content: "Setup your LFD (Part 1)",
            components: [teamMenu, regionMenu, modeMenu],
            ephemeral: true
        });

        await interaction.followUp({
            content: "Setup your LFD (Part 2)",
            components: [pingButtons, fpsButtons, roleButtons, sendButton],
            ephemeral: true
        });
    }

    // ===== SELECT MENUS =====
    if (interaction.isStringSelectMenu()) {

        const data = userData.get(interaction.user.id);
        if (!data) return;

        if (interaction.customId === "team_size") data.teamSize = interaction.values[0];
        if (interaction.customId === "region") data.region = interaction.values[0];
        if (interaction.customId === "mode") data.mode = interaction.values[0];

        userData.set(interaction.user.id, data);

        return interaction.reply({ content: "Saved", ephemeral: true });
    }

    // ===== BUTTONS =====
    if (interaction.isButton()) {

        const data = userData.get(interaction.user.id);
        if (!data) return;

        if (interaction.customId.startsWith("ping_")) {
            data.ping = interaction.customId.replace("ping_", "").replaceAll("_", "-") + "ms";
        }

        if (interaction.customId.startsWith("fps_")) {
            data.fps = interaction.customId.replace("fps_", "") + "+";
        }

        if (interaction.customId.startsWith("role_")) {
            data.role = interaction.customId.replace("role_", "").toUpperCase();
        }

        userData.set(interaction.user.id, data);

        // ===== FINAL SEND BUTTON =====
        if (interaction.customId === "lfd_send") {

            const d = userData.get(interaction.user.id);
            if (!d) return interaction.reply({ content: "No data", ephemeral: true });

            d.pr = await getPR(d.fortniteName);

            const embed = new EmbedBuilder()
                .setTitle("LFD POST")
                .addFields(
                    { name: "Name", value: d.fortniteName || "N/A" },
                    { name: "Team", value: d.teamSize || "N/A" },
                    { name: "PR", value: d.pr },
                    { name: "Ping", value: d.ping || "N/A" },
                    { name: "FPS", value: d.fps || "N/A" },
                    { name: "Role", value: d.role || "N/A" },
                    { name: "Region", value: d.region || "N/A" },
                    { name: "Mode", value: d.mode || "N/A" }
                );

            // SEND TO CHANNEL (THIS FIXES YOUR ISSUE)
            await interaction.channel.send({ embeds: [embed] });

            return interaction.reply({
                content: "LFD SENT",
                ephemeral: true
            });
        }

        return interaction.reply({ content: "Updated", ephemeral: true });
    }
});

// ===== PR SCRAPER =====
async function getPR(name) {
    try {
        const url = `https://fortnitetracker.com/profile/all/${encodeURIComponent(name)}/events`;
        const { data } = await axios.get(url);

        const $ = cheerio.load(data);
        const pr = $(".profile-events-totals__value").first().text().trim();

        return pr || "N/A";
    } catch {
        return "N/A";
    }
}

client.login(process.env.TOKEN);
