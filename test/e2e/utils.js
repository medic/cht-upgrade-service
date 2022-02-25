const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const DOCKER_COMPOSE_CLI = '/usr/local/bin/docker-compose';
const DOCKER_COMPOSE_FILE = 'docker-compose.test.yml';

const dockerComposeFolder = path.resolve(__dirname, '..', 'docker-compose');
const servicesFolder = path.resolve(__dirname, 'services');

const cleanFolder = async () => {
  await fs.promises.rm(dockerComposeFolder, { recursive: true });
  await fs.promises.mkdir(dockerComposeFolder);
};

const composeCommand = (file, ...args) => {
  const splitArgs = [`-f`, file ];
  args.forEach(arg => splitArgs.push(...arg.split(' ')));
  const cwd = path.join(__dirname, '../');

  console.log(DOCKER_COMPOSE_CLI, ...splitArgs);

  return new Promise((resolve, reject) => {
    const proc = spawn(DOCKER_COMPOSE_CLI, splitArgs, { cwd , stdio: ['ignore', 'pipe', 'pipe'] });
    proc.on('error', (err) => reject(err));

    let err = '';
    let data = '';

    proc.stdout.on('data', (chunk) => {
      chunk = chunk.toString();
      console.log(chunk);
      data += chunk;
    });
    proc.stderr.on('data', (chunk) => {
      chunk = chunk.toString();
      console.error(chunk);
      err += chunk;
    });

    proc.on('exit', (exitCode) => {
      exitCode ? reject(err || `Closed with exit code ${exitCode}`) : resolve(data);
    });
  });
};

const serviceComposeCommand = (...args) => composeCommand(DOCKER_COMPOSE_FILE, ...args);
const testComposeCommand = (fileName, ...args) => {
  const filePath = path.resolve(dockerComposeFolder, fileName);
  return composeCommand(filePath, ...args);
};

const fetchJson = async (url, opts = {}) => {
  opts.headers = Object.assign({}, opts.headers, { 'Content-Type': 'application/json' });
  opts.body = opts.body && JSON.stringify(opts.body);
  opts.method = opts.method || (opts.body ? 'POST' : 'GET');

  const response = await fetch(url, opts);
  return await response.json();
};

const setVersion = async (file, version) => {
  const contents = await fs.promises.readFile(path.resolve(servicesFolder, file), 'utf-8');
  const contentsWithVersion = contents.replace(/<version>/g, version);
  await fs.promises.writeFile(path.resolve(dockerComposeFolder, file), contentsWithVersion);
};

const waitUntilReady = async () => {
  // try for 5 seconds
  let keepTrying = true;
  setTimeout(() => keepTrying = false, 5000);
  do {
    try {
      return await fetchJson(module.exports.url);
    } catch (err) {
      // not ready yet
      await new Promise(r => setTimeout(r, 100));
    }
  } while (keepTrying);
};

module.exports = {
  url: 'http://localhost:5100/',
  getPackageVersion:  'npm pkg get version',

  composeCommand,
  serviceComposeCommand,
  testComposeCommand,
  fetchJson,
  cleanFolder,
  setVersion,
  waitUntilReady,
};
