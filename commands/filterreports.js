const db = require("better-sqlite3")("./data/database.db");
exports.run = async (client, message, args, level) => {
  db.prepare("SELECT DISTINCT robloxID FROM reports").all().forEach(row => {
    if (db.prepare(`SELECT 1 FROM robloxbans WHERE robloxID = '${row.robloxID}'`).get()) db.prepare(`DELETE FROM reports WHERE robloxID = '${row.robloxID}'`).run();
  });
}

exports.config = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "Moderator"
}

exports.help = {
  name: "filterreports",
  category: "Game",
  description: "Filter out reports of banned players.",
  usage: "filterreports",
  flags: {}
}