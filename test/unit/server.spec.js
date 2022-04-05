const rewire = require('rewire');

const containers = require('../../src/containers');
let server;

describe('server', () => {
  let res;
  let req;

  beforeEach(() => {
    res = {
      json: sinon.stub(),
      status: sinon.stub(),
    };
    res.status.returns(res);
    req = {};

    server = rewire('../../src/server');
  });

  describe('status', () => {
    it('should just return true', () => {
      server.__get__('status')(req, res);
      expect(res.json.args).to.deep.equal([[{ ok: true }]]);
    });
  });

  describe('upgrade', () => {
    it('should respond with 400 when no body', () => {
      server.__get__('upgrade')(req, res);
      expect(res.status.args).to.deep.equal([[400]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'Invalid payload.' }]]);
    });

    it('should respond with 400 when no docker-compose property in body', () => {
      req.body = { some: 'random', stuff: 2 };
      server.__get__('upgrade')(req, res);
      expect(res.status.args).to.deep.equal([[400]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'Invalid payload.' }]]);
    });

    it('should respond with 400 when no docker-compose list', () => {
      req.body = { some: 'random', stuff: 2, 'docker-compose': { } };
      server.__get__('upgrade')(req, res);
      expect(res.status.args).to.deep.equal([[400]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'Invalid payload.' }]]);
    });

    it('should respond with 500 when upgrade fails', async () => {
      req.body = {
        'docker-compose': {
          one: 'docker 1',
          two: 'docker 2',
        },
      };
      sinon.stub(containers, 'upgrade');
      containers.upgrade.onCall(1).rejects({ message: 'booom' });

      await server.__get__('upgrade')(req, res);

      expect(containers.upgrade.callCount).to.equal(2);
      expect(containers.upgrade.args[0]).to.deep.equal(['one', 'docker 1']);
      expect(containers.upgrade.args[1]).to.deep.equal(['two', 'docker 2']);

      expect(res.status.args).to.deep.equal([[500]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'booom' }]]);
    });

    it('should respond with 500 when startup fails', async () => {
      req.body = {
        'docker-compose': {
          one: 'docker 1',
          two: 'docker 2',
        },
      };
      sinon.stub(containers, 'upgrade').resolves();
      sinon.stub(containers, 'startUp').rejects({ message: 'booom' });

      await server.__get__('upgrade')(req, res);

      expect(containers.upgrade.callCount).to.equal(2);
      expect(containers.upgrade.args[0]).to.deep.equal(['one', 'docker 1']);
      expect(containers.upgrade.args[1]).to.deep.equal(['two', 'docker 2']);

      expect(res.status.args).to.deep.equal([[500]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'booom' }]]);
    });

    it('should forward the whole error if no message', async () => {
      req.body = {
        'docker-compose': {
          one: 'docker 1',
        },
      };
      sinon.stub(containers, 'upgrade');
      containers.upgrade.rejects(new Error('omg this is a string'));

      await server.__get__('upgrade')(req, res);

      expect(containers.upgrade.callCount).to.equal(1);
      expect(containers.upgrade.args[0]).to.deep.equal(['one', 'docker 1']);

      expect(res.status.args).to.deep.equal([[500]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'omg this is a string' }]]);
    });

    it('should try to upgrade multiple docker-compose files', async () => {
      req.body = {
        'docker-compose': {
          'docker-compose.cht.yml': 'contents 1',
          'something-something': 'contents 2',
          'rapidpro?': 'contents 3',
        },
      };
      sinon.stub(containers, 'upgrade').resolves();
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('upgrade')(req, res);

      expect(containers.upgrade.callCount).to.equal(3);
      expect(containers.upgrade.args[0]).to.deep.equal(['docker-compose.cht.yml', 'contents 1']);
      expect(containers.upgrade.args[1]).to.deep.equal(['something-something', 'contents 2']);
      expect(containers.upgrade.args[2]).to.deep.equal(['rapidpro?', 'contents 3']);
      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{
        'docker-compose.cht.yml': { ok: true },
        'something-something': { ok: true },
        'rapidpro?': { ok: true },
      }]);
    });

    it('should try to upgrade single docker-compose file', async () => {
      req.body = {
        'docker-compose': {
          'cht-compose.yml': 'the contents',
        },
      };
      sinon.stub(containers, 'upgrade').resolves();
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('upgrade')(req, res);

      expect(containers.upgrade.callCount).to.equal(1);
      expect(containers.upgrade.args[0]).to.deep.equal(['cht-compose.yml', 'the contents']);
      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{
        'cht-compose.yml': { ok: true },
      }]);
    });
  });

  describe('start', () => {
    it('should start up containers', async () => {
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('start')(req, res);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{ ok: true }]);
      expect(containers.startUp.callCount).to.equal(1);
    });

    it('should return error if startup fails', async () => {
      sinon.stub(containers, 'startUp').rejects({ message: 'a reason' });

      await server.__get__('start')(req, res);

      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.args).to.deep.equal([[500]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'a reason' }]]);

    });

    it('should return error if startup fails with an error', async () => {
      sinon.stub(containers, 'startUp').rejects(new Error('reason is a string'));

      await server.__get__('start')(req, res);

      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.args).to.deep.equal([[500]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'reason is a string' }]]);
    });
  });

  describe('listen', () => {
    it('should start listening', () => {
      const app = { listen: sinon.stub() };
      server.__set__('app', app);

      server.listen();
      expect(app.listen.args).to.deep.equal([[5008]]);
    });
  });
});
