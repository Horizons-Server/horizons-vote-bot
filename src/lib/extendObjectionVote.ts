import { ChannelType, Client, TextChannel } from "discord.js";
import { DevVoteRenew } from "../types/discord.js";
import { getPing } from "./getPing.js";
import { getTimestamp } from "./getTimestamp.js";
import {
  addProposal,
  getAllProposals,
  getAuthToken,
  removeProposal,
} from "./sheet.js";

export async function extendObjectionVote(params: {
  msgId: string;
  channelId: string;
  uuid: string;
  userId: string;
  time: number;
  name: string;
  originalTime: number;
  numberOfRenews: number;
  client: Client<boolean>;
  emoji: string;
}) {
  const {
    msgId,
    channelId,
    userId,
    time,
    uuid,
    name,
    numberOfRenews,
    client,
    originalTime,
    emoji,
  } = params;

  setTimeout(async () => {
    const channel = client.channels.cache.get(channelId);

    if (channel && channel.type === ChannelType.GuildText) {
      const textChannel = channel as TextChannel;

      const objections = await (
        await textChannel.messages.fetch(msgId)
      )?.reactions
        .resolve(emoji)
        ?.fetch();

      if (!objections) return;

      const objectionsCount = objections.count;

      if (objectionsCount > 1) {
        if (numberOfRenews > 3) {
          const message = `Vote "${name}" by ${getPing(
            userId,
          )} has been renewed ${numberOfRenews} times. Since the vote still has objections, it has failed.`;
          textChannel.send(message);

          const auth = await getAuthToken();
          const allProposals = await getAllProposals(auth);
          const proposal = allProposals.inProgress.filter(
            (a) => a.uuid === uuid,
          )[0];

          await removeProposal(auth, uuid);
          addProposal(
            auth,
            { ...proposal, actionDate: Date.now() },
            "Denied/Postponed",
          );
        } else {
          const deadline = new Date();
          const extendTime =
            (numberOfRenews === 0 ? originalTime : originalTime / 2) *
            1000 *
            60 *
            60;
          deadline.setTime(deadline.getTime() + extendTime);
          const message: DevVoteRenew = `Vote "${name}" by ${getPing(
            userId,
          )} has been extended due to objections. The new deadline is ${getTimestamp(
            deadline,
          )}. This vote has been renewed ${numberOfRenews + 1} times.`;

          textChannel.send(message);

          const auth = await getAuthToken();
          const allProposals = await getAllProposals(auth);
          const proposal = allProposals.inProgress.filter(
            (a) => a.uuid === uuid,
          )[0];

          await removeProposal(auth, uuid);
          addProposal(
            auth,
            {
              ...proposal,
              actionDate: deadline.getTime(),
              numExtensions: numberOfRenews + 1,
              // objections: objectionsCount - 1,
            },
            "In Progress",
          );

          extendObjectionVote({
            uuid,
            msgId,
            channelId,
            userId,
            time: extendTime,
            name,
            numberOfRenews: numberOfRenews + 1,
            client,
            originalTime,
            emoji,
          });
        }
      } else {
        textChannel.send(`Vote "${name}" by ${getPing(userId)} has passed.`);

        const auth = await getAuthToken();
        const allProposals = await getAllProposals(auth);
        const proposal = allProposals.inProgress.filter(
          (a) => a.uuid === uuid,
        )[0];

        await removeProposal(auth, uuid);
        addProposal(auth, { ...proposal, actionDate: Date.now() }, "Approved");
      }
    }
  }, time);
}
