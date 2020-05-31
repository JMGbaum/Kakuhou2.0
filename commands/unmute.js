const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});

exports.run = async (client, message, args, level) => {
  const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.guild.members.cache.get(/(?<=\<\@)\d+(?=\>)/g.exec(message.content)[0]);
  const user = !!member ? member.user : await client.users.fetch(args[0]) || null;
  const mutedRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === message.settings.mutedRole.toLowerCase());
  const logChannel = message.guild.channels.cache.find(c => c.name.toLowerCase() === message.settings.modLogChannel.toLowerCase());
  // Create embed for logs
  const embed = new Discord.MessageEmbed()
    .setTitle("Unmute")
    .setColor("00bbff")
    .addField("Target:", user.tag)
    .addField("Executor:", message.author)
    .setFooter(`User ID: ${user.id}`)
    .setTimestamp();
  if (args[1]) embed.addField("Reason:", args.slice(1).join(" "));
  // End if target is unspecified
  if (!user) return message.reply("You need to specify who you are trying to unmute!");
  
  if (!!member && member.roles.cache.some(role => role.id === mutedRole.id)) {
    // Remove the muted role if the member is currently in the guild
    member.roles.remove(mutedRole);
  } else if (!!member) {
    // Send message if the member is in the guild but does not have the muted role, then try deleting from the databse just in-case.
    message.reply("This member is not muted.");
    return db.prepare(`DELETE FROM mutes WHERE userID = '${user.id}' AND guildID = '${message.guild.id}'`).run();
  }
  const entry = db.prepare("SELECT muteID, unmute FROM mutes WHERE userID = ? AND guildID = ?").get(user.id, message.guild.id);
  // Remove from database
  db.prepare(`DELETE FROM mutes WHERE userID = '${user.id}' AND guildID = '${message.guild.id}'`).run();
  // Remove from timeouts
  if (entry.unmute !== null) {
    clearTimeout(client.timeouts.mutes[entry.muteID]);
    delete client.timeouts.mutes[entry.muteID];
  }
  // Confirmation reaction
  message.react("👍");
  // Send embed in logs
  logChannel.send(embed).catch(err => {});
};

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: [],
  permLevel: "Moderator"
};

exports.help = {
  name: "unmute",
  category: "Moderation",
  description: "Unmute a user.",
  usage: "unmute <@user || user ID> (<reason>)",
  flags: {}
};