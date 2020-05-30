const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});

exports.run = async (client, message, args, level) => {
  // End if no user is supplied
  if (!args[0]) return message.reply("You need to include a user!")
  // Find log channel from guild settings
  const logChannel = message.guild.channels.cache.find(c => c.name.toLowerCase() === message.settings.modLogChannel.toLowerCase());
  // Make sure user is banned. If yes, grab ban info
  const ban = await client.searchBans(message, args);
  // If the function doesn't return anything, it has already handled the error.
  if (!ban) return;
  // Grab reason if one is supplied
  const reason = args.slice(1).join(" ") || null;
  // Create embed for logs
  const embed = new Discord.MessageEmbed()
    .setTitle("Unban")
    .setColor("00dd24")
    .addField("Target:", `${ban.user.username}#${ban.user.discriminator}`)
    .addField("Executor:", message.author)
    .setFooter(`User ID: ${ban.user.id}`)
    .setTimestamp();
  // Set reason in embed
  if (reason) embed.addField("Reason:", reason);
  // Unban the user
  message.guild.members.unban(ban.user.id, reason);
  // Remove from database
  db.prepare(`DELETE FROM tempbans WHERE userID = '${ban.user.id}' AND guildID = '${message.guild.id}'`).run();
  // Send embed
  logChannel.send(embed);
  // Confirmation reaction
  message.react("👍")
};

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: [],
  permLevel: "Moderator"
};

exports.help = {
  name: "unban",
  category: "Moderation",
  description: "Unban a user.",
  usage: "unban <@user || user id || (part of) username> (<reason>)",
  flags: {}
};