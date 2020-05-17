const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});

module.exports = async client => {
  client.user.setPresence({status: "online", game: {name: "with Kakuhou Surgeon 2.0", type: "PLAYING"}});
  console.log(client.user.id);
  
  // Load rban timeouts
  db.prepare("SELECT * FROM robloxbans WHERE unban != NULL AND reminderSent != 1").all().forEach(row => {
    client.rbanReminders[row.banID] = setTimeout(() => {
      client.channels.cache.fetch("586418676509573131").send(`${client.users.cache.fetch(row.moderator)}, it's time to unban \`${row.username}\` from Ro-Ghoul. Make sure to delete the banlog after unbanning them using \`\\rbans remove ${row.username}\`.`)
      db.prepare(`UPDATE robloxbans SET reminderSent = 1 WHERE banID = "${row.banID}"`).run();
    }, row.time - Date.now())
  });
}