import { ChannelType, Message } from "discord.js";
import type { CommandInteraction } from "discord.js";
import { Discord, Slash, SlashChoice, SlashGroup, SlashOption } from "discordx";
import { DevVoteReply } from "../types/discord";
import { extendObjectionVote } from "../lib/extendObjectionVote.js";
import { getTimestamp } from "../lib/getTimestamp.js";
import { getPing } from "../lib/getPing.js";
import { addProposal, getAuthToken } from "../lib/sheet.js";
import { Proposal } from "../interfaces/proposal.js";
import { v4 } from "uuid";

const devVoteLength: Record<DevType, number> = {
  town: 24,
  rail: 24,
  misc: 24,
  airport: 24 * 3,
  road: 24,
};

const displayValue: Record<DevType, string> = {
  airport: "Airport ✈️",
  misc: "Miscellaneous",
  rail: "Rail 🚆",
  town: "Town 🏘",
  road: "Road 🛣️",
};

enum DevType {
  Town = "town",
  Rail = "rail",
  Misc = "misc",
  Airport = "airport",
  Road = "road",
}

@Discord()
@SlashGroup({ name: "vote", description: "Start a vote on the server" })
@SlashGroup("vote")
export abstract class AppDiscord {
  @Slash()
  async development(
    @SlashOption({ name: "name", description: "The name of the development." })
    name: string,
    @SlashOption({
      name: "description",
      description: "The description of the development.",
    })
    description: string,
    @SlashChoice(
      DevType.Airport,
      DevType.Misc,
      DevType.Rail,
      DevType.Town,
      DevType.Road,
    )
    @SlashOption({ name: "type", description: "The type of the development." })
    type: DevType,
    interaction: CommandInteraction,
  ) {
    // create a thread
    if (
      interaction.channel?.type === ChannelType.GuildText &&
      description &&
      type &&
      description &&
      name
    ) {
      const userId = interaction.user.id;
      const username = interaction.user.username;
      const channelId = interaction.channel.id;

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

      const thread = await msg.startThread({
        name: `${name} by ${username}`,
        reason: `To discuss the topic at vote ${name}. `,
      });
      thread.members.add(userId);

      const uuid = v4();

      const proposal: Proposal = {
        uuid,
        name,
        proposedBy: username,
        type: displayValue[type],
        description,
        threadLink: `https://discord.com/channels/${interaction.guild?.id}/${channelId}/${thread.id}`,
        dateProposed: Date.now(),
        actionDate: firstDeadline.getTime(),
        numExtensions: 0,
        otherJson: {
          userId,
          msgId,
          channelId,
          objectEmoji: "✋",
          cancelEmoji: "❌",
          time: devVoteLength[type],
        },
      };

      const auth = await getAuthToken();
      addProposal(auth, proposal, "In Progress");

      extendObjectionVote({
        uuid,
        msgId,
        userId,
        originalTime: devVoteLength[type] ?? 24,
        channelId,
        time: (devVoteLength[type] ?? 24) * 60 * 60 * 1000,
        client: interaction.client,
        numberOfRenews: 0,
        name,
        objectEmoji: "✋",
        cancelEmoji: "❌",
      });
    } else {
      interaction.reply(
        "Oops! It appears you've made an error while creating a proposal. Please try again, or ask someone for help!",
      );
    }
  }
}
