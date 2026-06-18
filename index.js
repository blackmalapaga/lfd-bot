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

// Store temporary user data
const userData = new Map();

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------- SLASH COMMAND ----------
client.on("interactionCreate", async (interaction) => {

    // /lfd command
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "lfd") {

            const modal = new ModalBuilder()
                .setCustomId("lfd_modal")
                .setTitle("Buscando Jugadores");

            const nameInput = new TextInputBuilder()
                .setCustomId("fortnite_name")
                .setLabel("Nombre de Fortnite")
                .setStyle(TextInputStyle.Short);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput)
            );

            return interaction.showModal(modal);
        }
    }

    // MODAL SUBMIT
    if (interaction.isModalSubmit()) {

        if (interaction.customId === "lfd_modal") {

            const fortniteName = interaction.fields.getTextInputValue("fortnite_name");

            userData.set(interaction.user.id, {
                fortniteName,
                ping: "",
                fps: "",
                role: "",
                teamSize: "",
                region: "",
                mode: "",
                pr: "Cargando..."
            });

            const teamMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("team_size")
                    .setPlaceholder("Tamaño del equipo")
                    .addOptions(
                        { label: "Duo", value: "Duo" },
                        { label: "Trio", value: "Trio" },
                        { label: "Squad", value: "Squad" }
                    )
            );

            const regionMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("region")
                    .setPlaceholder("Región")
                    .addOptions(
                        { label: "NAE", value: "NAE" },
                        { label: "NAC", value: "NAC" },
                        { label: "EUROPA", value: "EUROPA" }
                    )
            );

            const modeMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("mode")
                    .setPlaceholder("Modo")
                    .addOptions(
                        { label: "Cash Cup", value: "Cash Cup" },
                        { label: "FNCS", value: "FNCS" },
                        { label: "Torneo Meme", value: "Meme" },
                        { label: "Reload", value: "Reload" },
                        { label: "Cero Construcción", value: "ZeroBuild" }
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

            await interaction.reply({
                content: "Configura tu LFD:",
                components: [
                    teamMenu,
                    regionMenu,
                    modeMenu,
                    pingButtons,
                    fpsButtons,
                    roleButtons
                ],
                ephemeral: true
            });
        }
    }

    // SELECT MENUS
    if (interaction.isStringSelectMenu()) {
        const data = userData.get(interaction.user.id);
        if (!data) return;

        if (interaction.customId === "team_size") data.teamSize = interaction.values[0];
        if (interaction.customId === "region") data.region = interaction.values[0];
        if (interaction.customId === "mode") data.mode = interaction.values[0];

        userData.set(interaction.user.id, data);
        return interaction.reply({ content: "Guardado", ephemeral: true });
    }

    // BUTTONS
    if (interaction.isButton()) {
        const data = userData.get(interaction.user.id);
        if (!data) return;

        if (interaction.customId.startsWith("ping")) {
            data.ping = interaction.customId.replace("ping_", "").replaceAll("_", "-") + "ms";
        }

        if (interaction.customId.startsWith("fps")) {
            data.fps = interaction.customId.replace("fps_", "") + "+";
        }

        if (interaction.customId.startsWith("role_")) {
            const role = interaction.customId.replace("role_", "").toUpperCase();
            data.role = role;
        }

        userData.set(interaction.user.id, data);

        return interaction.reply({ content: "Actualizado", ephemeral: true });
    }
});

// OPTIONAL: PR FETCH (safe version)
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

// FINAL POST COMMAND (simple trigger)
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "lfd") return;

    const data = userData.get(interaction.user.id);
    if (!data) return;

    data.pr = await getPR(data.fortniteName);

    const embed = new EmbedBuilder()
        .setTitle("Buscando Jugadores")
        .addFields(
            { name: "Usuario", value: data.fortniteName || "N/A" },
            { name: "Team", value: data.teamSize || "N/A" },
            { name: "PR", value: data.pr },
            { name: "Ping", value: data.ping || "N/A" },
            { name: "FPS", value: data.fps || "N/A" },
            { name: "Rol", value: data.role || "N/A" },
            { name: "Región", value: data.region || "N/A" },
            { name: "Modo", value: data.mode || "N/A" }
        );

    await interaction.reply({ embeds: [embed] });
});

client.login(process.env.TOKEN);
