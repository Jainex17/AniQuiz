const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addtag')
		.setDescription('add tags!'),
	async execute(interaction) {
		await interaction.reply('ADD!');
	},
};