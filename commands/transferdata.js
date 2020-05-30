const old_db = require("better-sqlite3")("./data/database.sqlite", {verbose: console.log});
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
exports.run = async (client, message, args, level) => {
  
  // Mutes
  const mutes = old_db.prepare("SELECT * FROM muteLogs").all().map(m => {
    const row = old_db.prepare(`SELECT time FROM mutes WHERE userId = '${m.userID}'`).get();
    m.unmute = (!m.length || m.length.toLowerCase().startsWith("indef")) && row ? row.time : null;
    m.guildID = row ? row.guildID : null;
    m.time = new Date(m.date).getTime();
    return m
  });
  mutes.forEach(row => {
    db.prepare("INSERT INTO mutes (userID, guildID, moderator, reason, time, unmute) VALUES (?, ?, ?, ?, ?, ?)").run(row.userID, row.guildID, row.moderator, row.reason, row.time, row.unmute);
  });
  
  // Tempbans
  const bans = old_db.prepare("SELECT * FROM bans");
  bans.forEach(row => db.prepare("INSERT INTO tempbans (userID, guildID, unban) VALUES (@userId, @guildId, @time)").run(row));
  
  // Rbans
  const rbans = old_db.prepare("SELECT * FROM robloxbans").all().map(m => {
    let obj = {};
    const reminder = old_db.prepare("SELECT * FROM rbanReminders WHERE robloxID = ?").get(m.robloxID);
    obj.robloxID = m.robloxID;
    obj.username = m.user;
    obj.moderator = m.moderator;
    obj.reason = m.reason;
    obj.time = new Date(m.date).getTime();
    obj.unban = reminder ? reminder.time : null;
    obj.reminderSent = reminder ? reminder.reminderSent : 0;
    return obj
  })
  rbans.forEach(row => db.prepare("INSERT INTO robloxbans (robloxID, username, moderator, reason, time, unban, reminderSent) VALUES (@robloxID, @username, @moderator, @reason, @time, @unban, @reminderSent)").run(row));
  
}

exports.config = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "Bot Owner"
}

exports.help = {
  name: "transferdata",
  category: "System",
  description: "Transfer databases.",
  usage: "transferdata",
  flags: {}
};
