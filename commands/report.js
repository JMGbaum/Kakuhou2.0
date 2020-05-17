const sqlite3 = require("better-sqlite3");
const db = new sqlite3("./data/database.db", {verbose: console.log});
const fetch = require("node-fetch");
exports.run = async (client, message, args, level) => {
    if (!args[0]) return message.reply("you need to include the username of the person you are trying to report .-.")
    var response = await fetch("https://users.roblox.com/v1/usernames/users", {body:JSON.stringify({"usernames":[args[0]],"excludeBannedUsers":false}), method:"post", headers:{"Content-Type":"application/json"}}).then(res=>res.json());
    if (response.data[0]) {
      const dmChannel = await message.author.createDM();
      let sentMessage = await dmChannel.send("Please send your reason and proof in a single message in this channel. Your proof MUST be uploaded to a permanent link, included in your message, as attached files will not be saved and your report will not go through. This command will timeout after 2 minutes.");
      let reason;
      try {
        let collected = await dmChannel.awaitMessages(m => m.author.id === message.author.id, {max: 1, time: 120000, errors: ["time"]});
        console.log("Collected")
        reason = collected.first().content;
      } catch(err) {
        console.log(err.stack);
        return sentMessage.edit("Command timed out. Please try again.")
      }
      db.prepare("INSERT INTO reports (reportedUsername, updatedUsername, robloxID, reason, reporterID, time) VALUES (?, ?, ?, ?, ?, ?)").run([args[0], response.data[0].name, JSON.stringify(response.data[0].id), reason, message.author.id, Date.now()]);
    } else {
      return message.reply("Could not find a roblox user with that username. Please try again.");
    }
}

exports.config = {
  aliases: []
}

exports.help = {
  name: "report"
}