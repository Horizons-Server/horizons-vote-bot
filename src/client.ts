import "reflect-metadata";
import { Client } from "discordx";
import { Intents, Interaction } from "discord.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const client = new Client({
  botId: "test",
  // glob string to load the classes
  classes: [
    path.join(__dirname, "commands", "**/*.{ts,js}"),
    path.join(__dirname, "events", "**/*.{ts,js}"),
  ],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
  silent: false,
});

client.on("ready", () => {
  console.log(">> Bot started");

  // to create/update/delete discord application commands
  client.initApplicationCommands({
    global: { log: true },
    guild: { log: true },
  });
});

client.on("interactionCreate", (interaction: Interaction) => {
  client.executeInteraction(interaction);
});

client.login(process.env.BOT_TOKEN ?? "");
