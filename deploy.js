const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;

const commands = [
    new SlashCommandBuilder()
        .setName("lfd")
        .setDescription("Buscando jugadores system")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("Deploying slash commands...");

        await rest.put(
            Routes.applicationCommands("1517292944829448363"),
            { body: commands }
        );

        console.log("Commands registered!");
    } catch (err) {
        console.error(err);
    }
})();
