import { Message } from "discord.js";
import type { CommandInteraction } from "discord.js";
import { Discord, Slash, SlashChoice, SlashGroup, SlashOption } from "discordx";
import { DevVoteReply } from "types/discord";
import { extendObjectionVote } from "lib/extendObjectionVote";
import { getTimestamp } from "lib/getTimestamp";
import { getPing } from "lib/getPing";

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
