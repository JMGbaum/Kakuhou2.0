const Keyv = require('keyv');
const keyv = new Keyv('sqlite://./data/database.db', {
  table: 'settings'
});
const { inspect } = require("util");

exports.run = async (client, message, [action, key, ...value], level) => {
  // Load the guild settings (merged) and just the overrides
  const settings = message.settings;
  let overrides = await keyv.get(message.guild.id) || {};
  
  // If no action is supplied, just display the settings
  if (!action) return message.channel.send(inspect(settings), {code: "json"});
  
  switch(action.toLowerCase()) {
    case "view": {
      // Check for specified setting
      if (!key) return message.channel.send(inspect(settings), {code: "json"});
      // Make sure the setting exists
      if (!value) return message.reply(`${key} is not a valid setting.`);
      
      // Send value
      message.channel.send(`The value of ${key} is \`${settings[key]}\`.`);
      return;
    }
    
    // Edit a single-value setting
    case "edit" || "set": {
      // Check for specified setting
      if (!key) return message.reply("You must specify a setting to change!");
      // Make sure the setting exists
      if (!settings[key]) return message.reply(`${key} is not a valid setting.`);
      // The user needs to supply the new value
      if (value.length < 1) return message.reply("You need to specify the new value of the setting.");
      // The new value should be different from the old one
      if (value.join(" ") === settings[key]) return message.reply("The setting you specified is already set to that value!");
      
      overrides[key] = value.join(" ");
      break;
    }
    
    // Add a value to an array-type setting
    case "add": {
      // Check for specified setting
      if (!key) return message.reply(`you must specify a setting to add to!`);
      // Make sure the setting exists
      if (!settings[key]) return message.reply(`${key} is not a valid setting.`);
      // Make sure the setting is an array
      if (typeof settings[key] !== "object") return message.reply("This setting can only hold one value. Try using the `edit` action instead.");
      // Make sure a value to add is supplied
      if (value.length < 1) return message.reply("You need to specify the value you are trying to add.");
      
      settings[key].push(value.join(" "));
      overrides[key] = settings[key];
      break;
    }
    
    // Remove a value from an array-type setting
    case "remove": {
      // Check for specified setting
      if (!key) return message.reply("You must specify a setting to remove from!");
      // Make sure the setting exists
      if (!settings[key]) return message.reply(`${key} is not a valid setting.`);
      // Make sure the setting is an array
      if (typeof settings[key] !== "object") return message.reply("You cannot remove values from this setting. Try using the `edit` action instead.");
      // Make sure a value to remove is supplied
      if (value.length < 1) return message.reply("You need to specify the value you are trying to remove.");
      // Make sure the value exists
      const val = settings[key].findIndex(v => v === value.join(" "));
      if (!val) return message.reply(`\`${value.join(" ")}\` is not a value of \`${key}\`.`)
      
      settings[key].splice(val, 1);
      overrides[key] = settings[key];
      break;
    }
    
    // Reset a setting to the default value
    case "reset": {
      // Check for specified setting
      if (!key) return message.reply("You must specify a setting to reset!");
      // Make sure the setting exists
      if (!settings[key]) return message.reply(`${key} is not a valid setting.`);
      // Check if the value is already the default
      if (!overrides[key]) return message.reply("This key does not have an override and is already using defaults.");

      // Good demonstration of the custom awaitReply method in `./modules/functions.js` !
      const awaitMessage = await client.awaitMessage(message, `Are you sure you want to reset ${key} to the default value?`, 60000);
      
      // End if cancelled
      if (awaitMessage.cancelled) return;
      
      // If they respond with y or yes, continue.
      if (["y", "yes"].includes(awaitMessage.response.content.toLowerCase())) {
        // We delete the `key` here.
        delete overrides[key];
      } else
      // If they respond with n or no, we inform them that the action has been cancelled.
      if (["n","no"].includes(awaitMessage.response.content.toLowerCase())) {
        message.reply("Action cancelled.");
      }
      
      break;
    }
      
    default: {
      return message.reply(`\`${action}\` is not a valid action.`)
    }
  }

  // Once the settings is modified, we write it back to the collection
  keyv.set(message.guild.id, overrides);
  
  // Send success message
  message.reply(`setting \`${key}\` successfully modified.`);
}

exports.config = {
  enabled: true,
  guildOnly: true,
  aliases: [],
  permLevel: "Administrator"
}

exports.help = {
  name: "settings",
  category: "System",
  description: "View or change settings for your server.",
  usage: "settings <edit/add/remove/reset/view> <key> (<value>)",
  flags: {}
};