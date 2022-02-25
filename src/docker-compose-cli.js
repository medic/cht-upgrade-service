const childProcess = require('child_process');

const DOCKER_COMPOSE_CLI = 'docker-compose';

const composeCommand = (filePath, ...args) => {
  const fileName = filePath.split('/').at(-1);
  const splitArgs = [`-f`, filePath, '-p', fileName ];
  args.forEach(arg => splitArgs.push(...arg.split(' ')));

  console.log(args);

  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn(DOCKER_COMPOSE_CLI, splitArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.on('error', (err) => reject(err));

    let err = '';

    proc.stdout.on('data', (chunk) => console.log(chunk.toString()));
    proc.stderr.on('data', (chunk) => {
      chunk = chunk.toString();
      console.error(chunk);
      err += chunk;
    });

    proc.on('exit', (exitCode) => {
      exitCode ? reject(err) : resolve();
    });
  });
};

const pull = (fileName) => composeCommand(fileName, 'pull');

const up = (fileName) => composeCommand(fileName, 'up', '-d', '--remove-orphans');

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
