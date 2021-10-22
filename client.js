const { Client, Collection, Intents } = require("discord.js");
module.exports = {
	client: new Client({
		intents: [
			Intents.FLAGS.GUILDS,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Intents.FLAGS.GUILD_MESSAGES,
		],
	}),
};
