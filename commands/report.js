const sqlite3 = require("better-sqlite3");
const db = new sqlite3("./data/database.db", {verbose: console.log});
const fetch = require("node-fetch");
exports.run = async (client, message, args, level) => {
    // Make sure a user is specified
    if (!args[0]) return message.reply("You need to include the username of the person you are trying to report .-.")
    // Request roblox data for the specified username
    var response = await fetch(`https://api.roblox.com/users/get-by-username?username=${encodeURI(args[0])}`).then(res=>res.json());
    
    // End command if specified user is not a valid roblox username
    if (response.success && response.success === false && response.errorMessage) return message.reply(`Error: \`${response.errorMessage}\`. Please try again.`);
    
    // Check for delete flag
    if (message.flags.delete) {
      const info = db.prepare(`DELETE FROM reports WHERE reporterID = '${message.author.id}' AND robloxID = '${response.data[0].id}'`).run();
      if (info.changes > 0) return message.reply("Report successfully deleted!")
      else return message.reply("You have not submitted any reports for that user!");
    }
  
    // End command if specified user is already banned
    const banned = db.prepare(`SELECT COUNT(*) FROM robloxbans WHERE robloxID = '${response.Id}'`).get();
    if (banned["COUNT(*)"] > 0) return (message.reply("That user is already banned."));
  
    // End command if a report by this Discord user has already been submitted for the specified Roblox user
    if (db.prepare(`SELECT 1 FROM reports WHERE reporterID = '${message.author.id}' AND robloxID = '${response.data[0].id}'`).get()) return message.reply(`You have already submitted a report for this user. If you would like to submit a new one, please delete the old one first by running the command \`${message.settings.prefix}report ${args[0]} --delete\``);
  
    // Open DM channel with user
    const dmChannel = await message.author.createDM();
  
    // Ask for reason & proof
    let awaitMessage = await client.awaitMessage(message, "Please send a single message in this channel containing your reason and all of your proof (you don't need to include the username). All of your proof MUST be in URL form, as attached files will not be saved and your report will not go through.", 300000, dmChannel);
    if (!awaitMessage || awaitMessage.cancelled) return;
  
    const reason = awaitMessage.response;
    
    // End command if there are attachments
    if (reason.attachments.first()) {
      return reason.channel.send("Please upload your proof files to a **__permanent__** external URL such as YouTube or gyazo and provide the direct URLs to your media when making your player report rather than uploading the files directly. Command terminated.");
    };
  
    // End command if proof is not given
    if (!reason.content.match(/https?\:\/\/\w+\.\w\w+/g)) {
      return reason.channel.send("You cannot submit a report without proof. Command terminated.");
    };
  
    // End command if proof was directly uploaded to discord
    if (reason.content.toLowerCase().includes("cdn.discordapp.com/attachments")) {
      return reason.channel.send("Please upload attachments to a source OTHER than Discord, as Discord URLs are not permanent if the message with the original attachment is deleted. Command terminated.");
    };
    
    // End command if only "proof" given was a roblox link
    const urls = Array.from(reason.content.matchAll(/https?\:\/\/\w[^\s]+\.[^\s]+/g)).map(m => m[0]);
    if (urls.length > 0 && urls.every(url => url.toLowerCase().includes("roblox.com"))) {
      return reason.channel.send("Roblox links do not count as proof. You must provide proof in either image, gif, or video format. Command terminated.");
    }
    
    const insert = db.prepare("INSERT INTO reports (reportedUsername, updatedUsername, robloxID, reason, reporterID, time) VALUES (?, ?, ?, ?, ?, ?)").run([args[0], response.data[0].name, JSON.stringify(response.data[0].id), reason.content, message.author.id, Date.now()]);
    reason.channel.send(`Report submitted successfully! Unique report ID: \`${insert.lastInsertRowid}\`.`);
};

exports.config = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User"
};

exports.help = {
  name: "report",
  category: "Game",
  description: "Report a Roblox user.",
  usage: "report <Roblox username>",
  flags: {
    delete: {
      "description": "Delete a report instead of submitting one.",
      "value": "None (just include the flag)"
    }
  }
};