const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// const DOCKER_COMPOSE_CLI = '/usr/local/bin/docker-compose';
const DOCKER_COMPOSE_CLI = 'docker-compose';
const DOCKER_COMPOSE_FILE = path.resolve(__dirname, '..', 'test-data', 'docker-compose.test.yml');

const dockerComposeFolder = path.resolve(__dirname, '..', 'test-data', 'docker-compose');
const servicesFolder = path.resolve(__dirname, '..', 'test-data', 'services');

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
    const proc = spawn(DOCKER_COMPOSE_CLI, splitArgs, { cwd , /*stdio: ['ignore', 'pipe', 'pipe']*/ });
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

    proc.on('close', (exitCode) => {
      exitCode ? reject(err || `Closed with exit code ${exitCode}`) : resolve(data);
    });
  });
};

const serviceComposeCommand = (...args) => composeCommand(DOCKER_COMPOSE_FILE, ...args);
const testComposeCommand = (fileName, ...args) => {
  const filePath = path.resolve(dockerComposeFolder, fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }

  return composeCommand(filePath, ...args);
};

const fetchJson = async (url, opts = {}) => {
  opts.headers = Object.assign({}, opts.headers, { 'Content-Type': 'application/json' });
  opts.body = opts.body && JSON.stringify(opts.body);
  opts.method = opts.method || (opts.body ? 'POST' : 'GET');

  const response = await fetch(url, opts);
  if (response.ok) {
    return await response.json();
  }
  return Promise.reject(response);
};

const setVersion = async (file, version, write = true) => {
  const contents = await fs.promises.readFile(path.resolve(servicesFolder, file), 'utf-8');
  const contentsWithVersion = contents.replace(/<version>/g, version);
  if (!write) {
    return contentsWithVersion;
  }

  await fs.promises.writeFile(path.resolve(dockerComposeFolder, file), contentsWithVersion);
};

const waitUntilReady = async () => {
  // try for 5 seconds
  let keepTrying = true;
  const killTimeout = setTimeout(() => keepTrying = false, 5000);

  do {
    try {
      await fetchJson(module.exports.url);
      clearTimeout(killTimeout);
      return;
    } catch (err) {
      // not ready yet
    }
  } while (keepTrying);
};

const startContainers = async () => {
  await fetchJson(`${module.exports.url}start`, { method: 'POST' });
};

const upgradeContainers = async (payload) => {
  const body = { 'docker-compose': payload };
  return await fetchJson(`${module.exports.url}upgrade`, { method: 'POST', body });
};

const up = async (start = true) => {
  await serviceComposeCommand('up -d');
  await waitUntilReady();
  start && await startContainers();
};

const getServiceVersion = async (file, service) => {
  const version = await testComposeCommand(file, 'exec -T', service, 'npm pkg get version');
  console.log(version);
  return version && version.replace(/[\"\n]/g, '');
};

module.exports = {
  url: 'http://localhost:5100/',
  getServiceVersion,

  composeCommand,
  serviceComposeCommand,
  testComposeCommand,
  fetchJson,
  cleanFolder,
  setVersion,
  waitUntilReady,
  startContainers,
  upgradeContainers,
  up,
};
