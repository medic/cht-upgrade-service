const sinon = require('sinon');
const chai = require('chai');
chai.use(require('chai-as-promised'));

global.sinon = sinon;
global.expect = chai.expect;

module.exports = {
  mochaHooks: {
    afterEach: () => {
      sinon.restore();
    },
  }
};
