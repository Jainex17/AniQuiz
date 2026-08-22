const { SlashCommandBuilder } = require('discord.js');
const { createStore } = require('../store');
const { buildSystemPrompt, buildContents } = require('../persona');
const { rosterCache } = require('../events/ready');
const { geminiChat } = require('../gemini');

const store = createStore(process.env.DB_PATH || 'aniquiz.db');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ask')
		.setDescription('Chat with Aniquiz — it remembers you!')
		.addStringOption((opt) =>
			opt.setName('question').setDescription('What do you want to say?').setRequired(true)
		),
	async execute(interaction) {
		await interaction.deferReply();

		const question = interaction.options.getString('question');
		const userId = interaction.user.id;
		const member = interaction.member;

		const requester = {
			name: member?.displayName || interaction.user.username,
			roles: member?.roles?.cache
				? member.roles.cache.filter((r) => r.name !== '@everyone').map((r) => r.name).slice(0, 10)
				: [],
			joined: member?.joinedAt ? member.joinedAt.toISOString().slice(0, 10) : null,
		};

		try {
			const [facts, history] = await Promise.all([
				store.getFacts(userId),
				store.getHistory(userId, 16),
			]);
			const roster = rosterCache.get(interaction.guildId) || [];
			const systemPrompt = buildSystemPrompt({ requester, roster, facts });
			const contents = buildContents(history, `${requester.name}: ${question}`);

			const reply = await geminiChat(systemPrompt, contents);

			await store.addMessage(userId, interaction.channelId, 'user', `${requester.name}: ${question}`);
			await store.addMessage(userId, interaction.channelId, 'model', reply);
			await store.trimHistory(userId);

			await interaction.editReply(reply.slice(0, 2000));
		} catch (err) {
			console.error(err);
			await interaction.editReply('soory we geting some error🥲');
		}
	},
};
