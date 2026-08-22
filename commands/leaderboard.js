const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createStore } = require('../store');

const store = createStore(process.env.DB_PATH || 'aniquiz.db');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Top quiz players 🏆'),
	async execute(interaction) {
		const top = await store.topScores(10);
		if (!top.length) {
			return interaction.reply("No scores yet — play `let quiz` or `/quiz` to get on the board!");
		}
		const embed = new EmbedBuilder()
			.setColor(0xffc107)
			.setTitle('🏆 Anime Quiz Leaderboard')
			.setDescription(
				top
					.map((r, i) => `**${i + 1}.** ${r.name} — ${r.score} pt${r.score === 1 ? '' : 's'}`)
					.join('\n')
			)
			.setTimestamp();
		interaction.reply({ embeds: [embed] });
	},
};
