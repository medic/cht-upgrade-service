const path = require('path');
const fs = require('fs');

const dockerComposeCli = require('./docker-compose-cli');
const dockerComposeFilePath = path.resolve('/docker-compose');
const tempFolder = path.resolve('/temp');

const makeTempFolder = async () => {
  try {
    await fs.promises.mkdir(tempFolder);
  } catch (err) {
    // already exists
  }
};

const validComposeFile = async (contents) => {
  await makeTempFolder();
  const tempFilePath = path.join(tempFolder, 'temp.yml');
  await fs.promises.writeFile(tempFilePath, contents, 'utf-8');
  const valid = await dockerComposeCli.validate(tempFilePath);
  await fs.promises.unlink(tempFilePath);

  return valid;
};

const overwriteComposeFile = async (filePath, fileContents) => {
  await fs.promises.writeFile(filePath, fileContents, 'utf-8');
};

const startContainers = async (filePath, pull = false) => {
  pull && await dockerComposeCli.pull(filePath);
  await dockerComposeCli.up(filePath);
};

const upgrade = async (fileName, fileContents) => {
  if (!fileName) {
    throw new Error('Invalid docker-compose file name');
  }

  // write temp file, validate and then overwrite
  if (!await validComposeFile(fileContents)) {
    throw new Error(`Invalid docker-compose yml for file ${fileName}`);
  }

  const filePath = path.join(dockerComposeFilePath, fileName);

  await overwriteComposeFile(filePath, fileContents);
  await startContainers(filePath, true);
};

const startUp = async () => {
  const files = await fs.promises.readdir(dockerComposeFilePath);
  for (const file of files) {
    const filePath = path.join(dockerComposeFilePath, file);
    if (await dockerComposeCli.validate(filePath)) {
      await startContainers(filePath);
    }
  }
};

module.exports = {
  upgrade,
  startUp,
};
