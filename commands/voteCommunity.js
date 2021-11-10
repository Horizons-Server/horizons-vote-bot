const { SlashCommandBuilder } = require("@discordjs/builders");
const { client } = require("../client");

const times = { town: 24, rail: 24, misc: 24, airport: 24 * 7 };
const format = { player: "Player", rule: "Rule", misc: "Misc" };

module.exports = {
	data: new SlashCommandBuilder()
		.setName("votecommunity")
		.setDescription("Starts a vote for a community proposal.")
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
				.setName("type")
				.setDescription("type of proposal")
				.setRequired(true)
				.addChoice("Player", "player")
				.addChoice("Rule", "rule")
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
**Deadline**: <t:${Math.floor(firstDeadline.getTime() / 1000)}:R>
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
				userId,
				name
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
 * @param {number} userId
 * @param {string} name
 */
async function extend(msgId, channelId, time, userId, name) {
	setTimeout(async () => {
		const channel = client.channels.cache.get(channelId);

		const numObjections = (
			await channel.messages.cache.get(msgId).reactions.resolve("✋").fetch()
		).count;

		if (numObjections > 1) {
			console.log(count);
			if (count > 3) {
				channel.send(
					`Vote "${name}" by <@${userId}> has been renewed ${"e"} times. Since the vote still has objections, it has failed.`
				);
			}
		} else channel.send(`Vote "${name}" by <@${userId}> has passed.`);
	}, time * 1000 * 60 * 60);
}
