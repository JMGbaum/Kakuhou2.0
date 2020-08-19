const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
const CronJob = require("cron").CronJob;
exports.run = async (client, message, args, level) => {
  let member = parseInt(args[0]) ? await client.users.fetch(args[0]).catch(err => console.log(err)) : message.mentions.members.first() || message.guild.members.cache.get(/(?<=\<\@)\d+(?=\>)/g.exec(message.content)) || /(?<=\<\@)[^\s]+(?=\>)/g.exec(message.content) ? await client.users.fetch(/(?<=\<\@)[^\s]+(?=\>)/g.exec(message.content)[0].replace(/[^\d]/g, "")).catch(err => console.log(err)) : null;
  // Return if target is not supplied
  if (!member) return message.channel.send("Who are you trying to ban, " + message.author + "?").then(m => m.delete({timeout: 10000}));
  // Try to get the member object
  if (message.guild.members.cache.get(member.id)) member = message.guild.members.cache.get(member.id);
  // Make sure the person running the command has a role higher than the target
  if (message.guild.members.cache.get(member.id) && message.member.roles.highest.rawPosition <= message.guild.members.cache.get(member.id).roles.highest.rawPosition) return message.reply("You are not allowed to ban this user.");
  
  const logChannel = message.guild.channels.cache.find(c => c.name.toLowerCase() === message.settings.modLogChannel.toLowerCase());
  let ban = await (async () => {
    try { return await message.guild.fetchBan(member.id) } catch (err) { return false };
  }).call();
  const time = client.parseTime(message.flags["time"] || message.flags["t"]);

  // Return if member is already banned
  if (!!ban) return message.reply("That user is already banned!");
  // Make sure the member is bannable
  if (message.guild.members.cache.get(member.id) && !member.bannable) return message.reply("I am unable to ban that user. Check to make sure my highest role is higher than their highest role or you can try banning them manually.");
  // Return if there is no reason
  if (!args[1]) return message.reply("you must include a reason to ban a user. Please try again.");
  
  
  const banEmbed = new Discord.MessageEmbed()
    .setTitle("Ban")
    .setColor("ff0000")
    .addField("Target:", `${member.tag || member.user.tag}`)
    .addField("Executor:", message.author)
    .setFooter(`User ID: ${member.id}`);

  if (!!time) {
    banEmbed.addField("Length:", client.parseTimeMessage(time)).addField("Reason:", args.slice(1).join(" "));
    /*try {
      member.send("You were temporarily banned for " + client.parseTimeMessage(time) + "\n\nReason:\n*" + args.slice(1).join(" ") + "*").catch(err => {});
    } catch (err) {} */
    // Remove all other tempbans
    db.prepare(`DELETE FROM tempbans WHERE userID = '${member.id}' AND guildID = '${message.guild.id}'`).run();
    // Remove timeout
    if (!!client.timeouts.bans[member.id] && client.timeouts.bans[member.id].running) client.timeouts.bans[member.id].stop();
    // Add tempban
    const info = db.prepare("INSERT INTO tempbans (userID, guildID, unban) VALUES (?, ?, ?)").run(member.id, message.guild.id, time + Date.now());
    // Set timeout
    client.timeouts.bans[info.lastInsertRowid] = new CronJob(new Date(time + Date.now()), () => {
      const channel = message.guild.channels.cache.find(c => message.settings.modLogChannel.toLowerCase === c.name.toLowerCase());
      const unbanEmbed = new Discord.MessageEmbed()
          .setTitle("Unban (Auto)")
          .setColor("00dd24")
          .addField("User:", `${member.tag || member.user.tag}`)
          .setTimestamp()
          .setFooter(`User ID: ${member.id}`);
      // Unban the user
      message.guild.members.unban(member, "Auto unban.");
      // Remove ban from database
      db.prepare(`DELETE FROM tempbans WHERE banID = ${info.lastInsertRowid}`).run();
      // Send embed in log channel
      channel.send(unbanEmbed);
    });
    // Start the cron job
    client.timeouts.bans[info.lastInsertRowid].start()
  }
  else banEmbed.addField("Length:", "Indefinitely").addField("Reason:", args.slice(1).join(" "));
  message.guild.members.ban(member.id, {
    reason: args.slice(1).join(" "),
    days: parseInt(message.flags["delete"] || message.flags["del"]) <= 7 && parseInt(message.flags["delete"] || message.flags["del"]) >= 0 ? parseInt(message.flags["delete"] || message.flags["del"]) : 0
  });
  banEmbed.setTimestamp();
  message.guild.channels.cache.find(c => c.name.toLowerCase() === message.settings.modLogChannel.toLowerCase()).send(banEmbed);
  message.react("👍");
};

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: [],
  permLevel: "Moderator"
};

exports.help = {
  name: "ban",
  category: "Moderation",
  description: "STRIKE THE BAN HAMMER!",
  usage: "ban [@user || User ID] reason (<flags>)",
  flags: {
    time: {
      description: "Create a temporary ban.",
      value: "Length of time"
    },
    delete: {
      description: "Number of days worth of messages to delete (default 0)",
      value: "Integer (minimum 0, maximum 7)"
    }
  }
};
