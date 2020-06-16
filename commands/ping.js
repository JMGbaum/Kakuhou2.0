exports.run = async (client, message, args, level) => {// eslint-disable-line no-unused-vars
  const now = Date.now();
  const msg = await message.channel.send("Pinging...");
  msg.edit(`🏓 Pong!\nLatency: ${msg.createdTimestamp - message.createdTimestamp}ms\nAPI Latency: ${now - message.createdTimestamp}ms`);
};

exports.config = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User"
};

exports.help = {
  name: "ping",
  category: "System",
  description: "Pong!",
  usage: "ping",
  flags: {}
};