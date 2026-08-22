const { Events,EmbedBuilder} = require('discord.js');
const quiz = require('../quiz.json');
const { createStore } = require('../store');

const store = createStore(process.env.DB_PATH || 'aniquiz.db');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			if (interaction.commandName === 'ping') {
				await interaction.reply({ content: 'Secret Pong!', ephemeral: true });
			}
			// if (interaction.commandName === 'help') {
			// 	const helpEmbed = new EmbedBuilder()
			// 	  .setColor(0x0099FF)
			// 	  .setTitle("Helpppp")
			// 	  .setTimestamp()
			// 	  .setDescription('You dont know this simple thing')
			// 	  .addFields(
			// 		{ name: 'Anime Quiz', valie: 'let quiz' },
			// 		{ name: "trivia", value: "let trivia" },
			// 		{ name: "chat", value: "chat [your text]" },
			// 		{ name: "Text To Image", value: "getimg [your text]" },
			// 	  );
			// 	interaction.reply({ embeds: [helpEmbed], fetchReply: true });
		
			// 	  }
			if (interaction.commandName === 'quiz') {
			
						const item = quiz[Math.floor(Math.random() * quiz.length)];
						const filter = response => {
						return item.answers.some(answer => answer.toLowerCase() === response.content.toLowerCase());
						};

						const qEmbed = new EmbedBuilder()
							.setColor(0x0099FF)
							.setTitle(item.question)
							.setThumbnail('https://i1.sndcdn.com/avatars-UidYWfW20bjki8Ub-GJKpBQ-t500x500.jpg')
							.setTimestamp()
							.setDescription('Answer in 30sec');
							interaction.reply({ embeds: [qEmbed], fetchReply: true  })

						// interaction.reply({ content: item.question, fetchReply: true })
						.then(() => {
							interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] })
								.then(collected => {
									const winner = collected.first().author;
									store.addScorePoint(winner.id, winner.username).catch(() => {});
									interaction.followUp(`${winner} got the correct answer! +1 point 🎉`);
								})
								.catch(collected => {
									interaction.followUp('Looks like nobody got the answer this time 🤣');
								});
						});
			}
			// if (interaction.commandName === 'addtag') {
				
			// 	const tagName = interaction.options.getString('name');
			// 	const tagDescription = interaction.options.getString('description');
		
			// 	try {
			// 		// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
			// 		const tag = await Tags.create({
			// 			name: tagName,
			// 			description: tagDescription,
			// 			username: interaction.author.username,
			// 		});
		
			// 		return interaction.reply(`Tag ${tag.name} added.`);
			// 	} catch (error) {
			// 		if (error.name === 'SequelizeUniqueConstraintError') {
			// 			return interaction.reply('That tag already exists.');
			// 		}
		
			// 		return interaction.reply('Something went wrong with adding a tag.');
			// 	}
			// } 
			else{
				await command.execute(interaction);
			}	

		} catch (error) {
			console.error(`Error executing ${interaction.commandName}`);
			console.error(error);
			console.error("wtf");
		}
	},
};