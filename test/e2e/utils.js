const { spawn } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

let env;
const setEnv = (newEnv) => env = newEnv;
const NETWORK = 'the_network';
const PROJECT_NAME = 'the_project';
process.env.NETWORK = NETWORK;
process.env.CHT_COMPOSE_PROJECT_NAME = PROJECT_NAME;
const DOCKER_COMPOSE_CLI = 'docker-compose';
const DOCKER_COMPOSE_FILE = path.resolve(__dirname, '..', 'test-data', 'docker-compose.test.yml');

const dockerComposeFolder = path.resolve(__dirname, '..', 'test-data', 'docker-compose');
const servicesFolder = path.resolve(__dirname, '..', 'test-data', 'services');

const cleanFolder = async () => {
  try {
    await fs.promises.rm(dockerComposeFolder, { recursive: true });
    await fs.promises.mkdir(dockerComposeFolder);
  } catch (err) {
    console.warn('Error when trying to clean up docker-compose test folder', err);
  }
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

const dockerCommand = (files, ...params) => {
  files = Array.isArray(files) ? files : [files];
  const args = [
    ...files.map(file => (['-f', file])),
    ...params.filter(param => param).map(param => param.split(' ')),
  ].flat();

  console.log(DOCKER_COMPOSE_CLI, ...args);

  return new Promise((resolve, reject) => {
    const proc = spawn(DOCKER_COMPOSE_CLI, args, { env: { ...process.env, ...env } });
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

const serviceComposeCommand = (...args) => dockerCommand(DOCKER_COMPOSE_FILE, ...args);
const testComposeCommand = (fileNames, ...args) => {
  fileNames = Array.isArray(fileNames) ? fileNames : [fileNames];
  const filePaths = fileNames
    .map(fileName => path.resolve(dockerComposeFolder, fileName))
    .filter(filePath => fs.existsSync(filePath));

  if (!filePaths.length) {
    return;
  }

  return dockerCommand(filePaths, ...['-p', PROJECT_NAME, ...args]);
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

const upgrade = async (fileNames, service, body) => {
  const payload = JSON.stringify({ docker_compose: body });
  try {
    return await testComposeCommand(
      fileNames,
      'exec -T', service,
      'npm run upgrade --', Buffer.from(payload).toString('base64')
    );
  } catch (err) {
    // this is expected to fail, because the container is restarted during the upgrade process
    return err;
  }
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
  const body = { docker_compose: payload };
  return await fetchJson(`${module.exports.url}upgrade`, { method: 'POST', body });
};

const installContainers = async (payload) => {
  const body = { docker_compose: payload };
  return await fetchJson(`${module.exports.url}install`, { method: 'POST', body });
};

const up = async (waitForStart = true, env) => {
  setEnv(env);
  await serviceComposeCommand('up -d');
  setEnv();
  await waitUntilReady();
  if (waitForStart) {
    return await waitForServiceContainersUp();
  }
};

const waitForServiceContainersUp = async () => {
  // try for 5 seconds
  let keepTrying = true;
  const killTimeout = setTimeout(() => keepTrying = false, 5000);
  const files = await fs.promises.readdir(dockerComposeFolder);

  if (!files.length) {
    return;
  }

  do {
    const up = await allContainersUp(files);
    if (up) {
      clearTimeout(killTimeout);
      return;
    }
  } while (keepTrying);
};


const allContainersUp = async (files) => {
  const services = (await testComposeCommand(files, 'config --services')).split('\n').filter(i => i);
  try {
    const containers = (await testComposeCommand(files, 'ps -q')).split('\n').filter(i => i);
    if (containers.length !== services.length) {
      return false;
    }
  } catch (err) {
    console.warn('Error when getting containers', err);
    return false;
  }

  // services are responding too
  for (const service of services) {
    try {
      await getServiceVersion(files, service);
    } catch (err) {
      return false;
    }
  }
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
  url: 'http://localhost:5008/',
  networkRemoveFailRe: /failed to remove network the_network: Error response from daemon: error while removing network: network the_network id .* has active endpoints/,
  getServiceVersion,

  runScript,
  serviceComposeCommand,
  testComposeCommand,
  fetchJson,
  cleanFolder,
  setVersion,
  waitUntilReady,
  startContainers,
  upgradeContainers,
  installContainers,
  up,
  getServiceEnv,
  setEnv,
  upgrade,
  waitForServiceContainersUp,
};
