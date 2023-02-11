const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('chat')
		.setDescription('chat with me')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('write text')
                .setAutocomplete(true)),
	async execute(interaction) {
		return
	},
};