const Keyv = require('keyv');
const keyv = new Keyv('sqlite://./data/database.db', {
  table: 'settings'
});

module.exports = (client) => {

    client.loadCommand = async (commandName) => {
        try {
            if (client.aliases.has(commandName) && !client.commands.has(commandName)) {
              commandName = client.aliases.get(commandName);
            }
            // Grab the command file
            const props = require(`../commands/${commandName}`);

            console.log(`Loading command: ${props.help.name}.`);
            // Load it into the client
            client.commands.set(props.help.name, props);
            // Load the aliases into the client
            props.config.aliases.forEach(alias => {
                client.aliases.set(alias, props.help.name);
            });
            return false;
        } catch (err) {
            return `Unable to load command ${commandName}: ${err.stack}`;
        };
    };

    client.unloadCommand = async (commandName) => {
        let command = false;

        // Find the loaded command in the client
        if (client.commands.has(commandName)) {
            command = client.commands.get(commandName);
        } else if (client.aliases.has(commandName)) {
            command = client.commands.get(client.aliases.get(commandName));
            commandName = client.aliases.get(commandName);
        };
        if (!command) return `The command \`${commandName}\` doesn't seem to exist, nor is it an alias. Please try again.`;
      
        // If the command needs to execute code before being unloaded, execute it
        if (command.shutdown) {
            await command.shutdown(client);
        };
      
        // Delete the command from the client
        delete require.cache[require.resolve(`../commands/${commandName}.js`)];
        return false;
    }

    client.unemojify = (string) => {
        return string.replace(/🇦/g, "a").replace(/🇧/g, "b").replace(/🅱/g, "b").replace(/🇨/g, "c").replace(/🇩/g, "d").replace(/🇪/g, "e").replace(/🇫/g, "f").replace(/🇬/g, "g").replace(/🇭/g, "h").replace(/🇮/g, "i").replace(/🇯/g, "j").replace(/🇰/g, "k").replace(/🇱/g, "l").replace(/🇲/g, "m").replace(/🇳/g, "n").replace(/🇴/g, "o").replace(/🇵/g, "p").replace(/🇶/g, "q").replace(/🇷/g, "r").replace(/🇸/g, "s").replace(/🇹/g, "t").replace(/🇺/g, "u").replace(/🇻/g, "v").replace(/🇼/g, "w").replace(/🇽/g, "x").replace(/🇾/g, "y").replace(/🇿/g, "z").replace(/@/g, "a").replace(/$/g, "s").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/0/g, "o").replace(/!/g, "i").replace(/[\u00C0-\u00C5\u00E0-\u00E5]/g, "a").replace(/[\u00C8-\u00CB\u00E8-\u00EB]/g, "e").replace(/[\u00CC-\u00CF\u00EC-\u00EF]/g, "i").replace(/[\u00F1\u00D1]/g, "n").replace(/[\u00D2-\u00D6\u00D8\u00F2-\u00F6\u00F8]/g, "o").replace(/[\u00D9-\u00DC\u00F9-\u00FC]/g, "u");
    };
  
  
    /*
    MESSAGE CLEAN FUNCTION

    "Clean" removes @everyone pings, as well as tokens, and makes code blocks
    escaped so they're shown more easily. As a bonus it resolves promises
    and stringifies objects!
    This is mostly only used by the Eval and Exec commands.
    */
    client.clean = async (client, text) => {
      if (text && text.constructor.name == "Promise")
        text = await text;
      if (typeof evaled !== "string")
        text = require("util").inspect(text, {
          depth: 1
        });

      text = text
        .replace(/`/g, "`" + String.fromCharCode(8203))
        .replace(/@/g, "@" + String.fromCharCode(8203))
        .replace(client.token, "mfa.VkO_2G4Qv3T--NO--lWetW_tjND--TOKEN--QFTm6YGtzq9PH--4U--tG0");

      return text;
    };
    
  /* AWAIT SINGLE MESSAGE FUNCTION */
  client.awaitMessage = async (message, prompt, timeout, channel = message.channel) => {
    const user = message.author;
    const timeString = client.parseTimeMessage(timeout);
    
    const sentMsg = await channel.send(`${user}, ${prompt} Say 'cancel' to cancel. This prompt will timeout automatically after ${timeString}.`)
        .catch(err => {
            message.reply("your DMs must be enabled to use this command.");
            return undefined;
        });
    try {
      const response = await sentMsg.channel.awaitMessages(m => m.author.id === user.id, { max: 1, time: timeout, errors: ["time"] });
      let cancelled = false;
      if (response.first().content.toLowerCase() === "cancel") {
        sentMsg.edit(`Cancelled.`);
        cancelled = true;
      };
      return {sent: sentMsg, response: response.first(), cancelled: cancelled};
    } catch (err) {
      sentMsg.edit(`${user}, you took too long to respond. Command cancelled.`);
      console.log(err.stack);
      return undefined;
    }
    
  }
  
  /* PARSE TIME MESSAGE FUNCTION */
  client.parseTimeMessage = (time) => {
    if (!time) return null;
    // Convert to seconds
    let remainder = Math.ceil(time / 1000);
    let timeString = [];
    
    // Weeks
    if (Math.floor(remainder / (3600 * 24 * 7)) !== 0) {
      // Number of weeks
      const num = Math.floor(remainder / (3600 * 24 * 7));
      // String
      const mod = "week"
      // Format message and add to string
      timeString.push(num !== 1 ?`${num} ${mod}s` :`${num} ${mod}`);
      // Remaining seconds
      remainder %= (3600 * 24 * 7);
    }
    
    // Days
    if (Math.floor(remainder / (3600 * 24)) !== 0) {
      // Number of days
      const num = Math.floor(remainder / (3600 * 24));
      // String
      const mod = "day"
      // Format message and add to string
      timeString.push(num !== 1 ?`${num} ${mod}s` :`${num} ${mod}`);
      // Remaining seconds
      remainder %= (3600 * 24);
    }
    
    // Hours
    if (Math.floor(remainder / 3600) !== 0) {
      // Number of hours
      const num = Math.floor(remainder / (3600));
      // String
      const mod = "hour"
      // Format message and add to string
      timeString.push(num !== 1 ?`${num} ${mod}s` :`${num} ${mod}`);
      // Remaining seconds
      remainder %= 3600;
    }
    // Minutes
    if (Math.floor(remainder / 60) !== 0) {
      // Number of minutes
      const num = Math.floor(remainder / (60));
      // String
      const mod = "minute"
      // Format message and add to string
      timeString.push(num !== 1 ?`${num} ${mod}s` :`${num} ${mod}`);
      // Remaining seconds
      remainder %= 60;
    }
    // Seconds
    if (remainder !== 0) {
      // Number of seconds
      const num = remainder;
      // Message
      const mod = "second"
      // Format message and add to string
      timeString.push(num !== 1 ?`${num} ${mod}s` :`${num} ${mod}`);
    }
    
    // Add "and" before the last argument if there are multiple arguments
    if (timeString.length > 1) timeString[timeString.length - 1] = "and " + timeString[timeString.length - 1];
    
    // Join arguments with a comma
    if(timeString.length > 2) return timeString.join(", ")
    // Or just with a space if there are only 2 arguments
    else return timeString.join(" ");
  }
  
  
  /* PARSE TIME FUNCTION */
  client.parseTime = (timeMessage) => {
    if (!timeMessage) return null;
    try{
      // Split string at whitespace characters
      let args = timeMessage.split(/\s+/g);

      args.forEach((a, i) => {
        // If arg doesn't end with a non-digit character and the next arg doesn't start with a digit
        if (!/\D$/g.test(a) && /^\D/g.test(args[i + 1])) {
          // combine the two arguments
          args[i] += args[i + 1];
        };
        // Then remove the argument that doesn't start with a digit
        if (/^\D/g.test(a)) {
          args.splice(i, 1);
        }
      });
      // Organize args into objects with a 'number' property and a 'modifier' property to easily parse arguments
      args = args.map(a => {return {number: parseFloat(a.split(/[^\.\d]+/g)[0]), modifier: a.split(/[\d\.]+/g)[1].toLowerCase()[0]}});
      let time = 0;
      // Add proper number of milliseconds to time based on modifier
      args.filter(a => a.modifier === "w").forEach(a => time += a.number * 3600000 * 24 * 7); // week
      args.filter(a => a.modifier === "d").forEach(a => time += a.number * 3600000 * 24); // day
      args.filter(a => a.modifier === "h").forEach(a => time += a.number * 3600000); // hour
      args.filter(a => a.modifier === "m").forEach(a => time += a.number * 60000); // minute
      args.filter(a => a.modifier === "s").forEach(a => time += a.number * 1000); // second
      if (time <= 0) return undefined
      else return time;
    } catch(err) {
      console.log(err.stack);
      return undefined;
    }
  }
  
  /* GET GUILD SETTINGS */
  client.getGuildSettings = async (guild) => {
    const defaults = client.config.defaultSettings;
    const overrides = await keyv.get(guild.id).catch(err => {}) || {};
    const settings = {};
    for (const key in defaults) {
      // Add missing keys, apply guild-specific settings
      settings[key] = overrides[key] || defaults[key];
    }
    return settings;
  }
  
  /*
  PERMISSION LEVEL FUNCTION

  This is a very basic permission system for commands which uses "levels"
  "spaces" are intentionally left black so you can add them if you want.
  NEVER GIVE ANYONE BUT OWNER THE LEVEL 10! By default this can run any
  command including the VERY DANGEROUS `eval` and `exec` commands!

  */
  client.permlevel = message => {
    let permlvl = 0;
    
    // Sort permission levels in ascending order
    const permOrder = client.config.permLevels.slice(0).sort((p, c) => p.level < c.level ? 1 : -1);

    while (permOrder.length) {
      const currentLevel = permOrder.shift();
      if (message.guild && currentLevel.guildOnly) continue;
      if (currentLevel.check(message)) {
        permlvl = currentLevel.level;
        break;
      }
    }
    return permlvl;
  };
  
  /* SORT ALPHABETICALLY */
  client.sortFunction = (a, b) => {
    var A = a.toLowerCase();
    var B = b.toLowerCase();
    if (A > B) return 1;
    if (A < B) return -1;
    if (A === B) return 0;
  };

  /* TIMESTAMP PARSED TO COORDINATED UNIVERSAL TIME STRING */
  client.toUTC = (timestamp) => {
      return new Date(timestamp).toLocaleDateString("en-US", {
          hourCycle: "h12",
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          timeZoneName: "short"
      })
  }
  
  /* SEARCH THROUGH BANS */
  client.searchBans = async (message, args) => {
    // Filter bans based on search query
    const results = (await message.guild.fetchBans()).filter(b => b.user.id === args[0] || (b.username === args.join(" ").split("#")[0] && b.discriminator === args.join(" ").split("#")[1].slice(0, 4)) || b.user.username.toLowerCase().includes(args[0].toLowerCase())).array();
    // End if there were no search results
    if (results.length === 0) {
      message.reply("Could not find any banned users matching your search.");
      return null;
    }
    // Create selection if more than one result was returned
    if (results.length > 1) {
      let options = "";
      for (var i = 0; i < results.length; i++) {
        options += `${i + 1}. ${results[i].user.username}\n`;
      };
      let prompt = `<@${message.author.id}>, I found more than one banned user that matches your query. Please say the number corresponding to the person you would like to unban, or 'cancel' to end the command. The command will automatically timeout after 1 minute.\`\`\`\n${options}\`\`\``;
      if (prompt.length > 2000) {
        message.reply("Your search returned too many results. Try being more specific.");
        return null;
      }
      const sent = await message.channel.send(prompt);
      try {
        const collected = message.channel.awaitMessages(m => m.author.id === message.author.id && (parseInt(m.content) || m.content.toLowerCase() === "cancel"), {
          max: 1,
          time: 60000,
          errors: ["time"]
        });
        const response = collected.first();
        if (response.content.toLowerCase() === "cancel") {
          response.react("👍");
          sent.delete();
          return null;
        } else return results[parseInt(response.content) - 1];
      } catch (err) {
        message.reply("You took too long to respond.");
        return null;
      }
    }
    // Return result if there is only 1
    if (results.length === 1) return results[0];
  }
  
  /* FILTER MAP() CLASS OBJECT */
  client.filterCollection = (collection, bool) => {
    const filtered = new Map();
    collection.forEach((val, key, map) => {
      console.log(key)
      if (!!bool(val)) filtered.set(key, val);
    });
    return filtered;
  }
  
  /* MISCELANEOUS NON-CRITICAL FUNCTIONS */

  // EXTENDING NATIVE TYPES IS BAD PRACTICE. Why? Because if JavaScript adds this
  // later, this conflicts with native code. Also, if some other lib you use does
  // this, a conflict also occurs. KNOWING THIS however, the following 2 methods
  // are, we feel, very useful in code. 

  // <String>.toPropercase() returns a proper-cased string such as: 
  // "Mary had a little lamb".toProperCase() returns "Mary Had A Little Lamb"
  String.prototype.toProperCase = function() {
    return this.replace(/([^\W_]+[^\s-]*) */g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  // <Array>.random() returns a single random element from an array
  // [1, 2, 3, 4, 5].random() can return 1, 2, 3, 4 or 5.
  Array.prototype.random = function() {
    return this[Math.floor(Math.random() * this.length)];
  };
  
};