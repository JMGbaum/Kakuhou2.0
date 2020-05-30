// This event executes when a new guild (server) is left.
const Keyv = require('keyv');
const keyv = new Keyv('sqlite://./data/database.db', {
  table: 'settings'
});
module.exports = (client, guild) => {
  // If the settings database contains any guild overrides, remove them.
  // No use keeping stale data!
  if (keyv.get(guild.id)) keyv.delete(guild.id);
};
