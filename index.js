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

        try {
            return await interaction.showModal(modal);
        } catch (err) {
            console.error("Modal error:", err);
        }
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
            pr: "Loading..."
        });

        const embed = new EmbedBuilder()
            .setTitle("🎮 LFD SYSTEM")
            .setDescription("Fill everything below then press **SEND**")
            .setColor("Blue");

        const rows = [

            // TEAM
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("team_size")
                    .setPlaceholder("Select Team Size")
                    .addOptions(
                        { label: "Duo", value: "Duo" },
                        { label: "Trio", value: "Trio" },
                        { label: "Squad", value: "Squad" }
                    )
            ),

            // REGION
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("region")
                    .setPlaceholder("Select Region")
                    .addOptions(
                        { label: "NAE", value: "NAE" },
                        { label: "NAC", value: "NAC" },
                        { label: "EU", value: "EU" }
                    )
            ),

            // MODE
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("mode")
                    .setPlaceholder("Select Mode")
                    .addOptions(
                        { label: "Cash Cup", value: "Cash Cup" },
                        { label: "FNCS", value: "FNCS" },
                        { label: "Zero Build", value: "ZeroBuild" },
                        { label: "Reload", value: "Reload" }
                    )
            ),

            // PING
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("ping_0_20").setLabel("0-20ms").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("ping_20_40").setLabel("20-40ms").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("ping_40_60").setLabel("40-60ms").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("ping_60_100").setLabel("60-100ms").setStyle(ButtonStyle.Secondary)
            ),

            // FPS + ROLE + SEND
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("fps_60").setLabel("60-120 FPS").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("fps_120").setLabel("120-240 FPS").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("role_igl").setLabel("IGL").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("role_fragger").setLabel("FRAGGER").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("lfd_send").setLabel("SEND POST").setStyle(ButtonStyle.Success)
            )
        ];

        return interaction.reply({
            embeds: [embed],
            components: rows,
            ephemeral: true
        });
    }

    // ================= SELECT =================
    if (interaction.isStringSelectMenu()) {

        const data = userData.get(interaction.user.id);
        if (!data) return;

        if (interaction.customId === "team_size") data.teamSize = interaction.values[0];
        if (interaction.customId === "region") data.region = interaction.values[0];
        if (interaction.customId === "mode") data.mode = interaction.values[0];

        userData.set(interaction.user.id, data);

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

        // ================= SEND =================
        if (interaction.customId === "lfd_send") {

            try {
                const d = userData.get(interaction.user.id);

                if (!d?.fortniteName) {
                    return interaction.reply({
                        content: "Finish setup first",
                        ephemeral: true
                    });
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

                return interaction.reply({
                    content: "Posted successfully",
                    ephemeral: true
                });

            } catch (err) {
                console.error(err);
                return interaction.reply({
                    content: "Error posting LFD",
                    ephemeral: true
                });
            }
        }

        return interaction.reply({ content: "Updated", ephemeral: true });
    }
});

// ================= PR SCRAPER =================
async function getPR(name) {
    try {
        const url = `https://fortnitetracker.com/profile/all/${encodeURIComponent(name)}/events`;

        const { data } = await axios.get(url, {
            timeout: 10000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const $ = cheerio.load(data);

        const pr = $(".profile-events-totals__value").first().text().trim();

        return pr || "0";
    } catch (err) {
        console.log("PR error:", err.message);
        return "0";
    }
}

client.login(process.env.TOKEN);
