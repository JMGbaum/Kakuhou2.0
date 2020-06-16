exports.run = async (client, message, args, level) => {
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
    client.logs[message.id] = {reason: "Censored"};
    return message.delete({reason: "Censored"});
  };
}

exports.config = {
  enabled: false,
  guildOnly: false,
  aliases: [],
  permLevel: "Bot Owner"
}

exports.help = {
  name: "test",
  category: "Miscellaneous",
  description: "Testing new commands.",
  usage: "test (<args>)",
  flags: {}
}