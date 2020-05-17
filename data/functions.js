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
};