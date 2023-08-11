const fs = require('fs');

const dockerComposeCli = require('../../src/docker-compose-cli');
const containers = require('../../src/containers');
const fileUtils = require('./utils/file');

describe('containers lib', () => {
  describe('startup', () => {
    it('should iterate over every mounted docker-compose file and call up', async () => {
      sinon.stub(fs.promises, 'readdir').resolves(fileUtils.fileList('file1', 'file2'));
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      await containers.startUp();

      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0][0]).to.equal('/docker-compose');
      expect(fs.promises.readdir.args[0][1]).to.have.property('withFileTypes', true);
      expect(dockerComposeCli.validate.args).to.deep.equal([
        ['/docker-compose/file1'],
        ['/docker-compose/file2'],
      ]);
      expect(dockerComposeCli.up.args).to.deep.equal([
        [['/docker-compose/file1', '/docker-compose/file2']]
      ]);
    });

    it('should skip invalid file configs', async () => {
      sinon.stub(fs.promises, 'readdir').resolves(fileUtils.fileList('file1', 'file2', 'file3'));
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      dockerComposeCli.validate.withArgs('/docker-compose/file2').resolves(false);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      await containers.startUp();

      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0][0]).to.equal('/docker-compose');
      expect(fs.promises.readdir.args[0][1]).to.have.property('withFileTypes', true);
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
      sinon.stub(fs.promises, 'readdir').resolves(fileUtils.fileList('docker-compose.cht.yml'));
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      await containers.startUp();

      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0][0]).to.equal('/docker-compose');
      expect(fs.promises.readdir.args[0][1]).to.have.property('withFileTypes', true);
      expect(dockerComposeCli.validate.args).to.deep.equal([
        ['/docker-compose/docker-compose.cht.yml'],
      ]);
      expect(dockerComposeCli.up.args).to.deep.equal([
        [['/docker-compose/docker-compose.cht.yml']]
      ]);
    });

    it('should throw errors', async () => {
      sinon.stub(fs.promises, 'readdir').resolves(fileUtils.fileList('file1', 'file2'));
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'up').rejects({ the: 'error' });

      await expect(containers.startUp()).to.be.rejected.and.eventually.deep.equal({ the: 'error' });

      expect(dockerComposeCli.validate.args).to.deep.equal([
        ['/docker-compose/file1'],
        ['/docker-compose/file2'],
      ]);
      expect(dockerComposeCli.up.args).to.deep.equal([
        [['/docker-compose/file1', '/docker-compose/file2']],
      ]);
    });

    it('should not call up when no compose files are found', async () => {
      sinon.stub(fs.promises, 'readdir').resolves([]);
      await containers.startUp();
    });

    it('should not call up when no compose files are valid', async () => {
      sinon.stub(fs.promises, 'readdir').resolves(fileUtils.fileList('file1', 'file2', 'file3'));
      sinon.stub(dockerComposeCli, 'validate').resolves(false);

      await containers.startUp();

      expect(fs.promises.readdir.callCount).to.equal(1);
      expect(fs.promises.readdir.args[0][0]).to.equal('/docker-compose');
      expect(fs.promises.readdir.args[0][1]).to.have.property('withFileTypes', true);
      expect(dockerComposeCli.validate.args).to.deep.equal([
        ['/docker-compose/file1'],
        ['/docker-compose/file2'],
        ['/docker-compose/file3'],
      ]);
    });
  });

  describe('update', () => {
    it('should validate, overwrite compose file and do a pull when installation is not requested', async () => {
      sinon.stub(fs.promises, 'mkdtemp').resolves('/path/to/temp');
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'stat').resolves();
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'pull').resolves(true);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      const filename = 'docker-compose.file';
      const contents = 'the contents';

      const result = await containers.update(filename, contents);
      expect(result).to.equal(true);

      expect(fs.promises.mkdtemp.args).to.deep.equal([['docker-compose']]);
      expect(fs.promises.writeFile.callCount).to.deep.equal(2);
      expect(fs.promises.writeFile.args[0]).to.deep.equal(['/path/to/temp/temp.yml', contents, 'utf-8']);
      expect(dockerComposeCli.validate.args).to.deep.equal([['/path/to/temp/temp.yml']]);
      expect(fs.promises.unlink.args).to.deep.equal([['/path/to/temp/temp.yml']]);
      expect(fs.promises.rmdir.args).to.deep.equal([['/path/to/temp']]);

      expect(fs.promises.writeFile.args[1]).to.deep.equal([`/docker-compose/${filename}`, contents, 'utf-8']);
      expect(dockerComposeCli.pull.args).to.deep.equal([[`/docker-compose/${filename}`]]);
    });

    it('should not create new docker-compose file when installation is not requested', async () => {
      sinon.stub(fs.promises, 'stat').rejects();

      const filename = 'docker-compose.file';
      const contents = 'the contents';

      const result = await containers.update(filename, contents);
      expect(result).to.equal(false);
    });

    it('should create new docker-compose file when installation is requested', async () => {
      sinon.stub(fs.promises, 'mkdtemp').resolves('/path/to/temp');
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'stat').rejects();
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'pull').resolves(true);
      sinon.stub(dockerComposeCli, 'up').resolves(true);

      const filename = 'docker-compose.file';
      const contents = 'the contents';

      const result = await containers.update(filename, contents, true);
      expect(result).to.equal(true);

      expect(fs.promises.mkdtemp.args).to.deep.equal([['docker-compose']]);
      expect(fs.promises.writeFile.callCount).to.deep.equal(2);
      expect(fs.promises.writeFile.args[0]).to.deep.equal(['/path/to/temp/temp.yml', contents, 'utf-8']);
      expect(dockerComposeCli.validate.args).to.deep.equal([['/path/to/temp/temp.yml']]);
      expect(fs.promises.unlink.args).to.deep.equal([['/path/to/temp/temp.yml']]);
      expect(fs.promises.rmdir.args).to.deep.equal([['/path/to/temp']]);

      expect(fs.promises.writeFile.args[1]).to.deep.equal([`/docker-compose/${filename}`, contents, 'utf-8']);
      expect(dockerComposeCli.pull.args).to.deep.equal([[`/docker-compose/${filename}`]]);
    });

    it('should not overwrite existent docker-compose files when installation is requested', async () => {
      sinon.stub(fs.promises, 'stat').resolves();

      const filename = 'docker-compose.file';
      const contents = 'the contents';

      const result = await containers.update(filename, contents, true);
      expect(result).to.equal(false);
    });

    it('should throw error if filename is empty', async () => {
      await expect(containers.update()).to.be.rejectedWith('Invalid docker-compose file name');
    });

    it('should throw error if contents are invalid config', async () => {
      sinon.stub(fs.promises, 'stat').resolves();
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(dockerComposeCli, 'validate').resolves(false);

      const filename = 'docker.file';
      const contents = 'config';

      await expect(containers.update(filename, contents))
        .to.be.rejectedWith(`Invalid docker-compose yml for file ${filename}`);
    });

    it('should throw error if overwrite fails', async () => {
      sinon.stub(fs.promises, 'stat').resolves();
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(fs.promises, 'writeFile').resolves();
      fs.promises.writeFile.onCall(1).rejects({ the: 'error' });
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(dockerComposeCli, 'validate').resolves(false);

      const filename = 'docker.file';
      const contents = 'config';

      await expect(containers.update(filename, contents))
        .to.be.rejectedWith('Invalid docker-compose yml for file docker.file');
    });

    it('should throw error if pull fails', async () => {
      sinon.stub(fs.promises, 'mkdir').resolves();
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(fs.promises, 'stat').resolves();
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'pull').rejects(new Error('an error'));

      const filename = 'docker-compose.file';
      const contents = 'the contents';

      await expect(containers.update(filename, contents)).to.be.rejectedWith('an error');

      expect(fs.promises.writeFile.args[1]).to.deep.equal([`/docker-compose/${filename}`, contents, 'utf-8']);
      expect(dockerComposeCli.pull.args).to.deep.equal([[`/docker-compose/${filename}`]]);
    });

    it('should copy files for backup when enabled', async () => {
      process.env.CHT_BACKUP_COMPOSE_FILES = 'true';

      const filename = 'temp.yml';
      const contents = 'the contents';

      sinon.stub(fs.promises, 'mkdtemp').resolves('/path/to/temp');
      sinon.stub(fs.promises, 'writeFile').resolves();
      sinon.stub(fs.promises, 'unlink');
      sinon.stub(fs.promises, 'rmdir');
      sinon.stub(fs.promises, 'stat').resolves();
      sinon.stub(fs.promises, 'mkdir');
      sinon.stub(fs.promises, 'readdir').resolves([
        new fs.Dirent(filename, fs.constants.UV_DIRENT_FILE),
        new fs.Dirent('file_without_yml.txt', fs.constants.UV_DIRENT_FILE),
        new fs.Dirent('directory', fs.constants.UV_DIRENT_DIR),
        new fs.Dirent('symlink.yml', fs.constants.UV_DIRENT_LINK),
      ]);
      sinon.stub(fs.promises, 'copyFile').resolves();
      sinon.stub(dockerComposeCli, 'validate').resolves(true);
      sinon.stub(dockerComposeCli, 'pull').resolves(true);
      sinon.stub(dockerComposeCli, 'up').resolves(true);


      const result = await containers.update(filename, contents);
      expect(result).to.be.true;

      expect(fs.promises.copyFile.args[0][0]).to.equal(`/docker-compose/temp.yml`);
      expect(fs.promises.copyFile.args[0][1]).to.match(
        /\/data\/backup\/\d{4}-\d{2}-\d{2}-\d{0,2}-\d{0,2}-\d{0,2}-\d{0,3}-[A-Za-z0-9_-]{4}\/temp\.yml$/
      );
    });
  });
});
