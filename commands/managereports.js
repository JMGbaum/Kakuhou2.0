// Import discord.js
const Discord = require("discord.js");
const CronJob = require("cron").CronJob;

// Import sqlite3 and load the database
const sqlite3 = require("better-sqlite3");
const db = new sqlite3("./data/database.db", {verbose: console.log});

exports.run = async (client, message, args, level) => {
    // End if the command is not performed in the Ro-Ghoul discord or bot testing server
    if (message.guild.id !== "439037987284844545" && message.guild.id !== "319978373755437057") return message.reply("This command can only be used in the official Ro-Ghoul discord.");
  
    const user = message.author;

    // Load reports table
    var reports = db.prepare(`SELECT * FROM reports ORDER BY time ASC`).all();
    var index = -1;
    let row;

    // If there are no reports, don't do anything
    if (reports.length < 1) return message.reply("There are currently no unresolved reports.");


    var instructions = new Discord.MessageEmbed()
        .setDescription("⏪ => Load previous report.\n🔢 => Load report by report ID.\n⏩ => Load next report.\n✅ => Log report in rbans as-is and delete from report system.\n⚠️ => Change reason/proof, then log edited report in rbans and delete from report system.\n❌ => Remove report from system but do not log in rbans.\n🔄 => Reload report system to accomodate for changes made by other staff members (this will then load the oldest report).\n🛑 => Exit.")
        .setFooter(`React with ⏩, 🔢, or 🔄 to get started. • This command will automatically timeout after 10 minutes of inactivity. • This menu is controlled by ${user.tag}.`);
    var sentMessage = await message.channel.send(instructions);
    const reactions = ["⏪", "🔢", "⏩", "✅", "⚠️", "❌", "🔄", "🛑"]
    try {
        reactions.forEach(async r => await sentMessage.react(r))
    } catch (error) {
        console.log("Failed to react")
        console.log(error.stack)
    }


    // Await reactions
    const collector = sentMessage.createReactionCollector((r, u) => u.id === user.id && reactions.some(emoji => r.emoji.name === emoji), { idle: 600000 });

    // Handle reactions
    collector.on("collect", async reaction => {
        // Remove the reaction
        await reaction.users.remove(user.id);

        // Handle reaction
        let banned = 0;
        switch (reaction.emoji.name) {
            case "⏩": {
                if (!reports[index + 1]) {
                    message.reply("Could not load next report: this is the most recent logged report. You may reload (🔄) to account for changes to the reports.").then(m => m.delete({ timeout: 5000 }));
                } else {
                    index++;
                };
                break;
            }

            case "⏪": {
                if (index === -1) return message.reply("You need to load a report using either ⏩, 🔢, or 🔄 before you can do anything else.").then(m => m.delete({ timeout: 5000 }));
                // Give an error message if the oldest report is already loaded
                if (index === 0) {
                    message.reply("Could not load previous report: the oldest report was already loaded.").then(m => m.delete({ timeout: 5000 }));
                } else {
                    index -= 1;
                };
                break;
            }

            case "🔢": {
                // Ask for the report ID they want to access
                const awaitMessage = await client.awaitMessage(message, "what is the ID of the report you would like to load?", 120000);

                // End event if there was no response
                if (!awaitMessage.response) return;

                const idPrompt = awaitMessage.sent;
                const requestedID = awaitMessage.response;

                // End event if cancelled
                if (awaitMessage.cancelled) {
                    idPrompt.delete({timeout: 5000});
                    requestedID.delete();
                    return;
                }
              
                // Find the desired report and update the active report data
                var newReport = reports.map(r => r.reportID).indexOf(parseInt(requestedID.content));
                if (newReport !== -1) {
                    index = newReport;
                    requestedID.delete();
                    idPrompt.delete();
                } else {
                    message.reply("I was unable to find the report you requested. It may have been resolved by another staff member. Try checking rbans!").then(m => m.delete({ timeout: 5000 }));
                    requestedID.delete();
                    idPrompt.delete();
                };
                break;
            }

            case "🔄":{
                reports = db.prepare(`SELECT * FROM reports ORDER BY time ASC`).all();
                index = 0;
                break;
            }
            
            case "✅": {
                if (index === -1) return message.reply("You need to load a report using either ⏩, 🔢, or 🔄 before you can do anything else.").then(m => m.delete({ timeout: 5000 }));
                // Ignore if banned
                if (banned["COUNT(*)"] > 0) {
                    reports = reports.filter(r => r.robloxID !== row.robloxID);
                    message.reply("That user is already banned. They must have been banned by another moderator. Removed all reports of this user.");
                    return;
                }

                // Ask about temporary ban
                let unban = null;
                const awaitMessage = await client.awaitMessage(message, "would you like to set an unban time for this user? Respond with an amount of time (e.g. 4 h, 3 d, etc.) or 'no' to skip.", 120000);

                // End event if there was no response
                if (!awaitMessage) return;

                const response = awaitMessage.response;
                const sent = awaitMessage.sent;
                // End event if cancelled
                if (awaitMessage.cancelled) {
                    response.delete();
                    sent.delete({timeout: 5000});
                    return;
                }
                try {
                    if (!response.content.toLowerCase().startsWith("no")) {
                        // Set unban
                        const timeLength = client.parseTime(response.content);
                        if (timeLength) unban = Date.now() + timeLength // set unban time if the respone was parseable
                        else {
                          // Otherwise, return error
                          sent.edit(`${user}, your response was invalid, reloading this report. Please react again.`);
                          response.delete();
                          sent.delete({ timeout: 5000 });
                          return;
                        }
                    }
                    response.delete();
                    sent.delete();
                } catch (err) {
                    sent.delete();
                    collector.stop("you took too long to respond.");
                    return;
                };
                // Delete all reports of the user from the database
                db.prepare(`DELETE FROM reports WHERE robloxID = '${row.robloxID}'`).run();
                // Add to rbans database
                const info = db.prepare(`INSERT INTO robloxbans (robloxID, username, moderator, reason, time, unban, reminderSent) VALUES (?, ?, ?, ?, ?, ?, ?)`).run([row.robloxID, row.reportedUsername, user.id, row.reason, Date.now(), unban, 0]);
                // Remove all reports of the user from the loaded reports
                reports = reports.filter(r => r.robloxID !== row.robloxID);
                // Add 1 to ban count
                const count = db.prepare(`SELECT count FROM bancount WHERE robloxID = '${row.robloxID}'`).get();
                if (!!count) db.prepare(`UPDATE bancount SET count = ?, latest = ? WHERE robloxID = '${row.robloxID}'`).run(count.count + 1, Date.now());
                else db.prepare(`INSERT INTO bancount (robloxID, count, latest) VALUES (?, ?, ?)`).run(JSON.stringify(row.robloxID), 1, Date.now());
                // Send confirmation message
                message.reply("Report successfully logged in rbans.").then(m => m.delete({timeout: 5000}));
                // Set unban timeout
                if (unban !== null) {
                    client.rbanReminders[info.lastInsertRowid] = new CronJob(new Date(unban), () => {
                        client.channels.cache.get("586418676509573131").send(`${client.users.cache.get(user.id)}, it's time to unban \`${row.reportedUsername}\` from Ro-Ghoul. Make sure to delete the banlog after unbanning them using \`\\rbans remove ${row.reportedUsername}\`.`)
                        db.prepare(`UPDATE robloxbans SET reminderSent = 1 WHERE banID = ${info.lastInsertRowid}`).run();
                    });
                    // Start the cron job
                    client.rbanReminders[info.lastInsertRowid].start();
                };
                break;
            }

            case "⚠️": {
                if (index === -1) return message.reply("You need to load a report using either ⏩, 🔢, or 🔄 before you can do anything else.").then(m => m.delete({ timeout: 5000 }));
                // Ignore if banned
                if (banned["COUNT(*)"] > 0) {
                    reports = reports.filter(r => r.robloxID !== row.robloxID);
                    message.reply("That user is already banned. They must have been banned by another moderator. Removed all reports of this user.");
                    return;
                }
                // Modify reason
                const awaitMessage = await client.awaitMessage(message, "what would you like the new reason to be?", 300000);

                // End event if there was no response
                if (!awaitMessage.response) return;

                const prompt = awaitMessage.sent;
                const response = awaitMessage.response;
                
                // End event if cancelled
                if (awaitMessage.cancelled) {
                    response.delete();
                    prompt.delete();
                    return;
                }
              
                const reason = response.content;
                response.delete();
                prompt.delete();

                // Ask about tempban
                var unban = null;
                const awaitMessage2 = await client.awaitMessage(message, "would you like to set an unban time for this user? Respond with an amount of time (e.g. 4 h, 3 d, etc.) or 'no' to skip.", 120000);
          
                // End event if there was no response
                if (!awaitMessage2.response) return;

                const unbanPrompt = awaitMessage2.sent;
                const unbanResponse = awaitMessage2.response;

                // End event if cancelled
                if (awaitMessage2.cancelled) {
                    unbanResponse.delete();
                    unbanPrompt.delete({timeout: 5000});
                    return;
                }
              
                if (!unbanResponse.content.toLowerCase().startsWith("no")) {
                    // Set unban
                    const timeLength = client.parseTime(unbanResponse.content);
                    if (timeLength) unban = Date.now() + timeLength // set unban time if the respone was parseable
                    else {
                      // Otherwise, return error
                      unbanPrompt.edit(`${user}, your response was invalid, reloading this report. Please react again.`);
                      unbanResponse.delete();
                      unbanPrompt.delete({ timeout: 5000 });
                      return;
                    }
                }
                unbanResponse.delete();
                unbanPrompt.delete();
              
                // Delete all reports of the user from database
                db.prepare(`DELETE FROM reports WHERE robloxID = '${row.robloxID}'`).run();
                // Log in rbans
                const info = db.prepare(`INSERT INTO robloxbans (robloxID, username, moderator, reason, time, unban, reminderSent) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(row.robloxID, row.reportedUsername, user.id, reason, Date.now(), unban, 0);
                // Remove all reports of the user from the loaded reports
                reports = reports.filter(r => r.robloxID !== row.robloxID);
                // Add 1 to ban count
                const count = db.prepare(`SELECT count FROM bancount WHERE robloxID = '${row.robloxID}'`).get();
                if (!!count) db.prepare(`UPDATE bancount SET count = ?, latest = ? WHERE robloxID = '${row.robloxID}'`).run(count.count + 1, Date.now());
                else db.prepare(`INSERT INTO bancount (robloxID, count, latest) VALUES (?, ?, ?)`).run(row.robloxID, 1, Date.now());
                // Send confirmation message
                message.reply("Report successfully logged in rbans.").then(m => m.delete({timeout: 5000}));
                // Set unban timeout
                if (unban !== null) {
                    client.rbanReminders[info.lastInsertRowid] = new CronJob(new Date(unban), () => {
                        client.channels.cache.get("586418676509573131").send(`${client.users.cache.get(user.id)}, it's time to unban \`${row.reportedUsername}\` from Ro-Ghoul. Make sure to delete the banlog after unbanning them using \`\\rbans remove ${row.reportedUsername}\`.`)
                        db.prepare(`UPDATE robloxbans SET reminderSent = 1 WHERE banID = ${info.lastInsertRowid}`).run();
                    });
                    // Start the cron job
                    client.rbanReminders[info.lastInsertRowid].start();
                };
                break;
            }

            case "❌": {
                if (index === -1) return message.reply("You need to load a report using either ⏩, 🔢, or 🔄 before you can do anything else.").then(m => m.delete({ timeout: 5000 }));
                // Ignore if banned
                if (banned["COUNT(*)"] > 0) {
                    reports = reports.filter(r => r.robloxID !== row.robloxID);
                    message.reply("That user is already banned. They must have been banned by another moderator. Removed all reports of this user.");
                    return;
                }
                // Remove report from database
                db.prepare(`DELETE FROM reports WHERE reportID = ${row.reportID}`).run();
                // Remove report from loaded reports
                reports = reports.filter(r => r.reportID !== row.reportID);
                // Send confirmation message
                message.reply("Report deleted successfully.").then(m => m.delete({timeout: 5000}));
                break;
            }

            case "🛑": {
                collector.stop("you reacted with 🛑.");
                return;
            }
        };

        // Remove the current report from active reports
        if (!!row) client.activeReports.splice(client.activeReports.indexOf(row.reportID), 1);
        
        if (index !== -1) {
            let validReport = false;
            while (validReport === false) {
                // Load new report
                row = reports[index];

                if (!row) {
                    collector.stop(`you have reached the end of the reports.`);
                    return;
                }

                // Load game bans
                banned = db.prepare(`SELECT COUNT(*) FROM robloxbans WHERE robloxID = '${row.robloxID}'`).all();
                // Delete all reports of the user if they are already banned, then move to the next iteration.
                if (banned["COUNT(*)"] > 0) {
                    db.prepare(`DELETE FROM reports WHERE robloxID = "${row.robloxID}"`).run();
                    if (reaction.emoji.name === "⏩") index++
                    else if (reaction.emoji.name === "⏪") index -= 1
                    else collector.stop("the report you tried to load is for a user that is already banned.");
                }
                // Skip the report if it is already active
                else if (client.activeReports.includes(row.reportID)) {
                    if (reaction.emoji.name === "⏩") index++
                    else if (reaction.emoji.name === "⏪") index -= 1
                    else collector.stop("the report you tried to load is currently being resolved by someone else.");
                } else {
                    // if there are no game bans and the report is not already being handled, load the report
                    validReport = true;
                    // Add the current report to the active reports
                    client.activeReports.push(row.reportID);

                    let reporter = await client.users.fetch(row.reporterID);
                    // Create a new embed, set the color, and load report data
                    var embed = new Discord.MessageEmbed()
                        .setColor("RANDOM")
                        .setAuthor(row.updatedUsername, `https://www.roblox.com/bust-thumbnail/image?userId=${row.robloxID}&width=420&height=420&format=png`, `https://www.roblox.com/users/${row.robloxID}/profile`)
                        .addField("Unique Report ID:", row.reportID)
                        .addField("Reporter:", `${reporter.tag} (${reporter.id})`)
                    if (row.reportedUsername.toLowerCase() !== row.updatedUsername.toLowerCase()) {
                        embed.addField("Updated Username:", row.reportedUsername);
                    }
                    embed.addField("Reason:", row.reason)
                        .setFooter(`This menu is controlled by ${user.tag}. This report was submitted:`)
                        .setTimestamp(row.time)

                    sentMessage.edit(embed);
                }
            }
        }

        collector.resetTimer();

    });


    // Terminate the command once the collector ends
    collector.on("end", (collected, reason) => {
        if (reason === "time") {
            sentMessage.edit(`${user}, you took to long to react! Command terminated.`, { embed: null });
        } else if (reason !== "limit") {
            sentMessage.edit(`${user}, command terminated: ${reason}`, { embed: null });
        };
        try { sentMessage.reactions.removeAll() } catch (err) { console.log(err.stack) };
    });

};

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: ["mr"],
  permLevel: "Moderator"
}

exports.help = {
  name: "managereports",
  category: "Game",
  description: "Go through unresolved reports.",
  usage: "managereports",
  flags: {}
}