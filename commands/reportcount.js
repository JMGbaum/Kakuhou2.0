const db = require("better-sqlite3")("./data/database.db");
exports.run = async (client, message, args, level) => {
  const count = message.flags["unique"] ? db.prepare("SELECT count(DISTINCT robloxID) FROM reports").get()["count(DISTINCT robloxID)"] : db.prepare("SELECT count(*) FROM reports").get()["count(*)"];
  if (message.flags.unique) message.reply(`There are currently unresolved reports for ${count} different Roblox users.`);
  else message.reply(`There are currently ${count} unresolved reports.`);
}

exports.config = {
  enabled: true,
  guildOnly: false,
  aliases: ["repcount", "reports", "reportscount"],
  permLevel: "Moderator"
}

exports.help = {
  name: "reportcount",
  category: "Game",
  description: "Check the number of unresolved player reports.",
  usage: "reportcount (<flags>)",
  flags: {
    unique: {
      description: "Display the number of reported unique roblox users (disregards multiple reports for the same user).",
      value: "None (just include the flag)"
    }
  }
}