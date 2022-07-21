const packageJson = require('../../package.json');
const buildTime = new Date().getTime();
const path = require('path');

const { spawn } = require('child_process');

const {
  ECR_REPO,
  BRANCH,
  BUILD_NUMBER
} = process.env;

const getBranchVersions = () => {
  return BRANCH === 'main' ? [`${packageJson.version}`, 'latest'] : `${packageJson.version}-${BRANCH}-${BUILD_NUMBER}`;
};

const getRepo = () => {
  return ECR_REPO || 'medicmobile';
};

const getVersions = (release) => {
  if (BRANCH) {
    return getBranchVersions(release);
  }
  return [`${packageJson.version}-dev.${buildTime}`];
};

const getImageTags = () => {
  const versions = getVersions();
  const tags = versions.map(version => version.replace(/\/|_/g, '-'));
  return tags.map(tag => `${getRepo()}/cht-upgrade-service:${tag}`);
};

const dockerCommand = (params) => {
  const args = [ ...params.filter(param => param).map(param => param.split(' ')) ].flat();

  console.log('docker', ...args);

  return new Promise((resolve, reject) => {
    const proc = spawn('docker', args);
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

(async () => {
  try {
    const tags = getImageTags();
    const dockerfilePath = path.join(__dirname, '..', '..', 'Dockerfile');
    await dockerCommand([`build -f ${dockerfilePath}`, ...tags.map(tag => `--tag ${tag}`), '.']);
    await dockerCommand(['push', ...tags]);
  } catch (err) {
    console.error('Error while publishing docker image', err);
  }
})();
