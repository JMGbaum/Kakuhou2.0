const fs = require("fs");
exports.run = async (client, message, args, level) => {
    const guild = message.guild.id;
    // Load the guild settings
    var settings = client.settings[guild];


    // Save updated settings
    fs.writeFileSync("../data/settings.json", JSON.stringify(client.settings))
}

exports.config = {
  aliases: []
}

exports.help = {
  name: "settings"
}