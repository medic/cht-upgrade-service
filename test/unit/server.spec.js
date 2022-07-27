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

  describe('update', () => {
    it('should respond with 400 when no body', () => {
      server.__get__('update')(req, res);
      expect(res.status.args).to.deep.equal([[400]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'Invalid payload.' }]]);
    });

    it('should respond with 400 when no docker-compose property in body', () => {
      req.body = { some: 'random', stuff: 2 };
      server.__get__('update')(req, res);
      expect(res.status.args).to.deep.equal([[400]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'Invalid payload.' }]]);
    });

    it('should respond with 400 when no docker-compose list', () => {
      req.body = { some: 'random', stuff: 2, dockerCompose: { } };
      server.__get__('update')(req, res);
      expect(res.status.args).to.deep.equal([[400]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'Invalid payload.' }]]);
    });

    it('should respond with 500 when update fails', async () => {
      req.body = {
        docker_compose: {
          one: 'docker 1',
          two: 'docker 2',
        },
      };
      sinon.stub(containers, 'update');
      containers.update.onCall(1).rejects({ message: 'booom' });

      await server.__get__('update')(req, res);

      expect(containers.update.callCount).to.equal(2);
      expect(containers.update.args[0]).to.deep.equal(['one', 'docker 1', false]);
      expect(containers.update.args[1]).to.deep.equal(['two', 'docker 2', false]);

      expect(res.status.args).to.deep.equal([[500]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'booom' }]]);
    });

    it('should respond with 500 when startup fails', async () => {
      req.body = {
        docker_compose: {
          one: 'docker 1',
          two: 'docker 2',
        },
      };
      sinon.stub(containers, 'update').resolves();
      sinon.stub(containers, 'startUp').rejects({ message: 'booom' });

      await server.__get__('update')(req, res);

      expect(containers.update.callCount).to.equal(2);
      expect(containers.update.args[0]).to.deep.equal(['one', 'docker 1', false]);
      expect(containers.update.args[1]).to.deep.equal(['two', 'docker 2', false]);

      expect(res.status.args).to.deep.equal([[500]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'booom' }]]);
    });

    it('should forward the whole error if no message', async () => {
      req.body = {
        docker_compose: {
          one: 'docker 1',
        },
      };
      sinon.stub(containers, 'update');
      containers.update.rejects(new Error('omg this is a string'));

      await server.__get__('update')(req, res);

      expect(containers.update.callCount).to.equal(1);
      expect(containers.update.args[0]).to.deep.equal(['one', 'docker 1', false]);

      expect(res.status.args).to.deep.equal([[500]]);
      expect(res.json.args).to.deep.equal([[{ error: true, reason: 'omg this is a string' }]]);
    });

    it('should try to update multiple docker-compose files', async () => {
      req.body = {
        docker_compose: {
          'docker-compose.cht.yml': 'contents 1',
          'something-something': 'contents 2',
          'rapidpro?': 'contents 3',
        },
      };
      sinon.stub(containers, 'update').resolves(true);
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('update')(req, res);

      expect(containers.update.callCount).to.equal(3);
      expect(containers.update.args[0]).to.deep.equal(['docker-compose.cht.yml', 'contents 1', false]);
      expect(containers.update.args[1]).to.deep.equal(['something-something', 'contents 2', false]);
      expect(containers.update.args[2]).to.deep.equal(['rapidpro?', 'contents 3', false]);
      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{
        'docker-compose.cht.yml': { ok: true },
        'something-something': { ok: true },
        'rapidpro?': { ok: true },
      }]);
    });

    it('should try to update multiple docker-compose files when some do not exist', async () => {
      req.body = {
        docker_compose: {
          'docker-compose.cht.yml': 'contents 1',
          'something-something': 'contents 2',
          'rapidpro?': 'contents 3',
        },
      };
      sinon.stub(containers, 'update').resolves(true);
      containers.update.onCall(1).resolves(false);
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('update')(req, res);

      expect(containers.update.callCount).to.equal(3);
      expect(containers.update.args[0]).to.deep.equal(['docker-compose.cht.yml', 'contents 1', false]);
      expect(containers.update.args[1]).to.deep.equal(['something-something', 'contents 2', false]);
      expect(containers.update.args[2]).to.deep.equal(['rapidpro?', 'contents 3', false]);
      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{
        'docker-compose.cht.yml': { ok: true },
        'something-something': { ok: false, reason: `Existing installation not found. Use '/install' API to install.` },
        'rapidpro?': { ok: true },
      }]);
    });

    it('should try to update single docker-compose file', async () => {
      req.body = {
        docker_compose: {
          'cht-compose.yml': 'the contents',
        },
      };
      sinon.stub(containers, 'update').resolves(true);
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('update')(req, res);

      expect(containers.update.callCount).to.equal(1);
      expect(containers.update.args[0]).to.deep.equal(['cht-compose.yml', 'the contents', false]);
      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{
        'cht-compose.yml': { ok: true },
      }]);
    });

    it('should respond with false with file was not updated', async () => {
      req.body = {
        docker_compose: {
          'cht-compose.yml': 'the contents',
        },
      };
      sinon.stub(containers, 'update').resolves(false);
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('update')(req, res);

      expect(containers.update.callCount).to.equal(1);
      expect(containers.update.args[0]).to.deep.equal(['cht-compose.yml', 'the contents', false]);
      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{
        'cht-compose.yml': { ok: false, reason: `Existing installation not found. Use '/install' API to install.` },
      }]);
    });

    it('should install new containers when requested', async () => {
      req.body = {
        docker_compose: {
          'cht-compose.yml': 'the contents',
        },
      };
      sinon.stub(containers, 'update').resolves(true);
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('update')(req, res, true);

      expect(containers.update.callCount).to.equal(1);
      expect(containers.update.args[0]).to.deep.equal(['cht-compose.yml', 'the contents', true]);
      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{
        'cht-compose.yml': { ok: true },
      }]);
    });

    it('should respond with false with file was not installed', async () => {
      req.body = {
        docker_compose: {
          'cht-compose.yml': 'the contents',
        },
      };
      sinon.stub(containers, 'update').resolves(false);
      sinon.stub(containers, 'startUp').resolves();

      await server.__get__('update')(req, res, true);

      expect(containers.update.callCount).to.equal(1);
      expect(containers.update.args[0]).to.deep.equal(['cht-compose.yml', 'the contents', true]);
      expect(containers.startUp.callCount).to.equal(1);

      expect(res.status.callCount).to.equal(0);
      expect(res.json.callCount).to.equal(1);
      expect(res.json.args[0]).to.deep.equal([{
        'cht-compose.yml': { ok: false, reason: `Existing installation found. Use '/upgrade' API to upgrade.` },
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
