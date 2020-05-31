// init project
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const sqlite3 = require("better-sqlite3");
const db = sqlite3("./data/database.db", {verbose: console.log});

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
app.use(bodyParser.json());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

app.use(express.json({"limit": "10kb"})); // Body limit is 10
const limit = rateLimit({
  max: 500, // Max amount of requests
  windowMs: 1000 * 60, // Minute
  message: "Too many requests" // Message to send
});
app.use("/verify", limit); // Set limiter on specific route

function authorize(request, response, next) {
  if (!request.headers.secret || request.headers.secret !== process.env.AUTHORIZATION) {
    response.sendStatus(401); // Send error if request is not authorized
  }
  else {
    next();
  };
};

// Handle verification requests
app.post("/verify", authorize, (request, response) => {
  if (request.body) {
    if (client.verification[request.body.code]) return response.status(400).send("Code in use."); // If the code is already being used, return an error.
    if (db.prepare(`SELECT count(*) FROM verify WHERE robloxID = '${request.body.userID}'`).get()["count(*)"] > 0) return response.status(400).send("User is already verified."); // If the user is already verified, return an error.
    try {
      client.verification = client.verification.filter(v => v.userID !== request.body.userID); // Remove other codes generated for the same user from the client.
      client.verification[request.body.code] = {userID: request.body.userID, username: request.body.username, inGroup: request.body.inGroup}; // Store the info as an object to be read later when the user runs the 'verify' command.
      response.sendStatus(200); // Respond with success
    } catch(err) {
      console.log(err.stack);
      response.sendStatus(500);
    }
  }
  else {
    response.sendStatus(500);
  };
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

// This will check if the node version you are running is the required
// Node version, if it isn't it will throw the following error to inform
// you.
if (process.version.slice(1).split(".")[0] < 12) throw new Error("Node 12.0.0 or higher is required. Update Node on your system.");

/////////////////////////////////////////////////////////////////////////////////////////////

const Discord = require("discord.js");
const client = new Discord.Client();
const fs = require("fs");
const {promisify} = require("util");
const readdir = promisify(require("fs").readdir);


// Create reports table if it doesn't already exist
try{
    db.prepare("CREATE TABLE IF NOT EXISTS reports (reportID INTEGER PRIMARY KEY, reportedUsername TEXT, updatedUsername TEXT, robloxID TEXT, reason TEXT, reporterID TEXT, time INTEGER)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS robloxbans (banID INTEGER PRIMARY KEY, robloxID TEXT UNIQUE, username TEXT, moderator TEXT, reason TEXT, time INTEGER, unban INTEGER, reminderSent INTEGER)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS verify (discordID TEXT, robloxID TEXT UNIQUE, username TEXT, inGroup INTEGER, active INTEGER)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS bancount (robloxID TEXT UNIQUE, count INTEGER, latest INTEGER)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS mutes (muteID INTEGER PRIMARY KEY, userID TEXT, guildID TEXT, moderator TEXT, reason TEXT, time INTEGER, unmute INTEGER)").run();
    db.prepare("CREATE TABLE IF NOT EXISTS tempbans (banID INTEGER PRIMARY KEY, userID TEXT, guildID TEXT, unban INTEGER)").run();
} catch(err) {
  console.log(err.stack);
}

// Load miscellaneous functions into the client
require("./data/functions.js")(client);

// Load the config
client.config = require("./data/config.js");

// Create empty collections for commands and aliases
client.commands = new Map();
client.aliases = new Map();

// Create active reports array
client.activeReports = [];

// Create active verification codes array
client.verification = [];

// Create unban timeout object
client.rbanReminders = {};

// Create timeout object for mutes and bans
client.timeouts = {
  mutes: {},
  bans: {}
}

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

    // Generate a cache of client permissions for pretty perms
    client.levelCache = {};
    for (let i = 0; i < client.config.permLevels.length; i++) {
      const thisLevel = client.config.permLevels[i];
      client.levelCache[thisLevel.name] = thisLevel.level;
    }
  
    // Login with the client
    client.login(process.env.TOKEN);
    console.log("Logged in.") 
};

init();

// Debug event
// client.on('debug', console.log);
