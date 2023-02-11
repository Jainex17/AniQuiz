const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('button')
		.setDescription('Somting 👀!'),
	async execute(interaction) {
		await interaction.reply('https://media.giphy.com/media/g7GKcSzwQfugw/giphy.gif');
	},
};