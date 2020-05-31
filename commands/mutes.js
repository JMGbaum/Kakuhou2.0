const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
exports.run = async (client, message, args, level) => {
  const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.guild.members.cache.get(/(?<=\<\@)\d+(?=\>)/g.exec(message.content)[0]);
  const mutedRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === message.settings.mutedRole.toLowerCase());

  // Return if user not found
  if (!member) return message.reply("I was not able to find that user!");
  // End if user is not muted
  if (!member.roles.cache.find(r => r.id === mutedRole.id)) return message.reply("That user isn't muted!");
  // Grab database entry
  const entry = db.prepare(`SELECT * FROM mutes WHERE userID = '${member.id}' AND guildID = '${message.guild.id}'`).get();
  // End if no entry
  if (!entry) return message.reply("There is no log for that user's mute. They may have been muted manually.")

  // Create embed
  const footer = entry.unmute ? `User ID: ${member.id} • Auto-Unmute: ` : `User ID: ${member.id} • Auto-Unmute: None`;
  const embed = new Discord.MessageEmbed()
    .setColor("ff0000")
    .addField("Target:", `${member.user.tag}`)
    .addField("Executor:", `<@${entry.moderator}>`)
    .addField("Reason:", entry.reason || "None")
    .addField("Timestamp:", client.toUTC(entry.time))
    .addField("Length:", entry.unmute ? client.parseTimeMessage(entry.unmute - entry.time) : "Indefinitely")
    .setFooter(footer);
  if (entry.unmute) embed.setTimestamp(entry.unmute);
  message.channel.send(embed);
};

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: [],
  permLevel: "Moderator"
};

exports.help = {
  name: "mutes",
  category: "Moderation",
  description: "Check a logged mute.",
  usage: "mutes <@user || user id>",
  flags: {}
};