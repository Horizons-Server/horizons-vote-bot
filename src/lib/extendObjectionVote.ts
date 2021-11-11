import type { Client, TextChannel } from "discord.js";
import { DevVoteRenew } from "../types/discord.js";
import { getPing } from "./getPing.js";
import { getTimestamp } from "./getTimestamp.js";

export async function extendObjectionVote(params: {
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
