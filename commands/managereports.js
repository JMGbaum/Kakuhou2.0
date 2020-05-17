// Import discord.js
const Discord = require("discord.js");

// Import sqlite3 and load the database
const sqlite3 = require("better-sqlite3");
const db = new sqlite3("./data/database.db");

exports.run = async (client, message, args, level) => {
    const user = message.author;
  
    // Load reports table
    var reports = db.prepare(`SELECT * FROM reports ORDER BY time`).all();
    var index = -1;
  
    // If there are no reports, don't do anything
    if (reports.length < 1) message.reply("there are currently no unresolved reports.");
  
  
    var instructions = new Discord.MessageEmbed()
        .setDescription("⏪ => Load previous report.\n🔢 => Load report by report ID.\n⏩ => Load next report.\n✅ => Log report in rbans as-is and delete from report system.\n⚠️ => Change reason/proof, then log edited report in rbans and delete from report system.\n❌ => Remove report from system but do not log in rbans.\n🔄 => Reload report system to accomodate for changes made by other staff members (this will then load the oldest report).\n🛑 => Exit.")
        .setFooter(`React with anything to load the first report. • This command will automatically timeout after 5 minutes of inactivity. • This menu is controlled by ${user.tag}.`);
    var sentMessage = await message.channel.send(instructions);
    const reactions = ["⏪", "🔢", "⏩", "✅", "⚠️", "❌", "🔄", "🛑"]
    try {
        reactions.forEach(async r => await sentMessage.react(r))
    } catch(error) {
        console.log("Failed to react")
        console.log(error.stack)
    }

    // Create loop to iterate through reports
    while(true) {
        // Don't read reactions if the instructions are displayed, automatically open the first report
        if (index === -1) {
          index++;
          continue;
        }
      
        // Await reactions
        var collected;
        var reaction;
        try {
            collected = await sentMessage.awaitReactions((r, u) => u.id === user.id && reactions.some(emoji => r.emoji.name === emoji), {max: 1, time: 300000, errors: ["time"]});
            reaction = collected.first();
            // Remove the reaction
            const userReactions = sentMessage.reactions.cache.filter(reaction => reaction.users.cache.has(user.id));
            try {
              for (const reaction of userReactions.values()) {
                await reaction.users.remove(user.id);
              }
            } catch (error) {
              console.error('Failed to remove reactions.');
            }
        } catch {
            sentMessage.edit(`${user}, you did not react in time. Command cancelled.`, {embed: null});
            break;
        }
        
        // Load new report
        let row;
        if (reports[index]) {
          row = reports[index];
        } else {
          sentMessage.edit(`${user}, there are no more reports at the moment. Command terminated.`, {embed: null});
          break;
        };
        console.log(reports);
        // Load game bans
        var banned = db.prepare(`CASE WHEN EXISTS (SELECT 1 FROM robloxbans WHERE robloxID = "${row.robloxID}") THEN 1 ELSE 0 END`).get();

        // Delete all reports of the user if they are already banned, then move to the next iteration.
        if(banned) {
            db.prepare(`DELETE * FROM reports WHERE robloxID = "${row.robloxID}"`).run();
            index++;
            continue;
        };

        // Generate a random color for the embed
        const charOpts = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "a", "b", "c", "d", "e", "f"];
        let color = "";
        for (var i = 0; i < 6; i++) {
            color += charOpts[Math.floor(Math.random() * charOpts.length)];
        };
        
        // Create a new embed, set the color, and load report data
        var embed = new Discord.MessageEmbed()
            .setColor(color)
            .setAuthor(user,`https://www.roblox.com/bust-thumbnail/image?userId=${row.robloxID}&width=420&height=420&format=png`,`https://www.roblox.com/users/${row.robloxID}/profile`)
            .addField("Unique Report ID:", row.reportID)
            .addField("Reporter:", client.members.cache.fetch(row.reporterID))
            .addField("Reported Username:", row.reportedUsername)
        if (row.reportedUsername.toLowerCase() !== row.updatedUsername.toLowerCase()) {
            embed.addField("Updated Username:", row.updatedUsername);
        }
        embed.addField("Reason:", row.reason)
            .setFooter(`This menu is controlled by ${user.tag}. This report was submitted `)
            .setTime(row.time)

        // Make sure the current report isn't already being worked on
        if(!client.activeReports.some(r => r.robloxID === row.robloxID)) {
            // Add the current report to the active reports
            client.activeReports.push(row.robloxID);

            // Next
            if (reaction.emoji.name === "⏩") {
                index++
            }

            // Back
            if (reaction.emoji.name === "⏪") {
                // Give an error message if the oldest report is already loaded
                if (index === 0) {
                    message.reply("Could not load previous report: the oldest report was already loaded.").then(m=>m.delete(5000));
                    continue;
                } else {
                    index -= 1;
                };
            }
            
            /*// Load Report by ID
            if (reaction.emoji.name === "🔢") {
                // Ask for the report ID they want to access
                "insert code"

                // Find the desired report and update the active report data
                var newReport = reports.indexOf(r => r.id === requestedID)
                if (newReport !== -1) {
                    index = newReport;
                } else {
                    sentMessage.edit("I was unable to find the report you requested. It may have been resolved by another staff member. Try checking rbans!")
                }
            }*/

            // Reload
            if (reaction.emoji.name === "🔄") {
                reports = await db.prepare(`SELECT * FROM reports`).all();
            }

            // Log
            if (reaction.emoji.name === "✅") {
                db.prepare(`DELETE * FROM reports WHERE robloxID = ${row.robloxID}`).run();
                var unban = null;
                db.prepare(`INSERT INTO robloxbans (robloxID, moderator, reason, date, unban) VALUES (?, ?, ?, ?, ?)`).run([row.robloxID, user.id, row.reason, Date(), unban]);
                index++
            }

            // Log with modified reason
            if (reaction.emoji.name === "⚠️") {
                var reason = "";
                db.prepare(`DELETE * FROM reports WHERE robloxID = ${row.robloxID}`).run();
                var unban = null;
                db.prepare(`INSERT INTO robloxbans (robloxID, moderator, reason, time, unban) VALUES (?, ?, ?, ?, ?)`).run([row.robloxID, user.id, reason, Date(), unban]);
                index++
            }

            // Delete
            if (reaction.emoji.name === "❌") {
                db.prepare(`DELETE * FROM reports WHERE robloxID = ${row.robloxID}`).run();
                index++
            }

            // Exit
            if (reaction.emoji.name === "🛑") {
                sentMessage.edit(`${user}, command terminated.`);
                break;
            }

            // Remove the current report from active reports
            client.activeReports.splice(client.activeReports.indexOf(row.RobloxID), 1);
        }
        sentMessage.reactions.cache.removeAll();
    }
    sentMessage.reactions.cache.removeAll();
}

exports.config = {
  aliases: ["mr"]
}

exports.help = {
  name: "managereports"
}