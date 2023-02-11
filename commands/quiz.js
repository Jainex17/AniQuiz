const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quiz')
		.setDescription('Anime quiz'),
	async execute(interaction) {
		await interaction.reply('start!');
	},
};