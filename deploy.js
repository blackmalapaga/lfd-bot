const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("lfd")
    .setDescription("Buscando jugadores system")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

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
