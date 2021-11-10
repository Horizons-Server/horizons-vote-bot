import "reflect-metadata";
import { Client } from "discordx";
import { Intents, Message } from "discord.js";

const client = new Client({
	botId: "test",
	// glob string to load the classes
	classes: [`${__dirname}/commands/**/*.{js,ts}`],
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MEMBERS,
	],
	silent: false,
});

client.on("ready", () => {
	console.log(">> Bot started");

	// to create/update/delete discord application commands
	client.initApplicationCommands();
});

client.login(process.env.BOT_TOKEN ?? "");
