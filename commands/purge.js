exports.run = async (client, message, args, level) => {
  try {
    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.guild.members.cache.get(/(?<=\<\@)\d+(?=\>)/g.exec(message.content)[0]) || null;
    const amount =  parseInt(args[0]);
    if (!amount && !member) return message.reply("Must specify a user and amount, or just an amount, of messages to purge!");
    if (!amount) return message.reply("Must specify an amount to delete!");
    if (amount === 1) return message.reply("The number of messages to purge must be greater than 1.");
    if (amount > 100) return message.reply("The number of messages to purge cannot exceed 100.")
    
    let messages = (await message.channel.messages.fetch({limit: 100})).array();
    
    if (member) messages = messages.filter(m => m.author.id === member.id);
    
    messages = messages.slice(0, amount);
    
    message.channel.bulkDelete(messages).catch(error => {
      console.log(error.stack);
      message.reply("There was an error while running your command.");
    });
    
  } catch (err) {
    console.log(err.stack);
    message.react("❌").catch(err => console.log(err.stack));
  }
};

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: ["prune"],
  permLevel: "Moderator"
};

exports.help = {
  name: "purge",
  category: "Moderation",
  description: "Delete multiple messages at once.",
  usage: "purge <number> (<@user> || <user ID>)",
  flags: {}
};