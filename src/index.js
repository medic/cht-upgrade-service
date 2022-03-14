const server = require('./server');
const containers = require('./containers');

(async () => {
  server.listen();
  try {
    await containers.startUp();
  } catch (err) {
    console.error('Error while starting containers', err);
  }
})();
