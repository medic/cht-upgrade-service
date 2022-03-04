const fs = require('fs');

const dockerComposeCli = require('../../src/docker-compose-cli');
const containers = require('../../src/containers');

describe('containers lib', () => {
  describe('startup', () => {
    it('should iterate over every mounted docker-compose file and call up', async () => {
      sinon.stub(fs.promises, 'readdir').resolves(['file1', 'file2']);
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      await containers.startUp();

      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0]).to.deep.equal(['/docker-compose']);
      expect(dockerComposeCli.validate.args).to.deep.equal([
        ['/docker-compose/file1'],
        ['/docker-compose/file2'],
      ]);
      expect(dockerComposeCli.up.args).to.deep.equal([
        [['/docker-compose/file1', '/docker-compose/file2']]
      ]);
    });

    it('should skip invalid file configs', async () => {
      sinon.stub(fs.promises, 'readdir').resolves(['file1', 'file2', 'file3']);
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      dockerComposeCli.validate.withArgs('/docker-compose/file2').resolves(false);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      await containers.startUp();

      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0]).to.deep.equal(['/docker-compose']);
      expect(dockerComposeCli.validate.args).to.deep.equal([
        ['/docker-compose/file1'],
        ['/docker-compose/file2'],
        ['/docker-compose/file3'],
      ]);
      expect(dockerComposeCli.up.args).to.deep.equal([
        [['/docker-compose/file1', '/docker-compose/file3']]
      ]);
    });

    it('should work with a single compose file', async () => {
      sinon.stub(fs.promises, 'readdir').resolves(['docker-compose.cht.yml']);
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      await containers.startUp();

      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0]).to.deep.equal(['/docker-compose']);
      expect(dockerComposeCli.validate.args).to.deep.equal([
        ['/docker-compose/docker-compose.cht.yml'],
      ]);
      expect(dockerComposeCli.up.args).to.deep.equal([
        [['/docker-compose/docker-compose.cht.yml']]
      ]);
    });

    it('should throw errors', async () => {
      sinon.stub(fs.promises, 'readdir').resolves(['file1', 'file2']);
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'up').rejects({ the: 'error' });

      await expect(containers.startUp()).to.be.rejectedWith({ the: 'error' });

      expect(dockerComposeCli.validate.args).to.deep.equal([
        ['/docker-compose/file1'],
        ['/docker-compose/file2'],
      ]);
      expect(dockerComposeCli.up.args).to.deep.equal([
        [['/docker-compose/file1', '/docker-compose/file2']],
      ]);
    });
  });

  describe('upgrade', () => {
    it('should validate, overwrite compose file and do a pull', async () => {
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'pull').resolves(true);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      const filename = 'docker-compose.file';
      const contents = 'the contents';

      await containers.upgrade(filename, contents);

      expect(fs.promises.mkdir.args).to.deep.equal([['/temp']]);
      expect(fs.promises.writeFile.callCount).to.deep.equal(2);
      expect(fs.promises.writeFile.args[0]).to.deep.equal(['/temp/temp.yml', contents, 'utf-8']);
      expect(dockerComposeCli.validate.args).to.deep.equal([['/temp/temp.yml']]);
      expect(fs.promises.unlink.args).to.deep.equal([['/temp/temp.yml']]);

      expect(fs.promises.writeFile.args[1]).to.deep.equal([`/docker-compose/${filename}`, contents, 'utf-8']);
      expect(dockerComposeCli.pull.args).to.deep.equal([[`/docker-compose/${filename}`]]);
    });

    it('should work with already exiting temp folder', async () => {
      sinon.stub(fs.promises, 'mkdir').rejects();
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'pull').resolves(true);

      const filename = 'docker.file';
      const contents = 'config';

      await containers.upgrade(filename, contents);

      expect(fs.promises.mkdir.args).to.deep.equal([['/temp']]);
      expect(fs.promises.writeFile.callCount).to.deep.equal(2);
      expect(fs.promises.writeFile.args[0]).to.deep.equal(['/temp/temp.yml', contents, 'utf-8']);
      expect(dockerComposeCli.validate.args).to.deep.equal([['/temp/temp.yml']]);
      expect(fs.promises.unlink.args).to.deep.equal([['/temp/temp.yml']]);

      expect(fs.promises.writeFile.args[1]).to.deep.equal([`/docker-compose/${filename}`, contents, 'utf-8']);
      expect(dockerComposeCli.pull.args).to.deep.equal([[`/docker-compose/${filename}`]]);
    });

    it('should throw error if filename is empty', async () => {
      await expect(containers.upgrade()).to.be.rejectedWith('Invalid docker-compose file name');
    });

    it('should throw error if contents are invalid config', async () => {
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(dockerComposeCli, 'validate').resolves(false);

      const filename = 'docker.file';
      const contents = 'config';

      await expect(containers.upgrade(filename, contents))
        .to.be.rejectedWith(`Invalid docker-compose yml for file ${filename}`);
    });

    it('should throw error if overwrite fails', async () => {
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(fs.promises, 'writeFile').resolves();
      fs.promises.writeFile.onCall(1).rejects({ the: 'error' });
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(dockerComposeCli, 'validate').resolves(false);

      const filename = 'docker.file';
      const contents = 'config';

      await expect(containers.upgrade(filename, contents))
        .to.be.rejectedWith({ the: 'error' });
    });

    it('should throw error if pull fails', async () => {
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'pull').rejects(new Error('an error'));

      const filename = 'docker-compose.file';
      const contents = 'the contents';

      await expect(containers.upgrade(filename, contents))
        .to.be.rejectedWith('an error');

      expect(fs.promises.writeFile.args[1]).to.deep.equal([`/docker-compose/${filename}`, contents, 'utf-8']);
      expect(dockerComposeCli.pull.args).to.deep.equal([[`/docker-compose/${filename}`]]);
    });
  });
});
