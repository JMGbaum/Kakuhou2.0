const Discord = require("discord.js");

module.exports = async (client, message) => {
  if (!message) return;
  // We don't care if the message is not in a guild
  if (!message.guild) return;
  // We also don't care if the message was sent by a bot (because bots delete their own messages all the time)
  if (message.author.bot) return;
  // Load the guild settings
  const settings = await client.getGuildSettings(message.guild);
  // Find the action log channel
  const logChannel = message.guild.channels.cache.find(c => c.name.toLowerCase() === settings.actionLogChannel.toLowerCase());
  
  // Fetch the audit log entries where the action is message deletion
  const logs = await message.guild.fetchAuditLogs({type: 72});
  // Get the most recent entry
  const entry = logs.entries.first();
  // Check to make sure the authors match up and the entry was created less than 3 seconds ago
  const inLogs = entry && entry.target.id === message.author.id && Date.now() - entry.createdTimestamp < 3000;
  // See if a reason was stored in the client
  const localLogs = client.logs[message.id];
  // Set the user the message was deleted by
  const executor = inLogs ? entry.executor : message.author;
  // Trim message content
  const content = message.content.length > 750 ? `${message.content.slice(0,750)}...` : message.content;
  
  // Create an embed
  const embed = new Discord.MessageEmbed()
    .setAuthor(message.author.tag, message.author.displayAvatarURL())
    .setDescription(`**Message sent by ${message.author} deleted in ${message.channel}**\n${content}`)
    .setColor("ff0000")
    .setTimestamp();
  // Add additional fields
  if (inLogs && entry.reason) embed.addField("Reason:", entry.reason);
  if (inLogs) {
    embed.addField("Deleted By:", client.users.cache.get(executor.id))
      .setFooter(`Author ID: ${entry.target.id} • Executor ID: ${executor.id} • Message ID: ${message.id}`);
  } else if (localLogs) {
    embed.addField("Reason:", localLogs.reason)
      .setFooter(`Author ID: ${entry.target.id} • Message ID: ${message.id}`);
    delete client.logs[message.id];
  } else {
    embed.setFooter(`User ID: ${message.author.id} • Message ID: ${message.id}`);
  }
  // Send the embed
  if (logChannel) logChannel.send(embed);
}