exports.run = async (client, message, args, level) => {
    if (!args || args.length < 1) return message.reply("you need to specify which command you are trying to reload .-.");

    let response = await client.unloadCommand(args[0]);
    if (response) return message.reply(`Error unloading: ${response}`);

    response = await client.loadCommand(args[0]);
    if (response) return message.reply(`Error loading: ${response}`)

    message.reply(`Success! The command \`${args[0]}\` has been reloaded.`);
};

exports.config = {
  enabled: true,
  guildOnly: false,
  aliases: ["rl"],
  permLevel: "Bot Support"
}

exports.help = {
  name: "reload",
  category: "System",
  description: "Reloads a command that\"s been modified.",
  usage: "reload <command>",
  flags: {}
};
