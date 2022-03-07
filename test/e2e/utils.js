const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

let env;
const setEnv = (newEnv) => env = newEnv;

// const DOCKER_COMPOSE_CLI = '/usr/local/bin/docker-compose';
const DOCKER_COMPOSE_CLI = 'docker-compose';
const DOCKER_COMPOSE_FILE = path.resolve(__dirname, '..', 'test-data', 'docker-compose.test.yml');

const dockerComposeFolder = path.resolve(__dirname, '..', 'test-data', 'docker-compose');
const servicesFolder = path.resolve(__dirname, '..', 'test-data', 'services');

const cleanFolder = async () => {
  await fs.promises.rm(dockerComposeFolder, { recursive: true });
  await fs.promises.mkdir(dockerComposeFolder);
};

const runScript = (file, ...args) => {
  const scriptPath = path.resolve(__dirname, '..', 'test-data', 'scripts', file);
  const cwd = path.resolve(__dirname, '..', 'test-data', 'scripts');
  return new Promise((resolve, reject) => {
    const proc = spawn(scriptPath, args, { cwd });
    let stderr = '';
    let stdout = '';
    proc.on('error', (err) => reject(err));
    proc.stdout.on('data', (chunk) => stdout += chunk.toString());
    proc.stderr.on('data', (chunk) => stderr += chunk.toString());
    proc.on('close', (exitCode) => {
      exitCode ? reject(stderr) : resolve(stdout);
    });
  });
};

const composeCommand = (file, ...params) => {
  const args = [
    ...[`-f`, file ],
    ...params.filter(param => param).map(param => param.split(' ')),
  ].flat();
  const cwd = path.join(__dirname, '../');

  console.log(DOCKER_COMPOSE_CLI, ...args);

  return new Promise((resolve, reject) => {
    const proc = spawn(DOCKER_COMPOSE_CLI, args, { cwd , env });
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

  throw await response.json();
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

const up = async (start = true, env) => {
  setEnv(env);
  await serviceComposeCommand('up -d');
  setEnv();
  await waitUntilReady();
  if (!start) {
    return;
  }
  return await startContainers();
};

const getServiceVersion = async (file, service) => {
  const version = await testComposeCommand(file, 'exec -T', service, 'npm pkg get version');
  return version && version.replace(/["\n]/g, '');
};

const getServiceEnv = async (file, service, envVarName) => {
  const output = await testComposeCommand(file, 'exec -T', service, `npm run ${envVarName.toLowerCase()}`);
  // output looks like (excluding empty lines)
  // one@3.0.0 foo
  // echo $FOO
  // foovalue
  const lines = output.split('\n').filter(line => line);
  return lines[2];
};

module.exports = {
  url: 'http://localhost:5100/',
  getServiceVersion,

  runScript,
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
  getServiceEnv,
  setEnv,
};