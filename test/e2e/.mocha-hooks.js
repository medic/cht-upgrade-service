const chai = require('chai');
chai.config.truncateThreshold = 0;
chai.use(require('chai-as-promised'));

const utils = require('./utils');

global.expect = chai.expect;

module.exports = {
  mochaHooks: {
    beforeAll: async () => {
      await utils.runScript('registry.sh');
      await utils.runScript('publish.sh');

      await utils.serviceComposeCommand('up --build -d');
      await utils.serviceComposeCommand('down --remove-orphans -t 1');
    },

    afterEach: async function () {
      if (this.currentTest.state === 'failed') {
        const logs = await utils.serviceComposeCommand('logs');
        console.log(logs);
      }
      await utils.serviceComposeCommand('down --remove-orphans -t 1');
      await utils.testComposeCommand('one-two.yml', 'down --remove-orphans -t 1');
      await utils.testComposeCommand('three.yml', 'down --remove-orphans -t 1');
    },

  }
};
