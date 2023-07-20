import "reflect-metadata";
import { Client } from "discordx";
import dotenv from "dotenv";
import { deDupe, getAllProposals, getAuthToken, initalizeSheet } from "./lib/sheet.js";
import { extendObjectionVote } from "./lib/extendObjectionVote.js";
import { dirname, importx } from "@discordx/importer";

const auth = await getAuthToken();

initalizeSheet(auth);

await deDupe();

dotenv.config();

const client = new Client({
  botId: "test",
  // glob string to load the classes
  intents: ["Guilds", "GuildMessageReactions", "GuildMessages"],
  botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
  silent: false,
});

client.once("ready", async () => {
  await client.initApplicationCommands();

  // await client.initApplicationPermissions();
});

client.on("interactionCreate", (interaction) => {
  client.executeInteraction(interaction);
});

await importx(dirname(import.meta.url) + "/commands/**/*.{js,ts}");

await client.login(process.env.BOT_TOKEN ?? "");

const { inProgress } = await getAllProposals();

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
    objectEmoji: e.otherJson.objectEmoji,
    name: e.name,
    channelId: e.otherJson.channelId,
    numberOfRenews: e.numExtensions || 0,
    uuid: e.uuid,
    client: client,
    originalTime: e.otherJson.time,
    userId: e.otherJson.userId,
    cancelEmoji: e.otherJson.cancelEmoji,
  });
});
