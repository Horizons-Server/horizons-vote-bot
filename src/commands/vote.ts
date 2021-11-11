import { Message } from "discord.js";
import type { Client, TextChannel, CommandInteraction } from "discord.js";
import { Discord, Slash, SlashChoice, SlashGroup, SlashOption } from "discordx";

type Ping = `<@${string}>`;
type Timestamp = `<t:${number}:R>`;
type DevVoteReply = `___Development Vote___
**Name**: ${string}
**Description**: ${string}
**Proposed By**: ${Ping}
**Proposal Type**: ${string}
**First Deadline**: ${Timestamp}
Press ✋ to object to this development.`;
type DevVoteRenew =
  `Vote "${string}" by ${Ping} has been extended due to objections. The new deadline is ${Timestamp}. This vote has been renewed ${number} times.`;

const devVoteLength: Record<DevType, number> = {
  town: 24,
  rail: 24,
  misc: 24,
  airport: 24 * 7,
};

const displayValue: Record<DevType, string> = {
  airport: "Airport ✈️",
  misc: "Miscellaneous",
  rail: "Rail 🚆",
  town: "Town 🏘",
};

enum DevType {
  Town = "town",
  Rail = "rail",
  Misc = "misc",
  Airport = "airport",
}

@Discord()
@SlashGroup("vote", "Start a vote on the server")
export abstract class AppDiscord {
  @Slash("development")
  async development(
    @SlashOption("name", { description: "The name of the development." })
    name: string,
    @SlashOption("description", {
      description: "The description of the development.",
    })
    description: string,
    @SlashChoice(DevType)
    @SlashOption("type", { description: "The type of the development." })
    type: DevType,
    interaction: CommandInteraction,
  ) {
    // create a thread
    if (
      interaction.channel?.type === "GUILD_TEXT" &&
      description &&
      type &&
      description &&
      name
    ) {
      const userId = interaction.user.id;
      const username = interaction.user.username;
      const channelId = interaction.channel.id;

      const thread = await interaction.channel.threads.create({
        name: `${name} by ${username}`,
        reason: `To discuss the topic at vote ${name}. `,
      });
      thread.members.add(userId);

      const firstDeadline = new Date();
      firstDeadline.setHours(
        firstDeadline.getHours() + devVoteLength[type] ?? 24,
      );

      const messageContent: DevVoteReply = `___Development Vote___
**Name**: ${name}
**Description**: ${description}
**Proposed By**: ${getPing(userId)}
**Proposal Type**: ${displayValue[type]}
**First Deadline**: ${getTimestamp(firstDeadline)}
Press ✋ to object to this development.`;

      const msg = await interaction.reply({
        content: messageContent,
        fetchReply: true,
      });
      const { id: msgId } = msg;

      if (msg instanceof Message) {
        msg.react("✋");
      }

      extendObjectionVote({
        msgId,
        userId,
        channelId,
        time: devVoteLength[type] ?? 24,
        first: true,
        client: interaction.client,
        numberOfRenews: 0,
        name,
        emoji: "✋",
      });
    } else {
      interaction.reply("How on earth did you manage this?");
    }
  }
}

// FIXME if anyone can figure out how to move this into other files without breaking the bot it would be much appreciated

async function extendObjectionVote(params: {
  msgId: string;
  channelId: string;
  userId: string;
  time: number;
  first: boolean;
  name: string;

  numberOfRenews: number;
  client: Client<boolean>;
  emoji: string;
}) {
  const {
    msgId,
    channelId,
    userId,
    time,
    first,
    name,

    numberOfRenews,
    client,
    emoji,
  } = params;

  setTimeout(async () => {
    const channel = client.channels.cache.get(channelId);

    if (channel && channel.type === "GUILD_TEXT") {
      const textChannel = channel as TextChannel;

      const objections = await textChannel.messages.cache
        .get(msgId)
        ?.reactions.resolve(emoji)
        ?.fetch();

      if (!objections) return;

      const objectionsCount = objections.count;

      if (objectionsCount > 1) {
        if (numberOfRenews > 3) {
          const message = `Vote "${name}" by ${getPing(
            userId,
          )} has been renewed ${numberOfRenews} times. Since the vote still has objections, it has failed.`;
          textChannel.send(message);
        } else {
          const deadline = new Date();
          const extendTime = first ? time / 2 : time;
          deadline.setHours(deadline.getHours() + extendTime);
          const message: DevVoteRenew = `Vote "${name}" by ${getPing(
            userId,
          )} has been extended due to objections. The new deadline is ${getTimestamp(
            deadline,
          )}. This vote has been renewed ${numberOfRenews + 1} times.`;

          textChannel.send(message);

          extendObjectionVote({
            msgId,
            channelId,
            userId,
            time: extendTime,
            first: false,
            name,
            numberOfRenews: numberOfRenews + 1,
            client,
            emoji,
          });
        }
      } else {
        textChannel.send(`Vote "${name}" by ${getPing(userId)} has passed.`);
      }
    }
  }, time * 1000 * 60 * 60);
}

const getTimestamp = (time: Date): Timestamp =>
  `<t:${Math.floor(time.getTime() / 1000)}:R>`;

const getPing = (user: string): Ping => `<@${user}>`;
