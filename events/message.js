const Discord = require("discord.js");
// The MESSAGE event runs anytime a message is received
// Note that due to the binding of client to every event, every event
// goes `client, other, args` when this function is run.
module.exports = async (client, message) => {
    if (message.author === client.user) return;
  
    // Grab the settings for this server from the database.
    // If there is no guild, get default config (DMs)
    const settings = message.settings = message.guild ? await client.getGuildSettings(message.guild) : client.config.defaultSettings;
    
    // Get the user or member's permission level from the elevation
    const level = client.permlevel(message);  
  
    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    let args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
  
  try{
    // Auto Bans
    if (message.channel.id === "668335508904214568" && message.author.id === "668335554710077446") {
      var autoArgs = ["add", message.content.split(" ")[0].replace(/`/g, "")]; // Set up artificial args
      message.content.replace(/\`/g, "").split(" | ").slice(1).forEach(arg => autoArgs.push(arg)); // Add reason to artificial args
      client.commands.get("rbans").run(client, message, autoArgs, 2); // run rbans command artificially
    };
    
    if (message.author.bot) return;
  
    /* CENSOR */
    if (message.guild && level < 2) {
      // Unemojified message content
      let unemojified = client.unemojify(message.content.toLowerCase());
      // Check unemojified message content for a censor
      const censor = message.settings.censors.find(c => unemojified.replace(/[^a-z]/g, "").includes(c.toLowerCase().replace(/[^a-z]/g, "")));
      //Index of the censored word
      let censorPosition = censor ? unemojified.replace(/[^a-z]/g, "").indexOf(censor.toLowerCase().replace(/[^a-z]/g, "")) : undefined;
      // Check unemojified content for whitelisted words
      const wl = message.settings.whitelist.find(val => unemojified.includes(val.toLowerCase()));
      // Index of the whitelisted word
      let wlPosition = wl ? unemojified.indexOf(wl.toLowerCase()) : undefined;
      // Check for exact censoring (reduce all whitespace to a single space)
      const exactCensor = message.settings.exactCensors.find(censor => client.unemojify(message.content.toLowerCase()).replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").includes(censor.toLowerCase()));
      const longest = censor && wl ? (censor.length >= wl.length ? censor : wl) : undefined;

      // Select all non-letter characters
      const re = /[^a-z]/gi;
      // Create a variable to hold our while loop value
      let myArray;
      // Create an array to hold our matches
      let matches = [];
      // Loop through the message content and add each non-letter character match to the array
      while ((myArray = re.exec(message.content)) !== null) {
        matches.push(myArray);
      };

      // Reconstruct the message content by adding in each removed character
      unemojified = unemojified.replace(/[^a-z]/g, "").split("");
      matches.forEach(m => {
        unemojified.splice(m.index, 0, m[0]);
        // If the character being added back in is positioned before the censor, add an amount to the censor's position that is equal to the number of characters being added back in
        if (censorPosition && m.index <= censorPosition) censorPosition += m[0].length;
      });
      // Change unemojified back into a string
      unemojified = unemojified.join("");

      // Bool value determining whether or not the message is censored; checks if there is an exact censor, a censor and no whitelist, or a censor and a whitelist where the whitelist starts in the middle of the censor capture
      const censored = exactCensor || (censor && !wl) || (censorPosition && wlPosition && !unemojified.slice(censorPosition - longest.length < 0 ? 0 : censorPosition - longest.length, censorPosition + longest.length).includes(wl.toLowerCase()));

      // If the message is censored and the user who sent the message does not have an exempt role and the user who sent the message is not a bot, delete the message
      if (censored && !message.settings.exemptRoles.some(r => message.member.roles.cache.find(role => role.name.toLowerCase() === r.toLowerCase())) && !message.author.bot) {
        // Make sure to include a reason in the client logs to be read in the messageDelete event
        client.logs[message.id] = {reason: `Censored (${censor})`};
        return message.delete({reason: `Censored (${censor})`});
      };
      
      /* BLACKLISTED URLS */
      if (level < 2 && message.settings.blacklistedURLs.some(url => message.content.toLowerCase().includes(url.toLowerCase()))) {
        message.reply("the URL you included in your message is blacklisted in this Discord.").then(m => m.delete({timeout: 5000}));
        client.logs[message.id] = {reason: "Blacklisted URL"};
        return message.delete({reason: "Blacklisted URL"});
      };
    }
  
    /* #general-chat */
    if (message.guild && level < 2 && message.channel.id === "439037987964190721" && message.content.match(/https?\:\/\/\w\w*\.\w\w*/g)) {
      return message.reply("please do not post links in this channel.").then(m => {
        m.delete({timeout: 5000});
        client.logs[message.id] = {reason: "Link in #general-chat"};
        return message.delete({reason: "Link in #general-chat"});
      });
    }
    
    /* #final_submissions */
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
        message.guild.channels.cache.get("480439443786825748").send(advertisementEmbed);
        client.logs[message.id] = {reason: "Discord server invite"};
        return message.delete({reason: "Discord server invite"});
      };
    }
    
    // Delete shortened URLs because we don't want people posting shady things :)
    if (message.guild && level < 2 && ["bit.ly/", "goo.gl/", "owl.ly/", "deck.ly/", "bit.do/", "lnk.co/", "fur.ly/", "moourl.com/", "tinyurl.com/", "adf.ly/"].some(url => message.content.toLowerCase().includes(url))) {
      message.reply("please do not post shortened URLs. Use direct URLs only.").then(m => {
        m.delete({timeout: 8000});
        client.logs[message.id] = {reason: "Included shortened URL"};
        return message.delete({reason: "Included shortened URL"});
      });
    }
  } catch (err) {
    console.log(err)
  }
  
    // Here we separate command from arguments
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
    
    // Make sure the command is being run in #bot-commands
    if (message.guild && message.guild.id === "439037987284844545" && level < 2 && message.channel.id !== "440002786189508618") return;
    
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
    const flagPrefix = /^\-\-|\—/; // flag prefix (escaped)
    message.flags = {};
    let first, key;
    let val = [];
    for (var arg of args) {
      if (flagPrefix.test(arg)) {
        if (key) message.flags[key] = !!val.length ? val.join(" ") : true; // If there is a key, store key-value pair. If there is no value, set value to true for boolean checks
        if (!first) first = arg; // Set the first key so we know where args end and flags begin
        key = arg.slice(flagPrefix.exec(arg)[0].length).toLowerCase(); // Set key
        val = []; // Reset value array
      } else {
        val.push(arg); // Add current argument to value array
      }
    }
    if (key) message.flags[key] = !!val.length ? val.join(" ") : true; // If there is a key, store the FINAL key-value pair
    if (first) args = args.slice(0, args.indexOf(first)); // Remove all flag data from args
  
    try {
        client.channels.cache.get("673938837663121408").send(`${message.author.tag} (${message.author.id}): ran \`${message.content}\` ${message.guild ? `in ${message.channel} (${message.channel.id}).` : "in DMs."}`);
        cmd.run(client, message, args, level);
        console.log(`Ran ${cmd.help.name}`);
    } catch (err) {
        message.react("❌").catch(err => console.log(err.stack));
        console.log(err.stack);
    }
}