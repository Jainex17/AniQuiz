const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('You dont know this simple thing'),
  async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle("Help!")
          .setTimestamp()
          .setThumbnail(interaction.user.displayAvatarURL())
          .setDescription('You dont know this simple thing')
          .setFooter({ text:interaction.user.username })
            .addFields(
            { name: 'For Anime Quiz', value: 'let quiz' },
            { name: "For trivia", value: "let trivia" },
            { name: "For chat (remembers you!)", value: "chat [your text] or /ask" },
            { name: "For Text To Image", value: "giveimg [your text]" },
            { name: "Teach it about you", value: "let remember [fact]" },
            { name: "Wipe your memory", value: "let forget" },
            { name: "Quiz Leaderboard", value: "/leaderboard" },
          )
        
        interaction.reply({ embeds: [helpEmbed], fetchReply: true });

  },
};