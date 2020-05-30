const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
exports.run = async (client, message, args, level) => {
  const member = parseInt(args[0]) ? await client.users.fetch(args[0]) : message.mentions.members.first() || await message.guild.members.fetch(message.content.split("<@")[1].split(">")[0].replace(/[^\d]/g, ""));
  // Return if target is not supplied
  if (!member) return message.channel.send("Who are you trying to ban, " + message.author + "?").then(m => m.delete({timeout: 10000}));
  // Make sure the person running the command has a role higher than the target
  if (message.guild.members.cache.get(member.id) && message.member.roles.highest.position <= member.roles.highest.position) return message.reply("You are not allowed to ban this user.");
  
  const logChannel = message.guild.channels.cache.find(c => c.name.toLowerCase() === message.settings.modLogChannel.toLowerCase());
  let ban = await (async () => {
    try { return await message.guild.fetchBan(member.id) } catch (err) { return false };
  }).call();
  const time = client.parseTime(message.flags["time"]);

  // Return if member is already banned
  if (!!ban) return message.reply("That user is already banned!");
  // Make sure the member is bannable
  if (!member.bannable && message.guild.members.cache.get(member.id)) return message.reply("I am unable to ban that user. Check to make sure my highest role is higher than their highest role or you can try banning them manually.");
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
    try {
      member.send("You were temporarily banned for " + client.parseTimeMessage(time) + "\n\nReason:\n*" + args.slice(1).join(" ") + "*").catch(err => {});
    } catch (err) {} 
    // Remove all other tempbans
    db.prepare(`DELETE FROM tempbans WHERE userID = '${member.id}' AND guildID = '${message.guild.id}'`).run();
    // Remove timeout
    if (!!client.timeouts.bans[member.id]) clearTimeout(client.timeouts.bans[member.id]);
    // Add tempban
    const info = db.prepare("INSERT INTO tempbans (userID, guildID, unban) VALUES (?, ?, ?)").run(member.id, message.guild.id, time + Date.now());
    // Set timeout
    client.timeouts.bans[info.lastInsertRowid] = setTimeout(() => {
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
      db.prepare(`DELETE FROM tempbans WHERE banID = ${info.lastInsertRowid}`);
      // Delete the timeout
      delete client.timeouts.bans[info.lastInsertRowid];
      // Send embed in log channel
      channel.send(unbanEmbed);
    }, time);
  }
  else banEmbed.addField("Length:", "Indefinitely").addField("Reason:", args.slice(1).join(" "));
  message.guild.members.ban(member.id, {
    reason: args.slice(1).join(" "),
    days: message.flags["delete"] && parseInt(message.flags["delete"]) && parseInt(message.flags["delete"]) <= 7 && parseInt(message.flags["delete"]) >= 0 ? parseInt(message.flags["delete"]) : 0
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
