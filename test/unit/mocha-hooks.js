const sinon = require('sinon');
const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.config.truncateThreshold = 0;

global.sinon = sinon;
global.expect = chai.expect;

module.exports = {
  mochaHooks: {
    beforeEach: () => {
      process.env.CHT_BACKUP_COMPOSE_FILES = 'false';
    },
    afterEach: () => {
      sinon.restore();
    },
  }
};
