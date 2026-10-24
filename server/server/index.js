// Forwarder for cloud platforms (Render/Railway) where Root Directory is set to 'server'
// but Start Command is configured as 'node server/index.js'
const serverModule = require('../index.js');

module.exports = serverModule;
