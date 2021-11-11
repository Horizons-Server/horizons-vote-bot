import { Message } from "discord.js";
import type { Client, TextChannel, CommandInteraction } from "discord.js";
import { Discord, Slash, SlashChoice, SlashGroup, SlashOption } from "discordx";

const voteLength: Record<string, number> = {
  town: 24,
  rail: 24,
  misc: 24,
  airport: 24 * 7,
};

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
    @SlashChoice("Town", "town")
    @SlashChoice("Airport", "airport")
    @SlashChoice("Rail", "rail")
    @SlashChoice("Misc", "misc")
    @SlashOption("type", { description: "The type of the development." })
    type: string,
    interaction: CommandInteraction,
  ) {
    // create a thread
    if (interaction.channel?.type === "GUILD_TEXT") {
      const userId = interaction.user.id;
      const channelId = interaction.channel.id;

      const thread = await interaction.channel.threads.create({
        name: `${name} by ${interaction.user.username}`,
        reason: `To discuss the topic at vote ${name}. `,
      });
      thread.members.add(userId);

      const firstDeadline = new Date();
      firstDeadline.setHours(firstDeadline.getHours() + voteLength[type] ?? 24);

      const msg = await interaction.reply({
        content: `___Development Vote___
**Name**: ${name}
**Description**: ${description}
**Proposed By**: <@${userId}>
**Proposal Type**: ${name.charAt(0).toUpperCase() + name.slice(1)}
**First Deadline**: <t:${Math.floor(firstDeadline.getTime() / 1000)}:R>
Press ✋ to object to this development.`,
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
        time: voteLength[type] ?? 24,
        first: true,
        client: interaction.client,
        numberOfRenews: 0,
        name,
        emoji: "✋",
      });

      // msg.react()
    } else {
      interaction.reply("How on earth did you manage this?");
    }
  }
}

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
          const message = `Vote "${name}" by <@${userId}> has been renewed ${numberOfRenews} times. Since the vote still has objections, it has failed.`;
          textChannel.send(message);
        } else {
          const deadline = new Date();
          const extendTime = first ? time / 2 : time;
          deadline.setHours(deadline.getHours() + extendTime);
          const message = `Vote "${name}" by <@${userId}> has been extended due to objections. The new deadline is <t:${Math.floor(
            deadline.getTime() / 1000,
          )}:R>. This vote has been renewed ${numberOfRenews + 1} times.`;

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
        textChannel.send(`Vote "${name}" by <@${userId}> has passed.`);
      }
    }
  }, time * 1000 * 60 * 60);
}
