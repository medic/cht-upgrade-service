const childProcess = require('child_process');

const DOCKER_CLI = 'docker';
const COMPOSE_ARG = 'compose';
const RATE_EXCEEDED = 'Rate exceeded';

const isRateExceededError = (err) => err && err.message && err.message.includes(RATE_EXCEEDED);

const composeCommand = (filePaths, ...params) => {
  const { CHT_COMPOSE_PROJECT_NAME } = process.env;
  filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];

  const args = [
    COMPOSE_ARG,
    ...['-p', CHT_COMPOSE_PROJECT_NAME],
    ...filePaths.map(filePath => (['-f', filePath])),
    ...params.filter(param => param).map(param => param.split(' ')),
  ].flat();
  console.log(`Running cmd: ${DOCKER_CLI} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn(DOCKER_CLI, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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

const retryCmdOnRateExceeded = async (filenames, command, retry = 100) => {
  try {
    await composeCommand(filenames, command);
  } catch (err) {
    if (isRateExceededError(err) && retry > 0) {
      console.warn('Pull rate limit exceeded. Retrying.');
      await new Promise(r => setTimeout(r, 1000));
      return retryCmdOnRateExceeded(filenames, command, --retry);
    }
    throw err;
  }
};

const pull = async (fileName) => retryCmdOnRateExceeded(fileName, 'pull');

const up = (fileNames) => retryCmdOnRateExceeded(fileNames, 'up -d --remove-orphans');

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
