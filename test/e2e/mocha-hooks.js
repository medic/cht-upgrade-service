const chai = require('chai');
chai.config.truncateThreshold = 0;
chai.use(require('chai-as-promised'));

const utils = require('./utils');

global.expect = chai.expect;

module.exports = {
  mochaHooks: {
    beforeAll: async () => {
      await utils.cleanFolder();

      await utils.runScript('registry.sh');
      await utils.runScript('publish.sh');

      await utils.serviceComposeCommand('up --build -d');
      await utils.serviceComposeCommand('rm -fs');
    },

    beforeEach: async () => {
      utils.setEnv({});
      await utils.cleanFolder();
    },

    afterEach: async function () {
      if (this.currentTest.state === 'failed') {
        await utils.serviceComposeCommand('logs');
      }
      const services = await utils.serviceComposeCommand('ps -q');
      if (services.length) {
        await utils.serviceComposeCommand('rm -fs');
      }

      await utils.testComposeCommand(['one-two.yml', 'three.yml'], 'rm -fs');
    },
  }
};
