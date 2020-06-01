const db = require("better-sqlite3")("./data/database.db");
const Discord = require("discord.js");

module.exports = async (client, channel, user) => {
  // We only care about guild channels
  if (!channel.guild) return;
  
  // Grab the settings for this server from the database.
  // If there is no guild, get default config (DMs)
  const settings = await client.getGuildSettings(channel.guild);
  
  // Grab the muted role
  const mutedRole = channel.guild.roles.cache.find(r => r.name.toLowerCase() === settings.mutedRole.toLowerCase());
  // Grab the member
  const member = channel.guild.members.cache.get(user.id);
  if (!member) return;
  // If the user is supposed to be muted, mute them and send a message to the log channel
  if (db.prepare(`SELECT 1 FROM mutes WHERE userID = '${user.id}' AND guildID = '${channel.guild.id}'`).get() && !member.roles.cache.has(mutedRole.id)) {
    member.roles.add(mutedRole);
    const embed = new Discord.MessageEmbed()
        .setTitle("Mute (Auto)")
        .setColor("ff9000")
        .addField("Who:", `${user.tag}`)
        .addField("Reason:", "A mute for this user was logged in the database, but they were missing the muted role.")
        .setFooter(`User ID: ${user.id}`);
    channel.guild.channels.cache.find(c => c.name.toLowerCase() === settings.modLogChannel.toLowerCase()).send(embed);
  }
}