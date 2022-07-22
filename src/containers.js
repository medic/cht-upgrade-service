const path = require('path');
const fs = require('fs');

const dockerComposeCli = require('./docker-compose-cli');
const dockerComposeFilePath = path.resolve('/docker-compose');

const validComposeFile = async (contents) => {
  const tempFolder = await fs.promises.mkdtemp('docker-compose');
  const tempFilePath = path.join(tempFolder, 'temp.yml');
  await fs.promises.writeFile(tempFilePath, contents, 'utf-8');
  const valid = await dockerComposeCli.validate(tempFilePath);
  await fs.promises.unlink(tempFilePath);
  await fs.promises.rmdir(tempFolder);

  return valid;
};

const overwriteComposeFile = async (filePath, fileContents) => {
  await fs.promises.writeFile(filePath, fileContents, 'utf-8');
};

const upgrade = async (fileName, fileContents, install = false) => {
  if (!fileName) {
    throw new Error('Invalid docker-compose file name');
  }

  const filePath = path.join(dockerComposeFilePath, fileName);
  if (!install && !fs.existsSync(filePath)) {
    return false;
  }

  // write temp file, validate and then overwrite
  if (!await validComposeFile(fileContents)) {
    throw new Error(`Invalid docker-compose yml for file ${fileName}`);
  }

  await overwriteComposeFile(filePath, fileContents);
  await dockerComposeCli.pull(filePath);

  return true;
};

const startUp = async () => {
  const files = await fs.promises.readdir(dockerComposeFilePath);
  const composeFiles = [];
  for (const file of files) {
    const filePath = path.join(dockerComposeFilePath, file);
    if (await dockerComposeCli.validate(filePath)) {
      composeFiles.push(filePath);
    }
  }
  if (!composeFiles.length) {
    return;
  }

  await dockerComposeCli.up(composeFiles);
};

module.exports = {
  upgrade,
  startUp,
};
