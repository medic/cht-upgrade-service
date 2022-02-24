const server = require('./server');
const containers = require('./containers');

containers.startUp();
server.listen();
