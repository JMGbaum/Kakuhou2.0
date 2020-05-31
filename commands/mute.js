const Discord = require("discord.js");
const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
exports.run = async (client, message, args, level) => {
  try {
    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.guild.members.cache.get(/(?<=\<\@)\d+(?=\>)/g.exec(message.content)[0]);
    const mutedRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === message.settings.mutedRole.toLowerCase());
    const logChannel = message.guild.channels.cache.find(c => c.name.toLowerCase() === message.settings.modLogChannel.toLowerCase());
    const length = client.parseTime(message.flags["time"]);
    const muted = !!member.roles.cache.find(r => r.id === mutedRole.id);
    
    // Return if user not found
    if (!member) return message.reply("I was not able to find that user!").then(m => m.delete({timeout: 10000}));
    // Return if user already muted
    else if (muted) return message.reply("This member is already muted.");
    // Return if no reason supplied
    else if (!args[1]) return message.reply("You need to include a reason.");
    else {
      // Remove any previous mute logs from the database
      db.prepare(`DELETE FROM mutes WHERE userID = '${member.id}' AND guildID = '${message.guild.id}'`).run();
      // Create embed for logs
      const muteEmbed = new Discord.MessageEmbed()
        .setTitle("Mute")
        .setColor("ff9000")
        .addField("Target:", `${member.user.tag}`)
        .addField("Executor:", message.author)
        .setTimestamp()
        .setFooter(`User ID: ${member.user.id}`);

      let unmute = null;
      // Temporary mute
      if (!!length) {
        // Add length field to embed with parsed time
        muteEmbed.addField("Length:", client.parseTimeMessage(length));
        // Set unmute time
        unmute = length + Date.now();
      }
      else {
        muteEmbed.addField("Length:", "Indefinitely");
      }
      muteEmbed.addField("Reason:", args.slice(1).join(" "));

      try {
        // Send embed in log channel
        logChannel.send(muteEmbed);
      } catch (err) {
        console.log("Log channel not available.")
      }
      // Add role
      member.roles.add(mutedRole);
      // Add to database
      const info = db.prepare("INSERT INTO mutes (userID, guildID, moderator, reason, time, unmute) VALUES (?, ?, ?, ?, ?, ?)").run(member.id, message.guild.id, message.author.id, args.slice(1).join(" "), Date.now(), unmute);
      // Add timeout
      if (!!length) client.timeouts.mutes[info.lastInsertRowid] = setTimeout(async () => {
        const channel = message.guild.channels.cache.find(c => message.settings.modLogChannel.toLowerCase() === c.name.toLowerCase());
        const mutedRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === message.settings.mutedRole.toLowerCase());
        const embed = new Discord.MessageEmbed()
            .setTitle("Unmute (Auto)")
            .setColor("00bbff")
            .addField("User:", `${member.tag || member.user.tag}`)
            .setTimestamp()
            .setFooter(`User ID: ${member.id}`);
        // Unmute the user
        if (!!member && !!mutedRole) member.roles.remove(mutedRole);
        // Remove ban from database
        db.prepare(`DELETE FROM mutes WHERE muteID = ${info.lastInsertRowid}`);
        // Delete the timeout
        delete client.timeouts.mutes[info.lastInsertRowId];
        // Send embed in log channel
        channel.send(embed);
      }, length);
      // Confirmation reaction
      message.react("👍");
    }
  } catch (err) {
    console.log(err.stack);
    message.react("❌").catch(err => console.log(err.stack));
  }
};

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: [],
  permLevel: "Moderator"
};

exports.help = {
  name: "mute",
  category: "Moderation",
  description: "Mute a user.",
  usage: "mute <@user || user id> <reason> (<flags>)",
  flags: {
    time: {
      description: "Create a temporary mute.",
      value: "Length of time"
    }
  }
};