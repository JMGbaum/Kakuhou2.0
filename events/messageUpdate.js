const Discord = require("discord.js");

module.exports = async (client, oldMessage, message) => {
    if (message.author === client.user) return;
    if (message.author.bot) return;
  
    // Grab the settings for this server from Enmap.
    // If there is no guild, get default conf (DMs)
    const settings = message.settings = message.guild ? await client.getGuildSettings(message.guild) : client.config.defaultSettings;
    
    // Get the user or member's permission level from the elevation
    const level = client.permlevel(message);  
  
    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
  
    // Censor
    if (message.guild && level < 2) {
      var censored = message.settings.censors.some(w => client.unemojify(message.content).replace(/[^a-z]/gi, "").includes(w.replace(/[^a-z]/gi, "")));
      var word = message.settings.censors.find(w => client.unemojify(message.content).replace(/[^a-z]/gi, "").includes(w.replace(/[^a-z]/gi, "")));
      var wl = message.settings.whitelist.find(w => client.unemojify(message.content).replace(/[^a-z]/gi, "").includes(w.replace(/[^a-z]/gi, "")));
      var exactCensor = message.settings.exactCensors.find(c => client.unemojify(message.content).replace(/[^a-z\s]/gi, "").replace(/\s+/gi, " ").includes(c));
      var exactPhrase = client.unemojify(message.content).replace(/[^a-z\s]/gi, "").replace(/\s+/gi, " ").includes(exactCensor);
      var exactWord = client.unemojify(message.content).replace(/[^a-z\s]/gi, "").replace(/\s+/gi, " ").split(" ").some(a => exactCensor === a);
      var exactCensored = exactCensor && exactCensor.split(" ").length > 1 ? exactPhrase : exactWord;
      if (censored && !message.settings.exemptRoles.some(r => message.member.roles.cache.find(role => role.name.toLowerCase() === r.toLowerCase())) && !message.author.bot) {
        if (wl && args.some(a => a.concat(args[args.indexOf(a) + 1]).includes(word.toLowerCase().replace(/[^a-z]/gi, "")) && a.concat(args[args.indexOf(a) + 1]).includes(wl.toLowerCase().replace(/[^a-z]/gi, "")))) {} else {
          return message.delete();
        };
      };
      if (exactCensored && !message.settings.exemptRoles.some(r => message.member.roles.cache.find(role => role.name.toLowerCase() === r.toLowerCase())) && !message.author.bot) return message.delete();
      
      // Blacklisted URLs
      if (level < 2 && message.settings.blacklistedURLs.some(url => message.content.toLowerCase().includes(url.toLowerCase()))) {
        message.reply("the URL you included in your message is blacklisted in this Discord.").then(m => m.delete({timeout: 5000}));
        message.delete();
      };
    }
  
    //#general-chat
    if (message.guild && level < 2 && message.channel.id === "439037987964190721" && message.content.match(/https?\:\/\/\w\w*\.\w\w*/g)) {
      return message.reply("please do not post links in this channel.").then(m => {
        message.delete();
        m.delete({timeout: 5000});
      });
    }
    
    //#final_submissions
    if (message.channel.id === "491753499659337758" && level < 2 && message.guild.roles.cache.find(r => r.name.toLowerCase() === "participant")) {
      if (message.attachments.size < 1 && !message.member.roles.cache.find(r => r.name.toLowerCase() === "staff")) return message.delete();
      return message.member.roles.add(message.guild.roles.cache.find(r => r.name.toLowerCase() === "participant"));
    };
    
    // Remove invites to other discords
    const inviteLink = /(?:https?:\/\/)?(?:www\.)?discord(?:\.gg|(?:app)?\.com\/invite)\/(\S+)/g.exec(message.content);
    if (message.guild && !!inviteLink && level < 2) {
      const invite = await client.fetchInvite(inviteLink);
      if (invite.guild.id !== message.guild.id) {
        const advertisementEmbed = new Discord.MessageEmbed().setColor("ff0000").setAuthor(message.author.tag, message.author.displayAvatarURL).addField(`Sent the following Discord invite link to "${invite.guild.name}" in #${message.channel.name}`, invite.url).setFooter(`User ID: ${message.author.id}`);
        message.reply("Please do not advertise other Discords.").then(m => m.delete({timeout: 10000}));
        message.guild.channels.get("480439443786825748").send(advertisementEmbed);
        return message.delete();
      };
    }
    
    // Delete shortened URLs because we don't want people posting shady things :)
    if (message.guild && level < 2 && ["bit.ly/", "goo.gl/", "owl.ly/", "deck.ly/", "bit.do/", "lnk.co/", "fur.ly/", "moourl.com/", "tinyurl.com/", "adf.ly/"].some(url => message.content.toLowerCase().includes(url))) {
      message.reply("please do not post shortened URLs. Use direct URLs only.").then(m => {
        message.delete();
        m.delete({timeout: 8000});
      });
    }
}