const childProcess = require('child_process');
const dockerComposeCli = require('../../src/docker-compose-cli');

describe('docker-compose cli', () => {
  let process;

  beforeEach(() => {
    process = { };
    sinon.stub(childProcess, 'spawn').returns(process);
    process.events = {};
    process.stdout = {
      on: sinon.stub().callsFake((data, cb) => process.stdoutCb = cb),
    };
    process.stderr = {
      on: sinon.stub().callsFake((data, cb) => process.stderrCb = cb),
    };
    process.on = sinon.stub().callsFake((event, cb) => process.events[event] = cb);
  });

  describe('validate', () => {
    it('should return true when valid', async () => {
      const filename = 'docker-compose.yml';

      const result = dockerComposeCli.validate(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-f', filename, '-p', filename, 'config' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.events.exit(0); // exit code 0

      expect(await result).to.equal(true);
    });

    it('should return false when invalid', async () => {
      const filename = 'docker.yml';

      const result = dockerComposeCli.validate(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-f', filename, '-p', filename, 'config' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.events.exit(14); // exit code 14

      expect(await result).to.equal(false);
    });

    it('should return false when error is thrown', async () => {
      const filename = 'filename.yml';

      const result = dockerComposeCli.validate(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-f', filename, '-p', filename, 'config' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.events.error({ some: 'error' });

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
        [ '-f', filename, '-p', filename, 'up', '-d', '--remove-orphans' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.stdoutCb('a');
      process.stdoutCb('b');
      process.events.exit(0);

      await result;

      expect(console.log.calledWith('a')).to.equal(true);
      expect(console.log.calledWith('b')).to.equal(true);
    });

    it('should reject on error', async () => {
      const filename = 'path/to/filename.yml';
      const result = dockerComposeCli.up(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-f', filename, '-p', filename, 'up', '-d', '--remove-orphans' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.events.error({ an: 'error' });
      await expect(result).to.be.rejectedWith({ an: 'error' });
    });

    it('should reject on non-zero response code ', async () => {
      const filename = 'path/to/filename.yml';
      const result = dockerComposeCli.up(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-f', filename, '-p', filename, 'up', '-d', '--remove-orphans' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.stderrCb('error1');
      process.stderrCb('error2');

      process.events.exit(321);
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
        [ '-f', filename, '-p', filename, 'pull' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.stdoutCb('logging');
      process.stdoutCb('things');
      process.events.exit(0);

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
        [ '-f', filename, '-p', filename, 'pull' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.events.error({ error: 'boom' });
      await expect(result).to.be.rejectedWith({ error: 'boom' });
    });

    it('should reject on non-zero response code ', async () => {
      const filename = 'path/to/filename.yml';
      const result = dockerComposeCli.up(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      expect(childProcess.spawn.args[0]).to.deep.equal([
        'docker-compose',
        [ '-f', filename, '-p', filename, 'up', '-d', '--remove-orphans' ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);
      expect(process.events).to.have.keys(['error', 'exit']);
      process.stderrCb('errors');
      process.stderrCb('happen');

      process.events.exit(321);
      await expect(result).to.be.rejectedWith('errorshappen');
    });
  });
});
