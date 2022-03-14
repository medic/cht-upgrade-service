const rewire = require('rewire');

const server = require('../../src/server');
const containers = require('../../src/containers');

describe('index', () => {
  it('start server and containers', () => {
    sinon.stub(server, 'listen');
    sinon.stub(containers, 'startUp');

    rewire('../../src/index');
    expect(server.listen.callCount).to.equal(1);
    expect(containers.startUp.callCount).to.equal(1);
  });

  it('should catch start up errors', async () => {
    sinon.stub(server, 'listen');
    sinon.stub(containers, 'startUp').rejects({ the: 'error' });

    rewire('../../src/index');
    await Promise.resolve();
    expect(server.listen.callCount).to.equal(1);
    expect(containers.startUp.callCount).to.equal(1);
  });
});
