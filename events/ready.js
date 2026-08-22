const { Events } = require('discord.js');

// guildId -> [{ name, topRole }]
const rosterCache = new Map();

async function refreshRosters(client) {
	for (const [, guild] of client.guilds.cache) {
		try {
			const members = await guild.members.fetch();
			const roster = members
				.filter((m) => !m.user.bot)
				.map((m) => ({
					name: m.displayName,
					topRole: m.roles.hoist ? m.roles.hoist.name : null,
				}))
				.slice(0, 40);
			rosterCache.set(guild.id, roster);
		} catch (err) {
			console.log(`roster fetch failed for ${guild.id} (Members intent off?)`);
		}
	}
	console.log(`rosters refreshed for ${rosterCache.size} guild(s)`);
}

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		await refreshRosters(client);
		setInterval(() => refreshRosters(client), 10 * 60 * 1000).unref();
	},
};

module.exports.rosterCache = rosterCache;
