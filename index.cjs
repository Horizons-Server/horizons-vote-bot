const dotenv = require("dotenv");
const fs = require("fs");
const { Client, Collection, Intents } = require("discord.js");
dotenv.config();
const { client } = require("./client");

const main = async () => {
	client.commands = new Collection();
	const commandFiles = fs
		.readdirSync("./commands")
		.filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		// Set a new item in the Collection
		// With the key as the command name and the value as the exported module
		client.commands.set(command.data.name, command);
	}

	client.once("ready", () => {
		console.log("Ready!");
	});

	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isCommand()) return;

		const command = client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({
				content: "There was an error while executing this command!",
				ephemeral: true,
			});
		}
	});

	// Login to Discord with your client's token
	client.login(process.env.TOKEN);
};

main();
