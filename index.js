const { readdirSync } = require('fs');

const { prefix, token } = require('./config.json');

const { Client, Collection } = require('discord.js');

const client = new Client();
const cooldowns = new Collection();

client.commands = new Collection();

const commandFiles = readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	
	client.commands.set(command.name, command);
}

client.once('ready', () => {
	client.user.setActivity('Minecraft', { type: 'PLAYING' });
});

client.on('message', message => {
	if (!message.content.startsWith(prefix) || message.author.bot || message.webhookID || message.channel.type === 'dm') return;
	
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();
	
	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
	
	if (!command) return;
	
	if (command.args && !args.length) {
		let reply = 'lol you need to provide arguments';
		
		if (command.usage) {
			reply += `\nlmao use it like this \`${prefix}${command.name} ${command.usage}\``;
		}
		
		return message.reply(reply);
	}
	
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Collection());
	}
	
	const now = Date.now();
	const secondConversion = 1000;
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 0) * secondConversion;
	
	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
		
		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / secondConversion;
			return message.reply(`idiot slow down, wait ${timeLeft.toFixed(1)} second(s)`);
		}
	}
	
	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
	
	try {
		command.execute(message, args);
	} catch (error) {
		console.error('Error executing command:', error);
		message.reply('an unexpected error occurred. Please go to the GitHub project.');
	}
});

client.login(token);
