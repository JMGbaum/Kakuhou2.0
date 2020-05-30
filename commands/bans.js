const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});

exports.run = async (client, message, args, level) => {
  // End if no user is supplied
  if (!args[0]) return message.reply("You need to include a user!")
  // Make sure user is banned. If yes, grab ban info
  const ban = await client.searchBans(message, args);
  // If the function doesn't return anything, it has already handled the error.
  if (!ban) return;
  // Create embed for logs
  const embed = new Discord.MessageEmbed()
    .setTitle("Ban")
    .setColor("ff0000")
    .addField("Target:", `${ban.user.username}#${ban.user.discriminator}`)
    .addField("Reason:", ban.reason || "None")
    .setFooter(`User ID: ${ban.user.id}`);
    
  // Send embed
  message.channel.send(embed);
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
  name: "bans",
  category: "Moderation",
  description: "Search Discord bans.",
  usage: "bans <@user || user id || (part of) username>",
  flags: {}
};