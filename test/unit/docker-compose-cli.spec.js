const childProcess = require('child_process');
const dockerComposeCli = require('../../src/docker-compose-cli');

describe('docker-compose cli', () => {
  let childPprocess;

  beforeEach(() => {
    childPprocess = { };
    sinon.stub(childProcess, 'spawn').returns(childPprocess);
    childPprocess.events = {};
    childPprocess.stdout = {
      on: sinon.stub().callsFake((data, cb) => childPprocess.stdoutCb = cb),
    };
    childPprocess.stderr = {
      on: sinon.stub().callsFake((data, cb) => childPprocess.stderrCb = cb),
    };
    childPprocess.on = sinon.stub().callsFake((event, cb) => childPprocess.events[event] = cb);
    process.env = { COMPOSE_PROJECT_NAME: 'cht' };
  });

  describe('validate', () => {
    it('should return true when valid', async () => {
      const filename = 'docker-compose.yml';

      const result = dockerComposeCli.validate(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht', '-f', filename, 'config' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.events.exit(0); // exit code 0

      expect(await result).to.equal(true);
    });

    it('should return false when invalid', async () => {
      const filename = 'docker.yml';

      const result = dockerComposeCli.validate(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht','-f', filename, 'config' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.events.exit(14); // exit code 14

      expect(await result).to.equal(false);
    });

    it('should return false when error is thrown', async () => {
      const filename = 'filename.yml';

      const result = dockerComposeCli.validate(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht','-f', filename, 'config' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.events.error({ some: 'error' });

      expect(await result).to.equal(false);
    });
  });

  describe('up', () => {
    it('should call docker-compose cli with correct params', async () => {
      const filename = 'path/to/filename.yml';
      sinon.spy(console, 'log');

      const result = dockerComposeCli.up(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht', '-f', filename, 'up', '-d', '--remove-orphans' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.stdoutCb('a');
      childPprocess.stdoutCb('b');
      childPprocess.events.exit(0);

      await result;

      expect(console.log.calledWith('a')).to.equal(true);
      expect(console.log.calledWith('b')).to.equal(true);
    });

    it('should up multiple files at once', async () => {
      sinon.spy(console, 'log');
      process.env.COMPOSE_PROJECT_NAME = 'somerandomname';

      const result = dockerComposeCli.up(['path/to/file1.yml', 'path/to/file2.yml', 'path/to/file3.yml']);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [
          '-p', 'somerandomname',
          '-f', 'path/to/file1.yml',
          '-f', 'path/to/file2.yml',
          '-f', 'path/to/file3.yml',
          'up', '-d', '--remove-orphans',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.stdoutCb('thing1');
      childPprocess.stdoutCb('thing2');
      childPprocess.events.exit(0);

      await result;

      expect(console.log.calledWith('thing1')).to.equal(true);
      expect(console.log.calledWith('thing2')).to.equal(true);
    });

    it('should reject on error', async () => {
      const filename = 'path/to/filename.yml';
      const result = dockerComposeCli.up(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht', '-f', filename, 'up', '-d', '--remove-orphans' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.events.error({ an: 'error' });
      await expect(result).to.be.rejected.and.eventually.deep.equal({ an: 'error' });
    });

    it('should reject on non-zero response code ', async () => {
      const filename = 'path/to/filename.yml';
      const result = dockerComposeCli.up(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht', '-f', filename, 'up', '-d', '--remove-orphans' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.stderrCb('error1');
      childPprocess.stderrCb('error2');

      childPprocess.events.exit(321);
      await expect(result).to.be.rejectedWith('error1error2');
    });
  });

  describe('pull', () => {
    it('should call docker-compose cli with correct params', async () => {
      const filename = 'path/to/file.yml';
      sinon.spy(console, 'log');

      const result = dockerComposeCli.pull(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht', '-f', filename, 'pull' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.stdoutCb('logging');
      childPprocess.stdoutCb('things');
      childPprocess.events.exit(0);

      await result;

      expect(console.log.calledWith('logging')).to.equal(true);
      expect(console.log.calledWith('things')).to.equal(true);
    });

    it('should reject on error', async () => {
      const filename = 'path/to/filename.yml';
      const result = dockerComposeCli.pull(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht', '-f', filename, 'pull' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.events.error({ error: 'boom' });
      await expect(result).to.be.rejected.and.eventually.deep.equal({ error: 'boom' });
    });

    it('should reject on non-zero response code ', async () => {
      const filename = 'path/to/filename.yml';
      const result = dockerComposeCli.up(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-p', 'cht', '-f', filename, 'up', '-d', '--remove-orphans' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(childPprocess.events).to.have.keys(['error', 'exit']);
      childPprocess.stderrCb('errors');
      childPprocess.stderrCb('happen');

      childPprocess.events.exit(321);
      await expect(result).to.be.rejectedWith('errorshappen');
    });
  });
});
