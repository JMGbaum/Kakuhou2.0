const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
const fetch = require("node-fetch");
exports.run = async (client, message, args, level) => {
  // If no username is provided, send a list of all linked accounts
 if (!args[0]) {
   // INSERT CODE
 } else {
   
  // INSERT CODE
  
  const roles = [message.guild.roles.cache.find(r => r.name.toLowerCase() === message.settings.verifiedRole.toLowerCase())];
  // if (inGroup) roles.push(message.guild.roles.cache.find(r => r.name.toLowerCase() === message.settings.groupRole.toLowerCase()));
  message.member.roles.add(roles);
  // message.member.setNickname(username);
 }
}

exports.config = {
  enabled: false,
  guildOnly: true,
  aliases: [],
  permLevel: "User"
}

exports.help = {
  name: "switchuser",
  category: "System",
  description: "Change your active linked account.",
  usage: "switchuser (<username>)",
  flags: {}
}