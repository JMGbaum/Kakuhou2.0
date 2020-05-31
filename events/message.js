const Discord = require("discord.js");
// The MESSAGE event runs anytime a message is received
// Note that due to the binding of client to every event, every event
// goes `client, other, args` when this function is run.
module.exports = async (client, message) => {
    if (message.author === client.user) return;
    if (message.author.bot) return;
  
    // Grab the settings for this server from Enmap.
    // If there is no guild, get default conf (DMs)
    const settings = message.settings = message.guild ? await client.getGuildSettings(message.guild) : client.config.defaultSettings;
    
    // Get the user or member's permission level from the elevation
    const level = client.permlevel(message);  
  
    // Auto Bans
    if (message.channel.id === "668335508904214568" && message.author.id === "668335554710077446") {
      var autoArgs = ["add", message.content.split(" ")[0].replace(/`/g, "")]; // Set up artificial args
      message.content.replace(/\`/g, "").split(" | ").slice(1).forEach(arg => autoArgs.push(arg)); // Add reason to artificial args
      client.commands.get("rbans").run(client, message, autoArgs, 2); // run rbans command artificially
    };
  
    // Censor
    if (message.guild && level < 2) {
      var censored = message.settings.censors.some(w => client.unemojify(message.content).replace(/[^a-z]/gi, "").includes(w.replace(/[^a-z]/gi, "")));
      var word = message.settings.censors.find(w => client.unemojify(message.content).replace(/[^a-z]/gi, "").includes(w.replace(/[^a-z]/gi, "")));
      var wl = message.settings.whitelist.find(w => client.unemojify(message.content).replace(/[^a-z]/gi, "").includes(w.replace(/[^a-z]/gi, "")));
      var exactCensor = message.settings.exactCensors.find(c => client.unemojify(message.content).replace(/[^a-z\s]/gi, "").replace(/\s+/gi, " ").includes(c));
      var exactPhrase = client.unemojify(message.content).replace(/[^a-z\s]/gi, "").replace(/\s+/gi, " ").includes(exactCensor);
      var exactWord = client.unemojify(message.content).replace(/[^a-z\s]/gi, "").replace(/\s+/gi, " ").split(" ").some(a => exactCensor === a);
      var exactCensored = exactCensor && exactCensor.split(" ").length > 1 ? exactPhrase : exactWord;
      if (censored && !message.settings.exemptRoles.some(r => message.member.roles.cache.find(role => role.name.toLowerCase() === r.toLowerCase())) && !message.author.bot) {
        if (wl && args.some(a => a.concat(args[args.indexOf(a) + 1]).includes(word.toLowerCase().replace(/[^a-z]/gi, "")) && a.concat(args[args.indexOf(a) + 1]).includes(wl.toLowerCase().replace(/[^a-z]/gi, "")))) {} else {
          return message.delete();
        };
      };
      if (exactCensored && !message.settings.exemptRoles.some(r => message.member.roles.cache.find(role => role.name.toLowerCase() === r.toLowerCase())) && !message.author.bot) return message.delete();
      
      // Blacklisted URLs
      if (level < 2 && message.settings.blacklistedURLs.some(url => message.content.toLowerCase().includes(url.toLowerCase()))) {
        message.reply("the URL you included in your message is blacklisted in this Discord.").then(m => m.delete({timeout: 5000}));
        message.delete();
      };
    }
  
    //#general-chat
    if (message.guild && level < 2 && message.channel.id === "439037987964190721" && message.content.match(/https?\:\/\/\w\w*\.\w\w*/g)) {
      return message.reply("please do not post links in this channel.").then(m => {
        message.delete();
        m.delete({timeout: 5000});
      });
    }
    
    //#final_submissions
    if (message.channel.id === "491753499659337758" && level < 2 && message.guild.roles.cache.find(r => r.name.toLowerCase() === "participant")) {
      if (message.attachments.size < 1 && !message.member.roles.cache.find(r => r.name.toLowerCase() === "staff")) return message.delete();
      return message.member.roles.add(message.guild.roles.cache.find(r => r.name.toLowerCase() === "participant"));
    };
    
    // Remove invites to other discords
    const inviteLink = /(?:https?:\/\/)?(?:www\.)?discord(?:\.gg|(?:app)?\.com\/invite)\/(\S+)/g.exec(message.content);
    if (message.guild && !!inviteLink && level < 2) {
      const invite = await client.fetchInvite(inviteLink);
      if (invite.guild.id !== message.guild.id) {
        const advertisementEmbed = new Discord.MessageEmbed().setColor("ff0000").setAuthor(message.author.tag, message.author.displayAvatarURL).addField(`Sent the following Discord invite link to "${invite.guild.name}" in #${message.channel.name}`, invite.url).setFooter(`User ID: ${message.author.id}`);
        message.reply("Please do not advertise other Discords.").then(m => m.delete({timeout: 10000}));
        message.guild.channels.get("480439443786825748").send(advertisementEmbed);
        return message.delete();
      };
    }
    
    // Delete shortened URLs because we don't want people posting shady things :)
    if (message.guild && level < 2 && ["bit.ly/", "goo.gl/", "owl.ly/", "deck.ly/", "bit.do/", "lnk.co/", "fur.ly/", "moourl.com/", "tinyurl.com/", "adf.ly/"].some(url => message.content.toLowerCase().includes(url))) {
      message.reply("please do not post shortened URLs. Use direct URLs only.").then(m => {
        message.delete();
        m.delete({timeout: 8000});
      });
    }
  
    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    let args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if (message.content.indexOf(settings.prefix) !== 0) return;

    // Check whether the command, or alias, exist in the collections defined
    // in app.js.
    const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));
  
    // using this const varName = thing OR otherthign; is a pretty efficient
    // and clean way to grab one of 2 values!
    if (!cmd) return;
  
    // Some commands may not be useable in DMs. This check prevents those commands from running
    // and return a friendly error message.
    if (!message.guild && cmd.config.guildOnly)
      return message.channel.send("This command is unavailable via private message. Please run this command in a guild.");
  
    if (message.guild && !message.guild.available && cmd.config.guildOnly)
      return message.reply("There seems to be a Discord outage, preventing me from accessing your server. Please try again in a little bit.");
    
    
    // Make sure the user has permission to use the command
    if (level < client.levelCache[cmd.config.permLevel]) {
      if (settings.systemNotice === "true") {
        return message.channel.send(`You do not have permission to use this command.
      Your permission level is ${level} (${client.config.permLevels.find(l => l.level === level).name})
      This command requires level ${client.levelCache[cmd.config.permLevel]} (${cmd.config.permLevel})`).then(m => m.delete(8000));
      } else {
        return;
      }
    }
  
    // Create message flags (i.e. if message is "\command --flag custom value", the message flags would be {flag: "custom value"})
    // ** NOTE: flags MUST be placed at the end of the message, as everything after the first flag is taken out of args and is only accessible in message.flags and message.content.
    const flagPrefix = "\-\-"; // flag prefix (escaped)
    message.flags = {};
    let first, key;
    let val = [];
    for (var arg of args) {
      if (arg.startsWith(flagPrefix)) {
        if (key) message.flags[key] = !!val.length ? val.join(" ") : null; // If there is a key, store key-value pair
        if (!first) first = arg; // Set the first key so we know where args end and flags begin
        key = arg.slice(flagPrefix.length).toLowerCase(); // Set key
        val = []; // Reset value array
      } else {
        val.push(arg); // Add current argument to value array
      }
    }
    if (key) message.flags[key] = !!val.length ? val.join(" ") : null; // If there is a key, store the FINAL key-value pair
    if (first) args = args.slice(0, args.indexOf(first)); // Remove all flag data from args
  
    try {
        cmd.run(client, message, args, level);
    } catch (err) {
        message.react("❌").catch(err => console.log(err.stack));
        console.log(err.stack);
    }
}