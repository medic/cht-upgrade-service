const childProcess = require('child_process');

const DOCKER_COMPOSE_CLI = 'docker-compose';

const composeCommand = (filePaths, ...params) => {
  filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];

  const args = [
    ...filePaths.map(filePath => (['-f', filePath])),
    ...params.map(param => param.split(' ')),
  ].flat();

  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn(DOCKER_COMPOSE_CLI, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.on('error', (err) => reject(err));

    let err = '';

    proc.stdout.on('data', (chunk) => console.log(chunk.toString()));
    proc.stderr.on('data', (chunk) => {
      chunk = chunk.toString();
      console.error(chunk);
      err += chunk;
    });

    proc.on('exit', (exitCode) => {
      exitCode ? reject(new Error(err)) : resolve();
    });
  });
};

const pull = (fileName) => composeCommand(fileName, 'pull');

const up = (fileNames) => composeCommand(fileNames, 'up -d --remove-orphans');

const validate = async (fileName) => {
  try {
    await composeCommand(fileName, 'config');
    return true;
  } catch (err) {
    return false;
  }
};

module.exports = {
  pull,
  up,
  validate,
};
