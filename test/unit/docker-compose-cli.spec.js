const childProcess = require('child_process');
const dockerComposeCli = require('../../src/docker-compose-cli');

let clock;

describe('docker-compose cli', () => {
  let spawnedProcess;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    spawnedProcess = { };
    sinon.stub(childProcess, 'spawn').returns(spawnedProcess);
    spawnedProcess.events = {};
    spawnedProcess.stdout = {
      on: sinon.stub().callsFake((data, cb) => spawnedProcess.stdoutCb = cb),
    };
    spawnedProcess.stderr = {
      on: sinon.stub().callsFake((data, cb) => spawnedProcess.stderrCb = cb),
    };
    spawnedProcess.on = sinon.stub().callsFake((event, cb) => spawnedProcess.events[event] = cb);
    process.env = { CHT_COMPOSE_PROJECT_NAME: 'cht' };
  });

  afterEach(() => {
    clock.restore();
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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.events.exit(0); // exit code 0

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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.events.exit(14); // exit code 14

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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.events.error({ some: 'error' });

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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.stdoutCb('a');
      spawnedProcess.stdoutCb('b');
      spawnedProcess.events.exit(0);

      await result;

      expect(console.log.calledWith('a')).to.equal(true);
      expect(console.log.calledWith('b')).to.equal(true);
    });

    it('should up multiple files at once', async () => {
      sinon.spy(console, 'log');
      process.env.CHT_COMPOSE_PROJECT_NAME = 'somerandomname';

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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.stdoutCb('thing1');
      spawnedProcess.stdoutCb('thing2');
      spawnedProcess.events.exit(0);

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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.events.error({ an: 'error' });
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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.stderrCb('error1');
      spawnedProcess.stderrCb('error2');

      spawnedProcess.events.exit(321);
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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.stdoutCb('logging');
      spawnedProcess.stdoutCb('things');
      spawnedProcess.events.exit(0);

      await result;

      expect(console.log.calledWith('logging')).to.equal(true);
      expect(console.log.calledWith('things')).to.equal(true);
    });

    // https://docs.aws.amazon.com/AmazonECR/latest/userguide/common-errors.html
    it('should retry on rate exceeded error', async () => {
      const filename = 'path/to/file.yml';
      const result = dockerComposeCli.pull(filename);

      expect(childProcess.spawn.callCount).to.equal(1);
      spawnedProcess.stderrCb('toomanyrequests: Rate exceeded');
      spawnedProcess.events.exit(1);

      await Promise.resolve();
      clock.tick(1000);
      await Promise.resolve();

      expect(childProcess.spawn.callCount).to.equal(2);
      spawnedProcess.stderrCb('toomanyrequests: Rate exceeded');
      spawnedProcess.events.exit(1);

      await Promise.resolve();
      clock.tick(1000);
      await Promise.resolve();

      expect(childProcess.spawn.callCount).to.equal(3);
      spawnedProcess.events.error({ message: 'Unknown: Rate exceeded' });

      await Promise.resolve();
      clock.tick(1000);
      await Promise.resolve();

      expect(childProcess.spawn.callCount).to.equal(4);
      spawnedProcess.events.exit(0);

      await result;
    });

    it('should throw error after 100 rate exceeded retries', async () => {
      const filename = 'path/to/file.yml';
      const result = dockerComposeCli.pull(filename);

      for (let i = 0; i <= 100; i++) {
        expect(childProcess.spawn.callCount).to.equal(i + 1);
        spawnedProcess.stderrCb('toomanyrequests: Rate exceeded');
        spawnedProcess.events.exit(1);

        await Promise.resolve();
        clock.tick(1000);
        await Promise.resolve();
      }
      await expect(result).to.be.rejectedWith('toomanyrequests: Rate exceeded');
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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.events.error({ error: 'boom' });
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
      expect(spawnedProcess.events).to.have.keys(['error', 'exit']);
      spawnedProcess.stderrCb('errors');
      spawnedProcess.stderrCb('happen');

      spawnedProcess.events.exit(321);
      await expect(result).to.be.rejectedWith('errorshappen');
    });
  });
});
