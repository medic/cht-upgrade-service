const chai = require('chai');
const utils = require('./utils');
chai.use(require('chai-as-promised'));

global.expect = chai.expect;

module.exports = {
  mochaHooks: {
    beforeAll: async () => {
      await utils.serviceComposeCommand('up --build -d');
      await utils.serviceComposeCommand('down --remove-orphans');
    },

    afterEach: async () => {
      await utils.serviceComposeCommand('down --remove-orphans -t 1');
      await utils.testComposeCommand('one-two.yml', 'down --remove-orphans -t 1');
      await utils.testComposeCommand('three.yml', 'down --remove-orphans -t 1');
    },

  }
};
