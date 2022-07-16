import "reflect-metadata";
import { Client } from "discordx";
import { Interaction, Intents } from "discord.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { deDupe, getAllProposals, getAuthToken } from "./lib/sheet.js";
import { extendObjectionVote } from "./lib/extendObjectionVote.js";

const auth = await getAuthToken();
deDupe(auth);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const client = new Client({
  botId: "test",
  // glob string to load the classes
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
  silent: false,
});

client.on("ready", async () => {
  console.log(">> Bot started");

  // to create/update/delete discord application commands
  await client.initApplicationCommands({
    global: { log: true },
    guild: { log: true },
  });
});

client.on("interactionCreate", (interaction: Interaction) => {
  client.executeInteraction(interaction);
});

await client.login(process.env.BOT_TOKEN ?? "");

const { inProgress } = await getAllProposals(auth);

inProgress.forEach((e) => {
  if (!e.otherJson) return;
  if (!e.actionDate) return;

  const newDate = new Date(e.actionDate);
  const currDate = new Date();

  const delta = newDate.getTime() - currDate.getTime();

  const time = delta < 0 ? 0 : delta;

  extendObjectionVote({
    time,
    msgId: e.otherJson.msgId,
    emoji: e.otherJson.emoji,
    name: e.name,
    channelId: e.otherJson.channelId,
    numberOfRenews: e.numExtensions || 0,
    uuid: e.uuid,
    client: client,
    originalTime: e.otherJson.time,
    userId: e.otherJson.userId,
  });
});
