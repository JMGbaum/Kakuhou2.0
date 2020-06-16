const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
const Keyv = require('keyv');
const verificationCodes = new Keyv('sqlite://./data/database.db', {
  table: 'verificationCodes'
});
exports.run = async (client, message, args, level) => {
  // If no code is provided, send instructions and game link
  if (!args[0]) return message.reply(/* INSERT GAME LINK AND INSTRUCTIONS */);
  // If there is a code, grab the Roblox info associated with the code
  const info = await verificationCodes.get(args[0]);
  // If the code supplied was invalid, return an error message
  if (!info) return message.reply("You did not supply a valid code.");
  // Check if the user is linked with any other accounts (if not, we will automatically make this account their active one)
  const notFirst = db.prepare(`SELECT 1 FROM verify WHERE discordID = '${message.author.id}'`).get();
  // Double check to make sure the roblox user isn't already linked to a discord account
  if (db.prepare(`SELECT discordID FROM verify WHERE robloxID = '${info.userID}'`).get()) return message.reply(`The account \`${info.username}\` is already verified!`)
  // Otherwise, we want to create a new verification row
  db.prepare("INSERT INTO verify (discordID, robloxID, username, inGroup, active) VALUES (?, ?, ?, ?, ?)").run(message.author.id, info.userID, info.username, info.inGroup ? 1 : 0, notFirst ? 0 : 1);
  // Then send a confirmation reaction
  message.reply(`Successfully linked \`${info.username}\` with your Discord!${notFirst ? ` Use \`${message.settings.prefix}switchuser ${info.username}\` to set this as your active account.` : ""}`);
  if (!notFirst && message.guild) {
    message.member.roles.add(message.guild.roles.cache.find(r => r.name.toLowerCase() === message.settings.verifiedRole.toLowerCase()));
    if (info.inGroup) message.member.roles.add(message.guild.roles.cache.find(r => r.name.toLowerCase() === message.settings.groupRole.toLowerCase()));
    message.member.setNickname(info.username);
  }
}

exports.config = {
  enabled: false,
  guildOnly: false,
  aliases: [],
  permLevel: "User"
}

exports.help = {
  name: "verify",
  category: "System",
  description: "Link your Discord account to a Roblox account.",
  usage: "verify (<code>)",
  flags: {}
}