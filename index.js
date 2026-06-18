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

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const userData = new Map();

client.once("clientReady", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ================= COMMAND =================
client.on("interactionCreate", async (interaction) => {

    // /look_for_player
    if (interaction.isChatInputCommand() && interaction.commandName === "look_for_player") {

        const modal = new ModalBuilder()
            .setCustomId("lfp_modal")
            .setTitle("Player Setup");

        const nameInput = new TextInputBuilder()
            .setCustomId("name")
            .setLabel("Epic Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput)
        );

        return interaction.showModal(modal);
    }

    // ================= MODAL =================
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
            msgId: null
        });

        const msg = await interaction.reply({
            embeds: [buildEmbed(userData.get(interaction.user.id))],
            components: buildUI(),
            fetchReply: true
        });

        userData.get(interaction.user.id).msgId = msg.id;
    }

    // ================= BUTTONS =================
    if (interaction.isButton()) {

        const data = userData.get(interaction.user.id);
        if (!data) return interaction.reply({ content: "Run /look_for_player first", ephemeral: true });

        // TEAM SIZE
        if (interaction.customId.startsWith("team_")) {
            data.team = interaction.customId.replace("team_", "");
        }

        // PING
        if (interaction.customId.startsWith("ping_")) {
            data.ping = interaction.customId.replace("ping_", "").replaceAll("_", "-") + "ms";
        }

        // FPS
        if (interaction.customId.startsWith("fps_")) {
            data.fps = interaction.customId.replace("fps_", "") + "+";
        }

        // ROLE
        if (interaction.customId.startsWith("role_")) {
            data.role = interaction.customId.replace("role_", "").toUpperCase();
        }

        // PLATFORM
        if (interaction.customId.startsWith("platform_")) {
            data.platform = interaction.customId.replace("platform_", "").toUpperCase();
        }

        userData.set(interaction.user.id, data);

        if (interaction.customId === "send_post") {

            const embed = new EmbedBuilder()
                .setTitle("🔥 LOOKING FOR PLAYER")
                .setColor("Purple")
                .addFields(
                    { name: "Player", value: data.name || "N/A", inline: true },
                    { name: "Team Size", value: data.team || "N/A", inline: true },
                    { name: "Role", value: data.role || "N/A", inline: true },
                    { name: "Ping", value: data.ping || "N/A", inline: true },
                    { name: "FPS", value: data.fps || "N/A", inline: true },
                    { name: "Platform", value: data.platform || "N/A", inline: true },
                    { name: "Region", value: data.region || "N/A", inline: true },
                    { name: "Tournament", value: data.tournament || "N/A", inline: true }
                );

            await interaction.channel.send({ embeds: [embed] });

            return interaction.reply({ content: "Posted!", ephemeral: true });
        }

        await updateUI(interaction);
        return interaction.reply({ content: "Updated", ephemeral: true });
    }

    // ================= SELECT MENUS =================
    if (interaction.isStringSelectMenu()) {

        const data = userData.get(interaction.user.id);
        if (!data) return;

        if (interaction.customId === "region") data.region = interaction.values[0];
        if (interaction.customId === "tournament") data.tournament = interaction.values[0];

        userData.set(interaction.user.id, data);

        await updateUI(interaction);
        return interaction.reply({ content: "Saved", ephemeral: true });
    }
});

// ================= UI =================
function buildEmbed(data) {
    return new EmbedBuilder()
        .setTitle("🟣 BUSCANDO JUGADORES")
        .setColor("DarkButNotBlack")
        .setDescription("Fill all options then press SEND")
        .addFields(
            { name: "Player", value: data.name || "N/A", inline: true },
            { name: "Team", value: data.team || "N/A", inline: true },
            { name: "Role", value: data.role || "N/A", inline: true },
            { name: "Ping", value: data.ping || "N/A", inline: true },
            { name: "FPS", value: data.fps || "N/A", inline: true },
            { name: "Platform", value: data.platform || "N/A", inline: true },
            { name: "Region", value: data.region || "N/A", inline: true },
            { name: "Tournament", value: data.tournament || "N/A", inline: true }
        );
}

function buildUI() {
    return [

        // TEAM SIZE
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("team_duo").setLabel("Duo").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("team_trio").setLabel("Trio").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("team_squad").setLabel("Squad").setStyle(ButtonStyle.Secondary)
        ),

        // PING
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ping_0_20").setLabel("0-20 ms").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_20_40").setLabel("20-40 ms").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_40_60").setLabel("40-60 ms").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ping_60_100").setLabel("60-100 ms").setStyle(ButtonStyle.Secondary)
        ),

        // FPS
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("fps_60_120").setLabel("60-120").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("fps_120_180").setLabel("120-180").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("fps_180_240").setLabel("180-240").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("fps_240").setLabel("+240 FPS").setStyle(ButtonStyle.Secondary)
        ),

        // ROLE
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("role_igl").setLabel("IGL").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_fragger").setLabel("Fragger").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_support").setLabel("Support").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("role_backpack").setLabel("Backpack").setStyle(ButtonStyle.Primary)
        ),

        // PLATFORM
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("platform_pc").setLabel("PC").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("platform_console").setLabel("Console").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("send_post").setLabel("SEND POST").setStyle(ButtonStyle.Danger)
        ),

        // REGION + TOURNAMENT
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

// ================= UPDATE =================
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
