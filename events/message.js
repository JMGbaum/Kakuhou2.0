const fs = require("fs");
// The MESSAGE event runs anytime a message is received
// Note that due to the binding of client to every event, every event
// goes `client, other, args` when this function is run.
module.exports = (client, message) => {
    if (message.author === client.user) return;
  
    // Grab the settings for this server from Enmap.
    // If there is no guild, get default conf (DMs)
    const settings = message.settings = message.guild ? client.settings[message.guild.id] || client.config.defaultSettings : client.config.defaultSettings;
  
  
    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if (message.content.indexOf(settings.prefix) !== 0) return;
    console.log("Command run")

    // Check whether the command, or alias, exist in the collections defined
    // in app.js.
    const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));

    // using this const varName = thing OR otherthign; is a pretty efficient
    // and clean way to grab one of 2 values!
    if (!cmd) return;

    message.flags = [];
    while (args[0] && args[0][0] === "-") {
        message.flags.push(args.shift().slice(1));
    }
    try {
        cmd.run(client, message, args, null);
    } catch (err) {
        message.react("❌").catch(err => console.log(err.stack));
        console.log(err.stack);
    }
}