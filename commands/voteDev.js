const { SlashCommandBuilder } = require("@discordjs/builders");
const { client } = require("../client");

const times = { town: 24, rail: 24, misc: 24, airport: 24 * 7 };
const format = { town: "Town", rail: "Rail", misc: "Misc", airport: "Airport" };

module.exports = {
	data: new SlashCommandBuilder()
		.setName("votedev")
		.setDescription("Starts for a vote for a development.")
		.addStringOption((option) =>
			option
				.setName("title")
				.setDescription("name of the topic")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("description")
				.setDescription("description of the topic at vote")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("devtype")
				.setDescription("type of the development that is being proposed")
				.setRequired(true)
				.addChoice("Town", "town")
				.addChoice("Airport", "airport")
				.addChoice("Rail", "rail")
				.addChoice("Misc", "misc")
		),
	async execute(interaction) {
		const name = interaction.options.data[0].value;

		try {
			const thread = await interaction.channel.threads.create({
				name: `${name} by ${interaction.user.username}`,
				reason: `To discuss the topic at vote ${name}. `,
			});

			const userId = interaction.user.id;

			thread.members.add(userId);

			const firstDeadline = new Date();

			firstDeadline.setHours(
				firstDeadline.getHours() + times[interaction.options.data[2].value]
			);

			const msg = await interaction.reply({
				content: `___Development Vote___
**Name**: ${name}
**Description**: ${interaction.options.data[1].value}
**Proposed By**: <@${userId}>
**Proposal Type**: ${format[interaction.options.data[2].value]}
**First Deadline**: <t:${Math.floor(firstDeadline.getTime() / 1000)}:R>
Press ✋ to object to this development.`,
				fetchReply: true,
			});
			msg.react("✋");

			const channelId = interaction.channel.id;

			const { id } = msg;

			extend(
				id,
				channelId,
				times[interaction.options.data[2].value],
				true,
				userId,
				name,
				0
			);
		} catch (error) {
			interaction.reply("You cannot start a vote in a thread");
		}
	},
};

/**
 *
 * @param {number} msgId
 * @param {number} channelId
 * @param {number} time time in hours
 * @param {boolean} first
 * @param {number} userId
 * @param {string} name
 * @param {number} count
 */
async function extend(msgId, channelId, time, first, userId, name, count) {
	setTimeout(async () => {
		const channel = client.channels.cache.get(channelId);

		const numObjections = (
			await channel.messages.cache.get(msgId).reactions.resolve("✋").fetch()
		).count;

		if (numObjections > 1) {
			console.log(count);
			if (count > 3) {
				channel.send(
					`Vote "${name}" by <@${userId}> has been renewed ${count} times. Since the vote still has objections, it has failed.`
				);
			} else {
				const deadline = new Date();

				deadline.setHours(deadline.getHours() + (first ? time / 2 : time));

				channel.send(
					`Vote "${name}" by <@${userId}> has been extended due to objections. The new deadline is <t:${Math.floor(
						deadline.getTime() / 1000
					)}:R>. This vote has been renewed ${count + 1} times.`
				);
				extend(
					msgId,
					channelId,
					first ? time / 2 : time,
					false,
					userId,
					name,
					count + 1
				);
			}
		} else channel.send(`Vote "${name}" by <@${userId}> has passed.`);
	}, time * 1000 * 60 * 60);
}
