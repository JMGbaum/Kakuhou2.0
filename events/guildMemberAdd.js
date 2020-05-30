const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});

module.exports = async (client, member) => {
  // Load the guild's settings
  const settings = client.getGuildSettings(member.guild);

  // Remove any tempbans from database (if they are in the guild, they aren't banned)
  db.prepare(`DELETE FROM bans WHERE userID = '${member.id}' AND guildID = '${member.guild.id}'`).run();
  
  // Mute the user if they are still muted
  const muted = db.prepare("SELECT * FROM mutes WHERE userID = ? AND guildID = ?").get(member.id, member.guild.id);
  if (muted) {
    member.roles.add(member.guild.roles.cache.find(r => r.name.toLowerCase() === settings.mutedRole.toLowerCase()));
    const embed = new Discord.MessageEmbed()
        .setTitle("Mute (Auto)")
        .setColor("ff9000")
        .addField("Who:", `${member.user.tag}`)
        .addField("Reason:", "Rejoining while muted")
        .setFooter(`User ID: ${member.id}`);
    member.guild.channels.cache.find(c => c.name.toLowerCase() === settings.modLogChannel.toLowerCase()).send(embed);
  }
  
}