const Discord = require("discord.js");
const client = new Discord.Client();
const fs = require("fs");
const {promisify} = require("util");
const readdir = promisify(require("fs").readdir);
const sqlite3 = require("better-sqlite3");
const db = sqlite3("./data/database.db", {verbose: console.log});

// Create reports table if it doesn't already exist
try{
    db.prepare("CREATE TABLE IF NOT EXISTS reports (reportID INTEGER PRIMARY KEY, reportedUsername STRING, updatedUsername STRING, robloxID STRING, reason STRING, reporterID STRING, time INTEGER)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS robloxbans (banID INTEGER PRIMARY KEY, robloxID STRING, username STRING, moderator STRING, reason STRING, time INTEGER, unban INTEGER, reminderSent INTEGER)").run()
} catch(err) {
  console.log(err.stack);
}

// Load miscellaneous functions into the client
require("./data/functions.js")(client);

// Load the config
client.config = require("./data/config.js");

// Load settings from JSON file
client.settings = JSON.parse(fs.readFileSync("./data/settings.json"));
// Create empty collections for commands and aliases
client.commands = new Map();
client.aliases = new Map();

// Create active reports array
client.activeReports = [];

const init = async () => {
    // Read the commands directory
    const cmdFiles = await readdir("./commands/");
    console.log(`Loading ${cmdFiles.length} commands.`);

    // Load each command
    cmdFiles.forEach(async f => {
        // Only pay attention to js files
        if (!f.endsWith(".js")) return;
        // Load each command
        const response = await client.loadCommand(f);
        if (response) console.log(response);
    });

    //Read the events directory
    const evtFiles = await readdir("./events/");
    console.log(`Loading ${evtFiles.length} events.`)

    // Load events
    evtFiles.forEach(file => {
        const eventName = file.split(".")[0];
        const event = require(`./events/${file}`);
        client.on(eventName, event.bind(null, client));
        // Remove the event from the require cache
        delete require.cache[require.resolve(`./events/${file}`)];
    })

    // Login with the client
    try {
      client.login("á");
    } catch (err) {
      err.stack;
    };
    console.log("Logged in.") 
};

init();

client.on('debug', console.log);