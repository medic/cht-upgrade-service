const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dockerComposeCli = require('./docker-compose-cli');
const dockerComposeFilePath = path.resolve('/docker-compose');
const rootBackupFolder = path.resolve(dockerComposeFilePath, 'data', 'backup');

const validComposeFile = async (contents) => {
  const tempFolder = await fs.promises.mkdtemp('docker-compose');
  const tempFilePath = path.join(tempFolder, 'temp.yml');
  await fs.promises.writeFile(tempFilePath, contents, 'utf-8');
  const valid = await dockerComposeCli.validate(tempFilePath);
  await fs.promises.unlink(tempFilePath);
  await fs.promises.rmdir(tempFolder);

  return valid;
};

const isBackupEnabled = () => process.env.CHT_BACKUP_COMPOSE_FILES !== 'false';

const overwriteComposeFile = async (filePath, fileContents) => {
  await fs.promises.writeFile(filePath, fileContents, 'utf-8');
};

const fileExists = async (filePath) => {
  try {
    await fs.promises.stat(filePath);
    return true;
  } catch (err) {
    return false;
  }
};

const update = async (fileName, fileContents, install = false) => {
  if (!fileName) {
    throw new Error('Invalid docker-compose file name');
  }

  const filePath = path.join(dockerComposeFilePath, fileName);
  if (install === await fileExists(filePath)) {
    return false;
  }

  if (!await validComposeFile(fileContents)) {
    throw new Error(`Invalid docker-compose yml for file ${fileName}`);
  }

  if (isBackupEnabled()) {
    await backupComposeFiles();
  }

  await overwriteComposeFile(filePath, fileContents);
  await dockerComposeCli.pull(filePath);

  return true;
};


/**
 * Generates a new name containing date of creation and random characters to avoid most collisions
 * @returns {string} Name for folder e.g. 2023-07-17-13-14-38-817-2Tjx
 */
const genBackupFolderName = () => {
  const fileFriendlyDateTime = new Date().toISOString().replaceAll(/[T:.Z]/g, '-'); // e.g. 2023-07-17-13-14-38-817-

  const randomText = crypto.randomBytes(3).toString('base64url'); // 4 ASCII characters per 3 byte

  return `${fileFriendlyDateTime}${randomText}`;
};

/**
 * Backup yml files in globally defined {dockerComposeFilePath} into {rootBackupFolder}
 */
const backupComposeFiles = async () => {
  const backupFolder = path.resolve(rootBackupFolder, genBackupFolderName());
  await fs.promises.mkdir(backupFolder, { recursive: true });

  const files = await getFilesInFolder(dockerComposeFilePath);
  for (const filename of files) {
    if (filename.endsWith('.yml')) {
      await fs.promises.copyFile(
        path.resolve(dockerComposeFilePath, filename),
        path.resolve(backupFolder, filename)
      );
    }
  }
};

/**
 * @param {string} dir Directory to check for files
 * @returns {string[]} Files in directory
 */
const getFilesInFolder = async (dir) => {
  const dirEntries = await fs.promises.readdir(dir, { withFileTypes: true });
  return dirEntries
    .filter(dirEntry => dirEntry.isFile())
    .map(file => file.name);
};

const startUp = async () => {
  const files = await getFilesInFolder(dockerComposeFilePath);
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
  update,
  startUp,
};
