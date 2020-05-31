const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
const fetch = require("node-fetch");
exports.run = async (client, message, [action, user, ...reason], level) => {
  // End if the command is not performed in the Ro-Ghoul discord or bot testing server
  if (message.guild.id !== "439037987284844545" && message.guild.id !== "319978373755437057") return message.reply("This command can only be used in the official Ro-Ghoul discord.");
  
  // Handle command based on specified action
  if (!action) return message.reply("You need to specify an action.")
  switch (action.toLowerCase()) {
    // List of users who have logged bans where it is past their unban time
    case "overdue": {
      // Grab usernames of overdue bans
      const users = db.prepare(`SELECT username FROM robloxbans WHERE unban < ${Date.now()} OR reminderSent = 1`).all().map(row => row.username)
          .sort(client.sortFunction); // Sort alphabetically
      if (users.length > 0) message.channel.send(users.slice(0, 49).join("\n"))
      else {
        message.reply("There are no overdue rbans.");
        // Clear the rban reminders channel because there are no overdue bans
        const reminderChannel = await client.channels.fetch("586418676509573131");
        const reminders = await reminderChannel.messages.fetch({limit: 100});
        reminderChannel.bulkDelete(reminders);
      }
      
      return;
    }
      
    // List of banned users
    case "list": {
      const users = db.prepare(`SELECT username FROM robloxbans`).all().map(row => row.username)
          .sort(client.sortFunction); // Sort alphabetically
      let page = user || 1; // When list is the action, the second argument is a page number, not a username
      const parseable = /^\d+$/.test(page); // Check if the argument is a parseable integer
      if (parseable) page = parseInt(page) // Parse the string
      else return message.reply; // If it isn't parseable, return an error message
      const start = 50 * (page - 1); // Start of slice
      const end = start + 49; // End of slice (50 values total)
      message.channel.send(users.slice(start, end).join("\n")); // Send the list
      return;
    }
  }
  // If no user is supplied, end the command
  if (!user) return message.reply("You either forgot to specify a user, or you supplied an invalid action.");
  
  // Roblox API request for user data
  const robloxData = await fetch(
    "https://users.roblox.com/v1/usernames/users",
    {
      body: JSON.stringify({ usernames: [user], excludeBannedUsers: false }),
      method: "post",
      headers: { "Content-Type": "application/json" }
    }
  ).then(res => res.json());
  
  // Check if the user's ban is logged
  const logged = !!(db.prepare(`SELECT count(*) FROM robloxbans WHERE robloxID = '${robloxData.data[0].id}'`).get()["count(*)"] > 0);
  
  // Actions that require user argument
  switch (action.toLowerCase()) {
    // Remove a logged ban
    case "remove": {
      // End command if there are no bans logged for the specified user
      if (!logged) return message.reply("There is no ban logged for the user you specified.");
      db.prepare(`DELETE FROM robloxbans WHERE robloxID = '${robloxData.data[0].id}'`).run();
      message.reply("Successfully removed the ban from logs.")
      return;
    }
    
    // View a logged ban
    case "check" || "view": {
      // End command if there are no bans logged for the specified user
      if (!logged) return message.reply(`There is no ban logged for the user you specified. Try searching R-GMC for their ID: \`${robloxData.data[0].id}\`.`);
      const logs = db.prepare(`SELECT * FROM robloxbans WHERE robloxID = '${robloxData.data[0].id}'`).get(); // Load the ban for the desired user
      const footer = logs.unban ? `Roblox ID: ${logs.robloxID} • Reminder set for: ` : `Roblox ID: ${logs.robloxID} • No reminder set`; // Create footer string
      let moderator = logs.moderator === "668335554710077446" ? "Autoban" : await client.users.fetch(logs.moderator).catch(() => moderator = logs.moderator); // Decide whether to display the user object or just the ID (or "Autoban")
      const loggedReason = logs.reason ? logs.reason : "None"; // Reason variable
      var embed = new Discord.MessageEmbed()
        .setColor("ff0000")
        .setAuthor(user,`https://www.roblox.com/bust-thumbnail/image?userId=${logs.robloxID}&width=420&height=420&format=png`,`https://www.roblox.com/users/${logs.robloxID}/profile`)
        .addField("Moderator:", moderator)
        .addField("Reason:", loggedReason)
        .addField("Banned On:", client.toUTC(logs.time))
        .setFooter(footer);
      if (logs.unban) embed.setTimestamp(logs.unban);
      message.channel.send(embed);
      return;
    }
      
    case "count": {
      const entry = db.prepare(`SELECT * FROM bancount WHERE robloxID = '${robloxData.data[0].id}'`).get();
      const count = !!entry ? entry.count : 0;
      var embed = new Discord.MessageEmbed()
        .setColor("6600ff")
        .setAuthor(user,`https://www.roblox.com/bust-thumbnail/image?userId=${robloxData.data[0].id}&width=420&height=420&format=png`,`https://www.roblox.com/users/${robloxData.data[0].id}/profile`)
        .addField("Total Number of In-Game Bans:", count);
      if (count > 0) embed.addField("Latest Ban:", client.toUTC(entry.latest));
      message.channel.send(embed);
      return;
    }
  }
  // If no reason is supplied, end the command
  if (!reason) return message.reply("You need to specify a reason to perform that action.");
  
  // Make reason into a string
  reason = reason.join(" ");
  
  // Actions that require a reason
  switch (action.toLowerCase()) {
    case "add": {
      // End command if there is already a ban log for the specified user
      if (logged) return message.reply("There is already a ban logged for that user! Try using the `edit` aciton instead.");
      const unban = client.parseTime(message.flags["time"]); // Amount of time to wait before sending unban reminder (added to Date.now() when inserted into the database)
      // Add database entry
      const info = db.prepare("INSERT INTO robloxbans (robloxID, username, moderator, reason, time, unban, reminderSent) VALUES (?, ?, ?, ?, ?, ?, ?)").run(JSON.stringify(robloxData.data[0].id), user, message.author.id, reason, Date.now(), !!unban ? unban + Date.now() : unban, 0);
      console.log(info)
      // Add 1 to ban count
      const count = db.prepare(`SELECT count FROM bancount WHERE robloxID = '${robloxData.data[0].id}'`).get();
      if (!!count) db.prepare(`UPDATE bancount SET count = ?, latest = ? WHERE robloxID = '${robloxData.data[0].id}'`).run(count.count + 1, Date.now());
      else db.prepare(`INSERT INTO bancount (robloxID, count, latest) VALUES (?, ?, ?)`).run(JSON.stringify(robloxData.data[0].id), 1, Date.now());
      
      if (!!unban) {
        // Set unban reminder timeout
        client.rbanReminders[info.lastInsertRowid] = setTimeout(() => {
          client.channels.fetch("586418676509573131").send(`${client.users.fetch(message.author.id)}, it's time to unban \`${user}\` from Ro-Ghoul. Make sure to delete the ban log after unbanning them using \`\\rbans remove ${user}\`.`)
          db.prepare(`UPDATE robloxbans SET reminderSent = 1 WHERE banID = ${info.lastInsertRowid}`).run();
        }, unban);
        // Send confirmation message
        message.reply(`I will remind you to unban \`${user}\` in ${client.parseTimeMessage(unban)}.`);
      }
      // Confirmation reaction
      if (!message.author.bot) message.react("👍");
      break;
    }
      
    case "edit": {
      // End command if there are no bans logged for the specified user
      if (!logged) return message.reply("There is no ban logged for the user you specified.");
      // Grab the current log
      const oldLog = db.prepare(`SELECT * FROM robloxbans WHERE robloxID = '${robloxData.data[0].id}'`).get();
      // End command if no updateable fields are being updated
      if (!message.flags["reason"] && !message.flags["time"]) return message.reply("You did not supply any field update information!");
      // Set new reason value or keep it the same
      let reason = message.flags["reason"] ? message.flags["reason"] : oldLog.reason;
      // Set new unban value or keep it the same
      let unban = message.flags["time"] ? (function() { if (message.flags["time"].toLowerCase().startsWith("no")) return null; else return client.parseTime(message.flags["time"]) + Date.now(); }).call() : oldLog.unban;
      // Moderator value
      let moderator = message.author.id;
      // Update database
      db.prepare("UPDATE robloxbans SET reason = ?, unban = ?, moderator = ?, reminderSent = ? WHERE banID = ?").run(reason, unban, moderator, 0, oldLog.banID);
      // Remove old timeout if there was one
      if (client.rbanReminders[oldLog.banID]) clearTimeout(client.rbanReminders[oldLog.banID]);
      if (unban !== null && oldLog.unban > Date.now()) {
        // Set unban reminder timeout
        client.rbanReminders[oldLog.banID] = setTimeout(() => {
          client.channels.fetch("586418676509573131").send(`${client.users.fetch(moderator)}, it's time to unban \`${user}\` from Ro-Ghoul. Make sure to delete the ban log after unbanning them using \`\\rbans remove ${user}\`.`)
          db.prepare(`UPDATE robloxbans SET reminderSent = 1 WHERE banID = ${oldLog.banID}`).run();
        }, unban - Date.now());
        // Send confirmation message
        message.reply(`I will remind you to unban \`${user}\` in ${client.parseTimeMessage(unban - Date.now())}.`);
      }
      // Confirmation reaction
      if (!message.author.bot) message.react("👍");
      break;
    }
      
    default: {
      return message.reply(`${action} is not a valid action. Use \`\help rbans\` to see a list of valid actions.`);
    }
  }
};

// db.prepare("CREATE TABLE IF NOT EXISTS robloxbans (banID INTEGER PRIMARY KEY, robloxID TEXT, username TEXT, moderator TEXT, reason TEXT, time INTEGER, unban INTEGER, reminderSent INTEGER)").run();

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: [],
  permLevel: "Moderator"
};

exports.help = {
  name: "rbans",
  category: "Game",
  description: "Keep track of Roblox bans.",
  usage: "* rbans overdue\n* rbans list <page number>\n* rbans [check || count || remove] <roblox username>\n* rbans add <roblox username> <reason/proof> (<flags>)\n* rbans edit <roblox username> (<flags>)",
  flags: {
    time: {
      description: "How long to wait before sending the unban reminder. This flag can only be used with the 'add' and 'edit' actions.",
      value: "Length of time, or 'none' when using the 'edit' action to remove the unban reminder"
    },
    reason: {
      description: "Change the reason of a logged rban. This flag can only be used during the 'edit' action (it is a regular argument during the 'add' action).",
      value: "Text"
    }
  }
};
