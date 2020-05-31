/*
The HELP command is used to display every command's name and description
to the user, so that he may see what commands are available. The help
command is also filtered by level, so if a user does not have access to
a command, it is not shown to them. If a command name is given with the
help command, its extended help is shown.
*/
exports.run = (client, message, args, level) => {
  // If no specific command is called, show all filtered commands.
  if (!args[0]) {
    // Filter all commands by which are available for the user's level, using the <Collection>.filter() method.
    const myCommands = message.guild ? client.filterCollection(client.commands, cmd => client.levelCache[cmd.config.permLevel] <= level) : client.filterCollection(client.commands, cmd => client.levelCache[cmd.config.permLevel] <= level && cmd.config.guildOnly !== true);

    // Here we have to get the command names only, and we use that array to get the longest name.
    // This makes the help commands "aligned" in the output.
    const commandNames = Array.from(myCommands.keys());
    const longest = commandNames.reduce((long, str) => Math.max(long, str.length), 0);

    let currentCategory = "";
    let output = `= Command List =\n\n[Use ${message.settings.prefix}help <commandname> for details]\n`;
    const sorted = Array.from(myCommands).map(arr => arr[1]).sort((p, c) => p.help.category > c.help.category ? 1 : p.help.name > c.help.name && p.help.category === c.help.category ? 1 : -1);
    sorted.forEach(c => {
      const cat = c.help.category.toProperCase();
      if (currentCategory !== cat) {
        output += `\u200b\n== ${cat} ==\n`;
        currentCategory = cat;
      }
      output += `${message.settings.prefix}${c.help.name}${" ".repeat(longest - c.help.name.length)} :: ${c.help.description}\n`;
    });
    
    let response = "Check your messages!"
    message.author.send(output, {
      code: "asciidoc",
      split: {
        char: "\u200b"
      }
    }).catch(err => {
      response = "I was unable to send you a private message. Please check your direct message settings.";
    });
    message.reply(response);
  } else {
    // Show individual command's help.
    let command = args[0];
    if (client.commands.has(command) || client.aliases.has(command)) {
      command = client.commands.get(command) || client.commands.get(client.aliases.get(command));
      if (level < client.levelCache[command.config.permLevel]) return;
      // Set up aliases
      const aliasHelp = command.config.aliases.length ? `\n\n## Aliases ##\n${command.config.aliases.join(", ")}` : "";
      // Set up flags
      let flagsHelp = "";
      if (Object.keys(command.help.flags).length) {
        flagsHelp += "\n\n## Flags ##";
        for (var flag in command.help.flags) {
          flagsHelp += `\n\n* ${flag}\n[ Value Type ][ ${command.help.flags[flag].value} ];\n> ${command.help.flags[flag].description}`;
        };
      };
      // Create full help menu
      let helpText = `${command.help.name.toUpperCase()}\n${"=".repeat(command.help.name.length)}\n${command.help.description}\n\n## Usage ##\n${command.help.usage}${aliasHelp}${flagsHelp}`
      message.channel.send(helpText, {
        code: "md"
      });
    }
  }
};

exports.config = {
  enabled: true,
  guildOnly: false,
  aliases: ["h", "halp"],
  permLevel: "User"
};

exports.help = {
  name: "help",
  category: "System",
  description: "Displays all the available commands for your permission level.",
  usage: "help [command]",
  flags: {}
};