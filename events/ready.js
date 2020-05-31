const db = require("better-sqlite3")("./data/database.db", {verbose: console.log});
const Discord = require("discord.js");

module.exports = async client => {
  /*// Send overdue reminders
  db.prepare(`SELECT * FROM robloxbans WHERE unban < ${Date.now()} AND reminderSent = 0`).all().forEach(row => {
    client.channels.cache.get("586418676509573131").send(`${client.users.cache.get(row.moderator)}, it's time to unban \`${row.username}\` from Ro-Ghoul. Make sure to delete the banlog after unbanning them using \`\\rbans remove ${row.username}\`.`)
    db.prepare(`UPDATE robloxbans SET reminderSent = 1 WHERE banID = ${row.banID}`).run();
  });
  
  // Load rban timeouts
  db.prepare("SELECT * FROM robloxbans WHERE unban IS NOT NULL AND reminderSent = 0").all().forEach(row => {
    client.rbanReminders[row.banID] = setTimeout(() => {
      client.channels.cache.get("586418676509573131").send(`${client.users.cache.get(row.moderator)}, it's time to unban \`${row.username}\` from Ro-Ghoul. Make sure to delete the banlog after unbanning them using \`\\rbans remove ${row.username}\`.`)
      db.prepare(`UPDATE robloxbans SET reminderSent = 1 WHERE banID = ${row.banID}`).run();
    }, row.unban - Date.now())
  });
  
  // Handle overdue tempbans
  db.prepare(`SELECT * FROM tempbans WHERE unban < ${Date.now()}`).all().forEach(async row => {
    const settings = await client.getGuildSettings(row.guildID);
    const guild = client.guilds.cache.get(row.guildID);
    if (!guild) return;
    const channel = guild.channels.cache.find(c => settings.modLogChannel.toLowerCase() === c.name.toLowerCase());
    const user = await client.users.fetch(row.userID);
    const unbanEmbed = new Discord.MessageEmbed()
        .setTitle("Unban (Auto)")
        .setColor("00dd24")
        .addField("User:", `${user.tag}`)
        .setTimestamp()
        .setFooter(`User ID: ${user.id}`);
    // Unban the user
    guild.members.unban(user, "Auto unban.").catch(err => {});
    // Remove ban from database
    db.prepare(`DELETE FROM tempbans WHERE banID = ${row.banID}`).run();
    // Send embed in log channel
    channel.send(unbanEmbed);
  });
  
  // Load tempban timeouts
  db.prepare("SELECT * FROM tempbans").all().forEach(row => {
    client.timeouts.bans[row.banID] = setTimeout(async () => {
      const settings = await client.getGuildSettings(row.guildID);
      const guild = client.guilds.cache.get(row.guildID);
      if (!guild) return;
      const channel = guild.channels.cache.find(c => settings.modLogChannel.toLowerCase() === c.name.toLowerCase());
      const user = await client.users.fetch(row.userID);
      const unbanEmbed = new Discord.MessageEmbed()
          .setTitle("Unban (Auto)")
          .setColor("00dd24")
          .addField("User:", `${user.tag}`)
          .setTimestamp()
          .setFooter(`User ID: ${user.id}`);
      // Unban the user
      guild.members.unban(user, "Auto unban.").catch(err => {});
      // Remove ban from database
      db.prepare(`DELETE FROM tempbans WHERE banID = ${row.banID}`).run();
      // Delete the timeout
      delete client.timeouts.bans[row.banID];
      // Send embed in log channel
      channel.send(unbanEmbed);
    }, row.unban - Date.now());
  });
  
  // Handle overdue tempmutes
  db.prepare(`SELECT * FROM mutes WHERE unmute < ${Date.now()}`).all().forEach(async row => {
    const settings = await client.getGuildSettings(row.guildID).catch(err => {}) || client.config.defaultSettings;
    const guild = client.guilds.cache.get(row.guildID);
    if (!guild) return;
    const channel = guild.channels.cache.find(c => settings.modLogChannel.toLowerCase() === c.name.toLowerCase());
    const member = guild.members.cache.get(row.userID);
    const user = await client.users.fetch(row.userID);
    const mutedRole = guild.roles.cache.find(r => r.name.toLowerCase() === settings.mutedRole.toLowerCase());
    const embed = new Discord.MessageEmbed()
        .setTitle("Unmute (Auto)")
        .setColor("00bbff")
        .addField("User:", `${user.tag}`)
        .setTimestamp()
        .setFooter(`User ID: ${user.id}`);
    // Unmute the user
    if (!!member && !!mutedRole) member.roles.remove(mutedRole);
    // Remove ban from database
    db.prepare(`DELETE FROM mutes WHERE muteID = ${row.muteID}`).run();
    // Send embed in log channel
    channel.send(embed);
  });
  
  // Load tempmute timeouts
  db.prepare("SELECT * FROM mutes WHERE unmute IS NOT NULL").all().forEach(row => {
    client.timeouts.mutes[row.muteID] = setTimeout(async () => {
      const settings = await client.getGuildSettings(client.guilds.cache.row.guildID) || client.config.defaultSettings;
      const guild = client.guilds.cache.get(row.guildID);
      if (!guild) return;
      const channel = guild.channels.cache.find(c => settings.modLogChannel.toLowerCase() === c.name.toLowerCase());
      const member = guild.members.cache.get(row.userID);
      const user = await client.users.fetch(row.userID);
      const mutedRole = guild.roles.cache.find(r => r.name.toLowerCase() === settings.mutedRole.toLowerCase());
      const embed = new Discord.MessageEmbed()
          .setTitle("Unmute (Auto)")
          .setColor("00bbff")
          .addField("User:", `${user.tag}`)
          .setTimestamp()
          .setFooter(`User ID: ${user.id}`);
      // Unmute the user
      if (!!member && !!mutedRole) member.roles.remove(mutedRole);
      // Remove ban from database
      db.prepare(`DELETE FROM mutes WHERE muteID = ${row.muteID}`).run();
      // Delete the timeout
      delete client.timeouts.mutes[row.muteID];
      // Send embed in log channel
      channel.send(embed);
    }, row.unmute - Date.now());
  });*/
  
  // Here we have the bot ping itself every 5 minutes so it doesn't shut off
  const http = require("http");
  setInterval(() => {
    http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
  }, 300000);
  
  // Make the bot "play the game" which is the help command with default prefix.
  client.user.setActivity(`${client.config.defaultSettings.prefix}help`, {
    url: "https://www.twitch.tv/SushiWalrus",
    type: "STREAMING"
  });
  
}